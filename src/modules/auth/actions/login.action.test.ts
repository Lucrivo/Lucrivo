import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, redirect, signInWithPassword } = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { login } from "./login.action";

function loginFormData(captchaToken?: string) {
  const formData = new FormData();
  formData.set("email", "usuario@lucrivo.com");
  formData.set("password", "senha-segura1");
  if (captchaToken) formData.set("captchaToken", captchaToken);
  return formData;
}

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { signInWithPassword } });
    signInWithPassword.mockResolvedValue({ error: null });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("blocks a missing CAPTCHA before creating the Supabase client", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "true");

    const result = await login(null, loginFormData());

    expect(createClient).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "captcha_required" });
  });

  it("forwards the CAPTCHA token to Supabase", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "true");

    await login(null, loginFormData("captcha-token"));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "usuario@lucrivo.com",
      password: "senha-segura1",
      options: { captchaToken: "captcha-token" },
    });
  });

  it("allows a missing token when CAPTCHA is explicitly disabled", async () => {
    vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");

    await login(null, loginFormData());

    expect(signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ options: { captchaToken: undefined } }),
    );
  });
});
