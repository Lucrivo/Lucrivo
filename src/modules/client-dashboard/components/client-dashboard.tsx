import Link from "next/link";
import { PlusIcon } from "lucide-react";

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
import { DashboardFocusScroll } from "./dashboard-focus-navigation";
import { DashboardRecentReports } from "./dashboard-recent-reports";
import { DashboardReportFocus } from "./dashboard-report-focus";

function DashboardHeader({ showAction }: { showAction: boolean }) {
  return (
    <header
      data-dashboard-section="header"
      className="flex flex-col justify-between gap-5 px-1 py-2 sm:flex-row sm:items-end sm:py-4"
    >
      <div className="grid max-w-2xl gap-2">
        <h1 className="text-balance">Olá, empreendedor</h1>
        <p className="text-muted-foreground max-w-2xl text-base leading-7">
          Aqui você acompanha seus relatórios e identifica o que precisa de
          atenção primeiro.
        </p>
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
    </header>
  );
}

function ClientDashboard({
  dashboard,
  focus,
  filters,
  persistFilters = false,
}: {
  dashboard: ClientDashboardViewModel;
  focus: DashboardFocusLoad;
  filters: ClientDashboardFilters;
  persistFilters?: boolean;
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
          <DashboardFilters
            filters={filters}
            resultCount={dashboard.metrics.totalReports}
            persistFilters={persistFilters}
          />
        </div>
        <ClientDashboardEmptyState kind="no_results" />
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-7 pb-10">
      <DashboardHeader showAction />
      <div data-dashboard-section="filters">
        <DashboardFilters
          filters={filters}
          resultCount={dashboard.metrics.totalReports}
          persistFilters={persistFilters}
        />
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
      <div data-dashboard-section="report-focus" className="scroll-mt-24">
        <DashboardFocusScroll focusReportId={dashboard.focusReportId} />
        <DashboardReportFocus focus={focus} />
      </div>
    </main>
  );
}

export { ClientDashboard };
