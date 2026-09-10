import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireUser,
  readBillingEnvironment,
  createAdminClient,
  createAsaasGateway,
  cancelMonthlyBilling,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  readBillingEnvironment: vi.fn(),
  createAdminClient: vi.fn(),
  createAsaasGateway: vi.fn(),
  cancelMonthlyBilling: vi.fn(),
}));

vi.mock("@/modules/auth/services/require-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  requireUser,
}));
vi.mock("@/config/billing-environment", () => ({ readBillingEnvironment }));
vi.mock("@/infrastructure/database/supabase/clients/admin.client", () => ({
  createAdminClient,
}));
vi.mock("@/infrastructure/payments/asaas/asaas.client", () => ({
  createAsaasGateway,
}));
vi.mock("@/modules/billing/services/cancel-monthly-billing.service", () => ({
  cancelMonthlyBilling,
}));

import { AuthRequiredError } from "@/modules/auth/services/require-user";

import { POST } from "./route";

const accessEndsAt = "2026-10-10T12:00:00.000Z";

describe("POST /api/billing/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-123", supabase: {} });
    readBillingEnvironment.mockReturnValue({
      appUrl: new URL("https://app.lucrivo.test"),
      asaasApiUrl: new URL("https://api-sandbox.asaas.com"),
      asaasApiKey: "asaas-secret-key",
      asaasWebhookToken: "webhook-secret-token-value-123456",
      supabaseUrl: "https://project.supabase.co",
      supabaseSecretKey: "supabase-secret-key",
    });
    createAdminClient.mockReturnValue({ admin: true });
    createAsaasGateway.mockReturnValue({ gateway: true });
    cancelMonthlyBilling.mockResolvedValue({
      status: "canceled",
      accessEndsAt,
    });
  });

  async function post() {
    const response = await POST();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(serialized).not.toContain("asaas-secret-key");
    expect(serialized).not.toContain("supabase-secret-key");
    expect(serialized).not.toContain("sub_");
    expect(serialized).not.toContain("cus_");
    return { response, body };
  }

  it("returns 401 before creating secret clients when unauthenticated", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const { response, body } = await post();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect(readBillingEnvironment).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(createAsaasGateway).not.toHaveBeenCalled();
  });

  it("returns the safe access end after cancellation", async () => {
    const { response, body } = await post();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "canceled", accessEndsAt });
    expect(createAsaasGateway).toHaveBeenCalledWith({
      apiUrl: new URL("https://api-sandbox.asaas.com"),
      apiKey: "asaas-secret-key",
    });
    expect(cancelMonthlyBilling).toHaveBeenCalledWith({
      userId: "user-123",
      admin: { admin: true },
      asaas: { gateway: true },
    });
  });

  it.each([
    ["not_found", 404, { error: "subscription_not_found" }],
    ["already_canceled", 200, { status: "already_canceled" }],
    ["rejected", 422, { error: "cancellation_rejected" }],
    ["pending_reconciliation", 503, { error: "pending_reconciliation" }],
  ] as const)("maps %s to a safe HTTP response", async (status, code, body) => {
    cancelMonthlyBilling.mockResolvedValue({ status });

    const result = await post();

    expect(result.response.status).toBe(code);
    expect(result.body).toEqual(body);
  });

  it("sanitizes unexpected failures", async () => {
    cancelMonthlyBilling.mockRejectedValue(
      new Error("provider detail with asaas-secret-key and sub_123"),
    );

    const { response, body } = await post();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "service_unavailable" });
    expect(JSON.stringify(body)).not.toContain("provider detail");
  });
});
