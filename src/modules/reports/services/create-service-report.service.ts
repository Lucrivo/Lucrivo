import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Json,
} from "@/infrastructure/database/supabase/database.types";
import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type { ServiceReportSnapshotV2 } from "../types";

type CreateServiceReportInput = {
  supabase: SupabaseClient<Database>;
  command: ServiceDiagnosisCommand;
  snapshot: ServiceReportSnapshotV2;
};

type CreateServiceReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" };

type GeneratedRpcArgs =
  Database["public"]["Functions"]["create_service_diagnosis_report"]["Args"];

type ServiceReportRpcArgs = Omit<
  GeneratedRpcArgs,
  "p_real_margin_basis_points" | "p_unit_profit_cents"
> & {
  p_real_margin_basis_points: number | null;
  p_unit_profit_cents: number | null;
};

function toRpcArgs(
  command: ServiceDiagnosisCommand,
  snapshot: ServiceReportSnapshotV2,
): ServiceReportRpcArgs {
  return {
    p_submission_id: command.submissionId,
    p_pricing_method: command.pricingMethod,
    p_desired_monthly_income_cents: command.desiredMonthlyIncomeCents,
    p_fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
    p_monthly_work_minutes: command.monthlyWorkMinutes,
    p_weekly_work_days: command.weeklyWorkDays,
    p_hourly_rate_cents: command.hourlyRateCents,
    p_minute_rate_cents: command.minuteRateCents,
    p_appointment_rate_cents: command.appointmentRateCents,
    p_appointment_duration_minutes: command.appointmentDurationMinutes,
    p_tax_rate_basis_points: command.taxRateBasisPoints,
    p_card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
    p_schema_version: snapshot.schemaVersion,
    p_calculation_version: snapshot.calculationVersion,
    p_content_version: snapshot.contentVersion,
    p_scenario: snapshot.scenario,
    p_current_price_cents: snapshot.results.currentPriceCents,
    p_real_margin_basis_points: snapshot.results.realMarginBasisPoints,
    p_unit_profit_cents: snapshot.results.unitProfitCents,
    p_verdict: snapshot.results.verdict,
    p_priority: snapshot.results.priority,
    p_unit: snapshot.unit,
    p_report_snapshot: snapshot as Json,
  };
}

async function createServiceReport({
  supabase,
  command,
  snapshot,
}: CreateServiceReportInput): Promise<CreateServiceReportResult> {
  try {
    const rpcArgs = toRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_service_diagnosis_report",
      rpcArgs as GeneratedRpcArgs,
    );

    if (
      error ||
      !Number.isSafeInteger(data) ||
      typeof data !== "number" ||
      data <= 0
    ) {
      return { status: "error", error: "create_failed" };
    }

    return { status: "success", diagnosisId: data };
  } catch {
    return { status: "error", error: "create_failed" };
  }
}

export {
  createServiceReport,
  type CreateServiceReportInput,
  type CreateServiceReportResult,
};
