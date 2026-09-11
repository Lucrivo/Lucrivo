import "server-only";

import { z } from "zod";

import type { Json } from "@/infrastructure/database/supabase/database.types";

type AsaasWebhookEnvelope = {
  id: string;
  event: string;
  redactedPayload: Json;
};

type ParseAsaasWebhookResult =
  { success: true; event: AsaasWebhookEnvelope } | { success: false };

const documentedDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const documentedInstantPattern =
  /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function isValidDate(value: string, pattern: RegExp): boolean {
  return pattern.test(value) && Number.isFinite(Date.parse(value));
}

const nonemptyString = z.string().trim().min(1);
const optionalProviderId = nonemptyString.nullable().optional();
const providerDate = z
  .string()
  .trim()
  .refine((value) => isValidDate(value, documentedDatePattern));
const providerInstant = z
  .string()
  .trim()
  .refine((value) => isValidDate(value, documentedInstantPattern));
const monetaryValue = z.number().finite().nonnegative();

const checkoutSchema = z.looseObject({
  id: optionalProviderId,
  customer: optionalProviderId,
  externalReference: optionalProviderId,
});

const paymentSchema = z.looseObject({
  id: optionalProviderId,
  customer: optionalProviderId,
  checkoutSession: optionalProviderId,
  subscription: optionalProviderId,
  installment: optionalProviderId,
  externalReference: optionalProviderId,
  status: optionalProviderId,
  value: monetaryValue.optional(),
  originalValue: monetaryValue.nullable().optional(),
  dueDate: providerDate.nullable().optional(),
  dateCreated: providerDate.nullable().optional(),
  installmentNumber: z.number().int().positive().nullable().optional(),
  creditCard: z.unknown().optional(),
});

const subscriptionSchema = z.looseObject({
  id: optionalProviderId,
  customer: optionalProviderId,
  checkoutSession: optionalProviderId,
  externalReference: optionalProviderId,
  cycle: optionalProviderId,
});

const baseEnvelopeSchema = z.looseObject({
  id: nonemptyString,
  event: nonemptyString,
});

const knownEnvelopeSchema = z.looseObject({
  id: nonemptyString,
  event: nonemptyString,
  dateCreated: providerInstant.optional(),
  checkout: checkoutSchema.optional(),
  payment: paymentSchema.optional(),
  subscription: subscriptionSchema.optional(),
});

const knownEvents = new Set([
  "CHECKOUT_CREATED",
  "CHECKOUT_PAID",
  "CHECKOUT_CANCELED",
  "CHECKOUT_EXPIRED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_DELETED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_PARTIALLY_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
]);

function redactPayload(value: object): Json | null {
  try {
    const redacted = JSON.parse(JSON.stringify(value)) as Record<
      string,
      unknown
    >;
    const payment = redacted.payment;

    if (
      typeof payment === "object" &&
      payment !== null &&
      !Array.isArray(payment)
    ) {
      delete (payment as Record<string, unknown>).creditCard;
    }

    return redacted as Json;
  } catch {
    return null;
  }
}

function parseAsaasWebhook(value: unknown): ParseAsaasWebhookResult {
  const base = baseEnvelopeSchema.safeParse(value);
  if (!base.success) return { success: false };

  const parsed = knownEvents.has(base.data.event)
    ? knownEnvelopeSchema.safeParse(value)
    : base;
  if (!parsed.success) return { success: false };

  const redactedPayload = redactPayload(parsed.data);
  if (redactedPayload === null) return { success: false };

  return {
    success: true,
    event: {
      id: base.data.id,
      event: base.data.event,
      redactedPayload,
    },
  };
}

export { parseAsaasWebhook };
export type { AsaasWebhookEnvelope, ParseAsaasWebhookResult };
