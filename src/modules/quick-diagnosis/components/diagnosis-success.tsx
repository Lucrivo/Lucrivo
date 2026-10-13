import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckCircle2Icon, RotateCcwIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DiagnosisSuccessProps = {
  diagnosisId: number;
  onStartAnother: () => void;
};

function DiagnosisSuccess({
  diagnosisId,
  onStartAnother,
}: DiagnosisSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-primary/20 w-full shadow-lg shadow-black/5">
        <CardContent className="grid justify-items-center gap-6 py-8 text-center sm:py-12">
          <div className="bg-primary/10 text-primary grid size-16 place-items-center rounded-full">
            <CheckCircle2Icon aria-hidden="true" className="size-8" />
          </div>
          <div className="grid gap-2">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
            >
              Diagnóstico salvo
            </h2>
            <p className="text-muted-foreground max-w-md">
              Suas respostas foram registradas com segurança.
            </p>
            <span className="sr-only">Identificador {diagnosisId}</span>
          </div>
          <div className="flex w-full flex-col-reverse justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onStartAnother}
              className="motion-reduce:transition-none"
            >
              <RotateCcwIcon aria-hidden="true" />
              Iniciar outro diagnóstico
            </Button>
            <Link
              href="/dashboard"
              className={cn(buttonVariants(), "motion-reduce:transition-none")}
            >
              Ir para o dashboard
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { DiagnosisSuccess, type DiagnosisSuccessProps };
