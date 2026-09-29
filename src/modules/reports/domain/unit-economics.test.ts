import { describe, expect, it } from "vitest";

import {
  calculateAllocatedUnitEconomics,
  calculateBreakEvenRevenue,
  calculateDirectUnitEconomics,
  calculateFixedAllocation,
  calculateMonthlySalesGoal,
} from "./unit-economics";

describe("unit economics", () => {
  it("calculates the approved resale example using the complete unit cost", () => {
    const direct = calculateDirectUnitEconomics({
      currentPriceCents: 5_500,
      directUnitCostCents: 1_600,
      totalFeeBasisPoints: 700,
    });
    const fixedAllocationCents = calculateFixedAllocation(400_000, 200);
    expect(fixedAllocationCents).toBe(2_000);
    if (fixedAllocationCents === null) {
      throw new Error("Expected a fixed allocation for positive volume.");
    }
    const complete = calculateAllocatedUnitEconomics({
      ...direct,
      currentPriceCents: 5_500,
      directUnitCostCents: 1_600,
      totalFeeBasisPoints: 700,
      fixedAllocationCents,
    });

    expect(direct).toEqual({
      feeAmountCents: 385,
      netRevenueCents: 5_115,
      unitContributionCents: 3_515,
    });
    expect(complete).toEqual({
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      unitProfitCents: 1_515,
      realMarginBasisPoints: 2_755,
      minimumPriceCents: 3_871,
    });
    expect(calculateMonthlySalesGoal(400_000, 3_515)).toBe(114);
    expect(calculateBreakEvenRevenue(400_000, 5_500, 3_515)).toBe(625_890);
  });

  it("does not calculate break-even revenue without a positive sale contribution", () => {
    expect(calculateBreakEvenRevenue(400_000, 5_500, 0)).toBeNull();
    expect(calculateBreakEvenRevenue(400_000, 5_500, -1)).toBeNull();
  });

  it.each([null, 0])(
    "does not allocate monthly expenses with volume %s",
    (volume) => {
      expect(calculateFixedAllocation(400_000, volume)).toBeNull();
    },
  );

  it("returns no price floor when fees consume the whole price", () => {
    expect(
      calculateAllocatedUnitEconomics({
        currentPriceCents: 5_500,
        directUnitCostCents: 1_600,
        totalFeeBasisPoints: 10_000,
        feeAmountCents: 5_500,
        netRevenueCents: 0,
        unitContributionCents: -1_600,
        fixedAllocationCents: 2_000,
      }).minimumPriceCents,
    ).toBeNull();
  });
});
