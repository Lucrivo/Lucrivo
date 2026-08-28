function assertPositiveDenominator(denominator: bigint): void {
  if (denominator <= BigInt(0)) throw new Error("invalid_denominator");
}

function assertSafeInteger(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error("unsafe_integer");
}

function toSafeNumber(value: bigint): number {
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error("unsafe_integer");
  }

  return Number(value);
}

/** Divides integers and rounds exact halves away from zero. */
function roundDivide(numerator: bigint, denominator: bigint): number {
  assertPositiveDenominator(denominator);

  const sign = numerator < BigInt(0) ? BigInt(-1) : BigInt(1);
  const absoluteNumerator = numerator < BigInt(0) ? -numerator : numerator;
  const quotient = absoluteNumerator / denominator;
  const remainder = absoluteNumerator % denominator;
  const rounded =
    remainder * BigInt(2) >= denominator ? quotient + BigInt(1) : quotient;

  return toSafeNumber(sign * rounded);
}

/** Divides integers and rounds toward positive infinity. */
function ceilDivide(numerator: bigint, denominator: bigint): number {
  assertPositiveDenominator(denominator);

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded =
    numerator > BigInt(0) && remainder !== BigInt(0)
      ? quotient + BigInt(1)
      : quotient;

  return toSafeNumber(rounded);
}

/** Multiplies safe integers as BigInt before half-away-from-zero division. */
function multiplyDivideRound(
  multiplicand: number,
  multiplier: number,
  denominator: number,
): number {
  assertSafeInteger(multiplicand);
  assertSafeInteger(multiplier);
  assertSafeInteger(denominator);

  return roundDivide(
    BigInt(multiplicand) * BigInt(multiplier),
    BigInt(denominator),
  );
}

export { ceilDivide, multiplyDivideRound, roundDivide };
