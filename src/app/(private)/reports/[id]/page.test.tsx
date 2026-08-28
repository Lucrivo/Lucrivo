import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getOwnedReport,
  notFound,
  ReportDetail,
  requireUser,
  toReportViewModel,
} = vi.hoisted(() => ({
  getOwnedReport: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  ReportDetail: vi.fn(() => <div>Detalhe renderizado</div>),
  requireUser: vi.fn(),
  toReportViewModel: vi.fn(() => ({ identity: { id: 42 } })),
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
vi.mock("@/modules/reports/presenters/to-report-view-model", () => ({
  toReportViewModel,
}));
vi.mock("@/modules/reports/components/report-detail", () => ({
  ReportDetail,
}));

import ReportPage from "./page";

describe("ReportPage", () => {
  const supabase = { from: vi.fn() };
  const snapshot = { schemaVersion: 1, category: "service" };

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

  it("loads the owned snapshot and renders the formatted detail", async () => {
    await renderPage();

    expect(screen.getByText("Detalhe renderizado")).toBeInTheDocument();
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getOwnedReport).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      diagnosisId: "42",
    });
    expect(toReportViewModel).toHaveBeenCalledWith({
      id: 42,
      createdAt: "2026-08-28T22:30:00.000Z",
      snapshot,
    });
    expect(ReportDetail).toHaveBeenCalledWith(
      { viewModel: { identity: { id: 42 } } },
      undefined,
    );
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
    expect(ReportDetail).not.toHaveBeenCalled();
  });

  it("throws a safe route error for a transient read failure", async () => {
    getOwnedReport.mockResolvedValue({ status: "read_failed" });

    await expect(
      ReportPage({ params: Promise.resolve({ id: "42" }) }),
    ).rejects.toThrow("report_read_failed");
  });
});
