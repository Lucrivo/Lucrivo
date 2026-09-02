import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  calculateProductionReport,
  classifyProductionMargin,
} from "./calculate-production-report";

const completeCommand: ProductionDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCostCents: 5000,
  materialUnitCostCents: 3000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

describe("calculateProductionReport", () => {
  it("calculates the canonical complete Production report exactly", () => {
    expect(calculateProductionReport(completeCommand)).toEqual({
      effectiveFixedCostCents: 300000,
      productionUnitCostCents: 5000,
      fixedAllocationCents: 3000,
      totalUnitCostCents: 8000,
      currentPriceCents: 10000,
      netRevenueCents: 9200,
      unitContributionCents: 4200,
      unitProfitCents: 1200,
      realMarginBasisPoints: 1200,
      minimumPriceCents: 8696,
      targetPriceCents: 11112,
      priceReferencesPartial: false,
      monthlySalesGoal: 72,
      weeklySalesGoal: 17,
      dailySalesGoal: 3,
      breakEvenDiscountPercent: 13,
      totalFeeBasisPoints: 800,
      verdict: "tight_margin",
      priority: "margin",
    });
  });

  it("keeps allocation-dependent results unavailable without volume", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        monthlySalesVolume: null,
      }),
    ).toEqual(
      expect.objectContaining({
        fixedAllocationCents: null,
        totalUnitCostCents: null,
        unitProfitCents: null,
        realMarginBasisPoints: null,
        minimumPriceCents: 5435,
        targetPriceCents: 6945,
        priceReferencesPartial: true,
        monthlySalesGoal: 72,
        weeklySalesGoal: 17,
        dailySalesGoal: 3,
        breakEvenDiscountPercent: 46,
        verdict: "incomplete_volume",
        priority: "data",
      }),
    );
  });

  it("gives direct loss precedence and suppresses sales goals", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        monthlySalesVolume: null,
        unitSalePriceCents: 5000,
      }),
    ).toEqual(
      expect.objectContaining({
        unitContributionCents: -400,
        monthlySalesGoal: null,
        weeklySalesGoal: null,
        dailySalesGoal: null,
        verdict: "direct_loss",
        priority: "cost",
      }),
    );
  });

  it("returns unavailable price references for invalid denominators", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        taxRateBasisPoints: 8000,
        cardFeeRateBasisPoints: 2000,
      }),
    ).toEqual(
      expect.objectContaining({
        minimumPriceCents: null,
        targetPriceCents: null,
      }),
    );

    expect(
      calculateProductionReport({
        ...completeCommand,
        taxRateBasisPoints: 6000,
        cardFeeRateBasisPoints: 2000,
      }),
    ).toEqual(
      expect.objectContaining({
        minimumPriceCents: 40000,
        targetPriceCents: null,
      }),
    );
  });

  it("rounds allocations, price references, and sales goals upward", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        costCompositionEnabled: false,
        productionUnitCostCents: 1,
        materialUnitCostCents: null,
        packagingUnitCostCents: null,
        directLaborUnitCostCents: null,
        otherVariableUnitCostCents: null,
        unitSalePriceCents: 100,
        fixedMonthlyExpensesCents: 10,
        monthlySalesVolume: 3,
        proLaboreIncluded: false,
        proLaboreCents: 0,
        taxRateBasisPoints: 1,
        cardFeeRateBasisPoints: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        fixedAllocationCents: 4,
        totalUnitCostCents: 5,
        minimumPriceCents: 6,
        targetPriceCents: 7,
        monthlySalesGoal: 1,
        weeklySalesGoal: 1,
        dailySalesGoal: 1,
      }),
    );
  });

  it("clamps a negative break-even discount to zero", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        unitSalePriceCents: 8000,
      }).breakEvenDiscountPercent,
    ).toBe(0);
  });
});

describe("classifyProductionMargin", () => {
  it.each([
    [1, 100, 0, "operational_loss", "price"],
    [1, 100, 1949, "tight_margin", "margin"],
    [1, 100, 1950, "adequate_margin", "volume"],
    [1, 100, 2300, "adequate_margin", "volume"],
    [1, 100, 2301, "above_target", "volume"],
  ] as const)(
    "classifies contribution %s, volume %s, and margin %s as %s",
    (
      unitContributionCents,
      monthlySalesVolume,
      realMarginBasisPoints,
      verdict,
      priority,
    ) => {
      expect(
        classifyProductionMargin({
          unitContributionCents,
          monthlySalesVolume,
          realMarginBasisPoints,
        }),
      ).toEqual({ verdict, priority });
    },
  );

  it("classifies zero contribution before missing volume", () => {
    expect(
      classifyProductionMargin({
        unitContributionCents: 0,
        monthlySalesVolume: null,
        realMarginBasisPoints: null,
      }),
    ).toEqual({ verdict: "direct_loss", priority: "cost" });
  });

  it("requests volume when contribution is positive and volume is missing", () => {
    expect(
      classifyProductionMargin({
        unitContributionCents: 1,
        monthlySalesVolume: null,
        realMarginBasisPoints: null,
      }),
    ).toEqual({ verdict: "incomplete_volume", priority: "data" });
  });
});
