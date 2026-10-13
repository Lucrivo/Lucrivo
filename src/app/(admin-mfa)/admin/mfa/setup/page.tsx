import { redirect } from "next/navigation";

import { AdminAccessUnavailable } from "@/components/admin/admin-access-unavailable";
import { logout } from "@/modules/auth/actions/logout.action";
import { AdminMfaFrame } from "@/modules/auth/components/admin-mfa-frame";
import { AdminMfaSetup } from "@/modules/auth/components/admin-mfa-setup";
import { getAdminRouteState } from "@/modules/auth/services/map-admin-route-state";

export default async function AdminMfaSetupPage() {
  const state = await getAdminRouteState();

  if (state.status === "challenge") redirect("/admin/mfa/challenge");
  if (state.status === "authorized") redirect("/admin");
  if (state.status === "unavailable") {
    return <AdminAccessUnavailable logoutAction={logout} />;
  }

  return (
    <AdminMfaFrame
      title="Proteja o acesso administrativo"
      subtitle="Configure um aplicativo autenticador antes de acessar a administração."
    >
      <AdminMfaSetup />
    </AdminMfaFrame>
  );
}
