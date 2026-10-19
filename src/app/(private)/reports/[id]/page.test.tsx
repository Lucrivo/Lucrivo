import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProductDiagnosisCommand,
  NormalizedServiceDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";
import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import { buildDetailedReportSnapshot } from "@/modules/reports/domain/build-detailed-report-snapshot";
import { buildProductReportSnapshot } from "@/modules/reports/domain/build-product-report-snapshot";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";

const {
  getBillingOverview,
  getOwnedReport,
  getReportAiHistory,
  LaunchOfferDialog,
  listActivePrices,
  ReportAiAssistant,
  readLaunchOfferEnvironment,
  notFound,
  requireUser,
} = vi.hoisted(() => ({
  getBillingOverview: vi.fn(),
  getOwnedReport: vi.fn(),
  getReportAiHistory: vi.fn(),
  LaunchOfferDialog: vi.fn(({ dismissHref }: { dismissHref?: string }) => (
    <div data-testid="launch-offer-dialog">oferta:{dismissHref}</div>
  )),
  listActivePrices: vi.fn(),
  ReportAiAssistant: vi.fn(({ canAsk }: { canAsk: boolean }) => (
    <div>Assistente IA: {canAsk ? "ativo" : "somente leitura"}</div>
  )),
  readLaunchOfferEnvironment: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview,
}));
vi.mock("@/modules/billing/services/list-active-prices.service", () => ({
  listActivePrices,
}));
vi.mock("@/config/launch-offer-environment", () => ({
  readLaunchOfferEnvironment,
}));
vi.mock("@/modules/billing/components/launch-offer-dialog", () => ({
  LaunchOfferDialog,
}));
vi.mock("@/modules/report-ai/services/report-ai-store.service", () => ({
  getReportAiHistory,
}));
vi.mock("@/modules/report-ai/components/report-ai-assistant", () => ({
  ReportAiAssistant,
}));
vi.mock("@/modules/reports/services/get-report.service", () => ({
  getOwnedReport,
  parseDiagnosisId: (value: string) => {
    if (!/^[1-9]\d*$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  },
}));
vi.mock("@/modules/reports/components/report-management", () => ({
  ReportManagement: () => <div>Gerenciar relatório</div>,
}));
import ReportPage from "./page";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};
const currentServiceSnapshot = buildServiceReportSnapshot(
  serviceCommand,
  calculateServiceReport(serviceCommand),
);

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productKind: "resale",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const currentProductSnapshot = buildProductReportSnapshot(
  productCommand,
  calculateProductReport(productCommand),
);
const detailedCommand: DetailedDiagnosisCommand = {
  submissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  category: "product",
  fixedMonthlyExpensesCents: 100_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 10_000,
      monthlySalesVolume: 100,
      purchaseUnitCostCents: 5_000,
      packagingUnitCostCents: 0,
    },
  ],
};
const detailedSnapshot = buildDetailedReportSnapshot(
  detailedCommand,
  calculateDetailedDiagnosis(detailedCommand),
);

