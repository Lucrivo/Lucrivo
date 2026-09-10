import Link from "next/link";
import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function LockedReportCard() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-primary/20 bg-card w-full overflow-hidden py-0 shadow-md">
        <CardContent className="grid justify-items-center gap-6 px-6 py-10 text-center sm:px-10">
          <span className="bg-primary/10 text-primary ring-primary/15 grid size-14 place-items-center rounded-2xl ring-1">
            <LockKeyholeIcon aria-hidden="true" className="size-6" />
          </span>
          <div className="grid max-w-lg gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Relatório bloqueado
            </h1>
            <p className="text-muted-foreground leading-7">
              Este relatório pertence à sua conta, mas o período de acesso
              terminou. Reative um plano para consultar novamente o conteúdo.
            </p>
          </div>
          <div className="flex w-full flex-col-reverse justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/reports"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Voltar aos relatórios
            </Link>
            <Link href="/billing" className={buttonVariants({ size: "lg" })}>
              Reativar acesso
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export { LockedReportCard };
