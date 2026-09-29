import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

type DirectUnitEconomics = {
  feeAmountCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
};

type AllocatedUnitEconomics = {
  fixedAllocationCents: number;
  totalUnitCostCents: number;
  unitProfitCents: number;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
};

function calculateDirectUnitEconomics(input: {
  currentPriceCents: number;
  directUnitCostCents: number;
  totalFeeBasisPoints: number;
}): DirectUnitEconomics {
  const feeAmountCents = multiplyDivideRound(
    input.currentPriceCents,
    input.totalFeeBasisPoints,
    10_000,
  );
  const netRevenueCents = input.currentPriceCents - feeAmountCents;

  return {
    feeAmountCents,
    netRevenueCents,
    unitContributionCents: netRevenueCents - input.directUnitCostCents,
  };
}

function calculateFixedAllocation(
  effectiveFixedCostCents: number,
  monthlySalesVolume: number | null,
): number | null {
  if (monthlySalesVolume === null || monthlySalesVolume <= 0) return null;

  return ceilDivide(
    BigInt(effectiveFixedCostCents),
    BigInt(monthlySalesVolume),
  );
}

function calculateAllocatedUnitEconomics(
  input: DirectUnitEconomics & {
    currentPriceCents: number;
    directUnitCostCents: number;
    totalFeeBasisPoints: number;
    fixedAllocationCents: number;
  },
): AllocatedUnitEconomics {
  const totalUnitCostCents =
    input.directUnitCostCents + input.fixedAllocationCents;
  const unitProfitCents = input.netRevenueCents - totalUnitCostCents;
  const priceDenominator = 10_000 - input.totalFeeBasisPoints;

  return {
    fixedAllocationCents: input.fixedAllocationCents,
    totalUnitCostCents,
    unitProfitCents,
    realMarginBasisPoints:
      input.currentPriceCents > 0
        ? roundDivide(
            BigInt(unitProfitCents) * BigInt(10_000),
            BigInt(input.currentPriceCents),
          )
        : null,
    minimumPriceCents:
      priceDenominator > 0
        ? ceilDivide(
            BigInt(totalUnitCostCents) * BigInt(10_000),
            BigInt(priceDenominator),
          )
        : null,
  };
}

function calculateMonthlySalesGoal(
  effectiveFixedCostCents: number,
  unitContributionCents: number,
): number | null {
  if (unitContributionCents <= 0) return null;

  return ceilDivide(
    BigInt(effectiveFixedCostCents),
    BigInt(unitContributionCents),
  );
}

function calculateBreakEvenRevenue(
  effectiveFixedCostCents: number,
  currentPriceCents: number,
  unitContributionCents: number,
): number | null {
  if (currentPriceCents <= 0 || unitContributionCents <= 0) return null;

  return ceilDivide(
    BigInt(effectiveFixedCostCents) * BigInt(currentPriceCents),
    BigInt(unitContributionCents),
  );
}

export {
  calculateAllocatedUnitEconomics,
  calculateBreakEvenRevenue,
  calculateDirectUnitEconomics,
  calculateFixedAllocation,
  calculateMonthlySalesGoal,
};
export type { AllocatedUnitEconomics, DirectUnitEconomics };
