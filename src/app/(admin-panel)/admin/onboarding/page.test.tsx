import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCatalog, getContacts, getOverview } = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  getContacts: vi.fn(),
  getOverview: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/admin/onboarding/get-admin-onboarding.service", () => ({
  getAdminBusinessCatalog: getCatalog,
  getAdminOnboardingContacts: getContacts,
  getAdminOnboardingOverview: getOverview,
}));
vi.mock(
  "@/modules/admin/onboarding/components/admin-onboarding-overview",
  () => ({ AdminOnboardingOverview: () => <div>overview-content</div> }),
);
vi.mock(
  "@/modules/admin/onboarding/components/admin-onboarding-contacts",
  () => ({ AdminOnboardingContacts: () => <div>contacts-content</div> }),
);
vi.mock(
  "@/modules/admin/onboarding/components/admin-onboarding-filters",
  () => ({ AdminOnboardingFilters: () => <div>filters-content</div> }),
);
vi.mock(
  "@/modules/admin/onboarding/components/admin-onboarding-catalog",
  () => ({
    AdminOnboardingCatalog: ({ catalog }: { catalog: unknown[] }) => (
      <div>catalog-content:{catalog.length}</div>
    ),
  }),
);

import AdminOnboardingPage from "./page";

describe("AdminOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOverview.mockResolvedValue({ generatedAt: "2026-10-09T12:00:00Z" });
    getContacts.mockResolvedValue({ items: [], nextCursor: null });
    getCatalog.mockResolvedValue([]);
  });

  it("loads only the overview data for the default section", async () => {
    render(await AdminOnboardingPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("overview-content")).toBeVisible();
    expect(getOverview).toHaveBeenCalledOnce();
    expect(getContacts).not.toHaveBeenCalled();
    expect(getCatalog).not.toHaveBeenCalled();
  });

  it("loads contacts and their filter catalog for the contacts section", async () => {
    render(
      await AdminOnboardingPage({
        searchParams: Promise.resolve({ tab: "contacts", q: "Ana" }),
      }),
    );
    expect(screen.getByText("contacts-content")).toBeVisible();
    expect(getContacts).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Ana" }),
    );
    expect(getCatalog).toHaveBeenCalledOnce();
    expect(getOverview).not.toHaveBeenCalled();
  });

  it("loads only the catalog for its addressable section", async () => {
    render(
      await AdminOnboardingPage({
        searchParams: Promise.resolve({ tab: "catalog" }),
      }),
    );
    expect(screen.getByText("catalog-content:0")).toBeVisible();
    expect(getCatalog).toHaveBeenCalledOnce();
    expect(getOverview).not.toHaveBeenCalled();
    expect(getContacts).not.toHaveBeenCalled();
  });
});
