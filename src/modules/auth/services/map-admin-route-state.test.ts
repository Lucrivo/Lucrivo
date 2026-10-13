import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFound, redirect, resolveAdminAccessState } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  resolveAdminAccessState: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound, redirect }));
vi.mock("@/modules/auth/services/resolve-admin-access-state", () => ({
  resolveAdminAccessState,
}));

import { AdminRequiredError } from "@/modules/auth/services/require-admin";
import { AuthRequiredError } from "@/modules/auth/services/require-user";

import { getAdminRouteState } from "./map-admin-route-state";

describe("getAdminRouteState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a resolved admin state", async () => {
    const state = { status: "setup", identity: { userId: "admin" } };
    resolveAdminAccessState.mockResolvedValue(state);

    await expect(getAdminRouteState()).resolves.toBe(state);
  });

  it("redirects an unauthenticated caller to login", async () => {
    resolveAdminAccessState.mockRejectedValue(new AuthRequiredError());

    await expect(getAdminRouteState()).rejects.toThrow("redirect:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("hides admin routes from a regular authenticated user", async () => {
    resolveAdminAccessState.mockRejectedValue(new AdminRequiredError());

    await expect(getAdminRouteState()).rejects.toThrow("not-found");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("rethrows an unexpected error", async () => {
    const unexpected = new Error("unexpected");
    resolveAdminAccessState.mockRejectedValue(unexpected);

    await expect(getAdminRouteState()).rejects.toBe(unexpected);
  });
});
