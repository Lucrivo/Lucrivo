import { z } from "zod";

import {
  productionReportPriorities,
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

const legacyProductionReportVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;
const currentProductionReportVerdicts = [
  "direct_loss",
  "operational_loss",
  "no_sales",
  "break_even",
  "tight_margin",
  "adequate_margin",
] as const;
const productionV4Verdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "no_sales",
  "break_even",
  "tight_margin",
  "adequate_margin",
] as const;

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
const productionReportInputsV4Schema = productionReportInputsSchema.extend({
  monthlySalesVolume: z.number().int().min(0).max(2_147_483_647).nullable(),
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
  verdict: z.enum(legacyProductionReportVerdicts),
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

const productionReportSnapshotCoreSchema = z.strictObject({
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
});

function createProductionReportSnapshotSchema(contentVersion: 1 | 2) {
  return productionReportSnapshotCoreSchema
    .extend({
      schemaVersion: z.literal(1),
      calculationVersion: z.literal(1),
      contentVersion: z.literal(contentVersion),
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
          message:
            "O indicador de referência parcial não corresponde ao volume.",
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

      for (const [
        index,
        expectedKey,
      ] of reportExecutiveSummaryFactKeys.entries()) {
        if (snapshot.executiveSummary.facts[index]?.key === expectedKey)
          continue;

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
}

const productionReportSnapshotV1Schema =
  createProductionReportSnapshotSchema(1);
const productionReportSnapshotV2Schema =
  createProductionReportSnapshotSchema(2);

const currentProductionReportPolicySchema = z.strictObject({
  attentionBandBasisPoints: z.literal(2000),
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});
const currentProductionReportResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  productionUnitCostCents: positiveSafeIntegerSchema,
  fixedAllocationCents: nonNegativeSafeIntegerSchema.nullable(),
  totalUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  currentPriceCents: positiveSafeIntegerSchema,
  feeAmountCents: safeIntegerSchema,
  netRevenueCents: safeIntegerSchema,
  unitContributionCents: safeIntegerSchema,
  unitProfitCents: safeIntegerSchema.nullable(),
  monthlySalesVolumeUsed: nonNegativeSafeIntegerSchema,
  monthlyGrossRevenueCents: nonNegativeSafeIntegerSchema,
  monthlyNetRevenueCents: safeIntegerSchema,
  monthlyResultCents: safeIntegerSchema,
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  priceReferencesPartial: z.boolean(),
  monthlySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  weeklySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  dailySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  breakEvenDiscountPercent: nonNegativeSafeIntegerSchema.nullable(),
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  verdict: z.enum(currentProductionReportVerdicts),
  priority: z.enum(productionReportPriorities),
});
const productionReportResultsV4Schema =
  currentProductionReportResultsSchema.extend({
    monthlySalesVolumeUsed: nonNegativeSafeIntegerSchema.nullable(),
    monthlyGrossRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
    monthlyNetRevenueCents: safeIntegerSchema.nullable(),
    monthlyResultCents: safeIntegerSchema.nullable(),
    verdict: z.enum(productionV4Verdicts),
  });
const currentProductionReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: positiveSafeIntegerSchema,
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  attentionBandBasisPoints: z.literal(2000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  partial: z.boolean(),
});

const productionReportSnapshotV3Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    calculationVersion: z.literal(2),
    contentVersion: z.literal(3),
    category: z.literal("production"),
    scenario: z.literal("manufacturing"),
    currency: z.literal("BRL"),
    unit: z.literal("unit"),
    policy: currentProductionReportPolicySchema,
    inputs: productionReportInputsSchema,
    results: currentProductionReportResultsSchema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: currentProductionReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    const { inputs, policy, results, discountSimulationBase } = snapshot;
    const components = [
      ["materialUnitCostCents", inputs.materialUnitCostCents],
      ["packagingUnitCostCents", inputs.packagingUnitCostCents],
      ["directLaborUnitCostCents", inputs.directLaborUnitCostCents],
      ["otherVariableUnitCostCents", inputs.otherVariableUnitCostCents],
    ] as const;
    for (const [field, value] of components) {
      if (
        (inputs.costCompositionEnabled && value === null) ||
        (!inputs.costCompositionEnabled && value !== null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["inputs", field],
          message: "O componente não corresponde ao modo de custo.",
        });
      }
    }
    if (
      inputs.costCompositionEnabled &&
      components.every(([, value]) => value !== null) &&
      components.reduce(
        (total, [, value]) => total + BigInt(value ?? 0),
        BigInt(0),
      ) !== BigInt(inputs.productionUnitCostCents)
    ) {
      context.addIssue({
        code: "custom",
        path: ["inputs", "productionUnitCostCents"],
        message: "O custo de fabricação deve ser a soma dos componentes.",
      });
    }
    if (inputs.proLaboreIncluded !== inputs.proLaboreCents > 0)
      context.addIssue({
        code: "custom",
        path: ["inputs", "proLaboreCents"],
        message: "O valor mensal deve corresponder à seleção.",
      });
    if (policy.proLaboreIncluded !== inputs.proLaboreIncluded)
      context.addIssue({
        code: "custom",
        path: ["policy", "proLaboreIncluded"],
        message: "A política deve corresponder às entradas.",
      });
    if (results.productionUnitCostCents !== inputs.productionUnitCostCents)
      context.addIssue({
        code: "custom",
        path: ["results", "productionUnitCostCents"],
        message: "O custo deve corresponder às entradas.",
      });
    if (results.currentPriceCents !== inputs.unitSalePriceCents)
      context.addIssue({
        code: "custom",
        path: ["results", "currentPriceCents"],
        message: "O preço deve corresponder às entradas.",
      });
    const usedVolume = inputs.monthlySalesVolume ?? 0;
    if (results.monthlySalesVolumeUsed !== usedVolume)
      context.addIssue({
        code: "custom",
        path: ["results", "monthlySalesVolumeUsed"],
        message: "A quantidade usada deve corresponder à entrada.",
      });
    for (const [field, value] of [
      ["fixedAllocationCents", results.fixedAllocationCents],
      ["totalUnitCostCents", results.totalUnitCostCents],
      ["unitProfitCents", results.unitProfitCents],
      ["realMarginBasisPoints", results.realMarginBasisPoints],
    ] as const) {
      if (
        (usedVolume === 0 && value !== null) ||
        (usedVolume > 0 && value === null)
      )
        context.addIssue({
          code: "custom",
          path: ["results", field],
          message: "O campo deve corresponder à quantidade usada.",
        });
    }
    const partial = inputs.monthlySalesVolume === null;
    if (results.priceReferencesPartial !== partial)
      context.addIssue({
        code: "custom",
        path: ["results", "priceReferencesPartial"],
        message: "O indicador parcial não corresponde ao volume original.",
      });
    const checks = [
      [
        "originalPriceCents",
        discountSimulationBase.originalPriceCents,
        results.currentPriceCents,
      ],
      [
        "unitCostCents",
        discountSimulationBase.unitCostCents,
        results.totalUnitCostCents ?? results.productionUnitCostCents,
      ],
      [
        "totalFeeBasisPoints",
        discountSimulationBase.totalFeeBasisPoints,
        results.totalFeeBasisPoints,
      ],
      [
        "attentionBandBasisPoints",
        discountSimulationBase.attentionBandBasisPoints,
        policy.attentionBandBasisPoints,
      ],
      [
        "minimumPriceCents",
        discountSimulationBase.minimumPriceCents,
        results.minimumPriceCents,
      ],
      ["partial", discountSimulationBase.partial, partial],
    ] as const;
    for (const [field, actual, expected] of checks)
      if (actual !== expected)
        context.addIssue({
          code: "custom",
          path: ["discountSimulationBase", field],
          message: "A base do simulador deve corresponder ao diagnóstico.",
        });
    for (const [index, key] of reportExecutiveSummaryFactKeys.entries())
      if (snapshot.executiveSummary.facts[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["executiveSummary", "facts", index, "key"],
          message: "A ordem dos fatos deve ser preservada.",
        });
    for (const [index, key] of reportExecutiveSummaryAnswerKeys.entries())
      if (snapshot.executiveSummary.answers[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["executiveSummary", "answers", index, "key"],
          message: "A ordem das respostas deve ser preservada.",
        });
    for (const [index, key] of reportSectionKeys.entries())
      if (snapshot.sections[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["sections", index, "key"],
          message: "A ordem das seções deve ser preservada.",
        });
  });
