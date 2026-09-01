import type {
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
  ServicePricingMethod,
} from "../../types";

const serviceWizardSteps = [
  "monthlyGoal",
  "fixedExpenses",
  "workRoutine",
  "pricingMethod",
  "currentPrice",
  "fees",
  "review",
] as const;

type ServiceWizardStep = (typeof serviceWizardSteps)[number];

type ServiceWizardState = {
  step: ServiceWizardStep;
  values: ServiceDiagnosisInput;
  fieldErrors: ServiceDiagnosisFieldErrors;
  status: "editing" | "submitting" | "success";
  diagnosisId: number | null;
  submitError: "unauthorized" | "create_failed" | null;
};

type ServiceWizardAction =
  | {
      type: "setField";
      field: ServiceDiagnosisField;
      value: string;
    }
  | { type: "setPricingMethod"; value: ServicePricingMethod }
  | {
      type: "setFieldErrors";
      fieldErrors: ServiceDiagnosisFieldErrors;
    }
  | { type: "next" }
  | { type: "back" }
  | { type: "edit"; step: ServiceWizardStep }
  | { type: "submitting" }
  | {
      type: "submitError";
      error: "unauthorized" | "create_failed";
    }
  | { type: "success"; diagnosisId: number }
  | { type: "reset"; submissionId: string };

const methodDependentFields = [
  "hourlyRate",
  "minuteRate",
  "appointmentRate",
  "appointmentDurationMinutes",
] as const satisfies readonly ServiceDiagnosisField[];

function createInitialServiceWizardState(
  submissionId: string,
): ServiceWizardState {
  return {
    step: "monthlyGoal",
    values: {
      submissionId,
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
  };
}

function adjacentStep(
  step: ServiceWizardStep,
  offset: -1 | 1,
): ServiceWizardStep {
  const currentIndex = serviceWizardSteps.indexOf(step);
  const nextIndex = Math.min(
    serviceWizardSteps.length - 1,
    Math.max(0, currentIndex + offset),
  );

  return serviceWizardSteps[nextIndex];
}

function serviceWizardReducer(
  state: ServiceWizardState,
  action: ServiceWizardAction,
): ServiceWizardState {
  switch (action.type) {
    case "setField": {
      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors[action.field];

      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        fieldErrors,
      };
    }
    case "setPricingMethod": {
      const fieldErrors = { ...state.fieldErrors };
      for (const field of methodDependentFields) delete fieldErrors[field];
      delete fieldErrors.pricingMethod;

      return {
        ...state,
        values: {
          ...state.values,
          pricingMethod: action.value,
          hourlyRate: "",
          minuteRate: "",
          appointmentRate: "",
          appointmentDurationMinutes: "",
        },
        fieldErrors,
      };
    }
    case "setFieldErrors":
      return { ...state, fieldErrors: action.fieldErrors };
    case "next":
      return { ...state, step: adjacentStep(state.step, 1) };
    case "back":
      return { ...state, step: adjacentStep(state.step, -1) };
    case "edit":
      return { ...state, step: action.step, status: "editing" };
    case "submitting":
      return { ...state, status: "submitting", submitError: null };
    case "submitError":
      return {
        ...state,
        status: "editing",
        submitError: action.error,
      };
    case "success":
      return {
        ...state,
        status: "success",
        diagnosisId: action.diagnosisId,
        submitError: null,
      };
    case "reset":
      return createInitialServiceWizardState(action.submissionId);
  }
}

export {
  createInitialServiceWizardState,
  serviceWizardReducer,
  serviceWizardSteps,
  type ServiceWizardAction,
  type ServiceWizardState,
  type ServiceWizardStep,
};
