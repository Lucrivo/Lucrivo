import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));

import {
  AdminRecentSubscriptionsUnavailableError,
  getRecentSubscriptions,
} from "./get-recent-subscriptions.service";

describe("getRecentSubscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({
      data: [
        {
          id: "95000000-0000-4000-8000-000000000001",
          email: "cliente@example.com",
          billingMode: "annual",
          status: "active",
          createdAt: "2026-09-18T15:00:00.000Z",
        },
      ],
      error: null,
    });
  });

  it("authorizes, loads the overview, validates, and presents the list", async () => {
    await expect(getRecentSubscriptions()).resolves.toEqual([
      expect.objectContaining({
        email: "cliente@example.com",
        billingModeLabel: "Anual",
        status: { label: "Ativa", tone: "success" },
      }),
    ]);
    expect(rpc).toHaveBeenCalledWith("list_admin_recent_subscriptions_v1", {
      p_period: "all",
      p_billing_mode: "all",
      p_state: "all",
    });
  });

  it.each([
    { data: null, error: { message: "private" } },
    { data: [{ malformed: true }], error: null },
  ])(
    "returns a stable unavailable error for invalid provider data",
    async (value) => {
      rpc.mockResolvedValue(value);
      await expect(getRecentSubscriptions()).rejects.toBeInstanceOf(
        AdminRecentSubscriptionsUnavailableError,
      );
    },
  );
});
