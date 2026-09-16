import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminRouteState, redirect, requireAdmin } = vi.hoisted(() => ({
  getAdminRouteState: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  requireAdmin: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/map-admin-route-state", () => ({
  getAdminRouteState,
}));
vi.mock("@/modules/auth/services/require-admin", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/modules/auth/services/require-admin")
  >();
  return { ...actual, requireAdmin };
});
vi.mock("@/components/admin/admin-access-unavailable", () => ({
  AdminAccessUnavailable: () => <div>unavailable-content</div>,
}));

import { AdminMfaRequiredError } from "@/modules/auth/services/require-admin";

import AdminLayout from "./layout";

const identity = { userId: "admin", email: "admin@example.com" };

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: "admin" });
  });

  it.each([
    ["setup", "/admin/mfa/setup"],
    ["challenge", "/admin/mfa/challenge"],
  ])("redirects %s before rendering children", async (status, destination) => {
    getAdminRouteState.mockResolvedValue({
      status,
      identity,
      factorId: "factor",
    });
    await expect(
      AdminLayout({ children: <div>secret-child</div> }),
    ).rejects.toThrow(`redirect:${destination}`);
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("renders retry without protected children when unavailable", async () => {
    getAdminRouteState.mockResolvedValue({ status: "unavailable", identity });
    render(await AdminLayout({ children: <div>secret-child</div> }));
    expect(screen.getByText("unavailable-content")).toBeVisible();
    expect(screen.queryByText("secret-child")).not.toBeInTheDocument();
  });

  it("runs the strict guard before rendering authorized children", async () => {
    getAdminRouteState.mockResolvedValue({ status: "authorized", identity });
    render(await AdminLayout({ children: <div>secret-child</div> }));
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(screen.getByText("secret-child")).toBeVisible();
  });

  it("redirects to challenge when the strict guard observes an aal change", async () => {
    getAdminRouteState.mockResolvedValue({ status: "authorized", identity });
    requireAdmin.mockRejectedValue(new AdminMfaRequiredError());
    await expect(
      AdminLayout({ children: <div>secret-child</div> }),
    ).rejects.toThrow("redirect:/admin/mfa/challenge");
  });
});
