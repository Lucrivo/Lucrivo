import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProductionDiagnosisCommand,
  ProductionDiagnosisInput,
  ProductionDiagnosisValidatedInput,
} from "../types";

const {
  AuthRequiredError,
  buildProductionReportSnapshot,
  calculateProductionReport,
  composeProductionDiagnosisCommand,
  createProductionReport,
  requireUser,
  safeParse,
} = vi.hoisted(() => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthRequiredError";
    }
  },
  buildProductionReportSnapshot: vi.fn(),
  calculateProductionReport: vi.fn(),
  composeProductionDiagnosisCommand: vi.fn(),
  createProductionReport: vi.fn(),
  requireUser: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError,
  requireUser,
}));
vi.mock(
  "@/modules/quick-diagnosis/domain/compose-production-diagnosis-command",
  () => ({ composeProductionDiagnosisCommand }),
);
vi.mock("@/modules/reports/domain/calculate-production-report", () => ({
  calculateProductionReport,
}));
vi.mock("@/modules/reports/domain/build-production-report-snapshot", () => ({
  buildProductionReportSnapshot,
}));
vi.mock("@/modules/reports/services/create-production-report.service", () => ({
  createProductionReport,
}));
vi.mock("../schemas/production-diagnosis.schema", () => ({
  productionDiagnosisSchema: { safeParse },
}));

import { createProductionDiagnosis } from "./create-production-diagnosis.action";

const validInput: ProductionDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCost: "",
  materialUnitCost: "30,00",
  packagingUnitCost: "5,00",
  directLaborUnitCost: "10,00",
  otherVariableUnitCost: "5,00",
  unitSalePrice: "100,00",
  fixedMonthlyExpenses: "1.000,00",
  monthlySalesVolume: "100",
  proLaboreIncluded: true,
  proLabore: "2.000,00",
  taxRate: "6",
  cardFeeRate: "2",
};

const validated: ProductionDiagnosisValidatedInput = {
  submissionId: validInput.submissionId,
  costCompositionEnabled: true,
  productionUnitCostCents: null,
  materialUnitCostCents: 3000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const command: ProductionDiagnosisCommand = {
  ...validated,
  productionUnitCostCents: 5000,
};

const calculation = { calculation: "production-result" };
const snapshot = { schemaVersion: 1, category: "production" };

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

describe("createProductionDiagnosis", () => {
  const supabase = { rpc: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    safeParse.mockReturnValue({ success: true, data: validated });
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    composeProductionDiagnosisCommand.mockReturnValue(command);
    calculateProductionReport.mockReturnValue(calculation);
    buildProductionReportSnapshot.mockReturnValue(snapshot);
    createProductionReport.mockResolvedValue({
      status: "success",
      diagnosisId: 42,
    });
  });

  it("returns field errors before authentication and all domain work", async () => {
    safeParse.mockReturnValue({
      success: false,
      error: {
        flatten: () => ({
          fieldErrors: {
            materialUnitCost: [
              "Informe um valor monetário válido com até duas casas decimais.",
            ],
          },
        }),
      },
    });

    const result = await createProductionDiagnosis({
      ...validInput,
      materialUnitCost: "inválido",
    });

    expect(result).toEqual({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        materialUnitCost: [
          "Informe um valor monetário válido com até duas casas decimais.",
        ],
      },
    });
    expectNoTechnicalDetails(result);
    expect(safeParse).toHaveBeenCalledOnce();
    expect(requireUser).not.toHaveBeenCalled();
    expect(composeProductionDiagnosisCommand).not.toHaveBeenCalled();
    expect(calculateProductionReport).not.toHaveBeenCalled();
    expect(buildProductionReportSnapshot).not.toHaveBeenCalled();
    expect(createProductionReport).not.toHaveBeenCalled();
  });

  it("maps missing authentication to unauthorized before composition", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const result = await createProductionDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "unauthorized" });
    expectNoTechnicalDetails(result);
    expect(composeProductionDiagnosisCommand).not.toHaveBeenCalled();
    expect(calculateProductionReport).not.toHaveBeenCalled();
    expect(buildProductionReportSnapshot).not.toHaveBeenCalled();
    expect(createProductionReport).not.toHaveBeenCalled();
  });

  it("orchestrates validation, auth, composition, calculation, snapshot, and persistence in order", async () => {
    const result = await createProductionDiagnosis(validInput);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expectNoTechnicalDetails(result);
    expect(safeParse).toHaveBeenCalledWith(validInput);
    expect(composeProductionDiagnosisCommand).toHaveBeenCalledWith(validated);
    expect(calculateProductionReport).toHaveBeenCalledWith(command);
    expect(buildProductionReportSnapshot).toHaveBeenCalledWith(
      command,
      calculation,
    );
    expect(createProductionReport).toHaveBeenCalledWith({
      supabase,
      command,
      snapshot,
    });

    const order = [
      safeParse,
      requireUser,
      composeProductionDiagnosisCommand,
      calculateProductionReport,
      buildProductionReportSnapshot,
      createProductionReport,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("returns the safe persistence error", async () => {
    createProductionReport.mockResolvedValue({
      status: "error",
      error: "create_failed",
    });

    const result = await createProductionDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "create_failed" });
    expectNoTechnicalDetails(result);
  });

  it.each([
    "authentication",
    "composition",
    "calculation",
    "snapshot",
    "persistence",
  ])("sanitizes an unexpected %s exception", async (boundary) => {
    const providerFailure = {
      message: "provider detail for private@example.com",
      details: "private row detail",
      hint: "internal provider hint",
      code: "XX001",
    };

    if (boundary === "authentication") {
      requireUser.mockRejectedValue(providerFailure);
    } else if (boundary === "composition") {
      composeProductionDiagnosisCommand.mockImplementation(() => {
        throw providerFailure;
      });
    } else if (boundary === "calculation") {
      calculateProductionReport.mockImplementation(() => {
        throw providerFailure;
      });
    } else if (boundary === "snapshot") {
      buildProductionReportSnapshot.mockImplementation(() => {
        throw providerFailure;
      });
    } else {
      createProductionReport.mockRejectedValue(providerFailure);
    }

    const result = await createProductionDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "create_failed" });
    expectNoTechnicalDetails(result);
  });
});
