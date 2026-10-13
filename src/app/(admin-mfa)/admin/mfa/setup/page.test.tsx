import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminRouteState, redirect } = vi.hoisted(() => ({
  getAdminRouteState: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/map-admin-route-state", () => ({
  getAdminRouteState,
}));
vi.mock("@/modules/auth/components/admin-mfa-frame", () => ({
  AdminMfaFrame: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/modules/auth/components/admin-mfa-setup", () => ({
  AdminMfaSetup: () => <div>setup-content</div>,
}));
vi.mock("@/components/admin/admin-access-unavailable", () => ({
  AdminAccessUnavailable: () => <div>unavailable-content</div>,
}));

import AdminMfaSetupPage from "./page";

const identity = { userId: "admin", email: "admin@example.com" };

describe("AdminMfaSetupPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders setup only for the setup state", async () => {
    getAdminRouteState.mockResolvedValue({ status: "setup", identity });
    render(await AdminMfaSetupPage());
    expect(screen.getByText("setup-content")).toBeVisible();
  });

  it.each([
    ["challenge", "/admin/mfa/challenge"],
    ["authorized", "/admin"],
  ])("redirects %s to %s", async (status, destination) => {
    getAdminRouteState.mockResolvedValue({
      status,
      identity,
      factorId: "factor",
    });
    await expect(AdminMfaSetupPage()).rejects.toThrow(
      `redirect:${destination}`,
    );
  });

  it("renders the retry surface when state is unavailable", async () => {
    getAdminRouteState.mockResolvedValue({ status: "unavailable", identity });
    render(await AdminMfaSetupPage());
    expect(screen.getByText("unavailable-content")).toBeVisible();
    expect(screen.queryByText("setup-content")).not.toBeInTheDocument();
  });
});
