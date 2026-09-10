import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, readBillingEnvironment } = vi.hoisted(() => ({
  createClient: vi.fn(),
  readBillingEnvironment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/config/billing-environment", () => ({ readBillingEnvironment }));

import { createAdminClient } from "./admin.client";

describe("createAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readBillingEnvironment.mockReturnValue({
      supabaseUrl: "https://project.supabase.co",
      supabaseSecretKey: "supabase-secret",
    });
  });

  it("creates the client on demand with browser sessions disabled", () => {
    const adminClient = { from: vi.fn() };
    createClient.mockReturnValue(adminClient);

    expect(createAdminClient()).toBe(adminClient);
    expect(readBillingEnvironment).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "supabase-secret",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });
});
