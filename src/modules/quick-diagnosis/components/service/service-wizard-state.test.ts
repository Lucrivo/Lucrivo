import { describe, expect, it } from "vitest";

import {
  createInitialServiceWizardState,
  serviceWizardReducer,
  serviceWizardSteps,
  type ServiceWizardState,
} from "./service-wizard-state";

const firstSubmissionId = "550e8400-e29b-41d4-a716-446655440000";
const nextSubmissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function withHourlyValues(): ServiceWizardState {
  return {
    ...createInitialServiceWizardState(firstSubmissionId),
    step: "currentPrice",
    values: {
      ...createInitialServiceWizardState(firstSubmissionId).values,
      pricingMethod: "hour",
      desiredMonthlyIncome: "5000",
      workHoursPeriod: "month",
      workHours: "160",
      hourlyRate: "125,90",
      minuteRate: "2,50",
      appointmentRate: "350",
      appointmentDurationMinutes: "90",
      hasMaterialCost: true,
      materialUnitCost: "30,50",
    },
  };
}

describe("service wizard state", () => {
  it("starts on the first step with an injected submission id", () => {
    expect(createInitialServiceWizardState(firstSubmissionId)).toEqual({
      step: "monthlyGoal",
      values: {
        submissionId: firstSubmissionId,
        pricingMethod: "",
        desiredMonthlyIncome: "",
        fixedMonthlyExpenses: "",
        workHoursPeriod: "month",
        workHours: "",
        weeklyWorkDays: "",
        hourlyRate: "",
        minuteRate: "",
        appointmentRate: "",
        appointmentDurationMinutes: "",
        hasMaterialCost: false,
        materialUnitCost: "",
        taxRate: "",
        cardFeeRate: "",
      },
      fieldErrors: {},
      status: "editing",
      diagnosisId: null,
      submitError: null,
    });
    expect(serviceWizardSteps).toEqual([
      "monthlyGoal",
      "fixedExpenses",
      "workRoutine",
      "pricingMethod",
      "currentPrice",
      "materialCost",
      "fees",
      "review",
    ]);
  });

  it("sets a field without changing the other answers", () => {
    const state = createInitialServiceWizardState(firstSubmissionId);

    expect(
      serviceWizardReducer(state, {
        type: "setField",
        field: "desiredMonthlyIncome",
        value: "5000",
      }).values,
    ).toEqual({ ...state.values, desiredMonthlyIncome: "5000" });
  });

  it("clears all method-dependent values when pricing method changes", () => {
    const state = {
      ...withHourlyValues(),
      fieldErrors: {
        hourlyRate: ["Informe o preço."],
        materialUnitCost: ["Informe o custo de material."],
      },
    } satisfies ServiceWizardState;

    const next = serviceWizardReducer(state, {
      type: "setPricingMethod",
      value: "minute",
    });

    expect(next.values).toEqual(
      expect.objectContaining({
        pricingMethod: "minute",
        desiredMonthlyIncome: "5000",
        hourlyRate: "",
        minuteRate: "",
        appointmentRate: "",
        appointmentDurationMinutes: "",
        hasMaterialCost: false,
        materialUnitCost: "",
      }),
    );
    expect(next.fieldErrors.hourlyRate).toBeUndefined();
    expect(next.fieldErrors.materialUnitCost).toBeUndefined();
  });

  it("changes the work period while preserving hours and clearing its error", () => {
    const state = {
      ...withHourlyValues(),
      fieldErrors: { workHours: ["Informe as horas faturáveis."] },
    } satisfies ServiceWizardState;

    const next = serviceWizardReducer(state, {
      type: "setWorkHoursPeriod",
      value: "day",
    });

    expect(next.values.workHoursPeriod).toBe("day");
    expect(next.values.workHours).toBe("160");
    expect(next.fieldErrors.workHours).toBeUndefined();
  });

  it("clears material value and errors when material cost is disabled", () => {
    const state = {
      ...withHourlyValues(),
      fieldErrors: { materialUnitCost: ["Informe o custo de material."] },
    } satisfies ServiceWizardState;

    const next = serviceWizardReducer(state, {
      type: "setHasMaterialCost",
      value: false,
    });

    expect(next.values.hasMaterialCost).toBe(false);
    expect(next.values.materialUnitCost).toBe("");
    expect(next.fieldErrors.materialUnitCost).toBeUndefined();
  });

  it("sets and replaces field errors", () => {
    const state = createInitialServiceWizardState(firstSubmissionId);
    const fieldErrors = { hourlyRate: ["Informe o valor por hora."] };

    expect(
      serviceWizardReducer(state, { type: "setFieldErrors", fieldErrors })
        .fieldErrors,
    ).toEqual(fieldErrors);
  });

  it("moves next and back while preserving answers", () => {
    const state = serviceWizardReducer(withHourlyValues(), {
      type: "edit",
      step: "monthlyGoal",
    });
    const next = serviceWizardReducer(state, { type: "next" });
    const back = serviceWizardReducer(next, { type: "back" });

    expect(next.step).toBe("fixedExpenses");
    expect(back.step).toBe("monthlyGoal");
    expect(back.values).toEqual(state.values);
  });

  it("clamps navigation to the first and last steps", () => {
    const initial = createInitialServiceWizardState(firstSubmissionId);
    const review = { ...initial, step: "review" } satisfies ServiceWizardState;

    expect(serviceWizardReducer(initial, { type: "back" }).step).toBe(
      "monthlyGoal",
    );
    expect(serviceWizardReducer(review, { type: "next" }).step).toBe("review");
  });

  it("edits a named source step", () => {
    const state = {
      ...withHourlyValues(),
      step: "review",
    } satisfies ServiceWizardState;

    expect(
      serviceWizardReducer(state, { type: "edit", step: "workRoutine" }).step,
    ).toBe("workRoutine");
  });

  it("tracks submitting, safe retry errors and success", () => {
    const state = withHourlyValues();
    const submitting = serviceWizardReducer(state, { type: "submitting" });
    const retry = serviceWizardReducer(submitting, {
      type: "submitError",
      error: "create_failed",
    });
    const success = serviceWizardReducer(submitting, {
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
    const reset = serviceWizardReducer(
      {
        ...withHourlyValues(),
        fieldErrors: { hourlyRate: ["Erro"] },
        submitError: "unauthorized",
      },
      { type: "reset", submissionId: nextSubmissionId },
    );

    expect(reset).toEqual(createInitialServiceWizardState(nextSubmissionId));
  });
});
