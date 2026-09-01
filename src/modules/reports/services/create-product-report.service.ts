import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Json,
} from "@/infrastructure/database/supabase/database.types";
import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type { ProductReportSnapshotV1 } from "../types";

type CreateProductReportInput = {
  supabase: SupabaseClient<Database>;
  command: ProductDiagnosisCommand;
  snapshot: ProductReportSnapshotV1;
};

type CreateProductReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" };

type GeneratedProductRpcArgs =
  Database["public"]["Functions"]["create_product_diagnosis_report"]["Args"];

type ProductRpcArgs = Omit<
  GeneratedProductRpcArgs,
  | "p_monthly_sales_volume"
  | "p_real_margin_basis_points"
  | "p_unit_profit_cents"
> & {
  p_monthly_sales_volume: number | null;
  p_real_margin_basis_points: number | null;
  p_unit_profit_cents: number | null;
};

function toProductRpcArgs(
  command: ProductDiagnosisCommand,
  snapshot: ProductReportSnapshotV1,
): ProductRpcArgs {
  return {
    p_submission_id: command.submissionId,
    p_purchase_unit_cost_cents: command.purchaseUnitCostCents,
    p_unit_sale_price_cents: command.unitSalePriceCents,
    p_fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
    p_monthly_sales_volume: command.monthlySalesVolume,
    p_pro_labore_included: command.proLaboreIncluded,
    p_pro_labore_cents: command.proLaboreCents,
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

async function createProductReport({
  supabase,
  command,
  snapshot,
}: CreateProductReportInput): Promise<CreateProductReportResult> {
  try {
    const rpcArgs = toProductRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_product_diagnosis_report",
      rpcArgs as GeneratedProductRpcArgs,
    );

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
  createProductReport,
  type CreateProductReportInput,
  type CreateProductReportResult,
};
