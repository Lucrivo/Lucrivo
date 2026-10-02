import { describe, expect, it } from "vitest";

import { clientDashboardSnapshotSchema } from "./client-dashboard.schema";

const validRecentReport = {
  id: 42,
  businessCategory: "product",
  scenario: "resale",
  analysisMode: "quick",
  createdAt: "2026-09-30T18:30:00.000Z",
  updatedAt: "2026-09-30T19:00:00.000Z",
  verdict: "positive_result",
  priority: "margin",
  hasPendingData: false,
  itemCount: null,
  realMarginBasisPoints: 2_500,
  monthlyResultCents: 125_000,
  schemaVersion: 3,
  calculationVersion: 3,
  contentVersion: 5,
} as const;

const validSnapshot = {
  generatedAt: "2026-10-01T12:00:00.000Z",
  filters: {
    from: null,
    to: null,
    categories: [],
    modes: [],
    scenarios: [],
    verdicts: [],
    priorities: [],
    dataState: "all",
  },
  hasAnyReports: true,
  focusReportId: 42,
  metrics: {
    totalReports: 1,
    positiveResultReports: 1,
    lossReports: 0,
    pendingDataReports: 0,
  },
  verdictCounts: [
    { verdict: "missing_price", count: 0 },
    { verdict: "direct_loss", count: 0 },
    { verdict: "incomplete_volume", count: 0 },
    { verdict: "operational_loss", count: 0 },
    { verdict: "no_sales", count: 0 },
    { verdict: "break_even", count: 0 },
    { verdict: "positive_result", count: 1 },
  ],
  priorityCounts: [
    { priority: "cost", count: 0 },
    { priority: "data", count: 0 },
    { priority: "price", count: 0 },
    { priority: "margin", count: 1 },
    { priority: "volume", count: 0 },
  ],
  recentReports: [validRecentReport],
} as const;

describe("clientDashboardSnapshotSchema", () => {
  it("accepts the exact aggregate payload contract", () => {
    expect(clientDashboardSnapshotSchema.safeParse(validSnapshot).success).toBe(
      true,
    );
  });

  it("rejects invalid boundaries and unexpected payload fields", () => {
    for (const invalid of [
      { ...validSnapshot, generatedAt: "not-a-date" },
      { ...validSnapshot, focusReportId: 0 },
      {
        ...validSnapshot,
        verdictCounts: validSnapshot.verdictCounts.slice(1),
      },
      { ...validSnapshot, priorityCounts: [] },
      {
        ...validSnapshot,
        recentReports: Array(7).fill(validRecentReport),
      },
      {
        ...validSnapshot,
        metrics: { ...validSnapshot.metrics, totalReports: -1 },
      },
      { ...validSnapshot, reportSnapshot: {} },
    ]) {
      expect(clientDashboardSnapshotSchema.safeParse(invalid).success).toBe(
        false,
      );
    }
  });

  it("requires canonical verdict and priority order rather than length alone", () => {
    const duplicateVerdicts = validSnapshot.verdictCounts.map(() => ({
      verdict: "missing_price" as const,
      count: 0,
    }));
    const reversedPriorities = [...validSnapshot.priorityCounts].reverse();

    expect(
      clientDashboardSnapshotSchema.safeParse({
        ...validSnapshot,
        verdictCounts: duplicateVerdicts,
      }).success,
    ).toBe(false);
    expect(
      clientDashboardSnapshotSchema.safeParse({
        ...validSnapshot,
        priorityCounts: reversedPriorities,
      }).success,
    ).toBe(false);
  });

  it("accepts nullable financial summary fields without converting them to zero", () => {
    expect(
      clientDashboardSnapshotSchema.safeParse({
        ...validSnapshot,
        recentReports: [
          {
            ...validRecentReport,
            itemCount: null,
            realMarginBasisPoints: null,
            monthlyResultCents: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects report summary versions that do not match category and mode", () => {
    expect(
      clientDashboardSnapshotSchema.safeParse({
        ...validSnapshot,
        recentReports: [{ ...validRecentReport, contentVersion: 999 }],
      }).success,
    ).toBe(false);
  });
});
