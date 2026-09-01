import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisValidatedInput } from "../types";
import { composeProductionDiagnosisCommand } from "./compose-production-diagnosis-command";

const validatedComposed: ProductionDiagnosisValidatedInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
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
};

const validatedSummarized: ProductionDiagnosisValidatedInput = {
  ...validatedComposed,
  costCompositionEnabled: false,
  productionUnitCostCents: 5000,
  materialUnitCostCents: null,
  packagingUnitCostCents: null,
  directLaborUnitCostCents: null,
  otherVariableUnitCostCents: null,
};

describe("composeProductionDiagnosisCommand", () => {
  it("builds the authoritative composed total", () => {
    expect(composeProductionDiagnosisCommand(validatedComposed)).toEqual({
      ...validatedComposed,
      productionUnitCostCents: 5000,
    });
  });

  it("preserves the validated summarized total", () => {
    expect(composeProductionDiagnosisCommand(validatedSummarized)).toEqual({
      ...validatedSummarized,
      productionUnitCostCents: 5000,
    });
  });

  it("re-sums components instead of trusting a preexisting total", () => {
    expect(
      composeProductionDiagnosisCommand({
        ...validatedComposed,
        productionUnitCostCents: 9999,
      }).productionUnitCostCents,
    ).toBe(5000);
  });

  it("rejects impossible nullable cost shapes", () => {
    expect(() =>
      composeProductionDiagnosisCommand({
        ...validatedSummarized,
        productionUnitCostCents: null,
      }),
    ).toThrow("invalid_cost_shape");

    expect(() =>
      composeProductionDiagnosisCommand({
        ...validatedComposed,
        materialUnitCostCents: null,
      }),
    ).toThrow("invalid_cost_shape");
  });

  it("rejects a non-positive composed aggregate", () => {
    expect(() =>
      composeProductionDiagnosisCommand({
        ...validatedComposed,
        materialUnitCostCents: 0,
        packagingUnitCostCents: 0,
        directLaborUnitCostCents: 0,
        otherVariableUnitCostCents: 0,
      }),
    ).toThrow("invalid_cost_total");
  });

  it("rejects an unsafe composed aggregate", () => {
    expect(() =>
      composeProductionDiagnosisCommand({
        ...validatedComposed,
        materialUnitCostCents: Number.MAX_SAFE_INTEGER,
        packagingUnitCostCents: 1,
        directLaborUnitCostCents: 0,
        otherVariableUnitCostCents: 0,
      }),
    ).toThrow("invalid_cost_total");
  });
});
