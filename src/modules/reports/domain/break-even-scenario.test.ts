import { describe, expect, it } from "vitest";

import {
  calculateSalesGoalAtPrice,
  deriveBreakEvenScenario,
  deriveQuickBreakEvenScenario,
} from "./break-even-scenario";
import { calculateProductReport } from "./calculate-product-report";

const baseInput = {
  effectiveFixedCostCents: 500_000,
  directUnitCostCents: 4_000,
  currentPriceCents: 10_000,
  unitContributionCents: 5_000,
  totalFeeBasisPoints: 1_000,
  monthlySalesGoal: 100,
};

describe("deriveBreakEvenScenario", () => {
  it("uses the break-even quantity as the reference volume", () => {
    const scenario = deriveBreakEvenScenario(baseInput);

    expect(scenario).toEqual({
      referenceVolume: 100,
      weeklyGoal: 24,
      dailyGoal: 4,
      fixedAllocationCents: 5_000,
      totalUnitCostCents: 9_000,
      breakEvenPriceCents: 10_000,
      breakEvenRevenueCents: 1_000_000,
      contributionMarginBasisPoints: 5_000,
      breakEvenDiscountPercent: 0,
    });
  });

  it("never prices the scenario above the current price", () => {
    const scenario = deriveBreakEvenScenario({
      ...baseInput,
      effectiveFixedCostCents: 499_900,
    });

    expect(scenario?.referenceVolume).toBe(100);
    expect(scenario?.breakEvenPriceCents).toBeLessThanOrEqual(10_000);
  });

  it("falls back to the direct floor when there are no monthly expenses", () => {
    const scenario = deriveBreakEvenScenario({
      ...baseInput,
      effectiveFixedCostCents: 0,
      monthlySalesGoal: 0,
    });

    expect(scenario).toMatchObject({
      referenceVolume: 0,
      weeklyGoal: 0,
      dailyGoal: 0,
      fixedAllocationCents: 0,
      totalUnitCostCents: 4_000,
      breakEvenPriceCents: 4_445,
      breakEvenRevenueCents: 0,
      breakEvenDiscountPercent: 56,
    });
  });

  it("returns null when each sale already loses money", () => {
    expect(
      deriveBreakEvenScenario({
        ...baseInput,
        unitContributionCents: -100,
        monthlySalesGoal: null,
      }),
    ).toBeNull();
  });
});

describe("deriveQuickBreakEvenScenario", () => {
  const command = {
    submissionId: "00000000-0000-4000-8000-000000000000",
    productKind: "resale" as const,
    purchaseUnitCostCents: 1_600,
    unitSalePriceCents: 5_500,
    fixedMonthlyExpensesCents: 400_000,
    monthlySalesVolume: null,
    proLaboreIncluded: false,
    proLaboreCents: 0,
    taxRateBasisPoints: 500,
    cardFeeRateBasisPoints: 200,
  };

  it("derives the scenario from quick results with unknown volume", () => {
    const results = calculateProductReport(command);
    const scenario = deriveQuickBreakEvenScenario(results);

    expect(results.monthlySalesGoal).toBe(114);
    expect(scenario).toMatchObject({
      referenceVolume: 114,
      fixedAllocationCents: 3_509,
      totalUnitCostCents: 5_109,
    });
    expect(scenario?.breakEvenPriceCents).toBeLessThanOrEqual(5_500);
  });

  it("returns null when the volume is known, including zero", () => {
    expect(
      deriveQuickBreakEvenScenario(
        calculateProductReport({ ...command, monthlySalesVolume: 0 }),
      ),
    ).toBeNull();
    expect(
      deriveQuickBreakEvenScenario(
        calculateProductReport({ ...command, monthlySalesVolume: 120 }),
      ),
    ).toBeNull();
  });
});

describe("calculateSalesGoalAtPrice", () => {
  it("raises the required quantity as the price drops", () => {
    const base = {
      effectiveFixedCostCents: 500_000,
      directUnitCostCents: 4_000,
      totalFeeBasisPoints: 1_000,
    };

    expect(calculateSalesGoalAtPrice({ ...base, priceCents: 10_000 })).toBe(
      100,
    );
    expect(calculateSalesGoalAtPrice({ ...base, priceCents: 9_000 })).toBe(122);
    expect(calculateSalesGoalAtPrice({ ...base, priceCents: 4_400 })).toBe(
      null,
    );
  });
});
