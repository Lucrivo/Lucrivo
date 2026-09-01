"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { useRouter } from "next/navigation";

import { validateServiceDiagnosisFields } from "../../schemas/service-diagnosis.schema";
import type {
  CreateServiceDiagnosisActionResult,
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
} from "../../types";
import { WizardShell } from "../shared/wizard-shell";
import {
  serviceWizardSteps,
  type ServiceWizardAction,
  type ServiceWizardState,
  type ServiceWizardStep,
} from "./service-wizard-state";
import { CurrentPriceStep } from "./steps/current-price-step";
import { FeesStep } from "./steps/fees-step";
import { FixedExpensesStep } from "./steps/fixed-expenses-step";
import { MonthlyGoalStep } from "./steps/monthly-goal-step";
import { PricingMethodStep } from "./steps/pricing-method-step";
import { ReviewStep } from "./steps/review-step";
import { WorkRoutineStep } from "./steps/work-routine-step";

type CreateServiceDiagnosisAction = (
  input: ServiceDiagnosisInput,
) => Promise<CreateServiceDiagnosisActionResult>;

type ServiceDiagnosisWizardProps = {
  state: ServiceWizardState;
  dispatch: Dispatch<ServiceWizardAction>;
  createDiagnosis: CreateServiceDiagnosisAction;
  createSubmissionId: () => string;
  onBackToType: () => void;
};

const stepTitles: Record<ServiceWizardStep, string> = {
  monthlyGoal: "Quanto você quer tirar por mês pra você?",
  fixedExpenses: "Quais são suas despesas fixas?",
  workRoutine: "Como é sua rotina de trabalho?",
  pricingMethod: "Como você vende seu tempo?",
  currentPrice: "Qual é seu preço atual?",
  fees: "Quais taxas incidem nas vendas?",
  review: "Revise suas respostas",
};

const stepFields = {
  monthlyGoal: ["desiredMonthlyIncome"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  workRoutine: ["monthlyWorkHours", "weeklyWorkDays"],
  pricingMethod: ["pricingMethod"],
  currentPrice: [
    "hourlyRate",
    "minuteRate",
    "appointmentRate",
    "appointmentDurationMinutes",
  ],
  fees: ["taxRate", "cardFeeRate"],
} as const satisfies Record<
  Exclude<ServiceWizardStep, "review">,
  readonly ServiceDiagnosisField[]
>;

const fieldStep: Record<ServiceDiagnosisField, ServiceWizardStep> = {
  submissionId: "pricingMethod",
  pricingMethod: "pricingMethod",
  desiredMonthlyIncome: "monthlyGoal",
  fixedMonthlyExpenses: "fixedExpenses",
  monthlyWorkHours: "workRoutine",
  weeklyWorkDays: "workRoutine",
  hourlyRate: "currentPrice",
  minuteRate: "currentPrice",
  appointmentRate: "currentPrice",
  appointmentDurationMinutes: "currentPrice",
  taxRate: "fees",
  cardFeeRate: "fees",
};

const fieldOrder = Object.keys(fieldStep) as ServiceDiagnosisField[];

function firstInvalidField(
  fieldErrors: ServiceDiagnosisFieldErrors,
): ServiceDiagnosisField | undefined {
  return fieldOrder
    .filter((field) => fieldErrors[field]?.length)
    .sort((left, right) => {
      const stepDifference =
        serviceWizardSteps.indexOf(fieldStep[left]) -
        serviceWizardSteps.indexOf(fieldStep[right]);

      return (
        stepDifference || fieldOrder.indexOf(left) - fieldOrder.indexOf(right)
      );
    })[0];
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
  const invalidFieldToFocusRef = useRef<ServiceDiagnosisField | null>(null);
  const stepIndex = serviceWizardSteps.indexOf(state.step);
  const globalStepNumber = stepIndex + 2;

  useEffect(() => {
    const field = invalidFieldToFocusRef.current;
    if (!field) return;

    const target =
      field === "pricingMethod"
        ? document.querySelector<HTMLElement>("[role='radio']")
        : document.getElementById(field);

    target?.focus({ preventScroll: true });
    invalidFieldToFocusRef.current = null;
  }, [state.fieldErrors, state.step]);

  const stepProps = {
    values: state.values,
    errors: state.fieldErrors,
    onChange: (field: ServiceDiagnosisField, value: string) =>
      dispatch({ type: "setField", field, value }),
  };

  function renderStep() {
    switch (state.step) {
      case "pricingMethod":
        return (
          <PricingMethodStep
            values={state.values}
            errors={state.fieldErrors}
            onPricingMethodChange={(value) =>
              dispatch({ type: "setPricingMethod", value })
            }
          />
        );
      case "monthlyGoal":
        return <MonthlyGoalStep {...stepProps} />;
      case "fixedExpenses":
        return <FixedExpensesStep {...stepProps} />;
      case "workRoutine":
        return <WorkRoutineStep {...stepProps} />;
      case "currentPrice":
        return <CurrentPriceStep {...stepProps} />;
      case "fees":
        return <FeesStep {...stepProps} />;
      case "review":
        return (
          <ReviewStep
            values={state.values}
            errors={state.fieldErrors}
            pending={state.status === "submitting"}
            submitError={state.submitError}
            onEdit={(step) => dispatch({ type: "edit", step })}
            onBackToType={onBackToType}
            onSubmit={submitDiagnosis}
          />
        );
    }
  }

  function continueToNextStep() {
    if (state.step === "review") return;

    const fieldErrors = validateServiceDiagnosisFields(
      stepFields[state.step],
      state.values,
    );
    dispatch({ type: "setFieldErrors", fieldErrors });

    if (Object.keys(fieldErrors).length === 0) {
      dispatch({ type: "next" });
    }
  }

  function goBack() {
    if (stepIndex === 0) {
      onBackToType();
      return;
    }

    dispatch({ type: "back" });
  }

  async function submitDiagnosis() {
    if (submittingRef.current || state.status === "submitting") return;

    submittingRef.current = true;
    dispatch({ type: "submitting" });
    let keepSubmissionLocked = false;

    try {
      const result = await createDiagnosis(state.values);

      if (result.status === "success") {
        router.replace(`/reports/${result.diagnosisId}`);
        keepSubmissionLocked = true;
        return;
      }

      if (result.error === "invalid_input") {
        const fieldErrors = { ...result.fieldErrors };

        if (fieldErrors.submissionId?.length) {
          dispatch({
            type: "setField",
            field: "submissionId",
            value: createSubmissionId(),
          });
          delete fieldErrors.submissionId;
        }

        const invalidField = firstInvalidField(fieldErrors);
        invalidFieldToFocusRef.current = invalidField ?? null;
        dispatch({ type: "setFieldErrors", fieldErrors });
        dispatch({
          type: "edit",
          step: invalidField ? fieldStep[invalidField] : "pricingMethod",
        });
        return;
      }

      dispatch({ type: "submitError", error: result.error });
    } catch {
      dispatch({ type: "submitError", error: "create_failed" });
    } finally {
      if (!keepSubmissionLocked) submittingRef.current = false;
    }
  }

  return (
    <WizardShell
      stepNumber={globalStepNumber}
      totalSteps={8}
      title={stepTitles[state.step]}
      onBack={goBack}
      onContinue={state.step === "review" ? undefined : continueToNextStep}
    >
      {renderStep()}
    </WizardShell>
  );
}

export {
  ServiceDiagnosisWizard,
  type CreateServiceDiagnosisAction,
  type ServiceDiagnosisWizardProps,
};
