import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, rpc } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/admin.client", () => ({
  createAdminClient,
}));

import { recordSignupLegalAcceptance } from "./record-signup-legal-acceptance";

describe("recordSignupLegalAcceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAdminClient.mockReturnValue({ rpc });
    rpc.mockResolvedValue({ data: { status: "recorded" }, error: null });
  });

  it("sends the signup user and the current version", async () => {
    await expect(recordSignupLegalAcceptance("user-1")).resolves.toBe(
      "recorded",
    );
    expect(rpc).toHaveBeenCalledWith("record_signup_legal_acceptance_v1", {
      p_user_id: "user-1",
      p_copy_version: "terms-privacy-v1",
    });
  });

  it("reports failure without throwing", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });

    await expect(recordSignupLegalAcceptance("user-1")).resolves.toBe("failed");
  });

  it("reports failure when the admin client cannot be created", async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error("missing billing environment");
    });

    await expect(recordSignupLegalAcceptance("user-1")).resolves.toBe("failed");
  });
});
