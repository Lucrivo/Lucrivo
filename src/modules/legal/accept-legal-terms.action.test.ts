import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, requireUser, rpc } = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  requireUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));

import { acceptLegalTerms } from "./accept-legal-terms.action";

describe("acceptLegalTerms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ supabase: { rpc } });
    rpc.mockResolvedValue({ data: { status: "recorded" }, error: null });
  });

  it("records the current version and continues", async () => {
    await expect(acceptLegalTerms(null)).rejects.toThrow(
      "redirect:/auth/continue",
    );
    expect(rpc).toHaveBeenCalledWith("accept_current_legal_terms_v1", {
      p_copy_version: "terms-privacy-v1",
    });
  });

  it("stays on the gate when recording fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });

    await expect(acceptLegalTerms(null)).resolves.toEqual({ status: "error" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
