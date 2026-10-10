import { describe, expect, it } from "vitest";

import {
  adminOnboardingUrl,
  decodeAdminOnboardingCursor,
  encodeAdminOnboardingCursor,
  parseAdminOnboardingNavigation,
} from "./admin-onboarding.filters";

describe("admin onboarding URL filters", () => {
  it("accepts scalar canonical filters", () => {
    const cursor = encodeAdminOnboardingCursor({
      completedAt: "2026-10-09T12:00:00+00:00",
      userId: "97000000-0000-4000-8000-000000000002",
    });
    expect(
      parseAdminOnboardingNavigation({
        tab: "contacts",
        q: "  Ana  ",
        segmentId: "2",
        subcategoryId: "3",
        consent: "granted",
        from: "2026-10-01",
        to: "2026-11-01",
        cursor,
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
        cursor,
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
        cursor: "not-base64-json",
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
        cursor: null,
      },
    });
  });

  it("round-trips only bounded valid cursor JSON", () => {
    const value = {
      completedAt: "2026-10-09T12:00:00+00:00",
      userId: "97000000-0000-4000-8000-000000000002",
    };
    expect(
      decodeAdminOnboardingCursor(encodeAdminOnboardingCursor(value)),
    ).toEqual(value);
    expect(decodeAdminOnboardingCursor("x".repeat(501))).toBeNull();
    expect(
      decodeAdminOnboardingCursor(
        Buffer.from(JSON.stringify({ ...value, extra: true })).toString(
          "base64url",
        ),
      ),
    ).toBeNull();
  });

  it("serializes canonical parameters and clears cursor after filter changes", () => {
    const navigation = parseAdminOnboardingNavigation({
      tab: "contacts",
      q: "Ana",
      consent: "declined",
      cursor: encodeAdminOnboardingCursor({
        completedAt: "2026-10-09T12:00:00+00:00",
        userId: "97000000-0000-4000-8000-000000000002",
      }),
    });
    expect(adminOnboardingUrl(navigation)).toContain("cursor=");
    expect(adminOnboardingUrl(navigation, { q: "Bruno" })).toBe(
      "/admin/onboarding?tab=contacts&q=Bruno&consent=declined",
    );
    expect(
      adminOnboardingUrl(parseAdminOnboardingNavigation({ tab: "overview" })),
    ).toBe("/admin/onboarding");
  });
});
