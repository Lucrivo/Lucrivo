import { z } from "zod";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import {
  nonNegativeSafeIntegerSchema,
  positiveSafeIntegerSchema,
  reportExecutiveSummarySchema,
  reportSectionSchema,
  reportToneSchema,
  safeIntegerSchema,
} from "./report-content.schema";

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const uuidSchema = z.uuid();
const basisPointsSchema = z.number().int().min(0).max(10_000);
const volumeSchema = z
  .number()
  .int()
  .min(0)
  .max(POSTGRES_INTEGER_MAX)
  .nullable();

const detailedItemBaseShape = {
  id: uuidSchema,
  position: z.number().int().nonnegative(),
  name: z.string().trim().min(1),
  unitSalePriceCents: positiveSafeIntegerSchema,
  monthlySalesVolume: volumeSchema,
};

const detailedProductItemSchema = z.strictObject({
  ...detailedItemBaseShape,
  kind: z.literal("resale"),
  purchaseUnitCostCents: nonNegativeSafeIntegerSchema,
  packagingUnitCostCents: nonNegativeSafeIntegerSchema,
});

const detailedSummarizedProductionItemSchema = z.strictObject({
  ...detailedItemBaseShape,
  kind: z.literal("manufacturing"),
  costMode: z.literal("summarized"),
  productionUnitCostCents: positiveSafeIntegerSchema,
});

const detailedIngredientSchema = z.strictObject({
  id: uuidSchema,
  position: z.number().int().nonnegative(),
  name: z.string().trim().min(1),
  quantityMillionths: positiveSafeIntegerSchema,
  unit: z.string().trim().min(1),
  unitCostTenThousandths: nonNegativeSafeIntegerSchema,
});

const detailedTechnicalSheetProductionItemSchema = z.strictObject({
  ...detailedItemBaseShape,
  kind: z.literal("manufacturing"),
  costMode: z.literal("technical_sheet"),
  recipeYield: z.number().int().min(1).max(POSTGRES_INTEGER_MAX),
  lossRateBasisPoints: z.number().int().min(0).max(9_999),
  packagingUnitCostCents: nonNegativeSafeIntegerSchema,
  directLaborUnitCostCents: nonNegativeSafeIntegerSchema,
  otherVariableUnitCostCents: nonNegativeSafeIntegerSchema,
  ingredients: z.array(detailedIngredientSchema).min(1),
});

const detailedDiagnosisItemSchema = z.union([
  detailedProductItemSchema,
  detailedSummarizedProductionItemSchema,
  detailedTechnicalSheetProductionItemSchema,
]);

const detailedDiagnosisCommandSchema = z.strictObject({
  submissionId: uuidSchema,
  category: z.enum(["product", "production"]),
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: basisPointsSchema,
  cardFeeRateBasisPoints: basisPointsSchema,
  items: z.array(detailedDiagnosisItemSchema).min(1),
});

const detailedItemCalculationSchema = z.strictObject({
  itemId: uuidSchema,
  variableUnitCostCents: nonNegativeSafeIntegerSchema,
  feeAmountCents: safeIntegerSchema,
  netUnitRevenueCents: safeIntegerSchema,
  unitContributionCents: safeIntegerSchema,
  contributionMarginBasisPoints: safeIntegerSchema.nullable(),
  monthlyGrossRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyContributionCents: safeIntegerSchema.nullable(),
  breakEvenUnitPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  directLoss: z.boolean(),
});

const detailedDiagnosisResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  isPartial: z.boolean(),
  missingVolumeItemIds: z.array(uuidSchema),
  items: z.array(detailedItemCalculationSchema).min(1),
  monthlyGrossRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyFeeAmountCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyVariableCostCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyNetRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyCostCents: nonNegativeSafeIntegerSchema.nullable(),
  monthlyContributionCents: safeIntegerSchema.nullable(),
  monthlyResultCents: safeIntegerSchema.nullable(),
  mixContributionMarginBasisPoints: safeIntegerSchema.nullable(),
  finalMarginBasisPoints: safeIntegerSchema.nullable(),
  breakEvenRevenueCents: nonNegativeSafeIntegerSchema.nullable(),
  verdict: z.enum([
    "direct_loss",
    "incomplete_volume",
    "no_sales",
    "operational_loss",
    "break_even",
    "tight_margin",
    "adequate_margin",
  ]),
  priority: z.enum(["cost", "data", "price", "margin", "volume"]),
});

