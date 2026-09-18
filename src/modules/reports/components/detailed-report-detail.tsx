import Link from "next/link";
import { ArrowLeftIcon, CalendarDaysIcon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatReportDate } from "../formatters";
import type { CurrentDetailedReportSnapshot } from "../types";
import { DetailedBusinessSummary } from "./detailed-business-summary";
import { DetailedGuidanceList } from "./detailed-guidance-list";
import { DetailedItemBreakdown } from "./detailed-item-breakdown";
import { DetailedItemCard } from "./detailed-item-card";

function DetailedReportDetail({
  id,
  createdAt,
  snapshot,
}: {
  id: number;
  createdAt: string;
  snapshot: CurrentDetailedReportSnapshot;
}) {
  const category = snapshot.category === "product" ? "Produtos" : "Produções";
  const resultsById = new Map(
    snapshot.results.items.map((item) => [item.itemId, item]),
  );

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
              <Badge variant="info">{category}</Badge>
              <Badge variant="outline">Diagnóstico detalhado</Badge>
            </div>
            <div className="grid gap-2">
              <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                Relatório financeiro #{id}
              </p>
              <h1>Resultado detalhado do seu mix</h1>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarDaysIcon aria-hidden="true" className="size-4" />
                Gerado em {formatReportDate(createdAt)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <DetailedBusinessSummary snapshot={snapshot} />
      <DetailedItemBreakdown snapshot={snapshot} />

      <section aria-labelledby="item-details-title" className="grid gap-4">
        <div className="grid gap-1 px-1">
          <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
            Item por item
          </p>
          <h2 id="item-details-title" className="text-2xl">
            Custos, margens e preços de referência
          </h2>
        </div>
        {snapshot.inputs.items.map((item) => {
          const result = resultsById.get(item.id);
          return result ? (
            <DetailedItemCard key={item.id} item={item} result={result} />
          ) : null;
        })}
      </section>

      <DetailedGuidanceList guidance={snapshot.guidance} />
    </main>
  );
}

export { DetailedReportDetail };
