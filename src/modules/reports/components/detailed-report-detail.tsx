import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, CalendarDaysIcon, PlusIcon } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { toDetailedReportViewModel } from "../presenters/to-detailed-report-view-model";
import type { CurrentDetailedReportSnapshot } from "../types";
import { DetailedGuidanceList } from "./detailed-guidance-list";
import { DetailedItemBreakdown } from "./detailed-item-breakdown";
import { DetailedItemCard } from "./detailed-item-card";
import { ReportExecutiveSummary } from "./report-executive-summary";
import { ReportNumbers } from "./report-numbers";
import { ReportSectionCard } from "./report-section-card";

function DetailedReportDetail({
  id,
  createdAt,
  snapshot,
  management,
}: {
  id: number;
  createdAt: string;
  snapshot: CurrentDetailedReportSnapshot;
  management?: ReactNode;
}) {
  const viewModel = toDetailedReportViewModel({ id, createdAt, snapshot });

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
                {viewModel.identity.reportLabel}
              </p>
              <h1>{viewModel.identity.title}</h1>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarDaysIcon aria-hidden="true" className="size-4" />
                {viewModel.identity.createdAtLabel}
              </p>
            </div>
          </div>
        </div>
      </header>

      {management}

      <ReportExecutiveSummary
        summary={viewModel.executiveSummary}
        priorityEyebrow="Comece por aqui"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
        <ReportNumbers
          numbers={viewModel.numbers}
          title="Seus números"
          description="Valores calculados com todos os itens e gastos que você informou."
        />
        <section
          aria-labelledby="detailed-analysis-title"
          className="grid gap-4"
        >
          <div className="mb-1 grid gap-2 px-1">
            <h2 id="detailed-analysis-title" className="text-2xl">
              Como chegamos a esse resultado
            </h2>
            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
              Veja os preços mínimos por item, o que sai das vendas, o resultado
              do mês e o faturamento necessário.
            </p>
          </div>
          {viewModel.sections.map((section) => (
            <ReportSectionCard key={section.key} section={section} />
          ))}
        </section>
      </div>

      <section aria-labelledby="item-details-title" className="grid gap-4">
        <div className="grid gap-2 px-1">
          <h2 id="item-details-title" className="text-2xl">
            Item por item
          </h2>
          <p className="text-muted-foreground max-w-3xl text-sm leading-6">
            Veja como cada item participa do resultado. Os gastos mensais
            permanecem no resultado geral e não entram no simulador individual.
          </p>
        </div>
        <Accordion
          multiple
          defaultValue={viewModel.items[0] ? [viewModel.items[0].id] : []}
          className="grid gap-4"
        >
          {viewModel.items.map((item) => (
            <DetailedItemCard key={item.id} item={item} />
          ))}
        </Accordion>
      </section>

      <DetailedItemBreakdown comparison={viewModel.comparison} />
      <DetailedGuidanceList guidance={viewModel.secondaryGuidance} />
    </main>
  );
}

export { DetailedReportDetail };
