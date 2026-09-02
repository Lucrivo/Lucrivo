import { z } from "zod";

import {
  pricingMethods,
  serviceWorkPeriods,
} from "@/modules/quick-diagnosis/types";

import {
  SERVICE_CALCULATION_VERSION,
  SERVICE_CONTENT_VERSION,
  SERVICE_REPORT_SCHEMA_VERSION,
  reportExecutiveSummaryAnswerKeys,
  reportExecutiveSummaryFactKeys,
  reportSectionKeys,
  serviceReportPriorities,
  serviceReportUnits,
  serviceReportVerdicts,
} from "../types";
import {
  nonNegativeSafeIntegerSchema,
  reportExecutiveSummarySchema,
  reportSectionSchema,
  safeIntegerSchema,
} from "./report-content.schema";

const nullableNonNegativeSafeIntegerSchema =
  nonNegativeSafeIntegerSchema.nullable();

const serviceReportPolicySchema = z.strictObject({
  targetMarginBasisPoints: z.literal(1500),
  weeklyDivisorHundredths: z.literal(433),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.literal(true),
});

const serviceReportInputsV2Schema = z.strictObject({
  desiredMonthlyIncomeCents: nonNegativeSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlyWorkMinutes: nonNegativeSafeIntegerSchema,
  weeklyWorkDays: nonNegativeSafeIntegerSchema,
  hourlyRateCents: nonNegativeSafeIntegerSchema,
  minuteRateCents: nonNegativeSafeIntegerSchema,
  appointmentRateCents: nonNegativeSafeIntegerSchema,
  appointmentDurationMinutes: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: nonNegativeSafeIntegerSchema,
  cardFeeRateBasisPoints: nonNegativeSafeIntegerSchema,
});

const serviceReportV2Verdicts = [
  "missing_price",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;

const serviceReportResultsV2Schema = z.strictObject({
  monthlyCostCents: nonNegativeSafeIntegerSchema,
  hourCostCents: nullableNonNegativeSafeIntegerSchema,
  unitCostCents: nullableNonNegativeSafeIntegerSchema,
  currentPriceCents: nonNegativeSafeIntegerSchema,
  netRevenueCents: safeIntegerSchema.nullable(),
  unitProfitCents: safeIntegerSchema.nullable(),
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nullableNonNegativeSafeIntegerSchema,
  targetPriceCents: nullableNonNegativeSafeIntegerSchema,
  monthlySalesGoal: nullableNonNegativeSafeIntegerSchema,
  weeklySalesGoal: nullableNonNegativeSafeIntegerSchema,
  dailySalesGoal: nullableNonNegativeSafeIntegerSchema,
  breakEvenDiscountPercent: nullableNonNegativeSafeIntegerSchema,
  verdict: z.enum(serviceReportV2Verdicts),
  priority: z.enum(serviceReportPriorities),
});

const serviceReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: nonNegativeSafeIntegerSchema,
  unitCostCents: nullableNonNegativeSafeIntegerSchema,
  totalFeeBasisPoints: nonNegativeSafeIntegerSchema,
  targetMarginBasisPoints: z.literal(1500),
  minimumPriceCents: nullableNonNegativeSafeIntegerSchema,
});

const serviceReportInputsV3Schema = serviceReportInputsV2Schema.extend({
  workHoursPeriod: z.enum(serviceWorkPeriods),
  workPeriodMinutes: nonNegativeSafeIntegerSchema,
  materialUnitCostCents: nonNegativeSafeIntegerSchema,
});

const serviceReportResultsV3Schema = serviceReportResultsV2Schema
  .omit({ verdict: true })
  .extend({
    structureUnitCostCents: nullableNonNegativeSafeIntegerSchema,
    materialUnitCostCents: nonNegativeSafeIntegerSchema,
    unitContributionCents: safeIntegerSchema.nullable(),
    verdict: z.enum(serviceReportVerdicts),
  });

type OrderedServiceSnapshot = {
  executiveSummary: {
    facts: { key: string }[];
    answers: { key: string }[];
  };
  sections: { key: string }[];
};

function validateOrderedContent(
  snapshot: OrderedServiceSnapshot,
  context: z.RefinementCtx,
) {
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
    if (snapshot.executiveSummary.answers[index]?.key === expectedKey) continue;
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
}

const serviceReportSnapshotV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    calculationVersion: z.literal(1),
    contentVersion: z.literal(2),
    category: z.literal("service"),
    scenario: z.enum(pricingMethods),
    currency: z.literal("BRL"),
    unit: z.enum(serviceReportUnits),
    policy: serviceReportPolicySchema,
    inputs: serviceReportInputsV2Schema,
    results: serviceReportResultsV2Schema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: serviceReportDiscountSimulationBaseSchema,
  })
  .superRefine(validateOrderedContent);

const serviceReportSnapshotV3Schema = z
  .strictObject({
    schemaVersion: z.literal(SERVICE_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(SERVICE_CALCULATION_VERSION),
    contentVersion: z.literal(SERVICE_CONTENT_VERSION),
    category: z.literal("service"),
    scenario: z.enum(pricingMethods),
    currency: z.literal("BRL"),
    unit: z.enum(serviceReportUnits),
    policy: serviceReportPolicySchema,
    inputs: serviceReportInputsV3Schema,
    results: serviceReportResultsV3Schema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: serviceReportDiscountSimulationBaseSchema,
  })
  .superRefine(validateOrderedContent);

const serviceReportSnapshotSchema = z.union([
  serviceReportSnapshotV2Schema,
  serviceReportSnapshotV3Schema,
]);

const serviceReportInputsSchema = serviceReportInputsV3Schema;
const serviceReportResultsSchema = serviceReportResultsV3Schema;

type ServiceReportDiscountSimulationBase = z.infer<
  typeof serviceReportDiscountSimulationBaseSchema
>;
type ServiceReportSnapshotV2 = z.infer<typeof serviceReportSnapshotV2Schema>;
type ServiceReportSnapshotV3 = z.infer<typeof serviceReportSnapshotV3Schema>;
type ServiceReportSnapshot = z.infer<typeof serviceReportSnapshotSchema>;

function parseServiceReportSnapshot(value: unknown): ServiceReportSnapshot {
  return serviceReportSnapshotSchema.parse(value);
}

function parseServiceReportSnapshotV3(value: unknown): ServiceReportSnapshotV3 {
  return serviceReportSnapshotV3Schema.parse(value);
}

export {
  parseServiceReportSnapshot,
  parseServiceReportSnapshotV3,
  serviceReportDiscountSimulationBaseSchema,
  serviceReportInputsSchema,
  serviceReportPolicySchema,
  serviceReportResultsSchema,
  serviceReportSnapshotV2Schema,
  serviceReportSnapshotV3Schema,
  type ServiceReportSnapshot,
  type ServiceReportDiscountSimulationBase,
  type ServiceReportSnapshotV2,
  type ServiceReportSnapshotV3,
};
