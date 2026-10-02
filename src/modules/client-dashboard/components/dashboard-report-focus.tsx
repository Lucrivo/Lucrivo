import Link from "next/link";
import { ArrowUpRightIcon, FileWarningIcon } from "lucide-react";

import { MetricCard } from "@/components/shared/metrics/metric-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DashboardFocusLoad,
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

function DashboardReportFocus({ focus }: { focus: DashboardFocusLoad }) {
  if (focus.status === "none") return null;

  if (focus.status === "unavailable") {
    return (
      <section aria-labelledby="dashboard-focus-unavailable-title">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="bg-muted grid size-11 shrink-0 place-items-center rounded-xl">
              <FileWarningIcon
                aria-hidden="true"
                className="text-muted-foreground size-5"
              />
            </div>
            <div className="grid flex-1 gap-1">
              <h2
                id="dashboard-focus-unavailable-title"
                className="text-lg font-semibold"
              >
                Detalhes do relatório indisponíveis
              </h2>
              <p className="text-muted-foreground text-sm">
                O resumo continua disponível acima. Abra o relatório para tentar
                carregar os valores novamente.
              </p>
            </div>
            <Link
              href={`/reports/${focus.reportId}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Abrir relatório
              <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  const report = focus.report;
  return (
    <section aria-labelledby="dashboard-focus-title" className="grid gap-4">
      <div className="border-primary/20 bg-card relative overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-7">
        <div
          aria-hidden="true"
          className="from-primary/10 absolute inset-x-0 top-0 h-1 bg-linear-to-r to-transparent"
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="grid gap-3">
            <p className="text-primary text-xs font-semibold tracking-[0.12em] uppercase">
              Relatório selecionado
            </p>
            <div className="grid gap-1">
              <h2 id="dashboard-focus-title" className="text-2xl sm:text-3xl">
                {report.title}
              </h2>
              <p className="text-muted-foreground text-sm">
                {report.categoryLabel} · {report.scenarioLabel} ·{" "}
                {report.modeLabel} · criado em {report.createdAtLabel}
                {report.updatedAtLabel
                  ? ` · atualizado em ${report.updatedAtLabel}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={badgeVariant[report.verdict.tone]}>
                {report.verdict.label}
              </Badge>
              <Badge variant="outline">{report.priorityLabel}</Badge>
            </div>
          </div>
          <Link
            href={report.openHref}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Abrir relatório completo
            <ArrowUpRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            title={metric.label}
            value={metric.value}
            valueClassName="tabular-nums"
            description={metric.supportingText}
            className={cn(metric.value === "Indisponível" && "bg-muted/25")}
          />
        ))}
      </div>

      {report.complementaryFacts.length ? (
        <Card size="sm">
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {report.complementaryFacts.map((fact) => (
                <div key={fact.key} className="grid content-start gap-1">
                  <dt className="text-muted-foreground text-xs">
                    {fact.label}
                  </dt>
                  <dd className="font-semibold tabular-nums">{fact.value}</dd>
                  {fact.supportingText ? (
                    <p className="text-muted-foreground text-xs leading-5">
                      {fact.supportingText}
                    </p>
                  ) : null}
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

export { DashboardReportFocus };
