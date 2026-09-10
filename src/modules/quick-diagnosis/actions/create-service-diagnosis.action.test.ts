import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceFlowSubmissionInput } from "../domain/service-flow";
import type { NormalizedServiceDiagnosisCommand } from "../types";

const {
  AuthRequiredError,
  buildServiceReportSnapshot,
  calculateServiceReport,
  composeServiceDiagnosisCommand,
  createServiceReport,
  requireUser,
  safeParse,
} = vi.hoisted(() => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  buildServiceReportSnapshot: vi.fn(),
  calculateServiceReport: vi.fn(),
  composeServiceDiagnosisCommand: vi.fn(),
  createServiceReport: vi.fn(),
  requireUser: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError,
  requireUser,
}));
vi.mock("server-only", () => ({}));
vi.mock("../schemas/service-flow.schema", () => ({
  serviceFlowSubmissionSchema: { safeParse },
}));
vi.mock("../domain/compose-service-diagnosis-command", () => ({
  composeServiceDiagnosisCommand,
}));
vi.mock("@/modules/reports/domain/calculate-service-report", () => ({
  calculateServiceReport,
}));
vi.mock("@/modules/reports/domain/build-service-report-snapshot", () => ({
  buildServiceReportSnapshot,
}));
vi.mock("@/modules/reports/services/create-service-report.service", () => ({
  createServiceReport,
}));

import { createServiceDiagnosis } from "./create-service-diagnosis.action";

const input: ServiceFlowSubmissionInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  desiredMonthlyIncome: "5000",
  fixedMonthlyExpenses: "2000",
  pricingMethod: "month",
  currentPrice: "4000",
  dailyWorkHours: "6",
  weeklyWorkDays: "5",
  appointmentDurationMinutes: "",
  hasMaterialCost: false,
  materialCost: "",
  materialCostUnit: "",
  paysRevenueTax: true,
  taxRate: "6",
  hasPaymentFee: true,
  paymentFeeRate: "2",
};

const command: NormalizedServiceDiagnosisCommand = {
  submissionId: input.submissionId,
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 500_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 3_079,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "month",
    currentPriceCents: 400_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

describe("createServiceDiagnosis", () => {
  const supabase = { rpc: vi.fn() };
  const calculation = { result: "calculation" };
  const snapshot = { schemaVersion: 4 };

  beforeEach(() => {
    vi.clearAllMocks();
    safeParse.mockReturnValue({ success: true, data: input });
    requireUser.mockResolvedValue({ userId: "user-id", supabase });
    composeServiceDiagnosisCommand.mockReturnValue(command);
    calculateServiceReport.mockReturnValue(calculation);
    buildServiceReportSnapshot.mockReturnValue(snapshot);
    createServiceReport.mockResolvedValue({
      status: "success",
      diagnosisId: 42,
    });
  });

  it("returns field errors before authentication", async () => {
    safeParse.mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: {
            currentPrice: ["Informe o preço que você cobra hoje."],
          },
        }),
      },
    });

    await expect(
      createServiceDiagnosis({ ...input, currentPrice: "" }),
    ).resolves.toEqual({
      status: "error",
      error: "invalid_input",
      fieldErrors: { currentPrice: ["Informe o preço que você cobra hoje."] },
    });
    expect(requireUser).not.toHaveBeenCalled();
    expect(composeServiceDiagnosisCommand).not.toHaveBeenCalled();
  });

  it("maps an expired session to the established unauthorized result", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    await expect(createServiceDiagnosis(input)).resolves.toEqual({
      status: "error",
      error: "unauthorized",
    });
    expect(composeServiceDiagnosisCommand).not.toHaveBeenCalled();
  });

  it("validates, authenticates, composes, calculates, and persists in order", async () => {
    await expect(createServiceDiagnosis(input)).resolves.toEqual({
      status: "success",
      diagnosisId: 42,
    });
    expect(safeParse).toHaveBeenCalledWith(input);
    expect(composeServiceDiagnosisCommand).toHaveBeenCalledWith(input);
    expect(calculateServiceReport).toHaveBeenCalledWith(command);
    expect(buildServiceReportSnapshot).toHaveBeenCalledWith(
      command,
      calculation,
    );
    expect(createServiceReport).toHaveBeenCalledWith({
      supabase,
      command,
      snapshot,
    });

    const order = [
      safeParse,
      requireUser,
      composeServiceDiagnosisCommand,
      calculateServiceReport,
      buildServiceReportSnapshot,
      createServiceReport,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("preserves the safe limit_reached result", async () => {
    createServiceReport.mockResolvedValue({
      status: "error",
      error: "limit_reached",
    });

    await expect(createServiceDiagnosis(input)).resolves.toEqual({
      status: "error",
      error: "limit_reached",
    });
  });

  it.each([
    ["composition", composeServiceDiagnosisCommand],
    ["calculation", calculateServiceReport],
    ["snapshot", buildServiceReportSnapshot],
    ["persistence", createServiceReport],
  ])("sanitizes an unexpected %s failure", async (_boundary, mock) => {
    mock.mockImplementation(() => {
      throw new Error("private provider details");
    });

    await expect(createServiceDiagnosis(input)).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });
});
