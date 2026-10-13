import { describe, expect, it } from "vitest";

import {
  hasExplicitClientDashboardFilters,
  parseStoredClientDashboardFilters,
  resolveClientDashboardFilters,
} from "./client-dashboard-filter-cookie";

describe("client dashboard filter cookie", () => {
  const saved = JSON.stringify({
    from: "2026-09-01",
    to: "2026-10-01",
    categories: ["product"],
    modes: ["detailed"],
    scenarios: ["resale"],
    verdicts: ["positive_result"],
    priorities: ["margin"],
    dataState: "complete",
  });

  it("restores saved filters and keeps a temporary report focus", () => {
    expect(resolveClientDashboardFilters({ report: "42" }, saved)).toEqual({
      from: "2026-09-01",
      to: "2026-10-01",
      categories: ["product"],
      modes: ["detailed"],
      scenarios: ["resale"],
      verdicts: ["positive_result"],
      priorities: ["margin"],
      dataState: "complete",
      reportId: 42,
    });
  });

  it("gives explicit URL filters priority over the cookie", () => {
    expect(
      resolveClientDashboardFilters({ category: "service" }, saved),
    ).toEqual(
      expect.objectContaining({
        categories: ["service"],
        modes: [],
        scenarios: [],
        reportId: null,
      }),
    );
  });

  it("falls back safely for malformed, oversized, incompatible, or unknown data", () => {
    expect(resolveClientDashboardFilters({}, "not-json")).toEqual(
      resolveClientDashboardFilters({}, undefined),
    );
    expect(parseStoredClientDashboardFilters("x".repeat(2049))).toBeNull();
    expect(
      parseStoredClientDashboardFilters(
        JSON.stringify({
          ...JSON.parse(saved),
          categories: ["service"],
          scenarios: ["resale"],
          extra: true,
        }),
      ),
    ).toBeNull();
  });

  it("recognizes real filter parameters but not the report focus", () => {
    expect(hasExplicitClientDashboardFilters({ from: "" })).toBe(true);
    expect(hasExplicitClientDashboardFilters({ category: "product" })).toBe(
      true,
    );
    expect(hasExplicitClientDashboardFilters({ dataState: "all" })).toBe(true);
    expect(hasExplicitClientDashboardFilters({ report: "42" })).toBe(false);
  });
});
