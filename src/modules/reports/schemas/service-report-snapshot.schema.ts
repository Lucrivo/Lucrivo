import { z } from "zod";

import { serviceWorkPeriods } from "@/modules/quick-diagnosis/types";
import {
  serviceMaterialCostUnits,
  servicePricingMethods,
} from "@/modules/quick-diagnosis/domain/service-flow";
import { pricingMethods } from "@/modules/quick-diagnosis/types";

import {
  SERVICE_REPORT_CALCULATION_VERSION,
  SERVICE_REPORT_CONTENT_VERSION,
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

const serviceReportSnapshotV3CoreSchema = z.strictObject({
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
});

function createServiceReportSnapshotV3Schema(contentVersion: 3 | 4) {
  return serviceReportSnapshotV3CoreSchema
    .extend({
      schemaVersion: z.literal(3),
      calculationVersion: z.literal(2),
      contentVersion: z.literal(contentVersion),
    })
    .superRefine(validateOrderedContent);
}

const serviceReportSnapshotV3Schema = createServiceReportSnapshotV3Schema(3);
const serviceReportSnapshotV4Schema = createServiceReportSnapshotV3Schema(4);

const serviceReportSourceSchema = z.strictObject({
  pricingMethod: z.enum(servicePricingMethods),
  currentPriceCents: nonNegativeSafeIntegerSchema,
  materialCostUnit: z.enum(serviceMaterialCostUnits).nullable(),
  materialCostCents: nonNegativeSafeIntegerSchema,
  dailyWorkMinutes: nonNegativeSafeIntegerSchema,
  appointmentDurationMinutes: nonNegativeSafeIntegerSchema,
});

const serviceReportV5FactKeys = ["price", "margin"] as const;
const serviceReportV5SectionKeys = [
  "break_even",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;

function convertedAmount(
  amountCents: number,
  sourceMinutes: number,
  targetMinutes: number,
): number | null {
  if (sourceMinutes <= 0 || targetMinutes <= 0) return null;
  const numerator = BigInt(amountCents) * BigInt(targetMinutes);
  const denominator = BigInt(sourceMinutes);
  return Number((numerator + denominator / BigInt(2)) / denominator);
}

type ServiceDurationSource = {
  source: {
    dailyWorkMinutes: number;
    appointmentDurationMinutes: number;
  };
  inputs: {
    weeklyWorkDays: number;
    monthlyWorkMinutes: number;
  };
};

function sourceDuration(
  method:
    | (typeof servicePricingMethods)[number]
    | (typeof serviceMaterialCostUnits)[number],
  snapshot: ServiceDurationSource,
): number {
  switch (method) {
    case "minute":
      return 1;
    case "hour":
      return 60;
    case "day":
      return snapshot.source.dailyWorkMinutes;
    case "week":
      return snapshot.source.dailyWorkMinutes * snapshot.inputs.weeklyWorkDays;
    case "month":
      return snapshot.inputs.monthlyWorkMinutes;
    case "appointment":
      return snapshot.source.appointmentDurationMinutes;
  }
}

const serviceReportSnapshotV5CoreSchema = z.strictObject({
  schemaVersion: z.literal(SERVICE_REPORT_SCHEMA_VERSION),
  calculationVersion: z.literal(SERVICE_REPORT_CALCULATION_VERSION),
  contentVersion: z.literal(SERVICE_REPORT_CONTENT_VERSION),
  category: z.literal("service"),
  scenario: z.enum(servicePricingMethods),
  currency: z.literal("BRL"),
  unit: z.enum(serviceReportUnits),
  policy: serviceReportPolicySchema,
  inputs: serviceReportInputsV3Schema,
  source: serviceReportSourceSchema,
  results: serviceReportResultsV3Schema,
  executiveSummary: reportExecutiveSummarySchema,
  sections: z
    .array(reportSectionSchema)
    .length(serviceReportV5SectionKeys.length),
  discountSimulationBase: serviceReportDiscountSimulationBaseSchema,
});

function addCoherenceIssue(context: z.RefinementCtx, path: PropertyKey[]) {
  context.addIssue({
    code: "custom",
    path,
    message: "Os valores originais e normalizados do serviço não conferem.",
  });
}

function validateV5Content(
  snapshot: z.infer<typeof serviceReportSnapshotV5CoreSchema>,
  context: z.RefinementCtx,
) {
  for (const [index, expectedKey] of serviceReportV5FactKeys.entries()) {
    if (snapshot.executiveSummary.facts[index]?.key !== expectedKey) {
      addCoherenceIssue(context, ["executiveSummary", "facts", index, "key"]);
    }
  }
  for (const [index, expectedKey] of serviceReportV5SectionKeys.entries()) {
    if (snapshot.sections[index]?.key !== expectedKey) {
      addCoherenceIssue(context, ["sections", index, "key"]);
    }
  }
  for (const [
    index,
    expectedKey,
  ] of reportExecutiveSummaryAnswerKeys.entries()) {
    if (snapshot.executiveSummary.answers[index]?.key !== expectedKey) {
      addCoherenceIssue(context, ["executiveSummary", "answers", index, "key"]);
    }
  }

  if (snapshot.scenario !== snapshot.source.pricingMethod) {
    addCoherenceIssue(context, ["scenario"]);
  }
  if (
    snapshot.inputs.workHoursPeriod !== "day" ||
    snapshot.inputs.workPeriodMinutes !== snapshot.source.dailyWorkMinutes
  ) {
    addCoherenceIssue(context, ["inputs", "workPeriodMinutes"]);
  }
  const expectedMonthlyMinutes = Number(
    (BigInt(snapshot.source.dailyWorkMinutes) *
      BigInt(snapshot.inputs.weeklyWorkDays) *
      BigInt(433) +
      BigInt(50)) /
      BigInt(100),
  );
  if (snapshot.inputs.monthlyWorkMinutes !== expectedMonthlyMinutes) {
    addCoherenceIssue(context, ["inputs", "monthlyWorkMinutes"]);
  }

  const isAppointment = snapshot.source.pricingMethod === "appointment";
  const needsAppointmentDuration =
    isAppointment || snapshot.source.materialCostUnit === "appointment";
  if (
    (needsAppointmentDuration &&
      snapshot.source.appointmentDurationMinutes <= 0) ||
    snapshot.unit !== (isAppointment ? "appointment" : "hour")
  ) {
    addCoherenceIssue(context, ["source", "appointmentDurationMinutes"]);
  }

  const targetMinutes = isAppointment
    ? snapshot.source.appointmentDurationMinutes
    : 60;
  const expectedPrice = convertedAmount(
    snapshot.source.currentPriceCents,
    sourceDuration(snapshot.source.pricingMethod, snapshot),
    targetMinutes,
  );
  const canonicalPrice = isAppointment
    ? snapshot.inputs.appointmentRateCents
    : snapshot.inputs.hourlyRateCents;
  if (
    expectedPrice === null ||
    expectedPrice !== canonicalPrice ||
    expectedPrice !== snapshot.results.currentPriceCents ||
    snapshot.inputs.minuteRateCents !== 0 ||
    (isAppointment
      ? snapshot.inputs.hourlyRateCents !== 0 ||
        snapshot.inputs.appointmentDurationMinutes !==
          snapshot.source.appointmentDurationMinutes
      : snapshot.inputs.appointmentRateCents !== 0 ||
        snapshot.inputs.appointmentDurationMinutes !== 0)
  ) {
    addCoherenceIssue(context, ["inputs"]);
  }

  const expectedMaterial =
    snapshot.source.materialCostUnit === null
      ? snapshot.source.materialCostCents === 0
        ? 0
        : null
      : convertedAmount(
          snapshot.source.materialCostCents,
          sourceDuration(snapshot.source.materialCostUnit, snapshot),
          targetMinutes,
        );
  if (
    expectedMaterial === null ||
    expectedMaterial !== snapshot.inputs.materialUnitCostCents ||
    expectedMaterial !== snapshot.results.materialUnitCostCents
  ) {
    addCoherenceIssue(context, ["source", "materialCostCents"]);
  }
}

const serviceReportSnapshotV5Schema =
  serviceReportSnapshotV5CoreSchema.superRefine(validateV5Content);

const serviceReportSnapshotSchema = z.union([
  serviceReportSnapshotV2Schema,
  serviceReportSnapshotV3Schema,
  serviceReportSnapshotV4Schema,
  serviceReportSnapshotV5Schema,
]);

const serviceReportInputsSchema = serviceReportInputsV3Schema;
const serviceReportResultsSchema = serviceReportResultsV3Schema;

type ServiceReportDiscountSimulationBase = z.infer<
  typeof serviceReportDiscountSimulationBaseSchema
>;
type ServiceReportSnapshotV2 = z.infer<typeof serviceReportSnapshotV2Schema>;
type ServiceReportSnapshotV3 = z.infer<typeof serviceReportSnapshotV3Schema>;
type ServiceReportSnapshotV4 = z.infer<typeof serviceReportSnapshotV4Schema>;
type ServiceReportSnapshotV5 = z.infer<typeof serviceReportSnapshotV5Schema>;
type ServiceReportSnapshot = z.infer<typeof serviceReportSnapshotSchema>;
type CurrentServiceReportSnapshot = ServiceReportSnapshotV5;

function parseServiceReportSnapshot(value: unknown): ServiceReportSnapshot {
  return serviceReportSnapshotSchema.parse(value);
}

function parseCurrentServiceReportSnapshot(
  value: unknown,
): CurrentServiceReportSnapshot {
  return serviceReportSnapshotV5Schema.parse(value);
}

export {
  parseCurrentServiceReportSnapshot,
  parseServiceReportSnapshot,
  serviceReportDiscountSimulationBaseSchema,
  serviceReportInputsSchema,
  serviceReportPolicySchema,
  serviceReportResultsSchema,
  serviceReportSnapshotSchema,
  serviceReportSnapshotV2Schema,
  serviceReportSnapshotV3Schema,
  serviceReportSnapshotV4Schema,
  serviceReportSnapshotV5Schema,
  type CurrentServiceReportSnapshot,
  type ServiceReportSnapshot,
  type ServiceReportDiscountSimulationBase,
  type ServiceReportSnapshotV2,
  type ServiceReportSnapshotV3,
  type ServiceReportSnapshotV4,
  type ServiceReportSnapshotV5,
};
