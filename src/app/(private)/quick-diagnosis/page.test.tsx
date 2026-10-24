import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createDetailedDiagnosis,
  createProductDiagnosis,
  createProductionDiagnosis,
  createServiceDiagnosis,
  DiagnosisLimitCard,
  getBillingOverview,
  QuickDiagnosisWizard,
  readLaunchOfferEnvironment,
  requireUser,
} = vi.hoisted(() => ({
  createDetailedDiagnosis: vi.fn(),
  createProductDiagnosis: vi.fn(),
  createProductionDiagnosis: vi.fn(),
  createServiceDiagnosis: vi.fn(),
  DiagnosisLimitCard: vi.fn(() => <div>Limite do diagnóstico</div>),
  getBillingOverview: vi.fn(),
  QuickDiagnosisWizard: vi.fn(() => <div>Wizard do diagnóstico</div>),
  readLaunchOfferEnvironment: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock(
  "@/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action",
  () => ({ createDetailedDiagnosis }),
);

vi.mock(
  "@/modules/quick-diagnosis/actions/create-service-diagnosis.action",
  () => ({ createServiceDiagnosis }),
);
vi.mock(
  "@/modules/quick-diagnosis/actions/create-product-diagnosis.action",
  () => ({ createProductDiagnosis }),
);
vi.mock(
  "@/modules/quick-diagnosis/actions/create-production-diagnosis.action",
  () => ({ createProductionDiagnosis }),
);
vi.mock("@/modules/quick-diagnosis/components/quick-diagnosis-wizard", () => ({
  QuickDiagnosisWizard,
}));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview,
}));
vi.mock("@/modules/billing/components/diagnosis-limit-card", () => ({
  DiagnosisLimitCard,
}));
vi.mock("@/config/launch-offer-environment", () => ({
  readLaunchOfferEnvironment,
}));

import QuickDiagnosisPage from "./page";

describe("QuickDiagnosisPage", () => {
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "bonus_active",
      catalogCode: "launch",
      startsAt: "2026-10-20T12:00:00.000Z",
      bonusEndsAt: "2026-11-04T12:00:00.000Z",
      promotionEndsAt: "2026-11-19T12:00:00.000Z",
      endsAt: "2026-11-04T12:00:00.000Z",
    });
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: false,
        contract: null,
      },
    });
  });

  it("also enables the completion offer during the price-only window", async () => {
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "price_active",
      catalogCode: "launch_price",
      startsAt: "2026-10-20T12:00:00.000Z",
      bonusEndsAt: "2026-11-04T12:00:00.000Z",
      promotionEndsAt: "2026-11-19T12:00:00.000Z",
      endsAt: "2026-11-19T12:00:00.000Z",
    });

    await renderPage();

    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      expect.objectContaining({ offerOnCompletion: true }),
      undefined,
    );
  });

  async function renderPage(
    searchParams: {
      resume?: string | string[];
      category?: string | string[];
    } = {},
  ) {
    render(
      await QuickDiagnosisPage({
        searchParams: Promise.resolve(searchParams),
      }),
    );
  }

  it("preflights access and composes the wizard with the server actions", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Diagnóstico rápido", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Wizard do diagnóstico")).toBeInTheDocument();
    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      {
        userId: "trusted-user",
        canCreateDetailedDiagnosis: false,
        offerOnCompletion: true,
        createProductDiagnosis,
        createProductionDiagnosis,
        createServiceDiagnosis,
        createDetailedDiagnosis,
      },
      undefined,
    );
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getBillingOverview).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
    });
  });

  it("enables the completion offer during the standard period", async () => {
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "expired",
      catalogCode: "standard",
      startsAt: "2026-09-01T12:00:00.000Z",
      bonusEndsAt: "2026-09-16T12:00:00.000Z",
      promotionEndsAt: "2026-10-01T12:00:00.000Z",
    });

    await renderPage();

    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      expect.objectContaining({ offerOnCompletion: true }),
      undefined,
    );
  });

  it("does not mark completion when the offer configuration is invalid", async () => {
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "invalid",
      catalogCode: null,
      startsAt: null,
      bonusEndsAt: null,
      promotionEndsAt: null,
    });

    await renderPage();

    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      expect.objectContaining({ offerOnCompletion: false }),
      undefined,
    );
  });

  it("renders the limit card instead of mounting the wizard", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: false,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: true,
        contract: null,
      },
    });

    await renderPage();

    expect(screen.getByText("Limite do diagnóstico")).toBeInTheDocument();
    expect(DiagnosisLimitCard).toHaveBeenCalledOnce();
    expect(QuickDiagnosisWizard).not.toHaveBeenCalled();
  });

  it("fails closed when the billing overview cannot be loaded", async () => {
    getBillingOverview.mockResolvedValue({ status: "read_failed" });

    await expect(
      QuickDiagnosisPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("billing_overview_read_failed");
    expect(QuickDiagnosisWizard).not.toHaveBeenCalled();
  });

  it("resumes a product diagnosis only for a capable paid return", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: true,
        freeQuickDiagnosisUsed: true,
        contract: null,
      },
    });

    await renderPage({ resume: "detailed", category: "product" });

    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "trusted-user",
        canCreateDetailedDiagnosis: true,
        initialDetailedCategory: "product",
        offerOnCompletion: false,
      }),
      undefined,
    );
  });

  it("ignores resume values that are not an exact detailed category", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: true,
        freeQuickDiagnosisUsed: true,
        contract: null,
      },
    });

    await renderPage({ resume: "detailed", category: "service" });

    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      expect.not.objectContaining({
        initialDetailedCategory: expect.anything(),
      }),
      undefined,
    );
  });
});
