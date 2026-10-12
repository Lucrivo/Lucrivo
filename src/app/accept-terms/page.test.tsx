import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, requireUser, rpc } = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  requireUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/actions/logout.action", () => ({
  logout: vi.fn(),
}));
vi.mock("@/modules/auth/services/require-user", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/modules/auth/services/require-user")
    >();
  return { ...original, requireUser };
});

import {
  AccountUnavailableError,
  AuthRequiredError,
} from "@/modules/auth/services/require-user";

import AcceptTermsPage from "./page";

describe("AcceptTermsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: false, error: null });
    requireUser.mockResolvedValue({
      userId: "user-123",
      supabase: { rpc },
    });
  });

  it("sends a signed-out visitor to login", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    await expect(AcceptTermsPage()).rejects.toThrow("redirect:/login");
  });

  it("sends an administrator to the admin home", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data: name === "current_user_is_admin",
      error: null,
    }));

    await expect(AcceptTermsPage()).rejects.toThrow("redirect:/admin");
  });

  it("continues a client who already accepted", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data: name === "current_user_has_accepted_legal_copy_v1",
      error: null,
    }));

    await expect(AcceptTermsPage()).rejects.toThrow(
      "redirect:/auth/continue",
    );
  });

  it("asks a client who has not accepted to accept or leave", async () => {
    render(await AcceptTermsPage());

    expect(screen.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "Política de Privacidade" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("button", { name: "Aceitar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sair da conta" })).toBeVisible();
  });

  it("hides acceptance when the lookup fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });

    render(await AcceptTermsPage());

    expect(
      screen.getByRole("heading", { name: "Não foi possível verificar agora." }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Tentar de novo" }),
    ).toHaveAttribute("href", "/accept-terms");
    expect(screen.getByRole("button", { name: "Sair da conta" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Aceitar" }),
    ).not.toBeInTheDocument();
  });

  it("sends an unavailable account to the existing explanation", async () => {
    requireUser.mockRejectedValue(new AccountUnavailableError());

    await expect(AcceptTermsPage()).rejects.toThrow(
      "redirect:/account-unavailable",
    );
  });
});
