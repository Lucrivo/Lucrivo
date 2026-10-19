import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/app-sidebar", () => ({
  AppSidebar: ({
    variant,
    isAdminUser,
  }: {
    variant: string;
    isAdminUser: boolean;
  }) => (
    <aside>
      sidebar:{variant}:{String(isAdminUser)}
    </aside>
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

vi.mock("@/modules/billing/components/billing-banner", () => ({
  BillingBanner: ({
    view,
  }: {
    view:
      | { kind: "free_diagnosis" }
      | { kind: "launch_offer"; phase: string; endsAt: string }
      | null;
  }) =>
    view ? (
      <aside data-testid="billing-banner" data-kind={view.kind}>
        {view.kind === "launch_offer" ? view.phase : "diagnóstico grátis"}
      </aside>
    ) : null,
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
        isAdminUser
        contextTitle="Administração"
        contextDescription="Acompanhe o funcionamento do Lucrivo."
        billingBanner={{ kind: "free_diagnosis" }}
      >
        <div>protected-content</div>
      </AppShell>,
    );

    expect(screen.getByText("sidebar:admin:true")).toBeVisible();
    expect(screen.getByText("Administração")).toBeVisible();
    expect(
      screen.getByText("Acompanhe o funcionamento do Lucrivo."),
    ).toBeVisible();
    expect(screen.getByText("account:admin@example.com:logout")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Alternar menu lateral" }),
    ).toBeVisible();
    expect(screen.getByText("protected-content")).toBeVisible();
    expect(screen.getByTestId("billing-banner")).toHaveAttribute(
      "data-kind",
      "free_diagnosis",
    );
  });

  it("omits the diagnosis banner when it is not relevant", () => {
    render(
      <AppShell
        email="cliente@example.com"
        sidebarVariant="financial"
        isAdminUser={false}
        contextTitle="Área financeira"
        contextDescription="Acompanhe suas decisões."
      >
        <div>conteúdo</div>
      </AppShell>,
    );

    expect(screen.queryByTestId("billing-banner")).not.toBeInTheDocument();
  });
});
