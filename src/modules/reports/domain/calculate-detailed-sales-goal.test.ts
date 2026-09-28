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
    ...overrides,
  } as Results;
}

describe("calculateDetailedSalesGoal", () => {
  it("calculates monthly, weekly, and daily units with ceiling division", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([10]),
        resultsWith(),
        policy,
      ),
    ).toEqual({ available: true, monthly: 10, weekly: 3, daily: 1 });
  });

  it("rounds every non-divisible result upward", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([10]),
        resultsWith({ effectiveFixedCostCents: 25_001 }),
        policy,
      ),
    ).toEqual({ available: true, monthly: 26, weekly: 7, daily: 2 });
  });

  it("returns zero units when fixed costs are zero", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([10]),
        resultsWith({ effectiveFixedCostCents: 0 }),
        policy,
      ),
    ).toEqual({ available: true, monthly: 0, weekly: 0, daily: 0 });
  });

  it("explains when any item volume is missing", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([10, null]),
        resultsWith({ isPartial: true, monthlyContributionCents: null }),
        policy,
      ),
    ).toEqual({
      available: false,
      reason: "Informe as vendas mensais de todos os itens para calcular.",
    });
  });

  it("explains when total volume is zero", () => {
    expect(
      calculateDetailedSalesGoal(
        inputsWithVolumes([0, 0]),
        resultsWith({ monthlyContributionCents: 0 }),
        policy,
      ),
    ).toEqual({
      available: false,
      reason: "Informe uma quantidade vendida maior que zero para calcular.",
    });
  });

  it.each([null, 0, -1])(
    "explains when monthly contribution is %s",
    (monthlyContributionCents) => {
      expect(
        calculateDetailedSalesGoal(
          inputsWithVolumes([10]),
          resultsWith({ monthlyContributionCents }),
          policy,
        ),
      ).toEqual({
        available: false,
        reason:
          "As vendas informadas não deixam valor suficiente para calcular uma meta.",
      });
    },
  );
});
