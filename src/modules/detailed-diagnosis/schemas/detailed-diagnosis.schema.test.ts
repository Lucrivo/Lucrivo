import { describe, expect, it } from "vitest";

import type {
  DetailedDiagnosisInput,
  DetailedProductItemInput,
  DetailedProductionItemInput,
} from "../types";
import {
  detailedDiagnosisSchema,
  validateDetailedDiagnosisPaths,
} from "./detailed-diagnosis.schema";

const product: DetailedProductItemInput = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "resale",
  name: "  Caneca  ",
  unitSalePrice: "25,00",
  monthlySalesVolume: "",
  purchaseUnitCost: "",
  packagingUnitCost: "1,50",
};

const production: DetailedProductionItemInput = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "manufacturing",
  name: "Bolo",
  unitSalePrice: "15,00",
  monthlySalesVolume: "200",
  costMode: "technical_sheet",
  productionUnitCost: "",
  recipeYield: "20",
  lossRate: "10",
  packagingUnitCost: "1,00",
  directLaborUnitCost: "0",
  otherVariableUnitCost: "",
  ingredients: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Farinha",
      quantity: "0,5",
      unit: "kg",
      unitCost: "5,0000",
    },
  ],
};

const validProductInput: DetailedDiagnosisInput = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpenses: "1.000,00",
  proLaboreIncluded: false,
  proLabore: "texto ignorado",
  taxRate: "6",
  cardFeeRate: "2",
  promotionMarginRate: "15",
  items: [product],
};

const validTechnicalSheetInput: DetailedDiagnosisInput = {
  ...validProductInput,
  category: "production",
  items: [production],
};

describe("detailedDiagnosisSchema", () => {
  it("normalizes a resale item and preserves unknown volume", () => {
    const parsed = detailedDiagnosisSchema.parse(validProductInput);

    expect(parsed).toMatchObject({
      category: "product",
      fixedMonthlyExpensesCents: 100000,
      proLaboreCents: 0,
      taxRateBasisPoints: 600,
      cardFeeRateBasisPoints: 200,
      promotionMarginBasisPoints: 1500,
    });
    expect(parsed.items[0]).toMatchObject({
      id: product.id,
      position: 0,
      name: "Caneca",
      kind: "resale",
      monthlySalesVolume: null,
      purchaseUnitCostCents: 0,
      packagingUnitCostCents: 150,
    });
  });

  it("preserves explicit zero volume", () => {
    const parsed = detailedDiagnosisSchema.parse({
      ...validProductInput,
      items: [{ ...product, monthlySalesVolume: "0" }],
    });
    expect(parsed.items[0].monthlySalesVolume).toBe(0);
  });

  it("normalizes a technical sheet exactly", () => {
    const parsed = detailedDiagnosisSchema.parse(validTechnicalSheetInput);

    expect(parsed.items[0]).toMatchObject({
      kind: "manufacturing",
      costMode: "technical_sheet",
      recipeYield: 20,
      lossRateBasisPoints: 1000,
      ingredients: [
        expect.objectContaining({
          position: 0,
          quantityMillionths: 500_000,
          unitCostTenThousandths: 50_000,
        }),
      ],
    });
  });

  it("normalizes summarized manufacturing without inactive technical fields", () => {
    const parsed = detailedDiagnosisSchema.parse({
      ...validTechnicalSheetInput,
      items: [
        {
          ...production,
          costMode: "summarized",
          productionUnitCost: "8,75",
          recipeYield: "texto ignorado",
          ingredients: [],
        },
      ],
    });

    expect(parsed.items[0]).toEqual({
      id: production.id,
      position: 0,
      kind: "manufacturing",
      costMode: "summarized",
      name: "Bolo",
      unitSalePriceCents: 1500,
      monthlySalesVolume: 200,
      productionUnitCostCents: 875,
    });
  });

  it.each([
    ["category mismatch", { ...validProductInput, category: "production" }],
    [
      "blank name",
      { ...validProductInput, items: [{ ...product, name: " " }] },
    ],
    ["no items", { ...validProductInput, items: [] }],
    [
      "invalid volume",
      {
        ...validProductInput,
        items: [{ ...product, monthlySalesVolume: "1,5" }],
      },
    ],
    [
      "zero sale price",
      { ...validProductInput, items: [{ ...product, unitSalePrice: "0" }] },
    ],
    [
      "negative cost",
      { ...validProductInput, items: [{ ...product, purchaseUnitCost: "-1" }] },
    ],
    [
      "loss at 100%",
      {
        ...validTechnicalSheetInput,
        items: [{ ...production, lossRate: "100" }],
      },
    ],
    [
      "zero yield",
      {
        ...validTechnicalSheetInput,
        items: [{ ...production, recipeYield: "0" }],
      },
    ],
    [
      "empty ingredients",
      {
        ...validTechnicalSheetInput,
        items: [{ ...production, ingredients: [] }],
      },
    ],
    [
      "zero ingredient total",
      {
        ...validTechnicalSheetInput,
        items: [
          {
            ...production,
            ingredients: [{ ...production.ingredients[0], unitCost: "0" }],
          },
        ],
      },
    ],
    [
      "nonpositive summarized cost",
      {
        ...validTechnicalSheetInput,
        items: [
          { ...production, costMode: "summarized", productionUnitCost: "0" },
        ],
      },
    ],
  ] as const)("rejects %s", (_label, input) => {
    expect(detailedDiagnosisSchema.safeParse(input).success).toBe(false);
  });

  it("rejects duplicate item and ingredient UUIDs", () => {
    expect(
      detailedDiagnosisSchema.safeParse({
        ...validProductInput,
        items: [product, { ...product }],
      }).success,
    ).toBe(false);
    expect(
      detailedDiagnosisSchema.safeParse({
        ...validTechnicalSheetInput,
        items: [
          {
            ...production,
            ingredients: [
              production.ingredients[0],
              { ...production.ingredients[0] },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("returns only issues under requested nested paths", () => {
    const errors = validateDetailedDiagnosisPaths(["items.0.ingredients"], {
      ...validTechnicalSheetInput,
      fixedMonthlyExpenses: "",
      items: [
        {
          ...production,
          ingredients: [{ ...production.ingredients[0], quantity: "0" }],
        },
      ],
    });

    expect(Object.keys(errors)).toEqual([
      "items.0.ingredients.0.quantity",
      "items.0.ingredients",
    ]);
    expect(errors).not.toHaveProperty("fixedMonthlyExpenses");
  });
});
