import { requireUser } from "@/modules/auth/services/require-user";
import { ClientDashboardFilters } from "../client-dashboard.filters";
import { getClientDashboard } from "../get-client-dashboard.service";
import { ClientDashboard } from "./client-dashboard";

export async function ClientDashboardRouteContent({
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
