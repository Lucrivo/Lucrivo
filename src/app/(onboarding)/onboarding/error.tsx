"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <section
      className="my-auto w-full py-10"
      aria-labelledby="onboarding-error-title"
    >
      <div className="bg-card mx-auto w-full max-w-2xl rounded-2xl border p-6 text-center shadow-sm sm:p-8">
        <span className="bg-destructive/10 text-destructive mx-auto grid size-12 place-items-center rounded-2xl">
          <TriangleAlertIcon aria-hidden="true" />
        </span>
        <h1
          id="onboarding-error-title"
          className="mt-5 text-2xl font-semibold tracking-tight text-balance"
        >
          Não foi possível carregar esta etapa
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-lg leading-6">
          Houve uma falha temporária ao preparar seu perfil. Seus dados
          continuam seguros e você pode tentar novamente.
        </p>
        <Button type="button" size="lg" onClick={reset} className="mt-6">
          <RotateCcwIcon aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    </section>
  );
}