const detailedGuidanceSchema = z.strictObject({
  key: z.enum([
    "missing_volume",
    "direct_loss",
    "concentration",
    "best_unit_contribution",
    "high_volume_low_margin",
    "business_result",
  ]),
  tone: reportToneSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  itemIds: z.array(uuidSchema),
});

const detailedReportSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    calculationVersion: z.literal(1),
    contentVersion: z.literal(1),
    analysisMode: z.literal("detailed"),
    category: z.enum(["product", "production"]),
    scenario: z.enum(["resale", "manufacturing"]),
    currency: z.literal("BRL"),
    unit: z.literal("mix"),
    policy: z.strictObject({
      attentionBandBasisPoints: z.literal(2_000),
      concentrationThresholdBasisPoints: z.literal(4_500),
      weeklyDivisorHundredths: z.literal(433),
      operatingDaysPerWeek: z.literal(6),
      proLaboreIncluded: z.boolean(),
    }),
    inputs: detailedDiagnosisCommandSchema,
    results: detailedDiagnosisResultsSchema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(4),
    guidance: z.array(detailedGuidanceSchema),
  })
  .superRefine((snapshot, context) => {
    const expectedScenario =
      snapshot.category === "product" ? "resale" : "manufacturing";
    if (
      snapshot.scenario !== expectedScenario ||
      snapshot.inputs.category !== snapshot.category
    ) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Categoria, cenário e entradas não correspondem.",
      });
    }

    if (
      snapshot.policy.proLaboreIncluded !== snapshot.inputs.proLaboreIncluded
    ) {
      context.addIssue({
        code: "custom",
        path: ["policy"],
        message: "A política não corresponde às entradas.",
      });
    }

    const itemIds = new Set<string>();
    snapshot.inputs.items.forEach((item, index) => {
      if (
        item.position !== index ||
        itemIds.has(item.id) ||
        item.kind !== expectedScenario
      ) {
        context.addIssue({
          code: "custom",
          path: ["inputs", "items", index],
          message: "Item fora de ordem, duplicado ou incompatível.",
        });
      }
      itemIds.add(item.id);

      if (
        item.kind === "manufacturing" &&
        item.costMode === "technical_sheet"
      ) {
        const ingredientIds = new Set<string>();
        item.ingredients.forEach((ingredient, ingredientIndex) => {
          if (
            ingredient.position !== ingredientIndex ||
            ingredientIds.has(ingredient.id)
          ) {
            context.addIssue({
              code: "custom",
              path: ["inputs", "items", index, "ingredients", ingredientIndex],
              message: "Ingrediente fora de ordem ou duplicado.",
            });
          }
          ingredientIds.add(ingredient.id);
        });
      }
    });

    const command = snapshot.inputs as DetailedDiagnosisCommand;
    const expectedResults = calculateDetailedDiagnosis(command);
    if (JSON.stringify(snapshot.results) !== JSON.stringify(expectedResults)) {
      context.addIssue({
        code: "custom",
        path: ["results"],
        message: "Os resultados não correspondem às entradas normalizadas.",
      });
    }

    const expectedSectionKeys = [
      "break_even",
      "hidden_cost",
      "margin_diagnosis",
      "sales_goal",
    ];
    expectedSectionKeys.forEach((key, index) => {
      if (snapshot.sections[index]?.key === key) return;
      context.addIssue({
        code: "custom",
        path: ["sections", index, "key"],
        message: "As seções do relatório detalhado estão fora de ordem.",
      });
    });
  });

type DetailedReportSnapshotV1 = z.infer<typeof detailedReportSnapshotSchema>;
type CurrentDetailedReportSnapshot = DetailedReportSnapshotV1;

function parseDetailedReportSnapshot(
  value: unknown,
): CurrentDetailedReportSnapshot {
  return detailedReportSnapshotSchema.parse(value);
}

export {
  detailedReportSnapshotSchema,
  parseDetailedReportSnapshot,
  type CurrentDetailedReportSnapshot,
  type DetailedReportSnapshotV1,
};
