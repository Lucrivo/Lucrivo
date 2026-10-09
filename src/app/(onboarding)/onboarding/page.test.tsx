import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOnboardingData, redirect } = vi.hoisted(() => ({
  getOnboardingData: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/onboarding/get-onboarding.service", () => ({
  getOnboardingData,
}));
vi.mock("@/modules/onboarding/components/onboarding-form", () => ({
  OnboardingForm: ({ mode }: { mode: string }) => (
    <div data-testid="onboarding-form" data-mode={mode} />
  ),
}));

import OnboardingPage from "./page";

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOnboardingData.mockResolvedValue({ catalog: [], profile: null });
  });

  it("renders the required onboarding form for an incomplete client", async () => {
    render(await OnboardingPage());

    expect(screen.getByTestId("onboarding-form")).toHaveAttribute(
      "data-mode",
      "onboarding",
    );
  });

  it("redirects a completed client to the dashboard", async () => {
    getOnboardingData.mockResolvedValue({
      catalog: [],
      profile: { completedAt: "2026-10-09T12:00:00Z" },
    });

    await expect(OnboardingPage()).rejects.toThrow("redirect:/dashboard");
  });
});
