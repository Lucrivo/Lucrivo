import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shared/auth/auth-page", () => ({
  AuthPage: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/update-password/update-password-form", () => ({
  UpdatePasswordForm: ({ flow }: { flow: string }) => <span>{flow}</span>,
}));

vi.mock("@/modules/auth/actions/update-password.action", () => ({
  submitPasswordUpdate: vi.fn(),
}));

import UpdatePasswordPage from "./page";

describe("UpdatePasswordPage", () => {
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
});
