import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/shared/auth/turnstile-field", () => ({
  TurnstileField: () => (
    <input type="hidden" name="captchaToken" value="captcha-token" readOnly />
  ),
}));

import type { PasswordRecoveryActionState } from "@/modules/auth/actions/request-password-recovery.action";

import { ForgotPasswordForm } from "./forgot-password-form";

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("submits the email and shows the neutral acknowledgement", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<PasswordRecoveryActionState> => ({
      status: "success",
      outcome: "recovery_requested",
    }));

    render(<ForgotPasswordForm action={action} />);

    await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
    await user.click(screen.getByRole("button", { name: "Enviar instruções" }));

    expect(action).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Se existir uma conta para este e-mail",
    );
    expect(screen.getByLabelText("E-mail")).toHaveValue("usuario@lucrivo.com");
  });

  it.each([
    ["invalid_email", "Informe um e-mail válido"],
    ["request_failed", "Não foi possível processar sua solicitação"],
  ] as const)("shows safe feedback for %s", async (error, message) => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<PasswordRecoveryActionState> => ({
      status: "error",
      error,
    }));

    render(<ForgotPasswordForm action={action} />);

    await user.type(screen.getByLabelText("E-mail"), "usuario@lucrivo.com");
    await user.click(screen.getByRole("button", { name: "Enviar instruções" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("E-mail")).toHaveValue("usuario@lucrivo.com");
  });

  it("links back to login without offering a social provider", () => {
    const action = vi.fn(
      async (): Promise<PasswordRecoveryActionState> => null,
    );

    render(<ForgotPasswordForm action={action} />);

    expect(
      screen.getByRole("link", { name: "Voltar para o login" }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.queryByRole("button", { name: /google/i }),
    ).not.toBeInTheDocument();
  });
});
