import { describe, expect, it } from "vitest";

import type {
  DetailedProductItem,
  DetailedSummarizedProductionItem,
  DetailedTechnicalSheetProductionItem,
} from "../types";
import { calculateDetailedItem } from "./calculate-detailed-item";

const rates = {
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 400,
};

const resaleItem: DetailedProductItem = {
  id: "11111111-1111-4111-8111-111111111111",
  position: 0,
  name: "Caneca",
  kind: "resale",
  unitSalePriceCents: 2500,
  monthlySalesVolume: 40,
  purchaseUnitCostCents: 1000,
  packagingUnitCostCents: 100,
};

const summarizedItem: DetailedSummarizedProductionItem = {
  id: "22222222-2222-4222-8222-222222222222",
  position: 0,
  name: "Bolo resumido",
  kind: "manufacturing",
  costMode: "summarized",
  unitSalePriceCents: 1500,
  monthlySalesVolume: 200,
  productionUnitCostCents: 600,
};

const technicalSheetItem: DetailedTechnicalSheetProductionItem = {
  id: "33333333-3333-4333-8333-333333333333",
  position: 0,
  name: "Bolo com ficha",
  kind: "manufacturing",
  costMode: "technical_sheet",
  unitSalePriceCents: 1500,
  monthlySalesVolume: 200,
  recipeYield: 30,
  lossRateBasisPoints: 1000,
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
  it("calculates resale item economics", () => {
    expect(calculateDetailedItem(resaleItem, rates)).toEqual({
      itemId: resaleItem.id,
      variableUnitCostCents: 1100,
      feeAmountCents: 250,
      netUnitRevenueCents: 2250,
      unitContributionCents: 1150,
      contributionMarginBasisPoints: 4600,
      monthlyGrossRevenueCents: 100000,
      monthlyContributionCents: 46000,
      breakEvenUnitPriceCents: 1223,
      directLoss: false,
    });
    expect(calculateDetailedItem(resaleItem, rates)).not.toHaveProperty(
      "promotionFloorCents",
    );
  });

  it("uses only the informed unit cost in summarized production", () => {
    expect(calculateDetailedItem(summarizedItem, rates)).toMatchObject({
      variableUnitCostCents: 600,
      feeAmountCents: 150,
      netUnitRevenueCents: 1350,
      unitContributionCents: 750,
      contributionMarginBasisPoints: 5000,
      monthlyGrossRevenueCents: 300000,
      monthlyContributionCents: 150000,
      breakEvenUnitPriceCents: 667,
      directLoss: false,
    });
  });

  it("calculates the documented technical-sheet example", () => {
    expect(calculateDetailedItem(technicalSheetItem, rates)).toEqual({
      itemId: technicalSheetItem.id,
      variableUnitCostCents: 544,
      feeAmountCents: 150,
      netUnitRevenueCents: 1350,
      unitContributionCents: 806,
      contributionMarginBasisPoints: 5373,
      monthlyGrossRevenueCents: 300000,
      monthlyContributionCents: 161200,
      breakEvenUnitPriceCents: 605,
      directLoss: false,
    });
  });

  it("adds labor and other variable costs only to technical-sheet production", () => {
    const result = calculateDetailedItem(
      {
        ...technicalSheetItem,
        directLaborUnitCostCents: 75,
        otherVariableUnitCostCents: 25,
      },
      rates,
    );

    expect(result.variableUnitCostCents).toBe(644);
    expect(result.unitContributionCents).toBe(706);
  });

  it("calculates 0.5 kg at R$ 5.0000 per kg exactly", () => {
    const result = calculateDetailedItem(
      {
        ...technicalSheetItem,
        recipeYield: 1,
        lossRateBasisPoints: 0,
        packagingUnitCostCents: 0,
        ingredients: [
          {
            ...technicalSheetItem.ingredients[0],
            quantityMillionths: 500_000,
            unitCostTenThousandths: 50_000,
          },
        ],
      },
      rates,
    );

    expect(result.variableUnitCostCents).toBe(250);
  });

  it("rounds a half-cent ingredient unit cost to one cent", () => {
    const result = calculateDetailedItem(
      {
        ...technicalSheetItem,
        recipeYield: 1,
        lossRateBasisPoints: 0,
        packagingUnitCostCents: 0,
        ingredients: [
          {
            ...technicalSheetItem.ingredients[0],
            quantityMillionths: 1_000,
            unitCostTenThousandths: 50_000,
          },
        ],
      },
      rates,
    );

    expect(result.variableUnitCostCents).toBe(1);
  });

  it("handles a 99.99% loss rate using integer arithmetic", () => {
    const result = calculateDetailedItem(
      {
        ...technicalSheetItem,
        recipeYield: 1,
        lossRateBasisPoints: 9999,
        packagingUnitCostCents: 0,
        ingredients: [
          {
            ...technicalSheetItem.ingredients[0],
            quantityMillionths: 1_000_000,
            unitCostTenThousandths: 10_000,
          },
        ],
      },
      rates,
    );

    expect(result.variableUnitCostCents).toBe(1_000_000);
  });

  it("returns no price floor when its denominator is not positive", () => {
    expect(
      calculateDetailedItem(resaleItem, {
        taxRateBasisPoints: 6000,
        cardFeeRateBasisPoints: 4000,
      }),
    ).toMatchObject({
      netUnitRevenueCents: 0,
      breakEvenUnitPriceCents: null,
    });
  });

  it("keeps unknown monthly totals null and explicit zero totals at zero", () => {
    expect(
      calculateDetailedItem({ ...resaleItem, monthlySalesVolume: null }, rates),
    ).toMatchObject({
      monthlyGrossRevenueCents: null,
      monthlyContributionCents: null,
    });
    expect(
      calculateDetailedItem({ ...resaleItem, monthlySalesVolume: 0 }, rates),
    ).toMatchObject({
      monthlyGrossRevenueCents: 0,
      monthlyContributionCents: 0,
    });
  });

  it("flags negative unit contribution as a direct loss", () => {
    expect(
      calculateDetailedItem(
        {
          ...resaleItem,
          unitSalePriceCents: 1000,
          purchaseUnitCostCents: 1000,
          packagingUnitCostCents: 1,
        },
        rates,
      ),
    ).toMatchObject({
      unitContributionCents: -101,
      contributionMarginBasisPoints: -1010,
      directLoss: true,
    });
  });
});
