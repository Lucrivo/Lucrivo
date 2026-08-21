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
    signUp.mockResolvedValue({ data: { session: null }, error: null });
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
});
