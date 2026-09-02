import { describe, expect, it } from "vitest";

import type { ProductDiagnosisInput } from "../types";
import {
  productDiagnosisSchema,
  validateProductDiagnosisFields,
} from "./product-diagnosis.schema";

const validProduct: ProductDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCost: "50,00",
  unitSalePrice: "100",
  fixedMonthlyExpenses: "1.000,00",
  monthlySalesVolume: "100",
  proLaboreIncluded: true,
  proLabore: "2.000,00",
  taxRate: "6",
  cardFeeRate: "2",
};

function issuePaths(input: ProductDiagnosisInput): string[] {
  const result = productDiagnosisSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0]));
}

describe("productDiagnosisSchema", () => {
  it("normalizes the canonical complete Product input", () => {
    expect(productDiagnosisSchema.parse(validProduct)).toEqual({
      submissionId: validProduct.submissionId,
      purchaseUnitCostCents: 5000,
      unitSalePriceCents: 10000,
      fixedMonthlyExpensesCents: 100000,
      monthlySalesVolume: 100,
      proLaboreIncluded: true,
      proLaboreCents: 200000,
      taxRateBasisPoints: 600,
      cardFeeRateBasisPoints: 200,
    });
  });

  it("normalizes missing volume and disabled stale compensation", () => {
    expect(
      productDiagnosisSchema.parse({
        ...validProduct,
        monthlySalesVolume: "",
        proLaboreIncluded: false,
        proLabore: "texto antigo ignorado",
      }),
    ).toEqual(
      expect.objectContaining({
        monthlySalesVolume: null,
        proLaboreIncluded: false,
        proLaboreCents: 0,
      }),
    );
  });

  it.each(["", "0"])(
    "normalizes optional purchase cost %j to zero",
    (purchaseUnitCost) => {
      expect(
        productDiagnosisSchema.parse({ ...validProduct, purchaseUnitCost }),
      ).toEqual(expect.objectContaining({ purchaseUnitCostCents: 0 }));
    },
  );

  it("accepts zero purchase cost and returns only requested validation errors", () => {
    expect(
      validateProductDiagnosisFields(["purchaseUnitCost", "unitSalePrice"], {
        ...validProduct,
        purchaseUnitCost: "0",
        unitSalePrice: "0",
        proLabore: "0",
      }),
    ).toEqual({
      unitSalePrice: ["Informe um preço de venda maior que zero."],
    });
  });

  it.each([
    ["submissionId", "not-a-uuid"],
    ["purchaseUnitCost", "-1"],
    ["unitSalePrice", "-1"],
    ["fixedMonthlyExpenses", ""],
    ["fixedMonthlyExpenses", "-1"],
    ["purchaseUnitCost", "1,001"],
    ["unitSalePrice", "10.999"],
    ["purchaseUnitCost", "90071992547409,92"],
    ["monthlySalesVolume", "0"],
    ["monthlySalesVolume", "1,5"],
    ["monthlySalesVolume", "2147483648"],
    ["taxRate", "-1"],
    ["taxRate", ""],
    ["taxRate", "100,01"],
    ["cardFeeRate", "-1"],
    ["cardFeeRate", ""],
    ["cardFeeRate", "100.01"],
  ] satisfies [keyof ProductDiagnosisInput, string][])(
    "rejects invalid %s value %s",
    (field, value) => {
      expect(issuePaths({ ...validProduct, [field]: value })).toContain(field);
    },
  );

  it.each(["", "0", "-1", "1,001"])(
    "rejects enabled compensation value %s",
    (proLabore) => {
      expect(issuePaths({ ...validProduct, proLabore })).toContain("proLabore");
    },
  );

  it("accepts all inclusive numeric boundaries", () => {
    expect(
      productDiagnosisSchema.parse({
        ...validProduct,
        fixedMonthlyExpenses: "0",
        monthlySalesVolume: "1",
        taxRate: "0",
        cardFeeRate: "100",
      }),
    ).toEqual(
      expect.objectContaining({
        fixedMonthlyExpensesCents: 0,
        monthlySalesVolume: 1,
        taxRateBasisPoints: 0,
        cardFeeRateBasisPoints: 10000,
      }),
    );

    expect(
      productDiagnosisSchema.parse({
        ...validProduct,
        monthlySalesVolume: "2147483647",
        taxRate: "100",
        cardFeeRate: "0",
      }),
    ).toEqual(
      expect.objectContaining({
        monthlySalesVolume: 2147483647,
        taxRateBasisPoints: 10000,
        cardFeeRateBasisPoints: 0,
      }),
    );
  });

  it("accepts an omitted monthly volume", () => {
    expect(
      productDiagnosisSchema.parse({
        ...validProduct,
        monthlySalesVolume: "",
      }),
    ).toEqual(expect.objectContaining({ monthlySalesVolume: null }));
  });

  it("rejects unknown browser fields", () => {
    expect(() =>
      productDiagnosisSchema.parse({
        ...validProduct,
        userId: "55555555-5555-4555-8555-555555555555",
      }),
    ).toThrow();
  });
});
