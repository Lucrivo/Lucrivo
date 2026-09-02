import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
  ServiceDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { getOwnedReport } from "./get-report.service";

const command: ServiceDiagnosisCommand = {
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
const snapshot = buildServiceReportSnapshot(
  command,
  calculateServiceReport(command),
);
const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: null,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const productSnapshot = buildProductReportSnapshot(
  productCommand,
  calculateProductReport(productCommand),
);
const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  costCompositionEnabled: false,
  productionUnitCostCents: 5000,
  materialUnitCostCents: null,
  packagingUnitCostCents: null,
  directLaborUnitCostCents: null,
  otherVariableUnitCostCents: null,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: null,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const productionSnapshot = buildProductionReportSnapshot(
  productionCommand,
  calculateProductionReport(productionCommand),
);

describe("getOwnedReport", () => {
  const select = vi.fn();
  const byId = vi.fn();
  const byUser = vi.fn();
  const maybeSingle = vi.fn();
  const from = vi.fn();
  const supabase = { from };

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select });
    select.mockReturnValue({ eq: byId });
    byId.mockReturnValue({ eq: byUser });
    byUser.mockReturnValue({ maybeSingle });
    maybeSingle.mockResolvedValue({
      data: {
        id: 42,
        business_category: "service",
        scenario: "hour",
        created_at: "2026-08-28T22:30:00.000Z",
        report_snapshot: snapshot,
      },
      error: null,
    });
  });

  async function get(diagnosisId: string = "42") {
    return getOwnedReport({
      supabase: supabase as never,
      userId: "trusted-user",
      diagnosisId,
    });
  }

  it("selects one owned report without leaking foreign rows", async () => {
    await expect(get()).resolves.toEqual({
      status: "found",
      report: {
        id: 42,
        createdAt: "2026-08-28T22:30:00.000Z",
        snapshot,
      },
    });
    expect(from).toHaveBeenCalledWith("diagnoses");
    expect(select).toHaveBeenCalledWith(
      "id, business_category, scenario, created_at, report_snapshot",
    );
    expect(byId).toHaveBeenCalledWith("id", 42);
    expect(byUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it.each(["", "0", "-1", "1.5", "abc", "9007199254740992"])(
    "treats malformed id %s as not found before querying",
    async (diagnosisId) => {
      await expect(get(diagnosisId)).resolves.toEqual({ status: "not_found" });
      expect(from).not.toHaveBeenCalled();
    },
  );

  it("treats missing or foreign reports identically", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(get()).resolves.toEqual({ status: "not_found" });
  });

  it("returns read_failed for a technical database error", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "XX001", message: "private provider detail" },
    });

    await expect(get()).resolves.toEqual({ status: "read_failed" });
  });

  it("returns unavailable for an owned malformed snapshot", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 42,
        business_category: "service",
        scenario: "hour",
        created_at: "2026-08-28T22:30:00.000Z",
        report_snapshot: { schemaVersion: 99 },
      },
      error: null,
    });

    await expect(get()).resolves.toEqual({
      status: "unavailable",
      report: { id: 42, createdAt: "2026-08-28T22:30:00.000Z" },
    });
  });

  it("returns unavailable when denormalized identity disagrees with snapshot", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 42,
        business_category: "service",
        scenario: "minute",
        created_at: "2026-08-28T22:30:00.000Z",
        report_snapshot: snapshot,
      },
      error: null,
    });

    await expect(get()).resolves.toEqual({
      status: "unavailable",
      report: { id: 42, createdAt: "2026-08-28T22:30:00.000Z" },
    });
  });

  it("accepts a matching Product category and resale scenario", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 84,
        business_category: "product",
        scenario: "resale",
        created_at: "2026-08-31T15:00:00.000Z",
        report_snapshot: productSnapshot,
      },
      error: null,
    });

    await expect(get("84")).resolves.toEqual({
      status: "found",
      report: {
        id: 84,
        createdAt: "2026-08-31T15:00:00.000Z",
        snapshot: productSnapshot,
      },
    });
  });

  it("rejects mismatched Product identity without exposing its snapshot", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 84,
        business_category: "product",
        scenario: "hour",
        created_at: "2026-08-31T15:00:00.000Z",
        report_snapshot: productSnapshot,
      },
      error: null,
    });

    await expect(get("84")).resolves.toEqual({
      status: "unavailable",
      report: { id: 84, createdAt: "2026-08-31T15:00:00.000Z" },
    });
  });

  it("accepts a matching Production category and manufacturing scenario", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 126,
        business_category: "production",
        scenario: "manufacturing",
        created_at: "2026-09-01T15:00:00.000Z",
        report_snapshot: productionSnapshot,
      },
      error: null,
    });

    await expect(get("126")).resolves.toEqual({
      status: "found",
      report: {
        id: 126,
        createdAt: "2026-09-01T15:00:00.000Z",
        snapshot: productionSnapshot,
      },
    });
  });

  it("rejects mismatched Production identity without exposing its snapshot", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 126,
        business_category: "production",
        scenario: "resale",
        created_at: "2026-09-01T15:00:00.000Z",
        report_snapshot: productionSnapshot,
      },
      error: null,
    });

    await expect(get("126")).resolves.toEqual({
      status: "unavailable",
      report: { id: 126, createdAt: "2026-09-01T15:00:00.000Z" },
    });
  });

  it("sanitizes thrown client failures", async () => {
    maybeSingle.mockRejectedValue(new Error("private provider detail"));

    await expect(get()).resolves.toEqual({ status: "read_failed" });
  });
});
