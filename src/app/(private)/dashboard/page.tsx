import { Suspense } from "react";
import { cookies } from "next/headers";

import {
  CLIENT_DASHBOARD_FILTER_COOKIE,
  hasExplicitClientDashboardFilters,
  resolveClientDashboardFilters,
} from "@/modules/client-dashboard/client-dashboard-filter-cookie";
import { type DashboardSearchParams } from "@/modules/client-dashboard/client-dashboard.filters";
import { ClientDashboardLoading } from "@/modules/client-dashboard/components/client-dashboard-loading";
import { ClientDashboardRouteContent } from "@/modules/client-dashboard/components/client-dashboard-route-content";

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
