import "server-only";

import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import { reportAiTurnDtoSchema } from "../schemas/report-ai.schema";
import type {
  CompleteReportAiTurnInput,
  CompletedReportAiTurn,
  FailReportAiTurnInput,
  GenerationContextResult,
  MutationResult,
  ReportAiHistory,
  ReportAiTurnDto,
  ReserveReportAiTurnInput,
  ReserveResult,
  SummaryBatchResult,
  UpdateReportAiSummaryInput,
} from "../report-ai.types";

const conversationRowSchema = z.object({
  id: z.number().int().positive(),
  report_version: z.number().int().nonnegative(),
  summary: z.string(),
  summary_through_turn: z.number().int().positive().nullable(),
});

const turnRowSchema = z.object({
  id: z.number().int().positive(),
  request_id: z.uuid(),
  question: z.string().min(1),
  answer: z.string().nullable(),
  status: z.enum(["pending", "completed", "failed"]),
  error_code: z.string().nullable(),
  created_at: z.string().min(1),
});

const completedTurnRowSchema = z.object({
  id: z.number().int().positive(),
  question: z.string().min(1),
  answer: z.string().min(1),
});

const reserveResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("reserved"),
    conversationId: z.number().int().positive(),
    turnId: z.number().int().positive(),
  }),
  z.object({
    status: z.literal("existing"),
    conversationId: z.number().int().positive(),
    turnId: z.number().int().positive(),
    turnStatus: z.enum(["pending", "completed", "failed"]),
    retry: z.enum(["same_request", "new_request"]).optional(),
  }),
  z.object({ status: z.literal("not_found") }),
  z.object({
    status: z.literal("version_conflict"),
    currentVersion: z.number().int().nonnegative(),
  }),
  z.object({ status: z.literal("plan_required") }),
  z.object({ status: z.literal("busy") }),
  z.object({ status: z.literal("rate_limited") }),
  z.object({ status: z.literal("monthly_limit") }),
]);

function toTurnDto(row: z.infer<typeof turnRowSchema>): ReportAiTurnDto {
  return reportAiTurnDtoSchema.parse({
    id: row.id,
    requestId: row.request_id,
    question: row.question,
    answer: row.answer,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  });
}

function toCompletedTurn(
  row: z.infer<typeof completedTurnRowSchema>,
): CompletedReportAiTurn {
  return { id: row.id, question: row.question, answer: row.answer };
}

async function readTurnById(
  supabase: SupabaseClient<Database>,
  turnId: number,
): Promise<ReportAiTurnDto | null> {
  const { data, error } = await supabase
    .from("report_ai_turns")
    .select("id, request_id, question, answer, status, error_code, created_at")
    .eq("id", turnId)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = turnRowSchema.safeParse(data);
  return parsed.success ? toTurnDto(parsed.data) : null;
}

async function getReportAiHistory(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  diagnosisId: number;
  currentVersion: number;
  selectedVersion?: number;
}): Promise<
  | { status: "success"; history: ReportAiHistory }
  | { status: "not_found" }
  | { status: "read_failed" }
