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
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "month",
  workPeriodMinutes: 6_000,
  monthlyWorkMinutes: 6_000,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8_000,
  appointmentDurationMinutes: 50,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

describe("calculateServiceReport", () => {
  it("calculates full service cost without a target price", () => {
    const result = calculateServiceReport(baseCommand);

    expect(result).toEqual({
      unit: "appointment",
      totalFeeBasisPoints: 800,
      monthlyWorkMinutes: 6_000,
      monthlyCostCents: 600_000,
      hourCostCents: 6_000,
      structureUnitCostCents: 5_000,
      materialUnitCostCents: 0,
      unitCostCents: 5_000,
      currentPriceCents: 8_000,
      netRevenueCents: 7_360,
      unitContributionCents: 7_360,
      unitProfitCents: 2_360,
      realMarginBasisPoints: 2_950,
      minimumPriceCents: 5_435,
      monthlySalesGoal: 82,
      weeklySalesGoal: 19,
      dailySalesGoal: 4,
      breakEvenDiscountPercent: 32,
      verdict: "positive_result",
      priority: "volume",
    });
    expect(result).not.toHaveProperty("targetPriceCents");
  });

  it("keeps capacity-dependent values unavailable when work capacity is missing", () => {
    expect(
      calculateServiceReport({ ...baseCommand, monthlyWorkMinutes: 0 }),
    ).toMatchObject({
      hourCostCents: null,
      structureUnitCostCents: null,
      unitCostCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      minimumPriceCents: null,
      breakEvenDiscountPercent: null,
    });
  });

  it("keeps missing price and direct loss objective", () => {
    expect(
      calculateServiceReport({ ...baseCommand, appointmentRateCents: 0 }),
    ).toMatchObject({ verdict: "missing_price", priority: "price" });
    expect(
      calculateServiceReport({
        ...baseCommand,
        appointmentRateCents: 1_000,
        materialUnitCostCents: 1_000,
      }),
    ).toMatchObject({ verdict: "direct_loss", priority: "cost" });
  });

  it("classifies a negative full result as operational loss", () => {
    expect(
      calculateServiceReport({ ...baseCommand, appointmentRateCents: 4_000 }),
    ).toMatchObject({
      unitProfitCents: -1_320,
      verdict: "operational_loss",
      priority: "price",
    });
  });

  it("classifies exact full-cost break-even without margin priority", () => {
    expect(
      calculateServiceReport({
        ...baseCommand,
        appointmentRateCents: 5_000,
        taxRateBasisPoints: 0,
        cardFeeRateBasisPoints: 0,
      }),
    ).toMatchObject({
      unitProfitCents: 0,
      realMarginBasisPoints: 0,
      verdict: "break_even",
      priority: "volume",
    });
  });
});

describe("classifyServiceMargin", () => {
  it.each([
    [0, null, null, "missing_price"],
    [100, 0, null, "direct_loss"],
    [100, 1, -1, "operational_loss"],
    [100, 1, 0, "break_even"],
    [100, 1, 100, "positive_result"],
    [100, 1, 1_000, "positive_result"],
    [100, 1, 3_000, "positive_result"],
  ] as const)(
    "classifies price %s, contribution %s, and margin %s as %s",
    (price, contribution, margin, expected) => {
      expect(classifyServiceMargin(price, contribution, margin)).toBe(expected);
    },
  );
});

describe("selectServicePriority", () => {
  it.each([
    ["missing_price", "price"],
    ["direct_loss", "cost"],
    ["operational_loss", "price"],
    ["break_even", "volume"],
    ["positive_result", "volume"],
  ] as const)("maps %s to %s", (verdict, expected) => {
    expect(selectServicePriority(verdict)).toBe(expected);
  });
});
