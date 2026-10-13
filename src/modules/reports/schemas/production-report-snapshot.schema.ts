import { z } from "zod";

import { calculateProductionReport } from "@/modules/reports/domain/calculate-production-report";

import {
  PRODUCTION_CALCULATION_VERSION,
  PRODUCTION_CONTENT_VERSION,
  PRODUCTION_REPORT_SCHEMA_VERSION,
  productionReportPriorities,
  productionReportVerdicts,
  reportExecutiveSummaryAnswerKeys,
  reportExecutiveSummaryFactKeys,
  reportSectionKeys,
} from "../types";
import {
  nonNegativeSafeIntegerSchema,
  positiveSafeIntegerSchema,
  reportExecutiveSummarySchema,
  reportSectionSchema,
  safeIntegerSchema,
} from "./report-content.schema";

const nullableCostSchema = nonNegativeSafeIntegerSchema.nullable();

const productionReportPolicySchema = z.strictObject({
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});

const productionReportInputsSchema = z.strictObject({
  costCompositionEnabled: z.boolean(),
  productionUnitCostCents: nonNegativeSafeIntegerSchema,
  materialUnitCostCents: nullableCostSchema,
  packagingUnitCostCents: nullableCostSchema,
  directLaborUnitCostCents: nullableCostSchema,
  otherVariableUnitCostCents: nullableCostSchema,
  unitSalePriceCents: positiveSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlySalesVolume: z.number().int().min(0).max(2_147_483_647).nullable(),
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});

const productionReportResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  productionUnitCostCents: nonNegativeSafeIntegerSchema,
  fixedAllocationCents: nonNegativeSafeIntegerSchema.nullable(),
  totalUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  currentPriceCents: positiveSafeIntegerSchema,
  feeAmountCents: safeIntegerSchema,
  netRevenueCents: safeIntegerSchema,
  unitContributionCents: safeIntegerSchema,
  unitProfitCents: safeIntegerSchema.nullable(),
  monthlySalesVolumeUsed: nonNegativeSafeIntegerSchema.nullable(),
  monthlyGrossRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyNetRevenueCents: safeIntegerSchema.nullable(),
  monthlyResultCents: safeIntegerSchema.nullable(),
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  weeklySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  dailySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  breakEvenDiscountPercent: nonNegativeSafeIntegerSchema.nullable(),
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  verdict: z.enum(productionReportVerdicts),
  priority: z.enum(productionReportPriorities),
});

const productionReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
});

const productionReportSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(PRODUCTION_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(PRODUCTION_CALCULATION_VERSION),
    contentVersion: z.union([
      z.literal(4),
      z.literal(5),
      z.literal(PRODUCTION_CONTENT_VERSION),
    ]),
    category: z.literal("production"),
    scenario: z.literal("manufacturing"),
    currency: z.literal("BRL"),
    unit: z.literal("unit"),
    policy: productionReportPolicySchema,
    inputs: productionReportInputsSchema,
    results: productionReportResultsSchema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: productionReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    const components = [
      snapshot.inputs.materialUnitCostCents,
      snapshot.inputs.packagingUnitCostCents,
      snapshot.inputs.directLaborUnitCostCents,
      snapshot.inputs.otherVariableUnitCostCents,
    ];
    const componentsMatchMode = snapshot.inputs.costCompositionEnabled
      ? components.every((value) => value !== null) &&
        components.reduce((sum, value) => sum + (value ?? 0), 0) ===
          snapshot.inputs.productionUnitCostCents
      : components.every((value) => value === null);
    if (
      !componentsMatchMode ||
      snapshot.policy.proLaboreIncluded !== snapshot.inputs.proLaboreIncluded
    ) {
      context.addIssue({
        code: "custom",
        path: ["inputs"],
        message: "A composição e a política devem corresponder às entradas.",
      });
    }
    const expectedResults = calculateProductionReport({
      submissionId: "00000000-0000-4000-8000-000000000000",
      ...snapshot.inputs,
    });
    if (JSON.stringify(snapshot.results) !== JSON.stringify(expectedResults)) {
      context.addIssue({
        code: "custom",
        path: ["results"],
        message: "Os resultados não correspondem às entradas normalizadas.",
      });
    }
    const expectedBase = {
      originalPriceCents: snapshot.results.currentPriceCents,
      unitCostCents: snapshot.results.totalUnitCostCents,
      totalFeeBasisPoints: snapshot.results.totalFeeBasisPoints,
      minimumPriceCents: snapshot.results.minimumPriceCents,
    };
    if (
      JSON.stringify(snapshot.discountSimulationBase) !==
      JSON.stringify(expectedBase)
    ) {
      context.addIssue({
        code: "custom",
        path: ["discountSimulationBase"],
        message: "A base do simulador não corresponde ao diagnóstico.",
      });
    }
    reportExecutiveSummaryFactKeys.forEach((key, index) => {
      if (snapshot.executiveSummary.facts[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["executiveSummary", "facts", index, "key"],
          message: "A ordem dos fatos deve ser preservada.",
        });
    });
    reportExecutiveSummaryAnswerKeys.forEach((key, index) => {
      if (snapshot.executiveSummary.answers[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["executiveSummary", "answers", index, "key"],
          message: "A ordem das respostas deve ser preservada.",
        });
    });
    reportSectionKeys.forEach((key, index) => {
      if (snapshot.sections[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["sections", index, "key"],
          message: "A ordem das seções deve ser preservada.",
        });
    });
  });

type ProductionReportDiscountSimulationBase = z.infer<
  typeof productionReportDiscountSimulationBaseSchema
>;
type ProductionReportSnapshot = z.infer<typeof productionReportSnapshotSchema>;
type CurrentProductionReportSnapshot = ProductionReportSnapshot;

function parseProductionReportSnapshot(
  value: unknown,
): ProductionReportSnapshot {
  return productionReportSnapshotSchema.parse(value);
}

const parseCurrentProductionReportSnapshot = parseProductionReportSnapshot;

export {
  parseCurrentProductionReportSnapshot,
  parseProductionReportSnapshot,
  productionReportDiscountSimulationBaseSchema,
  productionReportInputsSchema,
  productionReportPolicySchema,
  productionReportResultsSchema,
  productionReportSnapshotSchema,
  type CurrentProductionReportSnapshot,
  type ProductionReportDiscountSimulationBase,
  type ProductionReportSnapshot,
};
