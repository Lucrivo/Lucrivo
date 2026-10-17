import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireClientAccess, redirect, rpc, getBillingOverview } = vi.hoisted(
  () => ({
    requireClientAccess: vi.fn(),
    rpc: vi.fn(),
    getBillingOverview: vi.fn(),
    redirect: vi.fn((destination: string) => {
      throw new Error(`redirect:${destination}`);
    }),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({
    children,
    isAdminUser,
    showFreeDiagnosisBanner,
  }: {
    children: React.ReactNode;
    isAdminUser: boolean;
    showFreeDiagnosisBanner: boolean;
  }) => (
    <div
      data-testid="private-shell"
      data-admin-user={isAdminUser}
      data-free-diagnosis-banner={showFreeDiagnosisBanner}
    >
      {children}
    </div>
  ),
}));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview,
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

import PrivateLayout from "./layout";

describe("PrivateLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBillingOverview.mockResolvedValue({ status: "read_failed" });
    rpc.mockImplementation(async (name: string) => ({
      data: name === "current_user_has_completed_onboarding",
      error: null,
    }));
    requireClientAccess.mockResolvedValue({
      userId: "user-123",
      isAdmin: false,
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
    requireClientAccess.mockResolvedValue({
      userId: "user-123",
      isAdmin: true,
      supabase: {
        auth: {
          getClaims: vi.fn().mockResolvedValue({
            data: { claims: { sub: "user-123", email: "user@example.com" } },
          }),
        },
        rpc,
      },
    });

    render(await PrivateLayout({ children: <p>Área privada</p> }));

    expect(screen.getByTestId("private-shell")).toHaveAttribute(
      "data-admin-user",
      "true",
    );
    expect(rpc).not.toHaveBeenCalledWith(
      "current_user_has_completed_onboarding",
    );
    expect(getBillingOverview).not.toHaveBeenCalled();
    expect(screen.getByTestId("private-shell")).toHaveAttribute(
      "data-free-diagnosis-banner",
      "false",
    );
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    "sets the evergreen diagnosis banner from diagnosis-used=%s",
    async (freeQuickDiagnosisUsed, expectedBanner) => {
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview: {
          tier: "free",
          freeQuickDiagnosisUsed,
        },
      });

      render(await PrivateLayout({ children: <p>Área privada</p> }));

      expect(screen.getByTestId("private-shell")).toHaveAttribute(
        "data-free-diagnosis-banner",
        String(expectedBanner),
      );
    },
  );

  it.each(["paid", "courtesy"])(
    "suppresses the strip for a %s user",
    async (tier) => {
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview: { tier, freeQuickDiagnosisUsed: true },
      });

      render(await PrivateLayout({ children: <p>Área privada</p> }));

      expect(screen.getByTestId("private-shell")).toHaveAttribute(
        "data-free-diagnosis-banner",
        "false",
      );
    },
  );

  it("keeps protected content available when the billing read is unusable", async () => {
    getBillingOverview.mockResolvedValue({ status: "read_failed" });
    render(await PrivateLayout({ children: <p>Leitura indisponível</p> }));

    expect(screen.getByTestId("private-shell")).toHaveTextContent(
      "Leitura indisponível",
    );
    expect(screen.getByTestId("private-shell")).toHaveAttribute(
      "data-free-diagnosis-banner",
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
    rpc.mockResolvedValue({ data: null, error: new Error("rpc failed") });

    await expect(
      PrivateLayout({ children: <p>Área privada</p> }),
    ).rejects.toThrow("redirect:/account-unavailable");
  });

  it("redirects a client who has not accepted the current terms", async () => {
    requireClientAccess.mockRejectedValue(new LegalAcceptanceRequiredError());

    await expect(PrivateLayout({ children: null })).rejects.toThrow(
      "redirect:/accept-terms",
    );
  });

  it("redirects unauthenticated users to login", async () => {
    requireClientAccess.mockRejectedValue(new AuthRequiredError());

    await expect(PrivateLayout({ children: null })).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("redirects blocked and soft-deleted accounts to an explanation", async () => {
    requireClientAccess.mockRejectedValue(new AccountUnavailableError());

    await expect(PrivateLayout({ children: null })).rejects.toThrow(
      "redirect:/account-unavailable",
    );
  });
});
