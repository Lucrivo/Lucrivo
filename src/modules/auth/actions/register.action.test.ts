import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, signup } = vi.hoisted(() => ({
  redirect: vi.fn(),
  signup: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/signup.service", () => ({ signup }));

import { register } from "./register.action";

function registerFormData() {
  const formData = new FormData();
  formData.set("email", "usuario@lucrivo.com");
  formData.set("password", "senha-segura1");
  formData.set("confirmPassword", "senha-segura1");
  return formData;
}

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signup.mockResolvedValue({ status: "confirmation_required" });
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

    const result = await register(null, registerFormData());

    expect(signup).toHaveBeenCalledWith({
      email: "usuario@lucrivo.com",
      password: "senha-segura1",
    });
    expect(result).toEqual({
      status: "success",
      outcome: "confirmation_required",
    });
  });
});
