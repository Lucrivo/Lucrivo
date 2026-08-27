"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, TrendingUpIcon } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
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
} from "@/components/ui/sidebar";

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="**:data-[sidebar=sidebar]:rounded-2xl"
    >
      <SidebarHeader className="px-3 pt-3 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Lucrivo"
              render={<Link href="/dashboard" aria-label="Lucrivo" />}
              className="h-12 rounded-xl px-1 group-data-[collapsible=icon]:justify-center hover:bg-transparent active:bg-transparent"
            >
              <span className="bg-brand-gradient text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
                <TrendingUpIcon aria-hidden="true" />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold tracking-tight">
                  Lucrivo
                </span>
                <span className="text-sidebar-foreground/55 truncate text-[0.6875rem]">
                  Finanças inteligentes
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1 pt-1">
        <SidebarGroup className="gap-1">
          <SidebarGroupLabel className="px-3 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            Visão geral
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Dashboard"
                  isActive={pathname === "/dashboard"}
                  render={<Link href="/dashboard" />}
                  className="transition-interactive data-active:bg-primary data-active:text-primary-foreground h-10 rounded-xl px-3 font-medium group-data-[collapsible=icon]:justify-center hover:translate-x-0.5 data-active:shadow-sm"
                >
                  <LayoutDashboardIcon aria-hidden="true" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 pt-2">
        <div className="border-sidebar-border bg-sidebar-accent/35 rounded-2xl border p-2 group-data-[collapsible=icon]:hidden">
          <p className="text-sidebar-foreground/55 mb-2 px-1 text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
            Aparência
          </p>
          <ThemeToggle className="border-sidebar-border bg-sidebar w-full rounded-xl shadow-none" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export { AppSidebar };
