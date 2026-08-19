import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("shows authentication feedback and toggles password visibility", async () => {
    const user = userEvent.setup();

    render(
      <LoginForm action={vi.fn(async () => undefined)} hasInvalidCredentials />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "E-mail ou senha inválidos",
    );

    const password = screen.getByLabelText("Senha");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));

    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar senha" })).toBeVisible();
  });
});
