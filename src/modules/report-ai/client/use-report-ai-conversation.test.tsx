import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportAiHistory } from "../report-ai.types";
import { useReportAiConversation } from "./use-report-ai-conversation";

const firstRequestId = "10000000-0000-4000-8000-000000000001";
const secondRequestId = "10000000-0000-4000-8000-000000000002";
const emptyHistory: ReportAiHistory = {
  currentVersion: 3,
  selectedVersion: 3,
  versions: [3, 2],
  summary: "",
  turns: [],
};
const completedTurn = {
  id: 11,
  requestId: firstRequestId,
  question: "Explique a margem",
  answer: "Sua margem está baixa.",
  status: "completed" as const,
  errorCode: null,
  createdAt: "2026-09-30T10:00:00.000Z",
};

function ndjson(events: unknown[]): Response {
  return new Response(
    events.map((event) => JSON.stringify(event)).join("\n") + "\n",
    {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    },
  );
}

describe("useReportAiConversation", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const randomUUID = vi.spyOn(globalThis.crypto, "randomUUID");

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    randomUUID.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    randomUUID.mockReturnValue(firstRequestId);
  });

  function renderConversation(canAsk = true) {
    return renderHook(() =>
      useReportAiConversation({
        diagnosisId: 42,
        reportVersion: 3,
        canAsk,
        initialHistory: emptyHistory,
      }),
    );
  }

  it("shows the optimistic question and replaces streaming text on completion", async () => {
    let close!: () => void;
    const encoder = new TextEncoder();
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({ type: "accepted", turnId: 11 })}\n${JSON.stringify({ type: "delta", text: "Sua margem " })}\n`,
              ),
            );
            close = () => {
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({ type: "delta", text: "está baixa." })}\n${JSON.stringify({ type: "completed", turn: completedTurn })}\n`,
                ),
              );
              controller.close();
            };
          },
        }),
        { status: 200 },
      ),
    );
    const { result } = renderConversation();

    act(() => result.current.setDraft("Explique a margem"));
    let sending!: Promise<void>;
    act(() => {
      sending = result.current.send();
    });

    await waitFor(() => {
      expect(result.current.pendingQuestion).toBe("Explique a margem");
      expect(result.current.streamingText).toBe("Sua margem ");
      expect(result.current.state).toBe("streaming");
    });

    close();
    await act(async () => sending);
    expect(result.current.history.turns).toEqual([completedTurn]);
    expect(result.current.pendingQuestion).toBeNull();
    expect(result.current.streamingText).toBe("");
    expect(result.current.state).toBe("idle");
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("allows only one in-flight request", async () => {
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { result } = renderConversation();
    act(() => result.current.setDraft("Pergunta"));

    let first!: Promise<void>;
    act(() => {
      first = result.current.send();
      void result.current.send();
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    resolveFetch(ndjson([{ type: "completed", turn: completedTurn }]));
    await act(async () => first);
  });

  it("loads current and prior versions", async () => {
    const priorHistory = {
      ...emptyHistory,
      selectedVersion: 2,
      turns: [completedTurn],
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(priorHistory), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { result } = renderConversation();

    await act(async () => result.current.selectVersion(2));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports/42/ai/conversations?version=2",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(result.current.history).toEqual(priorHistory);
  });

  it("retries a failed history load instead of sending a question", async () => {
    const priorHistory = {
      ...emptyHistory,
      selectedVersion: 2,
      turns: [completedTurn],
    };
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "service_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(priorHistory), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const { result } = renderConversation();

    await act(async () => result.current.selectVersion(2));
    expect(result.current.state).toBe("error");
    await act(async () => result.current.retry());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/reports/42/ai/conversations?version=2",
      { cache: "no-store" },
    );
    expect(result.current.history).toEqual(priorHistory);
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it("gates sending by paid access and the selected report version", async () => {
    const inactive = renderConversation(false);
    act(() => inactive.result.current.setDraft("Pergunta"));
    await act(async () => inactive.result.current.send());
    expect(fetchMock).not.toHaveBeenCalled();

    const previousHistory = { ...emptyHistory, selectedVersion: 2 };
    const prior = renderHook(() =>
      useReportAiConversation({
        diagnosisId: 42,
        reportVersion: 3,
        canAsk: true,
        initialHistory: previousHistory,
      }),
    );
    act(() => prior.result.current.setDraft("Pergunta"));
    await act(async () => prior.result.current.send());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enforces the 2,000-character draft boundary", () => {
    const { result } = renderConversation();
    act(() => result.current.setDraft("a".repeat(2_001)));
    expect(result.current.draft).toHaveLength(2_000);
  });

  it("reuses a request id only for same-request recovery", async () => {
    fetchMock
      .mockResolvedValueOnce(
        ndjson([
          { type: "accepted", turnId: 11 },
          { type: "failed", code: "provider_rejected", retry: "same_request" },
        ]),
      )
      .mockResolvedValueOnce(
        ndjson([{ type: "completed", turn: completedTurn }]),
      );
    const { result } = renderConversation();
    act(() => result.current.setDraft("Explique a margem"));

    await act(async () => result.current.send());
    expect(result.current.error).toEqual({
      code: "provider_rejected",
      retry: "same_request",
    });
    await act(async () => result.current.retry());

    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    expect(bodies.map((body) => body.requestId)).toEqual([
      firstRequestId,
      firstRequestId,
    ]);
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("creates a new request id after explicit new-request retry", async () => {
    randomUUID
      .mockReturnValueOnce(firstRequestId)
      .mockReturnValueOnce(secondRequestId);
    fetchMock
      .mockResolvedValueOnce(
        ndjson([
          { type: "failed", code: "provider_timeout", retry: "new_request" },
        ]),
      )
      .mockResolvedValueOnce(
        ndjson([
          {
            type: "completed",
            turn: { ...completedTurn, requestId: secondRequestId },
          },
        ]),
      );
    const { result } = renderConversation();
    act(() => result.current.setDraft("Explique a margem"));

    await act(async () => result.current.send());
    expect(result.current.error?.retry).toBe("new_request");
    await act(async () => result.current.retry());

    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    expect(bodies.map((body) => body.requestId)).toEqual([
      firstRequestId,
      secondRequestId,
    ]);
  });
});
