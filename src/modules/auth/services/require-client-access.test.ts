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
  LegalAcceptanceRequiredError,
  requireClientAccess,
} from "./require-user";

describe("requireClientAccess", () => {
  const supabase = { auth: { getClaims }, rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });
    rpc.mockImplementation(async (name: string) => {
      if (name === "current_account_is_eligible") {
        return { data: true, error: null };
      }
      if (name === "current_user_is_admin") return { data: false, error: null };
      if (name === "current_user_has_accepted_legal_copy_v1") {
        return { data: true, error: null };
      }
      throw new Error(`unexpected rpc ${name}`);
    });
  });

  it("lets an administrator through without a legal lookup", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data: name !== "current_user_has_accepted_legal_copy_v1",
      error: null,
    }));

    await expect(requireClientAccess()).resolves.toMatchObject({
      isAdmin: true,
      userId: "user-123",
    });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "current_account_is_eligible",
      "current_user_is_admin",
    ]);
  });

  it("allows a client who accepted the current version", async () => {
    await expect(requireClientAccess()).resolves.toMatchObject({
      isAdmin: false,
    });
    expect(rpc).toHaveBeenCalledWith(
      "current_user_has_accepted_legal_copy_v1",
      { p_copy_version: "terms-privacy-v1" },
    );
  });

  it("rejects a client who has not accepted", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "current_account_is_eligible") {
        return { data: true, error: null };
      }
      if (name === "current_user_is_admin") return { data: false, error: null };
      return { data: false, error: null };
    });

    await expect(requireClientAccess()).rejects.toBeInstanceOf(
      LegalAcceptanceRequiredError,
    );
  });

  it("rejects when the legal lookup fails", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "current_user_has_accepted_legal_copy_v1"
        ? { data: null, error: { message: "unavailable" } }
        : { data: name === "current_account_is_eligible", error: null },
    );

    await expect(requireClientAccess()).rejects.toBeInstanceOf(
      LegalAcceptanceRequiredError,
    );
  });

  it("keeps an ineligible account unavailable", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(requireClientAccess()).rejects.toBeInstanceOf(
      AccountUnavailableError,
    );
    expect(rpc).toHaveBeenCalledOnce();
  });
});
