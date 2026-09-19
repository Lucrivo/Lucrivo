import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, CalendarDaysIcon, PlusIcon } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { toDetailedReportViewModel } from "../presenters/to-detailed-report-view-model";
import type { CurrentDetailedReportSnapshot } from "../types";
import { DetailedBusinessSummary } from "./detailed-business-summary";
import { DetailedGuidanceList } from "./detailed-guidance-list";
import { DetailedItemBreakdown } from "./detailed-item-breakdown";
import { DetailedItemCard } from "./detailed-item-card";

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
              <Badge variant="outline">Diagnóstico detalhado</Badge>
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

      <DetailedBusinessSummary
        conclusion={viewModel.conclusion}
        priority={viewModel.priority}
        metrics={viewModel.metrics}
      />
      <DetailedItemBreakdown comparison={viewModel.comparison} />

      <section aria-labelledby="item-details-title" className="grid gap-4">
        <div className="grid gap-1 px-1">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            Item por item
          </p>
          <h2 id="item-details-title" className="text-2xl">
            Entenda cada item
          </h2>
          <p className="text-muted-foreground text-sm">
            Abra um item para ver preços de referência e a memória de cálculo.
          </p>
        </div>
        <Accordion multiple defaultValue={[]} className="grid gap-3">
          {viewModel.items.map((item) => (
            <DetailedItemCard key={item.id} item={item} />
          ))}
        </Accordion>
      </section>

      <DetailedGuidanceList guidance={viewModel.secondaryGuidance} />
    </main>
  );
}

export { DetailedReportDetail };
