import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDiagnosisCommand, ProductDiagnosisInput } from "../types";

const {
  AuthRequiredError,
  buildProductReportSnapshot,
  calculateProductReport,
  createProductReport,
  requireUser,
  safeParse,
} = vi.hoisted(() => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthRequiredError";
    }
  },
  buildProductReportSnapshot: vi.fn(),
  calculateProductReport: vi.fn(),
  createProductReport: vi.fn(),
  requireUser: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError,
  requireUser,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reports/domain/calculate-product-report", () => ({
  calculateProductReport,
}));
vi.mock("@/modules/reports/domain/build-product-report-snapshot", () => ({
  buildProductReportSnapshot,
}));
vi.mock("@/modules/reports/services/create-product-report.service", () => ({
  createProductReport,
}));
vi.mock("../schemas/product-diagnosis.schema", () => ({
  productDiagnosisSchema: { safeParse },
}));

import { createProductDiagnosis } from "./create-product-diagnosis.action";

const validInput: ProductDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCost: "50,00",
  unitSalePrice: "100,00",
  fixedMonthlyExpenses: "1.000,00",
  monthlySalesVolume: "100",
  proLaboreIncluded: true,
  proLabore: "2.000,00",
  taxRate: "6",
  cardFeeRate: "2",
};

const command: ProductDiagnosisCommand = {
  submissionId: validInput.submissionId,
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const calculation = { calculation: "product-result" };
const snapshot = { schemaVersion: 1, category: "product" };

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

describe("createProductDiagnosis", () => {
  const supabase = { rpc: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    safeParse.mockReturnValue({ success: true, data: command });
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    calculateProductReport.mockReturnValue(calculation);
    buildProductReportSnapshot.mockReturnValue(snapshot);
    createProductReport.mockResolvedValue({
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
            purchaseUnitCost: ["Informe um custo de compra maior que zero."],
          },
        }),
      },
    });

    const result = await createProductDiagnosis({
      ...validInput,
      purchaseUnitCost: "0",
    });

    expect(result).toEqual({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        purchaseUnitCost: ["Informe um custo de compra maior que zero."],
      },
    });
    expectNoTechnicalDetails(result);
    expect(safeParse).toHaveBeenCalledOnce();
    expect(requireUser).not.toHaveBeenCalled();
    expect(calculateProductReport).not.toHaveBeenCalled();
    expect(buildProductReportSnapshot).not.toHaveBeenCalled();
    expect(createProductReport).not.toHaveBeenCalled();
  });

  it("rejects an untrusted browser userId during validation", async () => {
    safeParse.mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: {} }) },
    });
    const browserInput = {
      ...validInput,
      userId: "55555555-5555-4555-8555-555555555555",
    };

    await expect(
      createProductDiagnosis(browserInput as ProductDiagnosisInput),
    ).resolves.toEqual({
      status: "error",
      error: "invalid_input",
      fieldErrors: {},
    });
    expect(safeParse).toHaveBeenCalledWith(browserInput);
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("maps a missing authenticated user to unauthorized", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const result = await createProductDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "unauthorized" });
    expectNoTechnicalDetails(result);
    expect(calculateProductReport).not.toHaveBeenCalled();
    expect(buildProductReportSnapshot).not.toHaveBeenCalled();
    expect(createProductReport).not.toHaveBeenCalled();
  });

  it("orchestrates validation, auth, calculation, snapshot, and persistence in order", async () => {
    const result = await createProductDiagnosis(validInput);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expectNoTechnicalDetails(result);
    expect(safeParse).toHaveBeenCalledWith(validInput);
    expect(calculateProductReport).toHaveBeenCalledWith(command);
    expect(buildProductReportSnapshot).toHaveBeenCalledWith(
      command,
      calculation,
    );
    expect(createProductReport).toHaveBeenCalledWith({
      supabase,
      command,
      snapshot,
    });

    const order = [
      safeParse,
      requireUser,
      calculateProductReport,
      buildProductReportSnapshot,
      createProductReport,
    ].map((mock) => mock.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((left, right) => left - right));
  });

  it("returns the safe persistence error", async () => {
    createProductReport.mockResolvedValue({
      status: "error",
      error: "create_failed",
    });

    const result = await createProductDiagnosis(validInput);

    expect(result).toEqual({ status: "error", error: "create_failed" });
    expectNoTechnicalDetails(result);
  });

  it.each(["authentication", "calculation", "snapshot", "persistence"])(
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
      } else if (boundary === "calculation") {
        calculateProductReport.mockImplementation(() => {
          throw providerFailure;
        });
      } else if (boundary === "snapshot") {
        buildProductReportSnapshot.mockImplementation(() => {
          throw providerFailure;
        });
      } else {
        createProductReport.mockRejectedValue(providerFailure);
      }

      const result = await createProductDiagnosis(validInput);

      expect(result).toEqual({ status: "error", error: "create_failed" });
      expectNoTechnicalDetails(result);
    },
  );
});
