import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, redirect, signOut, updatePassword } = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  signOut: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/update-password.service", () => ({
  updatePassword,
}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import {
  abandonPasswordSetup,
  submitPasswordUpdate,
} from "./update-password.action";

function passwordFormData(
  password: string,
  confirmPassword = password,
  flow = "recovery",
) {
  const formData = new FormData();
  formData.set("password", password);
  formData.set("confirmPassword", confirmPassword);
  formData.set("flow", flow);
  return formData;
}

describe("submitPasswordUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePassword.mockResolvedValue({ status: "updated" });
    createClient.mockResolvedValue({ auth: { signOut } });
    signOut.mockResolvedValue({ error: null });
  });

  it("rejects a policy-invalid password without calling the service", async () => {
    const result = await submitPasswordUpdate(
      null,
      passwordFormData("senha-fraca"),
    );

    expect(updatePassword).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "weak_password" });
  });

  it("distinguishes a mismatched password confirmation", async () => {
    const result = await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1", "outra-senha2"),
    );

    expect(updatePassword).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "password_mismatch" });
  });

  it("redirects a complete update to login", async () => {
    await submitPasswordUpdate(null, passwordFormData("nova-senha1"));

    expect(updatePassword).toHaveBeenCalledWith("nova-senha1");
    expect(redirect).toHaveBeenCalledWith("/login?status=password_updated");
  });

  it("redirects an invalid session to a safe recovery error", async () => {
    updatePassword.mockResolvedValue({ status: "invalid_session" });

    await submitPasswordUpdate(null, passwordFormData("nova-senha1"));

    expect(redirect).toHaveBeenCalledWith(
      "/forgot-password?error=invalid_or_expired_link",
    );
  });

  it("keeps the page in place when the authenticator is still required", async () => {
    updatePassword.mockResolvedValue({ status: "mfa_required" });

    const result = await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1"),
    );

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "mfa_required" });
  });

  it("returns a form error when the password update fails", async () => {
    updatePassword.mockResolvedValue({ status: "update_failed" });

    const result = await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1"),
    );

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "update_failed" });
  });

  it("preserves a weak-password error returned by Supabase", async () => {
    updatePassword.mockResolvedValue({ status: "weak_password" });

    const result = await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1"),
    );

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "weak_password" });
  });

  it("warns when the password changed but global revocation failed", async () => {
    updatePassword.mockResolvedValue({
      status: "updated_revocation_failed",
    });

    await submitPasswordUpdate(null, passwordFormData("nova-senha1"));

    expect(redirect).toHaveBeenCalledWith(
      "/login?status=password_updated&warning=sessions_not_revoked",
    );
  });

  it("returns an accepted invitation to login", async () => {
    await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1", "nova-senha1", "invite"),
    );

    expect(redirect).toHaveBeenCalledWith("/login?status=invite_accepted");
  });

  it("uses a safe invitation error for an invalid temporary session", async () => {
    updatePassword.mockResolvedValue({ status: "invalid_session" });

    await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1", "nova-senha1", "invite"),
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?error=invalid_or_expired_invite",
    );
  });

  it("preserves the invitation outcome when revocation is incomplete", async () => {
    updatePassword.mockResolvedValue({ status: "updated_revocation_failed" });

    await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1", "nova-senha1", "invite"),
    );

    expect(redirect).toHaveBeenCalledWith(
      "/login?status=invite_accepted&warning=sessions_not_revoked",
    );
  });

  it.each([
    ["recovery", "/forgot-password"],
    ["invite", "/login"],
  ] as const)(
    "signs out locally before leaving a %s attempt",
    async (flow, destination) => {
      await abandonPasswordSetup(
        passwordFormData("nova-senha1", "nova-senha1", flow),
      );

      expect(signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(redirect).toHaveBeenCalledWith(destination);
    },
  );

  it("stays on the password page when leaving the attempt fails", async () => {
    signOut.mockResolvedValue({ error: new Error("sign out failed") });

    await abandonPasswordSetup(passwordFormData("nova-senha1"));

    expect(redirect).toHaveBeenCalledWith(
      "/update-password?error=sign_out_failed",
    );
  });

  it("treats unknown flow values as recovery", async () => {
    updatePassword.mockResolvedValue({ status: "invalid_session" });

    await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1", "nova-senha1", "external"),
    );

    expect(redirect).toHaveBeenCalledWith(
      "/forgot-password?error=invalid_or_expired_link",
    );
  });
});
