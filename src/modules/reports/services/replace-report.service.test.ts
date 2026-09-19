import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { replaceReport } from "./replace-report.service";

describe("replaceReport", () => {
  const rpc = vi.fn();
  const supabase = { rpc };

  beforeEach(() => vi.clearAllMocks());

  it("calls the protected swap RPC and returns the incremented version", async () => {
    rpc.mockResolvedValue({ data: 41, error: null });

    await expect(
      replaceReport({
        supabase: supabase as never,
        targetId: 41,
        stagedId: 82,
        expectedVersion: 2,
      }),
    ).resolves.toEqual({ status: "success", diagnosisId: 41, version: 3 });
    expect(rpc).toHaveBeenCalledWith("replace_owned_diagnosis_from_staged_v1", {
      p_target_id: 41,
      p_staged_id: 82,
      p_expected_version: 2,
    });
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
        targetId: 41,
        stagedId: 82,
        expectedVersion: 2,
      }),
    ).resolves.toEqual({ status });
  });
});
