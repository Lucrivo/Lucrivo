import { describe, expect, it } from "vitest";

import { currentReportTemplates } from "./report-scenarios";
import {
  buildDemoCatalog,
  clientReportCount,
  contractStatuses,
  paymentStatuses,
  validPurchaseTuples,
} from "./user-scenarios";

const catalog = buildDemoCatalog();

describe("demo user and operations catalog", () => {
  it("creates one deterministic onboarding profile for every client only", () => {
    expect(catalog.profiles).toHaveLength(96);
    expect(
      catalog.profiles.some(({ userId }) => userId === catalog.admin.id),
    ).toBe(false);
    expect(new Set(catalog.profiles.map(({ userId }) => userId))).toEqual(
      new Set(catalog.clients.map(({ id }) => id)),
    );
  });

  it("covers every seeded segment, catalog subcategory, and custom Outro", () => {
    expect(
      new Set(catalog.profiles.map(({ segmentName }) => segmentName)),
    ).toEqual(
      new Set([
        "Alimentação",
        "Beleza",
        "Vestuário",
        "Tecnologia",
        "Educação",
        "Construção",
        "Saúde",
        "Comércio",
      ]),
    );

    for (const subcategory of [
      "Confeitaria",
      "Salão de beleza",
      "Loja de roupas",
      "Assistência técnica",
      "Curso online",
    ]) {
      expect(
        catalog.profiles.filter(
          ({ subcategoryName }) => subcategoryName === subcategory,
        ).length,
      ).toBeGreaterThanOrEqual(5);
    }
    expect(
      catalog.profiles.filter(
        ({ subcategoryName, customSubcategory }) =>
          subcategoryName === null && customSubcategory !== null,
      ).length,
    ).toBeGreaterThanOrEqual(8);
  });

  it("splits consent evenly and creates safe unique contact fields", () => {
    expect(
      catalog.profiles.filter(({ marketingConsent }) => marketingConsent),
    ).toHaveLength(48);
    expect(
      catalog.profiles.filter(({ marketingConsent }) => !marketingConsent),
    ).toHaveLength(48);

    const deletedIds = new Set(
      catalog.clients
        .filter(({ accountState }) => accountState === "deleted")
        .map(({ id }) => id),
    );
    expect(
      catalog.profiles.filter(
        ({ userId, marketingConsent }) =>
          deletedIds.has(userId) && marketingConsent,
      ),
    ).toHaveLength(0);
    expect(
      catalog.profiles
        .filter(({ marketingConsent }) => marketingConsent)
        .map(
          ({ userId }) =>
            catalog.clients.find(({ id }) => id === userId)!.ordinal,
        ),
    ).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      ...Array.from({ length: 36 }, (_, index) => 10 + index * 2),
      90,
      92,
      94,
      96,
    ]);

    const phones = catalog.profiles.map(({ whatsappE164 }) => whatsappE164);
    expect(new Set(phones).size).toBe(96);
    expect(phones.every((phone) => /^\+5511900000\d{3}$/.test(phone))).toBe(
      true,
    );
    expect(
      catalog.profiles.every(
        ({ fullName, customSubcategory }) =>
          !/^[=+\-@]/.test(fullName) &&
          (customSubcategory === null || !/^[=+\-@]/.test(customSubcategory)),
      ),
    ).toBe(true);
  });

  it("derives every completion time from its account-age cohort", () => {
    const clientsById = new Map(
      catalog.clients.map((client) => [client.id, client]),
    );

    for (const profile of catalog.profiles) {
      const client = clientsById.get(profile.userId)!;
      if (client.createdBucket === "today") {
        expect(profile.completedAt).toEqual({
          anchor: "now",
          months: 0,
          days: 0,
          hours: -(client.ordinal % 12) + 0.5,
        });
      } else if (client.createdBucket === "week") {
        expect(profile.completedAt).toEqual({
          anchor: "now",
          months: 0,
          days: -((client.ordinal % 5) + 1),
          hours: -1,
        });
      } else if (client.createdBucket === "month") {
        expect(profile.completedAt).toEqual({
          anchor: "now",
          months: 0,
          days: -((client.ordinal - 17) % 10),
          hours: -1,
        });
      } else {
        expect(profile.completedAt).toEqual({
          anchor: "month_start",
          months: -Number(client.createdBucket.slice("month-".length)),
          days: (client.ordinal % 20) + 1,
          hours: 10,
        });
      }
    }
  });

  it("creates 96 clients with the exact report-count distribution", () => {
    expect(catalog.clients).toHaveLength(96);
    expect(
      catalog.clients.reduce((sum, user) => sum + user.reportCount, 0),
    ).toBe(259);
    expect(
      [...new Set(catalog.clients.map((user) => user.reportCount))].sort(
        (a, b) => a - b,
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 32]);
    expect(
      Array.from({ length: 96 }, (_, index) => clientReportCount(index + 1)),
    ).toEqual(catalog.clients.map((user) => user.reportCount));
  });

  it("creates the exact account, access, activity, and age cohorts", () => {
    const count = (
      predicate: (user: (typeof catalog.clients)[number]) => boolean,
    ) => catalog.clients.filter(predicate).length;
    expect(count((user) => user.accountState === "blocked")).toBe(8);
    expect(count((user) => user.accountState === "deleted")).toBe(8);
    expect(count((user) => user.accountState === "active")).toBe(80);
    expect(count((user) => user.accessSource === "free")).toBe(44);
    expect(count((user) => user.accessSource === "paid")).toBe(40);
    expect(count((user) => user.accessSource === "courtesy")).toBe(12);
    expect(
      count(
        (user) =>
          user.lastSignInOffsetDays !== null && user.lastSignInOffsetDays <= 7,
      ),
    ).toBe(48);
    expect(
      count(
        (user) =>
          user.lastSignInOffsetDays !== null && user.lastSignInOffsetDays > 7,
      ),
    ).toBe(32);
    expect(count((user) => user.lastSignInOffsetDays === null)).toBe(16);
    expect(
      Object.fromEntries(
        [
          "today",
          "week",
          "month",
          "month-1",
          "month-2",
          "month-3",
          "month-4",
          "month-5",
        ].map((bucket) => [
          bucket,
          count((user) => user.createdBucket === bucket),
        ]),
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

  it("assigns all 288 reports with stable ordinals and deletion coverage", () => {
    expect(catalog.reports).toHaveLength(288);
    expect(
      catalog.reports.filter((report) => report.ownerId === catalog.admin.id),
    ).toHaveLength(29);
    expect(
      catalog.reports.filter((report) => report.ownerId !== catalog.admin.id),
    ).toHaveLength(259);
    expect(
      catalog.reports.filter((report) => report.deletedAt !== null).length,
    ).toBeGreaterThanOrEqual(12);

    for (const user of [catalog.admin, ...catalog.clients]) {
      const reports = catalog.reports.filter(
        (report) => report.ownerId === user.id,
      );
      expect(reports).toHaveLength(user.reportCount);
      expect(reports.map((report) => report.reportOrdinal)).toEqual(
        Array.from({ length: user.reportCount }, (_, index) => index),
      );
    }
  });

  it("starts every report owner with a quick diagnosis", () => {
    const templatesByKey = new Map(
      currentReportTemplates.map((template) => [template.key, template]),
    );

    for (const user of [catalog.admin, ...catalog.clients]) {
      const firstReport = catalog.reports.find(
        (report) => report.ownerId === user.id && report.reportOrdinal === 0,
      );
      if (user.reportCount === 0) {
        expect(firstReport).toBeUndefined();
        continue;
      }

      expect(firstReport).toBeDefined();
      expect(templatesByKey.get(firstReport!.templateKey)?.analysisMode).toBe(
        "quick",
      );
    }
  });

  it("covers billing statuses, valid flows, and twelve revenue months", () => {
    expect(
      new Set(catalog.contracts.map((contract) => contract.status)),
    ).toEqual(new Set(contractStatuses));
    expect(new Set(catalog.payments.map((payment) => payment.status))).toEqual(
      new Set(paymentStatuses),
    );
    const validTuples = new Set(
      validPurchaseTuples.map((tuple) => tuple.join("/")),
    );
    catalog.contracts.forEach((contract) =>
      expect(
        validTuples.has(
          [
            contract.billingMode,
            contract.paymentMethod,
            contract.chargeType,
          ].join("/"),
        ),
      ).toBe(true),
    );
    const revenueMonths = new Set(
      catalog.payments
        .filter(
          (payment) =>
            payment.status === "confirmed" || payment.status === "received",
        )
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
    const powerContractIds = new Set(
      powerContracts.map((contract) => contract.id),
    );
    expect(powerContracts).toHaveLength(24);
    expect(
      catalog.payments.filter((payment) =>
        powerContractIds.has(payment.contractId),
      ),
    ).toHaveLength(24);
    expect(
      catalog.events.filter((event) => event.userId === powerUser.id).length,
    ).toBeGreaterThanOrEqual(24);
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
