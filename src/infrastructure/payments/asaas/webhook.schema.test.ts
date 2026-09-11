import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseAsaasWebhook } from "./webhook.schema";

const checkoutFixture = {
  id: "evt_checkout_123",
  event: "CHECKOUT_CREATED",
  dateCreated: "2026-09-10 12:30:00",
  checkout: {
    id: "chk_123",
    externalReference: "contract-123",
    customer: "cus_123",
    status: "ACTIVE",
    newlyAddedNestedField: { value: true },
  },
  newlyAddedTopLevelField: "accepted",
};

const paymentFixture = {
  id: "evt_payment_123",
  event: "PAYMENT_CONFIRMED",
  dateCreated: "2026-09-10T15:30:00Z",
  payment: {
    id: "pay_123",
    customer: "cus_123",
    checkoutSession: "chk_123",
    subscription: "sub_123",
    externalReference: "contract-123",
    status: "CONFIRMED",
    value: 49.9,
    dueDate: "2026-09-10",
    creditCard: {
      creditCardNumber: "516230******8829",
      creditCardBrand: "MASTERCARD",
      creditCardToken: "sensitive-card-token",
    },
    newlyAddedPaymentField: "accepted",
  },
};

const subscriptionFixture = {
  id: "evt_subscription_123",
  event: "SUBSCRIPTION_CREATED",
  dateCreated: "2026-09-10",
  subscription: {
    id: "sub_123",
    customer: "cus_123",
    checkoutSession: "chk_123",
    externalReference: "contract-123",
    cycle: "MONTHLY",
    newlyAddedSubscriptionField: 42,
  },
};

describe("parseAsaasWebhook", () => {
  it.each([
    [checkoutFixture, "evt_checkout_123", "CHECKOUT_CREATED"],
    [paymentFixture, "evt_payment_123", "PAYMENT_CONFIRMED"],
    [subscriptionFixture, "evt_subscription_123", "SUBSCRIPTION_CREATED"],
  ] as const)(
    "accepts real-shaped loose event payloads",
    (fixture, id, event) => {
      const result = parseAsaasWebhook(fixture);

      expect(result).toMatchObject({
        success: true,
        event: { id, event },
      });
      if (result.success && "newlyAddedTopLevelField" in fixture) {
        expect(result.event.redactedPayload).toHaveProperty(
          "newlyAddedTopLevelField",
          fixture.newlyAddedTopLevelField,
        );
      }
    },
  );

  it("accepts an unknown event with new resource fields", () => {
    expect(
      parseAsaasWebhook({
        id: "evt_future",
        event: "A_NEW_EVENT",
        futureResource: { arbitrary: [1, true, null] },
      }),
    ).toEqual({
      success: true,
      event: {
        id: "evt_future",
        event: "A_NEW_EVENT",
        redactedPayload: {
          id: "evt_future",
          event: "A_NEW_EVENT",
          futureResource: { arbitrary: [1, true, null] },
        },
      },
    });
  });

  it("removes the complete payment creditCard object", () => {
    const result = parseAsaasWebhook(paymentFixture);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.event.redactedPayload).toMatchObject({
      payment: {
        id: "pay_123",
        checkoutSession: "chk_123",
        status: "CONFIRMED",
        value: 49.9,
        dueDate: "2026-09-10",
        newlyAddedPaymentField: "accepted",
      },
    });
    expect(result.event.redactedPayload).not.toHaveProperty(
      "payment.creditCard",
    );
    expect(JSON.stringify(result.event.redactedPayload)).not.toContain(
      "sensitive-card-token",
    );
    expect(JSON.stringify(result.event.redactedPayload)).not.toContain(
      "516230",
    );
  });

  it.each([
    null,
    [],
    {},
    { id: "", event: "PAYMENT_CONFIRMED" },
    { id: "evt_123", event: "" },
    { id: 123, event: "PAYMENT_CONFIRMED" },
  ])("rejects an invalid envelope", (value) => {
    expect(parseAsaasWebhook(value)).toEqual({ success: false });
  });

  it.each([
    { ...paymentFixture, dateCreated: 20260910 },
    {
      ...paymentFixture,
      payment: { ...paymentFixture.payment, value: "49.90" },
    },
    {
      ...paymentFixture,
      payment: { ...paymentFixture.payment, dueDate: 20260910 },
    },
    {
      ...paymentFixture,
      payment: { ...paymentFixture.payment, dateCreated: {} },
    },
    {
      ...paymentFixture,
      payment: { ...paymentFixture.payment, checkoutSession: {} },
    },
    { ...checkoutFixture, checkout: [] },
    {
      ...subscriptionFixture,
      subscription: {
        ...subscriptionFixture.subscription,
        checkoutSession: [],
      },
    },
    { ...subscriptionFixture, subscription: "sub_123" },
  ])("rejects unsafe known-event monetary and date shapes", (value) => {
    expect(parseAsaasWebhook(value)).toEqual({ success: false });
  });
});
