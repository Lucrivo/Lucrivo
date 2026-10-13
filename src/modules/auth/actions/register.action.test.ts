import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, signup, recordSignupLegalAcceptance } = vi.hoisted(() => ({
  redirect: vi.fn(),
  signup: vi.fn(),
  recordSignupLegalAcceptance: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/signup.service", () => ({ signup }));
vi.mock("@/modules/legal/record-signup-legal-acceptance", () => ({
  recordSignupLegalAcceptance,
}));

import { register } from "./register.action";

function registerFormData(captchaToken?: string) {
  const formData = new FormData();
  formData.set("email", "usuario@lucrivo.com");
  formData.set("password", "senha-segura1");
  formData.set("confirmPassword", "senha-segura1");
  formData.set("acceptedLegalTerms", "on");
  if (captchaToken) formData.set("captchaToken", captchaToken);
  return formData;
}

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signup.mockResolvedValue({
      status: "confirmation_required",
      userId: null,
    });
    recordSignupLegalAcceptance.mockResolvedValue("recorded");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks registration before calling the service when signup is disabled", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "false");

    const result = await register(null, registerFormData());

    expect(signup).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "signup_disabled" });
  });

  it("allows registration when signup is explicitly enabled", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");

    const result = await register(null, registerFormData());

    expect(signup).toHaveBeenCalledWith(
      {
        email: "usuario@lucrivo.com",
        password: "senha-segura1",
      },
      undefined,
    );
    expect(recordSignupLegalAcceptance).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      outcome: "confirmation_required",
    });
  });

  it("rejects a missing legal acceptance before signup", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    const formData = registerFormData();
    formData.delete("acceptedLegalTerms");

    const result = await register(null, formData);

    expect(signup).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "error",
      error: "legal_acceptance_required",
    });
  });

  it("records acceptance when signup returns a user id and still confirms email", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    signup.mockResolvedValue({
      status: "confirmation_required",
      userId: "user-1",
    });

    const result = await register(null, registerFormData());

    expect(recordSignupLegalAcceptance).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      status: "success",
      outcome: "confirmation_required",
    });
  });

  it("keeps the confirmation when acceptance recording fails", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    signup.mockResolvedValue({
      status: "confirmation_required",
      userId: "user-1",
    });
    recordSignupLegalAcceptance.mockResolvedValue("failed");

    await expect(register(null, registerFormData())).resolves.toEqual({
      status: "success",
      outcome: "confirmation_required",
    });
  });

  it("does not record acceptance when confirmation has no user id", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    signup.mockResolvedValue({
      status: "confirmation_required",
      userId: null,
    });

    const result = await register(null, registerFormData());

    expect(recordSignupLegalAcceptance).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      outcome: "confirmation_required",
    });
  });

  it("blocks a missing CAPTCHA before calling the signup service", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "true");

    const result = await register(null, registerFormData());

    expect(signup).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "captcha_required" });
  });

  it("forwards the CAPTCHA token to the signup service", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "true");

    await register(null, registerFormData("captcha-token"));

    expect(signup).toHaveBeenCalledWith(
      {
        email: "usuario@lucrivo.com",
        password: "senha-segura1",
      },
      "captcha-token",
    );
  });

  it("distinguishes a password that does not meet the policy", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    const formData = registerFormData();
    formData.set("password", "senha-fraca");
    formData.set("confirmPassword", "senha-fraca");

    const result = await register(null, formData);

    expect(signup).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "weak_password" });
  });

  it("routes an immediately authenticated signup through the resolver", async () => {
    vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
    signup.mockResolvedValue({ status: "authenticated", userId: "user-1" });

    await register(null, registerFormData());

    expect(redirect).toHaveBeenCalledWith("/auth/continue");
  });
});
