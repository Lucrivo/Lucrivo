import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  reserveReportAiTurn,
  completeReportAiTurn,
  failReportAiTurn,
  getReportAiGenerationContext,
  getReportAiSummaryBatch,
  updateReportAiSummary,
} = vi.hoisted(() => ({
  reserveReportAiTurn: vi.fn(),
  completeReportAiTurn: vi.fn(),
  failReportAiTurn: vi.fn(),
  getReportAiGenerationContext: vi.fn(),
  getReportAiSummaryBatch: vi.fn(),
  updateReportAiSummary: vi.fn(),
}));

vi.mock("./report-ai-store.service", () => ({
  reserveReportAiTurn,
  completeReportAiTurn,
  failReportAiTurn,
  getReportAiGenerationContext,
  getReportAiSummaryBatch,
  updateReportAiSummary,
}));

import type { ReportAiGateway } from "@/infrastructure/ai/openai/report-ai.gateway";

import {
  ReportAiPreStreamError,
  runReportAiTurn,
} from "./run-report-ai-turn.service";

const completedTurn = {
  id: 11,
  requestId: "10000000-0000-4000-8000-000000000001",
  question: "Explique a margem",
  answer: "Sua margem está baixa.",
  status: "completed" as const,
  errorCode: null,
  createdAt: "2026-09-30T10:00:00.000Z",
};

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const events: T[] = [];
  for await (const event of source) events.push(event);
  return events;
}

function gateway(
  events: () => AsyncIterable<never | unknown>,
): ReportAiGateway {
  return {
    streamAnswer: vi.fn(events) as never,
    summarize: vi.fn(),
  };
}

async function* successEvents() {
  yield { type: "delta", text: "Sua margem " } as const;
  yield { type: "delta", text: "está baixa." } as const;
  yield {
    type: "completed",
    usage: { inputTokens: 1_200, cachedInputTokens: 700, outputTokens: 80 },
  } as const;
}

const input = {
  supabase: {} as never,
  userId: "user-123",
  diagnosisId: 42,
  reportVersion: 3,
  requestId: "10000000-0000-4000-8000-000000000001",
  question: "Explique a margem",
  model: "gpt-6-luna",
  reportContext: JSON.stringify({
    schemaVersion: 2,
    report: {
      id: 42,
      version: 3,
      category: "product",
      scenario: "resale",
      unit: "unit",
      analysisMode: "quick",
    },
    diagnosis: {
      verdict: "positive_result",
      priority: "volume",
      partial: false,
    },
    facts: [],
    availability: {
      volume: "known_positive",
      completeCostAvailable: true,
      monthlyResultAvailable: true,
      minimumPriceAvailable: true,
      requiredVolumeAvailable: true,
      discountSimulationAvailable: true,
      reasons: [],
    },
    explanations: {
      executiveSummary: {},
      sections: [],
      guidance: [],
      comparison: [],
    },
  }),
};

