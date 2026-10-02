import Link from "next/link";
import { LayoutDashboardIcon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ClientDashboardFilters } from "@/modules/client-dashboard/client-dashboard.filters";
import type {
  ClientDashboardViewModel,
  DashboardFocusLoad,
} from "@/modules/client-dashboard/client-dashboard.types";

import { ClientDashboardEmptyState } from "./client-dashboard-empty-state";
import { ClientDashboardMetricGrid } from "./client-dashboard-metric-grid";
import { DashboardDistributions } from "./dashboard-distributions";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardRecentReports } from "./dashboard-recent-reports";
import { DashboardReportFocus } from "./dashboard-report-focus";

function DashboardHeader({ showAction }: { showAction: boolean }) {
  return (
    <header
      data-dashboard-section="header"
      className="border-primary/15 bg-card relative overflow-hidden rounded-3xl border px-5 py-6 shadow-sm sm:px-8 sm:py-8"
    >
      <div
        aria-hidden="true"
        className="from-primary/9 absolute inset-y-0 right-0 w-2/5 bg-linear-to-l to-transparent"
      />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="grid max-w-2xl gap-3">
          <Badge variant="info" className="text-foreground">
            <LayoutDashboardIcon aria-hidden="true" />
            Seus relatórios
          </Badge>
          <div className="grid gap-2">
            <h1>Visão geral dos seus diagnósticos</h1>
            <p className="text-muted-foreground max-w-xl leading-6">
              Entenda as situações e prioridades dos relatórios que você salvou.
            </p>
          </div>
        </div>
        {showAction ? (
          <Link
            href="/quick-diagnosis"
            className={buttonVariants({ size: "lg" })}
          >
            <PlusIcon aria-hidden="true" />
            Novo diagnóstico
          </Link>
        ) : null}
      </div>
    </header>
  );
}

function ClientDashboard({
  dashboard,
  focus,
  filters,
}: {
  dashboard: ClientDashboardViewModel;
  focus: DashboardFocusLoad;
  filters: ClientDashboardFilters;
}) {
  if (!dashboard.hasAnyReports) {
    return (
      <main className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-7 pb-10">
        <DashboardHeader showAction={false} />
        <ClientDashboardEmptyState kind="no_history" />
      </main>
    );
  }

  if (dashboard.metrics.totalReports === 0) {
    return (
      <main className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-7 pb-10">
        <DashboardHeader showAction />
        <div data-dashboard-section="filters">
          <DashboardFilters filters={filters} />
        </div>
        <ClientDashboardEmptyState kind="no_results" />
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-7 pb-10">
      <DashboardHeader showAction />
      <div data-dashboard-section="filters">
        <DashboardFilters filters={filters} />
      </div>
      <div data-dashboard-section="indicators">
        <ClientDashboardMetricGrid dashboard={dashboard} filters={filters} />
      </div>
      <div data-dashboard-section="distributions">
        <DashboardDistributions dashboard={dashboard} />
      </div>
      <div data-dashboard-section="recent-reports">
        <DashboardRecentReports
          reports={dashboard.recentReports}
          focusReportId={dashboard.focusReportId}
          filters={filters}
        />
      </div>
      <div data-dashboard-section="report-focus">
        <DashboardReportFocus focus={focus} />
      </div>
    </main>
  );
}

export { ClientDashboard };
