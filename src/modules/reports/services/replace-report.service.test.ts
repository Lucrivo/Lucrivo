import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./report-rpc-args", () => ({
  toServiceRpcArgs: () => ({ marker: "service" }),
  toProductRpcArgs: () => ({ marker: "product" }),
  toProductionRpcArgs: () => ({ marker: "production" }),
  toDetailedRpcArgs: () => ({
    marker: "detailed",
    p_fixed_monthly_expenses_cents: 80_000,
    p_pro_labore_included: false,
    p_pro_labore_cents: 0,
    p_tax_rate_basis_points: 600,
    p_card_fee_rate_basis_points: 200,
    p_items: [],
    p_report_snapshot: { sections: [] },
  }),
}));

import { replaceReport } from "./replace-report.service";

describe("replaceReport", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["service", "replace_service_diagnosis_report_v1"],
    ["product", "replace_product_diagnosis_report_v1"],
    ["production", "replace_production_diagnosis_report_v1"],
    ["detailed", "replace_detailed_diagnosis_report_v1"],
  ] as const)("calls the atomic %s replacement RPC", async (kind, rpcName) => {
    rpc.mockResolvedValue({ data: 41, error: null });

    await expect(
      replaceReport({
        supabase: supabase as never,
        diagnosisId: 41,
        expectedVersion: 2,
        kind,
        command: {} as never,
        snapshot: {} as never,
      }),
    ).resolves.toEqual({ status: "success", diagnosisId: 41, version: 3 });
    expect(rpc).toHaveBeenCalledWith(
      rpcName,
      expect.objectContaining({
        marker: kind,
        p_diagnosis_id: 41,
        p_expected_version: 2,
      }),
    );
    if (kind === "detailed") {
      const args = rpc.mock.calls[0]?.[1];
      expect(args).toMatchObject({
        p_fixed_monthly_expenses_cents: 80_000,
        p_pro_labore_included: false,
        p_tax_rate_basis_points: 600,
        p_card_fee_rate_basis_points: 200,
        p_report_snapshot: { sections: [] },
      });
    }
  });

  it.each([
    ["42501", "paid access required", "plan_required"],
    ["40001", "report version conflict", "conflict"],
    ["22023", "report not found", "not_found"],
  ])("maps database error %s to %s", async (code, message, status) => {
    rpc.mockResolvedValue({ data: null, error: { code, message } });

    await expect(
      replaceReport({
        supabase: supabase as never,
        diagnosisId: 41,
        expectedVersion: 2,
        kind: "product",
        command: {} as never,
        snapshot: {} as never,
      }),
    ).resolves.toEqual({ status });
  });
});
