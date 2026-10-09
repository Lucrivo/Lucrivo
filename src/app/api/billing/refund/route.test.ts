import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireUser,
  readBillingEnvironment,
  createAdminClient,
  createAsaasGateway,
  requestBillingRefund,
} = vi.hoisted(() => ({
  requireUser: vi.fn(),
  readBillingEnvironment: vi.fn(),
  createAdminClient: vi.fn(),
  createAsaasGateway: vi.fn(),
  requestBillingRefund: vi.fn(),
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
vi.mock("@/modules/billing/services/request-billing-refund.service", () => ({
  requestBillingRefund,
}));

import { AuthRequiredError } from "@/modules/auth/services/require-user";

import { POST } from "./route";

describe("POST /api/billing/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "user-123", supabase: {} });
    readBillingEnvironment.mockReturnValue({
      appUrl: new URL("https://app.lucrivo.test/base"),
      asaasApiUrl: new URL("https://api-sandbox.asaas.com"),
      asaasApiKey: "asaas-secret-key",
    });
    createAdminClient.mockReturnValue({ admin: true });
    createAsaasGateway.mockReturnValue({ gateway: true });
    requestBillingRefund.mockResolvedValue({ status: "submitted" });
  });

  async function post(origin: string | null = "https://app.lucrivo.test") {
    const headers = new Headers();
    if (origin !== null) headers.set("Origin", origin);
    const response = await POST(
      new Request("https://app.lucrivo.test/api/billing/refund", {
        method: "POST",
        headers,
      }),
    );
    const body = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toMatch(
      /asaas-secret-key|pay_|ins_|sub_|cus_/,
    );
    return { response, body };
  }

  it("returns 401 before reading secrets when unauthenticated", async () => {
    requireUser.mockRejectedValue(new AuthRequiredError());

    const { response, body } = await post();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect(readBillingEnvironment).not.toHaveBeenCalled();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it.each([
    null,
    "not a url",
    "https://evil.example",
    "https://user:password@app.lucrivo.test",
  ])("rejects an unsafe origin: %s", async (origin) => {
    const { response, body } = await post(origin);

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "forbidden" });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(createAsaasGateway).not.toHaveBeenCalled();
  });

  it("accepts the exact configured origin and delegates without a body", async () => {
    const { response, body } = await post();

    expect(response.status).toBe(202);
    expect(body).toEqual({ status: "submitted" });
    expect(requestBillingRefund).toHaveBeenCalledWith({
      userId: "user-123",
      admin: { admin: true },
      asaas: { gateway: true },
    });
  });

  it.each([
    ["submitted", 202, { status: "submitted" }],
    ["already_submitted", 200, { status: "already_submitted" }],
    ["confirmed", 200, { status: "confirmed" }],
    ["not_found", 404, { error: "refundable_contract_not_found" }],
    ["not_eligible", 409, { error: "refund_not_eligible" }],
    ["not_ready", 409, { error: "payment_not_ready" }],
    ["rejected", 422, { error: "refund_rejected" }],
    ["pending_reconciliation", 503, { error: "pending_reconciliation" }],
  ] as const)("maps %s to a safe response", async (status, code, expected) => {
    requestBillingRefund.mockResolvedValue({ status });

    const { response, body } = await post();

    expect(response.status).toBe(code);
    expect(body).toEqual(expected);
  });

  it("sanitizes unexpected failures", async () => {
    requestBillingRefund.mockRejectedValue(
      new Error("provider secret pay_123 asaas-secret-key"),
    );

    const { response, body } = await post();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "service_unavailable" });
  });
});
