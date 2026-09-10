import Link from "next/link";
import { ArrowRightIcon, FileCheckIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function DiagnosisLimitCard() {
  return (
    <Card className="border-primary/20 bg-card overflow-hidden py-0 shadow-md">
      <CardContent className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid min-w-0 gap-4">
          <span className="bg-primary/10 text-primary ring-primary/15 grid size-12 place-items-center rounded-2xl ring-1">
            <FileCheckIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="grid max-w-2xl gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Seu diagnóstico gratuito já foi usado
            </h2>
            <p className="text-muted-foreground leading-7">
              Seu primeiro relatório continua disponível. Para criar novos
              diagnósticos e consultar todo o histórico, escolha um plano.
            </p>
          </div>
        </div>

        <Link href="/billing" className={buttonVariants({ size: "lg" })}>
          Conhecer os planos
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

export { DiagnosisLimitCard };
