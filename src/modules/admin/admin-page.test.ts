import { describe, expect, it } from "vitest";
import { z } from "zod";

import { adminPageSchema, pageNumberSchema } from "./admin-page";

describe("administrative page contract", () => {
  const schema = adminPageSchema(z.object({ id: z.string() }).strict());

  it("accepts exact page totals and an empty first page", () => {
    expect(
      schema.parse({
        items: [{ id: "one" }],
        page: 2,
        pageSize: 20,
        totalCount: 21,
        totalPages: 2,
      }),
    ).toMatchObject({ page: 2, totalPages: 2 });
    expect(
      schema.safeParse({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
      }).success,
    ).toBe(true);
  });

  it("rejects inconsistent totals, extra keys and invalid pages", () => {
    expect(
      schema.safeParse({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 21,
        totalPages: 1,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        nextCursor: null,
      }).success,
    ).toBe(false);
    expect(pageNumberSchema.safeParse(0).success).toBe(false);
  });
});
