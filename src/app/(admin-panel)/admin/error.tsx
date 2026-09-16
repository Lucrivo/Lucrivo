"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminDashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-warning/30 bg-warning/5 w-full text-center shadow-md">
        <CardHeader className="items-center gap-3">
          <span className="bg-warning/15 text-warning-foreground dark:text-warning grid size-12 place-items-center rounded-2xl">
            <TriangleAlertIcon aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Não foi possível carregar o painel
            </h1>
            <p className="text-muted-foreground leading-6">
              Os dados operacionais estão temporariamente indisponíveis. Você
              pode tentar novamente.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={reset}>
            <RotateCcwIcon aria-hidden="true" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
