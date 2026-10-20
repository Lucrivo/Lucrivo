import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolvePasswordUpdateGate } = vi.hoisted(() => ({
  resolvePasswordUpdateGate: vi.fn(),
}));

vi.mock("@/components/shared/auth/auth-page", () => ({
  AuthPage: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/update-password/update-password-form", () => ({
  UpdatePasswordForm: ({ flow, notice }: { flow: string; notice?: string }) => (
    <span>{notice ? `${flow}:${notice}` : flow}</span>
  ),
}));

vi.mock("@/components/update-password/password-setup-mfa-challenge", () => ({
  PasswordSetupMfaChallenge: ({ factorId }: { factorId: string }) => (
    <span>{`mfa:${factorId}`}</span>
  ),
}));

vi.mock("@/components/update-password/password-setup-unavailable", () => ({
  PasswordSetupUnavailable: () => <span>unavailable</span>,
}));

vi.mock("@/modules/auth/actions/update-password.action", () => ({
  abandonPasswordSetup: vi.fn(),
  submitPasswordUpdate: vi.fn(),
}));

vi.mock("@/modules/auth/services/resolve-password-update-gate", () => ({
  resolvePasswordUpdateGate,
}));

import UpdatePasswordPage from "./page";

describe("UpdatePasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePasswordUpdateGate.mockResolvedValue({ status: "ready" });
  });

  it("passes the invitation flow through", async () => {
    render(
      await UpdatePasswordPage({
        searchParams: Promise.resolve({ flow: "invite" }),
      }),
    );

    expect(screen.getByText("invite")).toBeVisible();
  });

  it("normalizes unknown flow values to recovery", async () => {
    render(
      await UpdatePasswordPage({
        searchParams: Promise.resolve({ flow: "external" }),
      }),
    );

    expect(screen.getByText("recovery")).toBeVisible();
  });

  it("explains a failed attempt to leave the password page", async () => {
    render(
      await UpdatePasswordPage({
        searchParams: Promise.resolve({ error: "sign_out_failed" }),
      }),
    );

    expect(
      screen.getByText(/Não foi possível encerrar esta tentativa/),
    ).toBeVisible();
  });

  it("asks for the authenticator before the password form", async () => {
    resolvePasswordUpdateGate.mockResolvedValue({
      status: "mfa",
      factorId: "verified-factor",
    });

    render(
      await UpdatePasswordPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("mfa:verified-factor")).toBeVisible();
    expect(screen.queryByText("recovery")).not.toBeInTheDocument();
  });

  it("keeps a failed authenticator lookup on the password setup page", async () => {
    resolvePasswordUpdateGate.mockResolvedValue({ status: "unavailable" });

    render(
      await UpdatePasswordPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("unavailable")).toBeVisible();
  });
});
