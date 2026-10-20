import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { challengeAndVerify, createClient, refresh, replace } = vi.hoisted(
  () => ({
    challengeAndVerify: vi.fn(),
    createClient: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
);

vi.mock("@/infrastructure/database/supabase/clients/browser.client", () => ({
  createClient,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

import { PasswordSetupMfaChallenge } from "./password-setup-mfa-challenge";

describe("PasswordSetupMfaChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockReturnValue({
      auth: { mfa: { challengeAndVerify } },
    });
    challengeAndVerify.mockResolvedValue({ data: {}, error: null });
  });

  it("verifies the factor and stays on the password page", async () => {
    const user = userEvent.setup();
    render(
      <PasswordSetupMfaChallenge
        factorId="verified-factor"
        flow="recovery"
        abandonAction={vi.fn()}
      />,
    );

    const code = screen.getByLabelText("Código do autenticador");
    const submit = screen.getByRole("button", { name: "Confirmar código" });

    expect(submit).toBeDisabled();
    await user.type(code, "1a2-34567");
    expect(code).toHaveValue("123456");

    await user.click(submit);

    expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: "verified-factor",
      code: "123456",
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the challenge available when verification fails", async () => {
    const user = userEvent.setup();
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { message: "provider detail" },
    });
    render(
      <PasswordSetupMfaChallenge
        factorId="verified-factor"
        flow="recovery"
        abandonAction={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Código do autenticador"), "123456");
    await user.click(screen.getByRole("button", { name: "Confirmar código" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível confirmar o código. Verifique e tente novamente.",
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
