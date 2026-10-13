import { describe, expect, it } from "vitest";

import { resolveLaunchOffer } from "./launch-offer";

const start = "2026-10-20T09:00:00-03:00";
const cases = [
  [undefined, "2026-10-20T12:00:00.000Z", "disabled", "standard"],
  ["", "2026-10-20T12:00:00.000Z", "invalid", null],
  ["2026-10-20", "2026-10-20T12:00:00.000Z", "invalid", null],
  [start, "2026-10-20T11:59:59.999Z", "scheduled", "standard"],
  [start, "2026-10-20T12:00:00.000Z", "active", "launch"],
  [start, "2026-11-04T11:59:59.999Z", "active", "launch"],
  [start, "2026-11-04T12:00:00.000Z", "expired", "standard"],
] as const;

describe("resolveLaunchOffer", () => {
  it.each(cases)(
    "resolves %s at %s as %s",
    (rawStartAt, now, phase, catalogCode) => {
      expect(
        resolveLaunchOffer({ rawStartAt, now: new Date(now) }),
      ).toMatchObject({
        phase,
        catalogCode,
      });
    },
  );

  it("normalizes the active campaign boundaries to UTC", () => {
    expect(
      resolveLaunchOffer({
        rawStartAt: start,
        now: new Date("2026-10-20T12:00:00.000Z"),
      }),
    ).toMatchObject({
      startsAt: "2026-10-20T12:00:00.000Z",
      endsAt: "2026-11-04T12:00:00.000Z",
    });
  });

  it("rejects a non-finite current date", () => {
    expect(
      resolveLaunchOffer({ rawStartAt: start, now: new Date(Number.NaN) }),
    ).toEqual({
      phase: "invalid",
      catalogCode: null,
      startsAt: null,
      endsAt: null,
    });
  });
});
