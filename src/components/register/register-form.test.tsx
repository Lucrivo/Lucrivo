import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RegisterActionState } from "@/actions/auth/register.action";

import { RegisterForm } from "./register-form";

async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
  await user.type(screen.getByLabelText("Senha"), "senha-segura");
  await user.type(screen.getByLabelText("Confirme sua senha"), "senha-segura");
}

describe("RegisterForm", () => {
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
