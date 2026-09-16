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

import { AdminMfaChallenge } from "./admin-mfa-challenge";

describe("AdminMfaChallenge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockReturnValue({
      auth: { mfa: { challengeAndVerify } },
    });
    challengeAndVerify.mockResolvedValue({ data: {}, error: null });
  });

  it("normalizes six digits and verifies the selected factor", async () => {
    const user = userEvent.setup();
    render(<AdminMfaChallenge factorId="verified-factor" />);

    const code = screen.getByLabelText("Código do autenticador");
    const submit = screen.getByRole("button", { name: "Confirmar acesso" });

    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAttribute("inputmode", "numeric");
    expect(code).toHaveAttribute("maxlength", "6");
    expect(submit).toBeDisabled();

    await user.type(code, "1a2-34567");
    expect(code).toHaveValue("123456");
    expect(submit).toBeEnabled();

    await user.click(submit);

    expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: "verified-factor",
      code: "123456",
    });
    expect(replace).toHaveBeenCalledWith("/admin");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each(["returned", "thrown"])(
    "keeps the form available for a %s verification failure",
    async (failureMode) => {
      const user = userEvent.setup();
      if (failureMode === "returned") {
        challengeAndVerify.mockResolvedValue({
          data: null,
          error: { message: "provider detail" },
        });
      } else {
        challengeAndVerify.mockRejectedValue(new Error("provider detail"));
      }
      render(<AdminMfaChallenge factorId="verified-factor" />);

      const code = screen.getByLabelText("Código do autenticador");
      await user.type(code, "123456");
      await user.click(
        screen.getByRole("button", { name: "Confirmar acesso" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível confirmar o código. Verifique e tente novamente.",
      );
      expect(code).toHaveValue("123456");
      expect(screen.queryByText("provider detail")).not.toBeInTheDocument();
      expect(replace).not.toHaveBeenCalled();
    },
  );
});
