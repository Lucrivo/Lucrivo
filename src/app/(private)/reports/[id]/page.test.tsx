import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProductDiagnosisCommand,
  ServiceDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";
import { buildProductReportSnapshot } from "@/modules/reports/domain/build-product-report-snapshot";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";

const { getOwnedReport, notFound, requireUser } = vi.hoisted(() => ({
  getOwnedReport: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  requireUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/reports/services/get-report.service", () => ({
  getOwnedReport,
  parseDiagnosisId: (value: string) => {
    if (!/^[1-9]\d*$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  },
}));
import ReportPage from "./page";

const serviceCommand: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  workHoursPeriod: "month",
  workPeriodMinutes: 6000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const legacyServiceSnapshot = {
  ...buildServiceReportSnapshot(
    serviceCommand,
    calculateServiceReport(serviceCommand),
  ),
  contentVersion: 3 as const,
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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

describe("ReportPage", () => {
  const supabase = { from: vi.fn() };
  const snapshot = legacyServiceSnapshot;

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: {
        id: 42,
        createdAt: "2026-08-28T22:30:00.000Z",
        snapshot,
      },
    });
  });

  async function renderPage(id = "42") {
    render(await ReportPage({ params: Promise.resolve({ id }) }));
  }

  it("renders an owned legacy Service snapshot with legacy labels", async () => {
    await renderPage();

    expect(screen.getByText("Seu relatório financeiro")).toBeInTheDocument();
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getOwnedReport).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      diagnosisId: "42",
    });
  });

  it("renders an owned current Product snapshot with plain labels", async () => {
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: {
        id: 84,
        createdAt: "2026-08-31T15:00:00.000Z",
        snapshot: currentProductSnapshot,
      },
    });

    await renderPage("84");

    expect(
      screen.getByText("Resultado do seu diagnóstico"),
    ).toBeInTheDocument();
  });

  it.each(["abc", "0"])("calls notFound for malformed id %s", async (id) => {
    await expect(
      ReportPage({ params: Promise.resolve({ id }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
    expect(getOwnedReport).not.toHaveBeenCalled();
  });

  it("calls notFound for missing or foreign reports", async () => {
    getOwnedReport.mockResolvedValue({ status: "not_found" });

    await expect(
      ReportPage({ params: Promise.resolve({ id: "42" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
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
  });

  it("throws a safe route error for a transient read failure", async () => {
    getOwnedReport.mockResolvedValue({ status: "read_failed" });

    await expect(
      ReportPage({ params: Promise.resolve({ id: "42" }) }),
    ).rejects.toThrow("report_read_failed");
  });
});
