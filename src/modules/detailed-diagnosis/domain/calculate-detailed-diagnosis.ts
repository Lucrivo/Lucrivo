import { ceilDivide, roundDivide } from "@/modules/reports/domain/integer-math";
import { calculateFixedAllocation } from "@/modules/reports/domain/unit-economics";

import type {
  DetailedDiagnosisCalculation,
  DetailedDiagnosisCommand,
  DetailedDiagnosisPriority,
  DetailedDiagnosisVerdict,
} from "../types";
import { calculateDetailedItem } from "./calculate-detailed-item";

const RATE_SCALE = 10_000;

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
    return { verdict: "break_even", priority: "volume" };
  }

  return { verdict: "positive_result", priority: "volume" };
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
  const effectiveProLaboreCents = command.proLaboreIncluded
    ? command.proLaboreCents
    : 0;
  const effectiveFixedCostCents = roundDivide(
    BigInt(command.fixedMonthlyExpensesCents) + BigInt(effectiveProLaboreCents),
    BigInt(1),
  );
  const rates = {
    taxRateBasisPoints: command.taxRateBasisPoints,
    cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
  };
  const missingVolumeItemIds = command.items
    .filter((item) => item.monthlySalesVolume === null)
    .map((item) => item.id);
  const isPartial = missingVolumeItemIds.length > 0;
  const totalKnownVolume = isPartial
    ? null
    : command.items.reduce(
        (sum, item) => sum + (item.monthlySalesVolume ?? 0),
        0,
      );
  const fixedAllocationCents = calculateFixedAllocation(
    effectiveFixedCostCents,
    totalKnownVolume,
  );
  const items = command.items.map((item) =>
    calculateDetailedItem(item, rates, fixedAllocationCents),
  );
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
      monthlyFeeAmountCents: null,
      monthlyVariableCostCents: null,
      monthlyNetRevenueCents: null,
      monthlyCostCents: null,
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
  const volumeByItemId = new Map(
    command.items.map((item) => [item.id, item.monthlySalesVolume ?? 0]),
  );
  const monthlyFeeAmountCents = sumIntegers(
    items.map((item) =>
      roundDivide(
        BigInt(item.feeAmountCents) *
          BigInt(volumeByItemId.get(item.itemId) ?? 0),
        BigInt(1),
      ),
    ),
  );
  const monthlyVariableCostCents = sumIntegers(
    items.map((item) =>
      roundDivide(
        BigInt(item.variableUnitCostCents) *
          BigInt(volumeByItemId.get(item.itemId) ?? 0),
        BigInt(1),
      ),
    ),
  );
  const monthlyNetRevenueCents = sumIntegers([
    monthlyGrossRevenueCents,
    -monthlyFeeAmountCents,
  ]);
  const monthlyCostCents = sumIntegers([
    monthlyVariableCostCents,
    effectiveFixedCostCents,
  ]);
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
    monthlyFeeAmountCents,
    monthlyVariableCostCents,
    monthlyNetRevenueCents,
    monthlyCostCents,
    monthlyContributionCents,
    monthlyResultCents,
    mixContributionMarginBasisPoints,
    finalMarginBasisPoints,
    breakEvenRevenueCents,
    verdict,
    priority,
  };
}

export { calculateDetailedDiagnosis, classifyDetailedDiagnosis };
