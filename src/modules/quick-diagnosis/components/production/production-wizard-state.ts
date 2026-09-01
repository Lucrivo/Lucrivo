import { scaledInteger } from "../../schemas/decimal-input";
import type {
  ProductionDiagnosisField,
  ProductionDiagnosisFieldErrors,
  ProductionDiagnosisInput,
} from "../../types";

const productionWizardSteps = [
  "analysisMode",
  "productionValues",
  "fixedExpenses",
  "monthlyVolume",
  "ownerCompensation",
  "fees",
  "review",
] as const;

const productionCostComponentFields = [
  "materialUnitCost",
  "packagingUnitCost",
  "directLaborUnitCost",
  "otherVariableUnitCost",
] as const;

type ProductionWizardStep = (typeof productionWizardSteps)[number];
type ProductionAnalysisMode = "quick" | "detailed";

type ProductionWizardState = {
  step: ProductionWizardStep;
  analysisMode: ProductionAnalysisMode | "";
  analysisModeError: string | null;
  values: ProductionDiagnosisInput;
  fieldErrors: ProductionDiagnosisFieldErrors;
  status: "editing" | "submitting";
  submitError: "unauthorized" | "create_failed" | null;
};

type ProductionWizardAction =
  | { type: "setAnalysisMode"; value: ProductionAnalysisMode }
  | { type: "setAnalysisModeError"; error: string | null }
  | { type: "setField"; field: ProductionDiagnosisField; value: string }
  | { type: "setCostCompositionEnabled"; value: boolean }
  | { type: "setProLaboreIncluded"; value: boolean }
  | { type: "setFieldErrors"; fieldErrors: ProductionDiagnosisFieldErrors }
  | { type: "next" }
  | { type: "back" }
  | { type: "edit"; step: ProductionWizardStep }
  | { type: "submitting" }
  | { type: "submitError"; error: "unauthorized" | "create_failed" }
  | { type: "reset"; submissionId: string };

function createInitialProductionWizardState(
  submissionId: string,
): ProductionWizardState {
  return {
    step: "analysisMode",
    analysisMode: "",
    analysisModeError: null,
    values: {
      submissionId,
      costCompositionEnabled: false,
      productionUnitCost: "",
      materialUnitCost: "",
      packagingUnitCost: "",
      directLaborUnitCost: "",
      otherVariableUnitCost: "",
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

function formatCentsPtBr(cents: bigint): string {
  const integerPart = (cents / BigInt(100))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimalPart = (cents % BigInt(100)).toString().padStart(2, "0");

  return `${integerPart},${decimalPart}`;
}

function deriveProductionUnitCostDisplay(
  values: ProductionDiagnosisInput,
): string | null {
  try {
    const total = productionCostComponentFields.reduce(
      (sum, field) => sum + BigInt(scaledInteger(values[field], 2)),
      BigInt(0),
    );

    if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null;

    return formatCentsPtBr(total);
  } catch {
    return null;
  }
}

function adjacentStep(
  step: ProductionWizardStep,
  offset: -1 | 1,
): ProductionWizardStep {
  const currentIndex = productionWizardSteps.indexOf(step);
  const nextIndex = Math.min(
    productionWizardSteps.length - 1,
    Math.max(0, currentIndex + offset),
  );

  return productionWizardSteps[nextIndex];
}

function productionWizardReducer(
  state: ProductionWizardState,
  action: ProductionWizardAction,
): ProductionWizardState {
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
      if (
        action.field === "costCompositionEnabled" ||
        action.field === "proLaboreIncluded"
      ) {
        return state;
      }

      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors[action.field];

      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        fieldErrors,
      };
    }
    case "setCostCompositionEnabled": {
      const fieldErrors = { ...state.fieldErrors };
      delete fieldErrors.costCompositionEnabled;
      const isDisablingComposition =
        state.values.costCompositionEnabled && !action.value;
      const derivedCost = isDisablingComposition
        ? deriveProductionUnitCostDisplay(state.values)
        : null;

      return {
        ...state,
        values: {
          ...state.values,
          costCompositionEnabled: action.value,
          productionUnitCost: derivedCost ?? state.values.productionUnitCost,
        },
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
      return createInitialProductionWizardState(action.submissionId);
  }
}

export {
  createInitialProductionWizardState,
  deriveProductionUnitCostDisplay,
  productionWizardReducer,
  productionWizardSteps,
  type ProductionAnalysisMode,
  type ProductionWizardAction,
  type ProductionWizardState,
  type ProductionWizardStep,
};
