import { describe, expect, it } from "vitest";

import type {
  DetailedDiagnosisCommand,
  DetailedProductItem,
} from "../types";
import { calculateDetailedDiagnosis } from "./calculate-detailed-diagnosis";

const firstItem: DetailedProductItem = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 0,
  name: "Caneca",
  kind: "resale",
  unitSalePriceCents: 1000,
  monthlySalesVolume: 1,
  purchaseUnitCostCents: 500,
  packagingUnitCostCents: 0,
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
    fixedMonthlyExpensesCents: 200,
    proLaboreIncluded: false,
    proLaboreCents: 0,
    taxRateBasisPoints: 0,
    cardFeeRateBasisPoints: 0,
    promotionMarginBasisPoints: 1500,
    items: [firstItem],
    ...overrides,
  };
}

describe("calculateDetailedDiagnosis", () => {
  it("keeps item economics but hides every mix-dependent result when partial", () => {
    const result = calculateDetailedDiagnosis(
      command({
        items: [
          firstItem,
          { ...secondItem, monthlySalesVolume: null },
        ],
      }),
    );

    expect(result).toMatchObject({
      effectiveFixedCostCents: 200,
      isPartial: true,
      missingVolumeItemIds: [secondItem.id],
      monthlyGrossRevenueCents: null,
      monthlyContributionCents: null,
      monthlyResultCents: null,
      mixContributionMarginBasisPoints: null,
      finalMarginBasisPoints: null,
      breakEvenRevenueCents: null,
      verdict: "incomplete_volume",
      priority: "data",
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].unitContributionCents).toBe(500);
    expect(result.items[1].unitContributionCents).toBe(500);
  });

  it("keeps direct loss as the priority even when the mix is partial", () => {
    const result = calculateDetailedDiagnosis(
      command({
        items: [
          {
            ...firstItem,
            purchaseUnitCostCents: 1000,
            monthlySalesVolume: null,
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      isPartial: true,
      verdict: "direct_loss",
      priority: "cost",
    });
  });

  it("treats all explicit zero volumes as a known no-sales month", () => {
    const result = calculateDetailedDiagnosis(
      command({
        fixedMonthlyExpensesCents: 300,
        proLaboreIncluded: true,
        proLaboreCents: 200,
        items: [
          { ...firstItem, monthlySalesVolume: 0 },
          { ...secondItem, monthlySalesVolume: 0 },
        ],
      }),
    );

    expect(result).toMatchObject({
      effectiveFixedCostCents: 500,
      isPartial: false,
      monthlyGrossRevenueCents: 0,
      monthlyContributionCents: 0,
      monthlyResultCents: -500,
      mixContributionMarginBasisPoints: null,
      finalMarginBasisPoints: null,
      breakEvenRevenueCents: null,
      verdict: "no_sales",
      priority: "volume",
    });
  });

  it.each([
    [600, "operational_loss", "price"],
    [500, "break_even", "margin"],
    [400, "tight_margin", "margin"],
    [200, "adequate_margin", "volume"],
  ] as const)(
    "classifies fixed cost %i as %s",
    (fixedMonthlyExpensesCents, verdict, priority) => {
      const result = calculateDetailedDiagnosis(
        command({ fixedMonthlyExpensesCents }),
      );

      expect(result).toMatchObject({ verdict, priority });
    },
  );

  it("sums a complete mix and calculates margins and break-even revenue", () => {
    const result = calculateDetailedDiagnosis(
      command({
        fixedMonthlyExpensesCents: 500,
        items: [
          { ...firstItem, monthlySalesVolume: 2 },
          { ...secondItem, monthlySalesVolume: 3 },
        ],
      }),
    );

    expect(result).toMatchObject({
      monthlyGrossRevenueCents: 5000,
      monthlyContributionCents: 2500,
      monthlyResultCents: 2000,
      mixContributionMarginBasisPoints: 5000,
      finalMarginBasisPoints: 4000,
      breakEvenRevenueCents: 1000,
      verdict: "adequate_margin",
    });
  });

  it("returns no break-even revenue for a non-positive mix contribution", () => {
    const result = calculateDetailedDiagnosis(
      command({
        items: [
          {
            ...firstItem,
            purchaseUnitCostCents: 1000,
          },
        ],
      }),
    );

    expect(result.breakEvenRevenueCents).toBeNull();
    expect(result.verdict).toBe("direct_loss");
  });
});
