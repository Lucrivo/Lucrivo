import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DetailedDiagnosisCommand,
  DetailedDiagnosisInput,
} from "../types";

const {
  AuthRequiredError,
  buildDetailedReportSnapshot,
  calculateDetailedDiagnosis,
  createDetailedReport,
  requireUser,
  safeParse,
} = vi.hoisted(() => ({
  AuthRequiredError: class AuthRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthRequiredError";
    }
  },
  buildDetailedReportSnapshot: vi.fn(),
  calculateDetailedDiagnosis: vi.fn(),
  createDetailedReport: vi.fn(),
  requireUser: vi.fn(),
  safeParse: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError,
  requireUser,
}));
vi.mock(
  "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis",
  () => ({ calculateDetailedDiagnosis }),
);
vi.mock("@/modules/reports/domain/build-detailed-report-snapshot", () => ({
  buildDetailedReportSnapshot,
}));
vi.mock("@/modules/reports/services/create-detailed-report.service", () => ({
  createDetailedReport,
}));
vi.mock("../schemas/detailed-diagnosis.schema", () => ({
  detailedDiagnosisSchema: { safeParse },
}));

import { createDetailedDiagnosis } from "./create-detailed-diagnosis.action";

const validInput: DetailedDiagnosisInput = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "production",
  fixedMonthlyExpenses: "1.000,00",
  proLaboreIncluded: false,
  proLabore: "",
  taxRate: "6",
  cardFeeRate: "2",
  promotionMarginRate: "15",
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Bolo",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePrice: "50,00",
      monthlySalesVolume: "10",
      productionUnitCost: "",
      recipeYield: "10",
      lossRate: "5",
      packagingUnitCost: "1,00",
      directLaborUnitCost: "2,00",
      otherVariableUnitCost: "0,50",
      ingredients: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Farinha",
          quantity: "1,5",
          unit: "kg",
          unitCost: "3,0000",
        },
      ],
    },
  ],
};

const command: DetailedDiagnosisCommand = {
  submissionId: validInput.submissionId,
  category: "production",
  fixedMonthlyExpensesCents: 100000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  promotionMarginBasisPoints: 1500,
  items: [
    {
      id: validInput.items[0].id,
      position: 0,
      name: "Bolo",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 5000,
      monthlySalesVolume: 10,
      recipeYield: 10,
      lossRateBasisPoints: 500,
      packagingUnitCostCents: 100,
      directLaborUnitCostCents: 200,
      otherVariableUnitCostCents: 50,
      ingredients: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          position: 0,
          name: "Farinha",
          quantityMillionths: 1500000,
          unit: "kg",
          unitCostTenThousandths: 30000,
        },
      ],
    },
  ],
};

const calculation = { calculation: "detailed-result" };
const snapshot = { analysisMode: "detailed", schemaVersion: 1 };

describe("createDetailedDiagnosis", () => {
  const supabase = { rpc: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    safeParse.mockReturnValue({ success: true, data: command });
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    calculateDetailedDiagnosis.mockReturnValue(calculation);
    buildDetailedReportSnapshot.mockReturnValue(snapshot);
    createDetailedReport.mockResolvedValue({
      status: "success",
      diagnosisId: 42,
    });
  });

  it("returns dot-path field errors before authentication", async () => {
    safeParse.mockReturnValue({
      success: false,
      error: {
        issues: [
          {
            path: ["items", 0, "ingredients", 0, "quantity"],
            message: "Informe uma quantidade maior que zero.",
          },
        ],
      },
    });

    const result = await createDetailedDiagnosis(validInput);

    expect(result).toEqual({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        "items.0.ingredients.0.quantity": [
          "Informe uma quantidade maior que zero.",
        ],
      },
    });
    expect(requireUser).not.toHaveBeenCalled();
    expect(calculateDetailedDiagnosis).not.toHaveBeenCalled();
    expect(buildDetailedReportSnapshot).not.toHaveBeenCalled();
    expect(createDetailedReport).not.toHaveBeenCalled();
  });

  it("stops before calculation when authentication is missing", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    await expect(createDetailedDiagnosis(validInput)).resolves.toEqual({
      status: "error",
      error: "unauthorized",
    });
    expect(calculateDetailedDiagnosis).not.toHaveBeenCalled();
    expect(buildDetailedReportSnapshot).not.toHaveBeenCalled();
    expect(createDetailedReport).not.toHaveBeenCalled();
  });

  it("orchestrates every trusted boundary in the required order", async () => {
    await expect(createDetailedDiagnosis(validInput)).resolves.toEqual({
      status: "success",
      diagnosisId: 42,
    });

    expect(safeParse).toHaveBeenCalledWith(validInput);
    expect(calculateDetailedDiagnosis).toHaveBeenCalledWith(command);
    expect(buildDetailedReportSnapshot).toHaveBeenCalledWith(
      command,
      calculation,
    );
    expect(createDetailedReport).toHaveBeenCalledWith({
      supabase,
      command,
      snapshot,
    });

    const boundaries: Array<{
      label: string;
      mock: typeof safeParse;
    }> = [
      { label: "validate", mock: safeParse },
      { label: "authenticate", mock: requireUser },
      { label: "calculate", mock: calculateDetailedDiagnosis },
      { label: "snapshot", mock: buildDetailedReportSnapshot },
      { label: "persist", mock: createDetailedReport },
    ];
    const validationOrder = boundaries
      .sort(
        (left, right) =>
          left.mock.mock.invocationCallOrder[0] -
          right.mock.mock.invocationCallOrder[0],
      )
      .map(({ label }) => label);
    expect(validationOrder).toEqual([
      "validate",
      "authenticate",
      "calculate",
      "snapshot",
      "persist",
    ]);
  });

  it.each(["limit_reached", "create_failed"] as const)(
    "preserves the safe %s persistence result",
    async (error) => {
      createDetailedReport.mockResolvedValue({ status: "error", error });

      await expect(createDetailedDiagnosis(validInput)).resolves.toEqual({
        status: "error",
        error,
      });
    },
  );

  it.each(["authentication", "calculation", "snapshot", "persistence"])(
    "sanitizes an unexpected %s exception",
    async (boundary) => {
      const privateFailure = new Error("private@example.com database detail");
      if (boundary === "authentication") {
        requireUser.mockRejectedValue(privateFailure);
      } else if (boundary === "calculation") {
        calculateDetailedDiagnosis.mockImplementation(() => {
          throw privateFailure;
        });
      } else if (boundary === "snapshot") {
        buildDetailedReportSnapshot.mockImplementation(() => {
          throw privateFailure;
        });
      } else {
        createDetailedReport.mockRejectedValue(privateFailure);
      }

      const result = await createDetailedDiagnosis(validInput);
      expect(result).toEqual({ status: "error", error: "create_failed" });
      expect(JSON.stringify(result)).not.toContain("private@example.com");
    },
  );
});
