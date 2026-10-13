"use client";

import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-destructive/25 bg-destructive/5 w-full text-center shadow-md">
        <CardHeader className="gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Não foi possível abrir o relatório
          </h1>
          <p className="text-muted-foreground leading-6">
            Ocorreu uma falha temporária ao carregar os dados. Você pode tentar
            novamente sem perder o diagnóstico salvo.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={reset}>
            <RotateCcwIcon aria-hidden="true" />
            Tentar novamente
          </Button>
          <Link
            href="/reports"
            className={buttonVariants({ variant: "outline" })}
          >
            Ver relatórios
          </Link>
          <Link
            href="/quick-diagnosis"
            className={buttonVariants({ variant: "ghost" })}
          >
            Novo diagnóstico
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
