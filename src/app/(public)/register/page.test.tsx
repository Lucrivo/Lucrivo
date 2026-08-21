import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/actions/register.action", () => ({
  register: vi.fn(),
}));

import RegisterPage from "./page";

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("redirects to login when the public signup flag is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "false");

    RegisterPage();

    expect(redirect).toHaveBeenCalledWith("/login?status=signup_disabled");
  });

  it("does not redirect when the public signup flag is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "true");

    RegisterPage();

    expect(redirect).not.toHaveBeenCalled();
  });
});
