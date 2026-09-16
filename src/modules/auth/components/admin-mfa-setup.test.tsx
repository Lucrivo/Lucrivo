import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  challengeAndVerify,
  createClient,
  enroll,
  listFactors,
  refresh,
  replace,
  unenroll,
  writeText,
} = vi.hoisted(() => ({
  challengeAndVerify: vi.fn(),
  createClient: vi.fn(),
  enroll: vi.fn(),
  listFactors: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  unenroll: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock("@/infrastructure/database/supabase/clients/browser.client", () => ({
  createClient,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span role="img" aria-label={alt} data-src={src} />
  ),
}));

import { AdminMfaSetup } from "./admin-mfa-setup";

const qrCode = "data:image/svg+xml;base64,PHN2Zy8+";

function factor(
  id: string,
  status: "verified" | "unverified",
  friendlyName = "Lucrivo Admin",
  factorType = "totp",
) {
  return {
    id,
    status,
    friendly_name: friendlyName,
    factor_type: factorType,
  };
}

describe("AdminMfaSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockReturnValue({
      auth: {
        mfa: { challengeAndVerify, enroll, listFactors, unenroll },
      },
    });
    listFactors.mockResolvedValue({
      data: { all: [], phone: [], totp: [] },
      error: null,
    });
    unenroll.mockResolvedValue({ data: {}, error: null });
    enroll.mockResolvedValue({
      data: {
        id: "new-factor",
        type: "totp",
        totp: {
          qr_code: qrCode,
          secret: "SECRET123",
          uri: "otpauth://totp/Lucrivo",
        },
      },
      error: null,
    });
    challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("starts enrollment only after the explicit action", async () => {
    const user = userEvent.setup();
    render(<AdminMfaSetup />);

    expect(enroll).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Configurar aplicativo" }),
    );

    expect(listFactors).toHaveBeenCalledOnce();
    expect(enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "Lucrivo Admin",
    });
    expect(
      await screen.findByRole("img", {
        name: "QR Code para configurar o autenticador",
      }),
    ).toHaveAttribute("data-src", qrCode);
    expect(screen.getByText("SECRET123")).toBeVisible();
  });

  it("removes only abandoned Lucrivo TOTP factors before enrollment", async () => {
    const user = userEvent.setup();
    listFactors.mockResolvedValue({
      data: {
        all: [
          factor("abandoned", "unverified"),
          factor("verified", "verified"),
          factor("other-name", "unverified", "Outro aplicativo"),
          factor("phone", "unverified", "Lucrivo Admin", "phone"),
        ],
        phone: [],
        totp: [],
      },
      error: null,
    });
    render(<AdminMfaSetup />);

    await user.click(
      screen.getByRole("button", { name: "Configurar aplicativo" }),
    );

    await waitFor(() => {
      expect(unenroll).toHaveBeenCalledTimes(1);
      expect(unenroll).toHaveBeenCalledWith({ factorId: "abandoned" });
    });
  });

  it("normalizes and verifies a six-digit code", async () => {
    const user = userEvent.setup();
    render(<AdminMfaSetup />);
    await user.click(
      screen.getByRole("button", { name: "Configurar aplicativo" }),
    );

    const code = await screen.findByLabelText("Código de verificação");
    await user.type(code, "1a2-34567");

    expect(code).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: "Ativar MFA" }));

    expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: "new-factor",
      code: "123456",
    });
    expect(replace).toHaveBeenCalledWith("/admin");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("copies the manual secret with visible status", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<AdminMfaSetup />);
    await user.click(
      screen.getByRole("button", { name: "Configurar aplicativo" }),
    );

    await user.click(await screen.findByRole("button", { name: "Copiar chave" }));

    expect(writeText).toHaveBeenCalledWith("SECRET123");
    expect(screen.getByRole("status")).toHaveTextContent("Chave copiada");
  });

  it("shows fixed feedback without provider details", async () => {
    const user = userEvent.setup();
    enroll.mockResolvedValue({
      data: null,
      error: { message: "sensitive provider detail" },
    });
    render(<AdminMfaSetup />);

    await user.click(
      screen.getByRole("button", { name: "Configurar aplicativo" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível iniciar a configuração",
    );
    expect(screen.queryByText("sensitive provider detail")).not.toBeInTheDocument();
  });
});
