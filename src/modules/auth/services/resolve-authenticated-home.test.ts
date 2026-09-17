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
      data: name === "current_account_is_eligible",
      error: null,
    }));
  });

  it("resolves the configured administrator to /admin", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    rpc.mockResolvedValueOnce({ data: true, error: null });

    await expect(resolveAuthenticatedHome()).resolves.toBe("/admin");
  });

  it("resolves a regular user to /dashboard", async () => {
    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
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
  ])("falls back to /dashboard for an unusable role result", async (result) => {
    rpc.mockImplementation(async (name: string) =>
      name === "current_account_is_eligible"
        ? { data: true, error: null }
        : result,
    );

    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
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
