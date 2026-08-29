import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { getOwnedReport } from "./get-report.service";

const command: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const snapshot = buildServiceReportSnapshot(
  command,
  calculateServiceReport(command),
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

  it("sanitizes thrown client failures", async () => {
    maybeSingle.mockRejectedValue(new Error("private provider detail"));

    await expect(get()).resolves.toEqual({ status: "read_failed" });
  });
});
