import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  completeReportAiTurn,
  failReportAiTurn,
  getReportAiGenerationContext,
  getReportAiHistory,
  getReportAiSummaryBatch,
  reserveReportAiTurn,
  updateReportAiSummary,
} from "./report-ai-store.service";

const firstTurn = {
  id: 11,
  request_id: "10000000-0000-4000-8000-000000000001",
  question: "Primeira pergunta",
  answer: "Primeira resposta",
  status: "completed",
  error_code: null,
  created_at: "2026-09-29T10:00:00.000Z",
};

const secondTurn = {
  id: 12,
  request_id: "10000000-0000-4000-8000-000000000002",
  question: "Segunda pergunta",
  answer: null,
  status: "failed",
  error_code: "provider_unavailable",
  created_at: "2026-09-29T11:00:00.000Z",
};

function expectedTurn(
  row: {
    id: number;
    request_id: string;
    question: string;
    answer: string | null;
    status: string;
    error_code: string | null;
    created_at: string;
  } = firstTurn,
) {
  return {
    id: row.id,
    requestId: row.request_id,
    question: row.question,
    answer: row.answer,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
}

describe("report AI store", () => {
  const from = vi.fn();
  const rpc = vi.fn();
  const supabase = { from, rpc };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function historyQueries(options?: {
    conversations?: unknown[] | null;
    conversationError?: unknown;
    turns?: unknown[] | null;
    turnsError?: unknown;
  }) {
    const conversationsResult = {
      data: options?.conversations ?? [
        {
          id: 8,
          report_version: 3,
          summary: "Resumo atual",
          summary_through_turn: 10,
        },
        {
          id: 7,
          report_version: 2,
          summary: "Resumo anterior",
          summary_through_turn: null,
        },
      ],
      error: options?.conversationError ?? null,
    };
    const turnsResult = {
      data: options?.turns ?? [firstTurn, secondTurn],
      error: options?.turnsError ?? null,
    };

    from.mockImplementation((table: string) => {
      if (table === "report_ai_conversations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ order: () => Promise.resolve(conversationsResult) }),
            }),
          }),
        };
      }

      if (table === "report_ai_turns") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({ order: () => Promise.resolve(turnsResult) }),
              }),
            }),
          }),
        };
      }

      throw new Error(`unexpected table ${table}`);
    });
  }

  it("maps rows to a chronological current-version history", async () => {
    historyQueries();

    await expect(
      getReportAiHistory({
        supabase: supabase as never,
        userId: "user-123",
        diagnosisId: 42,
        currentVersion: 3,
      }),
    ).resolves.toEqual({
      status: "success",
      history: {
        currentVersion: 3,
        selectedVersion: 3,
        versions: [3, 2],
        summary: "Resumo atual",
        turns: [expectedTurn(firstTurn), expectedTurn(secondTurn)],
      },
    });
  });

  it("returns an empty current history without a conversation", async () => {
    historyQueries({ conversations: [] });

    await expect(
      getReportAiHistory({
        supabase: supabase as never,
        userId: "user-123",
        diagnosisId: 42,
        currentVersion: 4,
      }),
    ).resolves.toEqual({
      status: "success",
      history: {
        currentVersion: 4,
        selectedVersion: 4,
        versions: [],
        summary: "",
        turns: [],
      },
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("returns not_found for a missing prior version", async () => {
    historyQueries({ conversations: [] });

    await expect(
      getReportAiHistory({
        supabase: supabase as never,
        userId: "user-123",
        diagnosisId: 42,
        currentVersion: 4,
        selectedVersion: 2,
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("fails closed on malformed rows or query errors", async () => {
    historyQueries({ turns: [{ ...firstTurn, status: "mystery" }] });
    await expect(
      getReportAiHistory({
        supabase: supabase as never,
        userId: "user-123",
        diagnosisId: 42,
        currentVersion: 3,
      }),
    ).resolves.toEqual({ status: "read_failed" });

    historyQueries({ conversationError: { message: "private" } });
    await expect(
      getReportAiHistory({
        supabase: supabase as never,
        userId: "user-123",
        diagnosisId: 42,
        currentVersion: 3,
      }),
    ).resolves.toEqual({ status: "read_failed" });
  });

  it("parses reservation RPC results instead of casting", async () => {
    rpc.mockResolvedValueOnce({
      data: { status: "reserved", conversationId: 8, turnId: 12 },
      error: null,
    });
    await expect(
      reserveReportAiTurn({
        supabase: supabase as never,
        diagnosisId: 42,
        reportVersion: 3,
        requestId: "10000000-0000-4000-8000-000000000001",
        question: "Explique a margem",
        model: "gpt-6-luna",
      }),
    ).resolves.toEqual({
      status: "reserved",
      conversationId: 8,
      turnId: 12,
    });

    rpc.mockResolvedValueOnce({
      data: { status: "reserved", conversationId: "wrong", turnId: 12 },
      error: null,
    });
    await expect(
      reserveReportAiTurn({
        supabase: supabase as never,
        diagnosisId: 42,
        reportVersion: 3,
        requestId: "10000000-0000-4000-8000-000000000001",
        question: "Explique a margem",
        model: "gpt-6-luna",
      }),
    ).resolves.toEqual({ status: "reservation_failed" });
  });

  it("returns the persisted DTO after completion", async () => {
    rpc.mockResolvedValue({ data: "completed", error: null });
    from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => ({ data: firstTurn, error: null }) }),
      }),
    });

    await expect(
      completeReportAiTurn({
        supabase: supabase as never,
        turnId: 11,
        answer: "Primeira resposta",
        inputTokens: 100,
        cachedInputTokens: 20,
        outputTokens: 30,
      }),
    ).resolves.toEqual({ status: "completed", turn: expectedTurn() });
  });

  it("parses failure and summary mutation statuses", async () => {
    rpc.mockResolvedValueOnce({ data: "failed", error: null });
    await expect(
      failReportAiTurn({
        supabase: supabase as never,
        turnId: 11,
        errorCode: "provider_timeout",
        countsTowardQuota: true,
      }),
    ).resolves.toEqual({ status: "failed" });

    rpc.mockResolvedValueOnce({ data: "updated", error: null });
    await expect(
      updateReportAiSummary({
        supabase: supabase as never,
        conversationId: 8,
        summary: "Resumo",
        summaryThroughTurn: 11,
      }),
    ).resolves.toEqual({ status: "updated" });

    rpc.mockResolvedValueOnce({ data: "unexpected", error: null });
    await expect(
      failReportAiTurn({
        supabase: supabase as never,
        turnId: 11,
        errorCode: "provider_timeout",
        countsTowardQuota: true,
      }),
    ).resolves.toEqual({ status: "mutation_failed" });
  });

  it("loads ten recent completed turns in chronological order", async () => {
    const conversation = {
      id: 8,
      summary: "Resumo",
      summary_through_turn: 5,
    };
    from.mockImplementation((table: string) => {
      if (table === "report_ai_conversations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => ({ data: conversation, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  order: () => ({
                    limit: () => ({
                      data: [firstTurn, { ...firstTurn, id: 10 }],
                      count: 12,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });

    await expect(
      getReportAiGenerationContext({
        supabase: supabase as never,
        userId: "user-123",
        conversationId: 8,
      }),
    ).resolves.toEqual({
      status: "success",
      context: {
        summary: "Resumo",
        completedTurnCount: 12,
        recentTurns: [
          {
            id: 10,
            question: "Primeira pergunta",
            answer: "Primeira resposta",
          },
          {
            id: 11,
            question: "Primeira pergunta",
            answer: "Primeira resposta",
          },
        ],
      },
    });
  });

  it("returns only the summary batch while retaining nine recent turns", async () => {
    const rows = Array.from({ length: 14 }, (_, index) => ({
      ...firstTurn,
      id: index + 1,
      question: `Pergunta ${index + 1}`,
      answer: `Resposta ${index + 1}`,
    }));
    from.mockImplementation((table: string) => {
      if (table === "report_ai_conversations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => ({
                  data: {
                    summary: "Resumo anterior",
                    summary_through_turn: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({ data: rows, error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const result = await getReportAiSummaryBatch({
      supabase: supabase as never,
      userId: "user-123",
      conversationId: 8,
      keepRecent: 9,
    });
    expect(result).toMatchObject({
      status: "success",
      batch: {
        priorSummary: "Resumo anterior",
        summaryThroughTurn: 5,
      },
    });
    if (result.status === "success") {
      expect(result.batch.turns).toHaveLength(5);
      expect(result.batch.turns.at(-1)?.id).toBe(5);
    }
  });
});
