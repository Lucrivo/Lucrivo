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
      feeAmountCents: 800,
      netRevenueCents: 9200,
      unitContributionCents: 4200,
      unitProfitCents: 1200,
      monthlySalesVolumeUsed: 100,
      monthlyGrossRevenueCents: 1000000,
      monthlyNetRevenueCents: 920000,
      monthlyResultCents: 120000,
      realMarginBasisPoints: 1200,
      minimumPriceCents: 8696,
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

  it("keeps unknown volume partial and neutral", () => {
    const result = calculateProductionReport({
      ...completeCommand,
      monthlySalesVolume: null,
    });

    expect(result).toMatchObject({
      monthlySalesVolumeUsed: null,
      monthlyGrossRevenueCents: null,
      monthlyNetRevenueCents: null,
      monthlyResultCents: null,
      realMarginBasisPoints: null,
      fixedAllocationCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      verdict: "incomplete_volume",
      priority: "data",
      weeklySalesGoal: null,
      dailySalesGoal: null,
    });
    expect(result.monthlySalesGoal).toBeGreaterThan(0);
  });

  it("treats explicit zero as a known no-sales month", () => {
    const result = calculateProductionReport({
      ...completeCommand,
      monthlySalesVolume: 0,
    });

    expect(result.monthlySalesVolumeUsed).toBe(0);
    expect(result.monthlyResultCents).toBe(-result.effectiveFixedCostCents);
    expect(result.verdict).toBe("no_sales");
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

  it("keeps zero-cost production valid when no monthly activity exists", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        costCompositionEnabled: false,
        productionUnitCostCents: 0,
        materialUnitCostCents: null,
        packagingUnitCostCents: null,
        directLaborUnitCostCents: null,
        otherVariableUnitCostCents: null,
        fixedMonthlyExpensesCents: 0,
        monthlySalesVolume: null,
        proLaboreIncluded: false,
        proLaboreCents: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        minimumPriceCents: 0,
        breakEvenDiscountPercent: 100,
        monthlySalesVolumeUsed: null,
        monthlyResultCents: null,
        verdict: "incomplete_volume",
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
        feeAmountCents: 10000,
        netRevenueCents: 0,
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

  it("classifies an exact zero monthly result as break even", () => {
    expect(
      calculateProductionReport({
        ...completeCommand,
        fixedMonthlyExpensesCents: 220000,
      }),
    ).toEqual(
      expect.objectContaining({ monthlyResultCents: 0, verdict: "break_even" }),
    );
  });
});

describe("classifyProductionMargin", () => {
  it.each([
    [1, 100, 100, 1, 1999, "tight_margin", "margin"],
    [1, 100, 100, 1, 2000, "adequate_margin", "volume"],
  ] as const)(
    "classifies contribution %s, volume %s, and margin %s as %s",
    (
      unitContributionCents,
      monthlySalesVolume,
      effectiveFixedCostCents,
      monthlyResultCents,
      realMarginBasisPoints,
      verdict,
      priority,
    ) => {
      expect(
        classifyProductionMargin({
          unitContributionCents,
          monthlySalesVolumeUsed: monthlySalesVolume,
          effectiveFixedCostCents,
          monthlyResultCents,
          realMarginBasisPoints,
        }),
      ).toEqual({ verdict, priority });
    },
  );

  it("classifies zero contribution before missing volume", () => {
    expect(
      classifyProductionMargin({
        unitContributionCents: 0,
        monthlySalesVolumeUsed: 0,
        effectiveFixedCostCents: 0,
        monthlyResultCents: 0,
        realMarginBasisPoints: null,
      }),
    ).toEqual({ verdict: "direct_loss", priority: "cost" });
  });

  it("reports no sales when contribution is positive and monthly costs are zero", () => {
    expect(
      classifyProductionMargin({
        unitContributionCents: 1,
        monthlySalesVolumeUsed: 0,
        effectiveFixedCostCents: 0,
        monthlyResultCents: 0,
        realMarginBasisPoints: null,
      }),
    ).toEqual({ verdict: "no_sales", priority: "volume" });
  });
});
