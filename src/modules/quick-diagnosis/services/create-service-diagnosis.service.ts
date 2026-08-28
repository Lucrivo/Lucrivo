import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  TablesInsert,
} from "@/infrastructure/database/supabase/database.types";

import type { ServiceDiagnosisCommand } from "../types";

const IDEMPOTENCY_CONSTRAINT = "service_diagnoses_user_submission_key";

type CreateServiceDiagnosisServiceInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  command: ServiceDiagnosisCommand;
};

type CreateServiceDiagnosisServiceResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" };

function toInsert(
  userId: string,
  command: ServiceDiagnosisCommand,
): TablesInsert<"service_diagnoses"> {
  return {
    submission_id: command.submissionId,
    user_id: userId,
    business_category: "service",
    pricing_method: command.pricingMethod,
    desired_monthly_income_cents: command.desiredMonthlyIncomeCents,
    fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
    monthly_work_minutes: command.monthlyWorkMinutes,
    weekly_work_days: command.weeklyWorkDays,
    hourly_rate_cents: command.hourlyRateCents,
    minute_rate_cents: command.minuteRateCents,
    appointment_rate_cents: command.appointmentRateCents,
    appointment_duration_minutes: command.appointmentDurationMinutes,
    tax_rate_basis_points: command.taxRateBasisPoints,
    card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
  };
}

async function createServiceDiagnosisService({
  supabase,
  userId,
  command,
}: CreateServiceDiagnosisServiceInput): Promise<CreateServiceDiagnosisServiceResult> {
  try {
    const { data, error } = await supabase
      .from("service_diagnoses")
      .insert(toInsert(userId, command))
      .select("id")
      .single();

    if (!error && data) {
      return { status: "success", diagnosisId: data.id };
    }

    const isIdempotentRetry =
      error?.code === "23505" && error.message.includes(IDEMPOTENCY_CONSTRAINT);

    if (!isIdempotentRetry) {
      return { status: "error", error: "create_failed" };
    }

    const { data: existing, error: lookupError } = await supabase
      .from("service_diagnoses")
      .select("id")
      .eq("user_id", userId)
      .eq("submission_id", command.submissionId)
      .maybeSingle();

    if (lookupError || !existing) {
      return { status: "error", error: "create_failed" };
    }

    return { status: "success", diagnosisId: existing.id };
  } catch {
    return { status: "error", error: "create_failed" };
  }
}

export {
  createServiceDiagnosisService,
  type CreateServiceDiagnosisServiceInput,
  type CreateServiceDiagnosisServiceResult,
};
