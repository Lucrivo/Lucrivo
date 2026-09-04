import { describe, expect, it } from "vitest";

import type { ServiceFlowInput } from "../domain/service-flow";
import { validateServiceFlowFields } from "./service-flow.schema";

const validInput: ServiceFlowInput = {
  desiredMonthlyIncome: "5000",
  fixedMonthlyExpenses: "2000",
  pricingMethod: "appointment",
  currentPrice: "50",
  dailyWorkHours: "8",
  weeklyWorkDays: "5",
  appointmentDurationMinutes: "45",
  hasMaterialCost: true,
  materialCost: "20",
  materialCostUnit: "appointment",
  paysRevenueTax: true,
  taxRate: "6",
  hasPaymentFee: true,
  paymentFeeRate: "3,5",
};

describe("service flow validation", () => {
  it("accepts the complete new service flow", () => {
    expect(
      validateServiceFlowFields(Object.keys(validInput), validInput),
    ).toEqual({});
  });

  it("requires duration only for appointments", () => {
    expect(
      validateServiceFlowFields(["appointmentDurationMinutes"], {
        ...validInput,
        appointmentDurationMinutes: "",
      }),
    ).toHaveProperty("appointmentDurationMinutes");

    expect(
      validateServiceFlowFields(["appointmentDurationMinutes"], {
        ...validInput,
        pricingMethod: "minute",
        appointmentDurationMinutes: "",
      }),
    ).toEqual({});
  });

  it("requires a material value and unit only when material exists", () => {
    const errors = validateServiceFlowFields(
      ["materialCost", "materialCostUnit"],
      { ...validInput, materialCost: "", materialCostUnit: "" },
    );

    expect(errors).toHaveProperty("materialCost");
    expect(errors).toHaveProperty("materialCostUnit");
    expect(
      validateServiceFlowFields(["materialCost", "materialCostUnit"], {
        ...validInput,
        hasMaterialCost: false,
        materialCost: "",
        materialCostUnit: "",
      }),
    ).toEqual({});
  });

  it("requires percentages only for the selected revenue costs", () => {
    const errors = validateServiceFlowFields(["taxRate", "paymentFeeRate"], {
      ...validInput,
      taxRate: "",
      paymentFeeRate: "",
    });

    expect(errors).toHaveProperty("taxRate");
    expect(errors).toHaveProperty("paymentFeeRate");
  });
});
