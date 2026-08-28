import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceDiagnosisCommand, ServiceDiagnosisInput } from "../types";

const {
  AuthRequiredError,
  buildServiceReportSnapshot,
  calculateServiceReport,
  createServiceReport,
  requireUser,
  safeParse,
} = vi.hoisted(() => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthRequiredError";
    }
  },
  buildServiceReportSnapshot: vi.fn(),
  calculateServiceReport: vi.fn(),
  createServiceReport: vi.fn(),
  requireUser: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError,
  requireUser,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reports/domain/calculate-service-report", () => ({
  calculateServiceReport,
}));
vi.mock("@/modules/reports/domain/build-service-report-snapshot", () => ({
  buildServiceReportSnapshot,
}));
vi.mock("@/modules/reports/services/create-service-report.service", () => ({
  createServiceReport,
}));
vi.mock("../schemas/service-diagnosis.schema", () => ({
  serviceDiagnosisSchema: { safeParse },
}));

import { createServiceDiagnosis } from "./create-service-diagnosis.action";

const validInput: ServiceDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncome: "R$ 5.000,25",
  fixedMonthlyExpenses: "1.234,56",
  monthlyWorkHours: "160,5",
  weeklyWorkDays: "5",
  hourlyRate: "125,90",
  minuteRate: "",
  appointmentRate: "",
  appointmentDurationMinutes: "",
  taxRate: "6,25",
  cardFeeRate: "3.50",
};

const command: ServiceDiagnosisCommand = {
  submissionId: validInput.submissionId,
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 500025,
  fixedMonthlyExpensesCents: 123456,
  monthlyWorkMinutes: 9630,
  weeklyWorkDays: 5,
  hourlyRateCents: 12590,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  taxRateBasisPoints: 625,
  cardFeeRateBasisPoints: 350,
};

const calculation = { calculation: "service-result" };
const snapshot = { schemaVersion: 1, category: "service" };

function expectNoTechnicalDetails(result: unknown) {
  const serialized = JSON.stringify(result);

  expect(serialized).not.toContain("message");
  expect(serialized).not.toContain("details");
  expect(serialized).not.toContain("hint");
  expect(serialized).not.toContain("code");
  expect(serialized).not.toContain("private@example.com");
  expect(serialized).not.toContain("private row detail");
  expect(serialized).not.toContain("internal provider hint");
  expect(serialized).not.toContain("XX001");
}

describe("createServiceDiagnosis", () => {
  const supabase = { rpc: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    safeParse.mockReturnValue({ success: true, data: command });
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    calculateServiceReport.mockReturnValue(calculation);
    buildServiceReportSnapshot.mockReturnValue(snapshot);
    createServiceReport.mockResolvedValue({
      status: "success",
      diagnosisId: 42,
    });
  });

  it("returns field errors before authentication for invalid input", async () => {
    safeParse.mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: {
            hourlyRate: ["Informe um valor por hora maior que zero."],
          },
        }),
      },
    });

    const result = await createServiceDiagnosis({
      ...validInput,
      hourlyRate: "",
    });

    expect(result).toEqual({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        hourlyRate: ["Informe um valor por hora maior que zero."],
      },
    });
    expectNoTechnicalDetails(result);
    expect(safeParse).toHaveBeenCalledOnce();
    expect(requireUser).not.toHaveBeenCalled();
    expect(calculateServiceReport).not.toHaveBeenCalled();
    expect(buildServiceReportSnapshot).not.toHaveBeenCalled();
    expect(createServiceReport).not.toHaveBeenCalled();
  });

  it("maps a missing authenticated user to unauthorized", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const result = await createServiceDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "unauthorized" });
    expectNoTechnicalDetails(result);
    expect(calculateServiceReport).not.toHaveBeenCalled();
    expect(buildServiceReportSnapshot).not.toHaveBeenCalled();
    expect(createServiceReport).not.toHaveBeenCalled();
  });

  it("orchestrates parse, auth, calculation, snapshot, and persistence in order", async () => {
    const result = await createServiceDiagnosis(validInput);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expectNoTechnicalDetails(result);
    expect(safeParse).toHaveBeenCalledWith(validInput);
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
      calculateServiceReport,
      buildServiceReportSnapshot,
      createServiceReport,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it.each(["calculation", "snapshot"])(
    "sanitizes a %s construction failure",
    async (boundary) => {
      const failure = new Error("private domain detail");
      if (boundary === "calculation") {
        calculateServiceReport.mockImplementation(() => {
          throw failure;
        });
      } else {
        buildServiceReportSnapshot.mockImplementation(() => {
          throw failure;
        });
      }

      const result = await createServiceDiagnosis(validInput);

      expect(result).toEqual({ status: "error", error: "create_failed" });
      expectNoTechnicalDetails(result);
      expect(createServiceReport).not.toHaveBeenCalled();
    },
  );

  it("returns the safe persistence error", async () => {
    createServiceReport.mockResolvedValue({
      status: "error",
      error: "create_failed",
    });

    const result = await createServiceDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "create_failed" });
    expectNoTechnicalDetails(result);
  });

  it.each(["authentication", "persistence"])(
    "sanitizes an unexpected %s exception",
    async (boundary) => {
      const providerFailure = {
        message: "provider detail for private@example.com",
        details: "private row detail",
        hint: "internal provider hint",
        code: "XX001",
      };

      if (boundary === "authentication") {
        requireUser.mockRejectedValue(providerFailure);
      } else {
        createServiceReport.mockRejectedValue(providerFailure);
      }

      const result = await createServiceDiagnosis(validInput);

      expect(result).toEqual({ status: "error", error: "create_failed" });
      expectNoTechnicalDetails(result);
    },
  );
});
