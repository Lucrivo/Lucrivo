import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceDiagnosisInput } from "../types";

const { AuthRequiredError, createServiceDiagnosisService, requireUser } =
  vi.hoisted(() => ({
    AuthRequiredError: class AuthRequiredError extends Error {
      constructor() {
        super("Authentication required");
        this.name = "AuthRequiredError";
      }
    },
    createServiceDiagnosisService: vi.fn(),
    requireUser: vi.fn(),
  }));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError,
  requireUser,
}));
vi.mock(
  "@/modules/quick-diagnosis/services/create-service-diagnosis.service",
  () => ({ createServiceDiagnosisService }),
);

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
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    createServiceDiagnosisService.mockResolvedValue({
      status: "success",
      diagnosisId: 42,
    });
  });

  it("returns field errors before authentication for invalid input", async () => {
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
    expect(requireUser).not.toHaveBeenCalled();
    expect(createServiceDiagnosisService).not.toHaveBeenCalled();
  });

  it("maps a missing authenticated user to unauthorized", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const result = await createServiceDiagnosis(validInput);

    expect(result).toEqual({
      status: "error",
      error: "unauthorized",
    });
    expectNoTechnicalDetails(result);
    expect(createServiceDiagnosisService).not.toHaveBeenCalled();
  });

  it("passes normalized data and the trusted identity to persistence", async () => {
    const result = await createServiceDiagnosis(validInput);

    expect(result).toEqual({
      status: "success",
      diagnosisId: 42,
    });
    expectNoTechnicalDetails(result);
    expect(requireUser).toHaveBeenCalledOnce();
    expect(createServiceDiagnosisService).toHaveBeenCalledWith({
      userId: "trusted-user",
      supabase,
      command: {
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
      },
    });
    expect(requireUser.mock.invocationCallOrder[0]).toBeLessThan(
      createServiceDiagnosisService.mock.invocationCallOrder[0],
    );
  });

  it("returns the safe persistence error", async () => {
    createServiceDiagnosisService.mockResolvedValue({
      status: "error",
      error: "create_failed",
    });

    const result = await createServiceDiagnosis(validInput);

    expect(result).toEqual({
      status: "error",
      error: "create_failed",
    });
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
        createServiceDiagnosisService.mockRejectedValue(providerFailure);
      }

      const result = await createServiceDiagnosis(validInput);

      expect(result).toEqual({ status: "error", error: "create_failed" });
      expectNoTechnicalDetails(result);
    },
  );
});
