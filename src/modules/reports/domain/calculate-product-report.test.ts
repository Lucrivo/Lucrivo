import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  calculateProductReport,
  classifyProductMargin,
} from "./calculate-product-report";

const completeCommand: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  productKind: "resale",
  purchaseUnitCostCents: 1_600,
  unitSalePriceCents: 5_500,
  fixedMonthlyExpensesCents: 300_000,
  monthlySalesVolume: 200,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};

describe("calculateProductReport", () => {
  it("calculates the approved known-volume example with complete unit cost", () => {
    expect(calculateProductReport(completeCommand)).toEqual({
      effectiveFixedCostCents: 400_000,
      purchaseUnitCostCents: 1_600,
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      currentPriceCents: 5_500,
      feeAmountCents: 385,
      netRevenueCents: 5_115,
      unitContributionCents: 3_515,
      unitProfitCents: 1_515,
      monthlySalesVolumeUsed: 200,
      monthlyGrossRevenueCents: 1_100_000,
      monthlyNetRevenueCents: 1_023_000,
      monthlyResultCents: 303_000,
      realMarginBasisPoints: 2_755,
      minimumPriceCents: 3_871,
      monthlySalesGoal: 114,
      weeklySalesGoal: 27,
      dailySalesGoal: 5,
      breakEvenDiscountPercent: 30,
      totalFeeBasisPoints: 700,
      verdict: "positive_result",
      priority: "volume",
    });
  });

  it("keeps contribution and the monthly goal when volume is unknown", () => {
    expect(
      calculateProductReport({ ...completeCommand, monthlySalesVolume: null }),
    ).toMatchObject({
      unitContributionCents: 3_515,
      monthlySalesGoal: 114,
      monthlySalesVolumeUsed: null,
      monthlyGrossRevenueCents: null,
      monthlyNetRevenueCents: null,
      monthlyResultCents: null,
      realMarginBasisPoints: null,
      fixedAllocationCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      minimumPriceCents: null,
      breakEvenDiscountPercent: null,
      weeklySalesGoal: null,
      dailySalesGoal: null,
      verdict: "incomplete_volume",
      priority: "data",
    });
  });

  it("treats zero as a known no-sales month without unit allocation", () => {
    expect(
      calculateProductReport({ ...completeCommand, monthlySalesVolume: 0 }),
    ).toMatchObject({
      monthlyResultCents: -400_000,
      realMarginBasisPoints: null,
      fixedAllocationCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      minimumPriceCents: null,
      breakEvenDiscountPercent: null,
      monthlySalesGoal: 114,
      weeklySalesGoal: 27,
      dailySalesGoal: 5,
      verdict: "no_sales",
    });
  });

  it("reduces fixed allocation when positive volume increases", () => {
    const higherVolume = calculateProductReport({
      ...completeCommand,
      monthlySalesVolume: 400,
    });

    expect(higherVolume.fixedAllocationCents).toBe(1_000);
  });

  it("ignores residual pro-labore when it is disabled", () => {
    expect(
      calculateProductReport({
        ...completeCommand,
        proLaboreIncluded: false,
        proLaboreCents: 999_999,
      }).effectiveFixedCostCents,
    ).toBe(300_000);
  });

  it("gives direct loss precedence and suppresses sales goals", () => {
    expect(
      calculateProductReport({
        ...completeCommand,
        monthlySalesVolume: null,
        unitSalePriceCents: 1_600,
      }),
    ).toMatchObject({
      unitContributionCents: -112,
      monthlySalesGoal: null,
      weeklySalesGoal: null,
      dailySalesGoal: null,
      verdict: "direct_loss",
      priority: "cost",
    });
  });

  it("returns no floor when fees consume the whole price", () => {
    expect(
      calculateProductReport({
        ...completeCommand,
        taxRateBasisPoints: 8_000,
        cardFeeRateBasisPoints: 2_000,
      }),
    ).toMatchObject({
      minimumPriceCents: null,
      feeAmountCents: 5_500,
      netRevenueCents: 0,
    });
  });

  it("classifies exact break-even without a margin priority", () => {
    expect(
      calculateProductReport({
        ...completeCommand,
        fixedMonthlyExpensesCents: 603_000,
        proLaboreCents: 100_000,
      }),
    ).toMatchObject({
      monthlyResultCents: 0,
      realMarginBasisPoints: 0,
      verdict: "break_even",
      priority: "volume",
    });
  });
});

describe("classifyProductMargin", () => {
  it.each([100, 1_000, 3_000])(
    "classifies a positive result at %s basis points objectively",
    (realMarginBasisPoints) => {
      expect(
        classifyProductMargin({
          unitContributionCents: 1,
          monthlySalesVolumeUsed: 100,
          effectiveFixedCostCents: 100,
          monthlyResultCents: 1,
          realMarginBasisPoints,
        }),
      ).toEqual({ verdict: "positive_result", priority: "volume" });
    },
  );
});
