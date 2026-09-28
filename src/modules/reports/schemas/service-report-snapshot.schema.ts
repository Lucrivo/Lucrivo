import { z } from "zod";

import {
  serviceMaterialCostUnits,
  servicePricingMethods,
} from "@/modules/quick-diagnosis/domain/service-flow";
import { serviceWorkPeriods } from "@/modules/quick-diagnosis/types";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";

import {
  SERVICE_REPORT_CALCULATION_VERSION,
  SERVICE_REPORT_CONTENT_VERSION,
  SERVICE_REPORT_SCHEMA_VERSION,
  reportExecutiveSummaryAnswerKeys,
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
  weeklyDivisorHundredths: z.literal(433),
  maximumDiscountPercent: z.literal(50),
  proLaboreIncluded: z.literal(true),
});

const serviceReportInputsSchema = z.strictObject({
  desiredMonthlyIncomeCents: nonNegativeSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  workHoursPeriod: z.enum(serviceWorkPeriods),
  workPeriodMinutes: nonNegativeSafeIntegerSchema,
  monthlyWorkMinutes: nonNegativeSafeIntegerSchema,
  weeklyWorkDays: nonNegativeSafeIntegerSchema,
  hourlyRateCents: nonNegativeSafeIntegerSchema,
  minuteRateCents: nonNegativeSafeIntegerSchema,
  appointmentRateCents: nonNegativeSafeIntegerSchema,
  appointmentDurationMinutes: nonNegativeSafeIntegerSchema,
  materialUnitCostCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});

const serviceReportSourceSchema = z.strictObject({
  pricingMethod: z.enum(servicePricingMethods),
  currentPriceCents: nonNegativeSafeIntegerSchema,
  materialCostUnit: z.enum(serviceMaterialCostUnits).nullable(),
  materialCostCents: nonNegativeSafeIntegerSchema,
  dailyWorkMinutes: nonNegativeSafeIntegerSchema,
  appointmentDurationMinutes: nonNegativeSafeIntegerSchema,
});

const serviceReportResultsSchema = z.strictObject({
  unit: z.enum(serviceReportUnits),
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  monthlyWorkMinutes: nonNegativeSafeIntegerSchema,
  monthlyCostCents: nonNegativeSafeIntegerSchema,
  hourCostCents: nullableNonNegativeSafeIntegerSchema,
  structureUnitCostCents: nullableNonNegativeSafeIntegerSchema,
  materialUnitCostCents: nonNegativeSafeIntegerSchema,
  unitCostCents: nullableNonNegativeSafeIntegerSchema,
  currentPriceCents: nonNegativeSafeIntegerSchema,
  netRevenueCents: safeIntegerSchema.nullable(),
  unitContributionCents: safeIntegerSchema.nullable(),
  unitProfitCents: safeIntegerSchema.nullable(),
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nullableNonNegativeSafeIntegerSchema,
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
  totalFeeBasisPoints: z.number().int().min(0).max(20_000),
  minimumPriceCents: nullableNonNegativeSafeIntegerSchema,
});

const serviceSectionKeys = [
  "break_even",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;
const serviceFactKeys = ["price", "margin"] as const;

const serviceReportSnapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(SERVICE_REPORT_SCHEMA_VERSION),
    calculationVersion: z.literal(SERVICE_REPORT_CALCULATION_VERSION),
    contentVersion: z.literal(SERVICE_REPORT_CONTENT_VERSION),
    category: z.literal("service"),
    scenario: z.enum(servicePricingMethods),
    currency: z.literal("BRL"),
    unit: z.enum(serviceReportUnits),
    policy: serviceReportPolicySchema,
    inputs: serviceReportInputsSchema,
    source: serviceReportSourceSchema,
    results: serviceReportResultsSchema,
    executiveSummary: reportExecutiveSummarySchema,
    sections: z.array(reportSectionSchema).length(serviceSectionKeys.length),
    discountSimulationBase: serviceReportDiscountSimulationBaseSchema,
  })
  .superRefine((snapshot, context) => {
    if (
      snapshot.scenario !== snapshot.source.pricingMethod ||
      snapshot.results.unit !== snapshot.unit ||
      snapshot.unit !==
        (snapshot.source.pricingMethod === "appointment"
          ? "appointment"
          : "hour")
    ) {
      context.addIssue({
        code: "custom",
        path: ["scenario"],
        message: "Cenário, origem e unidade do serviço não correspondem.",
      });
    }

    const expectedResults = calculateServiceReport({
      submissionId: "00000000-0000-4000-8000-000000000000",
      pricingMethod: snapshot.unit === "appointment" ? "appointment" : "hour",
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
      unitCostCents: snapshot.results.unitCostCents,
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

    serviceFactKeys.forEach((key, index) => {
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
    serviceSectionKeys.forEach((key, index) => {
      if (snapshot.sections[index]?.key !== key)
        context.addIssue({
          code: "custom",
          path: ["sections", index, "key"],
          message: "A ordem das seções deve ser preservada.",
        });
    });
  });

type ServiceReportDiscountSimulationBase = z.infer<
  typeof serviceReportDiscountSimulationBaseSchema
>;
type ServiceReportSnapshot = z.infer<typeof serviceReportSnapshotSchema>;
type CurrentServiceReportSnapshot = ServiceReportSnapshot;

function parseServiceReportSnapshot(value: unknown): ServiceReportSnapshot {
  return serviceReportSnapshotSchema.parse(value);
}

const parseCurrentServiceReportSnapshot = parseServiceReportSnapshot;

export {
  parseCurrentServiceReportSnapshot,
  parseServiceReportSnapshot,
  serviceReportDiscountSimulationBaseSchema,
  serviceReportInputsSchema,
  serviceReportPolicySchema,
  serviceReportResultsSchema,
  serviceReportSnapshotSchema,
  type CurrentServiceReportSnapshot,
  type ServiceReportDiscountSimulationBase,
  type ServiceReportSnapshot,
};
