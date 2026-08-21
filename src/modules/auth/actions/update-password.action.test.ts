import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, updatePassword } = vi.hoisted(() => ({
  redirect: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/update-password.service", () => ({
  updatePassword,
}));

import { submitPasswordUpdate } from "./update-password.action";

function passwordFormData(password: string, confirmPassword = password) {
  const formData = new FormData();
  formData.set("password", password);
  formData.set("confirmPassword", confirmPassword);
  return formData;
}

describe("submitPasswordUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updatePassword.mockResolvedValue({ status: "updated" });
  });

  it("rejects a policy-invalid password without calling the service", async () => {
    const result = await submitPasswordUpdate(
      null,
      passwordFormData("senha-fraca"),
    );

    expect(updatePassword).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "invalid_fields" });
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

  it("returns a form error when the password update fails", async () => {
    updatePassword.mockResolvedValue({ status: "update_failed" });

    const result = await submitPasswordUpdate(
      null,
      passwordFormData("nova-senha1"),
    );

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "update_failed" });
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
});
