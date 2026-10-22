import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/actions/register.action", () => ({
  register: vi.fn(),
}));
vi.mock("@/components/register/register-form", () => ({
  RegisterForm: () => <form>cadastro</form>,
}));
vi.mock("@/components/shared/auth/auth-page", () => ({
  AuthPage: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { storageKey } from "@/modules/billing/components/pre-diagnosis-dialog";

import RegisterPage from "./page";

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to login when the public signup flag is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "false");

    RegisterPage();

    expect(redirect).toHaveBeenCalledWith("/login?status=signup_disabled");
  });

  it("opens the pre-diagnosis dialog above the registration form", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "true");
    vi.stubEnv("LANDING_OFFER_DIALOG_ENABLED", "false");

    render(RegisterPage());

    const dialog = await screen.findByRole("dialog", {
      name: /Seu preço pode estar\s+dando prejuízo\s+e você nem sabe\./,
    });
    expect(within(dialog).getByText("Oferta especial")).toBeVisible();
    expect(within(dialog).getByText("Grátis")).toBeVisible();
    expect(
      within(dialog).getByText("Quanto sobra de cada venda?"),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("link", {
        name: "Quero fazer meu diagnóstico grátis",
      }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(dialog).not.toHaveTextContent(/Oferta de lançamento|R\$ 39,90/);
    expect(screen.getByText("cadastro")).toBeVisible();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("opens again on register after the dialog was dismissed in the app", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SIGNUP_ENABLED", "true");
    window.sessionStorage.setItem(storageKey, "shown");

    render(RegisterPage());

    expect(
      await screen.findByRole("dialog", {
        name: /Seu preço pode estar\s+dando prejuízo\s+e você nem sabe\./,
      }),
    ).toBeVisible();
  });
});
