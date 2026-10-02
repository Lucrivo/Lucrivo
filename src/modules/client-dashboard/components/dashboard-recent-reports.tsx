import Link from "next/link";
import { ArrowUpRightIcon, FocusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  buildExplicitClientDashboardHref,
  type ClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard.filters";
import type {
  ClientDashboardViewModel,
  DashboardRecentReportViewModel,
  DashboardTone,
} from "@/modules/client-dashboard/client-dashboard.types";

const badgeVariant = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  neutral: "outline",
} as const satisfies Record<
  DashboardTone,
  React.ComponentProps<typeof Badge>["variant"]
>;

function typeLabel(report: DashboardRecentReportViewModel) {
  return [
    report.categoryLabel,
    report.scenarioLabel,
    report.modeLabel,
    report.itemCountLabel,
  ]
    .filter(Boolean)
    .join(" · ");
}

function focusHref(
  filters: ClientDashboardFilters,
  report: DashboardRecentReportViewModel,
) {
  return buildExplicitClientDashboardHref(filters, { reportId: report.id });
}

function VerdictBadge({ report }: { report: DashboardRecentReportViewModel }) {
  return (
    <Badge
      variant={badgeVariant[report.verdict.tone]}
      className="text-foreground"
    >
      {report.verdict.label}
    </Badge>
  );
}

function FocusBadge() {
  return (
    <Badge variant="default">
      <FocusIcon aria-hidden="true" />
      Selecionado
    </Badge>
  );
}

function DashboardRecentReports({
  reports,
  focusReportId,
  filters,
}: {
  reports: ClientDashboardViewModel["recentReports"];
  focusReportId: number | null;
  filters: ClientDashboardFilters;
}) {
  const visibleReports = reports.slice(0, 5);

  return (
    <section aria-labelledby="dashboard-recent-title" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="grid gap-1">
          <h2 id="dashboard-recent-title" className="text-2xl">
            Relatórios recentes
          </h2>
          <p className="text-muted-foreground text-sm">
            Os cinco relatórios mais recentes da seleção atual.
          </p>
        </div>
        <Link
          href="/reports"
          className={cn(buttonVariants({ variant: "outline" }), "h-11")}
        >
          Ver todos os relatórios
        </Link>
      </div>

      <div className="bg-card hidden overflow-hidden rounded-2xl border lg:block">
        <Table aria-label="Relatórios recentes">
          <TableCaption className="sr-only">
            Os cinco relatórios mais recentes da seleção atual.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Relatório</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Abrir relatório</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleReports.map((report) => {
              const selected = report.id === focusReportId;
              return (
                <TableRow
                  key={report.id}
                  data-state={selected ? "selected" : undefined}
                >
                  <TableCell className="max-w-80 py-4 whitespace-normal">
                    <div className="grid min-w-0 gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={focusHref(filters, report)}
                          aria-label={`Ver detalhes nesta página: ${report.title}`}
                          className="hover:text-primary focus-visible:ring-ring min-w-0 rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {report.title}
                        </Link>
                        {selected ? <FocusBadge /> : null}
                      </div>
                      <span className="text-muted-foreground text-sm leading-5">
                        {typeLabel(report)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 whitespace-normal">
                    <div className="grid justify-items-start gap-1.5">
                      <VerdictBadge report={report} />
                      <span className="text-muted-foreground text-sm">
                        {report.dataStateLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 whitespace-normal">
                    {report.priorityLabel}
                  </TableCell>
                  <TableCell className="py-4 whitespace-normal">
                    <div className="grid gap-1">
                      <span className="font-medium tabular-nums">
                        {report.monthlyResultLabel ?? "Indisponível"}
                      </span>
                      {report.realMarginLabel ? (
                        <span className="text-muted-foreground text-sm tabular-nums">
                          Margem {report.realMarginLabel}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 tabular-nums">
                    {report.createdAtLabel}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <Link
                      href={report.openHref}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-11",
                      })}
                      aria-label={`Abrir relatório: ${report.title}`}
                    >
                      Abrir
                      <ArrowUpRightIcon aria-hidden="true" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul
        aria-label="Relatórios recentes em telas menores"
        className="bg-card divide-border grid divide-y overflow-hidden rounded-2xl border lg:hidden"
      >
        {visibleReports.map((report) => {
          const selected = report.id === focusReportId;
          return (
            <li
              key={report.id}
              className={cn(
                "grid min-w-0 gap-4 p-4",
                selected && "bg-primary/5",
              )}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Link
                    href={focusHref(filters, report)}
                    aria-label={`Ver detalhes nesta página: ${report.title}`}
                    className="hover:text-primary focus-visible:ring-ring w-fit max-w-full rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {report.title}
                  </Link>
                  <span className="text-muted-foreground text-sm leading-5">
                    {typeLabel(report)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selected ? <FocusBadge /> : null}
                  <VerdictBadge report={report} />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="grid gap-1">
                  <dt className="text-muted-foreground">Prioridade</dt>
                  <dd>{report.priorityLabel}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="tabular-nums">{report.createdAtLabel}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-muted-foreground">Resultado</dt>
                  <dd className="font-medium tabular-nums">
                    {report.monthlyResultLabel ?? "Indisponível"}
                  </dd>
                </div>
                {report.realMarginLabel ? (
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground">Margem</dt>
                    <dd className="font-medium tabular-nums">
                      {report.realMarginLabel}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  {report.dataStateLabel}
                </span>
                <Link
                  href={report.openHref}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "h-11",
                  })}
                  aria-label={`Abrir relatório: ${report.title}`}
                >
                  Abrir relatório
                  <ArrowUpRightIcon aria-hidden="true" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { DashboardRecentReports };
