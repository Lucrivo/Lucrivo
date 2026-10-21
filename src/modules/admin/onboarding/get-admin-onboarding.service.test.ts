import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-admin", () => ({ requireAdmin }));

import { parseAdminOnboardingNavigation } from "./admin-onboarding.filters";
import {
  AdminOnboardingUnavailableError,
  getAdminBusinessCatalog,
  getAdminOnboardingContacts,
  getAdminOnboardingOverview,
} from "./get-admin-onboarding.service";

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

describe("admin onboarding read services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({ data: overview, error: null });
  });

  it("authorizes and maps the overview range exactly", async () => {
    await expect(
      getAdminOnboardingOverview({
        from: "2026-10-01",
        to: "2026-11-01",
      }),
    ).resolves.toEqual(overview);
    expect(rpc).toHaveBeenCalledWith("get_admin_onboarding_overview_v1", {
      p_from: "2026-10-01",
      p_to: "2026-11-01",
    });
  });

  it("decodes and maps contact filters exactly", async () => {
    const navigation = parseAdminOnboardingNavigation({
      tab: "contacts",
      q: "Ana",
      segmentId: "2",
      subcategoryId: "3",
      consent: "granted",
      from: "2026-10-01",
      to: "2026-11-01",
      page: "3",
    });
    rpc.mockResolvedValue({
      data: {
        items: [],
        page: 3,
        pageSize: 20,
        totalCount: 40,
        totalPages: 2,
      },
      error: null,
    });

    await expect(
      getAdminOnboardingContacts(navigation.filters),
    ).resolves.toEqual({
      items: [],
      page: 3,
      pageSize: 20,
      totalCount: 40,
      totalPages: 2,
    });
    expect(rpc).toHaveBeenCalledWith("list_admin_onboarding_contacts_v2", {
      p_query: "Ana",
      p_segment_id: 2,
      p_subcategory_id: 3,
      p_consent: "granted",
      p_from: "2026-10-01",
      p_to: "2026-11-01",
      p_page: 3,
      p_page_size: 20,
    });
  });

  it("loads versioned catalog rows after authorization", async () => {
    const catalog = [
      {
        id: 1,
        name: "Alimentação",
        sortOrder: 10,
        isActive: true,
        version: 2,
        subcategories: [
          {
            id: 2,
            segmentId: 1,
            name: "Confeitaria",
            sortOrder: 10,
            isActive: false,
            version: 3,
          },
        ],
      },
    ];
    rpc.mockResolvedValue({
      data: catalog,
      error: null,
    });

    await expect(getAdminBusinessCatalog()).resolves.toEqual(catalog);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("get_admin_business_catalog_v1");
  });

  it("never converts database errors or malformed JSON to empty success", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "detail" } });
    await expect(
      getAdminOnboardingOverview({
        from: "2026-10-01",
        to: "2026-11-01",
      }),
    ).rejects.toBeInstanceOf(AdminOnboardingUnavailableError);

    rpc.mockResolvedValueOnce({
      data: { items: [{ email: "leak" }] },
      error: null,
    });
    await expect(
      getAdminOnboardingContacts(
        parseAdminOnboardingNavigation({ tab: "contacts" }).filters,
      ),
    ).rejects.toBeInstanceOf(AdminOnboardingUnavailableError);
  });
});
