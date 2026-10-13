"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function AdminUsersError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-warning/30 bg-warning/5 w-full text-center shadow-md">
        <CardHeader className="items-center gap-3">
          <TriangleAlertIcon
            aria-hidden="true"
            className="text-warning-foreground size-8"
          />
          <h1 className="text-2xl font-semibold">
            Não foi possível carregar os usuários
          </h1>
          <p className="text-muted-foreground">
            Os dados estão temporariamente indisponíveis. Tente novamente.
          </p>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={reset}>
            <RotateCcwIcon aria-hidden="true" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export { AdminUsersError };
