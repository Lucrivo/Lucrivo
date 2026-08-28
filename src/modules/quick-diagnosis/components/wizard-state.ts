import type {
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
  ServicePricingMethod,
} from "../types";

const wizardSteps = [
  "diagnosisType",
  "monthlyGoal",
  "fixedExpenses",
  "workRoutine",
  "pricingMethod",
  "currentPrice",
  "fees",
  "review",
] as const;

type WizardStep = (typeof wizardSteps)[number];
type DiagnosisType = "service" | "product" | "production";

type WizardState = {
  step: WizardStep;
  diagnosisType: DiagnosisType | "";
  diagnosisTypeError: string | null;
  values: ServiceDiagnosisInput;
  fieldErrors: ServiceDiagnosisFieldErrors;
  status: "editing" | "submitting" | "success";
  diagnosisId: number | null;
  submitError: "unauthorized" | "create_failed" | null;
};

type WizardAction =
  | {
      type: "setField";
      field: ServiceDiagnosisField;
      value: string;
    }
  | { type: "setPricingMethod"; value: ServicePricingMethod }
  | { type: "setDiagnosisType"; value: DiagnosisType }
  | { type: "setDiagnosisTypeError"; error: string | null }
  | {
      type: "setFieldErrors";
      fieldErrors: ServiceDiagnosisFieldErrors;
    }
  | { type: "next" }
  | { type: "back" }
  | { type: "edit"; step: WizardStep }
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

function createInitialWizardState(submissionId: string): WizardState {
  return {
    step: "diagnosisType",
    diagnosisType: "",
    diagnosisTypeError: null,
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

function adjacentStep(step: WizardStep, offset: -1 | 1): WizardStep {
  const currentIndex = wizardSteps.indexOf(step);
  const nextIndex = Math.min(
    wizardSteps.length - 1,
    Math.max(0, currentIndex + offset),
  );

  return wizardSteps[nextIndex];
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
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
    case "setDiagnosisType":
      return {
        ...state,
        diagnosisType: action.value,
        diagnosisTypeError: null,
      };
    case "setDiagnosisTypeError":
      return { ...state, diagnosisTypeError: action.error };
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
      return createInitialWizardState(action.submissionId);
  }
}

export {
  createInitialWizardState,
  wizardReducer,
  wizardSteps,
  type WizardAction,
  type DiagnosisType,
  type WizardState,
  type WizardStep,
};
