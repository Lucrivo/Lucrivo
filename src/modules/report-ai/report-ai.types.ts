import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

type ReportAiTurnStatus = "pending" | "completed" | "failed";
type ReportAiRetry = "same_request" | "new_request";

type ReportAiTurnDto = {
  id: number;
  requestId: string;
  question: string;
  answer: string | null;
  status: ReportAiTurnStatus;
  errorCode: string | null;
  createdAt: string;
};

type ReportAiHistory = {
  currentVersion: number;
  selectedVersion: number;
  versions: number[];
  summary: string;
  turns: ReportAiTurnDto[];
};

type ReportAiStreamEvent =
  | { type: "accepted"; turnId: number }
  | { type: "delta"; text: string }
  | { type: "completed"; turn: ReportAiTurnDto }
  | { type: "failed"; code: string; retry: ReportAiRetry };

type ReserveReportAiTurnInput = {
  supabase: SupabaseClient<Database>;
  diagnosisId: number;
  reportVersion: number;
  requestId: string;
  question: string;
  model: string;
};

type ReserveResult =
  | { status: "reserved"; conversationId: number; turnId: number }
  | {
      status: "existing";
      conversationId: number;
      turnId: number;
      turnStatus: ReportAiTurnStatus;
      retry?: ReportAiRetry;
      turn: ReportAiTurnDto;
    }
  | { status: "not_found" }
  | { status: "version_conflict"; currentVersion: number }
  | { status: "plan_required" }
  | { status: "busy" }
  | { status: "rate_limited" }
  | { status: "monthly_limit" }
  | { status: "reservation_failed" };

type CompleteReportAiTurnInput = {
  supabase: SupabaseClient<Database>;
  turnId: number;
  answer: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

type FailReportAiTurnInput = {
  supabase: SupabaseClient<Database>;
  turnId: number;
  errorCode: string;
  countsTowardQuota: boolean;
};

type UpdateReportAiSummaryInput = {
  supabase: SupabaseClient<Database>;
  conversationId: number;
  summary: string;
  summaryThroughTurn: number;
};

type MutationResult =
  | { status: "completed"; turn: ReportAiTurnDto }
  | { status: "failed" }
  | { status: "updated" }
  | { status: "conflict" }
  | { status: "not_found" }
  | { status: "mutation_failed" };

type CompletedReportAiTurn = {
  id: number;
  question: string;
  answer: string;
};

type GenerationContextResult =
  | {
      status: "success";
      context: {
        summary: string;
        completedTurnCount: number;
        recentTurns: CompletedReportAiTurn[];
      };
    }
  | { status: "not_found" }
  | { status: "read_failed" };

type SummaryBatchResult =
  | {
      status: "success";
      batch: {
        priorSummary: string;
        turns: CompletedReportAiTurn[];
        summaryThroughTurn: number;
      };
    }
  | { status: "empty" }
  | { status: "not_found" }
  | { status: "read_failed" };

export type {
  CompleteReportAiTurnInput,
  CompletedReportAiTurn,
  FailReportAiTurnInput,
  GenerationContextResult,
  MutationResult,
  ReportAiHistory,
  ReportAiRetry,
  ReportAiStreamEvent,
  ReportAiTurnDto,
  ReportAiTurnStatus,
  ReserveReportAiTurnInput,
  ReserveResult,
  SummaryBatchResult,
  UpdateReportAiSummaryInput,
};
