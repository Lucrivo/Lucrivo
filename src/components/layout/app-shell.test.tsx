import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/app-sidebar", () => ({
  AppSidebar: ({ variant }: { variant: string }) => (
    <aside>sidebar:{variant}</aside>
  ),
}));

vi.mock("@/components/layout/account-menu", () => ({
  AccountMenu: ({
    email,
    logoutAction,
  }: {
    email: string;
    logoutAction: () => Promise<void>;
  }) => (
    <div>
      account:{email}:{logoutAction.name}
    </div>
  ),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarTrigger: ({ "aria-label": label }: { "aria-label": string }) => (
    <button>{label}</button>
  ),
}));

vi.mock("@/modules/auth/actions/logout.action", () => ({
  logout: async function logout() {},
}));

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("wires context, navigation, account and protected content", () => {
    render(
      <AppShell
        email="admin@example.com"
        sidebarVariant="admin"
        contextTitle="Administração"
        contextDescription="Acompanhe o funcionamento do Lucrivo."
      >
        <div>protected-content</div>
      </AppShell>,
    );

    expect(screen.getByText("sidebar:admin")).toBeVisible();
    expect(screen.getByText("Administração")).toBeVisible();
    expect(
      screen.getByText("Acompanhe o funcionamento do Lucrivo."),
    ).toBeVisible();
    expect(screen.getByText("account:admin@example.com:logout")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Alternar menu lateral" }),
    ).toBeVisible();
    expect(screen.getByText("protected-content")).toBeVisible();
  });
});
