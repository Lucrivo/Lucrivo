"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";

import { validateServiceDiagnosisFields } from "../schemas/service-diagnosis.schema";
import type {
  CreateServiceDiagnosisActionResult,
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
} from "../types";
import { DiagnosisSuccess } from "./diagnosis-success";
import { CurrentPriceStep } from "./steps/current-price-step";
import { FeesStep } from "./steps/fees-step";
import { FixedExpensesStep } from "./steps/fixed-expenses-step";
import { MonthlyGoalStep } from "./steps/monthly-goal-step";
import { PricingMethodStep } from "./steps/pricing-method-step";
import { ReviewStep } from "./steps/review-step";
import { WorkRoutineStep } from "./steps/work-routine-step";
import {
  createInitialWizardState,
  wizardReducer,
  wizardSteps,
  type WizardStep,
} from "./wizard-state";

type CreateServiceDiagnosisAction = (
  input: ServiceDiagnosisInput,
) => Promise<CreateServiceDiagnosisActionResult>;

type QuickDiagnosisWizardProps = {
  createDiagnosis: CreateServiceDiagnosisAction;
  createSubmissionId?: () => string;
};

const stepTitles: Record<WizardStep, string> = {
  pricingMethod: "Como você cobra hoje?",
  monthlyGoal: "Qual é sua meta mensal?",
  fixedExpenses: "Quais são suas despesas fixas?",
  workRoutine: "Como é sua rotina de trabalho?",
  currentPrice: "Qual é seu preço atual?",
  fees: "Quais taxas incidem nas vendas?",
  review: "Revise suas respostas",
};

const stepFields = {
  pricingMethod: ["pricingMethod"],
  monthlyGoal: ["desiredMonthlyIncome"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  workRoutine: ["monthlyWorkHours", "weeklyWorkDays"],
  currentPrice: [
    "hourlyRate",
    "minuteRate",
    "appointmentRate",
    "appointmentDurationMinutes",
  ],
  fees: ["taxRate", "cardFeeRate"],
} as const satisfies Record<
  Exclude<WizardStep, "review">,
  readonly ServiceDiagnosisField[]
>;

const fieldStep: Record<ServiceDiagnosisField, WizardStep> = {
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
        wizardSteps.indexOf(fieldStep[left]) -
        wizardSteps.indexOf(fieldStep[right]);

      return (
        stepDifference || fieldOrder.indexOf(left) - fieldOrder.indexOf(right)
      );
    })[0];
}

function QuickDiagnosisWizard({
  createDiagnosis,
  createSubmissionId = () => crypto.randomUUID(),
}: QuickDiagnosisWizardProps) {
  const [initialSubmissionId] = useState(createSubmissionId);

  const [state, dispatch] = useReducer(
    wizardReducer,
    initialSubmissionId,
    createInitialWizardState,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);
  const invalidFieldToFocusRef = useRef<ServiceDiagnosisField | null>(null);
  const stepIndex = wizardSteps.indexOf(state.step);
  const stepNumber = stepIndex + 1;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [state.step]);

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

  async function submitDiagnosis() {
    if (submittingRef.current || state.status === "submitting") return;

    submittingRef.current = true;
    dispatch({ type: "submitting" });

    try {
      const result = await createDiagnosis(state.values);

      if (result.status === "success") {
        dispatch({ type: "success", diagnosisId: result.diagnosisId });
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
      submittingRef.current = false;
    }
  }

  if (state.status === "success" && state.diagnosisId !== null) {
    return (
      <DiagnosisSuccess
        diagnosisId={state.diagnosisId}
        onStartAnother={() =>
          dispatch({ type: "reset", submissionId: createSubmissionId() })
        }
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-6 sm:py-10">
      <div className="mb-5 px-1 sm:mb-7">
        <p className="text-primary mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
          Diagnóstico financeiro
        </p>
        <Progress
          value={stepNumber}
          max={wizardSteps.length}
          aria-label="Progresso do diagnóstico"
          className="gap-y-2"
        >
          <ProgressLabel>Seu ponto de partida</ProgressLabel>
          <span className="text-muted-foreground ml-auto text-sm tabular-nums">
            {stepNumber} de 7
          </span>
        </Progress>
      </div>

      <Card className="border-border/70 shadow-md shadow-black/5">
        <CardHeader className="border-b pb-5">
          <p className="text-muted-foreground text-xs font-medium tabular-nums">
            Etapa {stepNumber}
          </p>
          <h2
            id="wizard-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="max-w-2xl text-2xl leading-tight font-semibold tracking-tight outline-none sm:text-3xl"
          >
            {stepTitles[state.step]}
          </h2>
        </CardHeader>

        <CardContent className="min-h-40 py-2">
          <section
            data-testid="wizard-step"
            aria-labelledby="wizard-step-title"
          >
            {renderStep()}
          </section>
        </CardContent>

        <CardFooter className="justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0}
            onClick={() => dispatch({ type: "back" })}
            className="motion-reduce:transition-none"
          >
            <ArrowLeftIcon aria-hidden="true" />
            Voltar
          </Button>
          {state.step !== "review" ? (
            <Button
              type="button"
              onClick={continueToNextStep}
              className="motion-reduce:transition-none"
            >
              Continuar
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export {
  QuickDiagnosisWizard,
  type CreateServiceDiagnosisAction,
  type QuickDiagnosisWizardProps,
};
