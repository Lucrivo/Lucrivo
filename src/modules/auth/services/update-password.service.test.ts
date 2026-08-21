import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getClaims, signOut, updateUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { updatePassword } from "./update-password.service";

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({
      auth: { getClaims, signOut, updateUser },
    });
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-id" } },
      error: null,
    });
    updateUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [{ data: null, error: new Error("invalid token") }],
    [{ data: null, error: null }],
    [{ data: { claims: {} }, error: null }],
  ])(
    "rejects an invalid session before changing the password",
    async (claims) => {
      getClaims.mockResolvedValue(claims);

      const result = await updatePassword("nova-senha1");

      expect(updateUser).not.toHaveBeenCalled();
      expect(signOut).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "invalid_session" });
    },
  );

  it("updates the password and revokes all sessions", async () => {
    const result = await updatePassword("nova-senha1");

    expect(createClient).toHaveBeenCalledOnce();
    expect(getClaims).toHaveBeenCalledOnce();
    expect(updateUser).toHaveBeenCalledOnce();
    expect(updateUser).toHaveBeenCalledWith({ password: "nova-senha1" });
    expect(signOut).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(result).toEqual({ status: "updated" });
  });

  it("does not sign out when Supabase rejects the password update", async () => {
    updateUser.mockResolvedValue({ error: new Error("weak password") });

    const result = await updatePassword("nova-senha1");

    expect(signOut).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "update_failed" });
  });

  it("reports partial success and attempts local cleanup after revocation fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    signOut
      .mockResolvedValueOnce({ error: new Error("global signout failed") })
      .mockResolvedValueOnce({ error: null });

    const result = await updatePassword("nova-senha1");

    expect(signOut).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    expect(consoleError).toHaveBeenCalledWith(
      "Password updated, but global session revocation failed.",
    );
    expect(result).toEqual({ status: "updated_revocation_failed" });
  });

  it("handles a thrown revocation failure as partial success", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    signOut
      .mockRejectedValueOnce(new Error("global signout unavailable"))
      .mockResolvedValueOnce({ error: null });

    const result = await updatePassword("nova-senha1");

    expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    expect(consoleError).toHaveBeenCalledWith(
      "Password updated, but global session revocation failed.",
    );
    expect(result).toEqual({ status: "updated_revocation_failed" });
  });

  it("sanitizes failures that happen before the password is committed", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    updateUser.mockRejectedValue(
      new Error("update failed for usuario@lucrivo.com"),
    );

    const result = await updatePassword("nova-senha1");

    expect(signOut).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith("Password update failed.");
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("usuario@lucrivo.com"),
    );
    expect(result).toEqual({ status: "update_failed" });
  });
});
