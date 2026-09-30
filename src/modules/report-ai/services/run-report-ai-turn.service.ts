import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type {
  ReportAiGateway,
  ReportAiUsage,
} from "@/infrastructure/ai/openai/report-ai.gateway";

import {
  buildReportAiMessages,
  REPORT_AI_INSTRUCTIONS,
} from "../domain/build-report-ai-prompt";
import type { ReportAiStreamEvent } from "../report-ai.types";
import {
  completeReportAiTurn,
  failReportAiTurn,
  getReportAiGenerationContext,
  getReportAiSummaryBatch,
  reserveReportAiTurn,
  updateReportAiSummary,
} from "./report-ai-store.service";

type PreStreamCode =
  | "not_found"
  | "version_conflict"
  | "plan_required"
  | "busy"
  | "rate_limited"
  | "monthly_limit"
  | "reservation_failed";

class ReportAiPreStreamError extends Error {
  readonly code: PreStreamCode;
  readonly currentVersion?: number;

  constructor(code: PreStreamCode, currentVersion?: number) {
    super(code);
    this.name = "ReportAiPreStreamError";
    this.code = code;
    this.currentVersion = currentVersion;
  }
}

type RunReportAiTurnInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  diagnosisId: number;
  reportVersion: number;
  requestId: string;
  question: string;
  model: string;
  reportContext: string;
  gateway: ReportAiGateway;
  signal?: AbortSignal;
};

const zeroUsage = (): ReportAiUsage => ({
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
});

function addUsage(left: ReportAiUsage, right: ReportAiUsage): ReportAiUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
  };
}

function createTimedSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromRequest = () => controller.abort(requestSignal?.reason);

  if (requestSignal?.aborted) abortFromRequest();
  else
    requestSignal?.addEventListener("abort", abortFromRequest, { once: true });

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Timed out", "TimeoutError"));
  }, 60_000);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup() {
      clearTimeout(timeout);
      requestSignal?.removeEventListener("abort", abortFromRequest);
    },
  };
}

function isProviderRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const code = Reflect.get(error, "code");
  const type = Reflect.get(error, "type");
  if (
    type === "insufficient_quota" ||
    code === "credit_balance_exhausted" ||
    code === "organization_spend_limit_exceeded" ||
    code === "project_spend_limit_exceeded" ||
    code === "organization_usage_limit_exceeded"
  ) {
    return true;
  }

  const status = Reflect.get(error, "status");
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    status !== 408
  );
}

async function persistFailure(input: {
  supabase: SupabaseClient<Database>;
  turnId: number;
  errorCode:
    | "provider_rejected"
    | "provider_timeout"
    | "provider_unavailable"
    | "client_disconnected"
    | "persistence_failed";
  countsTowardQuota: boolean;
}) {
  await failReportAiTurn(input);
}

