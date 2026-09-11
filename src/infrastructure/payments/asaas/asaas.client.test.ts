import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AsaasGatewayError,
  createAsaasGateway,
  type AsaasCheckoutRequest,
} from "./asaas.client";

const request: AsaasCheckoutRequest = {
  billingTypes: ["CREDIT_CARD"],
  chargeTypes: ["RECURRENT"],
  minutesToExpire: 60,
  externalReference: "contract-123",
  callback: {
    successUrl: "https://lucrivo.com/billing/return?outcome=success",
    cancelUrl: "https://lucrivo.com/billing/return?outcome=canceled",
    expiredUrl: "https://lucrivo.com/billing/return?outcome=expired",
  },
  items: [
    {
      externalReference: "price-123",
      name: "Plano mensal",
      description: "Acesso mensal",
      imageBase64: "image",
      quantity: 1,
      value: 49.9,
    },
  ],
  subscription: { cycle: "MONTHLY", nextDueDate: "2026-09-10" },
};

const pixRequest: AsaasCheckoutRequest = {
  ...request,
  billingTypes: ["PIX"],
  chargeTypes: ["DETACHED"],
  items: [
    {
      ...request.items[0],
      description: "Acesso pré-pago por um mês",
    },
  ],
  subscription: undefined,
};

describe("AsaasGateway", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const gateway = createAsaasGateway({
    apiUrl: new URL("https://api-sandbox.asaas.com"),
    apiKey: "asaas-api-key",
    fetch: fetchMock,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a hosted checkout with the exact request body", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: "checkout-123",
        link: "https://sandbox.asaas.com/checkoutSession/show/checkout-123",
        status: "ACTIVE",
        newlyAddedField: true,
      }),
    );

    await expect(gateway.createCheckout(request)).resolves.toMatchObject({
      id: "checkout-123",
      link: "https://sandbox.asaas.com/checkoutSession/show/checkout-123",
      status: "ACTIVE",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/checkouts",
      {
        method: "POST",
        headers: {
          access_token: "asaas-api-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );
  });

  it("creates a detached Pix checkout without recurring fields", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: "checkout-pix-123",
        link: "https://sandbox.asaas.com/checkoutSession/show/checkout-pix-123",
        status: "ACTIVE",
      }),
    );

    await expect(gateway.createCheckout(pixRequest)).resolves.toMatchObject({
      id: "checkout-pix-123",
      status: "ACTIVE",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/checkouts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(pixRequest),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual(
      expect.objectContaining({
        billingTypes: ["PIX"],
        chargeTypes: ["DETACHED"],
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).not.toEqual(
      expect.objectContaining({ subscription: expect.anything() }),
    );
  });

  it("cancels a checkout and safely encodes its ID", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: "checkout/123",
        status: "CANCELED",
        ignored: "field",
      }),
    );

    await expect(gateway.cancelCheckout("checkout/123")).resolves.toEqual({
      id: "checkout/123",
      status: "CANCELED",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/checkouts/checkout%2F123/cancel",
      {
        method: "POST",
        headers: {
          access_token: "asaas-api-key",
          "Content-Type": "application/json",
        },
      },
    );
  });

  it("rejects an inconsistent checkout cancellation response", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "another-checkout", status: "CANCELED" }),
    );

    await expect(gateway.cancelCheckout("checkout-123")).rejects.toMatchObject({
      kind: "ambiguous",
      status: 200,
    });
  });

  it("deletes a subscription and safely encodes its ID", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "sub/123", deleted: true, ignored: "field" }),
    );

    await expect(gateway.deleteSubscription("sub/123")).resolves.toMatchObject({
      id: "sub/123",
      deleted: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/subscriptions/sub%2F123",
      {
        method: "DELETE",
        headers: {
          access_token: "asaas-api-key",
          "Content-Type": "application/json",
        },
      },
    );
  });

  it.each([
    [400, "rejected"],
    [401, "rejected"],
    [408, "ambiguous"],
    [429, "ambiguous"],
    [500, "ambiguous"],
  ] as const)("classifies HTTP %s as %s", async (status, kind) => {
    fetchMock.mockResolvedValue(new Response("{}", { status }));

    await expect(gateway.createCheckout(request)).rejects.toMatchObject({
      kind,
      status,
    });
  });

  it("retains only sanitized provider error codes", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          errors: [
            {
              code: "invalid_billing_type",
              description: "Private provider detail",
            },
            {
              code: "invalid_billing_type",
              description: "Repeated detail",
            },
            {
              code: "unsafe code with spaces",
              description: "Must be discarded",
            },
          ],
          secret: "provider-secret",
        },
        { status: 400 },
      ),
    );

    const error = await gateway.createCheckout(request).catch((cause) => cause);

    expect(error).toBeInstanceOf(AsaasGatewayError);
    expect(error).toMatchObject({
      kind: "rejected",
      status: 400,
      providerCodes: ["invalid_billing_type"],
    });
    expect(JSON.stringify(error)).not.toMatch(
      /Private provider detail|Repeated detail|provider-secret/,
    );
  });

  it("falls back to no provider codes for a malformed error response", async () => {
    fetchMock.mockResolvedValue(new Response("not-json", { status: 400 }));

    await expect(gateway.createCheckout(request)).rejects.toMatchObject({
      kind: "rejected",
      status: 400,
      providerCodes: [],
    });
  });

  it("classifies a network timeout as ambiguous", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(gateway.createCheckout(request)).rejects.toMatchObject({
      kind: "ambiguous",
    });
  });

  it.each([
    "http://sandbox.asaas.com/checkoutSession/show/checkout-123",
    "https://evil.example/checkoutSession/show/checkout-123",
  ])("rejects an unsafe checkout link %s", async (link) => {
    fetchMock.mockResolvedValue(
      Response.json({ id: "checkout-123", link, status: "ACTIVE" }),
    );

    await expect(gateway.createCheckout(request)).rejects.toMatchObject({
      kind: "ambiguous",
    });
  });

  it("uses sanitized error messages", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"secret":"provider detail"}', { status: 400 }),
    );

    const error = await gateway.createCheckout(request).catch((cause) => cause);

    expect(error).toBeInstanceOf(AsaasGatewayError);
    expect(error.message).not.toContain("provider detail");
    expect(error.message).not.toContain("asaas-api-key");
  });
});
