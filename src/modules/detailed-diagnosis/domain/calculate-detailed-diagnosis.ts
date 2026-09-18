import { ceilDivide, roundDivide } from "@/modules/reports/domain/integer-math";

import type {
  DetailedDiagnosisCalculation,
  DetailedDiagnosisCommand,
  DetailedDiagnosisPriority,
  DetailedDiagnosisVerdict,
} from "../types";
import { calculateDetailedItem } from "./calculate-detailed-item";

const RATE_SCALE = 10_000;
const DETAILED_ATTENTION_BAND_BASIS_POINTS = 2_000;

function classifyDetailedDiagnosis(input: {
  hasDirectLoss: boolean;
  isPartial: boolean;
  monthlyGrossRevenueCents: number;
  monthlyResultCents: number;
  finalMarginBasisPoints: number | null;
}): {
  verdict: DetailedDiagnosisVerdict;
  priority: DetailedDiagnosisPriority;
} {
  if (input.hasDirectLoss) {
    return { verdict: "direct_loss", priority: "cost" };
  }
  if (input.isPartial) {
    return { verdict: "incomplete_volume", priority: "data" };
  }
  if (input.monthlyGrossRevenueCents === 0) {
    return { verdict: "no_sales", priority: "volume" };
  }
  if (input.monthlyResultCents < 0) {
    return { verdict: "operational_loss", priority: "price" };
  }
  if (input.monthlyResultCents === 0) {
    return { verdict: "break_even", priority: "margin" };
  }
  if (
    input.finalMarginBasisPoints !== null &&
    input.finalMarginBasisPoints < DETAILED_ATTENTION_BAND_BASIS_POINTS
  ) {
    return { verdict: "tight_margin", priority: "margin" };
  }
  return { verdict: "adequate_margin", priority: "volume" };
}

function sumIntegers(values: number[]): number {
  return roundDivide(
    values.reduce((sum, value) => sum + BigInt(value), BigInt(0)),
    BigInt(1),
  );
}

function calculateDetailedDiagnosis(
  command: DetailedDiagnosisCommand,
): DetailedDiagnosisCalculation {
  const effectiveFixedCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) + BigInt(command.proLaboreCents),
    BigInt(1),
  );
  const rates = {
    taxRateBasisPoints: command.taxRateBasisPoints,
    cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
    promotionMarginBasisPoints: command.promotionMarginBasisPoints,
  };
  const items = command.items.map((item) => calculateDetailedItem(item, rates));
  const missingVolumeItemIds = command.items
    .filter((item) => item.monthlySalesVolume === null)
    .map((item) => item.id);
  const isPartial = missingVolumeItemIds.length > 0;
  const hasDirectLoss = items.some((item) => item.directLoss);

  if (isPartial) {
    const { verdict, priority } = classifyDetailedDiagnosis({
      hasDirectLoss,
      isPartial,
      monthlyGrossRevenueCents: 0,
      monthlyResultCents: 0,
      finalMarginBasisPoints: null,
    });

    return {
      effectiveFixedCostCents,
      isPartial,
      missingVolumeItemIds,
      items,
      monthlyGrossRevenueCents: null,
      monthlyContributionCents: null,
      monthlyResultCents: null,
      mixContributionMarginBasisPoints: null,
      finalMarginBasisPoints: null,
      breakEvenRevenueCents: null,
      verdict,
      priority,
    };
  }

  const monthlyGrossRevenueCents = sumIntegers(
    items.map((item) => item.monthlyGrossRevenueCents ?? 0),
  );
  const monthlyContributionCents = sumIntegers(
    items.map((item) => item.monthlyContributionCents ?? 0),
  );
  const monthlyResultCents = roundDivide(
    BigInt(monthlyContributionCents) - BigInt(effectiveFixedCostCents),
    BigInt(1),
  );
  const mixContributionMarginBasisPoints =
    monthlyGrossRevenueCents > 0
      ? roundDivide(
          BigInt(monthlyContributionCents) * BigInt(RATE_SCALE),
          BigInt(monthlyGrossRevenueCents),
        )
      : null;
  const finalMarginBasisPoints =
    monthlyGrossRevenueCents > 0
      ? roundDivide(
          BigInt(monthlyResultCents) * BigInt(RATE_SCALE),
          BigInt(monthlyGrossRevenueCents),
        )
      : null;
  const breakEvenRevenueCents =
    monthlyContributionCents > 0 && monthlyGrossRevenueCents > 0
      ? ceilDivide(
          BigInt(effectiveFixedCostCents) * BigInt(monthlyGrossRevenueCents),
          BigInt(monthlyContributionCents),
        )
      : null;
  const { verdict, priority } = classifyDetailedDiagnosis({
    hasDirectLoss,
    isPartial,
    monthlyGrossRevenueCents,
    monthlyResultCents,
    finalMarginBasisPoints,
  });

  return {
    effectiveFixedCostCents,
    isPartial,
    missingVolumeItemIds,
    items,
    monthlyGrossRevenueCents,
    monthlyContributionCents,
    monthlyResultCents,
    mixContributionMarginBasisPoints,
    finalMarginBasisPoints,
    breakEvenRevenueCents,
    verdict,
    priority,
  };
}

export {
  DETAILED_ATTENTION_BAND_BASIS_POINTS,
  calculateDetailedDiagnosis,
  classifyDetailedDiagnosis,
};
