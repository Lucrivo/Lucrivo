import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));

import { parseFilters } from "./admin-users.urls";
import {
  AdminUsersUnavailableError,
  getAdminUser,
  getAdminUserItems,
  getAdminUsers,
} from "./get-admin-users.service";

describe("admin user read services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({
      data: { items: [], nextCursor: null },
      error: null,
    });
  });

  it("authorizes before every database read", async () => {
    const order: string[] = [];
    requireAdmin.mockImplementation(async () => {
      order.push("admin");
      return { supabase: { rpc } };
    });
    rpc.mockImplementation(async () => {
      order.push("rpc");
      return { data: { items: [], nextCursor: null }, error: null };
    });
    await getAdminUsers(parseFilters({}));
    expect(order).toEqual(["admin", "rpc"]);
    expect(rpc).toHaveBeenCalledWith(
      "list_admin_users_v1",
      expect.objectContaining({ p_limit: 20 }),
    );
  });

  it("never converts a failed list to an empty success", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "database detail" },
    });
    await expect(getAdminUsers(parseFilters({}))).rejects.toBeInstanceOf(
      AdminUsersUnavailableError,
    );
  });

  it("distinguishes an absent user from a malformed detail", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "bad" }, error: null });
    expect(
      await getAdminUser("96300000-0000-4000-8000-000000000002"),
    ).toBeNull();
    await expect(
      getAdminUser("96300000-0000-4000-8000-000000000002"),
    ).rejects.toBeInstanceOf(AdminUsersUnavailableError);
  });

  it("rejects a malformed child-page cursor", async () => {
    rpc.mockResolvedValue({
      data: { items: [], nextCursor: { createdAt: "bad", id: "1" } },
      error: null,
    });
    await expect(
      getAdminUserItems("96300000-0000-4000-8000-000000000002", "history"),
    ).rejects.toBeInstanceOf(AdminUsersUnavailableError);
  });
});
