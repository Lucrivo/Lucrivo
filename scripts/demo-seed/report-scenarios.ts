import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type {
  DetailedDiagnosisCommand,
  DetailedDiagnosisItem,
  DetailedDiagnosisVerdict,
} from "@/modules/detailed-diagnosis/types";
import { composeServiceDiagnosisCommand } from "@/modules/quick-diagnosis/domain/compose-service-diagnosis-command";
import type { ServiceFlowSubmissionInput } from "@/modules/quick-diagnosis/domain/service-flow";
import type {
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";
import { buildDetailedReportSnapshot } from "@/modules/reports/domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "@/modules/reports/domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "@/modules/reports/domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { calculateProductionReport } from "@/modules/reports/domain/calculate-production-report";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";
import {
  toDetailedRpcArgs,
  toProductRpcArgs,
  toProductionRpcArgs,
  toServiceRpcArgs,
} from "@/modules/reports/services/report-rpc-args";
import type {
  ReportPriority,
  ReportVerdict,
} from "@/modules/reports/types";

import { seedUuid } from "./ids";
import type {
  SeedRpcCall,
  SeedSqlArgument,
  SeedSqlValue,
  SqlCast,
} from "./model";

type SeedReportIds = {
  ownerOrdinal: number;
  reportOrdinal: number;
  submissionId: string;
  itemId(position: number): string;
  ingredientId(itemPosition: number, ingredientPosition: number): string;
};

type SeedMaterializedReport = {
  templateKey: string;
  submissionId: string;
  verdict: ReportVerdict;
  priority: ReportPriority;
  rpc: SeedRpcCall;
};

type SeedReportTemplate = {
  key: string;
  category: "service" | "product" | "production";
  analysisMode: "quick" | "detailed";
  expectedVerdict: ReportVerdict;
  materialize(ids: SeedReportIds): SeedMaterializedReport;
};

const SMALLINT_ARGUMENTS = new Set([
  "p_schema_version",
  "p_calculation_version",
  "p_content_version",
  "p_weekly_work_days",
]);
const INTEGER_ARGUMENTS = new Set([
  "p_work_period_minutes",
  "p_monthly_work_minutes",
  "p_appointment_duration_minutes",
  "p_daily_work_minutes",
  "p_source_appointment_duration_minutes",
  "p_tax_rate_basis_points",
  "p_card_fee_rate_basis_points",
  "p_real_margin_basis_points",
  "p_monthly_sales_volume",
  "p_item_count",
]);

function buildSeedReportIds(
  ownerOrdinal: number,
  reportOrdinal: number,
): SeedReportIds {
  return {
    ownerOrdinal,
    reportOrdinal,
    submissionId: seedUuid("submission", ownerOrdinal, reportOrdinal),
    itemId: (position) =>
      seedUuid("item", ownerOrdinal, reportOrdinal * 100 + position),
    ingredientId: (itemPosition, ingredientPosition) =>
      seedUuid(
        "ingredient",
        ownerOrdinal,
        reportOrdinal * 1_000 + itemPosition * 10 + ingredientPosition,
      ),
  };
}

function castForArgument(name: string, value: unknown): SqlCast {
  if (name === "p_submission_id") return "uuid";
  if (name === "p_category") return "public.business_category";
  if (name === "p_pricing_method") return "public.service_pricing_method";
  if (name === "p_work_hours_period") {
    return "public.service_work_hours_period";
  }
  if (name === "p_items" || name === "p_report_snapshot") return "jsonb";
  if (SMALLINT_ARGUMENTS.has(name)) return "smallint";
  if (INTEGER_ARGUMENTS.has(name)) return "integer";
  if (name.endsWith("_cents")) return "bigint";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function toSeedRpcCall(
  functionName: string,
  args: object,
): SeedRpcCall {
  const argumentsList: SeedSqlArgument[] = Object.entries(
    args as Record<string, SeedSqlValue>,
  ).map(([name, value]) => ({
    name,
    value,
    cast: castForArgument(name, value),
  }));
  return { functionName, arguments: argumentsList };
}

function assertVerdict(
  key: string,
  expected: ReportVerdict,
  actual: ReportVerdict,
): void {
  if (actual !== expected) {
    throw new Error(`${key} expected ${expected}, but calculated ${actual}.`);
  }
}

const serviceShapes = [
  ["missing_price", "month", "0.00", false, "", ""],
  ["direct_loss", "minute", "1.00", true, "70.00", "hour"],
  ["operational_loss", "week", "1000.00", false, "", ""],
  ["tight_margin", "day", "348.00", false, "", ""],
  ["adequate_margin", "appointment", "60.00", false, "", ""],
  ["above_target", "hour", "70.00", false, "", ""],
] as const;

function buildServiceTemplate(
  shape: (typeof serviceShapes)[number],
): SeedReportTemplate {
  const [expectedVerdict, pricingMethod, currentPrice, hasMaterialCost, materialCost, materialCostUnit] =
    shape;
  const key = `service.quick.${expectedVerdict}`;

  return {
    key,
    category: "service",
    analysisMode: "quick",
    expectedVerdict,
    materialize(ids) {
      const input: ServiceFlowSubmissionInput = {
        submissionId: ids.submissionId,
        desiredMonthlyIncome: "4000",
        fixedMonthlyExpenses: "2000",
        pricingMethod,
        currentPrice,
        dailyWorkHours: "6",
        weeklyWorkDays: "5",
        appointmentDurationMinutes: "60",
        hasMaterialCost,
        materialCost,
        materialCostUnit,
        paysRevenueTax: true,
        taxRate: "6",
        hasPaymentFee: true,
        paymentFeeRate: "2",
      };
      const command = composeServiceDiagnosisCommand(input);
      const calculation = calculateServiceReport(command);
      const snapshot = buildServiceReportSnapshot(command, calculation);
      assertVerdict(key, expectedVerdict, calculation.verdict);

      return {
        templateKey: key,
        submissionId: ids.submissionId,
        verdict: calculation.verdict,
        priority: calculation.priority,
        rpc: toSeedRpcCall(
          "public.create_service_diagnosis_report_v4",
          toServiceRpcArgs(command, snapshot),
        ),
      };
    },
  };
}

const commerceVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "no_sales",
  "operational_loss",
  "break_even",
  "tight_margin",
  "adequate_margin",
] as const;

type CommerceVerdict = (typeof commerceVerdicts)[number];

function commerceShape(verdict: CommerceVerdict): {
  volume: number | null;
  directCost: number;
  effectiveFixedCost: number;
} {
  switch (verdict) {
    case "direct_loss":
      return { volume: 100, directCost: 9_500, effectiveFixedCost: 300_000 };
    case "incomplete_volume":
      return { volume: null, directCost: 0, effectiveFixedCost: 300_000 };
    case "no_sales":
      return { volume: 0, directCost: 0, effectiveFixedCost: 300_000 };
    case "operational_loss":
      return { volume: 50, directCost: 5_000, effectiveFixedCost: 300_000 };
    case "break_even":
      return { volume: 100, directCost: 5_000, effectiveFixedCost: 420_000 };
    case "tight_margin":
      return { volume: 100, directCost: 5_000, effectiveFixedCost: 300_000 };
    case "adequate_margin":
      return { volume: 100, directCost: 3_000, effectiveFixedCost: 200_000 };
  }
}

function buildProductTemplate(verdict: CommerceVerdict): SeedReportTemplate {
  const key = `product.quick.${verdict}`;
  return {
    key,
    category: "product",
    analysisMode: "quick",
    expectedVerdict: verdict,
    materialize(ids) {
      const shape = commerceShape(verdict);
      const command: ProductDiagnosisCommand = {
        submissionId: ids.submissionId,
        productKind:
          verdict === "incomplete_volume" || verdict === "no_sales"
            ? "digital"
            : "resale",
        purchaseUnitCostCents: shape.directCost,
        unitSalePriceCents: 10_000,
        fixedMonthlyExpensesCents: 100_000,
        monthlySalesVolume: shape.volume,
        proLaboreIncluded: true,
        proLaboreCents: shape.effectiveFixedCost - 100_000,
        taxRateBasisPoints: 600,
        cardFeeRateBasisPoints: 200,
      };
      const calculation = calculateProductReport(command);
      const snapshot = buildProductReportSnapshot(command, calculation);
      assertVerdict(key, verdict, calculation.verdict);

      return {
        templateKey: key,
        submissionId: ids.submissionId,
        verdict: calculation.verdict,
        priority: calculation.priority,
        rpc: toSeedRpcCall(
          "public.create_product_diagnosis_report_v3",
          toProductRpcArgs(command, snapshot),
        ),
      };
    },
  };
}

function buildProductionTemplate(verdict: CommerceVerdict): SeedReportTemplate {
  const key = `production.quick.${verdict}`;
  return {
    key,
    category: "production",
    analysisMode: "quick",
    expectedVerdict: verdict,
    materialize(ids) {
      const shape = commerceShape(verdict);
      const productionUnitCost = Math.max(5_000, shape.directCost);
      const composed = commerceVerdicts.indexOf(verdict) % 2 === 0;
      const components = composed
        ? {
            materialUnitCostCents: productionUnitCost - 1_000,
            packagingUnitCostCents: 250,
            directLaborUnitCostCents: 500,
            otherVariableUnitCostCents: 250,
          }
        : {
            materialUnitCostCents: null,
            packagingUnitCostCents: null,
            directLaborUnitCostCents: null,
            otherVariableUnitCostCents: null,
          };
      const command: ProductionDiagnosisCommand = {
        submissionId: ids.submissionId,
        costCompositionEnabled: composed,
        productionUnitCostCents: productionUnitCost,
        ...components,
        unitSalePriceCents: 10_000,
        fixedMonthlyExpensesCents: 100_000,
        monthlySalesVolume: shape.volume,
        proLaboreIncluded: true,
        proLaboreCents: shape.effectiveFixedCost - 100_000,
        taxRateBasisPoints: 600,
        cardFeeRateBasisPoints: 200,
      };
      const calculation = calculateProductionReport(command);
      const snapshot = buildProductionReportSnapshot(command, calculation);
      assertVerdict(key, verdict, calculation.verdict);

      return {
        templateKey: key,
        submissionId: ids.submissionId,
        verdict: calculation.verdict,
        priority: calculation.priority,
        rpc: toSeedRpcCall(
          "public.create_production_diagnosis_report_v3",
          toProductionRpcArgs(command, snapshot),
        ),
      };
    },
  };
}

const productDetailedCounts = [1, 2, 3, 5, 8, 10, 12] as const;
const productionDetailedCounts = [12, 10, 8, 5, 3, 2, 1] as const;

function detailedProductItems(
  ids: SeedReportIds,
  verdict: CommerceVerdict,
  itemCount: number,
): DetailedDiagnosisItem[] {
  return Array.from({ length: itemCount }, (_, position) => {
    const isAdequateLeader = verdict === "adequate_margin" && position === 0;
    return {
      id: ids.itemId(position),
      position,
      name: `Produto ${position + 1}`,
      kind: "resale" as const,
      purchaseUnitCostCents:
        verdict === "direct_loss"
          ? 9_500
          : verdict === "adequate_margin" && !isAdequateLeader
            ? 3_000
            : 5_000,
      packagingUnitCostCents: 0,
      unitSalePriceCents: 10_000,
      monthlySalesVolume:
        verdict === "incomplete_volume" && position === 0
          ? null
          : verdict === "no_sales"
            ? 0
            : isAdequateLeader
              ? 1_000
              : verdict === "operational_loss" || verdict === "break_even"
                ? 10
                : verdict === "adequate_margin"
                  ? 10
                  : 100,
    };
  });
}

function detailedFixedCost(
  category: "product" | "production",
  verdict: CommerceVerdict,
  itemCount: number,
): number {
  if (category === "product") {
    if (verdict === "operational_loss") return itemCount * 50_000;
    if (verdict === "break_even") return itemCount * 50_000;
    if (verdict === "tight_margin") return itemCount * 300_000;
    if (verdict === "adequate_margin") return itemCount * 100_000;
    return 300_000;
  }
  if (verdict === "operational_loss") return 1_000_000;
  if (verdict === "tight_margin") return 1_050_000;
  if (verdict === "adequate_margin") return 200_000;
  return 300_000;
}

function technicalSheetItem(
  ids: SeedReportIds,
  position: number,
  volume: number | null,
): DetailedDiagnosisItem {
  return {
    id: ids.itemId(position),
    position,
    name: `Produção técnica ${position + 1}`,
    kind: "manufacturing",
    costMode: "technical_sheet",
    unitSalePriceCents: 10_000,
    monthlySalesVolume: volume,
    recipeYield: 10,
    lossRateBasisPoints: 500,
    packagingUnitCostCents: 100,
    directLaborUnitCostCents: 200,
    otherVariableUnitCostCents: 100,
    ingredients: [
      {
        id: ids.ingredientId(position, 0),
        position: 0,
        name: "Ingrediente base",
        quantityMillionths: 1_000_000,
        unit: "kg",
        unitCostTenThousandths: 200_000,
      },
      {
        id: ids.ingredientId(position, 1),
        position: 1,
        name: "Ingrediente complementar",
        quantityMillionths: 500_000,
        unit: "l",
        unitCostTenThousandths: 200_000,
      },
    ],
  };
}

function detailedProductionItems(
  ids: SeedReportIds,
  verdict: CommerceVerdict,
  itemCount: number,
): DetailedDiagnosisItem[] {
  return Array.from({ length: itemCount }, (_, position) => {
    const volume =
      verdict === "incomplete_volume" && position === 0
        ? null
        : verdict === "no_sales"
          ? 0
          : verdict === "operational_loss" || verdict === "break_even"
            ? 10
            : 100;
    if (position % 2 === 1 || itemCount === 1) {
      return technicalSheetItem(ids, position, volume);
    }
    return {
      id: ids.itemId(position),
      position,
      name: `Produção resumida ${position + 1}`,
      kind: "manufacturing" as const,
      costMode: "summarized" as const,
      productionUnitCostCents:
        verdict === "direct_loss" && position === 0 ? 9_500 : 5_000,
      unitSalePriceCents: 10_000,
      monthlySalesVolume: volume,
    };
  });
}

function buildDetailedTemplate(
  category: "product" | "production",
  verdict: CommerceVerdict,
  itemCount: number,
): SeedReportTemplate {
  const key = `${category}.detailed.${verdict}`;
  return {
    key,
    category,
    analysisMode: "detailed",
    expectedVerdict: verdict,
    materialize(ids) {
      const items =
        category === "product"
          ? detailedProductItems(ids, verdict, itemCount)
          : detailedProductionItems(ids, verdict, itemCount);
      const fees = verdict === "break_even" ? 0 : 800;
      let fixedCost = detailedFixedCost(category, verdict, itemCount);
      let command: DetailedDiagnosisCommand = {
        submissionId: ids.submissionId,
        category,
        fixedMonthlyExpensesCents: fixedCost,
        proLaboreIncluded: false,
        proLaboreCents: 0,
        taxRateBasisPoints: fees === 0 ? 0 : 600,
        cardFeeRateBasisPoints: fees === 0 ? 0 : 200,
        items,
      };

      if (category === "production" && verdict === "break_even") {
        const provisional = calculateDetailedDiagnosis({
          ...command,
          fixedMonthlyExpensesCents: 0,
        });
        fixedCost = provisional.monthlyContributionCents ?? 0;
        command = { ...command, fixedMonthlyExpensesCents: fixedCost };
      }

      const calculation = calculateDetailedDiagnosis(command);
      const snapshot = buildDetailedReportSnapshot(command, calculation);
      assertVerdict(key, verdict, calculation.verdict as DetailedDiagnosisVerdict);

      return {
        templateKey: key,
        submissionId: ids.submissionId,
        verdict: calculation.verdict,
        priority: calculation.priority,
        rpc: toSeedRpcCall(
          "public.create_detailed_diagnosis_report",
          toDetailedRpcArgs(command, snapshot),
        ),
      };
    },
  };
}

const currentReportTemplates: SeedReportTemplate[] = [
  ...serviceShapes.map(buildServiceTemplate),
  ...commerceVerdicts.map(buildProductTemplate),
  ...commerceVerdicts.map(buildProductionTemplate),
  ...commerceVerdicts.map((verdict, index) =>
    buildDetailedTemplate("product", verdict, productDetailedCounts[index]!),
  ),
  ...commerceVerdicts.map((verdict, index) =>
    buildDetailedTemplate(
      "production",
      verdict,
      productionDetailedCounts[index]!,
    ),
  ),
];

export {
  buildSeedReportIds,
  currentReportTemplates,
  type SeedMaterializedReport,
  type SeedReportIds,
  type SeedReportTemplate,
};
