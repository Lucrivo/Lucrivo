import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, requireAdmin, rpc } = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));

import {
  AdminDashboardUnavailableError,
  getAdminDashboard,
} from "./get-admin-dashboard.service";

const validSnapshot = {
  generatedAt: "2026-09-16T18:30:00.000Z",
  metrics: {
    newUsers: { today: 2, week: 8, month: 21 },
    activeUsers: 45,
    freeDiagnoses: 19,
    activeSubscriptions: 12,
    canceledSubscriptions: 1,
    monthlyRevenueCents: 289_900,
    cancellationOpeningBase: 20,
    cancellationRateBasisPoints: 500,
  },
  revenueHistory: [
    "2025-10-01",
    "2025-11-01",
    "2025-12-01",
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ].map((period, index) => ({ period, valueCents: index * 10_000 })),
  userGrowth: [
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ].map((period, index) => ({ period, value: index + 1 })),
  recentSubscriptions: [
    {
      id: "95000000-0000-4000-8000-000000000001",
      email: null,
      billingMode: "monthly",
      status: "active",
      createdAt: "2026-09-16T15:00:00.000Z",
    },
    {
      id: "95000000-0000-4000-8000-000000000002",
      email: "anual@example.com",
      billingMode: "annual",
      status: "cancel_at_period_end",
      createdAt: "2026-09-15T15:00:00.000Z",
    },
  ],
};

describe("getAdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: "admin" });
    createClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ data: validSnapshot, error: null });
  });

  it("authorizes before requesting the snapshot", async () => {
    const order: string[] = [];
    requireAdmin.mockImplementation(async () => {
      order.push("authorize");
      return { userId: "admin" };
    });
    rpc.mockImplementation(async () => {
      order.push("rpc");
      return { data: validSnapshot, error: null };
    });

    await getAdminDashboard();

    expect(order).toEqual(["authorize", "rpc"]);
    expect(rpc).toHaveBeenCalledWith("get_admin_dashboard_v1");
  });

  it("maps the validated snapshot to display-ready values", async () => {
    const dashboard = await getAdminDashboard();

    expect(dashboard).toMatchObject({
      generatedAtLabel: "16/09/2026, 15:30",
      metrics: validSnapshot.metrics,
      recentSubscriptions: [
        {
          email: "E-mail indisponível",
          billingModeLabel: "Mensal",
          createdAtLabel: "16 set. 2026",
          status: { label: "Ativa", tone: "success" },
        },
        {
          email: "anual@example.com",
          billingModeLabel: "Anual",
          status: { label: "Cancelamento agendado", tone: "warning" },
        },
      ],
    });
    expect(dashboard.revenueHistory[0]).toEqual({
      period: "2025-10-01",
      label: "out.",
      valueCents: 0,
    });
    expect(dashboard.userGrowth[0]).toEqual({
      period: "2026-04-01",
      label: "abr.",
      value: 1,
    });
  });

  it.each([
    [{ data: null, error: { message: "database detail" } }],
    [{ data: { malformed: true }, error: null }],
  ])("throws only the stable unavailable error for %j", async (rpcResult) => {
    rpc.mockResolvedValue(rpcResult);

    const rejection = expect(getAdminDashboard()).rejects;
    await rejection.toBeInstanceOf(AdminDashboardUnavailableError);
    await rejection.toThrow("admin_dashboard_unavailable");
    await rejection.not.toThrow(/database detail|malformed/i);
  });

  it("does not translate authorization failures", async () => {
    const authorizationError = new Error("mfa_required");
    requireAdmin.mockRejectedValue(authorizationError);

    await expect(getAdminDashboard()).rejects.toBe(authorizationError);
    expect(createClient).not.toHaveBeenCalled();
  });
});
