import { describe, expect, it } from "vitest";

import {
  isLaunchOfferActive,
  isPromotionalCatalog,
  resolveLaunchOffer,
} from "./launch-offer";

const start = "2026-10-20T09:00:00-03:00";
const normalizedStart = "2026-10-20T12:00:00.000Z";
const bonusEndsAt = "2026-11-04T12:00:00.000Z";
const promotionEndsAt = "2026-11-19T12:00:00.000Z";

describe("resolveLaunchOffer", () => {
  it.each([
    [undefined, normalizedStart, "disabled", "standard"],
    ["", normalizedStart, "invalid", null],
    ["2026-10-20", normalizedStart, "invalid", null],
    [start, "2026-10-20T11:59:59.999Z", "scheduled", "standard"],
    [start, normalizedStart, "bonus_active", "launch"],
    [start, "2026-11-04T11:59:59.999Z", "bonus_active", "launch"],
    [start, bonusEndsAt, "price_active", "launch_price"],
    [start, "2026-11-19T11:59:59.999Z", "price_active", "launch_price"],
    [start, promotionEndsAt, "expired", "standard"],
  ] as const)(
    "resolves %s at %s as %s",
    (rawStartAt, now, phase, catalogCode) => {
      expect(
        resolveLaunchOffer({ rawStartAt, now: new Date(now) }),
      ).toMatchObject({ phase, catalogCode });
    },
  );

  it("normalizes every configured boundary to UTC", () => {
    expect(
      resolveLaunchOffer({
        rawStartAt: start,
        now: new Date("2026-10-20T11:59:59.999Z"),
      }),
    ).toEqual({
      phase: "scheduled",
      catalogCode: "standard",
      startsAt: normalizedStart,
      bonusEndsAt,
      promotionEndsAt,
    });
  });

  it("exposes the boundary relevant to each active phase", () => {
    expect(
      resolveLaunchOffer({ rawStartAt: start, now: new Date(normalizedStart) }),
    ).toMatchObject({
      phase: "bonus_active",
      startsAt: normalizedStart,
      bonusEndsAt,
      promotionEndsAt,
      endsAt: bonusEndsAt,
    });
    expect(
      resolveLaunchOffer({ rawStartAt: start, now: new Date(bonusEndsAt) }),
    ).toMatchObject({
      phase: "price_active",
      startsAt: normalizedStart,
      bonusEndsAt,
      promotionEndsAt,
      endsAt: promotionEndsAt,
    });
  });

  it("rejects a non-finite current date", () => {
    expect(
      resolveLaunchOffer({ rawStartAt: start, now: new Date(Number.NaN) }),
    ).toEqual({
      phase: "invalid",
      catalogCode: null,
      startsAt: null,
      bonusEndsAt: null,
      promotionEndsAt: null,
    });
  });
});

describe("launch offer guards", () => {
  it("recognizes only promotional catalogs", () => {
    expect(isPromotionalCatalog("launch")).toBe(true);
    expect(isPromotionalCatalog("launch_price")).toBe(true);
    expect(isPromotionalCatalog("standard")).toBe(false);
  });

  it("recognizes only the two active phases", () => {
    expect(
      isLaunchOfferActive(
        resolveLaunchOffer({
          rawStartAt: start,
          now: new Date(normalizedStart),
        }),
      ),
    ).toBe(true);
    expect(
      isLaunchOfferActive(
        resolveLaunchOffer({ rawStartAt: start, now: new Date(bonusEndsAt) }),
      ),
    ).toBe(true);
    expect(
      isLaunchOfferActive(
        resolveLaunchOffer({
          rawStartAt: start,
          now: new Date(promotionEndsAt),
        }),
      ),
    ).toBe(false);
  });
});
