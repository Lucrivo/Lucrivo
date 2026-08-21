import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { logout } from "@/modules/auth/actions/logout.action";

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
    <SidebarProvider>
      <AppSidebar email={email} logoutAction={logout} />
      <SidebarInset>
        <header className="bg-background/85 sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
          <SidebarTrigger aria-label="Alternar menu lateral" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">
              Área financeira
            </p>
            <p className="text-muted-foreground hidden text-xs sm:block">
              Acompanhe e organize suas decisões em um só lugar.
            </p>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
