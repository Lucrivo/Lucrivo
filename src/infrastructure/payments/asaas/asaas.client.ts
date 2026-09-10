import "server-only";

import { z } from "zod";

type AsaasCheckoutRequestBase = {
  minutesToExpire: 60;
  externalReference: string;
  callback: {
    successUrl: string;
    cancelUrl: string;
    expiredUrl: string;
  };
  items: Array<{
    externalReference: string;
    name: string;
    description: string;
    imageBase64: string;
    quantity: 1;
    value: number;
  }>;
  customer?: string;
};

type AsaasCheckoutRequest = AsaasCheckoutRequestBase &
  (
    | {
        billingTypes: ["CREDIT_CARD"];
        chargeTypes: ["RECURRENT"];
        subscription: { cycle: "MONTHLY"; nextDueDate: string };
        installment?: never;
      }
    | {
        billingTypes: ["CREDIT_CARD"];
        chargeTypes: ["INSTALLMENT"];
        subscription?: never;
        installment: { maxInstallmentCount: 12 };
      }
    | {
        billingTypes: ["PIX"];
        chargeTypes: ["DETACHED"];
        subscription?: never;
        installment?: never;
      }
  );

type AsaasCheckout = {
  id: string;
  link: string;
  status: "ACTIVE";
};

interface AsaasGateway {
  createCheckout(input: AsaasCheckoutRequest): Promise<AsaasCheckout>;
  deleteSubscription(id: string): Promise<{ id: string; deleted: true }>;
}

type AsaasGatewayErrorKind = "rejected" | "ambiguous";

class AsaasGatewayError extends Error {
  readonly kind: AsaasGatewayErrorKind;
  readonly status?: number;

  constructor(kind: AsaasGatewayErrorKind, status?: number) {
    super(
      kind === "rejected"
        ? "Asaas rejected the request"
        : "The Asaas request outcome is ambiguous",
    );
    this.name = "AsaasGatewayError";
    this.kind = kind;
    this.status = status;
  }
}

const checkoutResponseSchema = z.looseObject({
  id: z.string().min(1),
  link: z.url(),
  status: z.literal("ACTIVE"),
});

const deleteResponseSchema = z.looseObject({
  id: z.string().min(1),
  deleted: z.literal(true),
});

const safeCheckoutHosts = new Set([
  "sandbox.asaas.com",
  "www.asaas.com",
  "asaas.com",
]);

function classifyHttpFailure(status: number): AsaasGatewayErrorKind {
  if (status >= 400 && status < 500 && ![408, 425, 429].includes(status)) {
    return "rejected";
  }

  return "ambiguous";
}

function hasSafeCheckoutLink(link: string): boolean {
  let url: URL;

  try {
    url = new URL(link);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    safeCheckoutHosts.has(url.hostname)
  );
}

function createAsaasGateway(input: {
  apiUrl: URL;
  apiKey: string;
  fetch?: typeof fetch;
}): AsaasGateway {
  const fetchImplementation = input.fetch ?? globalThis.fetch;

  async function request<ResponseValue>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<ResponseValue>,
  ): Promise<ResponseValue> {
    let response: Response;

    try {
      response = await fetchImplementation(
        new URL(path, input.apiUrl).toString(),
        {
          ...init,
          headers: {
            access_token: input.apiKey,
            "Content-Type": "application/json",
          },
        },
      );
    } catch {
      throw new AsaasGatewayError("ambiguous");
    }

    if (!response.ok) {
      throw new AsaasGatewayError(
        classifyHttpFailure(response.status),
        response.status,
      );
    }

    try {
      return schema.parse(await response.json());
    } catch {
      throw new AsaasGatewayError("ambiguous", response.status);
    }
  }

  return {
    async createCheckout(checkoutRequest) {
      const checkout = await request(
        "/v3/checkouts",
        {
          method: "POST",
          body: JSON.stringify(checkoutRequest),
        },
        checkoutResponseSchema,
      );

      if (!hasSafeCheckoutLink(checkout.link)) {
        throw new AsaasGatewayError("ambiguous", 200);
      }

      return checkout;
    },

    deleteSubscription(id) {
      return request(
        `/v3/subscriptions/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        deleteResponseSchema,
      );
    },
  };
}

export { AsaasGatewayError, createAsaasGateway };
export type { AsaasCheckout, AsaasCheckoutRequest, AsaasGateway };
