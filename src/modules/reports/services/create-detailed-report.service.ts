import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Json,
} from "@/infrastructure/database/supabase/database.types";
import type {
  DetailedDiagnosisCommand,
  DetailedDiagnosisItem,
  DetailedItemCalculation,
} from "@/modules/detailed-diagnosis/types";

import type { CurrentDetailedReportSnapshot } from "../schemas/detailed-report-snapshot.schema";

type CreateDetailedReportInput = {
  supabase: SupabaseClient<Database>;
  command: DetailedDiagnosisCommand;
  snapshot: CurrentDetailedReportSnapshot;
};

type CreateDetailedReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" | "limit_reached" };

type DetailedPersistenceItem = DetailedDiagnosisItem &
  Omit<DetailedItemCalculation, "itemId">;

type GeneratedDetailedRpcArgs =
  Database["public"]["Functions"]["create_detailed_diagnosis_report"]["Args"];

type DetailedRpcArgs = Omit<
  GeneratedDetailedRpcArgs,
  | "p_items"
  | "p_monthly_gross_revenue_cents"
  | "p_monthly_result_cents"
  | "p_real_margin_basis_points"
  | "p_report_snapshot"
> & {
  p_items: Json;
  p_monthly_gross_revenue_cents: number | null;
  p_monthly_result_cents: number | null;
  p_real_margin_basis_points: number | null;
  p_report_snapshot: Json;
};

function toDetailedPersistenceItems(
  command: DetailedDiagnosisCommand,
  snapshot: CurrentDetailedReportSnapshot,
): DetailedPersistenceItem[] {
  const calculationsById = new Map(
    snapshot.results.items.map((item) => [item.itemId, item]),
  );

  return [...command.items]
    .sort((left, right) => left.position - right.position)
    .map((item) => {
      const calculation = calculationsById.get(item.id);
      if (!calculation) {
        throw new Error("Detailed report item result is missing.");
      }

      const { itemId, ...calculatedFields } = calculation;
      void itemId;
      const sourceItem =
        item.kind === "manufacturing" && item.costMode === "technical_sheet"
          ? {
              ...item,
              ingredients: [...item.ingredients].sort(
                (left, right) => left.position - right.position,
              ),
            }
          : { ...item };

      return { ...sourceItem, ...calculatedFields };
    });
}

function toDetailedRpcArgs(
  command: DetailedDiagnosisCommand,
  snapshot: CurrentDetailedReportSnapshot,
): DetailedRpcArgs {
  return {
    p_submission_id: command.submissionId,
    p_category: command.category,
    p_fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
    p_pro_labore_included: command.proLaboreIncluded,
    p_pro_labore_cents: command.proLaboreCents,
    p_tax_rate_basis_points: command.taxRateBasisPoints,
    p_card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
    p_promotion_margin_basis_points: command.promotionMarginBasisPoints,
    p_items: toDetailedPersistenceItems(command, snapshot) as Json,
    p_schema_version: snapshot.schemaVersion,
    p_calculation_version: snapshot.calculationVersion,
    p_content_version: snapshot.contentVersion,
    p_monthly_gross_revenue_cents: snapshot.results.monthlyGrossRevenueCents,
    p_monthly_result_cents: snapshot.results.monthlyResultCents,
    p_real_margin_basis_points: snapshot.results.finalMarginBasisPoints,
    p_verdict: snapshot.results.verdict,
    p_priority: snapshot.results.priority,
    p_item_count: snapshot.inputs.items.length,
    p_is_partial: snapshot.results.isPartial,
    p_report_snapshot: snapshot as Json,
  };
}

async function createDetailedReport({
  supabase,
  command,
  snapshot,
}: CreateDetailedReportInput): Promise<CreateDetailedReportResult> {
  try {
    const rpcArgs = toDetailedRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_detailed_diagnosis_report",
      rpcArgs as GeneratedDetailedRpcArgs,
    );

    if (
      error?.code === "P0001" &&
      error.message === "free_report_limit_reached"
    ) {
      return { status: "error", error: "limit_reached" };
    }

    if (
      error ||
      typeof data !== "number" ||
      !Number.isSafeInteger(data) ||
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
  createDetailedReport,
  toDetailedPersistenceItems,
  toDetailedRpcArgs,
  type CreateDetailedReportInput,
  type CreateDetailedReportResult,
  type DetailedPersistenceItem,
};
