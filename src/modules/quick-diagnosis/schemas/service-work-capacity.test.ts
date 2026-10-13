import { describe, expect, it } from "vitest";

import {
  normalizeMonthlyWorkMinutes,
  parseServiceWorkPeriodMinutes,
} from "./service-work-capacity";

describe("service work capacity", () => {
  it.each([
    ["month", "160,5", 5, 9_630, 9_630],
    ["week", "40", 5, 2_400, 10_392],
    ["day", "8", 5, 480, 10_392],
  ] as const)(
    "normalizes %s capacity without floating-point drift",
    (period, raw, days, periodMinutes, monthlyMinutes) => {
      const parsed = parseServiceWorkPeriodMinutes(raw, period);

      expect(parsed).toBe(periodMinutes);
      expect(normalizeMonthlyWorkMinutes(period, parsed, days)).toBe(
        monthlyMinutes,
      );
    },
  );

  it.each([
    ["day", "24", 1_440],
    ["week", "168", 10_080],
    ["month", "744", 44_640],
  ] as const)("accepts the inclusive %s boundary", (period, raw, expected) => {
    expect(parseServiceWorkPeriodMinutes(raw, period)).toBe(expected);
  });

  it.each([
    ["day", "24,01"],
    ["week", "168,01"],
    ["month", "744,01"],
  ] as const)("rejects excessive %s hours", (period, raw) => {
    expect(() => parseServiceWorkPeriodMinutes(raw, period)).toThrow(
      "out_of_range",
    );
  });

  it("normalizes empty hours to zero", () => {
    expect(parseServiceWorkPeriodMinutes("", "month")).toBe(0);
  });
});