describe("runReportAiTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reserveReportAiTurn.mockResolvedValue({
      status: "reserved",
      conversationId: 8,
      turnId: 11,
    });
    getReportAiGenerationContext.mockResolvedValue({
      status: "success",
      context: {
        summary: "",
        completedTurnCount: 3,
        recentTurns: [],
      },
    });
    completeReportAiTurn.mockResolvedValue({
      status: "completed",
      turn: completedTurn,
    });
    failReportAiTurn.mockResolvedValue({ status: "failed" });
    getReportAiSummaryBatch.mockResolvedValue({ status: "empty" });
    updateReportAiSummary.mockResolvedValue({ status: "updated" });
  });

  it("streams deltas and completes with summed provider usage", async () => {
    const fakeGateway = gateway(successEvents);

    await expect(
      collect(runReportAiTurn({ ...input, gateway: fakeGateway })),
    ).resolves.toEqual([
      { type: "accepted", turnId: 11 },
      { type: "delta", text: "Sua margem " },
      { type: "delta", text: "está baixa." },
      { type: "completed", turn: completedTurn },
    ]);
    expect(completeReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        turnId: 11,
        answer: "Sua margem está baixa.",
        inputTokens: 1_200,
        cachedInputTokens: 700,
        outputTokens: 80,
      }),
    );
    expect(fakeGateway.streamAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining("# Processo obrigatório"),
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('"schemaVersion":2'),
          }),
        ]),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("returns an existing completion without calling the provider", async () => {
    reserveReportAiTurn.mockResolvedValue({
      status: "existing",
      conversationId: 8,
      turnId: 11,
      turnStatus: "completed",
      turn: completedTurn,
    });
    const fakeGateway = gateway(successEvents);

    await expect(
      collect(runReportAiTurn({ ...input, gateway: fakeGateway })),
    ).resolves.toEqual([{ type: "completed", turn: completedTurn }]);
    expect(fakeGateway.streamAnswer).not.toHaveBeenCalled();
  });

  it.each([
    [
      {
        status: "existing",
        conversationId: 8,
        turnId: 11,
        turnStatus: "pending",
        turn: { ...completedTurn, status: "pending", answer: null },
      },
      "generation_in_progress",
      "same_request",
    ],
    [
      {
        status: "existing",
        conversationId: 8,
        turnId: 11,
        turnStatus: "failed",
        retry: "new_request",
        turn: {
          ...completedTurn,
          status: "failed",
          answer: null,
          errorCode: "provider_timeout",
        },
      },
      "provider_timeout",
      "new_request",
    ],
  ] as const)(
    "maps an existing %s turn without a second provider call",
    async (reservation, code, retry) => {
      reserveReportAiTurn.mockResolvedValue(reservation);
      const fakeGateway = gateway(successEvents);

      await expect(
        collect(runReportAiTurn({ ...input, gateway: fakeGateway })),
      ).resolves.toEqual([{ type: "failed", code, retry }]);
      expect(fakeGateway.streamAnswer).not.toHaveBeenCalled();
    },
  );

  it("continues an uncounted failed request reset by the reservation RPC", async () => {
    reserveReportAiTurn.mockResolvedValue({
      status: "existing",
      conversationId: 8,
      turnId: 11,
      turnStatus: "pending",
      retry: "same_request",
      turn: { ...completedTurn, status: "pending", answer: null },
    });

    const events = await collect(
      runReportAiTurn({ ...input, gateway: gateway(successEvents) }),
    );

    expect(events.at(0)).toEqual({ type: "accepted", turnId: 11 });
    expect(events.at(-1)).toEqual({ type: "completed", turn: completedTurn });
  });

  it.each([
    "not_found",
    "version_conflict",
    "plan_required",
    "busy",
    "rate_limited",
    "monthly_limit",
    "reservation_failed",
  ] as const)("throws a typed pre-stream %s result", async (status) => {
    reserveReportAiTurn.mockResolvedValue(
      status === "version_conflict"
        ? { status, currentVersion: 4 }
        : { status },
    );

    const result = collect(
      runReportAiTurn({ ...input, gateway: gateway(successEvents) }),
    );
    await expect(result).rejects.toMatchObject({
      name: "ReportAiPreStreamError",
      code: status,
    });
    await result.catch((error: unknown) => {
      expect(error).toBeInstanceOf(ReportAiPreStreamError);
    });
  });

  it("marks a proven provider rejection uncounted and reusable", async () => {
    async function* rejected() {
      const error = new Error("private provider detail") as Error & {
        status: number;
      };
      error.status = 400;
      throw error;
    }

    await expect(
      collect(runReportAiTurn({ ...input, gateway: gateway(rejected) })),
    ).resolves.toEqual([
      { type: "accepted", turnId: 11 },
      { type: "failed", code: "provider_rejected", retry: "same_request" },
    ]);
    expect(failReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "provider_rejected",
        countsTowardQuota: false,
      }),
    );
  });

  it.each([
    ["credit_balance_exhausted", undefined],
    ["organization_spend_limit_exceeded", undefined],
    ["project_spend_limit_exceeded", undefined],
    ["organization_usage_limit_exceeded", undefined],
    [undefined, "insufficient_quota"],
  ])(
    "marks the status-less provider billing rejection code=%s type=%s uncounted",
    async (code, type) => {
      async function* rejected() {
        throw Object.assign(new Error("private provider detail"), {
          code,
          type,
        });
      }

      await expect(
        collect(runReportAiTurn({ ...input, gateway: gateway(rejected) })),
      ).resolves.toEqual([
        { type: "accepted", turnId: 11 },
        { type: "failed", code: "provider_rejected", retry: "same_request" },
      ]);
      expect(failReportAiTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: "provider_rejected",
          countsTowardQuota: false,
        }),
      );
    },
  );

  it("keeps the quota for a status-less provider availability failure", async () => {
    async function* unavailable() {
      throw Object.assign(new Error("private provider detail"), {
        code: "server_is_overloaded",
        type: "service_unavailable_error",
      });
    }

    await expect(
      collect(runReportAiTurn({ ...input, gateway: gateway(unavailable) })),
    ).resolves.toEqual([
      { type: "accepted", turnId: 11 },
      { type: "failed", code: "provider_unavailable", retry: "new_request" },
    ]);
    expect(failReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "provider_unavailable",
        countsTowardQuota: true,
      }),
    );
  });

  it("keeps the quota after a timeout or unknown provider outcome", async () => {
    async function* timedOut() {
      throw new DOMException("private timeout", "AbortError");
    }

    await expect(
      collect(runReportAiTurn({ ...input, gateway: gateway(timedOut) })),
    ).resolves.toEqual([
      { type: "accepted", turnId: 11 },
      { type: "failed", code: "provider_timeout", retry: "new_request" },
    ]);
    expect(failReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "provider_timeout",
        countsTowardQuota: true,
      }),
    );
  });

  it("marks client disconnects without exposing the caught error", async () => {
    const controller = new AbortController();
    async function* disconnected() {
      controller.abort();
      throw new DOMException("private disconnect", "AbortError");
    }

    await expect(
      collect(
        runReportAiTurn({
          ...input,
          gateway: gateway(disconnected),
          signal: controller.signal,
        }),
      ),
    ).resolves.toEqual([
      { type: "accepted", turnId: 11 },
      { type: "failed", code: "client_disconnected", retry: "new_request" },
    ]);
  });

  it("does not claim completion when final persistence fails", async () => {
    completeReportAiTurn.mockResolvedValue({ status: "mutation_failed" });

    const events = await collect(
      runReportAiTurn({ ...input, gateway: gateway(successEvents) }),
    );

    expect(events.at(-1)).toEqual({
      type: "failed",
      code: "persistence_failed",
      retry: "new_request",
    });
    expect(failReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "persistence_failed",
        countsTowardQuota: true,
      }),
    );
  });

  it("compacts an eligible fifth-answer batch and adds summary usage", async () => {
    getReportAiGenerationContext.mockResolvedValue({
      status: "success",
      context: {
        summary: "Resumo anterior",
        completedTurnCount: 14,
        recentTurns: [],
      },
    });
    getReportAiSummaryBatch.mockResolvedValue({
      status: "success",
      batch: {
        priorSummary: "Resumo anterior",
        turns: [
          { id: 5, question: "Pergunta antiga", answer: "Resposta antiga" },
        ],
        summaryThroughTurn: 5,
      },
    });
    const fakeGateway = gateway(successEvents);
    vi.mocked(fakeGateway.summarize).mockResolvedValue({
      summary: "Resumo atualizado",
      usage: { inputTokens: 100, cachedInputTokens: 50, outputTokens: 20 },
    });

    await collect(runReportAiTurn({ ...input, gateway: fakeGateway }));

    expect(updateReportAiSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "Resumo atualizado",
        summaryThroughTurn: 5,
      }),
    );
    expect(completeReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTokens: 1_300,
        cachedInputTokens: 750,
        outputTokens: 100,
      }),
    );
    expect(fakeGateway.summarize).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: expect.stringContaining("sem adicionar fatos"),
      }),
    );
    expect(
      vi.mocked(fakeGateway.summarize).mock.calls[0]?.[0].instructions,
    ).not.toContain("# Exemplos");
  });

  it("keeps a valid answer when optional summary generation fails", async () => {
    getReportAiGenerationContext.mockResolvedValue({
      status: "success",
      context: { summary: "", completedTurnCount: 14, recentTurns: [] },
    });
    getReportAiSummaryBatch.mockResolvedValue({
      status: "success",
      batch: {
        priorSummary: "",
        turns: [{ id: 5, question: "Pergunta", answer: "Resposta" }],
        summaryThroughTurn: 5,
      },
    });
    const fakeGateway = gateway(successEvents);
    vi.mocked(fakeGateway.summarize).mockRejectedValue(new Error("private"));

    const events = await collect(
      runReportAiTurn({ ...input, gateway: fakeGateway }),
    );

    expect(events.at(-1)).toEqual({ type: "completed", turn: completedTurn });
    expect(completeReportAiTurn).toHaveBeenCalledWith(
      expect.objectContaining({ inputTokens: 1_200, outputTokens: 80 }),
    );
  });
});
