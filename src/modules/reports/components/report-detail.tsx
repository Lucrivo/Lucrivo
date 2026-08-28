import Link from "next/link";
import { ArrowLeftIcon, CalendarDaysIcon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ReportViewModel } from "../presenters/to-report-view-model";
import { ReportSectionCard } from "./report-section-card";
import { ReportSummary } from "./report-summary";

function ReportDetail({ viewModel }: { viewModel: ReportViewModel }) {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-7 pb-10">
      <header className="border-primary/15 bg-card relative overflow-hidden rounded-3xl border px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="bg-primary/8 pointer-events-none absolute -top-32 -right-20 size-80 rounded-full blur-3xl"
        />
        <div className="relative grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/reports"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "-ml-3",
              )}
            >
              <ArrowLeftIcon aria-hidden="true" />
              Voltar aos relatórios
            </Link>
            <Link
              href="/quick-diagnosis"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <PlusIcon aria-hidden="true" />
              Novo diagnóstico
            </Link>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{viewModel.identity.categoryLabel}</Badge>
              <Badge variant="outline">
                {viewModel.identity.scenarioLabel}
              </Badge>
            </div>
            <div className="grid gap-2">
              <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                Seu relatório financeiro
              </p>
              <h1>{viewModel.identity.title}</h1>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarDaysIcon aria-hidden="true" className="size-4" />
                Gerado em {viewModel.identity.createdAtLabel}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
        <ReportSummary viewModel={viewModel} />
        <section aria-label="Análise detalhada" className="grid gap-4">
          <div className="mb-1 grid gap-1 px-1">
            <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
              Como chegamos aqui
            </p>
            <h2 className="text-2xl">Entenda seus números</h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
              Leia na ordem: primeiro proteja o custo, depois avalie margem e
              volume.
            </p>
          </div>
          {viewModel.sections.map((section) => (
            <ReportSectionCard key={section.key} section={section} />
          ))}
        </section>
      </div>
    </main>
  );
}

export { ReportDetail };
