import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, redirect, rpc } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({
    children,
    isAdminUser,
  }: {
    children: React.ReactNode;
    isAdminUser: boolean;
  }) => (
    <div data-testid="private-shell" data-admin-user={isAdminUser}>
      {children}
    </div>
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
    rpc.mockImplementation(async (name: string) => ({
      data: name === "current_user_has_completed_onboarding",
      error: null,
    }));
    requireUser.mockResolvedValue({
      userId: "user-123",
      supabase: {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: { claims: { sub: "user-123", email: "user@example.com" } },
          }),
        },
        rpc,
      },
    });
  });

  it("renders private content for a client with completed onboarding", async () => {
    render(await PrivateLayout({ children: <p>Área privada</p> }));

    expect(screen.getByTestId("private-shell")).toHaveTextContent(
      "Área privada",
    );
    expect(screen.getByTestId("private-shell")).toHaveAttribute(
      "data-admin-user",
      "false",
    );
  });

  it("identifies an admin user for the financial sidebar", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data: name === "current_user_is_admin",
      error: null,
    }));

    render(await PrivateLayout({ children: <p>Área privada</p> }));

    expect(rpc).toHaveBeenCalledWith("current_user_is_admin");
    expect(screen.getByTestId("private-shell")).toHaveAttribute(
      "data-admin-user",
      "true",
    );
    expect(rpc).not.toHaveBeenCalledWith(
      "current_user_has_completed_onboarding",
    );
  });

  it("treats an unusable admin result as a regular completed client", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "current_user_is_admin"
        ? { data: null, error: new Error("rpc failed") }
        : { data: true, error: null },
    );

    render(await PrivateLayout({ children: <p>Área privada</p> }));

    expect(screen.getByTestId("private-shell")).toHaveAttribute(
      "data-admin-user",
      "false",
    );
  });

  it("redirects an incomplete regular client to onboarding", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(
      PrivateLayout({ children: <p>Área privada</p> }),
    ).rejects.toThrow("redirect:/onboarding");
  });

  it("fails closed when the onboarding check is unusable", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "current_user_is_admin"
        ? { data: false, error: null }
        : { data: null, error: new Error("rpc failed") },
    );

    await expect(
      PrivateLayout({ children: <p>Área privada</p> }),
    ).rejects.toThrow("redirect:/account-unavailable");
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
