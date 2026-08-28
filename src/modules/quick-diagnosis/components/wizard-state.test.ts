import { describe, expect, it } from "vitest";

import {
  createInitialWizardState,
  wizardReducer,
  wizardSteps,
  type WizardState,
} from "./wizard-state";

const firstSubmissionId = "550e8400-e29b-41d4-a716-446655440000";
const nextSubmissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function withHourlyValues(): WizardState {
  return {
    ...createInitialWizardState(firstSubmissionId),
    step: "currentPrice",
    values: {
      ...createInitialWizardState(firstSubmissionId).values,
      pricingMethod: "hour",
      desiredMonthlyIncome: "5000",
      hourlyRate: "125,90",
      minuteRate: "2,50",
      appointmentRate: "350",
      appointmentDurationMinutes: "90",
    },
  };
}

describe("wizard state", () => {
  it("starts on the first step with an injected submission id", () => {
    expect(createInitialWizardState(firstSubmissionId)).toEqual({
      step: "pricingMethod",
      values: {
        submissionId: firstSubmissionId,
        pricingMethod: "",
        desiredMonthlyIncome: "",
        fixedMonthlyExpenses: "",
        monthlyWorkHours: "",
        weeklyWorkDays: "",
        hourlyRate: "",
        minuteRate: "",
        appointmentRate: "",
        appointmentDurationMinutes: "",
        taxRate: "",
        cardFeeRate: "",
      },
      fieldErrors: {},
      status: "editing",
      diagnosisId: null,
      submitError: null,
    });
    expect(wizardSteps).toHaveLength(7);
  });

  it("sets a field without changing the other answers", () => {
    const state = createInitialWizardState(firstSubmissionId);

    expect(
      wizardReducer(state, {
        type: "setField",
        field: "desiredMonthlyIncome",
        value: "5000",
      }).values,
    ).toEqual({ ...state.values, desiredMonthlyIncome: "5000" });
  });

  it("clears all method-dependent values when pricing method changes", () => {
    const state = withHourlyValues();

    expect(
      wizardReducer(state, {
        type: "setPricingMethod",
        value: "minute",
      }).values,
    ).toEqual(
      expect.objectContaining({
        pricingMethod: "minute",
        desiredMonthlyIncome: "5000",
        hourlyRate: "",
        minuteRate: "",
        appointmentRate: "",
        appointmentDurationMinutes: "",
      }),
    );
  });

  it("sets and replaces field errors", () => {
    const state = createInitialWizardState(firstSubmissionId);
    const fieldErrors = { hourlyRate: ["Informe o valor por hora."] };

    expect(
      wizardReducer(state, { type: "setFieldErrors", fieldErrors }).fieldErrors,
    ).toEqual(fieldErrors);
  });

  it("moves next and back while preserving answers", () => {
    const state = wizardReducer(withHourlyValues(), {
      type: "edit",
      step: "monthlyGoal",
    });
    const next = wizardReducer(state, { type: "next" });
    const back = wizardReducer(next, { type: "back" });

    expect(next.step).toBe("fixedExpenses");
    expect(back.step).toBe("monthlyGoal");
    expect(back.values).toEqual(state.values);
  });

  it("clamps navigation to the first and last steps", () => {
    const initial = createInitialWizardState(firstSubmissionId);
    const review = { ...initial, step: "review" } satisfies WizardState;

    expect(wizardReducer(initial, { type: "back" }).step).toBe("pricingMethod");
    expect(wizardReducer(review, { type: "next" }).step).toBe("review");
  });

  it("edits a named source step", () => {
    const state = {
      ...withHourlyValues(),
      step: "review",
    } satisfies WizardState;

    expect(
      wizardReducer(state, { type: "edit", step: "workRoutine" }).step,
    ).toBe("workRoutine");
  });

  it("tracks submitting, safe retry errors and success", () => {
    const state = withHourlyValues();
    const submitting = wizardReducer(state, { type: "submitting" });
    const retry = wizardReducer(submitting, {
      type: "submitError",
      error: "create_failed",
    });
    const success = wizardReducer(submitting, {
      type: "success",
      diagnosisId: 42,
    });

    expect(submitting).toEqual(
      expect.objectContaining({ status: "submitting", submitError: null }),
    );
    expect(retry).toEqual({
      ...state,
      status: "editing",
      submitError: "create_failed",
    });
    expect(success).toEqual(
      expect.objectContaining({
        status: "success",
        diagnosisId: 42,
        submitError: null,
      }),
    );
  });

  it("resets every answer with a fresh submission id", () => {
    const reset = wizardReducer(
      {
        ...withHourlyValues(),
        fieldErrors: { hourlyRate: ["Erro"] },
        submitError: "unauthorized",
      },
      { type: "reset", submissionId: nextSubmissionId },
    );

    expect(reset).toEqual(createInitialWizardState(nextSubmissionId));
  });
});
