import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceDiagnosisCommand } from "../types";

vi.mock("server-only", () => ({}));

import { createServiceDiagnosisService } from "./create-service-diagnosis.service";

const hourCommand: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 500000,
  fixedMonthlyExpensesCents: 120000,
  workHoursPeriod: "day",
  workPeriodMinutes: 480,
  monthlyWorkMinutes: 10392,
  weeklyWorkDays: 5,
  hourlyRateCents: 12590,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 3050,
  taxRateBasisPoints: 625,
  cardFeeRateBasisPoints: 350,
};

const minuteCommand: ServiceDiagnosisCommand = {
  ...hourCommand,
  pricingMethod: "minute",
  hourlyRateCents: 0,
  minuteRateCents: 250,
};

const appointmentCommand: ServiceDiagnosisCommand = {
  ...hourCommand,
  pricingMethod: "appointment",
  hourlyRateCents: 0,
  appointmentRateCents: 35000,
  appointmentDurationMinutes: 90,
};

describe("createServiceDiagnosisService", () => {
  const insert = vi.fn();
  const insertSelect = vi.fn();
  const insertSingle = vi.fn();
  const lookupSelect = vi.fn();
  const lookupByUser = vi.fn();
  const lookupBySubmission = vi.fn();
  const lookupMaybeSingle = vi.fn();
  const from = vi.fn();
  const supabase = { from };

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ insert, select: lookupSelect });
    insert.mockReturnValue({ select: insertSelect });
    insertSelect.mockReturnValue({ single: insertSingle });
    lookupSelect.mockReturnValue({ eq: lookupByUser });
    lookupByUser.mockReturnValue({ eq: lookupBySubmission });
    lookupBySubmission.mockReturnValue({ maybeSingle: lookupMaybeSingle });
    insertSingle.mockResolvedValue({ data: { id: 42 }, error: null });
    lookupMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  async function create(command: ServiceDiagnosisCommand = hourCommand) {
    return createServiceDiagnosisService({
      supabase: supabase as never,
      userId: "trusted-user",
      command,
    });
  }

  it.each([
    [hourCommand, 12590, 0, 0, 0],
    [minuteCommand, 0, 250, 0, 0],
    [appointmentCommand, 0, 0, 35000, 90],
  ] satisfies [ServiceDiagnosisCommand, number, number, number, number][])(
    "persists every field for %s pricing",
    async (
      command,
      hourlyRateCents,
      minuteRateCents,
      appointmentRateCents,
      appointmentDurationMinutes,
    ) => {
      await expect(create(command)).resolves.toEqual({
        status: "success",
        diagnosisId: 42,
      });
      expect(from).toHaveBeenCalledWith("service_diagnoses");
      expect(insert).toHaveBeenCalledWith({
        submission_id: command.submissionId,
        user_id: "trusted-user",
        business_category: "service",
        pricing_method: command.pricingMethod,
        desired_monthly_income_cents: command.desiredMonthlyIncomeCents,
        fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
        work_hours_period: command.workHoursPeriod,
        work_period_minutes: command.workPeriodMinutes,
        monthly_work_minutes: command.monthlyWorkMinutes,
        weekly_work_days: command.weeklyWorkDays,
        hourly_rate_cents: hourlyRateCents,
        minute_rate_cents: minuteRateCents,
        appointment_rate_cents: appointmentRateCents,
        appointment_duration_minutes: appointmentDurationMinutes,
        material_unit_cost_cents: command.materialUnitCostCents,
        tax_rate_basis_points: command.taxRateBasisPoints,
        card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
      });
      expect(insertSelect).toHaveBeenCalledWith("id");
      expect(insertSingle).toHaveBeenCalledOnce();
    },
  );

  it("returns the owned diagnosis for an idempotent retry", async () => {
    insertSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "service_diagnoses_user_submission_key"',
      },
    });
    lookupMaybeSingle.mockResolvedValue({
      data: { id: 73 },
      error: null,
    });

    await expect(create()).resolves.toEqual({
      status: "success",
      diagnosisId: 73,
    });
    expect(lookupSelect).toHaveBeenCalledWith("id");
    expect(lookupByUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(lookupBySubmission).toHaveBeenCalledWith(
      "submission_id",
      hourCommand.submissionId,
    );
    expect(lookupMaybeSingle).toHaveBeenCalledOnce();
  });

  it.each([
    [{ data: null, error: null }],
    [{ data: null, error: { message: "lookup provider detail" } }],
  ])(
    "returns a safe error when retry lookup cannot recover",
    async (lookup) => {
      insertSingle.mockResolvedValue({
        data: null,
        error: {
          code: "23505",
          message: "service_diagnoses_user_submission_key",
        },
      });
      lookupMaybeSingle.mockResolvedValue(lookup);

      await expect(create()).resolves.toEqual({
        status: "error",
        error: "create_failed",
      });
    },
  );

  it("does not look up an unrelated unique collision", async () => {
    insertSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "another_unique_constraint",
      },
    });

    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
    expect(lookupSelect).not.toHaveBeenCalled();
  });

  it("does not look up another provider error", async () => {
    insertSingle.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "provider detail" },
    });

    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
    expect(lookupSelect).not.toHaveBeenCalled();
  });

  it("sanitizes thrown provider failures", async () => {
    insertSingle.mockRejectedValue(
      new Error("database failed for private@example.com"),
    );

    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
    expect(lookupSelect).not.toHaveBeenCalled();
  });

  it("sanitizes a thrown idempotency lookup failure", async () => {
    insertSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "service_diagnoses_user_submission_key",
      },
    });
    lookupMaybeSingle.mockRejectedValue(
      new Error("lookup failed for private@example.com"),
    );

    await expect(create()).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });
});
