import { AccountMenu } from "@/components/layout/account-menu";
import {
  AppSidebar,
  type AppSidebarVariant,
} from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { logout } from "@/modules/auth/actions/logout.action";

type AppShellProps = {
  children: React.ReactNode;
  email: string;
  sidebarVariant: AppSidebarVariant;
  contextTitle: string;
  contextDescription: string;
};

function AppShell({
  children,
  email,
  sidebarVariant,
  contextTitle,
  contextDescription,
}: AppShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant={sidebarVariant} />
      <SidebarInset className="min-w-0">
        <header className="bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl md:px-6">
          <SidebarTrigger
            aria-label="Alternar menu lateral"
            className="border-border/70 bg-card size-9 rounded-xl border shadow-xs"
          />
          <div className="bg-border hidden h-5 w-px sm:block" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight">
              {contextTitle}
            </p>
            <p className="text-muted-foreground hidden text-xs sm:block">
              {contextDescription}
            </p>
          </div>
          <AccountMenu email={email} logoutAction={logout} />
        </header>
        <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export { AppShell };
