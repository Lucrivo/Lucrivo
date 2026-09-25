import { describe, expect, it } from "vitest";

import {
  buildDemoCatalog,
  clientReportCount,
  contractStatuses,
  paymentStatuses,
  validPurchaseTuples,
} from "./user-scenarios";

const catalog = buildDemoCatalog();

describe("demo user and operations catalog", () => {
  it("creates 96 clients with the exact report-count distribution", () => {
    expect(catalog.clients).toHaveLength(96);
    expect(catalog.clients.reduce((sum, user) => sum + user.reportCount, 0)).toBe(
      259,
    );
    expect([...new Set(catalog.clients.map((user) => user.reportCount))].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 32,
    ]);
    expect(Array.from({ length: 96 }, (_, index) => clientReportCount(index + 1))).toEqual(
      catalog.clients.map((user) => user.reportCount),
    );
  });

  it("creates the exact account, access, activity, and age cohorts", () => {
    const count = (predicate: (user: (typeof catalog.clients)[number]) => boolean) =>
      catalog.clients.filter(predicate).length;
    expect(count((user) => user.accountState === "blocked")).toBe(8);
    expect(count((user) => user.accountState === "deleted")).toBe(8);
    expect(count((user) => user.accountState === "active")).toBe(80);
    expect(count((user) => user.accessSource === "free")).toBe(44);
    expect(count((user) => user.accessSource === "paid")).toBe(40);
    expect(count((user) => user.accessSource === "courtesy")).toBe(12);
    expect(count((user) => user.lastSignInOffsetDays !== null && user.lastSignInOffsetDays <= 7)).toBe(48);
    expect(count((user) => user.lastSignInOffsetDays !== null && user.lastSignInOffsetDays > 7)).toBe(32);
    expect(count((user) => user.lastSignInOffsetDays === null)).toBe(16);
    expect(
      Object.fromEntries(
        ["today", "week", "month", "month-1", "month-2", "month-3", "month-4", "month-5"].map(
          (bucket) => [bucket, count((user) => user.createdBucket === bucket)],
        ),
      ),
    ).toEqual({
      today: 6,
      week: 10,
      month: 16,
      "month-1": 13,
      "month-2": 13,
      "month-3": 13,
      "month-4": 13,
      "month-5": 12,
    });
  });

  it("assigns all 295 reports with stable ordinals and deletion coverage", () => {
    expect(catalog.reports).toHaveLength(295);
    expect(catalog.reports.filter((report) => report.ownerId === catalog.admin.id)).toHaveLength(36);
    expect(catalog.reports.filter((report) => report.ownerId !== catalog.admin.id)).toHaveLength(259);
    expect(catalog.reports.filter((report) => report.deletedAt !== null).length).toBeGreaterThanOrEqual(12);

    for (const user of [catalog.admin, ...catalog.clients]) {
      const reports = catalog.reports.filter((report) => report.ownerId === user.id);
      expect(reports).toHaveLength(user.reportCount);
      expect(reports.map((report) => report.reportOrdinal)).toEqual(
        Array.from({ length: user.reportCount }, (_, index) => index),
      );
    }
  });

  it("covers billing statuses, valid flows, and twelve revenue months", () => {
    expect(new Set(catalog.contracts.map((contract) => contract.status))).toEqual(
      new Set(contractStatuses),
    );
    expect(new Set(catalog.payments.map((payment) => payment.status))).toEqual(
      new Set(paymentStatuses),
    );
    const validTuples = new Set(validPurchaseTuples.map((tuple) => tuple.join("/")));
    catalog.contracts.forEach((contract) =>
      expect(
        validTuples.has(
          [contract.billingMode, contract.paymentMethod, contract.chargeType].join("/"),
        ),
      ).toBe(true),
    );
    const revenueMonths = new Set(
      catalog.payments
        .filter((payment) => payment.status === "confirmed" || payment.status === "received")
        .map((payment) => payment.dueAt.months),
    );
    expect([...revenueMonths].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, index) => -11 + index),
    );
  });

  it("gives the power user 24 contracts, payments, and append-only events", () => {
    const powerUser = catalog.clients[95]!;
    const powerContracts = catalog.contracts.filter(
      (contract) =>
        contract.userId === powerUser.id &&
        contract.externalReference.includes("power-history"),
    );
    const powerContractIds = new Set(powerContracts.map((contract) => contract.id));
    expect(powerContracts).toHaveLength(24);
    expect(catalog.payments.filter((payment) => powerContractIds.has(payment.contractId))).toHaveLength(24);
    expect(catalog.events.filter((event) => event.userId === powerUser.id).length).toBeGreaterThanOrEqual(24);
  });

  it("keeps courtesy snapshots and every deterministic id unique", () => {
    const activeCourtesyIds = new Set(
      catalog.clients
        .filter((user) => user.accessSource === "courtesy")
        .map((user) => user.id),
    );
    expect(
      catalog.states.filter(
        (state) =>
          activeCourtesyIds.has(state.userId) &&
          state.courtesyExpiresAt !== null &&
          state.courtesyExpiresAt.months > 0,
      ),
    ).toHaveLength(12);
    expect(
      catalog.states.filter(
        (state) =>
          !activeCourtesyIds.has(state.userId) &&
          state.courtesyExpiresAt !== null &&
          state.courtesyExpiresAt.months < 0,
      ).length,
    ).toBeGreaterThanOrEqual(4);

    const ids = [
      catalog.admin.id,
      catalog.admin.identityId,
      ...catalog.clients.flatMap((user) => [user.id, user.identityId]),
      ...catalog.contracts.map((contract) => contract.id),
      ...catalog.payments.map((payment) => payment.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
