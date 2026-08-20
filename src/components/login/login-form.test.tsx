import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LoginActionState } from "@/actions/auth/login.action";

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("shows authentication feedback and toggles password visibility", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<LoginActionState> => ({
      status: "error",
      error: "invalid_credentials",
    }));

    render(<LoginForm action={action} />);

    await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail ou senha inválidos",
    );

    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));

    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeVisible();
  });
});
