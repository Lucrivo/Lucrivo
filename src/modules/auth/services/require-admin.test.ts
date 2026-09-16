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

import { AuthRequiredError } from "./require-user";
import {
  AdminMfaRequiredError,
  AdminRequiredError,
  requireAdmin,
} from "./require-admin";

describe("requireAdmin", () => {
  const supabase = { auth: { getClaims }, rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
  });

  it.each([
    { data: null, error: { message: "provider detail" } },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
    { data: { claims: { sub: 42 } }, error: null },
  ])("rejects unusable claims before querying admin status", async (result) => {
    getClaims.mockResolvedValue(result);

    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a regular authenticated user", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123", aal: "aal2" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: false, error: null });

    const rejection = expect(requireAdmin()).rejects;
    await rejection.toBeInstanceOf(AdminRequiredError);
    await rejection.toMatchObject({
      name: "AdminRequiredError",
      message: "Administrative access required",
    });
    expect(rpc).toHaveBeenCalledWith("current_user_is_admin");
  });

  it.each([
    { data: null, error: { message: "database unavailable" } },
    { data: null, error: null },
    { data: "true", error: null },
  ])("fails closed for an unusable admin RPC result", async (result) => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123", aal: "aal2" } },
      error: null,
    });
    rpc.mockResolvedValue(result);

    await expect(requireAdmin()).rejects.toBeInstanceOf(AdminRequiredError);
  });

  it.each([undefined, "aal1", "unexpected"])(
    "requires aal2 after confirming the admin role",
    async (aal) => {
      getClaims.mockResolvedValue({
        data: { claims: { sub: "admin-123", aal } },
        error: null,
      });
      rpc.mockResolvedValue({ data: true, error: null });

      const rejection = expect(requireAdmin()).rejects;
      await rejection.toBeInstanceOf(AdminMfaRequiredError);
      await rejection.toMatchObject({
        name: "AdminMfaRequiredError",
        message: "Multi-factor authentication required",
      });
    },
  );

  it("returns the verified admin subject and request-scoped client at aal2", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "admin-123", aal: "aal2" } },
      error: null,
    });
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(requireAdmin()).resolves.toEqual({
      userId: "admin-123",
      supabase,
    });
    expect(createClient).toHaveBeenCalledOnce();
    expect(getClaims).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("current_user_is_admin");
  });
});
