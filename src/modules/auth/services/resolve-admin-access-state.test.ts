import { beforeEach, describe, expect, it, vi } from "vitest";

const { listFactors, requireAdminIdentity } = vi.hoisted(() => ({
  listFactors: vi.fn(),
  requireAdminIdentity: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", () => ({
  requireAdminIdentity,
}));

import { resolveAdminAccessState } from "./resolve-admin-access-state";

const supabase = { auth: { mfa: { listFactors } } };

function identity(aal: unknown = "aal1") {
  return {
    userId: "admin-123",
    aal,
    email: "admin@example.com",
    supabase,
  };
}

function factors(
  totp: Array<Record<string, unknown>> = [],
  all: Array<Record<string, unknown>> = totp,
) {
  return { data: { all, phone: [], totp }, error: null };
}

describe("resolveAdminAccessState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminIdentity.mockResolvedValue(identity());
    listFactors.mockResolvedValue(factors());
  });

  it("does not disclose factors when identity checking fails", async () => {
    const identityError = new Error("not admin");
    requireAdminIdentity.mockRejectedValue(identityError);

    await expect(resolveAdminAccessState()).rejects.toBe(identityError);
    expect(listFactors).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: { message: "unavailable" } },
    { data: null, error: null },
    { data: { all: [], phone: [] }, error: null },
    { data: { all: [], phone: [], totp: "invalid" }, error: null },
  ])("fails closed for an unusable factor response", async (result) => {
    listFactors.mockResolvedValue(result);

    await expect(resolveAdminAccessState()).resolves.toEqual({
      status: "unavailable",
      identity: identity(),
    });
  });

  it("fails closed when listing factors throws", async () => {
    listFactors.mockRejectedValue(new Error("network"));

    await expect(resolveAdminAccessState()).resolves.toEqual({
      status: "unavailable",
      identity: identity(),
    });
  });

  it("requires setup when only unverified factors exist", async () => {
    listFactors.mockResolvedValue(
      factors([
        {
          id: "unverified-factor",
          factor_type: "totp",
          status: "unverified",
          friendly_name: "Lucrivo Admin",
        },
      ]),
    );

    await expect(resolveAdminAccessState()).resolves.toEqual({
      status: "setup",
      identity: identity(),
    });
  });

  it("selects a verified factor for an aal1 challenge", async () => {
    listFactors.mockResolvedValue(
      factors([
        {
          id: "unverified-factor",
          factor_type: "totp",
          status: "unverified",
        },
        {
          id: "verified-factor",
          factor_type: "totp",
          status: "verified",
        },
      ]),
    );

    await expect(resolveAdminAccessState()).resolves.toEqual({
      status: "challenge",
      identity: identity(),
      factorId: "verified-factor",
    });
  });

  it("authorizes aal2 only when a verified factor exists", async () => {
    requireAdminIdentity.mockResolvedValue(identity("aal2"));
    listFactors.mockResolvedValue(
      factors([
        {
          id: "verified-factor",
          factor_type: "totp",
          status: "verified",
        },
      ]),
    );

    await expect(resolveAdminAccessState()).resolves.toEqual({
      status: "authorized",
      identity: identity("aal2"),
    });
  });
});
