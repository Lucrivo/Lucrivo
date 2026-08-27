import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

vi.mock("next/navigation", () => ({ usePathname }));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div aria-label="Selecionar tema">Tema</div>,
}));

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
  it("exibe a marca, a navegação principal e o controle de tema", () => {
    render(<AppSidebar />);

    expect(screen.getByText("Lucrivo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByText("Aparência")).toBeInTheDocument();
    expect(screen.getByLabelText("Selecionar tema")).toBeInTheDocument();
  });

  it("não mistura informações da conta com a navegação", () => {
    render(<AppSidebar />);

    expect(screen.queryByText(/@lucrivo\.local/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sair/i }),
    ).not.toBeInTheDocument();
  });
});
