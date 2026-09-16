import { redirect } from "next/navigation";

import { AdminAccessUnavailable } from "@/components/admin/admin-access-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { logout } from "@/modules/auth/actions/logout.action";
import {
  AdminMfaRequiredError,
  requireAdmin,
} from "@/modules/auth/services/require-admin";
import { getAdminRouteState } from "@/modules/auth/services/map-admin-route-state";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getAdminRouteState();

  if (state.status === "setup") redirect("/admin/mfa/setup");
  if (state.status === "challenge") redirect("/admin/mfa/challenge");
  if (state.status === "unavailable") {
    return <AdminAccessUnavailable logoutAction={logout} />;
  }

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminMfaRequiredError) {
      redirect("/admin/mfa/challenge");
    }
    throw error;
  }

  return (
    <AppShell
      email={state.identity.email}
      sidebarVariant="admin"
      contextTitle="Administração"
      contextDescription="Acompanhe o funcionamento do Lucrivo."
    >
      {children}
    </AppShell>
  );
}
