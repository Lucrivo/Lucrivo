import { z } from "zod";

import {
  productReportPriorities,
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

const legacyProductVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;
const currentProductVerdicts = [
  "direct_loss",
  "operational_loss",
  "no_sales",
  "break_even",
  "tight_margin",
  "adequate_margin",
] as const;
const productV4Verdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "no_sales",
  "break_even",
  "tight_margin",
  "adequate_margin",
] as const;

const legacyProductReportPolicySchema = z.strictObject({
  targetMarginBasisPoints: z.literal(2000),
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});
const productReportPolicySchema = z.strictObject({
  attentionBandBasisPoints: z.literal(2000),
  weeklyDivisorHundredths: z.literal(433),
  operatingDaysPerWeek: z.literal(6),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.boolean(),
});
const legacyProductReportInputsSchema = z.strictObject({
  purchaseUnitCostCents: nonNegativeSafeIntegerSchema,
  unitSalePriceCents: positiveSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlySalesVolume: z.number().int().positive().max(2_147_483_647).nullable(),
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});
const productReportInputsSchema = legacyProductReportInputsSchema.extend({
  productKind: z.enum(["resale", "digital"]),
});
const productReportInputsV4Schema = productReportInputsSchema.extend({
  monthlySalesVolume: z.number().int().min(0).max(2_147_483_647).nullable(),
});

const legacyProductReportResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  purchaseUnitCostCents: nonNegativeSafeIntegerSchema,
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
  verdict: z.enum(legacyProductVerdicts),
  priority: z.enum(productReportPriorities),
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
  verdict: z.enum(currentProductVerdicts),
  priority: z.enum(productReportPriorities),
});
const productReportResultsV4Schema = productReportResultsSchema.extend({
  monthlySalesVolumeUsed: nonNegativeSafeIntegerSchema.nullable(),
  monthlyGrossRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyNetRevenueCents: safeIntegerSchema.nullable(),
  monthlyResultCents: safeIntegerSchema.nullable(),
  verdict: z.enum(productV4Verdicts),
});

const legacyProductReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: nonNegativeSafeIntegerSchema,
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  targetMarginBasisPoints: z.literal(2000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  partial: z.boolean(),
});
const productReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: positiveSafeIntegerSchema,
  unitCostCents: nonNegativeSafeIntegerSchema,
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  attentionBandBasisPoints: z.literal(2000),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  partial: z.boolean(),
});

type OrderedSnapshot = {
  executiveSummary: z.infer<typeof reportExecutiveSummarySchema>;
  sections: z.infer<typeof reportSectionSchema>[];
};
function validateOrderedContent(
  snapshot: OrderedSnapshot,
  context: z.RefinementCtx,
) {
  for (const [index, key] of reportExecutiveSummaryFactKeys.entries())
    if (snapshot.executiveSummary.facts[index]?.key !== key)
      context.addIssue({
        code: "custom",
        path: ["executiveSummary", "facts", index, "key"],
        message: `O fato ${index + 1} deve usar a chave ${key}.`,
      });
  for (const [index, key] of reportExecutiveSummaryAnswerKeys.entries())
    if (snapshot.executiveSummary.answers[index]?.key !== key)
      context.addIssue({
        code: "custom",
        path: ["executiveSummary", "answers", index, "key"],
        message: `A resposta ${index + 1} deve usar a chave ${key}.`,
      });
  for (const [index, key] of reportSectionKeys.entries())
    if (snapshot.sections[index]?.key !== key)
      context.addIssue({
        code: "custom",
        path: ["sections", index, "key"],
        message: `A seção ${index + 1} deve usar a chave ${key}.`,
      });
}

