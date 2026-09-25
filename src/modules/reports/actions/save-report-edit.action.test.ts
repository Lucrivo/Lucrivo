import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calculateReportPreview: vi.fn(),
  createDetailedReport: vi.fn(),
  createProductReport: vi.fn(),
  getBillingOverview: vi.fn(),
  parseProduct: vi.fn(),
  parseDetailed: vi.fn(),
  replaceReport: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  requireUser: mocks.requireUser,
  AuthRequiredError: class AuthRequiredError extends Error {},
  AccountUnavailableError: class AccountUnavailableError extends Error {},
}));
vi.mock("@/modules/billing/services/get-billing-overview.service", () => ({
  getBillingOverview: mocks.getBillingOverview,
}));
vi.mock("@/modules/quick-diagnosis/schemas/product-diagnosis.schema", () => ({
  productDiagnosisSchema: { parse: mocks.parseProduct },
}));
vi.mock(
  "@/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema",
  () => ({
    detailedDiagnosisSchema: { parse: mocks.parseDetailed },
  }),
);
vi.mock("../editor/calculate-report-preview", () => ({
  calculateReportPreview: mocks.calculateReportPreview,
}));
vi.mock("../services/create-product-report.service", () => ({
  createProductReport: mocks.createProductReport,
}));
vi.mock("../services/create-service-report.service", () => ({
  createServiceReport: vi.fn(),
}));
vi.mock("../services/create-production-report.service", () => ({
  createProductionReport: vi.fn(),
}));
vi.mock("../services/create-detailed-report.service", () => ({
  createDetailedReport: mocks.createDetailedReport,
}));
vi.mock("../services/replace-report.service", () => ({
  replaceReport: mocks.replaceReport,
}));

import { saveReportEdit } from "./save-report-edit.action";

const draft = { kind: "product", values: { unitSalePrice: "45.00" } } as never;
const command = { submissionId: "new-submission" };
const snapshot = { category: "product", results: {} };
const detailedDraft = {
  kind: "detailed",
  values: { fixedMonthlyExpenses: "800", items: [] },
} as never;
const detailedCommand = {
  submissionId: "new-detailed-submission",
  fixedMonthlyExpensesCents: 80_000,
  items: [],
};
const detailedSnapshot = {
  analysisMode: "detailed",
  category: "product",
  sections: [],
};

describe("saveReportEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculateReportPreview.mockReturnValue({ status: "valid", snapshot });
    mocks.parseProduct.mockReturnValue(command);
    mocks.parseDetailed.mockReturnValue(detailedCommand);
    mocks.requireUser.mockResolvedValue({
      userId: "user-id",
      supabase: { rpc: vi.fn() },
    });
    mocks.getBillingOverview.mockResolvedValue({
      status: "success",
      overview: { tier: "paid" },
    });
  });

  it("replaces through one category-specific atomic call", async () => {
    mocks.replaceReport.mockResolvedValue({
      status: "success",
      diagnosisId: 41,
      version: 3,
    });

    await expect(
      saveReportEdit({
        diagnosisId: 41,
        expectedVersion: 2,
        mode: "replace",
        draft,
      }),
    ).resolves.toEqual({ status: "success", diagnosisId: 41, version: 3 });
    expect(mocks.replaceReport).toHaveBeenCalledWith(
      expect.objectContaining({
        diagnosisId: 41,
        expectedVersion: 2,
        kind: "product",
        command,
        snapshot,
      }),
    );
    expect(mocks.createProductReport).not.toHaveBeenCalled();
  });

  it("creates a distinct report in copy mode", async () => {
    mocks.createProductReport.mockResolvedValue({
      status: "success",
      diagnosisId: 99,
    });

    await expect(
      saveReportEdit({
        diagnosisId: 41,
        expectedVersion: 2,
        mode: "copy",
        draft,
      }),
    ).resolves.toEqual({ status: "success", diagnosisId: 99, version: 0 });
    expect(mocks.createProductReport).toHaveBeenCalledWith(
      expect.objectContaining({ command, snapshot }),
    );
    expect(mocks.replaceReport).not.toHaveBeenCalled();
  });

  it("replaces a detailed report with the clean command and snapshot", async () => {
    mocks.calculateReportPreview.mockReturnValue({
      status: "valid",
      snapshot: detailedSnapshot,
    });
    mocks.replaceReport.mockResolvedValue({
      status: "success",
      diagnosisId: 41,
      version: 3,
    });

    await saveReportEdit({
      diagnosisId: 41,
      expectedVersion: 2,
      mode: "replace",
      draft: detailedDraft,
    });

    expect(mocks.replaceReport).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "detailed",
        command: detailedCommand,
        snapshot: detailedSnapshot,
      }),
    );
  });

  it("creates a detailed copy without a promotion argument", async () => {
    mocks.calculateReportPreview.mockReturnValue({
      status: "valid",
      snapshot: detailedSnapshot,
    });
    mocks.createDetailedReport.mockResolvedValue({
      status: "success",
      diagnosisId: 99,
    });

    await expect(
      saveReportEdit({
        diagnosisId: 41,
        expectedVersion: 2,
        mode: "copy",
        draft: detailedDraft,
      }),
    ).resolves.toEqual({ status: "success", diagnosisId: 99, version: 0 });
    expect(mocks.createDetailedReport).toHaveBeenCalledWith(
      expect.objectContaining({
        command: detailedCommand,
        snapshot: detailedSnapshot,
      }),
    );
  });

  it("preserves canonical field errors without touching persistence", async () => {
    const invalid = {
      status: "invalid",
      fieldErrors: { unitSalePrice: ["Informe um preço válido."] },
    };
    mocks.calculateReportPreview.mockReturnValue(invalid);

    await expect(
      saveReportEdit({
        diagnosisId: 41,
        expectedVersion: 2,
        mode: "replace",
        draft,
      }),
    ).resolves.toEqual(invalid);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("fails closed when paid access is absent", async () => {
    mocks.getBillingOverview.mockResolvedValue({
      status: "success",
      overview: { tier: "free" },
    });

    await expect(
      saveReportEdit({
        diagnosisId: 41,
        expectedVersion: 2,
        mode: "replace",
        draft,
      }),
    ).resolves.toEqual({ status: "plan_required" });
    expect(mocks.replaceReport).not.toHaveBeenCalled();
  });

  it.each(["plan_required", "conflict", "not_found", "error"] as const)(
    "preserves the %s replacement result",
    async (status) => {
      mocks.replaceReport.mockResolvedValue({ status });

      await expect(
        saveReportEdit({
          diagnosisId: 41,
          expectedVersion: 2,
          mode: "replace",
          draft,
        }),
      ).resolves.toEqual({ status });
    },
  );
});
