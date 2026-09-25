import { AdminDashboard } from "@/modules/admin/dashboard/components/admin-dashboard";
import {
  parseAdminSubscriptionFilters,
  type AdminDashboardSearchParams,
} from "@/modules/admin/dashboard/admin-dashboard-filters";
import { getAdminDashboard } from "@/modules/admin/dashboard/get-admin-dashboard.service";
import { getRecentSubscriptions } from "@/modules/admin/dashboard/get-recent-subscriptions.service";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<AdminDashboardSearchParams>;
}) {
  const filters = parseAdminSubscriptionFilters(await searchParams);
  const [dashboard, recentSubscriptions] = await Promise.all([
    getAdminDashboard(),
    getRecentSubscriptions(filters),
  ]);

  return (
    <AdminDashboard
      dashboard={{ ...dashboard, recentSubscriptions }}
      subscriptionFilters={filters}
    />
  );
}
