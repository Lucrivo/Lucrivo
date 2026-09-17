import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Sua conta";

  const { data: isAdminUser } = await supabase.rpc("current_user_is_admin");

  return (
    <AppShell
      email={email}
      sidebarVariant="financial"
      isAdminUser={isAdminUser === true}
      contextTitle="Área financeira"
      contextDescription="Acompanhe e organize suas decisões em um só lugar."
    >
      {children}
    </AppShell>
  );
}
