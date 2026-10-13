import { AdminDashboard } from "@/modules/admin/dashboard/components/admin-dashboard";
import { getAdminDashboard } from "@/modules/admin/dashboard/get-admin-dashboard.service";
import { getRecentSubscriptions } from "@/modules/admin/dashboard/get-recent-subscriptions.service";

export default async function AdminDashboardPage() {
  const [dashboard, recentSubscriptions] = await Promise.all([
    getAdminDashboard(),
    getRecentSubscriptions(),
  ]);

  return <AdminDashboard dashboard={{ ...dashboard, recentSubscriptions }} />;
}
