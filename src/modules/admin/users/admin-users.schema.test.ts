import { describe, expect, it } from "vitest";

import {
  actionSchema,
  adminUserListSchema,
  listFilterSchema,
} from "./admin-users.schema";
import {
  decodeCursor,
  encodeCursor,
  listUrl,
  parseFilters,
} from "./admin-users.urls";

describe("admin user boundaries", () => {
  it("rejects malformed administrative projections", () => {
    expect(
      adminUserListSchema.safeParse({
        items: [{ id: "bad" }],
        nextCursor: null,
      }).success,
    ).toBe(false);
    expect(
      adminUserListSchema.safeParse({ items: [], nextCursor: null }).success,
    ).toBe(true);
  });

  it("validates action reason, expiry shape and version", () => {
    const base = {
      userId: "96300000-0000-4000-8000-000000000002",
      action: "blocked",
      reason: "Motivo",
      courtesyExpiresAt: null,
      expectedVersion: 0,
    };
    expect(actionSchema.safeParse(base).success).toBe(true);
    expect(actionSchema.safeParse({ ...base, reason: " " }).success).toBe(
      false,
    );
    expect(actionSchema.safeParse({ ...base, action: "edited" }).success).toBe(
      false,
    );
    expect(
      actionSchema.safeParse({ ...base, expectedVersion: -1 }).success,
    ).toBe(false);
    expect(
      actionSchema.safeParse({ ...base, action: "courtesy_granted" }).success,
    ).toBe(false);
  });

  it("bounds URL filters and round-trips pagination cursors", () => {
    expect(listFilterSchema.safeParse({ q: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(parseFilters({ state: "unknown" }).state).toBe("current");
    const cursor = {
      createdAt: "2026-09-16T12:00:00+00:00",
      id: "96300000-0000-4000-8000-000000000002",
    };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    expect(decodeCursor("invalid")).toBeNull();
    expect(listUrl(parseFilters({ q: "a@b.test", state: "blocked" }))).toBe(
      "/admin/users?q=a%40b.test&state=blocked",
    );
  });
});
