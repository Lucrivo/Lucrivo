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

  it("shows signup navigation when the public flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "true");

    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: /cadastre-se/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("hides signup navigation when the public flag is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "false");

    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.queryByRole("link", { name: /cadastre-se/i }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["invite_accepted", "Convite aceito. Entre com a senha que você criou."],
    ["password_updated", "Senha atualizada. Entre novamente para continuar."],
  ])("maps the closed status %s to safe feedback", async (status, message) => {
    render(await LoginPage({ searchParams: Promise.resolve({ status }) }));

    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("does not echo an unknown status", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ status: "attacker-content" }),
      }),
    );

    expect(screen.queryByText("attacker-content")).not.toBeInTheDocument();
  });
});
