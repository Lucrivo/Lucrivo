import { z } from "zod";

import { pricingMethods } from "@/modules/quick-diagnosis/types";

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

const serviceReportInputsSchema = z.strictObject({
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

const serviceReportResultsSchema = z.strictObject({
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
  verdict: z.enum(serviceReportVerdicts),
  priority: z.enum(serviceReportPriorities),
});

const serviceReportDiscountSimulationBaseSchema = z.strictObject({
  originalPriceCents: nonNegativeSafeIntegerSchema,
  unitCostCents: nullableNonNegativeSafeIntegerSchema,
  totalFeeBasisPoints: nonNegativeSafeIntegerSchema,
  targetMarginBasisPoints: z.literal(1500),
  minimumPriceCents: nullableNonNegativeSafeIntegerSchema,
});

const serviceReportSnapshotV2Schema = z
  .strictObject({
    schemaVersion: z.literal(SERVICE_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(SERVICE_CALCULATION_VERSION),
    contentVersion: z.literal(SERVICE_CONTENT_VERSION),
    category: z.literal("service"),
    scenario: z.enum(pricingMethods),
    currency: z.literal("BRL"),
    unit: z.enum(serviceReportUnits),
    policy: serviceReportPolicySchema,
    inputs: serviceReportInputsSchema,
    results: serviceReportResultsSchema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
    discountSimulationBase: serviceReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
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
      if (snapshot.executiveSummary.answers[index]?.key === expectedKey) {
        continue;
      }

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

type ServiceReportDiscountSimulationBase = z.infer<
  typeof serviceReportDiscountSimulationBaseSchema
>;
type ServiceReportSnapshotV2 = z.infer<typeof serviceReportSnapshotV2Schema>;

function parseServiceReportSnapshot(value: unknown): ServiceReportSnapshotV2 {
  return serviceReportSnapshotV2Schema.parse(value);
}

export {
  parseServiceReportSnapshot,
  serviceReportDiscountSimulationBaseSchema,
  serviceReportInputsSchema,
  serviceReportPolicySchema,
  serviceReportResultsSchema,
  serviceReportSnapshotV2Schema,
  type ServiceReportDiscountSimulationBase,
  type ServiceReportSnapshotV2,
};
