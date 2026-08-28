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

import type {
  CreateServiceDiagnosisActionResult,
  ServiceDiagnosisInput,
} from "../types";
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

function QuickDiagnosisWizard({
  createDiagnosis,
  createSubmissionId = () => crypto.randomUUID(),
}: QuickDiagnosisWizardProps) {
  void createDiagnosis;

  const [initialSubmissionId] = useState(createSubmissionId);

  const [state, dispatch] = useReducer(
    wizardReducer,
    initialSubmissionId,
    createInitialWizardState,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepIndex = wizardSteps.indexOf(state.step);
  const stepNumber = stepIndex + 1;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [state.step]);

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
            <span id="wizard-step-title" className="sr-only">
              {stepTitles[state.step]}
            </span>
          </section>
        </CardContent>

        <CardFooter className="justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0}
            onClick={() => dispatch({ type: "back" })}
          >
            <ArrowLeftIcon aria-hidden="true" />
            Voltar
          </Button>
          <Button
            type="button"
            disabled={stepIndex === wizardSteps.length - 1}
            onClick={() => dispatch({ type: "next" })}
          >
            Continuar
            <ArrowRightIcon aria-hidden="true" />
          </Button>
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
