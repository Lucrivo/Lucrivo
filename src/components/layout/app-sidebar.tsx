"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheckIcon,
  CreditCardIcon,
  FileChartColumnIcon,
  LayoutDashboardIcon,
  LandmarkIcon,
  UsersIcon,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

type AppSidebarVariant = "financial" | "admin";

const financialNavigationItems: NavigationItem[] = [
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

const adminNavigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    label: "Usuários",
    href: "/admin/users",
    icon: UsersIcon,
  },
  {
    label: "Assinaturas",
    href: "/admin/subscriptions",
    icon: CreditCardIcon,
  },
];

function AppSidebar({
  variant = "financial",
}: {
  variant?: AppSidebarVariant;
}) {
  const pathname = usePathname();
  const isAdmin = variant === "admin";
  const navigationItems = isAdmin
    ? adminNavigationItems
    : financialNavigationItems;
  const homeHref = isAdmin ? "/admin" : "/dashboard";
  const subtitle = isAdmin ? "Administração" : "Finanças inteligentes";

  const isActive = ({ href, exact }: NavigationItem) =>
    pathname === href || (!exact && pathname.startsWith(`${href}/`));

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
              render={<Link href={homeHref} aria-label="Lucrivo" />}
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
                  {subtitle}
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
              {navigationItems.map((item) => {
                const { label, href, icon: Icon } = item;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      tooltip={label}
                      isActive={isActive(item)}
                      render={<Link href={href} />}
                      className="transition-interactive data-active:bg-primary data-active:text-primary-foreground h-10 rounded-xl px-3 font-medium group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 hover:translate-x-0.5 group-data-[collapsible=icon]:hover:translate-x-0 data-active:shadow-sm"
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator className="mx-3 my-2 w-auto" />
            <SidebarGroup className="gap-1">
              <SidebarGroupLabel className="px-3 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                Produto
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Área financeira"
                      isActive={pathname === "/dashboard"}
                      render={<Link href="/dashboard" />}
                      className="transition-interactive h-10 rounded-xl px-3 font-medium group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                    >
                      <LandmarkIcon aria-hidden="true" />
                      <span>Área financeira</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
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

export { AppSidebar, type AppSidebarVariant };
