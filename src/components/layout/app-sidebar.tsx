"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheckIcon,
  FileChartColumnIcon,
  LayoutDashboardIcon,
  WalletCardsIcon,
  type LucideIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/logo";
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

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    label: "Diagnóstico rápido",
    href: "/quick-diagnosis",
    icon: ClipboardCheckIcon,
  },
  {
    label: "Relatórios",
    href: "/reports",
    icon: FileChartColumnIcon,
  },
  {
    label: "Plano",
    href: "/billing",
    icon: WalletCardsIcon,
  },
];

function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="**:data-[sidebar=sidebar]:rounded-2xl"
    >
      <SidebarHeader className="px-3 pt-3 pb-4 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Lucrivo"
              render={<Link href="/dashboard" aria-label="Lucrivo" />}
              className="h-12 rounded-xl px-1 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:bg-transparent active:bg-transparent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center p-0.5">
                <Logo />
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
            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
              {navigationItems.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    tooltip={label}
                    isActive={isActive(href)}
                    render={<Link href={href} />}
                    className="transition-interactive data-active:bg-primary data-active:text-primary-foreground h-10 rounded-xl px-3 font-medium group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:translate-x-0.5 group-data-[collapsible=icon]:hover:translate-x-0 data-active:shadow-sm"
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
