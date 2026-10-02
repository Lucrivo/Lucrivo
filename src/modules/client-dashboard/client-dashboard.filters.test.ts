import { describe, expect, it } from "vitest";

import {
  buildClientDashboardHref,
  nextCalendarDate,
  parseClientDashboardFilters,
  previousCalendarDate,
  toClientDashboardRpcArgs,
} from "./client-dashboard.filters";

describe("parseClientDashboardFilters", () => {
  it("parses, deduplicates, and orders the canonical dashboard filters", () => {
    expect(
      parseClientDashboardFilters({
        category: "production,product,product,unknown",
        mode: "detailed",
        scenario: "hour,resale,manufacturing",
        verdict: "operational_loss,direct_loss",
        priority: "price",
        dataState: "pending",
        from: "2026-09-01",
        to: "2026-10-01",
        report: "42",
      }),
    ).toEqual({
      from: "2026-09-01",
      to: "2026-10-01",
      categories: ["product", "production"],
      modes: ["detailed"],
      scenarios: ["resale", "manufacturing"],
      verdicts: ["direct_loss", "operational_loss"],
      priorities: ["price"],
      dataState: "pending",
      reportId: 42,
    });
  });

  it("ignores repeated scalar params, invalid dates, and unsafe report ids", () => {
    expect(
      parseClientDashboardFilters({
        from: ["2026-09-01", "2026-09-02"],
        to: "2026-02-30",
        report: String(Number.MAX_SAFE_INTEGER + 1),
      }),
    ).toMatchObject({ from: null, to: null, reportId: null });
  });

  it("removes an inverted range before it reaches the RPC", () => {
    expect(
      parseClientDashboardFilters({
        from: "2026-10-01",
        to: "2026-09-01",
      }),
    ).toMatchObject({ from: null, to: null });
  });

  it("keeps only scenarios compatible with selected categories", () => {
    expect(
      parseClientDashboardFilters({
        category: "service",
        scenario: "hour,resale,digital,manufacturing,month",
      }).scenarios,
    ).toEqual(["hour", "month"]);

    expect(
      parseClientDashboardFilters({
        category: "product,production",
        scenario: "hour,resale,digital,manufacturing",
      }).scenarios,
    ).toEqual(["resale", "digital", "manufacturing"]);
  });

  it("caps enum lists through the explicit accepted sets", () => {
    const parsed = parseClientDashboardFilters({
      category: "service,product,production,other",
      mode: "quick,detailed,other",
      scenario:
        "hour,minute,appointment,day,week,month,resale,digital,digital,manufacturing,other",
      verdict:
        "missing_price,direct_loss,incomplete_volume,operational_loss,no_sales,break_even,positive_result,other",
      priority: "cost,data,price,margin,volume,other",
    });

    expect(parsed.categories).toHaveLength(3);
    expect(parsed.modes).toHaveLength(2);
    expect(parsed.scenarios).toHaveLength(9);
    expect(parsed.verdicts).toHaveLength(7);
    expect(parsed.priorities).toHaveLength(5);
  });

  it("uses safe defaults for unknown data state and empty input", () => {
    expect(parseClientDashboardFilters({ dataState: "unknown" })).toEqual(
      parseClientDashboardFilters({}),
    );
    expect(parseClientDashboardFilters({}).dataState).toBe("all");
  });
});

describe("dashboard filter serialization", () => {
  it("maps empty filters to explicit null RPC arguments", () => {
    expect(toClientDashboardRpcArgs(parseClientDashboardFilters({}))).toEqual({
      p_from_date: null,
      p_to_date: null,
      p_categories: null,
      p_modes: null,
      p_scenarios: null,
      p_verdicts: null,
      p_priorities: null,
      p_data_state: "all",
      p_focus_id: null,
    });
  });

  it("serializes keys in canonical order and percent-encodes list separators", () => {
    const filters = parseClientDashboardFilters({
      report: "42",
      dataState: "complete",
      priority: "margin,cost",
      verdict: "positive_result,direct_loss",
      scenario: "digital,resale",
      mode: "detailed,quick",
      category: "product",
      to: "2026-10-01",
      from: "2026-09-01",
    });

    expect(buildClientDashboardHref(filters, { reportId: 42 })).toBe(
      "/dashboard?from=2026-09-01&to=2026-10-01&category=product&mode=quick%2Cdetailed&scenario=resale%2Cdigital&verdict=direct_loss%2Cpositive_result&priority=cost%2Cmargin&dataState=complete&report=42",
    );
  });

  it("clears focus when another filter changes", () => {
    const filters = parseClientDashboardFilters({
      category: "product",
      report: "42",
    });

    expect(
      buildClientDashboardHref(filters, {
        verdicts: ["direct_loss", "operational_loss"],
      }),
    ).toBe(
      "/dashboard?category=product&verdict=direct_loss%2Coperational_loss",
    );
  });

  it("preserves filters when only focus changes and omits empty defaults", () => {
    expect(
      buildClientDashboardHref(parseClientDashboardFilters({}), {
        reportId: 7,
      }),
    ).toBe("/dashboard?report=7");

    expect(
      buildClientDashboardHref(parseClientDashboardFilters({}), {
        verdicts: ["direct_loss", "operational_loss"],
      }),
    ).toBe("/dashboard?verdict=direct_loss%2Coperational_loss");
  });
});

describe("dashboard calendar arithmetic", () => {
  it("moves across month boundaries in UTC", () => {
    expect(nextCalendarDate("2026-09-30")).toBe("2026-10-01");
    expect(previousCalendarDate("2026-10-01")).toBe("2026-09-30");
  });

  it("moves across leap-day and year boundaries", () => {
    expect(nextCalendarDate("2028-02-28")).toBe("2028-02-29");
    expect(previousCalendarDate("2026-01-01")).toBe("2025-12-31");
  });
});
