import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getClaims, getOnboardingData, redirect, requireUser } = vi.hoisted(
  () => ({
    getClaims: vi.fn(),
    getOnboardingData: vi.fn(),
    redirect: vi.fn((destination: string) => {
      throw new Error(`redirect:${destination}`);
    }),
    requireUser: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/onboarding/get-onboarding.service", () => ({
  getOnboardingData,
}));
vi.mock("@/modules/onboarding/components/onboarding-form", () => ({
  OnboardingForm: ({ mode }: { mode: string }) => (
    <div data-testid="onboarding-form" data-mode={mode} />
  ),
}));

import AccountPage from "./page";

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClaims.mockResolvedValue({
      data: { claims: { email: "maria@example.com" } },
      error: null,
    });
    requireUser.mockResolvedValue({
      userId: "client-123",
      supabase: { auth: { getClaims } },
    });
    getOnboardingData.mockResolvedValue({
      catalog: [],
      profile: { completedAt: "2026-10-09T12:00:00Z" },
    });
  });

  it("shows the authenticated email read-only and the shared account editor", async () => {
    render(await AccountPage());

    expect(screen.getByRole("heading", { name: "Minha conta" })).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@example.com");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("readonly");
    expect(screen.getByTestId("onboarding-form")).toHaveAttribute(
      "data-mode",
      "account",
    );
  });

  it("redirects an impossible missing profile back to onboarding", async () => {
    getOnboardingData.mockResolvedValue({ catalog: [], profile: null });

    await expect(AccountPage()).rejects.toThrow("redirect:/onboarding");
  });
});
