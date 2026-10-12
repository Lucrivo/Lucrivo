"use client";

import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminOnboardingError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4">
      <div className="bg-card w-full rounded-2xl border p-8 text-center shadow-sm">
        <AlertTriangleIcon
          aria-hidden="true"
          className="text-destructive mx-auto size-8"
        />
        <h1 className="mt-4 text-2xl font-semibold">
          Não foi possível carregar o onboarding
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md leading-6">
          Os dados administrativos estão temporariamente indisponíveis. Tente
          novamente.
        </p>
        <Button type="button" onClick={reset} className="mt-6">
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
