import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./create-service-report.service", () => ({
  toServiceRpcArgs: () => ({ marker: "service" }),
}));
vi.mock("./create-product-report.service", () => ({
  toProductRpcArgs: () => ({ marker: "product" }),
}));
vi.mock("./create-production-report.service", () => ({
  toProductionRpcArgs: () => ({ marker: "production" }),
}));
vi.mock("./create-detailed-report.service", () => ({
  toDetailedRpcArgs: () => ({ marker: "detailed" }),
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
