import { describe, expect, it } from "vitest";

import { ceilDivide, multiplyDivideRound, roundDivide } from "./integer-math";

describe("integer math", () => {
  it("rounds exact halves away from zero", () => {
    expect(roundDivide(BigInt(5), BigInt(2))).toBe(3);
    expect(roundDivide(BigInt(-5), BigInt(2))).toBe(-3);
    expect(roundDivide(BigInt(4), BigInt(3))).toBe(1);
  });

  it("rounds division upward", () => {
    expect(ceilDivide(BigInt(5), BigInt(2))).toBe(3);
    expect(ceilDivide(BigInt(4), BigInt(2))).toBe(2);
    expect(ceilDivide(BigInt(-5), BigInt(2))).toBe(-2);
  });

  it("multiplies before rounded division without floating-point drift", () => {
    expect(multiplyDivideRound(1001, 9250, 10000)).toBe(926);
    expect(multiplyDivideRound(-1001, 9250, 10000)).toBe(-926);
  });

  it("rejects nonpositive denominators", () => {
    expect(() => ceilDivide(BigInt(1), BigInt(0))).toThrow(
      "invalid_denominator",
    );
    expect(() => roundDivide(BigInt(1), BigInt(-1))).toThrow(
      "invalid_denominator",
    );
    expect(() => multiplyDivideRound(1, 1, 0)).toThrow("invalid_denominator");
  });

  it("rejects unsafe numeric inputs and outputs", () => {
    expect(() =>
      multiplyDivideRound(Number.MAX_SAFE_INTEGER + 1, 1, 1),
    ).toThrow("unsafe_integer");
    expect(() =>
      roundDivide(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1), BigInt(1)),
    ).toThrow("unsafe_integer");
  });
});
