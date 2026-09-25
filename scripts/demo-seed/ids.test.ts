import { describe, expect, it } from "vitest";

import { seedUuid } from "./ids";

describe("seedUuid", () => {
  it("allocates stable UUIDs per kind and ordinal", () => {
    expect(seedUuid("user", 0)).toBe("d1000000-0000-4000-8000-000000000000");
    expect(seedUuid("user", 96)).toBe("d1000000-0000-4000-8000-000000000060");
    expect(seedUuid("submission", 1, 35)).not.toBe(
      seedUuid("submission", 1, 34),
    );
  });

  it("keeps kinds and owner/child pairs unique", () => {
    const values = new Set([
      seedUuid("user", 1),
      seedUuid("identity", 1),
      seedUuid("submission", 1, 0),
      seedUuid("submission", 1, 1),
      seedUuid("submission", 2, 0),
    ]);

    expect(values.size).toBe(5);
  });

  it.each([
    ["negative", -1, undefined],
    ["fractional", 1.5, undefined],
    ["owner overflow", 0x1000000, 0],
    ["child overflow", 1, 0x1000000],
  ] as const)("rejects a %s ordinal", (_label, owner, child) => {
    expect(() => seedUuid("user", owner, child)).toThrow(/ordinal/i);
  });
});
