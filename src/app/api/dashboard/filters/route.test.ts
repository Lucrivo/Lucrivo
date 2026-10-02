import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser } = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-user", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/modules/auth/services/require-user")
    >();
  return { ...actual, requireUser };
});

import { CLIENT_DASHBOARD_FILTER_COOKIE } from "@/modules/client-dashboard/client-dashboard-filter-cookie";

import { DELETE, POST } from "./route";

const validFilters = {
  from: "2026-09-01",
  to: "2026-10-01",
  categories: ["product"],
  modes: ["detailed"],
  scenarios: ["resale"],
  verdicts: ["positive_result"],
  priorities: ["margin"],
  dataState: "complete",
};

describe("client dashboard filter route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user" });
  });

  it("stores validated filters for 90 days without a report focus", async () => {
    const response = await POST(
      new Request("http://localhost/api/dashboard/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validFilters),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      href: "/dashboard?from=2026-09-01&to=2026-10-01&category=product&mode=detailed&scenario=resale&verdict=positive_result&priority=margin&dataState=complete",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${CLIENT_DASHBOARD_FILTER_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=7776000");
    expect(response.headers.get("set-cookie")).toContain("Path=/dashboard");
  });

  it("rejects invalid or focused filters without setting a cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/dashboard/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validFilters, reportId: 42 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("expires saved filters and returns the canonical dashboard URL", async () => {
    const response = await DELETE();

    await expect(response.json()).resolves.toEqual({ href: "/dashboard" });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      `${CLIENT_DASHBOARD_FILTER_COOKIE}=;`,
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
