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
vi.mock("@/modules/auth/components/admin-mfa-challenge", () => ({
  AdminMfaChallenge: ({ factorId }: { factorId: string }) => (
    <div>challenge:{factorId}</div>
  ),
}));
vi.mock("@/components/admin/admin-access-unavailable", () => ({
  AdminAccessUnavailable: () => <div>unavailable-content</div>,
}));

import AdminMfaChallengePage from "./page";

const identity = { userId: "admin", email: "admin@example.com" };

describe("AdminMfaChallengePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes only the selected verified factor to the challenge", async () => {
    getAdminRouteState.mockResolvedValue({
      status: "challenge",
      identity,
      factorId: "verified-factor",
    });
    render(await AdminMfaChallengePage());
    expect(screen.getByText("challenge:verified-factor")).toBeVisible();
  });

  it.each([
    ["setup", "/admin/mfa/setup"],
    ["authorized", "/admin"],
  ])("redirects %s to %s", async (status, destination) => {
    getAdminRouteState.mockResolvedValue({ status, identity });
    await expect(AdminMfaChallengePage()).rejects.toThrow(
      `redirect:${destination}`,
    );
  });

  it("renders retry without challenge content when unavailable", async () => {
    getAdminRouteState.mockResolvedValue({ status: "unavailable", identity });
    render(await AdminMfaChallengePage());
    expect(screen.getByText("unavailable-content")).toBeVisible();
    expect(screen.queryByText(/challenge:/)).not.toBeInTheDocument();
  });
});
