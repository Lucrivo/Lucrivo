import Link from "next/link";
import {
  CircleAlertIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
  ListChecksIcon,
} from "lucide-react";

import { MetricCard } from "@/components/shared/metrics/metric-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildClientDashboardHref,
  type ClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard.filters";
import type { ClientDashboardViewModel } from "@/modules/client-dashboard/client-dashboard.types";

const countFormatter = new Intl.NumberFormat("pt-BR");

function detailLink(href: string, label: string) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "link", size: "sm" }),
        "h-11 justify-start px-0",
      )}
    >
      {label}
    </Link>
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
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="grid gap-1">
          <h2 id="dashboard-indicators-title" className="text-2xl">
            Indicadores do recorte
          </h2>
          <p className="text-muted-foreground text-sm">
            Contagens dos relatórios que correspondem aos filtros atuais.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Relatórios no recorte"
          value={countFormatter.format(metrics.totalReports)}
          valueClassName="tabular-nums"
          icon={ClipboardListIcon}
          description="Diagnósticos encontrados pelos filtros"
        />
        <MetricCard
          title="Com resultado positivo"
          value={countFormatter.format(metrics.positiveResultReports)}
          valueClassName="tabular-nums"
          icon={CircleCheckBigIcon}
          description="Relatórios cujo veredito foi resultado positivo"
          details={detailLink(
            buildClientDashboardHref(filters, {
              verdicts: ["positive_result"],
              dataState: "all",
            }),
            "Ver resultados positivos",
          )}
        />
        <MetricCard
          title="Com perda ou prejuízo"
          value={countFormatter.format(metrics.lossReports)}
          valueClassName="tabular-nums"
          icon={CircleAlertIcon}
          description="Perda por venda ou prejuízo no cenário informado"
          details={detailLink(
            buildClientDashboardHref(filters, {
              verdicts: ["direct_loss", "operational_loss"],
              dataState: "all",
            }),
            "Ver perdas e prejuízos",
          )}
        />
        <MetricCard
          title="Com dados pendentes"
          value={countFormatter.format(metrics.pendingDataReports)}
          valueClassName="tabular-nums"
          icon={ListChecksIcon}
          description="Preço, volume ou preenchimento pendente"
          details={detailLink(
            buildClientDashboardHref(filters, {
              verdicts: [],
              dataState: "pending",
            }),
            "Ver dados pendentes",
          )}
        />
      </div>
    </section>
  );
}

export { ClientDashboardMetricGrid };
