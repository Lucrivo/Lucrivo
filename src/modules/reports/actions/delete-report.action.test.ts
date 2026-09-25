import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, requireUser } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));

import { deleteReport } from "./delete-report.action";

describe("deleteReport", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ supabase: { rpc } });
  });

  it("soft deletes the owned report and revalidates the library", async () => {
    rpc.mockResolvedValue({ data: "deleted", error: null });

    await expect(
      deleteReport({ diagnosisId: 41, expectedVersion: 2 }),
    ).resolves.toEqual({ status: "success" });
    expect(rpc).toHaveBeenCalledWith("soft_delete_owned_diagnosis_v1", {
      p_diagnosis_id: 41,
      p_expected_version: 2,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reports");
  });

  it.each([
    ["conflict", "conflict"],
    ["not_found", "not_found"],
    ["unexpected", "error"],
  ])("maps %s without revalidating", async (databaseStatus, status) => {
    rpc.mockResolvedValue({ data: databaseStatus, error: null });

    await expect(
      deleteReport({ diagnosisId: 41, expectedVersion: 2 }),
    ).resolves.toEqual({ status });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects malformed input before authentication", async () => {
    await expect(
      deleteReport({ diagnosisId: 0, expectedVersion: -1 }),
    ).resolves.toEqual({ status: "error" });
    expect(requireUser).not.toHaveBeenCalled();
  });
});
