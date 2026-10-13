import { redirect } from "next/navigation";

import { AdminAccessUnavailable } from "@/components/admin/admin-access-unavailable";
import { logout } from "@/modules/auth/actions/logout.action";
import { AdminMfaChallenge } from "@/modules/auth/components/admin-mfa-challenge";
import { AdminMfaFrame } from "@/modules/auth/components/admin-mfa-frame";
import { getAdminRouteState } from "@/modules/auth/services/map-admin-route-state";

export default async function AdminMfaChallengePage() {
  const state = await getAdminRouteState();

  if (state.status === "setup") redirect("/admin/mfa/setup");
  if (state.status === "authorized") redirect("/admin");
  if (state.status === "unavailable") {
    return <AdminAccessUnavailable logoutAction={logout} />;
  }

  return (
    <AdminMfaFrame
      title="Confirme seu acesso"
      subtitle="Digite o código atual do seu aplicativo autenticador."
    >
      <AdminMfaChallenge factorId={state.factorId} />
    </AdminMfaFrame>
  );
}
