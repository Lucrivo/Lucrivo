import type {
  Database,
  Json,
} from "@/infrastructure/database/supabase/database.types";
import type {
  DetailedDiagnosisCommand,
  DetailedDiagnosisItem,
  DetailedItemCalculation,
} from "@/modules/detailed-diagnosis/types";
import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import type {
  CurrentDetailedReportSnapshot,
  CurrentProductReportSnapshot,
  CurrentProductionReportSnapshot,
  CurrentServiceReportSnapshot,
} from "../types";

type GeneratedServiceRpcArgs =
  Database["public"]["Functions"]["create_service_diagnosis_report_v4"]["Args"];

type ServiceReportRpcArgs = Omit<
  GeneratedServiceRpcArgs,
  | "p_real_margin_basis_points"
  | "p_source_material_cost_unit"
  | "p_unit_profit_cents"
> & {
  p_real_margin_basis_points: number | null;
  p_source_material_cost_unit: string | null;
  p_unit_profit_cents: number | null;
};

function toServiceRpcArgs(
  command: NormalizedServiceDiagnosisCommand,
  snapshot: CurrentServiceReportSnapshot,
): ServiceReportRpcArgs {
  return {
    p_submission_id: command.submissionId,
    p_pricing_method: command.pricingMethod,
    p_desired_monthly_income_cents: command.desiredMonthlyIncomeCents,
    p_fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
    p_work_hours_period: command.workHoursPeriod,
    p_work_period_minutes: command.workPeriodMinutes,
    p_monthly_work_minutes: command.monthlyWorkMinutes,
    p_weekly_work_days: command.weeklyWorkDays,
    p_hourly_rate_cents: command.hourlyRateCents,
    p_minute_rate_cents: command.minuteRateCents,
    p_appointment_rate_cents: command.appointmentRateCents,
    p_appointment_duration_minutes: command.appointmentDurationMinutes,
    p_material_unit_cost_cents: command.materialUnitCostCents,
    p_tax_rate_basis_points: command.taxRateBasisPoints,
    p_card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
    p_source_pricing_method: command.source.pricingMethod,
    p_source_current_price_cents: command.source.currentPriceCents,
    p_source_material_cost_unit: command.source.materialCostUnit,
    p_source_material_cost_cents: command.source.materialCostCents,
    p_daily_work_minutes: command.source.dailyWorkMinutes,
    p_source_appointment_duration_minutes:
      command.source.appointmentDurationMinutes,
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

type GeneratedProductRpcArgs =
  Database["public"]["Functions"]["create_product_diagnosis_report_v3"]["Args"];

type ProductRpcArgs = Omit<
  GeneratedProductRpcArgs,
  | "p_monthly_sales_volume"
  | "p_monthly_result_cents"
  | "p_real_margin_basis_points"
  | "p_unit_profit_cents"
> & {
  p_monthly_sales_volume: number | null;
  p_monthly_result_cents: number | null;
  p_real_margin_basis_points: number | null;
  p_unit_profit_cents: number | null;
};

function toProductRpcArgs(
  command: ProductDiagnosisCommand,
  snapshot: CurrentProductReportSnapshot,
): ProductRpcArgs {
  return {
    p_submission_id: command.submissionId,
    p_product_kind: command.productKind,
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
    p_monthly_result_cents: snapshot.results.monthlyResultCents,
    p_verdict: snapshot.results.verdict,
    p_priority: snapshot.results.priority,
    p_unit: snapshot.unit,
    p_report_snapshot: snapshot as Json,
  };
}

type GeneratedProductionRpcArgs =
  Database["public"]["Functions"]["create_production_diagnosis_report_v3"]["Args"];

type ProductionRpcArgs = Omit<
  GeneratedProductionRpcArgs,
  | "p_direct_labor_unit_cost_cents"
  | "p_material_unit_cost_cents"
  | "p_monthly_sales_volume"
  | "p_monthly_result_cents"
  | "p_other_variable_unit_cost_cents"
  | "p_packaging_unit_cost_cents"
  | "p_real_margin_basis_points"
  | "p_unit_profit_cents"
> & {
  p_direct_labor_unit_cost_cents: number | null;
  p_material_unit_cost_cents: number | null;
  p_monthly_sales_volume: number | null;
  p_monthly_result_cents: number | null;
  p_other_variable_unit_cost_cents: number | null;
  p_packaging_unit_cost_cents: number | null;
  p_real_margin_basis_points: number | null;
  p_unit_profit_cents: number | null;
};

function toProductionRpcArgs(
  command: ProductionDiagnosisCommand,
  snapshot: CurrentProductionReportSnapshot,
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
    p_monthly_result_cents: snapshot.results.monthlyResultCents,
    p_verdict: snapshot.results.verdict,
    p_priority: snapshot.results.priority,
    p_unit: snapshot.unit,
    p_report_snapshot: snapshot as Json,
  };
}

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

export {
  toDetailedPersistenceItems,
  toDetailedRpcArgs,
  toProductRpcArgs,
  toProductionRpcArgs,
  toServiceRpcArgs,
  type DetailedPersistenceItem,
  type DetailedRpcArgs,
  type ProductRpcArgs,
  type ProductionRpcArgs,
  type ServiceReportRpcArgs,
};
