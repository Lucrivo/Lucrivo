import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordRecoveryEmail } = vi.hoisted(() => ({
  requestPasswordRecoveryEmail: vi.fn(),
}));

vi.mock("@/modules/auth/services/request-password-recovery.service", () => ({
  requestPasswordRecoveryEmail,
}));

import { requestPasswordRecovery } from "./request-password-recovery.action";

function recoveryFormData(email: string, captchaToken?: string) {
  const formData = new FormData();
  formData.set("email", email);
  if (captchaToken) formData.set("captchaToken", captchaToken);
  return formData;
}

describe("requestPasswordRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestPasswordRecoveryEmail.mockResolvedValue({ status: "accepted" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects an invalid email without calling the service", async () => {
    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("invalid-email"),
    );

    expect(requestPasswordRecoveryEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "invalid_email" });
  });

  it("returns the neutral acknowledgement for an accepted request", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("  Usuario@Lucrivo.COM "),
    );

    expect(requestPasswordRecoveryEmail).toHaveBeenCalledWith(
      "usuario@lucrivo.com",
      undefined,
    );
    expect(result).toEqual({
      status: "success",
      outcome: "recovery_requested",
    });
  });

  it("returns a generic operational failure", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    requestPasswordRecoveryEmail.mockResolvedValue({
      status: "error",
      error: "request_failed",
    });

    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("usuario@lucrivo.com"),
    );

    expect(result).toEqual({ status: "error", error: "request_failed" });
  });

  it("blocks a missing CAPTCHA before calling the service", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "true");

    const result = await requestPasswordRecovery(
      null,
      recoveryFormData("usuario@lucrivo.com"),
    );

    expect(requestPasswordRecoveryEmail).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "captcha_required" });
  });

  it("forwards the CAPTCHA token to the service", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "true");

    await requestPasswordRecovery(
      null,
      recoveryFormData("usuario@lucrivo.com", "captcha-token"),
    );

    expect(requestPasswordRecoveryEmail).toHaveBeenCalledWith(
      "usuario@lucrivo.com",
      "captcha-token",
    );
  });
});
