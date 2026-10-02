import Link from "next/link";
import { ArrowUpRightIcon, CalendarDaysIcon, FocusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  buildClientDashboardHref,
  type ClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard.filters";
import type {
  ClientDashboardViewModel,
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

function DashboardRecentReports({
  reports,
  focusReportId,
  filters,
}: {
  reports: ClientDashboardViewModel["recentReports"];
  focusReportId: number | null;
  filters: ClientDashboardFilters;
}) {
  return (
    <section aria-labelledby="dashboard-recent-title" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="grid gap-1">
          <h2 id="dashboard-recent-title" className="text-2xl">
            Relatórios recentes
          </h2>
          <p className="text-muted-foreground text-sm">
            Até seis diagnósticos recentes deste recorte.
          </p>
        </div>
        <Link
          href="/reports"
          className={cn(buttonVariants({ variant: "outline" }), "h-11")}
        >
          Ver biblioteca completa
        </Link>
      </div>

      <ol
        aria-label="Relatórios recentes"
        className="grid gap-3 xl:grid-cols-2"
      >
        {reports.slice(0, 6).map((report) => {
          const selected = report.id === focusReportId;
          return (
            <li key={report.id} className="min-w-0">
              <Card
                role="article"
                aria-label={`${report.title} — ${report.scenarioLabel}`}
                size="sm"
                className={cn(
                  "h-full gap-4 p-4",
                  selected && "border-primary/45 ring-primary/10 ring-2",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info" className="text-foreground">
                        {report.categoryLabel}
                      </Badge>
                      <Badge variant="outline">{report.scenarioLabel}</Badge>
                      <Badge variant="outline">{report.modeLabel}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {selected ? (
                      <Badge variant="default">
                        <FocusIcon aria-hidden="true" />
                        Em foco
                      </Badge>
                    ) : null}
                    <Badge
                      variant={badgeVariant[report.verdict.tone]}
                      className="text-foreground"
                    >
                      {report.verdict.label}
                    </Badge>
                  </div>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5">
                    <CalendarDaysIcon aria-hidden="true" className="size-3.5" />
                    {report.createdAtLabel}
                  </span>
                  <span>{report.priorityLabel}</span>
                  <span>{report.dataStateLabel}</span>
                  {report.itemCountLabel ? (
                    <span>{report.itemCountLabel}</span>
                  ) : null}
                </div>

                {report.monthlyResultLabel || report.realMarginLabel ? (
                  <dl
                    className={cn(
                      "bg-muted/45 grid gap-px overflow-hidden rounded-lg border",
                      report.monthlyResultLabel && report.realMarginLabel
                        ? "grid-cols-2"
                        : "grid-cols-1",
                    )}
                  >
                    {report.monthlyResultLabel ? (
                      <div className="bg-card grid gap-1 p-3">
                        <dt className="text-muted-foreground text-xs">
                          Resultado mensal
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {report.monthlyResultLabel}
                        </dd>
                      </div>
                    ) : null}
                    {report.realMarginLabel ? (
                      <div className="bg-card grid gap-1 p-3">
                        <dt className="text-muted-foreground text-xs">
                          Margem real
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {report.realMarginLabel}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                <div className="mt-auto flex flex-wrap justify-end gap-2">
                  <Link
                    href={buildClientDashboardHref(filters, {
                      reportId: report.id,
                    })}
                    className={buttonVariants({
                      variant: selected ? "secondary" : "outline",
                      size: "sm",
                      className: "h-11",
                    })}
                    aria-label={`Ver neste dashboard: ${report.title}`}
                  >
                    <FocusIcon aria-hidden="true" />
                    Ver neste dashboard
                  </Link>
                  <Link
                    href={report.openHref}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                      className: "h-11",
                    })}
                    aria-label={`Abrir relatório: ${report.title}`}
                  >
                    Abrir relatório
                    <ArrowUpRightIcon aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export { DashboardRecentReports };
