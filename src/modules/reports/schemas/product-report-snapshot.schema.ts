import { z } from "zod";

import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";

import {
  PRODUCT_CALCULATION_VERSION,
  PRODUCT_CONTENT_VERSION,
  PRODUCT_REPORT_SCHEMA_VERSION,
  productReportPriorities,
  productReportVerdicts,
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

const productReportPolicySchema = z.strictObject({
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});

const productReportInputsSchema = z.strictObject({
  productKind: z.enum(["resale", "digital"]),
  purchaseUnitCostCents: nonNegativeSafeIntegerSchema,
  unitSalePriceCents: positiveSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlySalesVolume: z.number().int().min(0).max(2_147_483_647).nullable(),
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});

const productReportResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  purchaseUnitCostCents: nonNegativeSafeIntegerSchema,
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
  verdict: z.enum(productReportVerdicts),
  priority: z.enum(productReportPriorities),
});

const productReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
});

const productReportSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(PRODUCT_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(PRODUCT_CALCULATION_VERSION),
    contentVersion: z.union([z.literal(4), z.literal(PRODUCT_CONTENT_VERSION)]),
    category: z.literal("product"),
    scenario: z.enum(["resale", "digital"]),
    currency: z.literal("BRL"),
    unit: z.literal("unit"),
    policy: productReportPolicySchema,
    inputs: productReportInputsSchema,
    results: productReportResultsSchema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: productReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    if (
      snapshot.scenario !== snapshot.inputs.productKind ||
      snapshot.policy.proLaboreIncluded !== snapshot.inputs.proLaboreIncluded
    ) {
      context.addIssue({
        code: "custom",
        path: ["inputs"],
        message: "Cenário e política devem corresponder às entradas.",
      });
    }
    const expectedResults = calculateProductReport({
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

type ProductReportDiscountSimulationBase = z.infer<
  typeof productReportDiscountSimulationBaseSchema
>;
type ProductReportSnapshot = z.infer<typeof productReportSnapshotSchema>;
type CurrentProductReportSnapshot = ProductReportSnapshot;

function parseProductReportSnapshot(value: unknown): ProductReportSnapshot {
  return productReportSnapshotSchema.parse(value);
}

const parseCurrentProductReportSnapshot = parseProductReportSnapshot;

export {
  parseCurrentProductReportSnapshot,
  parseProductReportSnapshot,
  productReportDiscountSimulationBaseSchema,
  productReportInputsSchema,
  productReportPolicySchema,
  productReportResultsSchema,
  productReportSnapshotSchema,
  type CurrentProductReportSnapshot,
  type ProductReportDiscountSimulationBase,
  type ProductReportSnapshot,
};
