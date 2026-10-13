import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireClientAccess,
  redirect,
  rpc,
  readLaunchOfferEnvironment,
  getBillingOverview,
} = vi.hoisted(() => ({
  requireClientAccess: vi.fn(),
  rpc: vi.fn(),
  readLaunchOfferEnvironment: vi.fn(),
  getBillingOverview: vi.fn(),
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
    launchOfferStrip,
  }: {
    children: React.ReactNode;
    isAdminUser: boolean;
    launchOfferStrip: {
      endsAt: string;
      freeQuickDiagnosisUsed: boolean;
    } | null;
  }) => (
    <div
      data-testid="private-shell"
      data-admin-user={isAdminUser}
      data-offer-ends-at={launchOfferStrip?.endsAt}
      data-free-diagnosis-used={launchOfferStrip?.freeQuickDiagnosisUsed}
    >
      {children}
    </div>
  ),
}));
vi.mock("@/config/launch-offer-environment", () => ({
  readLaunchOfferEnvironment,
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
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "expired",
      catalogCode: "standard",
      startsAt: "2026-10-20T12:00:00.000Z",
      endsAt: "2026-11-04T12:00:00.000Z",
    });
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
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "active",
      catalogCode: "launch",
      startsAt: "2026-10-20T12:00:00.000Z",
      endsAt: "2026-11-04T12:00:00.000Z",
    });
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
    expect(screen.getByTestId("private-shell")).not.toHaveAttribute(
      "data-offer-ends-at",
    );
  });

  it.each([false, true])(
    "passes the active offer state for a free user with diagnosis-used=%s",
    async (freeQuickDiagnosisUsed) => {
      readLaunchOfferEnvironment.mockReturnValue({
        phase: "active",
        catalogCode: "launch",
        startsAt: "2026-10-20T12:00:00.000Z",
        endsAt: "2026-11-04T12:00:00.000Z",
      });
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview: {
          tier: "free",
          freeQuickDiagnosisUsed,
        },
      });

      render(await PrivateLayout({ children: <p>Área privada</p> }));

      expect(screen.getByTestId("private-shell")).toHaveAttribute(
        "data-offer-ends-at",
        "2026-11-04T12:00:00.000Z",
      );
      expect(screen.getByTestId("private-shell")).toHaveAttribute(
        "data-free-diagnosis-used",
        String(freeQuickDiagnosisUsed),
      );
    },
  );

  it.each(["paid", "courtesy"])(
    "suppresses the strip for a %s user",
    async (tier) => {
      readLaunchOfferEnvironment.mockReturnValue({
        phase: "active",
        catalogCode: "launch",
        startsAt: "2026-10-20T12:00:00.000Z",
        endsAt: "2026-11-04T12:00:00.000Z",
      });
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview: { tier, freeQuickDiagnosisUsed: true },
      });

      render(await PrivateLayout({ children: <p>Área privada</p> }));

      expect(screen.getByTestId("private-shell")).not.toHaveAttribute(
        "data-offer-ends-at",
      );
    },
  );

  it("keeps protected content available when campaign or billing reads are unusable", async () => {
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "invalid",
      catalogCode: null,
      startsAt: null,
      endsAt: null,
    });

    const { rerender } = render(
      await PrivateLayout({ children: <p>Campanha inválida</p> }),
    );
    expect(screen.getByTestId("private-shell")).toHaveTextContent(
      "Campanha inválida",
    );
    expect(getBillingOverview).not.toHaveBeenCalled();

    readLaunchOfferEnvironment.mockReturnValue({
      phase: "active",
      catalogCode: "launch",
      startsAt: "2026-10-20T12:00:00.000Z",
      endsAt: "2026-11-04T12:00:00.000Z",
    });
    getBillingOverview.mockResolvedValue({ status: "read_failed" });
    rerender(await PrivateLayout({ children: <p>Leitura indisponível</p> }));

    expect(screen.getByTestId("private-shell")).toHaveTextContent(
      "Leitura indisponível",
    );
    expect(screen.getByTestId("private-shell")).not.toHaveAttribute(
      "data-offer-ends-at",
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
