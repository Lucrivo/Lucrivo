"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, LogOutIcon, TrendingUpIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  email: string;
  logoutAction: () => Promise<void>;
};

function accountInitial(email: string) {
  return email.trim().charAt(0).toLocaleUpperCase("pt-BR") || "L";
}

function AppSidebar({ email, logoutAction }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Lucrivo"
              render={<Link href="/dashboard" aria-label="Lucrivo" />}
              className="hover:bg-transparent active:bg-transparent"
            >
              <span className="bg-brand-gradient text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
                <TrendingUpIcon aria-hidden="true" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  Lucrivo
                </span>
                <span className="text-sidebar-foreground/60 truncate text-xs">
                  Finanças inteligentes
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>Visão geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Dashboard"
                  isActive={pathname === "/dashboard"}
                  render={<Link href="/dashboard" />}
                >
                  <LayoutDashboardIcon aria-hidden="true" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar size="sm" className="size-7">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {accountInitial(email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sidebar-foreground/60 text-[0.6875rem] font-medium tracking-wide uppercase">
              Conta
            </p>
            <p className="truncate text-xs font-medium" title={email}>
              {email}
            </p>
          </div>
        </div>

        <form action={logoutAction}>
          <SidebarMenuButton
            type="submit"
            tooltip="Sair"
            className="text-sidebar-foreground/70 hover:text-destructive"
          >
            <LogOutIcon aria-hidden="true" />
            <span>Sair</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export { AppSidebar };
