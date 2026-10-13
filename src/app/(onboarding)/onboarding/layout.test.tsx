import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, requireClientAccess } = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  requireClientAccess: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/ui/logo", () => ({
  Logo: () => <div aria-label="Lucrivo" />,
}));
vi.mock("@/modules/auth/services/require-user", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/modules/auth/services/require-user")
    >();
  return { ...original, requireClientAccess };
});

import {
  AccountUnavailableError,
  AuthRequiredError,
  LegalAcceptanceRequiredError,
} from "@/modules/auth/services/require-user";

import OnboardingLayout from "./layout";

describe("OnboardingLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireClientAccess.mockResolvedValue({
      userId: "client-123",
      isAdmin: false,
      supabase: {},
    });
  });

  it("redirects a client who has not accepted the current terms", async () => {
    requireClientAccess.mockRejectedValue(new LegalAcceptanceRequiredError());

    await expect(OnboardingLayout({ children: null })).rejects.toThrow(
      "redirect:/accept-terms",
    );
  });

  it("redirects unauthenticated users to login", async () => {
    requireClientAccess.mockRejectedValue(new AuthRequiredError());

    await expect(OnboardingLayout({ children: null })).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("redirects unavailable accounts to the explanation", async () => {
    requireClientAccess.mockRejectedValue(new AccountUnavailableError());

    await expect(OnboardingLayout({ children: null })).rejects.toThrow(
      "redirect:/account-unavailable",
    );
  });

  it("renders an authenticated shell-free page with the Lucrivo logo", async () => {
    render(
      await OnboardingLayout({
        children: <div data-testid="onboarding-content">Formulário</div>,
      }),
    );

    expect(screen.getByLabelText("Lucrivo")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-content")).toBeVisible();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