const productionReportSnapshotV4Schema = z
  .strictObject({
    schemaVersion: z.literal(3),
    calculationVersion: z.literal(3),
    contentVersion: z.literal(4),
    category: z.literal("production"),
    scenario: z.literal("manufacturing"),
    currency: z.literal("BRL"),
    unit: z.literal("unit"),
    policy: currentProductionReportPolicySchema,
    inputs: productionReportInputsV4Schema,
    results: productionReportResultsV4Schema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: currentProductionReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    const { inputs, policy, results, discountSimulationBase } = snapshot;
    const unknownVolume = inputs.monthlySalesVolume === null;
    const zeroVolume = inputs.monthlySalesVolume === 0;
    const components = [
      ["materialUnitCostCents", inputs.materialUnitCostCents],
      ["packagingUnitCostCents", inputs.packagingUnitCostCents],
      ["directLaborUnitCostCents", inputs.directLaborUnitCostCents],
      ["otherVariableUnitCostCents", inputs.otherVariableUnitCostCents],
    ] as const;
    for (const [field, value] of components)
      if (
        (inputs.costCompositionEnabled && value === null) ||
        (!inputs.costCompositionEnabled && value !== null)
      )
        context.addIssue({
          code: "custom",
          path: ["inputs", field],
          message: "O componente não corresponde ao modo de custo.",
        });
    if (
      inputs.costCompositionEnabled &&
      components.every(([, value]) => value !== null) &&
      components.reduce(
        (total, [, value]) => total + BigInt(value ?? 0),
        BigInt(0),
      ) !== BigInt(inputs.productionUnitCostCents)
    )
      context.addIssue({
        code: "custom",
        path: ["inputs", "productionUnitCostCents"],
        message: "O custo de fabricação deve ser a soma dos componentes.",
      });
    const nullableMonthlyFields = [
      results.monthlySalesVolumeUsed,
      results.monthlyGrossRevenueCents,
      results.monthlyNetRevenueCents,
      results.monthlyResultCents,
      results.realMarginBasisPoints,
    ];
    if (unknownVolume && nullableMonthlyFields.some((value) => value !== null))
      context.addIssue({
        code: "custom",
        path: ["results", "monthlyResultCents"],
        message: "Resultados mensais devem ser nulos sem volume informado.",
      });
    if (
      !unknownVolume &&
      [
        results.monthlySalesVolumeUsed,
        results.monthlyGrossRevenueCents,
        results.monthlyNetRevenueCents,
        results.monthlyResultCents,
      ].some((value) => value === null)
    )
      context.addIssue({
        code: "custom",
        path: ["results", "monthlyResultCents"],
        message: "Resultados mensais devem existir com volume informado.",
      });
    if (
      results.monthlySalesVolumeUsed !== inputs.monthlySalesVolume ||
      (zeroVolume && results.realMarginBasisPoints !== null) ||
      (!unknownVolume && !zeroVolume && results.realMarginBasisPoints === null)
    )
      context.addIssue({
        code: "custom",
        path: ["results", "monthlySalesVolumeUsed"],
        message: "Os resultados mensais devem corresponder ao volume.",
      });
    for (const [field, value] of [
      ["fixedAllocationCents", results.fixedAllocationCents],
      ["totalUnitCostCents", results.totalUnitCostCents],
      ["unitProfitCents", results.unitProfitCents],
    ] as const)
      if (
        ((unknownVolume || zeroVolume) && value !== null) ||
        (!unknownVolume && !zeroVolume && value === null)
      )
        context.addIssue({
          code: "custom",
          path: ["results", field],
          message: "O campo deve corresponder à quantidade usada.",
        });
    if (
      (unknownVolume &&
        (results.weeklySalesGoal !== null ||
          results.dailySalesGoal !== null)) ||
      results.priceReferencesPartial !== unknownVolume
    )
      context.addIssue({
        code: "custom",
        path: ["results", "priceReferencesPartial"],
        message: "O indicador parcial não corresponde ao volume original.",
      });
    if (
      inputs.proLaboreIncluded !== inputs.proLaboreCents > 0 ||
      policy.proLaboreIncluded !== inputs.proLaboreIncluded
    )
      context.addIssue({
        code: "custom",
        path: ["inputs", "proLaboreCents"],
        message: "O valor mensal deve corresponder à seleção.",
      });
    if (
      results.productionUnitCostCents !== inputs.productionUnitCostCents ||
      results.currentPriceCents !== inputs.unitSalePriceCents
    )
      context.addIssue({
        code: "custom",
        path: ["results", "currentPriceCents"],
        message: "Preço e custo devem corresponder às entradas.",
      });
    const checks = [
      [
        "originalPriceCents",
        discountSimulationBase.originalPriceCents,
        results.currentPriceCents,
      ],
      [
        "unitCostCents",
        discountSimulationBase.unitCostCents,
        results.totalUnitCostCents ?? results.productionUnitCostCents,
      ],
      [
        "totalFeeBasisPoints",
        discountSimulationBase.totalFeeBasisPoints,
        results.totalFeeBasisPoints,
      ],
      [
        "attentionBandBasisPoints",
        discountSimulationBase.attentionBandBasisPoints,
        policy.attentionBandBasisPoints,
      ],
      [
        "minimumPriceCents",
        discountSimulationBase.minimumPriceCents,
        results.minimumPriceCents,
      ],
      ["partial", discountSimulationBase.partial, unknownVolume],
    ] as const;
    for (const [field, actual, expected] of checks)
      if (actual !== expected)
        context.addIssue({
          code: "custom",
          path: ["discountSimulationBase", field],
          message: "A base do simulador deve corresponder ao diagnóstico.",
        });
    for (const [index, key] of reportExecutiveSummaryFactKeys.entries())
      if (snapshot.executiveSummary.facts[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["executiveSummary", "facts", index, "key"],
          message: "A ordem dos fatos deve ser preservada.",
        });
    for (const [index, key] of reportExecutiveSummaryAnswerKeys.entries())
      if (snapshot.executiveSummary.answers[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["executiveSummary", "answers", index, "key"],
          message: "A ordem das respostas deve ser preservada.",
        });
    for (const [index, key] of reportSectionKeys.entries())
      if (snapshot.sections[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["sections", index, "key"],
          message: "A ordem das seções deve ser preservada.",
        });
  });
