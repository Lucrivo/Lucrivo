import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import {
  AsaasGatewayError,
  type AsaasGateway,
} from "@/infrastructure/payments/asaas/asaas.client";

import { buildCheckoutRequest } from "../domain/build-checkout-request";
import type { ActiveBillingPrice, BillingPaymentMethod } from "../types";
import { listActivePrices } from "./list-active-prices.service";

const CHECKOUT_CONTRACT_COLUMNS =
  "id, price_id, payment_method, status, access_starts_at, access_ends_at, asaas_checkout_url, checkout_expires_at" as const;

type CheckoutContractRow = Pick<
  Database["public"]["Tables"]["billing_contracts"]["Row"],
  | "id"
  | "price_id"
  | "payment_method"
  | "status"
  | "access_starts_at"
  | "access_ends_at"
  | "asaas_checkout_url"
  | "checkout_expires_at"
>;

type CreateHostedCheckoutResult =
  | { status: "created" | "reused"; checkoutUrl: string }
  | { status: "not_found" | "already_subscribed" | "rejected" }
  | { status: "pending_reconciliation" };

type CreateHostedCheckoutInput = {
  userId: string;
  priceId: string;
  paymentMethod: BillingPaymentMethod;
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
  appUrl: URL;
  now?: Date;
};

const paidStatuses = new Set(["active", "cancel_at_period_end"]);
const reusableCheckoutHosts = new Set([
  "sandbox.asaas.com",
  "www.asaas.com",
  "asaas.com",
]);

