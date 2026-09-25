import { describe, expect, it } from "vitest";

import {
  hasExplicitUserFilters,
  parseStoredAdminUserFilters,
  resolveAdminUserFilters,
} from "./admin-user-filter-cookie";

describe("admin user filter cookie", () => {
  const saved = JSON.stringify({
    q: "cliente@example.com",
    state: "blocked",
    access: "courtesy",
  });

  it("restores saved filters when the URL only contains pagination", () => {
    expect(resolveAdminUserFilters({ cursor: "next" }, saved)).toEqual({
      q: "cliente@example.com",
      state: "blocked",
      access: "courtesy",
      cursor: "next",
    });
  });

  it("gives explicit URL filters priority over the cookie", () => {
    expect(resolveAdminUserFilters({ state: "active" }, saved)).toEqual({
      q: "",
      state: "active",
      access: "all",
    });
  });

  it("falls back safely for malformed, oversized or unknown cookie data", () => {
    expect(resolveAdminUserFilters({}, "not-json")).toEqual({
      q: "",
      state: "current",
      access: "all",
    });
    expect(parseStoredAdminUserFilters("x".repeat(1025))).toBeNull();
    expect(
      parseStoredAdminUserFilters(
        JSON.stringify({ q: "", state: "active", access: "all", extra: 1 }),
      ),
    ).toBeNull();
  });

  it("recognizes every explicit filter parameter", () => {
    expect(hasExplicitUserFilters({ q: "" })).toBe(true);
    expect(hasExplicitUserFilters({ state: "current" })).toBe(true);
    expect(hasExplicitUserFilters({ access: "all" })).toBe(true);
    expect(hasExplicitUserFilters({ cursor: "next" })).toBe(false);
  });
});
