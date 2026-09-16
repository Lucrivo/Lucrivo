import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminDashboard } = vi.hoisted(() => ({
  getAdminDashboard: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/admin/dashboard/get-admin-dashboard.service", () => ({
  getAdminDashboard,
}));
vi.mock("@/modules/admin/dashboard/components/admin-dashboard", () => ({
  AdminDashboard: ({
    dashboard,
  }: {
    dashboard: { generatedAtLabel: string };
  }) => <div>dashboard:{dashboard.generatedAtLabel}</div>,
}));

import AdminDashboardPage from "./page";

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the protected snapshot and renders the dashboard", async () => {
    getAdminDashboard.mockResolvedValue({
      generatedAtLabel: "16/09/2026, 15:30",
    });

    render(await AdminDashboardPage());

    expect(getAdminDashboard).toHaveBeenCalledOnce();
    expect(screen.getByText("dashboard:16/09/2026, 15:30")).toBeVisible();
  });
});
