import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shared/auth/turnstile-field", () => ({
  TurnstileField: () => (
    <input type="hidden" name="captchaToken" value="captcha-token" readOnly />
  ),
}));

import type { RegisterActionState } from "@/modules/auth/actions/register.action";

import { RegisterForm } from "./register-form";

async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
  await user.type(screen.getByLabelText("Senha"), "senha-segura");
  await user.type(screen.getByLabelText("Confirme sua senha"), "senha-segura");
}

describe("RegisterForm", () => {
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
      "10 caracteres, uma letra e um número",
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

  it("shows the email confirmation state after a successful registration", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<RegisterActionState> => ({
      status: "success",
      outcome: "confirmation_required",
    }));

    render(<RegisterForm action={action} />);
    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cadastro realizado",
    );
    expect(action).toHaveBeenCalledOnce();
  });
});
