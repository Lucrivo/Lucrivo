import { describe, expect, it } from "vitest";

import {
  calculateServiceFlowPreview,
  type ServiceFlowInput,
} from "./service-flow";

const baseInput: ServiceFlowInput = {
  desiredMonthlyIncome: "5000",
  fixedMonthlyExpenses: "2000",
  pricingMethod: "hour",
  currentPrice: "50",
  dailyWorkHours: "8",
  weeklyWorkDays: "5",
  appointmentDurationMinutes: "",
  hasMaterialCost: false,
  materialCost: "",
  materialCostUnit: "",
  paysRevenueTax: false,
  taxRate: "",
  hasPaymentFee: false,
  paymentFeeRate: "",
};

describe("service flow calculations", () => {
  it("combines the monthly goal and fixed costs and normalizes capacity", () => {
    expect(calculateServiceFlowPreview(baseInput)).toEqual(
      expect.objectContaining({
        monthlyRevenueTargetCents: 700_000,
        monthlyWorkMinutes: 10_392,
        requiredHourlyRateCents: 4_042,
        currentEquivalentHourlyRateCents: 5_000,
      }),
    );
  });

  it.each([
    ["minute", "2", 12_000],
    ["hour", "50", 5_000],
    ["day", "400", 5_000],
    ["week", "2000", 5_000],
    ["month", "8660", 5_000],
  ] as const)(
    "converts a %s price to its hourly equivalent",
    (pricingMethod, currentPrice, expectedCents) => {
      expect(
        calculateServiceFlowPreview({
          ...baseInput,
          pricingMethod,
          currentPrice,
        }).currentEquivalentHourlyRateCents,
      ).toBe(expectedCents);
    },
  );

  it("uses duration only to convert an appointment price", () => {
    expect(
      calculateServiceFlowPreview({
        ...baseInput,
        pricingMethod: "appointment",
        currentPrice: "50",
        appointmentDurationMinutes: "45",
      }).currentEquivalentHourlyRateCents,
    ).toBe(6_667);
  });

  it.each([
    ["appointment", "20", 2_667],
    ["hour", "20", 2_000],
    ["day", "80", 1_000],
    ["month", "1732", 1_000],
  ] as const)(
    "normalizes material charged per %s independently from the sale unit",
    (materialCostUnit, materialCost, expectedCents) => {
      expect(
        calculateServiceFlowPreview({
          ...baseInput,
          pricingMethod: "appointment",
          currentPrice: "50",
          appointmentDurationMinutes: "45",
          hasMaterialCost: true,
          materialCostUnit,
          materialCost,
        }).materialEquivalentHourlyCostCents,
      ).toBe(expectedCents);
    },
  );

  it("applies revenue percentages after converting values to an hourly base", () => {
    expect(
      calculateServiceFlowPreview({
        ...baseInput,
        hasMaterialCost: true,
        materialCostUnit: "hour",
        materialCost: "5",
        paysRevenueTax: true,
        taxRate: "6",
        hasPaymentFee: true,
        paymentFeeRate: "4",
      }).netEquivalentHourlyRateCents,
    ).toBe(4_000);
  });
});
