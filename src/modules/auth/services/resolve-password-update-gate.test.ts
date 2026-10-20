import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getClaims, listFactors } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  listFactors: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { resolvePasswordUpdateGate } from "./resolve-password-update-gate";

describe("resolvePasswordUpdateGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({
      auth: { getClaims, mfa: { listFactors } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { data: null, error: new Error("invalid") },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
  ])("lets an anonymous visitor reach the password form", async (claims) => {
    getClaims.mockResolvedValue(claims);

    await expect(resolvePasswordUpdateGate()).resolves.toEqual({
      status: "ready",
    });
    expect(listFactors).not.toHaveBeenCalled();
  });

  it("lets an aal2 session set the password without another factor lookup", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id", aal: "aal2" } },
      error: null,
    });

    await expect(resolvePasswordUpdateGate()).resolves.toEqual({
      status: "ready",
    });
    expect(listFactors).not.toHaveBeenCalled();
  });

  it("asks for the verified authenticator before the password form", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id", aal: "aal1" } },
      error: null,
    });
    listFactors.mockResolvedValue({
      data: {
        totp: [
          { id: "", status: "verified" },
          { id: "unverified-factor", status: "unverified" },
          { id: "verified-factor", status: "verified" },
        ],
      },
      error: null,
    });

    await expect(resolvePasswordUpdateGate()).resolves.toEqual({
      status: "mfa",
      factorId: "verified-factor",
    });
  });

  it("keeps the password form when the account has no verified factor", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id", aal: "aal1" } },
      error: null,
    });
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "pending", status: "unverified" }] },
      error: null,
    });

    await expect(resolvePasswordUpdateGate()).resolves.toEqual({
      status: "ready",
    });
  });

  it("fails closed when the factor list is unusable", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id", aal: "aal1" } },
      error: null,
    });
    listFactors.mockResolvedValue({
      data: null,
      error: new Error("usuario@lucrivo.com"),
    });

    await expect(resolvePasswordUpdateGate()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("sanitizes a thrown factor lookup", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id", aal: "aal1" } },
      error: null,
    });
    listFactors.mockRejectedValue(new Error("usuario@lucrivo.com"));

    await expect(resolvePasswordUpdateGate()).resolves.toEqual({
      status: "unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Password setup factor lookup failed.",
    );
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("usuario@lucrivo.com"),
    );
  });
});
