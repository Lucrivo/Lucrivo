import { describe, expect, it } from "vitest";

import type { CurrentDetailedReportSnapshot } from "../types";
import { calculateDetailedSalesGoal } from "./calculate-detailed-sales-goal";

type Inputs = CurrentDetailedReportSnapshot["inputs"];
type Results = CurrentDetailedReportSnapshot["results"];

const policy = {
  weeklyDivisorHundredths: 433,
  operatingDaysPerWeek: 6,
} as const;

function inputsWithVolumes(volumes: Array<number | null>): Inputs {
  return {
    items: volumes.map((monthlySalesVolume, index) => ({
      id: `item-${index}`,
      monthlySalesVolume,
    })),
  } as Inputs;
}

function resultsWith(overrides: Partial<Results> = {}): Results {
  return {
    isPartial: false,
    effectiveFixedCostCents: 10_000,
    monthlyContributionCents: 10_000,
    items: [{ unitContributionCents: 2_500 }],
    ...overrides,
  } as Results;
}

describe("calculateDetailedSalesGoal", () => {
  it("calculates a single unknown item's monthly goal without a routine split", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([null]),
        resultsWith({ isPartial: true, monthlyContributionCents: null }),
        policy,
      ),
    ).toEqual({
      available: true,
      monthly: 4,
      weekly: null,
      daily: null,
      basedOnKnownMix: false,
    });
  });

  it("does not invent a combined mix when multiple items include unknown volume", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([10, null]),
        resultsWith({ isPartial: true, monthlyContributionCents: null }),
        policy,
      ),
    ).toEqual({
      available: false,
      reason:
        "Para calcular uma quantidade única, informe as vendas mensais de todos os itens.",
    });
  });

  it("preserves the informed mix when every volume is known", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([4, 6]),
        resultsWith({ monthlyContributionCents: 20_000 }),
        policy,
      ),
    ).toEqual({
      available: true,
      monthly: 5,
      weekly: 2,
      daily: 1,
      basedOnKnownMix: true,
    });
  });

  it("returns unavailable when known total volume is zero", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([0, 0]),
        resultsWith({ monthlyContributionCents: 0 }),
        policy,
      ),
    ).toEqual({
      available: false,
      reason:
        "Informe uma quantidade vendida maior que zero para mostrar a proporção entre os itens.",
    });
  });
});
