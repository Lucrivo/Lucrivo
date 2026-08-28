import { z } from "zod";

import { pricingMethods } from "@/modules/quick-diagnosis/types";

import {
  REPORT_SCHEMA_VERSION,
  SERVICE_CALCULATION_VERSION,
  SERVICE_CONTENT_VERSION,
  reportPriorities,
  reportSectionKeys,
  reportTones,
  reportUnits,
  reportVerdicts,
} from "../types";

const safeIntegerSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const nonNegativeIntegerSchema = safeIntegerSchema.nonnegative();
const nullableNonNegativeIntegerSchema = nonNegativeIntegerSchema.nullable();

const reportPolicySchema = z.strictObject({
  targetMarginBasisPoints: z.literal(1500),
  weeklyDivisorHundredths: z.literal(433),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.literal(true),
});

const reportInputsSchema = z.strictObject({
  desiredMonthlyIncomeCents: nonNegativeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeIntegerSchema,
  monthlyWorkMinutes: nonNegativeIntegerSchema,
  weeklyWorkDays: nonNegativeIntegerSchema,
  hourlyRateCents: nonNegativeIntegerSchema,
  minuteRateCents: nonNegativeIntegerSchema,
  appointmentRateCents: nonNegativeIntegerSchema,
  appointmentDurationMinutes: nonNegativeIntegerSchema,
  taxRateBasisPoints: nonNegativeIntegerSchema,
  cardFeeRateBasisPoints: nonNegativeIntegerSchema,
});

const reportResultsSchema = z.strictObject({
  monthlyCostCents: nonNegativeIntegerSchema,
  hourCostCents: nullableNonNegativeIntegerSchema,
  unitCostCents: nullableNonNegativeIntegerSchema,
  currentPriceCents: nonNegativeIntegerSchema,
  netRevenueCents: safeIntegerSchema.nullable(),
  unitProfitCents: safeIntegerSchema.nullable(),
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nullableNonNegativeIntegerSchema,
  targetPriceCents: nullableNonNegativeIntegerSchema,
  monthlySalesGoal: nullableNonNegativeIntegerSchema,
  weeklySalesGoal: nullableNonNegativeIntegerSchema,
  dailySalesGoal: nullableNonNegativeIntegerSchema,
  breakEvenDiscountPercent: nullableNonNegativeIntegerSchema,
  verdict: z.enum(reportVerdicts),
  priority: z.enum(reportPriorities),
});

const reportSectionSchema = z.strictObject({
  key: z.enum(reportSectionKeys),
  title: z.string().min(1),
  body: z.string().min(1),
  emphasisLabel: z.string().min(1).nullable(),
  emphasisValue: z.string().min(1).nullable(),
  tone: z.enum(reportTones),
});

const reportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: nonNegativeIntegerSchema,
  unitCostCents: nullableNonNegativeIntegerSchema,
  totalFeeBasisPoints: nonNegativeIntegerSchema,
  targetMarginBasisPoints: z.literal(1500),
  minimumPriceCents: nullableNonNegativeIntegerSchema,
});

const reportSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(SERVICE_CALCULATION_VERSION),
    contentVersion: z.literal(SERVICE_CONTENT_VERSION),
    category: z.literal("service"),
    scenario: z.enum(pricingMethods),
    currency: z.literal("BRL"),
    unit: z.enum(reportUnits),
    policy: reportPolicySchema,
    inputs: reportInputsSchema,
    results: reportResultsSchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: reportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    for (const [index, expectedKey] of reportSectionKeys.entries()) {
      if (snapshot.sections[index]?.key === expectedKey) continue;

      context.addIssue({
        code: "custom",
        path: ["sections", index, "key"],
        message: `A seção ${index + 1} deve usar a chave ${expectedKey}.`,
      });
    }
  });

type ReportPolicy = z.infer<typeof reportPolicySchema>;
type ReportInputs = z.infer<typeof reportInputsSchema>;
type ReportResults = z.infer<typeof reportResultsSchema>;
type ReportSection = z.infer<typeof reportSectionSchema>;
type ReportDiscountSimulationBase = z.infer<
  typeof reportDiscountSimulationBaseSchema
>;
type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;

function parseReportSnapshot(value: unknown): ReportSnapshot {
  return reportSnapshotSchema.parse(value);
}

export {
  parseReportSnapshot,
  reportDiscountSimulationBaseSchema,
  reportInputsSchema,
  reportPolicySchema,
  reportResultsSchema,
  reportSectionSchema,
  reportSnapshotSchema,
  type ReportDiscountSimulationBase,
  type ReportInputs,
  type ReportPolicy,
  type ReportResults,
  type ReportSection,
  type ReportSnapshot,
};
