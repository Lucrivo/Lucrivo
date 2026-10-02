import { requireUser } from "@/modules/auth/services/require-user";
import {
  parseClientDashboardFilters,
  type DashboardSearchParams,
} from "@/modules/client-dashboard/client-dashboard.filters";
import { ClientDashboard } from "@/modules/client-dashboard/components/client-dashboard";
import { getClientDashboard } from "@/modules/client-dashboard/get-client-dashboard.service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const filters = parseClientDashboardFilters(await searchParams);
  const { userId, supabase } = await requireUser();
  const result = await getClientDashboard({ supabase, userId, filters });

  return (
    <ClientDashboard
      dashboard={result.dashboard}
      focus={result.focus}
      filters={filters}
    />
  );
}