function timestamp(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasPaidAccess(
  contract: CheckoutContractRow,
  instant: number,
): boolean {
  const startsAt = timestamp(contract.access_starts_at);
  const endsAt = timestamp(contract.access_ends_at);

  return (
    paidStatuses.has(contract.status) &&
    startsAt !== null &&
    endsAt !== null &&
    startsAt <= instant &&
    endsAt > instant
  );
}

function hasSafeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      reusableCheckoutHosts.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function reusableCheckout(
  contracts: CheckoutContractRow[],
  priceId: string,
  paymentMethod: BillingPaymentMethod,
  instant: number,
): CreateHostedCheckoutResult | null {
  if (contracts.some((contract) => hasPaidAccess(contract, instant))) {
    return { status: "already_subscribed" };
  }

  const unresolved = contracts.find(
    (contract) => contract.status === "pending_reconciliation",
  );
  if (unresolved) return { status: "pending_reconciliation" };

  const pending = contracts.find((contract) => contract.status === "pending");
  if (!pending) return null;

  const expiresAt = timestamp(pending.checkout_expires_at);
  const isMatchingCheckout =
    pending.price_id === priceId && pending.payment_method === paymentMethod;

  if (
    expiresAt !== null &&
    expiresAt > instant &&
    pending.asaas_checkout_url !== null &&
    hasSafeCheckoutUrl(pending.asaas_checkout_url)
  ) {
    return isMatchingCheckout
      ? { status: "reused", checkoutUrl: pending.asaas_checkout_url }
      : { status: "already_subscribed" };
  }

  if (expiresAt === null || expiresAt > instant) {
    return { status: "pending_reconciliation" };
  }

  return null;
}

function chargeType(
  price: ActiveBillingPrice,
  paymentMethod: BillingPaymentMethod,
): "recurring" | "installment" | "detached" {
  if (paymentMethod === "pix") return "detached";
  return price.billingMode === "monthly" ? "recurring" : "installment";
}

function todayInSaoPaulo(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

async function readContracts(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<CheckoutContractRow[] | null> {
  const { data, error } = await admin
    .from("billing_contracts")
    .select(CHECKOUT_CONTRACT_COLUMNS)
    .eq("user_id", userId);

  return error || !data ? null : data;
}

async function updatePendingContract(
  admin: SupabaseClient<Database>,
  contractId: string,
  values: Database["public"]["Tables"]["billing_contracts"]["Update"],
): Promise<boolean> {
  const { error } = await admin
    .from("billing_contracts")
    .update(values)
    .eq("id", contractId)
    .eq("status", "pending");

  return !error;
}

async function createHostedCheckout({
  userId,
  priceId,
  paymentMethod,
  admin,
  asaas,
  appUrl,
  now = new Date(),
}: CreateHostedCheckoutInput): Promise<CreateHostedCheckoutResult> {
  if (paymentMethod !== "credit_card" && paymentMethod !== "pix") {
    return { status: "rejected" };
  }

  const instant = now.getTime();
  if (!Number.isFinite(instant)) return { status: "pending_reconciliation" };

  try {
    const catalog = await listActivePrices({ supabase: admin });
    if (catalog.status !== "success") {
      return { status: "pending_reconciliation" };
    }

    const price = catalog.prices.find((candidate) => candidate.id === priceId);
    if (!price) return { status: "not_found" };

    const contracts = await readContracts(admin, userId);
    if (!contracts) return { status: "pending_reconciliation" };

    const existing = reusableCheckout(
      contracts,
      priceId,
      paymentMethod,
      instant,
    );
    if (existing) return existing;

    const stalePending = contracts.find(
      (contract) =>
        contract.status === "pending" &&
        timestamp(contract.checkout_expires_at) !== null &&
        timestamp(contract.checkout_expires_at)! <= instant,
    );

    if (
      stalePending &&
      !(await updatePendingContract(admin, stalePending.id, {
        status: "expired",
        updated_at: now.toISOString(),
      }))
    ) {
      return { status: "pending_reconciliation" };
    }

    const { data: customer, error: customerError } = await admin
      .from("billing_customers")
      .select("asaas_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (customerError) return { status: "pending_reconciliation" };

    const newContractId = globalThis.crypto.randomUUID();
    const { error: insertError } = await admin
      .from("billing_contracts")
      .insert({
        id: newContractId,
        user_id: userId,
        price_id: price.id,
        external_reference: newContractId,
        billing_mode: price.billingMode,
        payment_method: paymentMethod,
        charge_type: chargeType(price, paymentMethod),
        amount_cents: price.amountCents,
        currency: price.currency,
        installment_limit: price.installmentLimit,
        access_months: price.accessMonths,
        status: "pending",
      });

    if (insertError) {
      if (insertError.code !== "23505") {
        return { status: "pending_reconciliation" };
      }

      const winningContracts = await readContracts(admin, userId);
      if (!winningContracts) return { status: "pending_reconciliation" };

      return (
        reusableCheckout(winningContracts, priceId, paymentMethod, instant) ?? {
          status: "pending_reconciliation",
        }
      );
    }

    const checkoutRequest = buildCheckoutRequest({
      price,
      paymentMethod,
      contractId: newContractId,
      appUrl,
      customerId: customer?.asaas_customer_id,
      today: todayInSaoPaulo(now),
    });

    try {
      const checkout = await asaas.createCheckout(checkoutRequest);
      const checkoutExpiresAt = new Date(
        instant + 60 * 60 * 1000,
      ).toISOString();
      const stored = await updatePendingContract(admin, newContractId, {
        asaas_checkout_id: checkout.id,
        asaas_checkout_url: checkout.link,
        checkout_expires_at: checkoutExpiresAt,
        updated_at: now.toISOString(),
      });

      return stored
        ? { status: "created", checkoutUrl: checkout.link }
        : { status: "pending_reconciliation" };
    } catch (error) {
      const rejected =
        error instanceof AsaasGatewayError && error.kind === "rejected";

      if (rejected) {
        console.error(
          JSON.stringify({
            event: "asaas_checkout_rejected",
            contractId: newContractId,
            billingMode: price.billingMode,
            paymentMethod,
            httpStatus: error.status ?? null,
            providerErrorCodes: error.providerCodes,
          }),
        );
      }

      await updatePendingContract(admin, newContractId, {
        status: rejected ? "failed" : "pending_reconciliation",
        updated_at: now.toISOString(),
      });

      return rejected
        ? { status: "rejected" }
        : { status: "pending_reconciliation" };
    }
  } catch {
    return { status: "pending_reconciliation" };
  }
}

export {
  CHECKOUT_CONTRACT_COLUMNS,
  createHostedCheckout,
  type CreateHostedCheckoutInput,
  type CreateHostedCheckoutResult,
};
