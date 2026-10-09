import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, requireUser, rpc } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));

import { saveOnboardingProfile } from "./save-onboarding-profile.action";

const validInput = {
  fullName: "  Maria   da Silva  ",
  whatsappE164: "+5511999999999",
  segmentId: 1,
  subcategoryId: 2,
  customSubcategory: null,
  whatsappMarketingConsent: true,
  expectedVersion: null,
};

describe("saveOnboardingProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({
      data: { status: "saved", version: 0 },
      error: null,
    });
  });

  it("rejects invalid input before authentication", async () => {
    const result = await saveOnboardingProfile({
      ...validInput,
      whatsappE164: "11999999999",
    });

    expect(result).toEqual({
      status: "invalid",
      fieldErrors: {
        whatsappE164: expect.any(Array),
      },
    });
    expect(requireUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes normalized fields and the fixed consent copy to the RPC", async () => {
    await expect(saveOnboardingProfile(validInput)).resolves.toEqual({
      status: "saved",
      version: 0,
    });

    expect(rpc).toHaveBeenCalledWith("save_onboarding_profile_v1", {
      p_full_name: "Maria da Silva",
      p_whatsapp_e164: "+5511999999999",
      p_segment_id: 1,
      p_subcategory_id: 2,
      p_custom_subcategory: null,
      p_whatsapp_marketing_consent: true,
      p_consent_copy_version: "whatsapp-marketing-v1",
      p_expected_version: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/account");
    expect(revalidatePath).toHaveBeenCalledWith("/onboarding");
  });

  it.each(["conflict", "catalog_inactive"] as const)(
    "preserves the stable %s domain status",
    async (status) => {
      rpc.mockResolvedValue({ data: { status }, error: null });

      await expect(saveOnboardingProfile(validInput)).resolves.toEqual({
        status,
      });
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("maps an archived option response without losing it to an exception", async () => {
    rpc.mockResolvedValue({
      data: { status: "catalog_inactive" },
      error: null,
    });

    await expect(
      saveOnboardingProfile({ ...validInput, expectedVersion: 4 }),
    ).resolves.toEqual({ status: "catalog_inactive" });
  });

  it.each([
    { data: null, error: { message: "private database detail" } },
    { data: { status: "saved", version: -1 }, error: null },
    { data: { status: "unexpected" }, error: null },
  ])("sanitizes RPC and schema failures", async (rpcResult) => {
    rpc.mockResolvedValue(rpcResult);

    await expect(saveOnboardingProfile(validInput)).resolves.toEqual({
      status: "error",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
