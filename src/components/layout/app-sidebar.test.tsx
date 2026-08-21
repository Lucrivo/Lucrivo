import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

vi.mock("next/navigation", () => ({ usePathname }));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <aside>{children}</aside>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <footer>{children}</footer>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  SidebarMenuButton: ({
    render,
    children,
    isActive,
    tooltip,
    ...props
  }: {
    render?: React.ReactElement<Record<string, unknown>>;
    children?: React.ReactNode;
    isActive?: boolean;
    tooltip?: string;
    type?: "button" | "submit" | "reset";
  }) =>
    render ? (
      <render.type
        {...render.props}
        {...props}
        data-active={isActive || undefined}
        data-tooltip={tooltip}
      >
        {children}
      </render.type>
    ) : (
      <button
        {...props}
        data-active={isActive || undefined}
        data-tooltip={tooltip}
      >
        {children}
      </button>
    ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarRail: () => null,
  SidebarSeparator: () => <hr />,
}));

import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
  it("exibe a navegação principal e a conta autenticada", () => {
    render(<AppSidebar email="pessoa@lucrivo.local" logoutAction={vi.fn()} />);

    expect(screen.getByText("Lucrivo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByText("pessoa@lucrivo.local")).toBeInTheDocument();
  });

  it("disponibiliza o logout como ação de formulário", () => {
    const logoutAction = vi.fn();

    render(
      <AppSidebar email="pessoa@lucrivo.local" logoutAction={logoutAction} />,
    );

    expect(screen.getByRole("button", { name: /sair/i })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});
