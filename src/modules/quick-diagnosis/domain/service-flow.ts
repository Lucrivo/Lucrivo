import { scaledInteger } from "../schemas/decimal-input";
import {
  normalizeMonthlyWorkMinutes,
  parseServiceWorkPeriodMinutes,
} from "../schemas/service-work-capacity";

const servicePricingMethods = [
  "appointment",
  "minute",
  "hour",
  "day",
  "week",
  "month",
] as const;

const serviceMaterialCostUnits = [
  "appointment",
  "hour",
  "day",
  "month",
] as const;

type ServiceFlowPricingMethod = (typeof servicePricingMethods)[number];
type ServiceMaterialCostUnit = (typeof serviceMaterialCostUnits)[number];

type ServiceFlowInput = {
  desiredMonthlyIncome: string;
  fixedMonthlyExpenses: string;
  pricingMethod: string;
  currentPrice: string;
  dailyWorkHours: string;
  weeklyWorkDays: string;
  appointmentDurationMinutes: string;
  hasMaterialCost: boolean | null;
  materialCost: string;
  materialCostUnit: string;
  paysRevenueTax: boolean | null;
  taxRate: string;
  hasPaymentFee: boolean | null;
  paymentFeeRate: string;
};

type ServiceFlowField = keyof ServiceFlowInput;
type ServiceFlowFieldErrors = Partial<Record<ServiceFlowField, string[]>>;

type ServiceFlowPreview = {
  monthlyRevenueTargetCents: number;
  monthlyWorkMinutes: number;
  requiredHourlyRateCents: number | null;
  currentEquivalentHourlyRateCents: number | null;
  materialEquivalentHourlyCostCents: number | null;
  netEquivalentHourlyRateCents: number | null;
};

function isServiceFlowPricingMethod(
  value: unknown,
): value is ServiceFlowPricingMethod {
  return servicePricingMethods.some((method) => method === value);
}

function isServiceMaterialCostUnit(
  value: unknown,
): value is ServiceMaterialCostUnit {
  return serviceMaterialCostUnits.some((unit) => unit === value);
}

function safeScaledInteger(value: string, scale: number): number {
  try {
    return scaledInteger(value, scale);
  } catch {
    return 0;
  }
}

function roundRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number(
    (BigInt(numerator) + BigInt(Math.floor(denominator / 2))) /
      BigInt(denominator),
  );
}

function hourlyEquivalent(
  amountCents: number,
  unit: ServiceFlowPricingMethod | ServiceMaterialCostUnit,
  dailyWorkMinutes: number,
  weeklyWorkDays: number,
  monthlyWorkMinutes: number,
  appointmentDurationMinutes: number,
): number | null {
  switch (unit) {
    case "minute":
      return amountCents * 60;
    case "hour":
      return amountCents;
    case "appointment":
      return roundRatio(amountCents * 60, appointmentDurationMinutes);
    case "day":
      return roundRatio(amountCents * 60, dailyWorkMinutes);
    case "week":
      return roundRatio(amountCents * 60, dailyWorkMinutes * weeklyWorkDays);
    case "month":
      return roundRatio(amountCents * 60, monthlyWorkMinutes);
  }
}

function calculateServiceFlowPreview(
  input: ServiceFlowInput,
): ServiceFlowPreview {
  const desiredMonthlyIncomeCents = safeScaledInteger(
    input.desiredMonthlyIncome,
    2,
  );
  const fixedMonthlyExpensesCents = safeScaledInteger(
    input.fixedMonthlyExpenses,
    2,
  );
  const monthlyRevenueTargetCents =
    desiredMonthlyIncomeCents + fixedMonthlyExpensesCents;
  const dailyWorkMinutes = (() => {
    try {
      return parseServiceWorkPeriodMinutes(input.dailyWorkHours, "day");
    } catch {
      return 0;
    }
  })();
  const weeklyWorkDays = safeScaledInteger(input.weeklyWorkDays, 0);
  const monthlyWorkMinutes = normalizeMonthlyWorkMinutes(
    "day",
    dailyWorkMinutes,
    weeklyWorkDays,
  );
  const appointmentDurationMinutes = safeScaledInteger(
    input.appointmentDurationMinutes,
    0,
  );
  const requiredHourlyRateCents = roundRatio(
    monthlyRevenueTargetCents * 60,
    monthlyWorkMinutes,
  );
  const currentEquivalentHourlyRateCents = isServiceFlowPricingMethod(
    input.pricingMethod,
  )
    ? hourlyEquivalent(
        safeScaledInteger(input.currentPrice, 2),
        input.pricingMethod,
        dailyWorkMinutes,
        weeklyWorkDays,
        monthlyWorkMinutes,
        appointmentDurationMinutes,
      )
    : null;
  const materialEquivalentHourlyCostCents =
    input.hasMaterialCost && isServiceMaterialCostUnit(input.materialCostUnit)
      ? hourlyEquivalent(
          safeScaledInteger(input.materialCost, 2),
          input.materialCostUnit,
          dailyWorkMinutes,
          weeklyWorkDays,
          monthlyWorkMinutes,
          appointmentDurationMinutes,
        )
      : 0;
  const totalRevenueCostBasisPoints =
    (input.paysRevenueTax ? safeScaledInteger(input.taxRate, 2) : 0) +
    (input.hasPaymentFee ? safeScaledInteger(input.paymentFeeRate, 2) : 0);
  const netEquivalentBeforeMaterialCents =
    currentEquivalentHourlyRateCents === null
      ? null
      : roundRatio(
          currentEquivalentHourlyRateCents *
            Math.max(0, 10_000 - totalRevenueCostBasisPoints),
          10_000,
        );
  const netEquivalentHourlyRateCents =
    netEquivalentBeforeMaterialCents === null ||
    materialEquivalentHourlyCostCents === null
      ? null
      : netEquivalentBeforeMaterialCents - materialEquivalentHourlyCostCents;

  return {
    monthlyRevenueTargetCents,
    monthlyWorkMinutes,
    requiredHourlyRateCents,
    currentEquivalentHourlyRateCents,
    materialEquivalentHourlyCostCents,
    netEquivalentHourlyRateCents,
  };
}

export {
  calculateServiceFlowPreview,
  isServiceFlowPricingMethod,
  isServiceMaterialCostUnit,
  serviceMaterialCostUnits,
  servicePricingMethods,
  type ServiceFlowField,
  type ServiceFlowFieldErrors,
  type ServiceFlowInput,
  type ServiceFlowPreview,
  type ServiceFlowPricingMethod,
  type ServiceMaterialCostUnit,
};
