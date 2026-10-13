import { describe, expect, it } from "vitest";

import {
  createInitialServiceWizardState,
  getServiceWizardSteps,
  serviceWizardReducer,
  type ServiceWizardState,
} from "./service-wizard-state";

const submissionId = "550e8400-e29b-41d4-a716-446655440000";

function withValues(): ServiceWizardState {
  return {
    ...createInitialServiceWizardState(submissionId),
    step: "workRoutine",
    values: {
      ...createInitialServiceWizardState(submissionId).values,
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
    },
  };
}

describe("service wizard state", () => {
  it("starts with only the fields used by the new isolated flow", () => {
    expect(createInitialServiceWizardState(submissionId)).toEqual({
      submissionId,
      step: "monthlyGoal",
      values: {
        desiredMonthlyIncome: "",
        fixedMonthlyExpenses: "",
        pricingMethod: "",
        currentPrice: "",
        dailyWorkHours: "",
        weeklyWorkDays: "",
        appointmentDurationMinutes: "",
        hasMaterialCost: null,
        materialCost: "",
        materialCostUnit: "",
        paysRevenueTax: null,
        taxRate: "",
        hasPaymentFee: null,
        paymentFeeRate: "",
      },
      fieldErrors: {},
      submissionStatus: "idle",
      submissionError: null,
    });
  });

  it("tracks submission failure and replaces only an invalid id", () => {
    const filled = withValues();
    const submitting = serviceWizardReducer(filled, { type: "submitting" });
    const failed = serviceWizardReducer(submitting, {
      type: "submissionError",
      error: "create_failed",
    });
    const limited = serviceWizardReducer(submitting, {
      type: "submissionError",
      error: "limit_reached",
    });
    const replaced = serviceWizardReducer(failed, {
      type: "replaceSubmissionId",
      submissionId: "550e8400-e29b-41d4-a716-446655440001",
    });

    expect(submitting.submissionStatus).toBe("submitting");
    expect(failed).toEqual(
      expect.objectContaining({
        submissionStatus: "error",
        submissionError: "create_failed",
      }),
    );
    expect(replaced.submissionId).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(replaced.values).toEqual(filled.values);
    expect(replaced.submissionStatus).toBe("idle");
    expect(limited.submissionError).toBe("limit_reached");
  });

  it("adds the duration step only for appointment pricing", () => {
    expect(getServiceWizardSteps("appointment")).toContain("serviceDuration");
    expect(getServiceWizardSteps("hour")).not.toContain("serviceDuration");
    expect(getServiceWizardSteps("minute")).not.toContain("serviceDuration");
  });

  it("places form and price before routine and material", () => {
    expect(getServiceWizardSteps("hour")).toEqual([
      "monthlyGoal",
      "fixedExpenses",
      "pricingMethod",
      "workRoutine",
      "materialCost",
      "fees",
      "review",
    ]);
  });

  it("clears only price and appointment duration when pricing changes", () => {
    const next = serviceWizardReducer(withValues(), {
      type: "setPricingMethod",
      value: "day",
    });

    expect(next.values).toEqual(
      expect.objectContaining({
        pricingMethod: "day",
        currentPrice: "",
        appointmentDurationMinutes: "",
        hasMaterialCost: true,
        materialCost: "20",
        materialCostUnit: "appointment",
      }),
    );
  });

  it("clears conditional values when their answers change to no", () => {
    const withoutMaterial = serviceWizardReducer(withValues(), {
      type: "setHasMaterialCost",
      value: false,
    });
    const withoutTax = serviceWizardReducer(withValues(), {
      type: "setPaysRevenueTax",
      value: false,
    });
    const withoutFee = serviceWizardReducer(withValues(), {
      type: "setHasPaymentFee",
      value: false,
    });

    expect(withoutMaterial.values).toEqual(
      expect.objectContaining({ materialCost: "", materialCostUnit: "" }),
    );
    expect(withoutTax.values.taxRate).toBe("");
    expect(withoutFee.values.paymentFeeRate).toBe("");
  });

  it("navigates through the conditional sequence while preserving answers", () => {
    const appointment = withValues();
    const duration = serviceWizardReducer(appointment, { type: "next" });
    const material = serviceWizardReducer(duration, { type: "next" });
    const back = serviceWizardReducer(material, { type: "back" });

    expect(duration.step).toBe("serviceDuration");
    expect(material.step).toBe("materialCost");
    expect(back.step).toBe("serviceDuration");
    expect(back.values).toEqual(appointment.values);
  });

  it("skips duration after a non-appointment routine", () => {
    const state = {
      ...withValues(),
      values: { ...withValues().values, pricingMethod: "month" },
    };

    expect(serviceWizardReducer(state, { type: "next" }).step).toBe(
      "materialCost",
    );
  });
});
