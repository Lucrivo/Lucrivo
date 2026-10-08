import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  PlusIcon,
} from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { toDetailedReportViewModel } from "../presenters/to-detailed-report-view-model";
import {
  DETAILED_REPORT_CONTENT_VERSION,
  type CurrentDetailedReportSnapshot,
} from "../types";
import { DetailedGuidanceList } from "./detailed-guidance-list";
import { DetailedItemBreakdown } from "./detailed-item-breakdown";
import { DetailedItemCard } from "./detailed-item-card";
import { ReportExecutiveSummary } from "./report-executive-summary";
import { ReportIndicators } from "./report-indicators";
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
  const legacySections =
    snapshot.contentVersion === DETAILED_REPORT_CONTENT_VERSION
      ? []
      : viewModel.sections;
  const legacyDetails =
    legacySections.length > 0 ? (
      <section
        aria-labelledby="legacy-calculation-title"
        className="grid gap-4"
      >
        <div className="grid gap-2 px-1">
          <h2 id="legacy-calculation-title" className="text-2xl">
            Detalhes preservados deste relatório
          </h2>
          <p className="text-muted-foreground max-w-3xl text-sm leading-6">
            Estes textos foram gravados com as regras vigentes quando o
            relatório foi criado.
          </p>
        </div>
        {legacySections.map((section) => (
          <ReportSectionCard key={section.key} section={section} />
        ))}
      </section>
    ) : null;

  const itemDetailsLink =
    viewModel.items.length > 1 ? (
      <a
        href="#item-details"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Ver mais detalhes item por item
        <ArrowDownIcon aria-hidden="true" />
      </a>
    ) : null;

  return (
    <main
      data-smooth-report-scroll
      className="mx-auto grid w-full max-w-7xl min-w-0 gap-7 pb-10"
    >
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
              <h1 className="wrap-break-word">{viewModel.identity.title}</h1>
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

      <section aria-labelledby="detailed-analysis-title" className="grid gap-4">
        <div className="mb-1 grid gap-2 px-1">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            Entenda o resultado
          </p>
          <h2 id="detailed-analysis-title" className="text-2xl">
            Como chegamos a esse resultado
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            Os indicadores abaixo reagem ao que você informou: quanto precisa
            vender, qual é o faturamento de equilíbrio e quanto sobra.
          </p>
        </div>
        <ReportIndicators
          indicators={viewModel.indicators}
          actions={itemDetailsLink ? { sales: itemDetailsLink } : undefined}
        />
      </section>

      {legacyDetails}

      {viewModel.minimumPriceSection ? (
        <ReportSectionCard section={viewModel.minimumPriceSection} />
      ) : null}

      <section
        id="item-details"
        aria-labelledby="item-details-title"
        className="grid scroll-mt-6 gap-4 sm:scroll-mt-8"
      >
        <div className="grid gap-2 px-1">
          <h2 id="item-details-title" className="text-2xl">
            Item por item
          </h2>
          <p className="text-muted-foreground max-w-3xl text-sm leading-6">
            Veja o resultado por venda, o custo completo e o valor que cada
            venda deixa antes dos gastos do mês. O simulador usa esses valores
            quando a quantidade foi informada.
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
