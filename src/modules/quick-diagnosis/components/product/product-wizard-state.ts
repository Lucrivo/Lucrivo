import type {
  ProductDiagnosisField,
  ProductDiagnosisFieldErrors,
  ProductDiagnosisInput,
} from "../../types";

const productWizardSteps = [
  "analysisMode",
  "productValues",
  "fixedExpenses",
  "monthlyVolume",
  "ownerCompensation",
  "fees",
  "review",
] as const;

type ProductWizardStep = (typeof productWizardSteps)[number];
type ProductAnalysisMode = "quick" | "detailed";

type ProductWizardState = {
  step: ProductWizardStep;
  analysisMode: ProductAnalysisMode | "";
  analysisModeError: string | null;
  values: ProductDiagnosisInput;
  fieldErrors: ProductDiagnosisFieldErrors;
  status: "editing" | "submitting";
  submitError: "unauthorized" | "create_failed" | null;
};

type ProductWizardAction =
  | { type: "setAnalysisMode"; value: ProductAnalysisMode }
  | { type: "setAnalysisModeError"; error: string | null }
  | { type: "setField"; field: ProductDiagnosisField; value: string }
  | { type: "setProLaboreIncluded"; value: boolean }
  | { type: "setFieldErrors"; fieldErrors: ProductDiagnosisFieldErrors }
  | { type: "next" }
  | { type: "back" }
  | { type: "edit"; step: ProductWizardStep }
  | { type: "submitting" }
  | { type: "submitError"; error: "unauthorized" | "create_failed" }
  | { type: "reset"; submissionId: string };

function createInitialProductWizardState(
  submissionId: string,
): ProductWizardState {
  return {
    step: "analysisMode",
    analysisMode: "",
    analysisModeError: null,
    values: {
      submissionId,
      purchaseUnitCost: "",
      unitSalePrice: "",
      fixedMonthlyExpenses: "",
      monthlySalesVolume: "",
      proLaboreIncluded: false,
      proLabore: "",
      taxRate: "",
      cardFeeRate: "",
    },
    fieldErrors: {},
    status: "editing",
    submitError: null,
  };
}

function adjacentStep(
  step: ProductWizardStep,
  offset: -1 | 1,
): ProductWizardStep {
  const currentIndex = productWizardSteps.indexOf(step);
  const nextIndex = Math.min(
    productWizardSteps.length - 1,
    Math.max(0, currentIndex + offset),
  );

  return productWizardSteps[nextIndex];
}

function productWizardReducer(
  state: ProductWizardState,
  action: ProductWizardAction,
): ProductWizardState {
  switch (action.type) {
    case "setAnalysisMode":
      return {
        ...state,
        analysisMode: action.value,
        analysisModeError: null,
      };
    case "setAnalysisModeError":
      return { ...state, analysisModeError: action.error };
    case "setField": {
      if (action.field === "proLaboreIncluded") return state;

      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors[action.field];

      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        fieldErrors,
      };
    }
    case "setProLaboreIncluded": {
      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors.proLabore;

      return {
        ...state,
        values: {
          ...state.values,
          proLaboreIncluded: action.value,
          proLabore: action.value ? state.values.proLabore : "",
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
    case "reset":
      return createInitialProductWizardState(action.submissionId);
  }
}

export {
  createInitialProductWizardState,
  productWizardReducer,
  productWizardSteps,
  type ProductAnalysisMode,
  type ProductWizardAction,
  type ProductWizardState,
  type ProductWizardStep,
};
