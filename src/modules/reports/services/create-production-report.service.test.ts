import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

vi.mock("server-only", () => ({}));

import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { createProductionReport } from "./create-production-report.service";

const composedCommand: ProductionDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCostCents: 5000,
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

describe("createProductionReport", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: 42, error: null });
  });

  async function create(command: ProductionDiagnosisCommand = composedCommand) {
    const snapshot = buildProductionReportSnapshot(
      command,
      calculateProductionReport(command),
    );

    return {
      result: await createProductionReport({
        supabase: supabase as never,
        command,
        snapshot,
      }),
      snapshot,
    };
  }

  it("maps the composed Production command and full snapshot to one RPC", async () => {
    const { result, snapshot } = await create();

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("create_production_diagnosis_report", {
      p_submission_id: composedCommand.submissionId,
      p_cost_composition_enabled: true,
      p_production_unit_cost_cents: 5000,
      p_material_unit_cost_cents: 3000,
      p_packaging_unit_cost_cents: 500,
      p_direct_labor_unit_cost_cents: 1000,
      p_other_variable_unit_cost_cents: 500,
      p_unit_sale_price_cents: 10000,
      p_fixed_monthly_expenses_cents: 100000,
      p_monthly_sales_volume: 100,
      p_pro_labore_included: true,
      p_pro_labore_cents: 200000,
      p_tax_rate_basis_points: 600,
      p_card_fee_rate_basis_points: 200,
      p_schema_version: 1,
      p_calculation_version: 1,
      p_content_version: 1,
      p_scenario: "manufacturing",
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

  it("maps summarized and partial nullable fields to null", async () => {
    const command: ProductionDiagnosisCommand = {
      ...composedCommand,
      costCompositionEnabled: false,
      materialUnitCostCents: null,
      packagingUnitCostCents: null,
      directLaborUnitCostCents: null,
      otherVariableUnitCostCents: null,
      monthlySalesVolume: null,
    };
    const { result, snapshot } = await create(command);

    expect(result).toEqual({ status: "success", diagnosisId: 42 });
    expect(rpc).toHaveBeenCalledWith(
      "create_production_diagnosis_report",
      expect.objectContaining({
        p_cost_composition_enabled: false,
        p_material_unit_cost_cents: null,
        p_packaging_unit_cost_cents: null,
        p_direct_labor_unit_cost_cents: null,
        p_other_variable_unit_cost_cents: null,
        p_monthly_sales_volume: null,
        p_real_margin_basis_points: null,
        p_unit_profit_cents: null,
        p_scenario: "manufacturing",
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

  it.each([null, "42", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "returns a safe error for invalid RPC id %s",
    async (data) => {
      rpc.mockResolvedValue({ data, error: null });

      await expect(create().then(({ result }) => result)).resolves.toEqual({
        status: "error",
        error: "create_failed",
      });
    },
  );

  it("sanitizes a thrown provider exception", async () => {
    rpc.mockRejectedValue(new Error("database failed for private@example.com"));

    await expect(create().then(({ result }) => result)).resolves.toEqual({
      status: "error",
      error: "create_failed",
    });
  });
});
