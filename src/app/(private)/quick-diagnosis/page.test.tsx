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
  requireUser,
} = vi.hoisted(() => ({
  createDetailedDiagnosis: vi.fn(),
  createProductDiagnosis: vi.fn(),
  createProductionDiagnosis: vi.fn(),
  createServiceDiagnosis: vi.fn(),
  DiagnosisLimitCard: vi.fn(() => <div>Limite do diagnóstico</div>),
  getBillingOverview: vi.fn(),
  QuickDiagnosisWizard: vi.fn(() => <div>Wizard do diagnóstico</div>),
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

import QuickDiagnosisPage from "./page";

describe("QuickDiagnosisPage", () => {
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
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
