import { describe, expect, it } from "vitest";

import type { ServiceFlowInput } from "../domain/service-flow";
import {
  serviceFlowSubmissionSchema,
  validateServiceFlowFields,
} from "./service-flow.schema";

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
  it("accepts a complete flow with a submission identifier", () => {
    expect(
      serviceFlowSubmissionSchema.parse({
        ...validInput,
        submissionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toEqual({
      ...validInput,
      submissionId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("rejects an invalid submission identifier", () => {
    expect(
      serviceFlowSubmissionSchema.safeParse({
        ...validInput,
        submissionId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("accepts the complete new service flow", () => {
    expect(
      validateServiceFlowFields(Object.keys(validInput), validInput),
    ).toEqual({});
  });

  it("requires duration when billing or material uses appointments", () => {
    const errors = validateServiceFlowFields(["appointmentDurationMinutes"], {
      ...validInput,
      appointmentDurationMinutes: "",
    });
    expect(errors.appointmentDurationMinutes).toEqual([
      "Informe quanto tempo dura, em média, um serviço.",
    ]);

    expect(
      validateServiceFlowFields(["appointmentDurationMinutes"], {
        ...validInput,
        pricingMethod: "minute",
        materialCostUnit: "hour",
        appointmentDurationMinutes: "",
      }),
    ).toEqual({});

    expect(
      validateServiceFlowFields(["appointmentDurationMinutes"], {
        ...validInput,
        pricingMethod: "hour",
        materialCostUnit: "appointment",
        appointmentDurationMinutes: "",
      }).appointmentDurationMinutes,
    ).toEqual(["Informe quanto tempo dura, em média, um serviço."]);
  });

  it("requires a material value and unit only when material exists", () => {
    const errors = validateServiceFlowFields(
      ["materialCost", "materialCostUnit"],
      { ...validInput, materialCost: "", materialCostUnit: "" },
    );

    expect(errors).toHaveProperty("materialCost");
    expect(errors.materialCostUnit).toEqual([
      "Escolha quando esse gasto com materiais acontece.",
    ]);
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
    expect(errors.taxRate).toEqual([
      "Informe a porcentagem do valor recebido que vai para impostos.",
    ]);
    expect(errors.paymentFeeRate).toEqual([
      "Informe a porcentagem que fica com o cartão ou a plataforma.",
    ]);
  });

  it("uses the visible wording for monthly values", () => {
    expect(
      validateServiceFlowFields(
        ["desiredMonthlyIncome", "fixedMonthlyExpenses"],
        { ...validInput, desiredMonthlyIncome: "", fixedMonthlyExpenses: "-1" },
      ),
    ).toEqual({
      desiredMonthlyIncome: ["Informe quanto você quer receber por mês."],
      fixedMonthlyExpenses: ["Informe os gastos que existem todo mês."],
    });
  });
});
