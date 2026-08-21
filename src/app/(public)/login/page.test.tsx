import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/shared/auth/auth-page", () => ({
  AuthPage: ({ children }: { children: React.ReactNode }) => children,
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows signup navigation when the public flag is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "true");

    render(<LoginPage />);

    expect(screen.getByRole("link", { name: /cadastre-se/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("hides signup navigation when the public flag is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "false");

    render(<LoginPage />);

    expect(
      screen.queryByRole("link", { name: /cadastre-se/i }),
    ).not.toBeInTheDocument();
  });
});
