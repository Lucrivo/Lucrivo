import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisInput } from "../types";
import {
  productionDiagnosisSchema,
  validateProductionDiagnosisFields,
} from "./production-diagnosis.schema";

const validProduction: ProductionDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCost: "texto ignorado",
  materialUnitCost: "30,00",
  packagingUnitCost: "5",
  directLaborUnitCost: "10,00",
  otherVariableUnitCost: "5,00",
  unitSalePrice: "100,00",
  fixedMonthlyExpenses: "1.000,00",
  monthlySalesVolume: "100",
  proLaboreIncluded: true,
  proLabore: "2.000,00",
  taxRate: "6",
  cardFeeRate: "2",
};

function issuePaths(input: ProductionDiagnosisInput): string[] {
  const result = productionDiagnosisSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0]));
}

describe("productionDiagnosisSchema", () => {
  it("normalizes the canonical composed Production input", () => {
    expect(productionDiagnosisSchema.parse(validProduction)).toEqual({
      submissionId: validProduction.submissionId,
      costCompositionEnabled: true,
      productionUnitCostCents: null,
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
    });
  });

  it("normalizes summarized cost and discards stale component text", () => {
    expect(
      productionDiagnosisSchema.parse({
        ...validProduction,
        costCompositionEnabled: false,
        productionUnitCost: "50,00",
        materialUnitCost: "texto antigo",
        packagingUnitCost: "-1",
        directLaborUnitCost: "1,001",
        otherVariableUnitCost: "90071992547409999",
      }),
    ).toEqual(
      expect.objectContaining({
        costCompositionEnabled: false,
        productionUnitCostCents: 5000,
        materialUnitCostCents: null,
        packagingUnitCostCents: null,
        directLaborUnitCostCents: null,
        otherVariableUnitCostCents: null,
      }),
    );
  });

  it("ignores summarized cost text in composed mode", () => {
    expect(productionDiagnosisSchema.parse(validProduction)).toEqual(
      expect.objectContaining({ productionUnitCostCents: null }),
    );
  });

  it("returns only errors requested by progressive validation", () => {
    expect(
      validateProductionDiagnosisFields(
        ["productionUnitCost", "unitSalePrice"],
        {
          ...validProduction,
          costCompositionEnabled: false,
          productionUnitCost: "0",
          unitSalePrice: "0",
          proLabore: "0",
        },
      ),
    ).toEqual({
      productionUnitCost: ["Informe um custo de produção maior que zero."],
      unitSalePrice: ["Informe um preço de venda maior que zero."],
    });
  });

  it.each([
    ["submissionId", "not-a-uuid"],
    ["unitSalePrice", "0"],
    ["unitSalePrice", "1,001"],
    ["unitSalePrice", "90071992547409,92"],
    ["fixedMonthlyExpenses", ""],
    ["fixedMonthlyExpenses", "-1"],
    ["monthlySalesVolume", "0"],
    ["monthlySalesVolume", "1,5"],
    ["monthlySalesVolume", "2147483648"],
    ["taxRate", ""],
    ["taxRate", "-1"],
    ["taxRate", "100,01"],
    ["cardFeeRate", ""],
    ["cardFeeRate", "-1"],
    ["cardFeeRate", "100.01"],
  ] satisfies [keyof ProductionDiagnosisInput, string][])(
    "rejects invalid %s value %s",
    (field, value) => {
      expect(issuePaths({ ...validProduction, [field]: value })).toContain(
        field,
      );
    },
  );

  it.each(["0", "-1", "1,001", "90071992547409,92"])(
    "rejects active summarized production cost %s",
    (productionUnitCost) => {
      expect(
        issuePaths({
          ...validProduction,
          costCompositionEnabled: false,
          productionUnitCost,
        }),
      ).toContain("productionUnitCost");
    },
  );

  it("rejects a composed aggregate equal to zero", () => {
    expect(
      issuePaths({
        ...validProduction,
        materialUnitCost: "",
        packagingUnitCost: "0",
        directLaborUnitCost: "0,00",
        otherVariableUnitCost: "",
      }),
    ).toContain("materialUnitCost");
  });

  it.each([
    ["materialUnitCost", "-1"],
    ["packagingUnitCost", "1,001"],
    ["directLaborUnitCost", "90071992547409,92"],
    ["otherVariableUnitCost", "-0,01"],
  ] satisfies [keyof ProductionDiagnosisInput, string][])(
    "rejects invalid active component %s value %s",
    (field, value) => {
      expect(issuePaths({ ...validProduction, [field]: value })).toContain(
        field,
      );
    },
  );

  it("rejects an unsafe composed aggregate", () => {
    expect(
      issuePaths({
        ...validProduction,
        materialUnitCost: "90071992547409,91",
        packagingUnitCost: "0,01",
        directLaborUnitCost: "0",
        otherVariableUnitCost: "0",
      }),
    ).toContain("materialUnitCost");
  });

  it.each(["", "0", "-1", "1,001"])(
    "rejects enabled compensation value %s",
    (proLabore) => {
      expect(issuePaths({ ...validProduction, proLabore })).toContain(
        "proLabore",
      );
    },
  );

  it("accepts blank components as zero when their aggregate is positive", () => {
    expect(
      productionDiagnosisSchema.parse({
        ...validProduction,
        materialUnitCost: "50,00",
        packagingUnitCost: "",
        directLaborUnitCost: "",
        otherVariableUnitCost: "",
      }),
    ).toEqual(
      expect.objectContaining({
        materialUnitCostCents: 5000,
        packagingUnitCostCents: 0,
        directLaborUnitCostCents: 0,
        otherVariableUnitCostCents: 0,
      }),
    );
  });

  it("accepts inclusive numeric boundaries and disabled stale compensation", () => {
    expect(
      productionDiagnosisSchema.parse({
        ...validProduction,
        fixedMonthlyExpenses: "0",
        monthlySalesVolume: "1",
        proLaboreIncluded: false,
        proLabore: "texto antigo ignorado",
        taxRate: "0",
        cardFeeRate: "100",
      }),
    ).toEqual(
      expect.objectContaining({
        fixedMonthlyExpensesCents: 0,
        monthlySalesVolume: 1,
        proLaboreIncluded: false,
        proLaboreCents: 0,
        taxRateBasisPoints: 0,
        cardFeeRateBasisPoints: 10000,
      }),
    );

    expect(
      productionDiagnosisSchema.parse({
        ...validProduction,
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

  it("accepts an omitted monthly sold volume", () => {
    expect(
      productionDiagnosisSchema.parse({
        ...validProduction,
        monthlySalesVolume: "",
      }),
    ).toEqual(expect.objectContaining({ monthlySalesVolume: null }));
  });

  it("rejects unknown browser fields", () => {
    expect(() =>
      productionDiagnosisSchema.parse({
        ...validProduction,
        userId: "55555555-5555-4555-8555-555555555555",
      }),
    ).toThrow();
  });
});
