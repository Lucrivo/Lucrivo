import { describe, expect, it } from "vitest";

import {
  actionSchema,
  adminUserDiagnosisSchema,
  adminUserHistoryEventSchema,
  adminUserListSchema,
  listFilterSchema,
} from "./admin-users.schema";
import { listUrl, parseFilters } from "./admin-users.urls";

describe("admin user boundaries", () => {
  const baseUser = {
    id: "96300000-0000-4000-8000-000000000002",
    email: "cliente@example.com",
    createdAt: "2026-09-16T12:00:00+00:00",
    lastSignInAt: null,
    state: "active",
    access: "paid",
    courtesyExpiresAt: null,
    subscription: {
      billingMode: "semiannual",
      status: "active",
      accessEndsAt: "2027-03-16T12:00:00+00:00",
    },
    diagnosisCount: 2,
    version: 0,
    hasPaidAccess: true,
  } as const;

  it("accepts exact administrative pages and rejects malformed projections", () => {
    expect(
      adminUserListSchema.safeParse({
        items: [baseUser],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(true);
    expect(
      adminUserListSchema.safeParse({
        items: [{ id: "bad" }],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(false);
    expect(
      adminUserListSchema.safeParse({
        items: [baseUser],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
        nextCursor: null,
      }).success,
    ).toBe(false);
  });

  it("accepts semiannual subscriptions and rejects unknown enum values", () => {
    expect(
      adminUserListSchema.safeParse({
        items: [baseUser],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(true);
    expect(
      adminUserListSchema.safeParse({
        items: [
          {
            ...baseUser,
            subscription: { ...baseUser.subscription, billingMode: "annual" },
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(false);
  });

  it("strictly validates diagnosis and AI usage fields", () => {
    const diagnosis = {
      id: "42",
      createdAt: "2026-10-21T12:00:00+00:00",
      updatedAt: "2026-10-21T12:01:00+00:00",
      deletedAt: null,
      version: 2,
      category: "product",
      scenario: "resale",
      analysisMode: "detailed",
      isFreeReport: false,
      currentPriceCents: null,
      realMarginBasisPoints: null,
      unitProfitCents: null,
      monthlyGrossRevenueCents: 500_000,
      monthlyResultCents: 120_000,
      itemCount: 3,
      isPartial: false,
      verdict: "incomplete_volume",
      priority: "data",
      aiUsage: {
        completedTurns: 2,
        failedTurns: 1,
        inputTokens: 1200,
        cachedInputTokens: 300,
        outputTokens: 450,
        lastUsedAt: "2026-10-21T12:00:00+00:00",
        models: [
          {
            model: "gpt-6-luna",
            inputTokens: 1200,
            cachedInputTokens: 300,
            outputTokens: 450,
          },
        ],
      },
    };
    expect(adminUserDiagnosisSchema.safeParse(diagnosis).success).toBe(true);
    expect(
      adminUserHistoryEventSchema.safeParse({
        eventKey: "diagnosis:42",
        occurredAt: diagnosis.createdAt,
        kind: "diagnosis_created",
        title: "Diagnóstico criado",
        payload: {
          diagnosisId: diagnosis.id,
          category: diagnosis.category,
          scenario: diagnosis.scenario,
          analysisMode: diagnosis.analysisMode,
          isFreeReport: diagnosis.isFreeReport,
          verdict: diagnosis.verdict,
          priority: diagnosis.priority,
          aiUsage: diagnosis.aiUsage,
        },
      }).success,
    ).toBe(true);
    expect(
      adminUserDiagnosisSchema.safeParse({
        ...diagnosis,
        verdict: "surprising_new_value",
      }).success,
    ).toBe(false);
    expect(
      adminUserDiagnosisSchema.safeParse({ ...diagnosis, rawSnapshot: {} })
        .success,
    ).toBe(false);
  });

  it("accepts normalized legacy admin events with no state changes", () => {
    expect(
      adminUserHistoryEventSchema.safeParse({
        eventKey: "admin:1",
        occurredAt: "2026-10-20T12:00:00+00:00",
        kind: "admin_blocked",
        title: "Usuário bloqueado",
        payload: {
          actorEmail: "admin@example.com",
          reason: "fixture with legacy state",
          changes: [],
        },
      }).success,
    ).toBe(true);
  });

  it("validates action reason, expiry shape and version", () => {
    const base = {
      userId: "96300000-0000-4000-8000-000000000002",
      action: "blocked",
      reason: "Motivo",
      courtesyDurationDays: null,
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
      actionSchema.safeParse({
        ...base,
        action: "courtesy_granted",
        courtesyDurationDays: 7,
      }).success,
    ).toBe(true);
    expect(
      actionSchema.safeParse({
        ...base,
        action: "courtesy_granted",
        courtesyDurationDays: 2,
      }).success,
    ).toBe(false);
  });

  it("bounds URL filters and normalizes numeric pages", () => {
    expect(listFilterSchema.safeParse({ q: "x".repeat(121) }).success).toBe(
      false,
    );
    expect(parseFilters({ state: "unknown" }).state).toBe("current");
    expect(parseFilters({ page: "3", q: "ana" })).toMatchObject({
      page: 3,
      q: "ana",
    });
    expect(parseFilters({ page: "0" }).page).toBe(1);
    expect(listUrl(parseFilters({ state: "blocked", page: "2" }))).toBe(
      "/admin/users?state=blocked&page=2",
    );
  });
});
