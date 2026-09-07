"use client";

import { useEffect, useRef, type Dispatch } from "react";

import {
  type ServiceFlowField,
  type ServiceFlowFieldErrors,
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
  onBackToType: () => void;
};

const stepTitles: Record<ServiceWizardStep, string> = {
  monthlyGoal: "Quanto você quer ganhar por mês?",
  fixedExpenses: "Quais são seus custos fixos mensais?",
  pricingMethod: "Como você cobra pelo seu trabalho hoje?",
  workRoutine: "Quanto você trabalha?",
  serviceDuration:
    "Quanto tempo você leva para realizar um atendimento/serviço?",
  materialCost: "Você possui algum custo para realizar o serviço?",
  fees: "Impostos e taxas",
  review: "Revise suas respostas",
};

const stepFields = {
  monthlyGoal: ["desiredMonthlyIncome"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  pricingMethod: ["pricingMethod", "currentPrice"],
  workRoutine: ["dailyWorkHours", "weeklyWorkDays"],
  serviceDuration: ["appointmentDurationMinutes"],
  materialCost: ["hasMaterialCost", "materialCost", "materialCostUnit"],
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
        steps.indexOf(fieldStep[left]) - steps.indexOf(fieldStep[right]);
      return (
        stepDifference || fieldOrder.indexOf(left) - fieldOrder.indexOf(right)
      );
    })[0];
}

function ServiceDiagnosisWizard({
  state,
  dispatch,
  onBackToType,
}: ServiceDiagnosisWizardProps) {
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
            onEdit={(step) => dispatch({ type: "edit", step })}
            onBackToType={onBackToType}
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
