import { Suspense } from "react";
import { cookies } from "next/headers";

import { requireUser } from "@/modules/auth/services/require-user";
import {
  CLIENT_DASHBOARD_FILTER_COOKIE,
  hasExplicitClientDashboardFilters,
  resolveClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard-filter-cookie";
import {
  type ClientDashboardFilters,
  type DashboardSearchParams,
} from "@/modules/client-dashboard/client-dashboard.filters";
import { ClientDashboard } from "@/modules/client-dashboard/components/client-dashboard";
import { ClientDashboardLoading } from "@/modules/client-dashboard/components/client-dashboard-loading";
import { getClientDashboard } from "@/modules/client-dashboard/get-client-dashboard.service";

async function ClientDashboardRouteContent({
  filters,
  persistFilters = false,
}: {
  filters: ClientDashboardFilters;
  persistFilters?: boolean;
}) {
  const { userId, supabase } = await requireUser();
  const result = await getClientDashboard({ supabase, userId, filters });

  return (
    <ClientDashboard
      dashboard={result.dashboard}
      focus={result.focus}
      filters={filters}
      persistFilters={persistFilters}
    />
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const filters = resolveClientDashboardFilters(
    params,
    cookieStore.get(CLIENT_DASHBOARD_FILTER_COOKIE)?.value,
  );
  const persistFilters = hasExplicitClientDashboardFilters(params);

  return (
    <Suspense fallback={<ClientDashboardLoading />}>
      <ClientDashboardRouteContent
        filters={filters}
        persistFilters={persistFilters}
      />
    </Suspense>
  );
}

export { ClientDashboardRouteContent };
