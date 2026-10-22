import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));

import { encodeCursor, parseFilters } from "./admin-users.urls";
import {
  AdminUsersUnavailableError,
  getAdminUser,
  getAdminUserDiagnoses,
  getAdminUserHistory,
  getAdminUsers,
  getAdminUserSubscriptions,
} from "./get-admin-users.service";

describe("admin user read services", () => {
  const userId = "96300000-0000-4000-8000-000000000002";

  beforeEach(() => {
    vi.resetAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({
      data: { items: [], nextCursor: null },
      error: null,
    });
  });

  it("authorizes before the v2 paged user list read", async () => {
    const order: string[] = [];
    requireAdmin.mockImplementation(async () => {
      order.push("admin");
      return { supabase: { rpc } };
    });
    rpc.mockImplementation(async () => {
      order.push("rpc");
      return {
        data: {
          items: [],
          page: 3,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
        },
        error: null,
      };
    });
    await getAdminUsers(parseFilters({ page: "3" }));
    expect(order).toEqual(["admin", "rpc"]);
    expect(rpc).toHaveBeenCalledWith("list_admin_users_v2", {
      p_query: undefined,
      p_state: "current",
      p_access: "all",
      p_page: 3,
      p_page_size: 20,
    });
  });

  it("dispatches one typed method per detail RPC", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { items: [], nextCursor: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { items: [], nextCursor: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { items: [], nextCursor: null },
        error: null,
      });

    expect(await getAdminUser(userId)).toBeNull();
    await getAdminUserDiagnoses(userId);
    await getAdminUserSubscriptions(userId);
    await getAdminUserHistory(userId);

    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "get_admin_user_v2",
      "list_admin_user_diagnoses_v2",
      "list_admin_user_subscriptions_v2",
      "list_admin_user_history_v2",
    ]);
    expect(requireAdmin).toHaveBeenCalledTimes(4);
  });

  it("normalizes invalid collection cursors before each RPC", async () => {
    await getAdminUserDiagnoses(
      userId,
      encodeCursor({
        createdAt: "2026-10-21T12:00:00+00:00",
        id: "not-decimal",
      }),
    );
    await getAdminUserSubscriptions(
      userId,
      encodeCursor({
        createdAt: "2026-10-21T12:00:00+00:00",
        id: "not-a-uuid",
      }),
    );
    await getAdminUserHistory(
      userId,
      encodeCursor({
        createdAt: "2026-10-21T12:00:00+00:00",
        id: "x".repeat(201),
      }),
    );

    for (const [, input] of rpc.mock.calls.slice(0, 2)) {
      expect(input).toEqual(
        expect.objectContaining({
          p_cursor_created_at: undefined,
        }),
      );
    }
    expect(rpc.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({ p_cursor_occurred_at: undefined }),
    );
  });

  it("parses normalized legacy history events with empty changes", async () => {
    rpc.mockResolvedValue({
      data: {
        items: [
          {
            eventKey: "admin:1",
            occurredAt: "2026-10-20T12:00:00+00:00",
            kind: "admin_blocked",
            title: "Usuário bloqueado",
            payload: {
              actorEmail: "admin@example.com",
              reason: "fixture with legacy state",
              changes: [],
            },
          },
        ],
        nextCursor: null,
      },
      error: null,
    });
    await expect(getAdminUserHistory(userId)).resolves.toMatchObject({
      items: [{ kind: "admin_blocked", payload: { changes: [] } }],
    });
  });

  it("never converts a failed RPC into success and logs only bounded data", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: { targetEmail: "sensitive@example.com" },
      error: {
        code: "XX000",
        message: "database detail with sensitive query data",
      },
    });

    await expect(getAdminUsers(parseFilters({}))).rejects.toBeInstanceOf(
      AdminUsersUnavailableError,
    );
    expect(errorSpy).toHaveBeenCalledWith({
      event: "admin_user_read_failed",
      rpc: "list_admin_users_v2",
      code: "XX000",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("sensitive");
    errorSpy.mockRestore();
  });

  it("distinguishes an absent user from a malformed detail", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "bad" }, error: null });
    expect(await getAdminUser(userId)).toBeNull();
    await expect(getAdminUser(userId)).rejects.toBeInstanceOf(
      AdminUsersUnavailableError,
    );
    expect(errorSpy).toHaveBeenLastCalledWith({
      event: "admin_user_read_failed",
      rpc: "get_admin_user_v2",
      code: "invalid_response",
    });
    errorSpy.mockRestore();
  });
});
