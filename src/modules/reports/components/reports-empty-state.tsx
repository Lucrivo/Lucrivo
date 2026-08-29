import Link from "next/link";
import { FileChartColumnIcon, PlusIcon, SparklesIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ReportsEmptyState() {
  return (
    <Card className="border-primary/15 bg-card relative overflow-hidden border-dashed py-0 shadow-sm">
      <div
        aria-hidden="true"
        className="bg-primary/8 absolute -top-24 -right-16 size-64 rounded-full blur-3xl"
      />
      <CardContent className="relative grid min-h-96 place-items-center px-6 py-12 text-center">
        <div className="grid max-w-lg justify-items-center gap-6">
          <div className="relative">
            <span className="bg-primary/10 text-primary ring-primary/15 grid size-20 place-items-center rounded-3xl ring-1">
              <FileChartColumnIcon aria-hidden="true" className="size-9" />
            </span>
            <span className="bg-card text-warning absolute -right-2 -bottom-2 grid size-8 place-items-center rounded-full border shadow-sm">
              <SparklesIcon aria-hidden="true" className="size-4" />
            </span>
          </div>
          <div className="grid gap-2">
            <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
              Biblioteca de decisões
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Seu histórico começa aqui
            </h2>
            <p className="text-muted-foreground leading-7">
              Faça um diagnóstico para registrar seus números, entender a margem
              e voltar ao relatório sempre que precisar.
            </p>
          </div>
          <Link
            href="/quick-diagnosis"
            className={buttonVariants({ size: "lg" })}
          >
            <PlusIcon aria-hidden="true" />
            Criar primeiro diagnóstico
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export { ReportsEmptyState };
