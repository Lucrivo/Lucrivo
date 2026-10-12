import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getClaims, rpc } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { resolveAuthenticatedHome } from "./resolve-authenticated-home";

describe("resolveAuthenticatedHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { getClaims }, rpc });
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });
    rpc.mockImplementation(async (name: string) => ({
      data:
        name === "current_account_is_eligible" ||
        name === "current_user_has_completed_onboarding",
      error: null,
    }));
  });

  it("checks eligibility then resolves an administrator without onboarding", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data:
        name === "current_account_is_eligible" ||
        name === "current_user_is_admin",
      error: null,
    }));
    await expect(resolveAuthenticatedHome()).resolves.toBe("/admin");
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "current_account_is_eligible",
      "current_user_is_admin",
    ]);
  });

  it("resolves a complete regular user to /dashboard", async () => {
    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "current_account_is_eligible",
      "current_user_is_admin",
      "current_user_has_completed_onboarding",
    ]);
  });

  it("resolves an incomplete regular user to /onboarding", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data: name === "current_account_is_eligible",
      error: null,
    }));

    await expect(resolveAuthenticatedHome()).resolves.toBe("/onboarding");
  });

  it("routes a blocked user to the unavailable-account page", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });

    await expect(resolveAuthenticatedHome()).resolves.toBe(
      "/account-unavailable",
    );
    expect(rpc).toHaveBeenCalledOnce();
  });

  it.each([
    { data: null, error: { message: "unavailable" } },
    { data: "true", error: null },
    { data: null, error: null },
  ])("treats an unusable role result as a regular user", async (result) => {
    rpc.mockImplementation(async (name: string) =>
      name === "current_account_is_eligible"
        ? { data: true, error: null }
        : name === "current_user_is_admin"
          ? result
          : { data: true, error: null },
    );

    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
  });

  it.each([
    { data: null, error: { message: "unavailable" } },
    { data: "true", error: null },
    { data: null, error: null },
  ])("fails closed for an unusable onboarding result", async (result) => {
    rpc.mockImplementation(async (name: string) =>
      name === "current_account_is_eligible"
        ? { data: true, error: null }
        : name === "current_user_is_admin"
          ? { data: false, error: null }
          : result,
    );

    await expect(resolveAuthenticatedHome()).resolves.toBe(
      "/account-unavailable",
    );
  });

  it("falls back to /dashboard when the role RPC throws", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "current_account_is_eligible") {
        return { data: true, error: null };
      }
      throw new Error("unavailable");
    });

    await expect(resolveAuthenticatedHome()).resolves.toBe(
      "/account-unavailable",
    );
  });

  it.each([
    { data: null, error: { message: "invalid claims" } },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
  ])("resolves unusable claims to /login", async (result) => {
    getClaims.mockResolvedValue(result);

    await expect(resolveAuthenticatedHome()).resolves.toBe("/login");
    expect(rpc).not.toHaveBeenCalled();
  });
});
