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
  const description =
    price.billingMode === "monthly"
      ? `Acesso inicial ao Lucrivo por ${price.accessMonths} ${price.accessMonths === 1 ? "mês" : "meses"}`
      : `Acesso ao Lucrivo por ${price.accessMonths} meses`;

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
        description,
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
    const hasValidMonthlyTerms =
      price.installmentLimit === null &&
      ((price.catalogCode === "launch" &&
        price.accessMonths === 2 &&
        price.bonusMonths === 1) ||
        (price.catalogCode === "standard" &&
          price.accessMonths === 1 &&
          price.bonusMonths === 0));

    if (!hasValidMonthlyTerms) {
      throw new Error("Invalid monthly billing price");
    }

    return {
      ...baseRequest,
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: {
        cycle: price.catalogCode === "launch" ? "BIMONTHLY" : "MONTHLY",
        nextDueDate: today,
      },
    };
  }

  const hasValidSemiannualTerms =
    price.installmentLimit === 6 &&
    ((price.catalogCode === "launch" &&
      price.accessMonths === 12 &&
      price.bonusMonths === 6) ||
      (price.catalogCode === "standard" &&
        price.accessMonths === 6 &&
        price.bonusMonths === 0));

  if (!hasValidSemiannualTerms) {
    throw new Error("Invalid semiannual billing price");
  }

  return {
    ...baseRequest,
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["DETACHED", "INSTALLMENT"],
    installment: { maxInstallmentCount: 6 },
  };
}

export {
  CHECKOUT_ITEM_IMAGE_BASE64,
  buildCheckoutRequest,
  type BuildCheckoutRequestInput,
};
