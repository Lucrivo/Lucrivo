import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import {
  calculateServiceReport,
  classifyServiceMargin,
  selectServicePriority,
} from "./calculate-service-report";

const baseCommand: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "appointment",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8000,
  appointmentDurationMinutes: 50,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

describe("calculateServiceReport", () => {
  it.each([
    {
      name: "appointment",
      command: baseCommand,
      expected: {
        unit: "appointment",
        hourCostCents: 6000,
        unitCostCents: 5000,
        currentPriceCents: 8000,
        netRevenueCents: 7360,
        unitProfitCents: 2360,
        realMarginBasisPoints: 2950,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
        monthlySalesGoal: 82,
        weeklySalesGoal: 19,
        dailySalesGoal: 4,
        verdict: "above_target",
        priority: "volume",
      },
    },
    {
      name: "hour",
      command: {
        ...baseCommand,
        pricingMethod: "hour" as const,
        hourlyRateCents: 8000,
        appointmentRateCents: 0,
        appointmentDurationMinutes: 0,
      },
      expected: {
        unit: "hour",
        hourCostCents: 6000,
        unitCostCents: 6000,
        currentPriceCents: 8000,
        netRevenueCents: 7360,
        unitProfitCents: 1360,
        realMarginBasisPoints: 1700,
        minimumPriceCents: 6522,
        targetPriceCents: 7793,
        monthlySalesGoal: 82,
        weeklySalesGoal: 19,
        dailySalesGoal: 4,
        verdict: "adequate_margin",
        priority: "volume",
      },
    },
    {
      name: "minute",
      command: {
        ...baseCommand,
        pricingMethod: "minute" as const,
        minuteRateCents: 250,
        appointmentRateCents: 0,
        appointmentDurationMinutes: 40,
      },
      expected: {
        unit: "appointment",
        hourCostCents: 6000,
        unitCostCents: 4000,
        currentPriceCents: 10000,
        netRevenueCents: 9200,
        unitProfitCents: 5200,
        realMarginBasisPoints: 5200,
        minimumPriceCents: 4348,
        targetPriceCents: 5195,
        monthlySalesGoal: 66,
        weeklySalesGoal: 16,
        dailySalesGoal: 4,
        verdict: "above_target",
        priority: "volume",
      },
    },
  ])("calculates the $name scenario exactly", ({ command, expected }) => {
    expect(calculateServiceReport(command)).toEqual(
      expect.objectContaining(expected),
    );
  });

  it("returns unavailable capacity-dependent references for zero capacity", () => {
    expect(
      calculateServiceReport({ ...baseCommand, monthlyWorkMinutes: 0 }),
    ).toEqual(
      expect.objectContaining({
        hourCostCents: null,
        unitCostCents: null,
        unitProfitCents: null,
        realMarginBasisPoints: null,
        minimumPriceCents: null,
        targetPriceCents: null,
      }),
    );
  });

  it("returns unavailable price references when combined fees reach 100%", () => {
    expect(
      calculateServiceReport({
        ...baseCommand,
        taxRateBasisPoints: 8000,
        cardFeeRateBasisPoints: 2000,
      }),
    ).toEqual(
      expect.objectContaining({
        netRevenueCents: 0,
        minimumPriceCents: null,
        targetPriceCents: null,
        monthlySalesGoal: null,
        weeklySalesGoal: null,
        dailySalesGoal: null,
      }),
    );
  });

  it("prioritizes price and suppresses volume while the service loses money", () => {
    expect(
      calculateServiceReport({ ...baseCommand, appointmentRateCents: 4000 }),
    ).toEqual(
      expect.objectContaining({
        unitProfitCents: -1320,
        verdict: "operational_loss",
        priority: "price",
        monthlySalesGoal: null,
        weeklySalesGoal: null,
        dailySalesGoal: null,
      }),
    );
  });
});

describe("classifyServiceMargin", () => {
  it.each([
    [0, null, "missing_price"],
    [100, 0, "operational_loss"],
    [100, 1449, "tight_margin"],
    [100, 1450, "adequate_margin"],
    [100, 1800, "adequate_margin"],
    [100, 1801, "above_target"],
  ] as const)(
    "classifies price %s and margin %s as %s",
    (currentPriceCents, realMarginBasisPoints, expected) => {
      expect(
        classifyServiceMargin(currentPriceCents, realMarginBasisPoints),
      ).toBe(expected);
    },
  );
});

describe("selectServicePriority", () => {
  it.each([
    ["missing_price", "price"],
    ["operational_loss", "price"],
    ["tight_margin", "margin"],
    ["adequate_margin", "volume"],
    ["above_target", "volume"],
  ] as const)("maps %s to %s", (verdict, expected) => {
    expect(selectServicePriority(verdict)).toBe(expected);
  });
});
