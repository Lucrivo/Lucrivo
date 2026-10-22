import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, signUp } = vi.hoisted(() => ({
  createClient: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { signup } from "./signup.service";

describe("signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { signUp } });
    signUp.mockResolvedValue({
      data: { session: null, user: { id: "user-3", identities: [] } },
      error: null,
    });
  });

  it("forwards the CAPTCHA token in Supabase options", async () => {
    await signup(
      { email: "usuario@lucrivo.com", password: "senha-segura1" },
      "captcha-token",
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "usuario@lucrivo.com",
      password: "senha-segura1",
      options: { captchaToken: "captcha-token" },
    });
  });

  it("returns the session user id when signup authenticates immediately", async () => {
    signUp.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: "user-1", identities: [{ id: "identity-1" }] },
      },
      error: null,
    });

    await expect(
      signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
    ).resolves.toEqual({ status: "authenticated", userId: "user-1" });
  });

  it("returns the user id when confirmation still has an identity", async () => {
    signUp.mockResolvedValue({
      data: {
        session: null,
        user: { id: "user-2", identities: [{ id: "identity-2" }] },
      },
      error: null,
    });

    await expect(
      signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
    ).resolves.toEqual({
      status: "confirmation_required",
      userId: "user-2",
    });
  });

  it("returns account_exists when the email is already registered", async () => {
    signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: "user_already_exists" },
    });

    await expect(
      signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
    ).resolves.toEqual({ status: "error", error: "account_exists" });
  });

  it("returns no user id when confirmation has no identity", async () => {
    signUp.mockResolvedValue({
      data: { session: null, user: { id: "user-3", identities: [] } },
      error: null,
    });

    await expect(
      signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
    ).resolves.toEqual({ status: "confirmation_required", userId: null });
  });
});
