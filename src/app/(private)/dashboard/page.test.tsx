import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClientDashboardFilters } from "@/modules/client-dashboard/client-dashboard.filters";

const {
  cookies,
  getClientDashboard,
  hasExplicitClientDashboardFilters,
  requireUser,
  resolveClientDashboardFilters,
} = vi.hoisted(() => ({
  cookies: vi.fn(),
  getClientDashboard: vi.fn(),
  hasExplicitClientDashboardFilters: vi.fn(),
  requireUser: vi.fn(),
  resolveClientDashboardFilters: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/client-dashboard/client-dashboard-filter-cookie", () => ({
  CLIENT_DASHBOARD_FILTER_COOKIE: "lucrivo_client_dashboard_filters",
  hasExplicitClientDashboardFilters,
  resolveClientDashboardFilters,
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

import DashboardPage, { ClientDashboardRouteContent } from "./page";

describe("DashboardPage", () => {
  const supabase = { rpc: vi.fn() };
  const filters: ClientDashboardFilters = {
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
    cookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    resolveClientDashboardFilters.mockReturnValue(filters);
    hasExplicitClientDashboardFilters.mockReturnValue(true);
    getClientDashboard.mockResolvedValue({
      dashboard: { hasAnyReports: true },
      focus: { status: "none" },
    });
  });

  it("parses search params and loads the protected dashboard with one user context", async () => {
    const searchParams = { category: "product", report: "42" };
    const page = await DashboardPage({
      searchParams: Promise.resolve(searchParams),
    });
    render(await ClientDashboardRouteContent({ filters }));

    expect(resolveClientDashboardFilters).toHaveBeenCalledWith(
      searchParams,
      undefined,
    );
    expect(hasExplicitClientDashboardFilters).toHaveBeenCalledWith(
      searchParams,
    );
    expect(page.type).toBe(Suspense);
    expect(requireUser).toHaveBeenCalledOnce();
    expect(getClientDashboard).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      filters,
    });
    expect(screen.getByText("Dashboard com histórico")).toBeVisible();
  });

  it("passes malformed params to the filter boundary for normalization", async () => {
    const malformed = { category: ["product", "service"], to: "not-a-date" };
    render(await DashboardPage({ searchParams: Promise.resolve(malformed) }));
    expect(resolveClientDashboardFilters).toHaveBeenCalledWith(
      malformed,
      undefined,
    );
  });

  it("passes the saved cookie to the filter boundary", async () => {
    cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "saved-dashboard-filters" })),
    });

    await DashboardPage({ searchParams: Promise.resolve({}) });

    expect(resolveClientDashboardFilters).toHaveBeenCalledWith(
      {},
      "saved-dashboard-filters",
    );
  });

  it("renders the no-history composition returned by the service", async () => {
    getClientDashboard.mockResolvedValue({
      dashboard: { hasAnyReports: false },
      focus: { status: "none" },
    });
    render(await ClientDashboardRouteContent({ filters }));
    expect(screen.getByText("Dashboard sem histórico")).toBeVisible();
  });

  it("rethrows the stable aggregate failure for the route error boundary", async () => {
    getClientDashboard.mockRejectedValue(
      new Error("client_dashboard_unavailable"),
    );
    await expect(ClientDashboardRouteContent({ filters })).rejects.toThrow(
      "client_dashboard_unavailable",
    );
  });
});
