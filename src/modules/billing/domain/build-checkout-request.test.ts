import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { ActiveBillingPrice, BillingPaymentMethod } from "../types";
import { buildCheckoutRequest } from "./build-checkout-request";

const contractId = "10000000-0000-4000-8000-000000000001";
const appUrl = new URL("https://app.lucrivo.test/base/path");
const today = "2026-09-09";

const monthlyPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000001",
  productCode: "quick_diagnosis_pro",
  billingMode: "monthly",
  amountCents: 4990,
  currency: "BRL",
  installmentLimit: null,
  accessMonths: 1,
};

const annualPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000002",
  productCode: "quick_diagnosis_pro",
  billingMode: "annual",
  amountCents: 47880,
  currency: "BRL",
  installmentLimit: 12,
  accessMonths: 12,
};

function build(
  price: ActiveBillingPrice,
  paymentMethod: BillingPaymentMethod,
  customerId?: string,
) {
  return buildCheckoutRequest({
    price,
    paymentMethod,
    contractId,
    appUrl,
    customerId,
    today,
  });
}

describe("buildCheckoutRequest", () => {
  it("builds the monthly recurring credit-card payload", () => {
    expect(build(monthlyPrice, "credit_card")).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: { cycle: "MONTHLY", nextDueDate: "2026-09-09" },
      externalReference: contractId,
      items: [{ quantity: 1, value: 49.9 }],
    });
  });

  it("builds the annual installment credit-card payload", () => {
    expect(build(annualPrice, "credit_card")).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["INSTALLMENT"],
      installment: { maxInstallmentCount: 12 },
      externalReference: contractId,
      items: [{ quantity: 1, value: 478.8 }],
    });
  });

  it.each([
    [monthlyPrice, 49.9],
    [annualPrice, 478.8],
  ] as const)(
    "builds a detached Pix payload without recurring fields",
    (price, value) => {
      const checkout = build(price, "pix");

      expect(checkout).toMatchObject({
        billingTypes: ["PIX"],
        chargeTypes: ["DETACHED"],
        externalReference: contractId,
        items: [{ quantity: 1, value }],
      });
      expect(checkout).not.toHaveProperty("subscription");
      expect(checkout).not.toHaveProperty("installment");
    },
  );

  it.each([
    [monthlyPrice, "credit_card"],
    [monthlyPrice, "pix"],
    [annualPrice, "credit_card"],
    [annualPrice, "pix"],
  ] as const)(
    "uses only controlled callbacks and a valid PNG item image",
    (price, paymentMethod) => {
      const checkout = build(price, paymentMethod);
      const image = Buffer.from(checkout.items[0].imageBase64, "base64");

      expect(checkout).toMatchObject({
        minutesToExpire: 60,
        callback: {
          successUrl: "https://app.lucrivo.test/billing/return?outcome=success",
          cancelUrl: "https://app.lucrivo.test/billing/return?outcome=canceled",
          expiredUrl: "https://app.lucrivo.test/billing/return?outcome=expired",
        },
        items: [
          {
            externalReference: price.id,
            quantity: 1,
          },
        ],
      });
      expect(checkout.items[0].name.length).toBeGreaterThan(0);
      expect(checkout.items[0].name.length).toBeLessThan(30);
      expect(checkout.items[0].description.length).toBeGreaterThan(0);
      expect(image.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
    },
  );

  it("includes a known customer and omits absent customer data", () => {
    expect(build(monthlyPrice, "credit_card", "cus_123")).toMatchObject({
      customer: "cus_123",
    });
    expect(build(monthlyPrice, "credit_card")).not.toHaveProperty("customer");
  });
});
