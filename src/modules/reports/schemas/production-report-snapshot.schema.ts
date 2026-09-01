import { z } from "zod";

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

const productionReportPolicySchema = z.strictObject({
  targetMarginBasisPoints: z.literal(2000),
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});

const productionReportInputsSchema = z.strictObject({
  costCompositionEnabled: z.boolean(),
  productionUnitCostCents: positiveSafeIntegerSchema,
  materialUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  packagingUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  directLaborUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  otherVariableUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  unitSalePriceCents: positiveSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlySalesVolume: z.number().int().positive().max(2_147_483_647).nullable(),
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});

const productionReportResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  productionUnitCostCents: positiveSafeIntegerSchema,
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
  verdict: z.enum(productionReportVerdicts),
  priority: z.enum(productionReportPriorities),
});

const productionReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: positiveSafeIntegerSchema,
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  targetMarginBasisPoints: z.literal(2000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  partial: z.boolean(),
});

const productionReportSnapshotV1Schema = z
  .strictObject({
    schemaVersion: z.literal(PRODUCTION_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(PRODUCTION_CALCULATION_VERSION),
    contentVersion: z.literal(PRODUCTION_CONTENT_VERSION),
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
    const { inputs, policy, results, discountSimulationBase } = snapshot;
    const componentFields = [
      ["materialUnitCostCents", inputs.materialUnitCostCents],
      ["packagingUnitCostCents", inputs.packagingUnitCostCents],
      ["directLaborUnitCostCents", inputs.directLaborUnitCostCents],
      ["otherVariableUnitCostCents", inputs.otherVariableUnitCostCents],
    ] as const;

    for (const [field, value] of componentFields) {
      const hasExpectedShape = inputs.costCompositionEnabled
        ? value !== null
        : value === null;

      if (hasExpectedShape) continue;

      context.addIssue({
        code: "custom",
        path: ["inputs", field],
        message: inputs.costCompositionEnabled
          ? "O componente deve ser informado no modo de composição."
          : "O componente deve ser nulo no modo resumido.",
      });
    }

    if (
      inputs.costCompositionEnabled &&
      componentFields.every(([, value]) => value !== null)
    ) {
      const componentTotal = componentFields.reduce(
        (total, [, value]) => total + BigInt(value ?? 0),
        BigInt(0),
      );

      if (componentTotal !== BigInt(inputs.productionUnitCostCents)) {
        context.addIssue({
          code: "custom",
          path: ["inputs", "productionUnitCostCents"],
          message:
            "O custo de produção deve corresponder à soma exata dos componentes.",
        });
      }
    }

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

    if (results.productionUnitCostCents !== inputs.productionUnitCostCents) {
      context.addIssue({
        code: "custom",
        path: ["results", "productionUnitCostCents"],
        message:
          "O custo de produção do resultado deve corresponder às entradas.",
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
      results.totalUnitCostCents ?? results.productionUnitCostCents;
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

    for (const [index, expectedKey] of reportExecutiveSummaryFactKeys.entries()) {
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

type ProductionReportDiscountSimulationBase = z.infer<
  typeof productionReportDiscountSimulationBaseSchema
>;
type ProductionReportSnapshotV1 = z.infer<
  typeof productionReportSnapshotV1Schema
>;

function parseProductionReportSnapshot(
  value: unknown,
): ProductionReportSnapshotV1 {
  return productionReportSnapshotV1Schema.parse(value);
}

export {
  parseProductionReportSnapshot,
  productionReportDiscountSimulationBaseSchema,
  productionReportInputsSchema,
  productionReportPolicySchema,
  productionReportResultsSchema,
  productionReportSnapshotV1Schema,
  type ProductionReportDiscountSimulationBase,
  type ProductionReportSnapshotV1,
};
