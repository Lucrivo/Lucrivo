import type {
  ProductReportCalculation,
  ProductionReportCalculation,
} from "../types";
import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";
import {
  calculateAllocatedUnitEconomics,
  calculateBreakEvenRevenue,
  calculateDirectUnitEconomics,
  calculateFixedAllocation,
} from "./unit-economics";

const DEFAULT_SCENARIO_POLICY = {
  weeklyDivisorHundredths: 433,
  operatingDaysPerWeek: 6,
} as const;

type BreakEvenScenarioPolicy = {
  weeklyDivisorHundredths: number;
  operatingDaysPerWeek: number;
};

type BreakEvenScenarioInput = {
  effectiveFixedCostCents: number;
  directUnitCostCents: number;
  currentPriceCents: number;
  unitContributionCents: number;
  totalFeeBasisPoints: number;
  monthlySalesGoal: number | null;
  policy?: BreakEvenScenarioPolicy;
};

/**
 * Reference scenario used when the monthly sales volume is unknown: the
 * break-even quantity at the current price becomes the volume used to
 * allocate monthly expenses. By definition the month closes without profit
 * or loss at this point, so the scenario carries no monthly result.
 */
type BreakEvenScenario = {
  referenceVolume: number;
  weeklyGoal: number;
  dailyGoal: number;
  fixedAllocationCents: number;
  totalUnitCostCents: number;
  breakEvenPriceCents: number | null;
  breakEvenRevenueCents: number | null;
  contributionMarginBasisPoints: number | null;
  breakEvenDiscountPercent: number | null;
};

function deriveBreakEvenScenario(
  input: BreakEvenScenarioInput,
): BreakEvenScenario | null {
  if (input.monthlySalesGoal === null || input.unitContributionCents <= 0) {
    return null;
  }
  const policy = input.policy ?? DEFAULT_SCENARIO_POLICY;
  const referenceVolume = input.monthlySalesGoal;
  const fixedAllocationCents =
    calculateFixedAllocation(input.effectiveFixedCostCents, referenceVolume) ??
    0;
  const direct = calculateDirectUnitEconomics({
    currentPriceCents: input.currentPriceCents,
    directUnitCostCents: input.directUnitCostCents,
    totalFeeBasisPoints: input.totalFeeBasisPoints,
  });
  const allocated = calculateAllocatedUnitEconomics({
    ...direct,
    currentPriceCents: input.currentPriceCents,
    directUnitCostCents: input.directUnitCostCents,
    totalFeeBasisPoints: input.totalFeeBasisPoints,
    fixedAllocationCents,
  });
  const breakEvenPriceCents = allocated.minimumPriceCents;
  const weeklyGoal = ceilDivide(
    BigInt(referenceVolume) * BigInt(100),
    BigInt(policy.weeklyDivisorHundredths),
  );
  const dailyGoal = ceilDivide(
    BigInt(weeklyGoal),
    BigInt(policy.operatingDaysPerWeek),
  );

  return {
    referenceVolume,
    weeklyGoal,
    dailyGoal,
    fixedAllocationCents,
    totalUnitCostCents: allocated.totalUnitCostCents,
    breakEvenPriceCents,
    breakEvenRevenueCents: calculateBreakEvenRevenue(
      input.effectiveFixedCostCents,
      input.currentPriceCents,
      input.unitContributionCents,
    ),
    contributionMarginBasisPoints:
      input.currentPriceCents > 0
        ? roundDivide(
            BigInt(input.unitContributionCents) * BigInt(10_000),
            BigInt(input.currentPriceCents),
          )
        : null,
    breakEvenDiscountPercent:
      breakEvenPriceCents === null || input.currentPriceCents <= 0
        ? null
        : Math.max(
            0,
            roundDivide(
              BigInt(input.currentPriceCents - breakEvenPriceCents) *
                BigInt(100),
              BigInt(input.currentPriceCents),
            ),
          ),
  };
}

function directUnitCostOf(
  results: ProductReportCalculation | ProductionReportCalculation,
): number {
  return "purchaseUnitCostCents" in results
    ? results.purchaseUnitCostCents
    : results.productionUnitCostCents;
}

/** Scenario for quick product/production results; null when volume is known. */
function deriveQuickBreakEvenScenario(
  results: ProductReportCalculation | ProductionReportCalculation,
  policy?: BreakEvenScenarioPolicy,
): BreakEvenScenario | null {
  if (results.monthlySalesVolumeUsed !== null) return null;
  return deriveBreakEvenScenario({
    effectiveFixedCostCents: results.effectiveFixedCostCents,
    directUnitCostCents: directUnitCostOf(results),
    currentPriceCents: results.currentPriceCents,
    unitContributionCents: results.unitContributionCents,
    totalFeeBasisPoints: results.totalFeeBasisPoints,
    monthlySalesGoal: results.monthlySalesGoal,
    ...(policy ? { policy } : {}),
  });
}

/** Break-even quantity when selling at a different price (e.g. with discount). */
function calculateSalesGoalAtPrice(input: {
  effectiveFixedCostCents: number;
  directUnitCostCents: number;
  totalFeeBasisPoints: number;
  priceCents: number;
}): number | null {
  if (input.priceCents <= 0) return null;
  const netRevenueCents = multiplyDivideRound(
    input.priceCents,
    10_000 - input.totalFeeBasisPoints,
    10_000,
  );
  const contributionCents = netRevenueCents - input.directUnitCostCents;
  if (contributionCents <= 0) return null;
  return ceilDivide(
    BigInt(input.effectiveFixedCostCents),
    BigInt(contributionCents),
  );
}

export {
  calculateSalesGoalAtPrice,
  deriveBreakEvenScenario,
  deriveQuickBreakEvenScenario,
  type BreakEvenScenario,
  type BreakEvenScenarioInput,
};
