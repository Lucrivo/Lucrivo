import { AdminDashboard } from "@/modules/admin/dashboard/components/admin-dashboard";
import { getAdminDashboard } from "@/modules/admin/dashboard/get-admin-dashboard.service";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();

  return <AdminDashboard dashboard={dashboard} />;
}
