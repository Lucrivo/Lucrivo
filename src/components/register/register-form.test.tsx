import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeLoginNavigation } = vi.hoisted(() => ({
  completeLoginNavigation: vi.fn(),
}));

vi.mock("@/components/shared/auth/turnstile-field", () => ({
  TurnstileField: () => (
    <input type="hidden" name="captchaToken" value="captcha-token" readOnly />
  ),
}));

vi.mock("@/components/login/complete-login-navigation", () => ({
  completeLoginNavigation,
}));

import type { RegisterActionState } from "@/modules/auth/actions/register.action";

import { RegisterForm } from "./register-form";

async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
  await user.type(screen.getByLabelText("Senha"), "senha-segura");
  await user.type(screen.getByLabelText("Confirme sua senha"), "senha-segura");
}

describe("RegisterForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
    completeLoginNavigation.mockClear();
  });

  it("shows the registration invitation as the form heading", () => {
    const action = vi.fn(async (): Promise<RegisterActionState> => null);

    render(<RegisterForm action={action} />);

    expect(
      screen.getByRole("heading", {
        name: "Crie sua conta grátis e descubra.",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("Comece agora com o Lucrivo"),
    ).not.toBeInTheDocument();
  });

  it("starts with legal acceptance unchecked and links to both documents", () => {
    const action = vi.fn(async (): Promise<RegisterActionState> => null);

    render(<RegisterForm action={action} />);

    expect(
      screen.getByRole("checkbox", { name: /Li e aceito/ }),
    ).not.toBeChecked();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "Política de Privacidade" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("does not show an inoperable Google registration", () => {
    const action = vi.fn(async (): Promise<RegisterActionState> => null);

    render(<RegisterForm action={action} />);

    expect(
      screen.queryByRole("button", { name: /google/i }),
    ).not.toBeInTheDocument();
  });

  it("uses the password length required by Supabase", () => {
    const action = vi.fn(async (): Promise<RegisterActionState> => null);

    render(<RegisterForm action={action} />);

    expect(screen.getByLabelText("Senha")).toHaveAttribute("minlength", "10");
    expect(screen.getByLabelText("Confirme sua senha")).toHaveAttribute(
      "minlength",
      "10",
    );
  });

  it("shows password requirements as they are met", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => null);

    render(<RegisterForm action={action} />);

    const progress = screen.getByRole("progressbar", {
      name: "Requisitos da senha",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "0");

    await user.type(screen.getByLabelText("Senha"), "senha-segura1");

    expect(progress).toHaveAttribute("aria-valuenow", "3");
    expect(
      screen.getByText("10 a 72 caracteres").closest("li"),
    ).toHaveAttribute("data-met", "true");
    expect(
      screen.getByText("Pelo menos uma letra").closest("li"),
    ).toHaveAttribute("data-met", "true");
    expect(
      screen.getByText("Pelo menos um número").closest("li"),
    ).toHaveAttribute("data-met", "true");
  });

  it("describes the complete password policy after a weak password response", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => ({
      status: "error",
      error: "weak_password",
    }));

    render(<RegisterForm action={action} />);
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "10 a 72 caracteres, pelo menos uma letra e um número",
    );
    expect(screen.getByLabelText("E-mail")).toHaveValue("usuario@lucrivo.com");
    expect(screen.getByLabelText("Senha")).toHaveValue("senha-segura");
    expect(screen.getByLabelText("Confirme sua senha")).toHaveValue(
      "senha-segura",
    );
  });

  it("shows a password confirmation error returned by the register action", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => ({
      status: "error",
      error: "password_mismatch",
    }));

    render(<RegisterForm action={action} />);
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "As senhas não coincidem",
    );
    expect(action).toHaveBeenCalledOnce();
  });

  it("guides an existing account to sign in or reset the password", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => ({
      status: "error",
      error: "account_exists",
    }));

    render(<RegisterForm action={action} />);
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Se você já tem uma conta com este e-mail, entre ou recupere a senha.",
    );
    expect(
      screen.getByRole("link", { name: "recupere a senha" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(action).toHaveBeenCalledOnce();
  });

  it("shows a neutral email confirmation state after a registration request", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => ({
      status: "success",
      outcome: "confirmation_required",
    }));

    render(<RegisterForm action={action} />);
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Se o cadastro puder ser concluído, enviaremos uma confirmação para o e-mail informado.",
    );
    expect(screen.getByLabelText("E-mail")).toHaveValue("usuario@lucrivo.com");
    await waitFor(() => {
      expect(screen.getByLabelText("Senha")).toHaveValue("");
      expect(screen.getByLabelText("Confirme sua senha")).toHaveValue("");
    });
    expect(action).toHaveBeenCalledOnce();
    expect(completeLoginNavigation).not.toHaveBeenCalled();
  });

  it("replaces the document after an immediately authenticated signup", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => ({
      status: "success",
      outcome: "authenticated",
      destination: "/auth/continue",
    }));

    render(<RegisterForm action={action} />);
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(completeLoginNavigation).toHaveBeenCalledWith("/auth/continue");
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
