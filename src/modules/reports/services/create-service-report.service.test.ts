import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

vi.mock("server-only", () => ({}));

import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { createServiceReport } from "./create-service-report.service";

const command: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 500000,
  fixedMonthlyExpensesCents: 120000,
  monthlyWorkMinutes: 9600,
  weeklyWorkDays: 5,
  hourlyRateCents: 12590,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  taxRateBasisPoints: 625,
  cardFeeRateBasisPoints: 350,
};

const calculation = calculateServiceReport(command);
const snapshot = buildServiceReportSnapshot(command, calculation);

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

  it("persists normalized input, versions, snapshot, and summary in one RPC", async () => {
    await expect(create()).resolves.toEqual({
      status: "success",
      diagnosisId: 42,
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_service_diagnosis_report", {
      p_submission_id: command.submissionId,
      p_pricing_method: "hour",
      p_desired_monthly_income_cents: 500000,
      p_fixed_monthly_expenses_cents: 120000,
      p_monthly_work_minutes: 9600,
      p_weekly_work_days: 5,
      p_hourly_rate_cents: 12590,
      p_minute_rate_cents: 0,
      p_appointment_rate_cents: 0,
      p_appointment_duration_minutes: 0,
      p_tax_rate_basis_points: 625,
      p_card_fee_rate_basis_points: 350,
      p_schema_version: 2,
      p_calculation_version: 1,
      p_content_version: 2,
      p_scenario: "hour",
      p_current_price_cents: snapshot.results.currentPriceCents,
      p_real_margin_basis_points: snapshot.results.realMarginBasisPoints,
      p_unit_profit_cents: snapshot.results.unitProfitCents,
      p_verdict: snapshot.results.verdict,
      p_priority: snapshot.results.priority,
      p_unit: "hour",
      p_report_snapshot: snapshot,
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("user_id");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_user_id");
  });

  it("returns a safe error for a PostgREST failure", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX001", message: "private provider detail" },
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
    rpc.mockRejectedValue(new Error("database failed for private@example.com"));

    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });
});
