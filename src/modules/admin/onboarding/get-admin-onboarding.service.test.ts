import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, requireAdmin, rpc } = vi.hoisted(() => ({
  from: vi.fn(),
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

function orderedResult(result: unknown) {
  const secondOrder = vi.fn().mockResolvedValue(result);
  const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
  return { select: vi.fn().mockReturnValue({ order: firstOrder }) };
}

describe("admin onboarding read services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ supabase: { from, rpc } });
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
      cursor: Buffer.from(
        JSON.stringify({
          completedAt: "2026-10-09T12:00:00+00:00",
          userId: "97000000-0000-4000-8000-000000000002",
        }),
      ).toString("base64url"),
    });
    rpc.mockResolvedValue({
      data: { items: [], nextCursor: null },
      error: null,
    });

    await expect(
      getAdminOnboardingContacts(navigation.filters),
    ).resolves.toEqual({ items: [], nextCursor: null });
    expect(rpc).toHaveBeenCalledWith("list_admin_onboarding_contacts_v1", {
      p_query: "Ana",
      p_segment_id: 2,
      p_subcategory_id: 3,
      p_consent: "granted",
      p_from: "2026-10-01",
      p_to: "2026-11-01",
      p_cursor_completed_at: "2026-10-09T12:00:00+00:00",
      p_cursor_user_id: "97000000-0000-4000-8000-000000000002",
      p_limit: 20,
    });
  });

  it("loads versioned catalog rows after authorization", async () => {
    from.mockImplementation((table: string) => {
      if (table === "business_segments") {
        return orderedResult({
          data: [
            {
              id: 1,
              name: "Alimentação",
              sort_order: 10,
              is_active: true,
              version: 2,
            },
          ],
          error: null,
        });
      }
      return orderedResult({
        data: [
          {
            id: 2,
            segment_id: 1,
            name: "Confeitaria",
            sort_order: 10,
            is_active: false,
            version: 3,
          },
        ],
        error: null,
      });
    });

    await expect(getAdminBusinessCatalog()).resolves.toEqual([
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
    ]);
    expect(from).toHaveBeenCalledWith("business_segments");
    expect(from).toHaveBeenCalledWith("business_subcategories");
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
