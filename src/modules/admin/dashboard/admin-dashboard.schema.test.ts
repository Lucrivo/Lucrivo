import { describe, expect, it } from "vitest";

import { adminDashboardSnapshotSchema } from "./admin-dashboard.schema";

const validSnapshot = {
  generatedAt: "2026-09-16T18:30:00.000Z",
  metrics: {
    newUsers: { today: 2, week: 8, month: 21 },
    activeUsers: 45,
    freeDiagnoses: 19,
    activeSubscriptions: 12,
    canceledSubscriptions: 1,
    monthlyRevenueCents: 289_900,
    cancellationOpeningBase: 20,
    cancellationRateBasisPoints: 500,
  },
  revenueHistory: [
    "2025-10-01",
    "2025-11-01",
    "2025-12-01",
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ].map((period, index) => ({
    period,
    valueCents: index * 10_000,
  })),
  userGrowth: [
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ].map((period, index) => ({
    period,
    value: index + 1,
  })),
  recentSubscriptions: [
    {
      id: "95000000-0000-4000-8000-000000000001",
      email: "cliente@example.com",
      billingMode: "monthly",
      status: "active",
      createdAt: "2026-09-16T15:00:00.000Z",
    },
  ],
};

describe("adminDashboardSnapshotSchema", () => {
  it("accepts the complete RPC snapshot", () => {
    expect(adminDashboardSnapshotSchema.safeParse(validSnapshot).success).toBe(
      true,
    );
  });

  it.each([
    [
      "missing key",
      () => {
        const candidate = structuredClone(validSnapshot);
        Reflect.deleteProperty(candidate.metrics, "activeUsers");
        return candidate;
      },
    ],
    [
      "negative count",
      () => ({
        ...validSnapshot,
        metrics: { ...validSnapshot.metrics, activeUsers: -1 },
      }),
    ],
    [
      "fractional count",
      () => ({
        ...validSnapshot,
        metrics: { ...validSnapshot.metrics, freeDiagnoses: 1.5 },
      }),
    ],
    [
      "eleven revenue buckets",
      () => ({
        ...validSnapshot,
        revenueHistory: validSnapshot.revenueHistory.slice(1),
      }),
    ],
    [
      "thirteen revenue buckets",
      () => ({
        ...validSnapshot,
        revenueHistory: [
          ...validSnapshot.revenueHistory,
          { period: "2026-10-01", valueCents: 1 },
        ],
      }),
    ],
    [
      "five growth buckets",
      () => ({
        ...validSnapshot,
        userGrowth: validSnapshot.userGrowth.slice(1),
      }),
    ],
    [
      "six subscriptions",
      () => ({
        ...validSnapshot,
        recentSubscriptions: Array.from({ length: 6 }, (_, index) => ({
          ...validSnapshot.recentSubscriptions[0],
          id: `95000000-0000-4000-8000-00000000000${index + 1}`,
        })),
      }),
    ],
    [
      "unknown status",
      () => ({
        ...validSnapshot,
        recentSubscriptions: [
          { ...validSnapshot.recentSubscriptions[0], status: "paused" },
        ],
      }),
    ],
    [
      "malformed timestamp",
      () => ({
        ...validSnapshot,
        generatedAt: "16/09/2026 15:30",
      }),
    ],
    [
      "impossible month",
      () => ({
        ...validSnapshot,
        userGrowth: validSnapshot.userGrowth.map((point, index) =>
          index === 0 ? { ...point, period: "2026-13-01" } : point,
        ),
      }),
    ],
    ["unknown key", () => ({ ...validSnapshot, internalNote: "private" })],
  ])("rejects a snapshot with %s", (_name, buildCandidate) => {
    expect(
      adminDashboardSnapshotSchema.safeParse(buildCandidate()).success,
    ).toBe(false);
  });
});
