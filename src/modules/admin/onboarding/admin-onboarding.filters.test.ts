import { describe, expect, it } from "vitest";

import {
  adminOnboardingUrl,
  parseAdminOnboardingNavigation,
} from "./admin-onboarding.filters";

describe("admin onboarding URL filters", () => {
  it("accepts scalar canonical filters", () => {
    expect(
      parseAdminOnboardingNavigation({
        tab: "contacts",
        q: "  Ana  ",
        segmentId: "2",
        subcategoryId: "3",
        consent: "granted",
        from: "2026-10-01",
        to: "2026-11-01",
        page: "3",
      }),
    ).toEqual({
      tab: "contacts",
      filters: {
        q: "Ana",
        segmentId: 2,
        subcategoryId: 3,
        consent: "granted",
        from: "2026-10-01",
        to: "2026-11-01",
        page: 3,
      },
    });
  });

  it("falls back safely for arrays, invalid values, and oversized search", () => {
    expect(
      parseAdminOnboardingNavigation({
        tab: ["contacts", "catalog"],
        q: "x".repeat(121),
        segmentId: "0",
        subcategoryId: "1.5",
        consent: "maybe",
        from: "2026-02-30",
        to: "09/10/2026",
        page: "0",
      }),
    ).toEqual({
      tab: "overview",
      filters: {
        q: "",
        segmentId: null,
        subcategoryId: null,
        consent: "all",
        from: null,
        to: null,
        page: 1,
      },
    });
  });

  it("serializes canonical parameters and resets the page after filter changes", () => {
    const navigation = parseAdminOnboardingNavigation({
      tab: "contacts",
      q: "Ana",
      consent: "declined",
      page: "3",
    });
    expect(adminOnboardingUrl(navigation)).toContain("page=3");
    expect(adminOnboardingUrl(navigation, { q: "Bruno" })).toBe(
      "/admin/onboarding?tab=contacts&q=Bruno&consent=declined",
    );
    expect(
      adminOnboardingUrl(parseAdminOnboardingNavigation({ tab: "overview" })),
    ).toBe("/admin/onboarding");
  });
});
