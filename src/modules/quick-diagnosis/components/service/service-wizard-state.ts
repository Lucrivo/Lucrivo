import type {
  ServiceFlowField,
  ServiceFlowFieldErrors,
  ServiceFlowInput,
  ServiceFlowPricingMethod,
  ServiceMaterialCostUnit,
} from "../../domain/service-flow";

const serviceWizardStepsWithoutDuration = [
  "monthlyGoal",
  "fixedExpenses",
  "pricingMethod",
  "workRoutine",
  "materialCost",
  "fees",
  "review",
] as const;

type ServiceWizardStep =
  (typeof serviceWizardStepsWithoutDuration)[number] | "serviceDuration";

type ServiceWizardState = {
  step: ServiceWizardStep;
  values: ServiceFlowInput;
  fieldErrors: ServiceFlowFieldErrors;
};

type ServiceWizardAction =
  | { type: "setField"; field: ServiceFlowField; value: string }
  | { type: "setPricingMethod"; value: ServiceFlowPricingMethod }
  | { type: "setHasMaterialCost"; value: boolean }
  | { type: "setMaterialCostUnit"; value: ServiceMaterialCostUnit }
  | { type: "setPaysRevenueTax"; value: boolean }
  | { type: "setHasPaymentFee"; value: boolean }
  | { type: "setFieldErrors"; fieldErrors: ServiceFlowFieldErrors }
  | { type: "next" }
  | { type: "back" }
  | { type: "edit"; step: ServiceWizardStep }
  | { type: "reset" };

function getServiceWizardSteps(
  pricingMethod: string,
): readonly ServiceWizardStep[] {
  if (pricingMethod !== "appointment") return serviceWizardStepsWithoutDuration;

  return [
    ...serviceWizardStepsWithoutDuration.slice(0, 4),
    "serviceDuration",
    ...serviceWizardStepsWithoutDuration.slice(4),
  ];
}

function createInitialServiceWizardState(): ServiceWizardState {
  return {
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
  };
}

function clearErrors(
  errors: ServiceFlowFieldErrors,
  fields: readonly ServiceFlowField[],
): ServiceFlowFieldErrors {
  const next = { ...errors };
  for (const field of fields) delete next[field];
  return next;
}

function adjacentStep(
  state: ServiceWizardState,
  offset: -1 | 1,
): ServiceWizardStep {
  const steps = getServiceWizardSteps(state.values.pricingMethod);
  const currentIndex = steps.indexOf(state.step);
  const nextIndex = Math.min(
    steps.length - 1,
    Math.max(0, currentIndex + offset),
  );
  return steps[nextIndex];
}

function serviceWizardReducer(
  state: ServiceWizardState,
  action: ServiceWizardAction,
): ServiceWizardState {
  switch (action.type) {
    case "setField":
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        fieldErrors: clearErrors(state.fieldErrors, [action.field]),
      };
    case "setPricingMethod":
      return {
        ...state,
        values: {
          ...state.values,
          pricingMethod: action.value,
          currentPrice: "",
          appointmentDurationMinutes: "",
        },
        fieldErrors: clearErrors(state.fieldErrors, [
          "pricingMethod",
          "currentPrice",
          "appointmentDurationMinutes",
        ]),
      };
    case "setHasMaterialCost":
      return {
        ...state,
        values: {
          ...state.values,
          hasMaterialCost: action.value,
          materialCost: action.value ? state.values.materialCost : "",
          materialCostUnit: action.value ? state.values.materialCostUnit : "",
        },
        fieldErrors: clearErrors(state.fieldErrors, [
          "hasMaterialCost",
          "materialCost",
          "materialCostUnit",
        ]),
      };
    case "setMaterialCostUnit":
      return {
        ...state,
        values: { ...state.values, materialCostUnit: action.value },
        fieldErrors: clearErrors(state.fieldErrors, ["materialCostUnit"]),
      };
    case "setPaysRevenueTax":
      return {
        ...state,
        values: {
          ...state.values,
          paysRevenueTax: action.value,
          taxRate: action.value ? state.values.taxRate : "",
        },
        fieldErrors: clearErrors(state.fieldErrors, [
          "paysRevenueTax",
          "taxRate",
        ]),
      };
    case "setHasPaymentFee":
      return {
        ...state,
        values: {
          ...state.values,
          hasPaymentFee: action.value,
          paymentFeeRate: action.value ? state.values.paymentFeeRate : "",
        },
        fieldErrors: clearErrors(state.fieldErrors, [
          "hasPaymentFee",
          "paymentFeeRate",
        ]),
      };
    case "setFieldErrors":
      return { ...state, fieldErrors: action.fieldErrors };
    case "next":
      return { ...state, step: adjacentStep(state, 1) };
    case "back":
      return { ...state, step: adjacentStep(state, -1) };
    case "edit":
      return { ...state, step: action.step };
    case "reset":
      return createInitialServiceWizardState();
  }
}

export {
  createInitialServiceWizardState,
  getServiceWizardSteps,
  serviceWizardReducer,
  type ServiceWizardAction,
  type ServiceWizardState,
  type ServiceWizardStep,
};
