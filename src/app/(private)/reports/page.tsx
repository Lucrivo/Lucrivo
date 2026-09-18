import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronsLeftIcon,
  FileChartColumnIcon,
  PlusIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/services/require-user";
import { ReportListCard } from "@/modules/reports/components/report-list-card";
import { ReportsEmptyState } from "@/modules/reports/components/reports-empty-state";
import {
  buildReportPageLinks,
  parseReportNavigation,
  type ReportSearchParams,
} from "@/modules/reports/report-pagination";
import { listOwnedReports } from "@/modules/reports/services/list-reports.service";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportSearchParams>;
}) {
  const navigation = parseReportNavigation(await searchParams);
  const { userId, supabase } = await requireUser();
  const result = await listOwnedReports({
    supabase,
    userId,
    cursor: navigation.cursor,
  });

  if (result.status === "read_failed") {
    throw new Error("reports_read_failed");
  }

  const pageLinks = buildReportPageLinks(navigation, result.nextCursor);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-7 pb-10">
      <header className="border-primary/15 bg-card relative overflow-hidden rounded-3xl border px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="bg-primary/8 pointer-events-none absolute -top-32 -right-20 size-80 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="grid max-w-2xl gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="info">
                <FileChartColumnIcon aria-hidden="true" />
                Seus resultados
              </Badge>
              {result.reports.length > 0 ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {result.reports.length} nesta página
                </span>
              ) : null}
            </div>
            <div className="grid gap-2">
              <h1>Seus resultados</h1>
              <p className="text-muted-foreground max-w-xl leading-6">
                Veja os diagnósticos que você salvou e abra qualquer um sem
                preencher tudo de novo.
              </p>
            </div>
          </div>
          <Link
            href="/quick-diagnosis"
            className={cn(buttonVariants(), "shrink-0")}
          >
            <PlusIcon aria-hidden="true" />
            Novo diagnóstico
          </Link>
        </div>
      </header>

      {result.reports.length === 0 ? (
        <ReportsEmptyState />
      ) : (
        <section aria-labelledby="saved-reports-title" className="grid gap-5">
          <div className="flex items-end justify-between gap-4 px-1">
            <div className="grid gap-1">
              <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
                Mais recentes primeiro
              </p>
              <h2 id="saved-reports-title" className="text-2xl">
                Diagnósticos salvos
              </h2>
            </div>
          </div>
          <ul
            aria-label="Diagnósticos salvos"
            className="grid items-stretch gap-4 xl:grid-cols-2"
          >
            {result.reports.map((report) => (
              <li key={report.id} className="min-w-0">
                <ReportListCard report={report} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pageLinks.first || pageLinks.previous || pageLinks.next ? (
        <nav
          aria-label="Paginação dos diagnósticos"
          className="flex flex-wrap justify-center gap-2 pt-2"
        >
          {pageLinks.first ? (
            <Link
              href={pageLinks.first}
              className={buttonVariants({ variant: "ghost" })}
            >
              <ChevronsLeftIcon aria-hidden="true" />
              Primeira página
            </Link>
          ) : null}
          {pageLinks.previous ? (
            <Link
              href={pageLinks.previous}
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeftIcon aria-hidden="true" />
              Anterior
            </Link>
          ) : null}
          {pageLinks.next ? (
            <Link
              href={pageLinks.next}
              className={buttonVariants({ variant: "outline" })}
            >
              Próxima
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
