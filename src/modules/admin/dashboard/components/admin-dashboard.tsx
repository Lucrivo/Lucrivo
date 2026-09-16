import type { AdminDashboardViewModel } from "../admin-dashboard.types";
import { AdminAnalytics } from "./admin-analytics";
import { AdminMetricGrid } from "./admin-metric-grid";
import { RecentSubscriptions } from "./recent-subscriptions";

function AdminDashboard({ dashboard }: { dashboard: AdminDashboardViewModel }) {
  return (
    <main className="mx-auto grid w-full max-w-[100rem] grid-cols-[minmax(0,1fr)] gap-6 lg:gap-8">
      <header className="border-primary/10 relative overflow-hidden rounded-3xl border bg-[linear-gradient(135deg,var(--card)_0%,color-mix(in_oklab,var(--primary)_7%,var(--card))_100%)] px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div
          aria-hidden="true"
          className="bg-primary/8 absolute -top-20 -right-16 size-56 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Operação
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Visão geral
            </h1>
            <p className="text-muted-foreground max-w-2xl leading-6">
              Acompanhe aquisição, uso e saúde financeira do Lucrivo.
            </p>
          </div>
          <p className="text-muted-foreground shrink-0 text-sm tabular-nums">
            Atualizado em {dashboard.generatedAtLabel}
          </p>
        </div>
      </header>

      <AdminMetricGrid metrics={dashboard.metrics} />
      <AdminAnalytics dashboard={dashboard} />
      <RecentSubscriptions subscriptions={dashboard.recentSubscriptions} />
    </main>
  );
}

export { AdminDashboard };
