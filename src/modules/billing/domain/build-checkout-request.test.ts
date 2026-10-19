import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { ActiveBillingPrice, BillingPaymentMethod } from "../types";
import { buildCheckoutRequest } from "./build-checkout-request";

const contractId = "10000000-0000-4000-8000-000000000001";
const appUrl = new URL("https://app.lucrivo.test/base/path");
const today = "2026-10-20";

const launchMonthlyPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000001",
  productCode: "quick_diagnosis_pro",
  catalogCode: "launch",
  billingMode: "monthly",
  amountCents: 3990,
  currency: "BRL",
  installmentLimit: null,
  accessMonths: 2,
  bonusMonths: 1,
};

const launchSemiannualPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000002",
  productCode: "quick_diagnosis_pro",
  catalogCode: "launch",
  billingMode: "semiannual",
  amountCents: 17940,
  currency: "BRL",
  installmentLimit: 6,
  accessMonths: 12,
  bonusMonths: 6,
};

const standardMonthlyPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000003",
  productCode: "quick_diagnosis_pro",
  catalogCode: "standard",
  billingMode: "monthly",
  amountCents: 4990,
  currency: "BRL",
  installmentLimit: null,
  accessMonths: 1,
  bonusMonths: 0,
};

const launchPriceMonthlyPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000005",
  productCode: "quick_diagnosis_pro",
  catalogCode: "launch_price",
  billingMode: "monthly",
  amountCents: 3990,
  currency: "BRL",
  installmentLimit: null,
  accessMonths: 1,
  bonusMonths: 0,
};

const launchPriceSemiannualPrice: ActiveBillingPrice = {
  id: "20000000-0000-4000-8000-000000000006",
  productCode: "quick_diagnosis_pro",
  catalogCode: "launch_price",
  billingMode: "semiannual",
  amountCents: 17940,
  currency: "BRL",
  installmentLimit: 6,
  accessMonths: 6,
  bonusMonths: 0,
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
  it("builds the promotional monthly card with an initial bimonthly cycle", () => {
    expect(build(launchMonthlyPrice, "credit_card")).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: { cycle: "BIMONTHLY", nextDueDate: "2026-10-20" },
      externalReference: contractId,
      items: [
        {
          quantity: 1,
          value: 39.9,
          description: "Acesso inicial ao Lucrivo por 2 meses",
        },
      ],
    });
  });

  it("keeps the standard monthly card on a monthly cycle", () => {
    expect(build(standardMonthlyPrice, "credit_card")).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: { cycle: "MONTHLY", nextDueDate: "2026-10-20" },
      items: [
        {
          value: 49.9,
          description: "Acesso inicial ao Lucrivo por 1 mês",
        },
      ],
    });
  });

  it("builds the price-only monthly card with a monthly cycle", () => {
    expect(build(launchPriceMonthlyPrice, "credit_card")).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      subscription: { cycle: "MONTHLY", nextDueDate: "2026-10-20" },
      items: [
        {
          value: 39.9,
          description: "Acesso inicial ao Lucrivo por 1 mês",
        },
      ],
    });
  });

  it("builds the promotional semiannual card with only an installment maximum", () => {
    const checkout = build(launchSemiannualPrice, "credit_card");

    expect(checkout).toMatchObject({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["DETACHED", "INSTALLMENT"],
      installment: { maxInstallmentCount: 6 },
      externalReference: contractId,
      items: [
        {
          name: "Diagnóstico Pro Semestral",
          description: "Acesso ao Lucrivo por 12 meses",
          quantity: 1,
          value: 179.4,
        },
      ],
    });
    expect(JSON.stringify(checkout)).not.toContain('"installmentCount"');
  });

  it.each([
    [launchMonthlyPrice, 39.9],
    [launchSemiannualPrice, 179.4],
    [launchPriceMonthlyPrice, 39.9],
    [launchPriceSemiannualPrice, 179.4],
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
    [launchMonthlyPrice, "credit_card"],
    [launchMonthlyPrice, "pix"],
    [launchSemiannualPrice, "credit_card"],
    [launchSemiannualPrice, "pix"],
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
    expect(build(launchMonthlyPrice, "credit_card", "cus_123")).toMatchObject({
      customer: "cus_123",
    });
    expect(build(launchMonthlyPrice, "credit_card")).not.toHaveProperty(
      "customer",
    );
  });

  it.each([
    [{ ...launchPriceMonthlyPrice, accessMonths: 2 }, "monthly"],
    [{ ...launchPriceMonthlyPrice, bonusMonths: 1 }, "monthly"],
    [{ ...launchPriceSemiannualPrice, accessMonths: 12 }, "semiannual"],
    [{ ...launchPriceSemiannualPrice, installmentLimit: null }, "semiannual"],
  ] as const)("rejects an invalid launch_price %s shape", (price, mode) => {
    expect(() => build(price, "credit_card")).toThrow(
      `Invalid ${mode} billing price`,
    );
  });
});
