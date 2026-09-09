"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { useRouter } from "next/navigation";

import type { CreateServiceDiagnosisAction } from "../../actions/create-service-diagnosis.action";
import {
  type ServiceFlowField,
  type ServiceFlowFieldErrors,
  type ServiceFlowSubmissionFieldErrors,
} from "../../domain/service-flow";
import { validateServiceFlowFields } from "../../schemas/service-flow.schema";
import { WizardShell } from "../shared/wizard-shell";
import {
  getServiceWizardSteps,
  type ServiceWizardAction,
  type ServiceWizardState,
  type ServiceWizardStep,
} from "./service-wizard-state";
import { FeesStep } from "./steps/fees-step";
import { FixedExpensesStep } from "./steps/fixed-expenses-step";
import { MaterialCostStep } from "./steps/material-cost-step";
import { MonthlyGoalStep } from "./steps/monthly-goal-step";
import { PricingAndPriceStep } from "./steps/pricing-and-price-step";
import { ReviewStep } from "./steps/review-step";
import { ServiceDurationStep } from "./steps/service-duration-step";
import { WorkRoutineStep } from "./steps/work-routine-step";

type ServiceDiagnosisWizardProps = {
  state: ServiceWizardState;
  dispatch: Dispatch<ServiceWizardAction>;
  createDiagnosis: CreateServiceDiagnosisAction;
  createSubmissionId: () => string;
  onBackToType: () => void;
};

const stepTitles: Record<ServiceWizardStep, string> = {
  monthlyGoal: "Quanto você quer receber por mês?",
  fixedExpenses: "Quais gastos você tem todo mês?",
  pricingMethod: "Como você cobra pelo seu trabalho?",
  workRoutine: "Quanto tempo você trabalha?",
  serviceDuration: "Quanto tempo dura um serviço?",
  materialCost: "Você gasta materiais para fazer o serviço?",
  fees: "O que é descontado do valor recebido?",
  review: "Confira as informações do serviço",
};

