import { redirect } from "next/navigation";

import { logout } from "@/modules/auth/actions/logout.action";
import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { acceptLegalTerms } from "@/modules/legal/accept-legal-terms.action";
import {
  AcceptTermsForm,
  AcceptTermsUnavailable,
} from "@/modules/legal/components/accept-terms-screen";
import { LEGAL_COPY_VERSION } from "@/modules/legal/legal-copy";

export const dynamic = "force-dynamic";

export default async function AcceptTermsPage() {
  let supabase: Awaited<ReturnType<typeof requireUser>>["supabase"];

  try {
    ({ supabase } = await requireUser());
  } catch (error) {
    if (error instanceof AuthRequiredError) redirect("/login");
    if (error instanceof AccountUnavailableError) {
      redirect("/account-unavailable");
    }
    throw error;
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "current_user_is_admin",
  );
  if (!adminError && isAdmin === true) redirect("/admin");

  const { data: accepted, error } = await supabase.rpc(
    "current_user_has_accepted_legal_copy_v1",
    { p_copy_version: LEGAL_COPY_VERSION },
  );

  if (error || typeof accepted !== "boolean") {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-12">
        <AcceptTermsUnavailable logoutAction={logout} />
      </main>
    );
  }

  if (accepted) redirect("/auth/continue");

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <AcceptTermsForm action={acceptLegalTerms} logoutAction={logout} />
    </main>
  );
}