> {
  try {
    const { data, error } = await input.supabase
      .from("report_ai_conversations")
      .select("id, report_version, summary, summary_through_turn")
      .eq("user_id", input.userId)
      .eq("diagnosis_id", input.diagnosisId)
      .order("report_version", { ascending: false });
    const parsedConversations = conversationRowSchema.array().safeParse(data);
    if (error || !parsedConversations.success) return { status: "read_failed" };

    const selectedVersion = input.selectedVersion ?? input.currentVersion;
    const selectedConversation = parsedConversations.data.find(
      (conversation) => conversation.report_version === selectedVersion,
    );
    const versions = parsedConversations.data.map(
      (conversation) => conversation.report_version,
    );

    if (!selectedConversation) {
      if (selectedVersion !== input.currentVersion)
        return { status: "not_found" };
      return {
        status: "success",
        history: {
          currentVersion: input.currentVersion,
          selectedVersion,
          versions,
          summary: "",
          turns: [],
        },
      };
    }

    const turnsResult = await input.supabase
      .from("report_ai_turns")
      .select(
        "id, request_id, question, answer, status, error_code, created_at",
      )
      .eq("conversation_id", selectedConversation.id)
      .eq("user_id", input.userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    const parsedTurns = turnRowSchema.array().safeParse(turnsResult.data);
    if (turnsResult.error || !parsedTurns.success) {
      return { status: "read_failed" };
    }

    return {
      status: "success",
      history: {
        currentVersion: input.currentVersion,
        selectedVersion,
        versions,
        summary: selectedConversation.summary,
        turns: parsedTurns.data.map(toTurnDto),
      },
    };
  } catch {
    return { status: "read_failed" };
  }
}

async function reserveReportAiTurn(
  input: ReserveReportAiTurnInput,
): Promise<ReserveResult> {
  try {
    const { data, error } = await input.supabase.rpc(
      "reserve_report_ai_turn_v1",
      {
        p_diagnosis_id: input.diagnosisId,
        p_report_version: input.reportVersion,
        p_request_id: input.requestId,
        p_question: input.question,
        p_model: input.model,
      },
    );
    const parsed = reserveResultSchema.safeParse(data);
    if (error || !parsed.success) return { status: "reservation_failed" };
    if (parsed.data.status !== "existing") return parsed.data;

    const turn = await readTurnById(input.supabase, parsed.data.turnId);
    if (!turn || turn.status !== parsed.data.turnStatus) {
      return { status: "reservation_failed" };
    }
    return { ...parsed.data, turn };
  } catch {
    return { status: "reservation_failed" };
  }
}

async function completeReportAiTurn(
  input: CompleteReportAiTurnInput,
): Promise<MutationResult> {
  try {
    const { data, error } = await input.supabase.rpc(
      "complete_report_ai_turn_v1",
      {
        p_turn_id: input.turnId,
        p_answer: input.answer,
        p_input_tokens: input.inputTokens,
        p_cached_input_tokens: input.cachedInputTokens,
        p_output_tokens: input.outputTokens,
      },
    );
    if (error) return { status: "mutation_failed" };
    if (data === "conflict" || data === "not_found") return { status: data };
    if (data !== "completed") return { status: "mutation_failed" };
    const turn = await readTurnById(input.supabase, input.turnId);
    if (!turn || turn.status !== "completed")
      return { status: "mutation_failed" };
    return { status: "completed", turn };
  } catch {
    return { status: "mutation_failed" };
  }
}

async function failReportAiTurn(
  input: FailReportAiTurnInput,
): Promise<MutationResult> {
  try {
    const { data, error } = await input.supabase.rpc("fail_report_ai_turn_v1", {
      p_turn_id: input.turnId,
      p_error_code: input.errorCode,
      p_counts_toward_quota: input.countsTowardQuota,
    });
    if (error) return { status: "mutation_failed" };
    return data === "failed" || data === "conflict" || data === "not_found"
      ? { status: data }
      : { status: "mutation_failed" };
  } catch {
    return { status: "mutation_failed" };
  }
}

async function updateReportAiSummary(
  input: UpdateReportAiSummaryInput,
): Promise<MutationResult> {
  try {
    const { data, error } = await input.supabase.rpc(
      "update_report_ai_summary_v1",
      {
        p_conversation_id: input.conversationId,
        p_summary: input.summary,
        p_summary_through_turn: input.summaryThroughTurn,
      },
    );
    if (error) return { status: "mutation_failed" };
    return data === "updated" || data === "conflict" || data === "not_found"
      ? { status: data }
      : { status: "mutation_failed" };
  } catch {
    return { status: "mutation_failed" };
  }
}

async function getReportAiGenerationContext(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  conversationId: number;
}): Promise<GenerationContextResult> {
  try {
    const conversationResult = await input.supabase
      .from("report_ai_conversations")
      .select("id, summary, summary_through_turn")
      .eq("id", input.conversationId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const conversationSchema = z.object({
      id: z.number().int().positive(),
      summary: z.string(),
      summary_through_turn: z.number().int().positive().nullable(),
    });
    const conversation = conversationSchema.safeParse(conversationResult.data);
    if (conversationResult.error) return { status: "read_failed" };
    if (!conversationResult.data) return { status: "not_found" };
    if (!conversation.success) return { status: "read_failed" };

    const turnsResult = await input.supabase
      .from("report_ai_turns")
      .select("id, question, answer", { count: "exact" })
      .eq("conversation_id", input.conversationId)
      .eq("user_id", input.userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(10);
    const turns = completedTurnRowSchema.array().safeParse(turnsResult.data);
    if (turnsResult.error || !turns.success || turnsResult.count === null) {
      return { status: "read_failed" };
    }

    return {
      status: "success",
      context: {
        summary: conversation.data.summary,
        completedTurnCount: turnsResult.count,
        recentTurns: turns.data.reverse().map(toCompletedTurn),
      },
    };
  } catch {
    return { status: "read_failed" };
  }
}

async function getReportAiSummaryBatch(input: {
  supabase: SupabaseClient<Database>;
  userId: string;
  conversationId: number;
  keepRecent: 9;
}): Promise<SummaryBatchResult> {
  try {
    const conversationResult = await input.supabase
      .from("report_ai_conversations")
      .select("summary, summary_through_turn")
      .eq("id", input.conversationId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const conversation = z
      .object({
        summary: z.string(),
        summary_through_turn: z.number().int().positive().nullable(),
      })
      .safeParse(conversationResult.data);
    if (conversationResult.error) return { status: "read_failed" };
    if (!conversationResult.data) return { status: "not_found" };
    if (!conversation.success) return { status: "read_failed" };

    let query = input.supabase
      .from("report_ai_turns")
      .select("id, question, answer")
      .eq("conversation_id", input.conversationId)
      .eq("user_id", input.userId)
      .eq("status", "completed");
    if (conversation.data.summary_through_turn !== null) {
      query = query.gt("id", conversation.data.summary_through_turn);
    }
    const turnsResult = await query.order("id", { ascending: true });
    const turns = completedTurnRowSchema.array().safeParse(turnsResult.data);
    if (turnsResult.error || !turns.success) return { status: "read_failed" };

    const batch = turns.data.slice(0, -input.keepRecent);
    if (batch.length === 0) return { status: "empty" };
    return {
      status: "success",
      batch: {
        priorSummary: conversation.data.summary,
        turns: batch.map(toCompletedTurn),
        summaryThroughTurn: batch.at(-1)!.id,
      },
    };
  } catch {
    return { status: "read_failed" };
  }
}

export {
  completeReportAiTurn,
  failReportAiTurn,
  getReportAiGenerationContext,
  getReportAiHistory,
  getReportAiSummaryBatch,
  reserveReportAiTurn,
  updateReportAiSummary,
};