const stepFields = {
  monthlyGoal: ["desiredMonthlyIncome"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  pricingMethod: ["pricingMethod", "currentPrice"],
  workRoutine: ["dailyWorkHours", "weeklyWorkDays"],
  serviceDuration: ["appointmentDurationMinutes"],
  materialCost: [
    "hasMaterialCost",
    "materialCost",
    "materialCostUnit",
    "appointmentDurationMinutes",
  ],
  fees: ["paysRevenueTax", "taxRate", "hasPaymentFee", "paymentFeeRate"],
} as const satisfies Record<
  Exclude<ServiceWizardStep, "review">,
  readonly ServiceFlowField[]
>;

const fieldStep: Record<ServiceFlowField, ServiceWizardStep> = {
  desiredMonthlyIncome: "monthlyGoal",
  fixedMonthlyExpenses: "fixedExpenses",
  pricingMethod: "pricingMethod",
  currentPrice: "pricingMethod",
  dailyWorkHours: "workRoutine",
  weeklyWorkDays: "workRoutine",
  appointmentDurationMinutes: "serviceDuration",
  hasMaterialCost: "materialCost",
  materialCost: "materialCost",
  materialCostUnit: "materialCost",
  paysRevenueTax: "fees",
  taxRate: "fees",
  hasPaymentFee: "fees",
  paymentFeeRate: "fees",
};

const fieldOrder = Object.keys(fieldStep) as ServiceFlowField[];

function firstInvalidField(
  fieldErrors: ServiceFlowFieldErrors,
  steps: readonly ServiceWizardStep[],
): ServiceFlowField | undefined {
  return fieldOrder
    .filter((field) => fieldErrors[field]?.length)
    .sort((left, right) => {
      const stepDifference =
        steps.indexOf(stepForField(left, steps)) -
        steps.indexOf(stepForField(right, steps));
      return (
        stepDifference || fieldOrder.indexOf(left) - fieldOrder.indexOf(right)
      );
    })[0];
}

function stepForField(
  field: ServiceFlowField,
  steps: readonly ServiceWizardStep[],
): ServiceWizardStep {
  if (
    field === "appointmentDurationMinutes" &&
    !steps.includes("serviceDuration")
  ) {
    return "materialCost";
  }

  return fieldStep[field];
}

function ServiceDiagnosisWizard({
  state,
  dispatch,
  createDiagnosis,
  createSubmissionId,
  onBackToType,
}: ServiceDiagnosisWizardProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const invalidFieldToFocusRef = useRef<ServiceFlowField | null>(null);
  const steps = getServiceWizardSteps(state.values.pricingMethod);
  const stepIndex = steps.indexOf(state.step);

  useEffect(() => {
    const field = invalidFieldToFocusRef.current;
    if (!field) return;

    const target =
      field === "pricingMethod"
        ? document.querySelector<HTMLElement>(
            "[aria-label='Forma de cobrança'] [role='radio']",
          )
        : field === "hasMaterialCost" ||
            field === "paysRevenueTax" ||
            field === "hasPaymentFee"
          ? document.querySelector<HTMLElement>(
              `[data-field='${field}'] [role='radio']`,
            )
          : document.getElementById(field);
    target?.focus({ preventScroll: true });
    invalidFieldToFocusRef.current = null;
  }, [state.fieldErrors, state.step]);

  const stepProps = {
    values: state.values,
    errors: state.fieldErrors,
    onChange: (field: ServiceFlowField, value: string) =>
      dispatch({ type: "setField", field, value }),
  };

  function renderStep() {
    switch (state.step) {
      case "monthlyGoal":
        return <MonthlyGoalStep {...stepProps} />;
      case "fixedExpenses":
        return <FixedExpensesStep {...stepProps} />;
      case "pricingMethod":
        return (
          <PricingAndPriceStep
            {...stepProps}
            onPricingMethodChange={(value) =>
              dispatch({ type: "setPricingMethod", value })
            }
          />
        );
      case "workRoutine":
        return <WorkRoutineStep {...stepProps} />;
      case "serviceDuration":
        return <ServiceDurationStep {...stepProps} />;
      case "materialCost":
        return (
          <MaterialCostStep
            {...stepProps}
            onHasMaterialCostChange={(value) =>
              dispatch({ type: "setHasMaterialCost", value })
            }
            onMaterialCostUnitChange={(value) =>
              dispatch({ type: "setMaterialCostUnit", value })
            }
          />
        );
      case "fees":
        return (
          <FeesStep
            {...stepProps}
            onPaysRevenueTaxChange={(value) =>
              dispatch({ type: "setPaysRevenueTax", value })
            }
            onHasPaymentFeeChange={(value) =>
              dispatch({ type: "setHasPaymentFee", value })
            }
          />
        );
      case "review":
        return (
          <ReviewStep
            values={state.values}
            pending={state.submissionStatus === "submitting"}
            submitError={state.submissionError}
            onEdit={(step) => dispatch({ type: "edit", step })}
            onBackToType={onBackToType}
            onSubmit={submitDiagnosis}
          />
        );
    }
  }

  function continueToNextStep() {
    if (state.step === "review") return;

    const fieldErrors = validateServiceFlowFields(
      stepFields[state.step],
      state.values,
    );
    dispatch({ type: "setFieldErrors", fieldErrors });

    if (Object.keys(fieldErrors).length === 0) {
      dispatch({ type: "next" });
      return;
    }

    invalidFieldToFocusRef.current =
      firstInvalidField(fieldErrors, steps) ?? null;
  }

  function goBack() {
    if (stepIndex === 0) {
      onBackToType();
      return;
    }
    dispatch({ type: "back" });
  }

  async function submitDiagnosis() {
    if (submittingRef.current || state.submissionStatus === "submitting") {
      return;
    }

    submittingRef.current = true;
    dispatch({ type: "submitting" });
    let keepSubmissionLocked = false;

    try {
      const result = await createDiagnosis({
        ...state.values,
        submissionId: state.submissionId,
      });

      if (result.status === "success") {
        router.replace(`/reports/${result.diagnosisId}`);
        keepSubmissionLocked = true;
        return;
      }

      if (result.error === "invalid_input") {
        const fieldErrors: ServiceFlowSubmissionFieldErrors =
          result.fieldErrors;

        if (fieldErrors.submissionId?.length) {
          invalidFieldToFocusRef.current = null;
          dispatch({
            type: "replaceSubmissionId",
            submissionId: createSubmissionId(),
          });
          return;
        }

        const visibleFieldErrors: ServiceFlowFieldErrors = fieldErrors;
        const invalidField = firstInvalidField(visibleFieldErrors, steps);
        invalidFieldToFocusRef.current = invalidField ?? null;
        dispatch({ type: "setFieldErrors", fieldErrors: visibleFieldErrors });
        dispatch({
          type: "edit",
          step: invalidField
            ? stepForField(invalidField, steps)
            : "monthlyGoal",
        });
        return;
      }

      dispatch({ type: "submissionError", error: result.error });
    } catch {
      dispatch({ type: "submissionError", error: "create_failed" });
    } finally {
      if (!keepSubmissionLocked) submittingRef.current = false;
    }
  }

  return (
    <WizardShell
      stepNumber={stepIndex + 2}
      totalSteps={steps.length + 1}
      title={stepTitles[state.step]}
      onBack={goBack}
      onContinue={state.step === "review" ? undefined : continueToNextStep}
    >
      {renderStep()}
    </WizardShell>
  );
}

export { ServiceDiagnosisWizard, type ServiceDiagnosisWizardProps };
