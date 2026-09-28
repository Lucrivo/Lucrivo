import { describe, expect, it } from "vitest";

import type { DetailedDiagnosisCommand, DetailedProductItem } from "../types";
import {
  calculateDetailedDiagnosis,
  classifyDetailedDiagnosis,
} from "./calculate-detailed-diagnosis";

const firstItem: DetailedProductItem = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 0,
  name: "Caneca",
  kind: "resale",
  unitSalePriceCents: 5_500,
  monthlySalesVolume: 100,
  purchaseUnitCostCents: 1_500,
  packagingUnitCostCents: 100,
};

const secondItem: DetailedProductItem = {
  ...firstItem,
  id: "22222222-2222-4222-8222-222222222222",
  position: 1,
  name: "Caderno",
};

function command(
  overrides: Partial<DetailedDiagnosisCommand> = {},
): DetailedDiagnosisCommand {
  return {
    submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    category: "product",
    fixedMonthlyExpensesCents: 300_000,
    proLaboreIncluded: true,
    proLaboreCents: 100_000,
    taxRateBasisPoints: 500,
    cardFeeRateBasisPoints: 200,
    items: [firstItem, secondItem],
    ...overrides,
  };
}

describe("calculateDetailedDiagnosis", () => {
  it("shares one fixed allocation across every known unit and subtracts fixed cost once", () => {
    const result = calculateDetailedDiagnosis(command());

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      unitProfitCents: 1_515,
      realMarginBasisPoints: 2_755,
    });
    expect(result.items[1]).toMatchObject({
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      unitProfitCents: 1_515,
      realMarginBasisPoints: 2_755,
    });
    expect(result).toMatchObject({
      monthlyContributionCents: 703_000,
      monthlyResultCents: 303_000,
      verdict: "positive_result",
      priority: "volume",
    });
  });

  it("makes every item complete-cost field unavailable when any volume is missing", () => {
    const result = calculateDetailedDiagnosis(
      command({
        items: [firstItem, { ...secondItem, monthlySalesVolume: null }],
      }),
    );

    expect(result).toMatchObject({
      isPartial: true,
      monthlyResultCents: null,
      verdict: "incomplete_volume",
      priority: "data",
    });
    for (const item of result.items) {
      expect(item).toMatchObject({
        fixedAllocationCents: null,
        totalUnitCostCents: null,
        unitProfitCents: null,
        realMarginBasisPoints: null,
        breakEvenUnitPriceCents: null,
      });
    }
  });

  it("treats known total volume zero as a no-sales month without allocation", () => {
    const result = calculateDetailedDiagnosis(
      command({
        items: [
          { ...firstItem, monthlySalesVolume: 0 },
          { ...secondItem, monthlySalesVolume: 0 },
        ],
      }),
    );

    expect(result).toMatchObject({
      monthlyResultCents: -400_000,
      finalMarginBasisPoints: null,
      verdict: "no_sales",
    });
    expect(
      result.items.every((item) => item.fixedAllocationCents === null),
    ).toBe(true);
  });

  it("ignores residual pro-labore when disabled", () => {
    expect(
      calculateDetailedDiagnosis(
        command({ proLaboreIncluded: false, proLaboreCents: 999_999 }),
      ).effectiveFixedCostCents,
    ).toBe(300_000);
  });

  it.each([100, 1_000, 3_000])(
    "classifies a positive result at %s basis points objectively",
    (finalMarginBasisPoints) => {
      expect(
        classifyDetailedDiagnosis({
          hasDirectLoss: false,
          isPartial: false,
          monthlyGrossRevenueCents: 100,
          monthlyResultCents: 1,
          finalMarginBasisPoints,
        }),
      ).toEqual({ verdict: "positive_result", priority: "volume" });
    },
  );

  it("classifies break-even without margin priority", () => {
    expect(
      classifyDetailedDiagnosis({
        hasDirectLoss: false,
        isPartial: false,
        monthlyGrossRevenueCents: 100,
        monthlyResultCents: 0,
        finalMarginBasisPoints: 0,
      }),
    ).toEqual({ verdict: "break_even", priority: "volume" });
  });
});
