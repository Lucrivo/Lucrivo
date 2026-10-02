import Link from "next/link";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
  ListChecksIcon,
  type LucideIcon,
} from "lucide-react";

import {
  buildClientDashboardHref,
  type ClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard.filters";
import type { ClientDashboardViewModel } from "@/modules/client-dashboard/client-dashboard.types";

const countFormatter = new Intl.NumberFormat("pt-BR");

type MetricSummaryItemProps = {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  href?: string;
  actionLabel?: string;
};

function MetricSummaryItem({
  title,
  value,
  description,
  icon: Icon,
  href,
  actionLabel,
}: MetricSummaryItemProps) {
  const content = (
    <div className="flex h-full min-h-36 min-w-0 gap-4 p-4 sm:p-5">
      <span className="bg-primary/10 text-primary mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <strong className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {countFormatter.format(value)}
          </strong>
          <span className="text-sm leading-5 font-medium">{title}</span>
        </div>
        <p className="text-muted-foreground text-sm leading-5">{description}</p>
        <span className="mt-auto flex min-h-5 items-center gap-1.5 text-sm font-medium">
          {actionLabel ?? "Total do filtro atual"}
          {actionLabel ? (
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          ) : null}
        </span>
      </div>
    </div>
  );

  return (
    <li className="bg-card min-w-0">
      {href && actionLabel ? (
        <Link
          href={href}
          aria-label={actionLabel}
          className="hover:bg-primary/5 focus-visible:ring-ring block h-full transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}

function ClientDashboardMetricGrid({
  dashboard,
  filters,
}: {
  dashboard: ClientDashboardViewModel;
  filters: ClientDashboardFilters;
}) {
  const metrics = dashboard.metrics;

  return (
    <section
      aria-labelledby="dashboard-indicators-title"
      className="grid gap-4"
    >
      <div className="grid gap-1 px-1">
        <h2 id="dashboard-indicators-title" className="text-2xl">
          Indicadores do recorte
        </h2>
        <p className="text-muted-foreground text-sm">
          Contagens dos relatórios que correspondem aos filtros atuais.
        </p>
      </div>
      <ul
        aria-label="Resumo dos relatórios"
        className="bg-border grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricSummaryItem
          title="Relatórios no recorte"
          value={metrics.totalReports}
          icon={ClipboardListIcon}
          description="Diagnósticos encontrados pelos filtros"
        />
        <MetricSummaryItem
          title="Com resultado positivo"
          value={metrics.positiveResultReports}
          icon={CircleCheckBigIcon}
          description="Relatórios com resultado positivo"
          href={buildClientDashboardHref(filters, {
            verdicts: ["positive_result"],
            dataState: "all",
          })}
          actionLabel="Filtrar por resultado positivo"
        />
        <MetricSummaryItem
          title="Com perda ou prejuízo"
          value={metrics.lossReports}
          icon={CircleAlertIcon}
          description="Perda por venda ou prejuízo no cenário informado"
          href={buildClientDashboardHref(filters, {
            verdicts: ["direct_loss", "operational_loss"],
            dataState: "all",
          })}
          actionLabel="Filtrar por perdas e prejuízos"
        />
        <MetricSummaryItem
          title="Com dados pendentes"
          value={metrics.pendingDataReports}
          icon={ListChecksIcon}
          description="Preço, volume ou preenchimento pendente"
          href={buildClientDashboardHref(filters, {
            verdicts: [],
            dataState: "pending",
          })}
          actionLabel="Filtrar por dados pendentes"
        />
      </ul>
    </section>
  );
}

export { ClientDashboardMetricGrid };
