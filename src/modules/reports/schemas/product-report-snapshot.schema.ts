import { z } from "zod";

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
  targetMarginBasisPoints: z.literal(2000),
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});

const productReportInputsSchema = z.strictObject({
  purchaseUnitCostCents: positiveSafeIntegerSchema,
  unitSalePriceCents: positiveSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlySalesVolume: z.number().int().positive().max(2_147_483_647).nullable(),
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});

const productReportResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  purchaseUnitCostCents: positiveSafeIntegerSchema,
  fixedAllocationCents: nonNegativeSafeIntegerSchema.nullable(),
  totalUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  currentPriceCents: positiveSafeIntegerSchema,
  netRevenueCents: safeIntegerSchema,
  unitContributionCents: safeIntegerSchema,
  unitProfitCents: safeIntegerSchema.nullable(),
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  targetPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  priceReferencesPartial: z.boolean(),
  monthlySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  weeklySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  dailySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  breakEvenDiscountPercent: nonNegativeSafeIntegerSchema.nullable(),
  verdict: z.enum(productReportVerdicts),
  priority: z.enum(productReportPriorities),
});

const productReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: positiveSafeIntegerSchema,
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  targetMarginBasisPoints: z.literal(2000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  partial: z.boolean(),
});

const productReportSnapshotV1Schema = z
  .strictObject({
    schemaVersion: z.literal(PRODUCT_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(PRODUCT_CALCULATION_VERSION),
    contentVersion: z.literal(PRODUCT_CONTENT_VERSION),
    category: z.literal("product"),
    scenario: z.literal("resale"),
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
    const { inputs, policy, results, discountSimulationBase } = snapshot;
    const hasCompensation = inputs.proLaboreCents > 0;

    if (inputs.proLaboreIncluded !== hasCompensation) {
      context.addIssue({
        code: "custom",
        path: ["inputs", "proLaboreCents"],
        message:
          "O pró-labore deve ser positivo quando incluído e zero quando desabilitado.",
      });
    }

    if (policy.proLaboreIncluded !== inputs.proLaboreIncluded) {
      context.addIssue({
        code: "custom",
        path: ["policy", "proLaboreIncluded"],
        message: "A política de pró-labore deve corresponder às entradas.",
      });
    }

    if (results.purchaseUnitCostCents !== inputs.purchaseUnitCostCents) {
      context.addIssue({
        code: "custom",
        path: ["results", "purchaseUnitCostCents"],
        message:
          "O custo de compra do resultado deve corresponder às entradas.",
      });
    }

    if (results.currentPriceCents !== inputs.unitSalePriceCents) {
      context.addIssue({
        code: "custom",
        path: ["results", "currentPriceCents"],
        message: "O preço atual do resultado deve corresponder às entradas.",
      });
    }

    const completeResultFields = [
      ["fixedAllocationCents", results.fixedAllocationCents],
      ["totalUnitCostCents", results.totalUnitCostCents],
      ["unitProfitCents", results.unitProfitCents],
      ["realMarginBasisPoints", results.realMarginBasisPoints],
    ] as const;
    const shouldBePartial = inputs.monthlySalesVolume === null;

    for (const [field, value] of completeResultFields) {
      if (
        (shouldBePartial && value === null) ||
        (!shouldBePartial && value !== null)
      ) {
        continue;
      }

      context.addIssue({
        code: "custom",
        path: ["results", field],
        message: shouldBePartial
          ? "O campo deve ser nulo quando o volume mensal não foi informado."
          : "O campo deve ser preenchido quando o volume mensal foi informado.",
      });
    }

    if (results.priceReferencesPartial !== shouldBePartial) {
      context.addIssue({
        code: "custom",
        path: ["results", "priceReferencesPartial"],
        message: "O indicador de referência parcial não corresponde ao volume.",
      });
    }

    const applicableUnitCost =
      results.totalUnitCostCents ?? results.purchaseUnitCostCents;
    const expectedTotalFeeBasisPoints =
      inputs.taxRateBasisPoints + inputs.cardFeeRateBasisPoints;
    const baseChecks = [
      [
        "originalPriceCents",
        discountSimulationBase.originalPriceCents,
        results.currentPriceCents,
      ],
      [
        "unitCostCents",
        discountSimulationBase.unitCostCents,
        applicableUnitCost,
      ],
      [
        "totalFeeBasisPoints",
        discountSimulationBase.totalFeeBasisPoints,
        expectedTotalFeeBasisPoints,
      ],
      [
        "targetMarginBasisPoints",
        discountSimulationBase.targetMarginBasisPoints,
        policy.targetMarginBasisPoints,
      ],
      [
        "minimumPriceCents",
        discountSimulationBase.minimumPriceCents,
        results.minimumPriceCents,
      ],
      ["partial", discountSimulationBase.partial, shouldBePartial],
    ] as const;

    for (const [field, actual, expected] of baseChecks) {
      if (actual === expected) continue;

      context.addIssue({
        code: "custom",
        path: ["discountSimulationBase", field],
        message: "A base do simulador deve corresponder ao diagnóstico.",
      });
    }

    for (const [
      index,
      expectedKey,
    ] of reportExecutiveSummaryFactKeys.entries()) {
      if (snapshot.executiveSummary.facts[index]?.key === expectedKey) continue;

      context.addIssue({
        code: "custom",
        path: ["executiveSummary", "facts", index, "key"],
        message: `O fato ${index + 1} deve usar a chave ${expectedKey}.`,
      });
    }

    for (const [
      index,
      expectedKey,
    ] of reportExecutiveSummaryAnswerKeys.entries()) {
      if (snapshot.executiveSummary.answers[index]?.key === expectedKey)
        continue;

      context.addIssue({
        code: "custom",
        path: ["executiveSummary", "answers", index, "key"],
        message: `A resposta ${index + 1} deve usar a chave ${expectedKey}.`,
      });
    }

    for (const [index, expectedKey] of reportSectionKeys.entries()) {
      if (snapshot.sections[index]?.key === expectedKey) continue;

      context.addIssue({
        code: "custom",
        path: ["sections", index, "key"],
        message: `A seção ${index + 1} deve usar a chave ${expectedKey}.`,
      });
    }
  });

type ProductReportDiscountSimulationBase = z.infer<
  typeof productReportDiscountSimulationBaseSchema
>;
type ProductReportSnapshotV1 = z.infer<typeof productReportSnapshotV1Schema>;

function parseProductReportSnapshot(value: unknown): ProductReportSnapshotV1 {
  return productReportSnapshotV1Schema.parse(value);
}

export {
  parseProductReportSnapshot,
  productReportDiscountSimulationBaseSchema,
  productReportInputsSchema,
  productReportPolicySchema,
  productReportResultsSchema,
  productReportSnapshotV1Schema,
  type ProductReportDiscountSimulationBase,
  type ProductReportSnapshotV1,
};
