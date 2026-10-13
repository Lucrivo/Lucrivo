import { describe, expect, it } from "vitest";

import { scaledInteger } from "./decimal-input";

describe("scaledInteger", () => {
  it("parses Brazilian currency without floating-point arithmetic", () => {
    expect(scaledInteger("R$ 1.234,56", 2)).toBe(123456);
  });

  it("parses a decimal point convention", () => {
    expect(scaledInteger("1234.56", 2)).toBe(123456);
  });

  it("rejects more fractional digits than the requested scale", () => {
    expect(() => scaledInteger("1,234", 2)).toThrow("invalid_decimal");
  });

  it("rejects integers outside the JavaScript safe range", () => {
    expect(() =>
      scaledInteger(String(Number.MAX_SAFE_INTEGER) + "0", 0),
    ).toThrow("unsafe_integer");
  });

  it("supports detailed-diagnosis quantity and unit-cost scales exactly", () => {
    expect(scaledInteger("0,125", 6)).toBe(125_000);
    expect(scaledInteger("0,0050", 4)).toBe(50);
    expect(() => scaledInteger("0,0000001", 6)).toThrow("invalid_decimal");
  });
});
