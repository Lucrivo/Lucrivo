import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

vi.mock("server-only", () => ({}));

import { calculateServiceReport } from "../domain/calculate-service-report";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { createServiceReport } from "./create-service-report.service";

const command: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 500_000,
  fixedMonthlyExpensesCents: 120_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 3_079,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 625,
  cardFeeRateBasisPoints: 350,
  source: {
    pricingMethod: "month",
    currentPriceCents: 400_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

const snapshot = buildServiceReportSnapshot(
  command,
  calculateServiceReport(command),
);

describe("createServiceReport", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: 42, error: null });
  });

  async function create() {
    return createServiceReport({
      supabase: supabase as never,
      command,
      snapshot,
    });
  }

  it("persists source and canonical values through the V4 RPC", async () => {
    await expect(create()).resolves.toEqual({
      status: "success",
      diagnosisId: 42,
    });
    expect(rpc).toHaveBeenCalledWith(
      "create_service_diagnosis_report_v4",
      expect.objectContaining({
        p_submission_id: command.submissionId,
        p_pricing_method: "hour",
        p_hourly_rate_cents: 3_079,
        p_source_pricing_method: "month",
        p_source_current_price_cents: 400_000,
        p_source_material_cost_unit: null,
        p_source_material_cost_cents: 0,
        p_daily_work_minutes: 360,
        p_source_appointment_duration_minutes: 0,
        p_schema_version: 4,
        p_calculation_version: 3,
        p_content_version: 5,
        p_scenario: "month",
        p_report_snapshot: snapshot,
      }),
    );
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_user_id");
  });

  it("returns a safe error for a PostgREST failure", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "private" } });
    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });

  it("maps only the database free-report limit to limit_reached", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "free_report_limit_reached" },
    });

    await expect(create()).resolves.toEqual({
      status: "error",
      error: "limit_reached",
    });

    rpc.mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "another_failure",
        details: "private provider detail",
      },
    });
    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });

  it.each([null, 0, -1, 1.5, "42"])(
    "returns a safe error for invalid RPC id %s",
    async (data) => {
      rpc.mockResolvedValue({ data, error: null });
      await expect(create()).resolves.toEqual({
        status: "error",
        error: "create_failed",
      });
    },
  );

  it("sanitizes a thrown provider exception", async () => {
    rpc.mockRejectedValue(new Error("private database failure"));
    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });
});
