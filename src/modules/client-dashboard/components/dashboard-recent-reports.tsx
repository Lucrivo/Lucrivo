"use client";

import Link from "next/link";
import { ArrowUpRightIcon, FocusIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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

import {
  DashboardFocusLink,
  scrollToDashboardFocus,
} from "./dashboard-focus-navigation";

const badgeVariant = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  neutral: "outline",
} as const satisfies Record<
  DashboardTone,
  ComponentProps<typeof Badge>["variant"]
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
      className="h-auto max-w-full whitespace-normal"
    >
      {report.verdict.label}
    </Badge>
  );
}

function ReportTitleLink({
  report,
  href,
  selected,
}: {
  report: DashboardRecentReportViewModel;
  href: string;
  selected: boolean;
}) {
  return (
    <DashboardFocusLink
      href={href}
      selected={selected}
      aria-label={`Ver detalhes nesta página: ${report.title}`}
      className="text-primary focus-visible:ring-ring decoration-primary/35 hover:decoration-primary min-w-0 rounded-sm font-semibold wrap-break-word underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
    >
      {report.title}
    </DashboardFocusLink>
  );
}

function ReportSelectControl({
  report,
  href,
  selected,
}: {
  report: DashboardRecentReportViewModel;
  href: string;
  selected: boolean;
}) {
  if (selected) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-11"
        aria-current="true"
        aria-label={`Relatório selecionado: ${report.title}. Ver detalhes abaixo`}
        onClick={scrollToDashboardFocus}
      >
        <FocusIcon aria-hidden="true" />
        Selecionado
      </Button>
    );
  }

  return (
    <DashboardFocusLink
      href={href}
      aria-label={`Selecionar relatório: ${report.title}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11")}
    >
      <FocusIcon aria-hidden="true" />
      Selecionar
    </DashboardFocusLink>
  );
}

function ReportOpenLink({
  report,
  compact = false,
}: {
  report: DashboardRecentReportViewModel;
  compact?: boolean;
}) {
  return (
    <Link
      href={report.openHref}
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "h-11",
      })}
      aria-label={`Abrir relatório: ${report.title}`}
    >
      {compact ? "Abrir" : "Abrir relatório"}
      <ArrowUpRightIcon aria-hidden="true" />
    </Link>
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
    <section
      aria-labelledby="dashboard-recent-title"
      className="grid min-w-0 gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="grid min-w-0 gap-1">
          <h2 id="dashboard-recent-title" className="text-2xl">
            Relatórios recentes
          </h2>
          <p className="text-muted-foreground text-sm">
            Os cinco relatórios mais recentes da seleção atual. Selecione um
            para ver os indicadores abaixo.
          </p>
        </div>
        <Link
          href="/reports"
          className={cn(buttonVariants({ variant: "outline" }), "h-11")}
        >
          Ver todos os relatórios
        </Link>
      </div>

      <div className="bg-card hidden min-w-0 overflow-hidden rounded-2xl border lg:block">
        <Table aria-label="Relatórios recentes">
          <TableCaption className="sr-only">
            Os cinco relatórios mais recentes da seleção atual.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-0">Relatório</TableHead>
              <TableHead className="min-w-0">Situação</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleReports.map((report) => {
              const selected = report.id === focusReportId;
              const href = focusHref(filters, report);
              return (
                <TableRow
                  key={report.id}
                  data-state={selected ? "selected" : undefined}
                >
                  <TableCell className="max-w-72 min-w-0 overflow-hidden py-4 whitespace-normal">
                    <div className="grid min-w-0 gap-1.5">
                      <ReportTitleLink
                        report={report}
                        href={href}
                        selected={selected}
                      />
                      <span className="text-muted-foreground text-sm leading-5">
                        {typeLabel(report)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0 overflow-hidden py-4 whitespace-normal">
                    <div className="grid min-w-0 justify-items-start gap-1.5">
                      <VerdictBadge report={report} />
                      <span className="text-muted-foreground text-sm">
                        {report.dataStateLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0 overflow-hidden py-4 whitespace-normal">
                    {report.priorityLabel}
                  </TableCell>
                  <TableCell className="min-w-0 overflow-hidden py-4 whitespace-normal">
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
                  <TableCell className="min-w-0 py-4">
                    <div className="flex flex-col items-stretch justify-end gap-2 xl:flex-row xl:flex-wrap xl:items-center">
                      <ReportSelectControl
                        report={report}
                        href={href}
                        selected={selected}
                      />
                      <ReportOpenLink report={report} compact />
                    </div>
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
          const href = focusHref(filters, report);
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
                  <ReportTitleLink
                    report={report}
                    href={href}
                    selected={selected}
                  />
                  <span className="text-muted-foreground text-sm leading-5">
                    {typeLabel(report)}
                  </span>
                </div>
                <VerdictBadge report={report} />
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
                <span className="text-muted-foreground min-w-0 text-sm">
                  {report.dataStateLabel}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <ReportSelectControl
                    report={report}
                    href={href}
                    selected={selected}
                  />
                  <ReportOpenLink report={report} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { DashboardRecentReports };
