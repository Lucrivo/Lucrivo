import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { buildServiceReportSnapshot } from "@/modules/reports/domain/build-service-report-snapshot";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";

const { getOwnedReport } = vi.hoisted(() => ({
  getOwnedReport: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/reports/services/get-report.service", () => ({
  getOwnedReport,
}));

import {
  parseClientDashboardFilters,
  toClientDashboardRpcArgs,
} from "./client-dashboard.filters";
import {
  ClientDashboardUnavailableError,
  getClientDashboard,
} from "./get-client-dashboard.service";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8_000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};
const reportSnapshot = buildServiceReportSnapshot(
  serviceCommand,
  calculateServiceReport(serviceCommand),
);

const validSnapshot = {
  generatedAt: "2026-10-01T12:00:00.000Z",
  filters: {
    from: null,
    to: null,
    categories: [],
    modes: [],
    scenarios: [],
    verdicts: [],
    priorities: [],
    dataState: "all",
  },
  hasAnyReports: true,
  focusReportId: 42,
  metrics: {
    totalReports: 1,
    positiveResultReports: 1,
    lossReports: 0,
    pendingDataReports: 0,
  },
  verdictCounts: [
    { verdict: "missing_price", count: 0 },
    { verdict: "direct_loss", count: 0 },
    { verdict: "incomplete_volume", count: 0 },
    { verdict: "operational_loss", count: 0 },
    { verdict: "no_sales", count: 0 },
    { verdict: "break_even", count: 0 },
    { verdict: "positive_result", count: 1 },
  ],
  priorityCounts: [
    { priority: "cost", count: 0 },
    { priority: "data", count: 0 },
    { priority: "price", count: 0 },
    { priority: "margin", count: 1 },
    { priority: "volume", count: 0 },
  ],
  recentReports: [
    {
      id: 42,
      businessCategory: "service",
      scenario: "hour",
      analysisMode: "quick",
      createdAt: "2026-09-30T18:30:00.000Z",
      updatedAt: "2026-09-30T18:30:00.000Z",
      verdict: "positive_result",
      priority: "margin",
      hasPendingData: false,
      itemCount: null,
      realMarginBasisPoints: 3_426,
      monthlyResultCents: null,
      schemaVersion: 4,
      calculationVersion: 3,
      contentVersion: 6,
    },
  ],
} as const;

describe("getClientDashboard", () => {
  const rpc = vi.fn();
  const supabase = { rpc };
  const filters = parseClientDashboardFilters({ category: "service" });

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: validSnapshot, error: null });
    getOwnedReport.mockResolvedValue({
      status: "found",
      report: {
        id: 42,
        createdAt: "2026-09-30T18:30:00.000Z",
        updatedAt: "2026-09-30T18:30:00.000Z",
        version: 0,
        snapshot: reportSnapshot,
      },
    });
  });

  async function load() {
    return getClientDashboard({
      supabase: supabase as never,
      userId: "trusted-user",
      filters,
    });
  }

  it("loads one aggregate snapshot and one validated focus report", async () => {
    const result = await load();

    expect(rpc).toHaveBeenCalledWith(
      "get_client_dashboard_v1",
      toClientDashboardRpcArgs(filters),
    );
    expect(getOwnedReport).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      diagnosisId: "42",
    });
    expect(result.dashboard.metrics).toEqual(validSnapshot.metrics);
    expect(result.dashboard.recentReports[0]).toMatchObject({
      title: "Diagnóstico de Serviço",
      verdict: { label: "Resultado positivo", tone: "success" },
      realMarginLabel: "34,26%",
    });
    expect(result.focus).toMatchObject({
      status: "ready",
      report: { id: 42, openHref: "/reports/42" },
    });
  });

  it("skips the focus read when the aggregate has no focus id", async () => {
    rpc.mockResolvedValue({
      data: { ...validSnapshot, focusReportId: null, recentReports: [] },
      error: null,
    });

    await expect(load()).resolves.toMatchObject({ focus: { status: "none" } });
    expect(getOwnedReport).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "not_found", "read_failed"] as const)(
    "isolates a %s focus result from the aggregate overview",
    async (status) => {
      getOwnedReport.mockResolvedValue(
        status === "unavailable"
          ? { status, report: { id: 42, createdAt: "2026-09-30T18:30:00Z" } }
          : { status },
      );

      await expect(load()).resolves.toMatchObject({
        dashboard: { metrics: validSnapshot.metrics },
        focus: { status: "unavailable", reportId: 42 },
      });
    },
  );

  it("isolates an unexpected focus read failure", async () => {
    getOwnedReport.mockRejectedValue(new Error("private provider detail"));

    await expect(load()).resolves.toMatchObject({
      focus: { status: "unavailable", reportId: 42 },
    });
  });

  it.each([
    [{ data: null, error: { message: "private database detail" } }],
    [{ data: { malformed: true }, error: null }],
  ])("uses the stable aggregate error for %j", async (rpcResult) => {
    rpc.mockResolvedValue(rpcResult);

    const rejection = expect(load()).rejects;
    await rejection.toBeInstanceOf(ClientDashboardUnavailableError);
    await rejection.toThrow("client_dashboard_unavailable");
    await rejection.not.toThrow(/private|malformed/i);
    expect(getOwnedReport).not.toHaveBeenCalled();
  });

  it("translates a thrown RPC failure to the stable aggregate error", async () => {
    rpc.mockRejectedValue(new Error("network detail"));

    await expect(load()).rejects.toEqual(
      expect.objectContaining({ message: "client_dashboard_unavailable" }),
    );
  });
});
