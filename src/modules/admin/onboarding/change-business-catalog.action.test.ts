import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, revalidatePath, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { changeBusinessCatalog } from "./change-business-catalog.action";

const segmentInput = {
  kind: "segment" as const,
  id: 1,
  name: "  Alimentação   e bebidas  ",
  sortOrder: 20,
  isActive: true,
  expectedVersion: 2,
};

describe("changeBusinessCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({
      data: {
        status: "saved",
        item: {
          id: 1,
          name: "Alimentação e bebidas",
          sortOrder: 20,
          isActive: true,
          version: 3,
        },
      },
      error: null,
    });
  });

  it("validates before authorization", async () => {
    await expect(
      changeBusinessCatalog({ ...segmentInput, name: "x" }),
    ).resolves.toEqual({ status: "invalid" });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("normalizes, saves a segment, and revalidates only the admin route", async () => {
    await expect(changeBusinessCatalog(segmentInput)).resolves.toEqual({
      status: "saved",
      item: {
        id: 1,
        name: "Alimentação e bebidas",
        sortOrder: 20,
        isActive: true,
        version: 3,
      },
    });
    expect(rpc).toHaveBeenCalledWith("save_admin_business_segment_v1", {
      p_id: 1,
      p_name: "Alimentação e bebidas",
      p_sort_order: 20,
      p_is_active: true,
      p_expected_version: 2,
    });
    expect(revalidatePath).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/onboarding");
  });

  it("maps a subcategory mutation and known non-saved statuses", async () => {
    rpc.mockResolvedValue({ data: { status: "conflict" }, error: null });
    await expect(
      changeBusinessCatalog({
        kind: "subcategory",
        id: 2,
        segmentId: 1,
        name: "Confeitaria",
        sortOrder: 10,
        isActive: false,
        expectedVersion: 4,
      }),
    ).resolves.toEqual({ status: "conflict" });
    expect(rpc).toHaveBeenCalledWith("save_admin_business_subcategory_v1", {
      p_id: 2,
      p_segment_id: 1,
      p_name: "Confeitaria",
      p_sort_order: 10,
      p_is_active: false,
      p_expected_version: 4,
    });
    expect(revalidatePath).not.toHaveBeenCalled();

    for (const status of ["duplicate", "not_found"] as const) {
      rpc.mockResolvedValueOnce({ data: { status }, error: null });
      await expect(changeBusinessCatalog(segmentInput)).resolves.toEqual({
        status,
      });
    }
  });

  it("maps database errors and malformed saved payloads to error", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { message: "detail" } })
      .mockResolvedValueOnce({ data: { status: "saved" }, error: null });
    await expect(changeBusinessCatalog(segmentInput)).resolves.toEqual({
      status: "error",
    });
    await expect(changeBusinessCatalog(segmentInput)).resolves.toEqual({
      status: "error",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
