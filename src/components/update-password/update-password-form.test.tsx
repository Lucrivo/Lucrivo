import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { UpdatePasswordActionState } from "@/modules/auth/actions/update-password.action";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { UpdatePasswordForm } from "./update-password-form";

function renderForm(
  action: (
    previousState: UpdatePasswordActionState,
    formData: FormData,
  ) => Promise<UpdatePasswordActionState>,
  flow?: "recovery" | "invite",
) {
  const abandonAction = vi.fn();
  render(
    <UpdatePasswordForm
      action={action}
      abandonAction={abandonAction}
      flow={flow}
    />,
  );
  return { abandonAction };
}

async function fillPasswordFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nova senha"), "nova-senha1");
  await user.type(screen.getByLabelText("Confirmação da senha"), "nova-senha1");
}

describe("UpdatePasswordForm", () => {
  it("exposes the password policy and new-password autocomplete", () => {
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => null);

    renderForm(action);

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

    renderForm(action);

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
    [
      "mfa_required",
      "Confirme o código do autenticador antes de salvar a nova senha",
    ],
  ] as const)("shows safe feedback for %s", async (error, message) => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => ({
      status: "error",
      error,
    }));

    renderForm(action);
    await fillPasswordFields(user);
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(action).toHaveBeenCalledOnce();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Nova senha")).toHaveValue("nova-senha1");
    expect(screen.getByLabelText("Confirmação da senha")).toHaveValue(
      "nova-senha1",
    );
  });

  it("signs out before requesting another recovery email", () => {
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => null);

    const { abandonAction } = renderForm(action);

    expect(
      screen.queryByRole("link", { name: "Solicitar outro link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sair e solicitar outro link" }),
    ).toBeVisible();
    expect(abandonAction).not.toHaveBeenCalled();
  });

  it("refreshes after the authenticator becomes required", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => ({
      status: "error",
      error: "mfa_required",
    }));

    renderForm(action);
    await fillPasswordFields(user);
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Confirme o código do autenticador",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("uses invitation copy and submits the closed flow value", () => {
    const action = vi.fn(async (): Promise<UpdatePasswordActionState> => null);

    renderForm(action, "invite");

    expect(
      screen.getByRole("heading", { name: "Crie sua senha" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Criar senha" })).toBeVisible();
    const flowFields = screen.getAllByDisplayValue("invite");
    expect(flowFields).toHaveLength(2);
    for (const field of flowFields) {
      expect(field).toHaveAttribute("name", "flow");
    }
    expect(
      screen.getByRole("button", { name: "Sair e voltar ao login" }),
    ).toBeVisible();
  });
});
