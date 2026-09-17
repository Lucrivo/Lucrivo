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

import {
  AccountUnavailableError,
  AuthRequiredError,
  requireUser,
} from "./require-user";

describe("requireUser", () => {
  const supabase = { auth: { getClaims }, rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
    rpc.mockResolvedValue({ data: true, error: null });
  });

  it("returns the verified subject and the same client", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });

    await expect(requireUser()).resolves.toEqual({
      userId: "user-123",
      supabase,
    });
    expect(createClient).toHaveBeenCalledOnce();
    expect(getClaims).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("current_account_is_eligible");
  });

  it.each([
    { data: null, error: { message: "provider detail" } },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
    { data: { claims: { sub: 42 } }, error: null },
  ])("rejects unusable claims safely", async (result) => {
    getClaims.mockResolvedValue(result);

    const rejection = expect(requireUser()).rejects;
    await rejection.toBeInstanceOf(AuthRequiredError);
    await rejection.toMatchObject({
      name: "AuthRequiredError",
      message: "Authentication required",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    { data: false, error: null },
    { data: null, error: { message: "unavailable" } },
  ])("rejects unavailable account state", async (result) => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });
    rpc.mockResolvedValue(result);

    await expect(requireUser()).rejects.toBeInstanceOf(AccountUnavailableError);
  });
});
