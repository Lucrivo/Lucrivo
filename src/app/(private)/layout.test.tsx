import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, redirect } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="private-shell">{children}</div>
  ),
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

import PrivateLayout from "./layout";

describe("PrivateLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      userId: "user-123",
      supabase: {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: { claims: { sub: "user-123", email: "user@example.com" } },
          }),
        },
      },
    });
  });

  it("renders private content for an eligible account", async () => {
    render(await PrivateLayout({ children: <p>Área privada</p> }));

    expect(screen.getByTestId("private-shell")).toHaveTextContent(
      "Área privada",
    );
  });

  it("redirects unauthenticated users to login", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    await expect(PrivateLayout({ children: null })).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("redirects blocked and soft-deleted accounts to an explanation", async () => {
    requireUser.mockRejectedValue(new AccountUnavailableError());

    await expect(PrivateLayout({ children: null })).rejects.toThrow(
      "redirect:/account-unavailable",
    );
  });
});
