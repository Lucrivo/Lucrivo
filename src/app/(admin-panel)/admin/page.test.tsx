import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminDashboard, getRecentSubscriptions } = vi.hoisted(() => ({
  getAdminDashboard: vi.fn(),
  getRecentSubscriptions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/admin/dashboard/get-admin-dashboard.service", () => ({
  getAdminDashboard,
}));
vi.mock("@/modules/admin/dashboard/get-recent-subscriptions.service", () => ({
  getRecentSubscriptions,
}));
vi.mock("@/modules/admin/dashboard/components/admin-dashboard", () => ({
  AdminDashboard: ({
    dashboard,
    subscriptionFilters,
  }: {
    dashboard: { generatedAtLabel: string };
    subscriptionFilters: { period: string };
  }) => (
    <div>
      dashboard:{dashboard.generatedAtLabel}:{subscriptionFilters.period}
    </div>
  ),
}));

import AdminDashboardPage from "./page";

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRecentSubscriptions.mockResolvedValue([]);
  });

  it("loads the protected snapshot and renders the dashboard", async () => {
    getAdminDashboard.mockResolvedValue({
      generatedAtLabel: "16/09/2026, 15:30",
    });

    render(await AdminDashboardPage({ searchParams: Promise.resolve({}) }));

    expect(getAdminDashboard).toHaveBeenCalledOnce();
    expect(screen.getByText("dashboard:16/09/2026, 15:30:all")).toBeVisible();
    expect(getRecentSubscriptions).toHaveBeenCalledWith({
      period: "all",
      billingMode: "all",
      state: "all",
    });
  });

  it("parses subscription filters before loading the list", async () => {
    getAdminDashboard.mockResolvedValue({ generatedAtLabel: "agora" });
    getRecentSubscriptions.mockResolvedValue([]);

    render(
      await AdminDashboardPage({
        searchParams: Promise.resolve({
          period: "30d",
          billing: "annual",
          subscriptionState: "active",
        }),
      }),
    );

    expect(getRecentSubscriptions).toHaveBeenCalledWith({
      period: "30d",
      billingMode: "annual",
      state: "active",
    });
  });
});
