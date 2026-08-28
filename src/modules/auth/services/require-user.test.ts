import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, getClaims } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/infrastructure/database/supabase/clients/server.client", () => ({
  createClient,
}));

import { AuthRequiredError, requireUser } from "./require-user";

describe("requireUser", () => {
  const supabase = { auth: { getClaims } };

  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabase);
  });

  it("returns the verified subject and the same client", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-123" } },
      error: null,
    });

    await expect(requireUser()).resolves.toEqual({
      userId: "user-123",
      supabase,
    });
    expect(createClient).toHaveBeenCalledOnce();
    expect(getClaims).toHaveBeenCalledOnce();
  });

  it.each([
    { data: null, error: { message: "provider detail" } },
    { data: { claims: {} }, error: null },
    { data: { claims: { sub: "" } }, error: null },
    { data: { claims: { sub: 42 } }, error: null },
  ])("rejects unusable claims safely", async (result) => {
    getClaims.mockResolvedValue(result);

    const rejection = expect(requireUser()).rejects;
    await rejection.toBeInstanceOf(AuthRequiredError);
    await rejection.toMatchObject({
      name: "AuthRequiredError",
      message: "Authentication required",
    });
  });
});
