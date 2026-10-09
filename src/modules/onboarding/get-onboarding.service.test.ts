import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, rpc } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));

import {
  OnboardingUnavailableError,
  getOnboardingData,
} from "./get-onboarding.service";

const catalog = [
  {
    id: 1,
    name: "Alimentação",
    sortOrder: 10,
    isActive: true,
    subcategories: [
      {
        id: 2,
        segmentId: 1,
        name: "Confeitaria",
        sortOrder: 10,
        isActive: true,
      },
    ],
  },
];

const profile = {
  fullName: "Maria da Silva",
  whatsappE164: "+5511999999999",
  segmentId: 1,
  segmentName: "Alimentação",
  segmentIsActive: true,
  subcategoryId: 2,
  subcategoryName: "Confeitaria",
  subcategoryIsActive: true,
  customSubcategory: null,
  whatsappMarketingConsent: false,
  marketingConsentGrantedAt: null,
  completedAt: "2026-10-09T12:00:00Z",
  updatedAt: "2026-10-09T12:00:00Z",
  version: 0,
};

describe("getOnboardingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ supabase: { rpc } });
    rpc.mockImplementation(async (name: string) =>
      name === "list_business_catalog_v1"
        ? { data: catalog, error: null }
        : { data: profile, error: null },
    );
  });

  it("loads and strictly parses the caller profile and catalog", async () => {
    await expect(getOnboardingData()).resolves.toEqual({ catalog, profile });

    expect(rpc).toHaveBeenCalledWith("list_business_catalog_v1");
    expect(rpc).toHaveBeenCalledWith("get_my_onboarding_profile_v1");
  });

  it.each([
    ["catalog RPC", "list_business_catalog_v1"],
    ["profile RPC", "get_my_onboarding_profile_v1"],
  ])("maps a %s failure to a stable unavailable error", async (_, rpcName) => {
    rpc.mockImplementation(async (name: string) =>
      name === rpcName
        ? { data: null, error: { message: "private database detail" } }
        : name === "list_business_catalog_v1"
          ? { data: catalog, error: null }
          : { data: profile, error: null },
    );

    await expect(getOnboardingData()).rejects.toBeInstanceOf(
      OnboardingUnavailableError,
    );
  });

  it.each([
    ["catalog", [{ ...catalog[0], unexpected: true }], profile],
    ["profile", catalog, { ...profile, version: -1 }],
  ])("rejects malformed %s payloads", async (_, catalogData, profileData) => {
    rpc.mockImplementation(async (name: string) =>
      name === "list_business_catalog_v1"
        ? { data: catalogData, error: null }
        : { data: profileData, error: null },
    );

    await expect(getOnboardingData()).rejects.toBeInstanceOf(
      OnboardingUnavailableError,
    );
  });
});