async function* runReportAiTurn(
  input: RunReportAiTurnInput,
): AsyncGenerator<ReportAiStreamEvent> {
  const reservation = await reserveReportAiTurn({
    supabase: input.supabase,
    diagnosisId: input.diagnosisId,
    reportVersion: input.reportVersion,
    requestId: input.requestId,
    question: input.question,
    model: input.model,
  });

  if (reservation.status === "existing") {
    if (reservation.turnStatus === "completed") {
      yield { type: "completed", turn: reservation.turn };
      return;
    }
    if (
      reservation.turnStatus === "pending" &&
      reservation.retry === "same_request"
    ) {
      // The reservation RPC reset an uncounted failure for this same request.
    } else {
      yield {
        type: "failed",
        code:
          reservation.turnStatus === "pending"
            ? "generation_in_progress"
            : (reservation.turn.errorCode ?? "generation_failed"),
        retry:
          reservation.turnStatus === "pending"
            ? "same_request"
            : (reservation.retry ?? "new_request"),
      };
      return;
    }
  } else if (reservation.status !== "reserved") {
    throw new ReportAiPreStreamError(
      reservation.status,
      reservation.status === "version_conflict"
        ? reservation.currentVersion
        : undefined,
    );
  }

  const conversationId = reservation.conversationId;
  const turnId = reservation.turnId;
  yield { type: "accepted", turnId };

  const generationContext = await getReportAiGenerationContext({
    supabase: input.supabase,
    userId: input.userId,
    conversationId,
  });
  if (generationContext.status !== "success") {
    await persistFailure({
      supabase: input.supabase,
      turnId,
      errorCode: "persistence_failed",
      countsTowardQuota: false,
    });
    yield {
      type: "failed",
      code: "service_unavailable",
      retry: "same_request",
    };
    return;
  }

  const messages = buildReportAiMessages({
    reportContext: input.reportContext,
    conversationSummary: generationContext.context.summary,
    recentTurns: generationContext.context.recentTurns,
    question: input.question,
  });
  const timedSignal = createTimedSignal(input.signal);
  let answer = "";
  let usage = zeroUsage();
  let sawProviderOutput = false;
  let sawCompletion = false;

  try {
    for await (const event of input.gateway.streamAnswer({
      instructions: REPORT_AI_INSTRUCTIONS,
      messages,
      signal: timedSignal.signal,
    })) {
      if (event.type === "delta") {
        sawProviderOutput = true;
        answer += event.text;
        yield { type: "delta", text: event.text };
      } else {
        sawCompletion = true;
        usage = addUsage(usage, event.usage);
      }
    }

    if (!sawCompletion || answer.trim().length === 0) {
      throw new Error("incomplete_provider_response");
    }
  } catch (error) {
    const clientDisconnected = input.signal?.aborted === true;
    const rejected = !sawProviderOutput && isProviderRejection(error);
    const errorCode = clientDisconnected
      ? "client_disconnected"
      : timedSignal.timedOut() ||
          (error instanceof DOMException && error.name === "AbortError")
        ? "provider_timeout"
        : rejected
          ? "provider_rejected"
          : "provider_unavailable";
    const countsTowardQuota = errorCode !== "provider_rejected";
    await persistFailure({
      supabase: input.supabase,
      turnId,
      errorCode,
      countsTowardQuota,
    });
    yield {
      type: "failed",
      code: errorCode,
      retry: countsTowardQuota ? "new_request" : "same_request",
    };
    return;
  } finally {
    timedSignal.cleanup();
  }

  if ((generationContext.context.completedTurnCount + 1) % 5 === 0) {
    try {
      const batchResult = await getReportAiSummaryBatch({
        supabase: input.supabase,
        userId: input.userId,
        conversationId,
        keepRecent: 9,
      });
      if (batchResult.status === "success") {
        const summaryResult = await input.gateway.summarize({
          instructions: `${REPORT_AI_INSTRUCTIONS}\nResuma os turnos fornecidos sem adicionar fatos.`,
          messages: [
            {
              role: "user",
              content: `RESUMO_ANTERIOR_INICIO\n${batchResult.batch.priorSummary}\nRESUMO_ANTERIOR_FIM`,
            },
            ...batchResult.batch.turns.flatMap((turn) => [
              { role: "user" as const, content: turn.question },
              { role: "assistant" as const, content: turn.answer },
            ]),
          ],
          signal: input.signal,
        });
        usage = addUsage(usage, summaryResult.usage);
        await updateReportAiSummary({
          supabase: input.supabase,
          conversationId,
          summary: summaryResult.summary.slice(0, 12_000),
          summaryThroughTurn: batchResult.batch.summaryThroughTurn,
        });
      }
    } catch {
      // Summary compaction is best-effort and never invalidates a valid answer.
    }
  }

  const completion = await completeReportAiTurn({
    supabase: input.supabase,
    turnId,
    answer,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
  });
  if (completion.status !== "completed") {
    await persistFailure({
      supabase: input.supabase,
      turnId,
      errorCode: "persistence_failed",
      countsTowardQuota: true,
    });
    yield {
      type: "failed",
      code: "persistence_failed",
      retry: "new_request",
    };
    return;
  }

  yield { type: "completed", turn: completion.turn };
}

export { ReportAiPreStreamError, runReportAiTurn };
export type { PreStreamCode, RunReportAiTurnInput };
