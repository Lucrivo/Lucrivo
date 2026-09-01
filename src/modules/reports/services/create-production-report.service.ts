import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Json,
} from "@/infrastructure/database/supabase/database.types";
import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import type { ProductionReportSnapshotV1 } from "../types";

type CreateProductionReportInput = {
  supabase: SupabaseClient<Database>;
  command: ProductionDiagnosisCommand;
  snapshot: ProductionReportSnapshotV1;
};

type CreateProductionReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" };

type GeneratedProductionRpcArgs =
  Database["public"]["Functions"]["create_production_diagnosis_report"]["Args"];

type ProductionRpcArgs = Omit<
  GeneratedProductionRpcArgs,
  | "p_direct_labor_unit_cost_cents"
  | "p_material_unit_cost_cents"
  | "p_monthly_sales_volume"
  | "p_other_variable_unit_cost_cents"
  | "p_packaging_unit_cost_cents"
  | "p_real_margin_basis_points"
  | "p_unit_profit_cents"
> & {
  p_direct_labor_unit_cost_cents: number | null;
  p_material_unit_cost_cents: number | null;
  p_monthly_sales_volume: number | null;
  p_other_variable_unit_cost_cents: number | null;
  p_packaging_unit_cost_cents: number | null;
  p_real_margin_basis_points: number | null;
  p_unit_profit_cents: number | null;
};

function toProductionRpcArgs(
  command: ProductionDiagnosisCommand,
  snapshot: ProductionReportSnapshotV1,
): ProductionRpcArgs {
  return {
    p_submission_id: command.submissionId,
    p_cost_composition_enabled: command.costCompositionEnabled,
    p_production_unit_cost_cents: command.productionUnitCostCents,
    p_material_unit_cost_cents: command.materialUnitCostCents,
    p_packaging_unit_cost_cents: command.packagingUnitCostCents,
    p_direct_labor_unit_cost_cents: command.directLaborUnitCostCents,
    p_other_variable_unit_cost_cents: command.otherVariableUnitCostCents,
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

async function createProductionReport({
  supabase,
  command,
  snapshot,
}: CreateProductionReportInput): Promise<CreateProductionReportResult> {
  try {
    const rpcArgs = toProductionRpcArgs(command, snapshot);
    const { data, error } = await supabase.rpc(
      "create_production_diagnosis_report",
      rpcArgs as GeneratedProductionRpcArgs,
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
  createProductionReport,
  type CreateProductionReportInput,
  type CreateProductionReportResult,
};
