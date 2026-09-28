import { describe, expect, it } from "vitest";

import type {
  DetailedProductItem,
  DetailedTechnicalSheetProductionItem,
} from "../types";
import { calculateDetailedItem } from "./calculate-detailed-item";

const rates = {
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};

const resaleItem: DetailedProductItem = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 0,
  name: "Caneca",
  kind: "resale",
  unitSalePriceCents: 5_500,
  monthlySalesVolume: 200,
  purchaseUnitCostCents: 1_500,
  packagingUnitCostCents: 100,
};

const technicalSheetItem: DetailedTechnicalSheetProductionItem = {
  id: "33333333-3333-4333-8333-333333333333",
  position: 0,
  name: "Bolo com ficha",
  kind: "manufacturing",
  costMode: "technical_sheet",
  unitSalePriceCents: 1_500,
  monthlySalesVolume: 200,
  recipeYield: 30,
  lossRateBasisPoints: 1_000,
  packagingUnitCostCents: 100,
  directLaborUnitCostCents: 0,
  otherVariableUnitCostCents: 0,
  ingredients: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      position: 0,
      name: "Receita completa",
      quantityMillionths: 1_000_000,
      unit: "receita",
      unitCostTenThousandths: 1_200_000,
    },
  ],
};

describe("calculateDetailedItem", () => {
  it("calculates the approved full-cost resale example", () => {
    expect(calculateDetailedItem(resaleItem, rates, 2_000)).toMatchObject({
      variableUnitCostCents: 1_600,
      feeAmountCents: 385,
      netUnitRevenueCents: 5_115,
      unitContributionCents: 3_515,
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      unitProfitCents: 1_515,
      realMarginBasisPoints: 2_755,
      breakEvenUnitPriceCents: 3_871,
    });
  });

  it("keeps contribution but no complete-cost fields without allocation", () => {
    expect(calculateDetailedItem(resaleItem, rates, null)).toMatchObject({
      variableUnitCostCents: 1_600,
      unitContributionCents: 3_515,
      fixedAllocationCents: null,
      totalUnitCostCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      breakEvenUnitPriceCents: null,
    });
  });

  it("keeps unknown monthly totals null and explicit zero totals at zero", () => {
    expect(
      calculateDetailedItem(
        { ...resaleItem, monthlySalesVolume: null },
        rates,
        null,
      ),
    ).toMatchObject({
      monthlyGrossRevenueCents: null,
      monthlyContributionCents: null,
    });
    expect(
      calculateDetailedItem(
        { ...resaleItem, monthlySalesVolume: 0 },
        rates,
        null,
      ),
    ).toMatchObject({
      monthlyGrossRevenueCents: 0,
      monthlyContributionCents: 0,
    });
  });

  it("calculates technical-sheet costs with integer arithmetic", () => {
    expect(
      calculateDetailedItem(technicalSheetItem, rates, null),
    ).toMatchObject({
      variableUnitCostCents: 544,
      feeAmountCents: 105,
      netUnitRevenueCents: 1_395,
      unitContributionCents: 851,
    });
  });

  it("returns no full price floor when fees consume the whole price", () => {
    expect(
      calculateDetailedItem(
        resaleItem,
        { taxRateBasisPoints: 6_000, cardFeeRateBasisPoints: 4_000 },
        2_000,
      ),
    ).toMatchObject({
      netUnitRevenueCents: 0,
      totalUnitCostCents: 3_600,
      breakEvenUnitPriceCents: null,
    });
  });
});
