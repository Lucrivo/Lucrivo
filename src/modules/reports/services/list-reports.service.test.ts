import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decodeReportsCursor,
  encodeReportsCursor,
  listOwnedReports,
} from "./list-reports.service";

const createdAt = "2026-08-28T22:30:00.000Z";

function row(
  id: number,
  timestamp = createdAt,
  identity: {
    category: "service" | "product" | "production";
    scenario: string;
  } = {
    category: "service",
    scenario: "hour",
  },
) {
  return {
    id,
    business_category: identity.category,
    scenario: identity.scenario,
    created_at: timestamp,
    current_price_cents: 8_000,
    real_margin_basis_points: 1_700,
    unit_profit_cents: 1_360,
    verdict: "adequate_margin",
    priority: "volume",
    unit: "hour",
  };
}

describe("report cursor", () => {
  it("round-trips a stable opaque tuple", () => {
    const value = { createdAt, id: 42 };
    const encoded = encodeReportsCursor(value);

    expect(encoded).not.toContain(createdAt);
    expect(decodeReportsCursor(encoded)).toEqual(value);
    expect(encodeReportsCursor(decodeReportsCursor(encoded)!)).toBe(encoded);
  });

  it.each(["", "not-base64", "e30", "eyJpZCI6NDJ9"])(
    "rejects malformed cursor %s",
    (cursor) => {
      expect(decodeReportsCursor(cursor)).toBeNull();
    },
  );
});

describe("listOwnedReports", () => {
  const select = vi.fn();
  const byUser = vi.fn();
  const or = vi.fn();
  const firstOrder = vi.fn();
  const secondOrder = vi.fn();
  const limit = vi.fn();
  const from = vi.fn();
  const supabase = { from };

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select });
    select.mockReturnValue({ eq: byUser });
    byUser.mockReturnValue({ or, order: firstOrder });
    or.mockReturnValue({ order: firstOrder });
    firstOrder.mockReturnValue({ order: secondOrder });
    secondOrder.mockReturnValue({ limit });
    limit.mockResolvedValue({ data: [row(42)], error: null });
  });

  async function list(cursor?: string) {
    return listOwnedReports({
      supabase: supabase as never,
      userId: "trusted-user",
      cursor,
    });
  }

  it("selects only owned summary columns in deterministic order", async () => {
    await expect(list()).resolves.toEqual({
      status: "success",
      reports: [
        {
          id: 42,
          businessCategory: "service",
          scenario: "hour",
          createdAt,
          currentPriceCents: 8_000,
          realMarginBasisPoints: 1_700,
          unitProfitCents: 1_360,
          verdict: "adequate_margin",
          priority: "volume",
          unit: "hour",
        },
      ],
      nextCursor: null,
    });

    expect(from).toHaveBeenCalledWith("diagnoses");
    expect(select).toHaveBeenCalledWith(
      "id, business_category, scenario, created_at, current_price_cents, real_margin_basis_points, unit_profit_cents, verdict, priority, unit",
    );
    expect(select.mock.calls[0]?.[0]).not.toContain("report_snapshot");
    expect(byUser).toHaveBeenCalledWith("user_id", "trusted-user");
    expect(firstOrder).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(secondOrder).toHaveBeenCalledWith("id", { ascending: false });
    expect(limit).toHaveBeenCalledWith(13);
    expect(or).not.toHaveBeenCalled();
  });

  it("maps Product enum values without loading the snapshot", async () => {
    limit.mockResolvedValue({
      data: [
        row(84, "2026-08-31T15:00:00.000Z", {
          category: "product",
          scenario: "resale",
        }),
      ],
      error: null,
    });

    await expect(list()).resolves.toMatchObject({
      status: "success",
      reports: [
        expect.objectContaining({
          id: 84,
          businessCategory: "product",
          scenario: "resale",
        }),
      ],
    });
    expect(select.mock.calls[0]?.[0]).not.toContain("report_snapshot");
  });

  it("maps Production enum values without loading the snapshot", async () => {
    limit.mockResolvedValue({
      data: [
        row(126, "2026-09-01T15:00:00.000Z", {
          category: "production",
          scenario: "manufacturing",
        }),
      ],
      error: null,
    });

    await expect(list()).resolves.toMatchObject({
      status: "success",
      reports: [
        expect.objectContaining({
          id: 126,
          businessCategory: "production",
          scenario: "manufacturing",
        }),
      ],
    });
    expect(select.mock.calls[0]?.[0]).not.toContain("report_snapshot");
  });

  it("applies a validated tuple-equivalent keyset cursor", async () => {
    const cursor = encodeReportsCursor({ createdAt, id: 42 });

    await list(cursor);

    expect(or).toHaveBeenCalledWith(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.42)`,
    );
  });

  it("treats a malformed cursor as the first page", async () => {
    await list("malformed-by-the-browser");

    expect(or).not.toHaveBeenCalled();
    expect(limit).toHaveBeenCalledWith(13);
  });

  it("returns twelve rows and a cursor only when a thirteenth exists", async () => {
    const rows = Array.from({ length: 13 }, (_, index) =>
      row(
        100 - index,
        `2026-08-${String(28 - index).padStart(2, "0")}T22:30:00.000Z`,
      ),
    );
    limit.mockResolvedValue({ data: rows, error: null });

    const result = await list();

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("unexpected result");
    expect(result.reports).toHaveLength(12);
    expect(result.reports.at(-1)?.id).toBe(89);
    expect(decodeReportsCursor(result.nextCursor!)).toEqual({
      createdAt: rows[11]?.created_at,
      id: 89,
    });
  });

  it("does not return a cursor for exactly twelve rows", async () => {
    limit.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => row(20 - index)),
      error: null,
    });

    await expect(list()).resolves.toMatchObject({
      status: "success",
      nextCursor: null,
    });
  });

  it("sanitizes provider errors and thrown failures", async () => {
    limit.mockResolvedValueOnce({
      data: null,
      error: { code: "XX001", message: "private provider detail" },
    });
    await expect(list()).resolves.toEqual({ status: "read_failed" });

    limit.mockRejectedValueOnce(new Error("private provider detail"));
    await expect(list()).resolves.toEqual({ status: "read_failed" });
  });
});
