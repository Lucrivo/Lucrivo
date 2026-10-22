import { describe, expect, it } from "vitest";

import {
  adminBusinessCatalogSchema,
  adminOnboardingContactsSchema,
  adminOnboardingOverviewSchema,
  businessCatalogMutationSchema,
} from "./admin-onboarding.schema";

const overview = {
  generatedAt: "2026-10-09T12:00:00+00:00",
  metrics: {
    accountCount: 4,
    completedCount: 3,
    completionRateBasisPoints: 7500,
    activeConsentCount: 2,
    consentRateBasisPoints: 6667,
  },
  segments: [{ id: 1, name: "Alimentação", count: 2 }],
  subcategories: [{ id: null, name: "Outro", count: 1 }],
};

const contact = {
  userId: "97000000-0000-4000-8000-000000000002",
  fullName: "Ana Fórmula",
  whatsappE164: "+5511999990002",
  segment: { id: 1, name: "Alimentação" },
  subcategory: { id: 2, name: "Confeitaria" },
  customSubcategory: null,
  consent: true,
  consentedAt: "2026-10-02T15:00:00+00:00",
  completedAt: "2026-10-02T15:00:00+00:00",
};

describe("admin onboarding schemas", () => {
  it("accepts the strict overview contract and bounded nullable rates", () => {
    expect(adminOnboardingOverviewSchema.parse(overview)).toEqual(overview);
    expect(
      adminOnboardingOverviewSchema.safeParse({ ...overview, extra: true })
        .success,
    ).toBe(false);
    expect(
      adminOnboardingOverviewSchema.safeParse({
        ...overview,
        metrics: { ...overview.metrics, completionRateBasisPoints: 10001 },
      }).success,
    ).toBe(false);
    expect(
      adminOnboardingOverviewSchema.safeParse({
        ...overview,
        metrics: {
          ...overview.metrics,
          completionRateBasisPoints: null,
          consentRateBasisPoints: null,
        },
      }).success,
    ).toBe(true);
    expect(
      adminOnboardingOverviewSchema.safeParse({
        ...overview,
        generatedAt: "09/10/2026",
      }).success,
    ).toBe(false);
  });

  it("accepts at most fifty strict contacts and validates Outro shape", () => {
    expect(
      adminOnboardingContactsSchema.safeParse({
        items: [contact],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(true);
    expect(
      adminOnboardingContactsSchema.safeParse({
        items: Array.from({ length: 51 }, () => contact),
        page: 1,
        pageSize: 20,
        totalCount: 51,
        totalPages: 3,
      }).success,
    ).toBe(false);
    expect(
      adminOnboardingContactsSchema.safeParse({
        items: [{ ...contact, email: "nao-pode@example.com" }],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(false);
    expect(
      adminOnboardingContactsSchema.safeParse({
        items: [
          {
            ...contact,
            subcategory: { id: null, name: "Outro" },
            customSubcategory: "Reformas residenciais",
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(true);
    expect(
      adminOnboardingContactsSchema.safeParse({
        items: [{ ...contact, customSubcategory: "Texto indevido" }],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      }).success,
    ).toBe(false);
  });

  it("validates catalog versions and mutation-specific limits", () => {
    const catalog = [
      {
        id: 1,
        name: "Alimentação",
        sortOrder: 10,
        isActive: true,
        version: 0,
        subcategories: [
          {
            id: 2,
            segmentId: 1,
            name: "Confeitaria",
            sortOrder: 10,
            isActive: true,
            version: 3,
          },
        ],
      },
    ];
    expect(adminBusinessCatalogSchema.parse(catalog)).toEqual(catalog);
    expect(
      adminBusinessCatalogSchema.safeParse([
        { ...catalog[0], unexpected: true },
      ]).success,
    ).toBe(false);
    expect(
      businessCatalogMutationSchema.safeParse({
        kind: "segment",
        id: null,
        name: "Novo segmento",
        sortOrder: 10,
        isActive: true,
        expectedVersion: null,
      }).success,
    ).toBe(true);
    expect(
      businessCatalogMutationSchema.safeParse({
        kind: "subcategory",
        id: 2,
        segmentId: 1,
        name: "x",
        sortOrder: 10,
        isActive: true,
        expectedVersion: 0,
      }).success,
    ).toBe(false);
    expect(
      businessCatalogMutationSchema.safeParse({
        kind: "segment",
        id: 1,
        name: "Segmento",
        sortOrder: 10,
        isActive: true,
        expectedVersion: null,
      }).success,
    ).toBe(false);
  });
});
