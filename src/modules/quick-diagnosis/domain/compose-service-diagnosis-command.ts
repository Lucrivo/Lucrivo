import type {
  NormalizedServiceDiagnosisCommand,
  ServiceDiagnosisSource,
} from "../types";
import { scaledInteger } from "../schemas/decimal-input";
import {
  normalizeMonthlyWorkMinutes,
  parseServiceWorkPeriodMinutes,
} from "../schemas/service-work-capacity";
import {
  convertServiceUnitAmountCents,
  isServiceFlowPricingMethod,
  isServiceMaterialCostUnit,
  type ServiceFlowPricingMethod,
  type ServiceFlowSubmissionInput,
  type ServiceMaterialCostUnit,
} from "./service-flow";

function sourceDurationMinutes(
  unit: ServiceFlowPricingMethod | ServiceMaterialCostUnit,
  dailyWorkMinutes: number,
  weeklyWorkDays: number,
  monthlyWorkMinutes: number,
  appointmentDurationMinutes: number,
): number {
  switch (unit) {
    case "minute":
      return 1;
    case "hour":
      return 60;
    case "day":
      return dailyWorkMinutes;
    case "week":
      return dailyWorkMinutes * weeklyWorkDays;
    case "month":
      return monthlyWorkMinutes;
    case "appointment":
      return appointmentDurationMinutes;
  }
}

function requireConvertedAmount(
  amountCents: number,
  sourceMinutes: number,
  targetMinutes: number,
): number {
  const converted = convertServiceUnitAmountCents(
    amountCents,
    sourceMinutes,
    targetMinutes,
  );
  if (converted === null)
    throw new Error("Invalid service conversion duration");
  return converted;
}

function composeServiceDiagnosisCommand(
  input: ServiceFlowSubmissionInput,
): NormalizedServiceDiagnosisCommand {
  if (!isServiceFlowPricingMethod(input.pricingMethod)) {
    throw new Error("Invalid service pricing method");
  }

  const dailyWorkMinutes = parseServiceWorkPeriodMinutes(
    input.dailyWorkHours,
    "day",
  );
  const weeklyWorkDays = scaledInteger(input.weeklyWorkDays, 0);
  const monthlyWorkMinutes = normalizeMonthlyWorkMinutes(
    "day",
    dailyWorkMinutes,
    weeklyWorkDays,
  );
  const appointmentDurationMinutes = scaledInteger(
    input.appointmentDurationMinutes,
    0,
  );
  const currentPriceCents = scaledInteger(input.currentPrice, 2);
  const canonicalPricingMethod =
    input.pricingMethod === "appointment" ? "appointment" : "hour";
  const targetMinutes =
    canonicalPricingMethod === "appointment" ? appointmentDurationMinutes : 60;
  const normalizedCurrentPriceCents = requireConvertedAmount(
    currentPriceCents,
    sourceDurationMinutes(
      input.pricingMethod,
      dailyWorkMinutes,
      weeklyWorkDays,
      monthlyWorkMinutes,
      appointmentDurationMinutes,
    ),
    targetMinutes,
  );

  let sourceMaterialCostUnit: ServiceMaterialCostUnit | null = null;
  let sourceMaterialCostCents = 0;
  let materialUnitCostCents = 0;

  if (input.hasMaterialCost) {
    if (!isServiceMaterialCostUnit(input.materialCostUnit)) {
      throw new Error("Invalid service material cost unit");
    }
    sourceMaterialCostUnit = input.materialCostUnit;
    sourceMaterialCostCents = scaledInteger(input.materialCost, 2);
    materialUnitCostCents = requireConvertedAmount(
      sourceMaterialCostCents,
      sourceDurationMinutes(
        sourceMaterialCostUnit,
        dailyWorkMinutes,
        weeklyWorkDays,
        monthlyWorkMinutes,
        appointmentDurationMinutes,
      ),
      targetMinutes,
    );
  }

  const source: ServiceDiagnosisSource = {
    pricingMethod: input.pricingMethod,
    currentPriceCents,
    materialCostUnit: sourceMaterialCostUnit,
    materialCostCents: sourceMaterialCostCents,
    dailyWorkMinutes,
    appointmentDurationMinutes,
  };

  return {
    submissionId: input.submissionId,
    pricingMethod: canonicalPricingMethod,
    desiredMonthlyIncomeCents: scaledInteger(input.desiredMonthlyIncome, 2),
    fixedMonthlyExpensesCents: scaledInteger(input.fixedMonthlyExpenses, 2),
    workHoursPeriod: "day",
    workPeriodMinutes: dailyWorkMinutes,
    monthlyWorkMinutes,
    weeklyWorkDays,
    hourlyRateCents:
      canonicalPricingMethod === "hour" ? normalizedCurrentPriceCents : 0,
    minuteRateCents: 0,
    appointmentRateCents:
      canonicalPricingMethod === "appointment"
        ? normalizedCurrentPriceCents
        : 0,
    appointmentDurationMinutes:
      canonicalPricingMethod === "appointment" ? appointmentDurationMinutes : 0,
    materialUnitCostCents,
    taxRateBasisPoints: input.paysRevenueTax
      ? scaledInteger(input.taxRate, 2)
      : 0,
    cardFeeRateBasisPoints: input.hasPaymentFee
      ? scaledInteger(input.paymentFeeRate, 2)
      : 0,
    source,
  };
}

export { composeServiceDiagnosisCommand };
