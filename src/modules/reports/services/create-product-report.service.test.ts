import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

vi.mock("server-only", () => ({}));

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { createProductReport } from "./create-product-report.service";

const completeCommand: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

describe("createProductReport", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: 42, error: null });
  });

  async function create(command: ProductDiagnosisCommand = completeCommand) {
    const snapshot = buildProductReportSnapshot(
      command,
      calculateProductReport(command),
    );

    return {
      result: await createProductReport({
        supabase: supabase as never,
        command,
        snapshot,
      }),
      snapshot,
    };
  }

  it("maps the complete Product command and snapshot to one RPC", async () => {
    const { result, snapshot } = await create();

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_product_diagnosis_report", {
      p_submission_id: completeCommand.submissionId,
      p_purchase_unit_cost_cents: completeCommand.purchaseUnitCostCents,
      p_unit_sale_price_cents: completeCommand.unitSalePriceCents,
      p_fixed_monthly_expenses_cents:
        completeCommand.fixedMonthlyExpensesCents,
      p_monthly_sales_volume: completeCommand.monthlySalesVolume,
      p_pro_labore_included: completeCommand.proLaboreIncluded,
      p_pro_labore_cents: completeCommand.proLaboreCents,
      p_tax_rate_basis_points: completeCommand.taxRateBasisPoints,
      p_card_fee_rate_basis_points: completeCommand.cardFeeRateBasisPoints,
      p_schema_version: 1,
      p_calculation_version: 1,
      p_content_version: 1,
      p_scenario: "resale",
      p_current_price_cents: snapshot.results.currentPriceCents,
      p_real_margin_basis_points: snapshot.results.realMarginBasisPoints,
      p_unit_profit_cents: snapshot.results.unitProfitCents,
      p_verdict: snapshot.results.verdict,
      p_priority: snapshot.results.priority,
      p_unit: "unit",
      p_report_snapshot: snapshot,
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("user_id");
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_user_id");
  });

  it("maps all nullable arguments to null for a partial Product report", async () => {
    const command = { ...completeCommand, monthlySalesVolume: null };
    const { result, snapshot } = await create(command);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expect(rpc).toHaveBeenCalledWith(
      "create_product_diagnosis_report",
      expect.objectContaining({
        p_monthly_sales_volume: null,
        p_real_margin_basis_points: null,
        p_unit_profit_cents: null,
        p_report_snapshot: snapshot,
      }),
    );
  });

  it("returns a safe error for a provider failure", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "XX001", message: "private provider detail" },
    });

    await expect(create().then(({ result }) => result)).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    "42",
  ])("returns a safe error for invalid RPC id %s", async (data) => {
    rpc.mockResolvedValue({ data, error: null });

    await expect(create().then(({ result }) => result)).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });

  it("sanitizes a thrown provider exception", async () => {
    rpc.mockRejectedValue(new Error("database failed for private@example.com"));

    await expect(create().then(({ result }) => result)).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });
});
