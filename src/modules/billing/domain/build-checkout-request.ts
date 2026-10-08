import "server-only";

import type { AsaasCheckoutRequest } from "@/infrastructure/payments/asaas/asaas.client";

import type { ActiveBillingPrice, BillingPaymentMethod } from "../types";

const CHECKOUT_ITEM_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type BuildCheckoutRequestInput = {
  price: ActiveBillingPrice;
  paymentMethod: BillingPaymentMethod;
  contractId: string;
  appUrl: URL;
  customerId?: string;
  today: string;
};

function buildCheckoutRequest({
  price,
  paymentMethod,
  contractId,
  appUrl,
  customerId,
  today,
}: BuildCheckoutRequestInput): AsaasCheckoutRequest {
  const baseRequest = {
    minutesToExpire: 60 as const,
    externalReference: contractId,
    callback: {
      successUrl: new URL("/billing/return?outcome=success", appUrl).toString(),
      cancelUrl: new URL("/billing/return?outcome=canceled", appUrl).toString(),
      expiredUrl: new URL("/billing/return?outcome=expired", appUrl).toString(),
    },
    items: [
      {
        externalReference: price.id,
        name:
          price.billingMode === "monthly"
            ? "Diagnóstico Pro Mensal"
            : "Diagnóstico Pro Semestral",
        description:
          price.billingMode === "monthly"
            ? "Acesso ao Lucrivo por um mês"
            : "Acesso ao Lucrivo por 6 meses",
        imageBase64: CHECKOUT_ITEM_IMAGE_BASE64,
        quantity: 1 as const,
        value: price.amountCents / 100,
      },
    ],
    ...(customerId === undefined ? {} : { customer: customerId }),
  };

  if (paymentMethod === "pix") {
    return {
      ...baseRequest,
      billingTypes: ["PIX"],
      chargeTypes: ["DETACHED"],
    };
  }

  if (price.billingMode === "monthly") {
    if (price.installmentLimit !== null || price.accessMonths !== 1) {
      throw new Error("Invalid monthly billing price");
    }

    return {
      ...baseRequest,
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: { cycle: "MONTHLY", nextDueDate: today },
    };
  }

  if (price.installmentLimit !== 6 || price.accessMonths !== 6) {
    throw new Error("Invalid semiannual billing price");
  }

  return {
    ...baseRequest,
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    installment: { maxInstallmentCount: price.installmentLimit },
  };
}

export {
  CHECKOUT_ITEM_IMAGE_BASE64,
  buildCheckoutRequest,
  type BuildCheckoutRequestInput,
};
