import type { SeedUuidKind } from "./model";

const PREFIX_BY_KIND: Record<SeedUuidKind, string> = {
  user: "d1000000",
  identity: "d1100000",
  contract: "d1200000",
  payment: "d1300000",
  submission: "d1400000",
  item: "d1500000",
  ingredient: "d1600000",
};

const MAX_COMPONENT = 0xffffff;
const COMPONENT_BASE = BigInt(0x1000000);

function assertOrdinal(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > MAX_COMPONENT) {
    throw new RangeError(
      `${label} ordinal must be an integer from 0 through ${MAX_COMPONENT}.`,
    );
  }
}

function seedUuid(
  kind: SeedUuidKind,
  ownerOrdinal: number,
  childOrdinal?: number,
): string {
  assertOrdinal(ownerOrdinal, "Owner");
  if (childOrdinal !== undefined) assertOrdinal(childOrdinal, "Child");

  const suffixValue =
    childOrdinal === undefined
      ? BigInt(ownerOrdinal)
      : BigInt(ownerOrdinal) * COMPONENT_BASE + BigInt(childOrdinal);
  const suffix = suffixValue.toString(16).padStart(12, "0");

  return `${PREFIX_BY_KIND[kind]}-0000-4000-8000-${suffix}`;
}

export { seedUuid };
