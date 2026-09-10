import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { readBillingEnvironment, createAdminClient, processAsaasWebhook } =
  vi.hoisted(() => ({
    readBillingEnvironment: vi.fn(),
    createAdminClient: vi.fn(),
    processAsaasWebhook: vi.fn(),
  }));

vi.mock("@/config/billing-environment", () => ({ readBillingEnvironment }));
vi.mock("@/infrastructure/database/supabase/clients/admin.client", () => ({
  createAdminClient,
}));
vi.mock("@/modules/billing/services/process-asaas-webhook.service", () => ({
  processAsaasWebhook,
}));

import { hasValidWebhookToken, POST } from "./route";

const webhookToken = "webhook-secret-token-value-123456";
const validBody = {
  id: "evt_123",
  event: "PAYMENT_CONFIRMED",
  dateCreated: "2026-09-10T15:30:00Z",
  payment: {
    id: "pay_123",
    status: "CONFIRMED",
    value: 49.9,
    dueDate: "2026-09-10",
  },
};

function webhookRequest(input?: {
  token?: string | null;
  json?: () => Promise<unknown>;
}): Request {
  const headers = new Headers();
  const token = input?.token === undefined ? webhookToken : input.token;
  if (token !== null) headers.set("asaas-access-token", token);

  return {
    headers,
    json: input?.json ?? vi.fn().mockResolvedValue(validBody),
  } as unknown as Request;
}

describe("hasValidWebhookToken", () => {
  it("accepts only equal present tokens, regardless of input length", () => {
    expect(hasValidWebhookToken(webhookToken, webhookToken)).toBe(true);
    expect(hasValidWebhookToken("different-token-value", webhookToken)).toBe(
      false,
    );
    expect(hasValidWebhookToken("short", webhookToken)).toBe(false);
    expect(hasValidWebhookToken(null, webhookToken)).toBe(false);
  });
});

describe("POST /api/webhooks/asaas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readBillingEnvironment.mockReturnValue({
      appUrl: new URL("https://app.lucrivo.test"),
      asaasApiUrl: new URL("https://api-sandbox.asaas.com"),
      asaasApiKey: "asaas-api-secret",
      asaasWebhookToken: webhookToken,
      supabaseUrl: "https://project.supabase.co",
      supabaseSecretKey: "supabase-secret-key",
    });
    createAdminClient.mockReturnValue({ admin: true });
    processAsaasWebhook.mockResolvedValue("processed");
  });

  async function post(request = webhookRequest()) {
    const response = await POST(request);
    const body = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain(webhookToken);
    expect(JSON.stringify(body)).not.toContain("supabase-secret-key");
    return { response, body };
  }

  it.each([null, "wrong-token", "short"])(
    "rejects an invalid token before reading JSON",
    async (token) => {
      const json = vi.fn().mockResolvedValue(validBody);
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const { response, body } = await post(webhookRequest({ token, json }));

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "unauthorized" });
      expect(json).not.toHaveBeenCalled();
      expect(createAdminClient).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    },
  );

  it("returns 400 for malformed JSON without creating an admin client", async () => {
    const { response, body } = await post(
      webhookRequest({ json: vi.fn().mockRejectedValue(new SyntaxError()) }),
    );

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_request" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid event envelope", async () => {
    const { response, body } = await post(
      webhookRequest({ json: vi.fn().mockResolvedValue({ event: "" }) }),
    );

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_request" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it.each(["processed", "duplicate", "ignored"] as const)(
    "acknowledges %s events with 200",
    async (status) => {
      processAsaasWebhook.mockResolvedValue(status);

      const { response, body } = await post();

      expect(response.status).toBe(200);
      expect(body).toEqual({ status: "received" });
      expect(createAdminClient).toHaveBeenCalledTimes(1);
      expect(processAsaasWebhook).toHaveBeenCalledWith({
        admin: { admin: true },
        event: expect.objectContaining({
          id: "evt_123",
          event: "PAYMENT_CONFIRMED",
        }),
      });
    },
  );

  it.each(["unresolved", "failed"] as const)(
    "returns 503 for %s so Asaas retries",
    async (status) => {
      processAsaasWebhook.mockResolvedValue(status);

      const { response, body } = await post();

      expect(response.status).toBe(503);
      expect(body).toEqual({ error: "retry_later" });
    },
  );

  it("sanitizes configuration and processing failures", async () => {
    readBillingEnvironment.mockImplementationOnce(() => {
      throw new Error(`configuration contains ${webhookToken}`);
    });
    let result = await post();
    expect(result.response.status).toBe(503);
    expect(result.body).toEqual({ error: "service_unavailable" });

    processAsaasWebhook.mockRejectedValueOnce(
      new Error(`database contains ${webhookToken}`),
    );
    result = await post();
    expect(result.response.status).toBe(503);
    expect(result.body).toEqual({ error: "service_unavailable" });
  });
});
