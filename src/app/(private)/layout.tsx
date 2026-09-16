import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Sua conta";

  return (
    <AppShell
      email={email}
      sidebarVariant="financial"
      contextTitle="Área financeira"
      contextDescription="Acompanhe e organize suas decisões em um só lugar."
    >
      {children}
    </AppShell>
  );
}
