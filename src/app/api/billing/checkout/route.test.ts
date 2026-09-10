import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireUser,
  readBillingEnvironment,
  createAdminClient,
  createAsaasGateway,
  createHostedCheckout,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  readBillingEnvironment: vi.fn(),
  createAdminClient: vi.fn(),
  createAsaasGateway: vi.fn(),
  createHostedCheckout: vi.fn(),
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
vi.mock("@/modules/billing/services/create-hosted-checkout.service", () => ({
  createHostedCheckout,
}));

import { AuthRequiredError } from "@/modules/auth/services/require-user";

import { POST } from "./route";

const priceId = "20000000-0000-4000-8000-000000000001";

function request(body: unknown): Request {
  return new Request("https://app.lucrivo.test/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-123", supabase: {} });
    readBillingEnvironment.mockReturnValue({
      appUrl: new URL("https://app.lucrivo.test"),
      asaasApiUrl: new URL("https://api-sandbox.asaas.com"),
      asaasApiKey: "asaas-secret-key",
      supabaseUrl: "https://project.supabase.co",
      supabaseSecretKey: "supabase-secret-key",
      asaasWebhookToken: "webhook-secret-token-value-123456",
    });
    createAdminClient.mockReturnValue({ admin: true });
    createAsaasGateway.mockReturnValue({ gateway: true });
    createHostedCheckout.mockResolvedValue({
      status: "created",
      checkoutUrl:
        "https://sandbox.asaas.com/checkoutSession/show/checkout_123",
    });
  });

  async function post(
    body: unknown = { priceId, paymentMethod: "credit_card" },
  ) {
    const response = await POST(request(body));
    const json = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(json)).not.toContain("asaas-secret-key");
    expect(JSON.stringify(json)).not.toContain("supabase-secret-key");
    return { response, json };
  }

  it("returns 401 before creating secret clients when unauthenticated", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const { response, json } = await post();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: "unauthorized" });
    expect(readBillingEnvironment).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(createAsaasGateway).not.toHaveBeenCalled();
  });

  it.each([
    { priceId: "not-a-uuid", paymentMethod: "credit_card" },
    { priceId, paymentMethod: "boleto" },
    { priceId, paymentMethod: "pix", amountCents: 1 },
  ])("returns 400 for an invalid or excessive request", async (body) => {
    const { response, json } = await post(body);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "invalid_request" });
    expect(readBillingEnvironment).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", 404, "price_not_found"],
    ["already_subscribed", 409, "already_subscribed"],
    ["rejected", 422, "checkout_rejected"],
    ["pending_reconciliation", 503, "pending_reconciliation"],
  ] as const)(
    "maps %s to a safe HTTP response",
    async (status, code, error) => {
      createHostedCheckout.mockResolvedValue({ status });

      const result = await post();

      expect(result.response.status).toBe(code);
      expect(result.json).toEqual({ error });
    },
  );

  it("returns 201 for a newly created Checkout", async () => {
    const { response, json } = await post({
      priceId,
      paymentMethod: "pix",
    });

    expect(response.status).toBe(201);
    expect(json).toEqual({
      checkoutUrl:
        "https://sandbox.asaas.com/checkoutSession/show/checkout_123",
    });
    expect(createAsaasGateway).toHaveBeenCalledWith({
      apiUrl: new URL("https://api-sandbox.asaas.com"),
      apiKey: "asaas-secret-key",
    });
    expect(createHostedCheckout).toHaveBeenCalledWith({
      userId: "user-123",
      priceId,
      paymentMethod: "pix",
      admin: { admin: true },
      asaas: { gateway: true },
      appUrl: new URL("https://app.lucrivo.test"),
    });
  });

  it("returns 200 when reusing a valid Checkout", async () => {
    createHostedCheckout.mockResolvedValue({
      status: "reused",
      checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show/existing",
    });

    const { response, json } = await post();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show/existing",
    });
  });

  it("sanitizes unexpected failures", async () => {
    createHostedCheckout.mockRejectedValue(
      new Error("provider detail with asaas-secret-key"),
    );

    const { response, json } = await post();

    expect(response.status).toBe(503);
    expect(json).toEqual({ error: "service_unavailable" });
    expect(JSON.stringify(json)).not.toContain("provider detail");
  });
});