describe("ReportPage", () => {
  const supabase = { from: vi.fn() };
  const snapshot = currentServiceSnapshot;

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "paid",
        canCreateQuickDiagnosis: true,
        canCreateDetailedDiagnosis: true,
        freeQuickDiagnosisUsed: true,
      },
    });
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: {
        id: 42,
        createdAt: "2026-08-28T22:30:00.000Z",
        updatedAt: "2026-08-28T22:30:00.000Z",
        version: 0,
        snapshot,
      },
    });
    getReportAiHistory.mockResolvedValue({
      status: "success",
      history: {
        currentVersion: 0,
        selectedVersion: 0,
        versions: [],
        summary: "",
        turns: [],
      },
    });
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "bonus_active",
      catalogCode: "launch",
      startsAt: "2026-10-20T12:00:00.000Z",
      bonusEndsAt: "2026-11-04T12:00:00.000Z",
      promotionEndsAt: "2026-11-19T12:00:00.000Z",
      endsAt: "2026-11-04T12:00:00.000Z",
    });
    listActivePrices.mockResolvedValue({
      status: "success",
      prices: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          productCode: "quick_diagnosis_pro",
          catalogCode: "launch",
          billingMode: "monthly",
          amountCents: 3990,
          currency: "BRL",
          installmentLimit: null,
          accessMonths: 2,
          bonusMonths: 1,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          productCode: "quick_diagnosis_pro",
          catalogCode: "launch",
          billingMode: "semiannual",
          amountCents: 17940,
          currency: "BRL",
          installmentLimit: 6,
          accessMonths: 12,
          bonusMonths: 6,
        },
      ],
    });
  });

  async function renderPage(
    id = "42",
    searchParams: { launchOffer?: string | string[] } = {},
  ) {
    render(
      await ReportPage({
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve(searchParams),
      }),
    );
  }

  it("renders an owned current Service snapshot with plain labels", async () => {
    await renderPage();

    expect(
      screen.getByText("Resultado do seu diagnóstico"),
    ).toBeInTheDocument();
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getOwnedReport).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      diagnosisId: "42",
    });
    expect(screen.getByText("Assistente IA: ativo")).toBeVisible();
    expect(ReportAiAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        diagnosisId: 42,
        reportVersion: 0,
        canAsk: true,
      }),
      undefined,
    );
  });

  it("opens the active launch offer after the first free diagnosis", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: false,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: true,
      },
    });

    await renderPage("42", { launchOffer: "1" });

    expect(screen.getByTestId("launch-offer-dialog")).toHaveTextContent(
      "oferta:/reports/42",
    );
    expect(LaunchOfferDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "diagnosis",
        dismissHref: "/reports/42",
        offer: expect.objectContaining({
          phase: "bonus_active",
          endsAt: "2026-11-04T12:00:00.000Z",
          monthlyPriceLabel: "R$ 39,90",
          monthlyRenewalPriceLabel: "Depois, R$ 49,90/mês",
          monthlyBonusMonths: 1,
          semiannualBonusMonths: 6,
        }),
      }),
      undefined,
    );
    expect(listActivePrices).toHaveBeenCalledWith({
      supabase,
      catalogCode: "launch",
    });
  });

  it("uses the resolved launch_price catalog for a second-window completion offer", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: false,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: true,
      },
    });
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "price_active",
      catalogCode: "launch_price",
      startsAt: "2026-10-20T12:00:00.000Z",
      bonusEndsAt: "2026-11-04T12:00:00.000Z",
      promotionEndsAt: "2026-11-19T12:00:00.000Z",
      endsAt: "2026-11-19T12:00:00.000Z",
    });
    listActivePrices.mockResolvedValue({
      status: "success",
      prices: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          productCode: "quick_diagnosis_pro",
          catalogCode: "launch_price",
          billingMode: "monthly",
          amountCents: 3990,
          currency: "BRL",
          installmentLimit: null,
          accessMonths: 1,
          bonusMonths: 0,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          productCode: "quick_diagnosis_pro",
          catalogCode: "launch_price",
          billingMode: "semiannual",
          amountCents: 17940,
          currency: "BRL",
          installmentLimit: 6,
          accessMonths: 6,
          bonusMonths: 0,
        },
      ],
    });

    await renderPage("42", { launchOffer: "1" });

    expect(listActivePrices).toHaveBeenCalledWith({
      supabase,
      catalogCode: "launch_price",
    });
    expect(LaunchOfferDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        offer: expect.objectContaining({
          phase: "price_active",
          endsAt: "2026-11-19T12:00:00.000Z",
          monthlyAccessMonths: 1,
          monthlyBonusMonths: 0,
          semiannualAccessMonths: 6,
          semiannualBonusMonths: 0,
        }),
      }),
      undefined,
    );
  });

  it("does not open a completion offer without an active verified campaign", async () => {
    getBillingOverview.mockResolvedValue({
      status: "success",
      overview: {
        tier: "free",
        canCreateQuickDiagnosis: false,
        canCreateDetailedDiagnosis: false,
        freeQuickDiagnosisUsed: true,
      },
    });
    readLaunchOfferEnvironment.mockReturnValue({
      phase: "expired",
      catalogCode: "standard",
      startsAt: "2026-09-01T12:00:00.000Z",
      bonusEndsAt: "2026-09-16T12:00:00.000Z",
      promotionEndsAt: "2026-10-01T12:00:00.000Z",
    });

    await renderPage("42", { launchOffer: "1" });

    expect(screen.queryByTestId("launch-offer-dialog")).not.toBeInTheDocument();
    expect(listActivePrices).not.toHaveBeenCalled();
  });

  it("renders an owned current Product snapshot with plain labels", async () => {
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: {
        id: 84,
        createdAt: "2026-08-31T15:00:00.000Z",
        updatedAt: "2026-08-31T15:00:00.000Z",
        version: 0,
        snapshot: currentProductSnapshot,
      },
    });

    await renderPage("84");

    expect(
      screen.getByText("Resultado do seu diagnóstico"),
    ).toBeInTheDocument();
  });

  it("dispatches an owned Detailed snapshot to its dedicated presenter", async () => {
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: {
        id: 168,
        createdAt: "2026-09-17T15:00:00.000Z",
        updatedAt: "2026-09-17T15:00:00.000Z",
        version: 0,
        snapshot: detailedSnapshot,
      },
    });

    await renderPage("168");

    expect(
      screen.getByRole("heading", { name: "Resultado dos seus produtos" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Resultado do seu diagnóstico"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Assistente IA: ativo")).toBeVisible();
  });

  it.each(["free", "courtesy"])(
    "does not mount an empty assistant for the %s tier",
    async (tier) => {
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview:
          tier === "courtesy"
            ? {
                tier,
                canCreateQuickDiagnosis: true,
                canCreateDetailedDiagnosis: true,
                freeQuickDiagnosisUsed: true,
              }
            : {
                tier,
                canCreateQuickDiagnosis: false,
                canCreateDetailedDiagnosis: false,
                freeQuickDiagnosisUsed: true,
              },
      });

      await renderPage();

      expect(screen.queryByText(/Assistente IA:/)).not.toBeInTheDocument();
    },
  );

  it.each(["free", "courtesy"])(
    "keeps existing history readable for the %s tier",
    async (tier) => {
      getBillingOverview.mockResolvedValue({
        status: "success",
        overview:
          tier === "courtesy"
            ? {
                tier,
                canCreateQuickDiagnosis: true,
                canCreateDetailedDiagnosis: true,
                freeQuickDiagnosisUsed: true,
              }
            : {
                tier,
                canCreateQuickDiagnosis: false,
                canCreateDetailedDiagnosis: false,
                freeQuickDiagnosisUsed: true,
              },
      });
      getReportAiHistory.mockResolvedValue({
        status: "success",
        history: {
          currentVersion: 0,
          selectedVersion: 0,
          versions: [0],
          summary: "",
          turns: [],
        },
      });

      await renderPage();

      expect(screen.getByText("Assistente IA: somente leitura")).toBeVisible();
      expect(ReportAiAssistant).toHaveBeenCalledWith(
        expect.objectContaining({ canAsk: false }),
        undefined,
      );
    },
  );

  it("keeps the report visible when AI history cannot be loaded", async () => {
    getReportAiHistory.mockResolvedValue({ status: "read_failed" });

    await renderPage();

    expect(
      screen.getByText("Resultado do seu diagnóstico"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Assistente IA:/)).not.toBeInTheDocument();
  });

  it.each(["abc", "0"])("calls notFound for malformed id %s", async (id) => {
    await expect(
      ReportPage({
        params: Promise.resolve({ id }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
    expect(getOwnedReport).not.toHaveBeenCalled();
    expect(getReportAiHistory).not.toHaveBeenCalled();
  });

  it("calls notFound for missing or foreign reports", async () => {
    getOwnedReport.mockResolvedValue({ status: "not_found" });

    await expect(
      ReportPage({
        params: Promise.resolve({ id: "42" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
    expect(getReportAiHistory).not.toHaveBeenCalled();
  });

  it("renders a stable unavailable panel for an invalid owned snapshot", async () => {
    getOwnedReport.mockResolvedValue({
      status: "unavailable",
      report: { id: 42, createdAt: "2026-08-28T22:30:00.000Z" },
    });

    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Relatório indisponível" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver relatórios" }),
    ).toHaveAttribute("href", "/reports");
    expect(
      screen.getByRole("link", { name: "Novo diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(getReportAiHistory).not.toHaveBeenCalled();
  });

  it("throws a safe route error for a transient read failure", async () => {
    getOwnedReport.mockResolvedValue({ status: "read_failed" });

    await expect(
      ReportPage({
        params: Promise.resolve({ id: "42" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("report_read_failed");
    expect(getReportAiHistory).not.toHaveBeenCalled();
  });
});
