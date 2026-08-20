import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, resetPasswordForEmail } = vi.hoisted(() => ({
  createClient: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { requestPasswordRecoveryEmail } from "./request-password-recovery.service";

describe("requestPasswordRecoveryEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
    createClient.mockResolvedValue({ auth: { resetPasswordForEmail } });
    resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("requests the email with the fixed application callback", async () => {
    const result = await requestPasswordRecoveryEmail("usuario@lucrivo.com");

    expect(resetPasswordForEmail).toHaveBeenCalledWith("usuario@lucrivo.com", {
      redirectTo: "http://localhost:3000/auth/confirm",
    });
    expect(result).toEqual({ status: "accepted" });
  });

  it("normalizes provider errors to avoid disclosing account existence", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    resetPasswordForEmail.mockResolvedValue({
      error: new Error("provider detail for usuario@lucrivo.com"),
    });

    const result = await requestPasswordRecoveryEmail("usuario@lucrivo.com");

    expect(result).toEqual({ status: "accepted" });
    expect(consoleError).toHaveBeenCalledWith(
      "Supabase rejected a password recovery request.",
    );
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("usuario@lucrivo.com"),
    );
  });

  it("returns a generic failure when the application URL is unavailable", async () => {
    vi.stubEnv("APP_URL", "");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const result = await requestPasswordRecoveryEmail("usuario@lucrivo.com");

    expect(createClient).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", error: "request_failed" });
    expect(consoleError).toHaveBeenCalledWith(
      "Password recovery request failed before reaching Supabase.",
    );
  });

  it("sanitizes unexpected failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    createClient.mockRejectedValue(
      new Error("service unavailable for usuario@lucrivo.com"),
    );

    const result = await requestPasswordRecoveryEmail("usuario@lucrivo.com");

    expect(result).toEqual({ status: "error", error: "request_failed" });
    expect(consoleError).toHaveBeenCalledWith(
      "Password recovery request failed before reaching Supabase.",
    );
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("usuario@lucrivo.com"),
    );
  });
});
