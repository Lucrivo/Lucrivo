import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, revalidatePath, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { changeAdminUser } from "./change-admin-user.action";

const input = {
  userId: "96300000-0000-4000-8000-000000000002",
  action: "blocked",
  reason: "Solicitação do usuário",
  courtesyExpiresAt: null,
  expectedVersion: 0,
};

describe("changeAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({
      data: { status: "updated", version: 1 },
      error: null,
    });
  });

  it("rejects malformed requests before authorization and mutation", async () => {
    expect(await changeAdminUser({ ...input, reason: " " })).toEqual({
      status: "invalid",
    });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("authorizes, mutates and revalidates both routes on success", async () => {
    expect(await changeAdminUser(input)).toEqual({
      status: "updated",
      version: 1,
    });
    expect(rpc).toHaveBeenCalledWith(
      "change_admin_user_v1",
      expect.objectContaining({ p_expected_version: 0 }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/users/${input.userId}`);
  });

  it("does not revalidate after a paid-access conflict", async () => {
    rpc.mockResolvedValue({
      data: { status: "paid_conflict", version: 0 },
      error: null,
    });
    expect(await changeAdminUser(input)).toEqual({ status: "paid_conflict" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