const legacyProductReportSnapshotCoreSchema = z.strictObject({
  category: z.literal("product"),
  scenario: z.literal("resale"),
  currency: z.literal("BRL"),
  unit: z.literal("unit"),
  policy: legacyProductReportPolicySchema,
  inputs: legacyProductReportInputsSchema,
  results: legacyProductReportResultsSchema,
  executiveSummary: reportExecutiveSummarySchema,
  sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
  discountSimulationBase: legacyProductReportDiscountSimulationBaseSchema,
});
function createLegacyProductReportSnapshotSchema(contentVersion: 1 | 2) {
  return legacyProductReportSnapshotCoreSchema
    .extend({
      schemaVersion: z.literal(1),
      calculationVersion: z.literal(1),
      contentVersion: z.literal(contentVersion),
    })
    .superRefine((snapshot, context) => {
      const { inputs, policy, results, discountSimulationBase } = snapshot;
      const partial = inputs.monthlySalesVolume === null;
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
      if (results.purchaseUnitCostCents !== inputs.purchaseUnitCostCents)
        context.addIssue({
          code: "custom",
          path: ["results", "purchaseUnitCostCents"],
          message: "O custo deve corresponder às entradas.",
        });
      if (results.currentPriceCents !== inputs.unitSalePriceCents)
        context.addIssue({
          code: "custom",
          path: ["results", "currentPriceCents"],
          message: "O preço deve corresponder às entradas.",
        });
      for (const [field, value] of [
        ["fixedAllocationCents", results.fixedAllocationCents],
        ["totalUnitCostCents", results.totalUnitCostCents],
        ["unitProfitCents", results.unitProfitCents],
        ["realMarginBasisPoints", results.realMarginBasisPoints],
      ] as const)
        if ((partial && value !== null) || (!partial && value === null))
          context.addIssue({
            code: "custom",
            path: ["results", field],
            message: "O campo não corresponde ao volume.",
          });
      if (results.priceReferencesPartial !== partial)
        context.addIssue({
          code: "custom",
          path: ["results", "priceReferencesPartial"],
          message: "O indicador parcial não corresponde ao volume.",
        });
      const applicableCost =
        results.totalUnitCostCents ?? results.purchaseUnitCostCents;
      const checks = [
        [
          "originalPriceCents",
          discountSimulationBase.originalPriceCents,
          results.currentPriceCents,
        ],
        ["unitCostCents", discountSimulationBase.unitCostCents, applicableCost],
        [
          "totalFeeBasisPoints",
          discountSimulationBase.totalFeeBasisPoints,
          inputs.taxRateBasisPoints + inputs.cardFeeRateBasisPoints,
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
        ["partial", discountSimulationBase.partial, partial],
      ] as const;
      for (const [field, actual, expected] of checks)
        if (actual !== expected)
          context.addIssue({
            code: "custom",
            path: ["discountSimulationBase", field],
            message: "A base do simulador deve corresponder ao diagnóstico.",
          });
      validateOrderedContent(snapshot, context);
    });
}
const productReportSnapshotV1Schema =
  createLegacyProductReportSnapshotSchema(1);
const productReportSnapshotV2Schema =
  createLegacyProductReportSnapshotSchema(2);

const productReportSnapshotV3Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    calculationVersion: z.literal(2),
    contentVersion: z.literal(3),
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
    const { inputs, policy, results, discountSimulationBase } = snapshot;
    const usedVolume = inputs.monthlySalesVolume ?? 0;
    const partial = inputs.monthlySalesVolume === null;
    if (snapshot.scenario !== inputs.productKind)
      context.addIssue({
        code: "custom",
        path: ["scenario"],
        message: "O cenário deve corresponder ao tipo de produto.",
      });
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
    if (results.purchaseUnitCostCents !== inputs.purchaseUnitCostCents)
      context.addIssue({
        code: "custom",
        path: ["results", "purchaseUnitCostCents"],
        message: "O custo deve corresponder às entradas.",
      });
    if (results.currentPriceCents !== inputs.unitSalePriceCents)
      context.addIssue({
        code: "custom",
        path: ["results", "currentPriceCents"],
        message: "O preço deve corresponder às entradas.",
      });
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
    ] as const)
      if (
        (usedVolume === 0 && value !== null) ||
        (usedVolume > 0 && value === null)
      )
        context.addIssue({
          code: "custom",
          path: ["results", field],
          message: "O campo deve corresponder à quantidade usada.",
        });
    if (results.priceReferencesPartial !== partial)
      context.addIssue({
        code: "custom",
        path: ["results", "priceReferencesPartial"],
        message: "O indicador parcial não corresponde ao volume original.",
      });
    const applicableCost =
      results.totalUnitCostCents ?? results.purchaseUnitCostCents;
    const checks = [
      [
        "originalPriceCents",
        discountSimulationBase.originalPriceCents,
        results.currentPriceCents,
      ],
      ["unitCostCents", discountSimulationBase.unitCostCents, applicableCost],
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
    validateOrderedContent(snapshot, context);
  });

