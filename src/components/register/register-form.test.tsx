import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  it("validates password confirmation before calling the register action", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: true }));

    render(<RegisterForm action={action} />);

    await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    await user.type(
      screen.getByLabelText("Confirme sua senha"),
      "senha-diferente",
    );
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "As senhas não coincidem",
    );
    expect(action).not.toHaveBeenCalled();
  });

  it("submits matching passwords and shows the success state", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({ success: true }));

    render(<RegisterForm action={action} />);

    await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    await user.type(
      screen.getByLabelText("Confirme sua senha"),
      "senha-segura",
    );
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cadastro realizado",
    );
    expect(action).toHaveBeenCalledOnce();
  });
});
