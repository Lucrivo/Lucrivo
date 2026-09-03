import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { UpdatePasswordActionState } from "@/modules/auth/actions/update-password.action";

import { UpdatePasswordForm } from "./update-password-form";

async function fillPasswordFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nova senha"), "nova-senha1");
  await user.type(screen.getByLabelText("Confirmação da senha"), "nova-senha1");
}

describe("UpdatePasswordForm", () => {
  it("exposes the password policy and new-password autocomplete", () => {
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => null);

    render(<UpdatePasswordForm action={action} />);

    const password = screen.getByLabelText("Nova senha");
    const confirmation = screen.getByLabelText("Confirmação da senha");

    expect(password).toHaveAttribute("autocomplete", "new-password");
    expect(confirmation).toHaveAttribute("autocomplete", "new-password");
    expect(password).toHaveAttribute("minlength", "10");
    expect(password).toHaveAttribute(
      "aria-describedby",
      "password-requirements",
    );
    expect(screen.getByText(/10 a 72 caracteres/i)).toBeVisible();
  });

  it("provides accessible visibility controls for both password fields", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => null);

    render(<UpdatePasswordForm action={action} />);

    const password = screen.getByLabelText("Nova senha");
    const confirmation = screen.getByLabelText("Confirmação da senha");

    await user.click(
      screen.getByRole("button", { name: "Mostrar nova senha" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Mostrar confirmação da senha" }),
    );

    expect(password).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Ocultar nova senha" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ocultar confirmação da senha" }),
    ).toBeVisible();
  });

  it.each([
    [
      "invalid_fields",
      "Use uma senha de 10 a 72 caracteres, com pelo menos uma letra e um número",
    ],
    ["password_mismatch", "As senhas não coincidem"],
    ["update_failed", "Não foi possível atualizar sua senha"],
  ] as const)("shows safe feedback for %s", async (error, message) => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => ({
      status: "error",
      error,
    }));

    render(<UpdatePasswordForm action={action} />);
    await fillPasswordFields(user);
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(action).toHaveBeenCalledOnce();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Nova senha")).toHaveValue("nova-senha1");
    expect(screen.getByLabelText("Confirmação da senha")).toHaveValue(
      "nova-senha1",
    );
  });

  it("links to requesting another recovery email", () => {
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => null);

    render(<UpdatePasswordForm action={action} />);

    expect(
      screen.getByRole("link", { name: "Solicitar outro link" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});