const productReportSnapshotV4Schema = z
  .strictObject({
    schemaVersion: z.literal(3),
    calculationVersion: z.literal(3),
    contentVersion: z.literal(4),
    category: z.literal("product"),
    scenario: z.enum(["resale", "digital"]),
    currency: z.literal("BRL"),
    unit: z.literal("unit"),
    policy: productReportPolicySchema,
    inputs: productReportInputsV4Schema,
    results: productReportResultsV4Schema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: productReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    const { inputs, policy, results, discountSimulationBase } = snapshot;
    const unknownVolume = inputs.monthlySalesVolume === null;
    const zeroVolume = inputs.monthlySalesVolume === 0;
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
    if (snapshot.scenario !== inputs.productKind)
      context.addIssue({
        code: "custom",
        path: ["scenario"],
        message: "O cenário deve corresponder ao tipo de produto.",
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
      results.purchaseUnitCostCents !== inputs.purchaseUnitCostCents ||
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
        results.totalUnitCostCents ?? results.purchaseUnitCostCents,
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
    validateOrderedContent(snapshot, context);
  });

const productReportSnapshotSchema = z.union([
  productReportSnapshotV1Schema,
  productReportSnapshotV2Schema,
  productReportSnapshotV3Schema,
  productReportSnapshotV4Schema,
]);
type ProductReportDiscountSimulationBase = z.infer<
  typeof productReportDiscountSimulationBaseSchema
>;
type ProductReportSnapshotV1 = z.infer<typeof productReportSnapshotV1Schema>;
type ProductReportSnapshotV2 = z.infer<typeof productReportSnapshotV2Schema>;
type ProductReportSnapshotV3 = z.infer<typeof productReportSnapshotV3Schema>;
type ProductReportSnapshotV4 = z.infer<typeof productReportSnapshotV4Schema>;
type ProductReportSnapshot = z.infer<typeof productReportSnapshotSchema>;
type CurrentProductReportSnapshot = ProductReportSnapshotV4;

function parseProductReportSnapshot(value: unknown): ProductReportSnapshot {
  return productReportSnapshotSchema.parse(value);
}
function parseCurrentProductReportSnapshot(
  value: unknown,
): CurrentProductReportSnapshot {
  return productReportSnapshotV4Schema.parse(value);
}

export {
  parseCurrentProductReportSnapshot,
  parseProductReportSnapshot,
  productReportDiscountSimulationBaseSchema,
  productReportInputsSchema,
  productReportPolicySchema,
  productReportResultsSchema,
  productReportSnapshotSchema,
  productReportSnapshotV1Schema,
  productReportSnapshotV2Schema,
  productReportSnapshotV3Schema,
  productReportSnapshotV4Schema,
  type CurrentProductReportSnapshot,
  type ProductReportDiscountSimulationBase,
  type ProductReportSnapshot,
  type ProductReportSnapshotV1,
  type ProductReportSnapshotV2,
  type ProductReportSnapshotV3,
  type ProductReportSnapshotV4,
};
