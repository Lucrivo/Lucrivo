"use client";

import Link from "next/link";
import { FileWarningIcon, PlusIcon, RotateCcwIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-destructive/25 bg-destructive/5 w-full text-center shadow-md">
        <CardHeader className="items-center gap-3">
          <span className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-2xl">
            <FileWarningIcon aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Não foi possível carregar seus relatórios
            </h1>
            <p className="text-muted-foreground leading-6">
              Ocorreu uma falha temporária. Seus diagnósticos continuam salvos e
              você pode tentar novamente.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={reset}>
            <RotateCcwIcon aria-hidden="true" />
            Tentar novamente
          </Button>
          <Link
            href="/quick-diagnosis"
            className={buttonVariants({ variant: "outline" })}
          >
            <PlusIcon aria-hidden="true" />
            Novo diagnóstico
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
