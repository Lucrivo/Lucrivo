"use client";

import { useEffect, useRef } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";

type WizardShellProps = {
  stepNumber: number;
  totalSteps: number;
  title: string;
  backDisabled?: boolean;
  onBack: () => void;
  onContinue?: () => void;
  children: React.ReactNode;
};

function WizardShell({
  stepNumber,
  totalSteps,
  title,
  backDisabled = false,
  onBack,
  onContinue,
  children,
}: WizardShellProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-6 sm:py-10">
      <div className="mb-5 px-1 sm:mb-7">
        <p className="text-primary mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
          Diagnóstico financeiro
        </p>
        <Progress
          value={stepNumber}
          max={totalSteps}
          aria-label="Progresso do diagnóstico"
          className="gap-y-2"
        >
          <ProgressLabel>Seu ponto de partida</ProgressLabel>
          <span className="text-muted-foreground ml-auto text-sm tabular-nums">
            {stepNumber} de {totalSteps}
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
            {title}
          </h2>
        </CardHeader>

        <CardContent className="min-h-40 py-2">
          <section
            data-testid="wizard-step"
            aria-labelledby="wizard-step-title"
          >
            {children}
          </section>
        </CardContent>

        <CardFooter className="justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={backDisabled}
            onClick={onBack}
            className="motion-reduce:transition-none"
          >
            <ArrowLeftIcon aria-hidden="true" />
            Voltar
          </Button>
          {onContinue ? (
            <Button
              type="button"
              onClick={onContinue}
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

export { WizardShell, type WizardShellProps };
