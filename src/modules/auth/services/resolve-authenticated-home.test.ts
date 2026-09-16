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
  });

  it("resolves the configured administrator to /admin", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(resolveAuthenticatedHome()).resolves.toBe("/admin");
  });

  it("resolves a regular user to /dashboard", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
  });

  it.each([
    { data: null, error: { message: "unavailable" } },
    { data: "true", error: null },
    { data: null, error: null },
  ])("falls back to /dashboard for an unusable role result", async (result) => {
    rpc.mockResolvedValue(result);

    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
  });

  it("falls back to /dashboard when the role RPC throws", async () => {
    rpc.mockRejectedValue(new Error("unavailable"));

    await expect(resolveAuthenticatedHome()).resolves.toBe("/dashboard");
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
