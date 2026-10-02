import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getClientDashboard, parseClientDashboardFilters, requireUser } =
  vi.hoisted(() => ({
    getClientDashboard: vi.fn(),
    parseClientDashboardFilters: vi.fn(),
    requireUser: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/client-dashboard/client-dashboard.filters", () => ({
  parseClientDashboardFilters,
}));
vi.mock("@/modules/client-dashboard/get-client-dashboard.service", () => ({
  getClientDashboard,
}));
vi.mock("@/modules/client-dashboard/components/client-dashboard", () => ({
  ClientDashboard: ({
    dashboard,
  }: {
    dashboard: { hasAnyReports: boolean };
  }) => (
    <div>
      {dashboard.hasAnyReports
        ? "Dashboard com histórico"
        : "Dashboard sem histórico"}
    </div>
  ),
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  const supabase = { rpc: vi.fn() };
  const filters = {
    from: null,
    to: null,
    categories: [],
    modes: [],
    scenarios: [],
    verdicts: [],
    priorities: [],
    dataState: "all",
    reportId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    parseClientDashboardFilters.mockReturnValue(filters);
    getClientDashboard.mockResolvedValue({
      dashboard: { hasAnyReports: true },
      focus: { status: "none" },
    });
  });

  it("parses search params and loads the protected dashboard with one user context", async () => {
    const searchParams = { category: "product", report: "42" };
    render(
      await DashboardPage({ searchParams: Promise.resolve(searchParams) }),
    );

    expect(parseClientDashboardFilters).toHaveBeenCalledWith(searchParams);
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getClientDashboard).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      filters,
    });
    expect(screen.getByText("Dashboard com histórico")).toBeVisible();
  });

  it("passes malformed params to the boundary parser for normalization", async () => {
    const malformed = { category: ["product", "service"], to: "not-a-date" };
    render(await DashboardPage({ searchParams: Promise.resolve(malformed) }));
    expect(parseClientDashboardFilters).toHaveBeenCalledWith(malformed);
  });

  it("renders the no-history composition returned by the service", async () => {
    getClientDashboard.mockResolvedValue({
      dashboard: { hasAnyReports: false },
      focus: { status: "none" },
    });
    render(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Dashboard sem histórico")).toBeVisible();
  });

  it("rethrows the stable aggregate failure for the route error boundary", async () => {
    getClientDashboard.mockRejectedValue(
      new Error("client_dashboard_unavailable"),
    );
    await expect(
      DashboardPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("client_dashboard_unavailable");
  });
});