const productionReportSnapshotSchema = z.union([
  productionReportSnapshotV1Schema,
  productionReportSnapshotV2Schema,
  productionReportSnapshotV3Schema,
  productionReportSnapshotV4Schema,
]);

type ProductionReportDiscountSimulationBase = z.infer<
  typeof currentProductionReportDiscountSimulationBaseSchema
>;
type ProductionReportSnapshotV1 = z.infer<
  typeof productionReportSnapshotV1Schema
>;
type ProductionReportSnapshotV2 = z.infer<
  typeof productionReportSnapshotV2Schema
>;
type ProductionReportSnapshotV3 = z.infer<
  typeof productionReportSnapshotV3Schema
>;
type ProductionReportSnapshotV4 = z.infer<
  typeof productionReportSnapshotV4Schema
>;
type ProductionReportSnapshot = z.infer<typeof productionReportSnapshotSchema>;
type CurrentProductionReportSnapshot = ProductionReportSnapshotV4;

function parseProductionReportSnapshot(
  value: unknown,
): ProductionReportSnapshot {
  return productionReportSnapshotSchema.parse(value);
}

function parseCurrentProductionReportSnapshot(
  value: unknown,
): CurrentProductionReportSnapshot {
  return productionReportSnapshotV4Schema.parse(value);
}

export {
  parseCurrentProductionReportSnapshot,
  parseProductionReportSnapshot,
  productionReportDiscountSimulationBaseSchema,
  productionReportInputsSchema,
  productionReportPolicySchema,
  productionReportResultsSchema,
  productionReportSnapshotSchema,
  productionReportSnapshotV1Schema,
  productionReportSnapshotV2Schema,
  productionReportSnapshotV3Schema,
  productionReportSnapshotV4Schema,
  type CurrentProductionReportSnapshot,
  type ProductionReportDiscountSimulationBase,
  type ProductionReportSnapshot,
  type ProductionReportSnapshotV1,
  type ProductionReportSnapshotV2,
  type ProductionReportSnapshotV3,
  type ProductionReportSnapshotV4,
};
