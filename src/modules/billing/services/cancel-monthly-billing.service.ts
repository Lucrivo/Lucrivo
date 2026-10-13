import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import {
  AsaasGatewayError,
  type AsaasGateway,
} from "@/infrastructure/payments/asaas/asaas.client";

const CANCELABLE_CONTRACT_COLUMNS =
  "id, billing_mode, payment_method, charge_type, status, asaas_subscription_id, access_ends_at, cancel_at_period_end" as const;

type CancelableContract = Pick<
  Database["public"]["Tables"]["billing_contracts"]["Row"],
  | "id"
  | "billing_mode"
  | "payment_method"
  | "charge_type"
  | "status"
  | "asaas_subscription_id"
  | "access_ends_at"
  | "cancel_at_period_end"
>;

type CancelMonthlyBillingResult =
  | { status: "canceled"; accessEndsAt: string }
  | { status: "not_found" | "already_canceled" | "rejected" }
  | { status: "pending_reconciliation" };

type CancelMonthlyBillingInput = {
  userId: string;
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
  now?: Date;
};

function isMonthlyCardSubscription(contract: CancelableContract): boolean {
  return (
    contract.billing_mode === "monthly" &&
    contract.payment_method === "credit_card" &&
    contract.charge_type === "recurring"
  );
}

function isValidTimestamp(value: string | null): value is string {
  return value !== null && Number.isFinite(Date.parse(value));
}

async function cancelMonthlyBilling({
  userId,
  admin,
  asaas,
  now = new Date(),
}: CancelMonthlyBillingInput): Promise<CancelMonthlyBillingResult> {
  if (!Number.isFinite(now.getTime())) {
    return { status: "pending_reconciliation" };
  }

  try {
    const { data, error } = await admin
      .from("billing_contracts")
      .select(CANCELABLE_CONTRACT_COLUMNS)
      .eq("user_id", userId)
      .eq("billing_mode", "monthly")
      .eq("payment_method", "credit_card")
      .eq("charge_type", "recurring")
      .in("status", ["active", "cancel_at_period_end"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { status: "pending_reconciliation" };
    if (!data) return { status: "not_found" };

    const contract: CancelableContract = data;
    if (!isMonthlyCardSubscription(contract)) {
      return { status: "not_found" };
    }

    if (
      contract.status === "cancel_at_period_end" &&
      contract.cancel_at_period_end
    ) {
      return { status: "already_canceled" };
    }

    if (
      contract.status !== "active" ||
      contract.cancel_at_period_end ||
      !contract.asaas_subscription_id ||
      !isValidTimestamp(contract.access_ends_at)
    ) {
      return { status: "pending_reconciliation" };
    }

    const changedAt = now.toISOString();
    const { error: requestError } = await admin
      .from("billing_contracts")
      .update({
        cancellation_requested_at: changedAt,
        updated_at: changedAt,
      })
      .eq("id", contract.id)
      .eq("user_id", userId)
      .eq("status", "active");

    if (requestError) return { status: "pending_reconciliation" };

    try {
      await asaas.deleteSubscription(contract.asaas_subscription_id);
    } catch (providerError) {
      return providerError instanceof AsaasGatewayError &&
        providerError.kind === "rejected"
        ? { status: "rejected" }
        : { status: "pending_reconciliation" };
    }

    const { error: confirmationError } = await admin
      .from("billing_contracts")
      .update({
        status: "cancel_at_period_end",
        cancel_at_period_end: true,
        cancellation_confirmed_at: changedAt,
        updated_at: changedAt,
      })
      .eq("id", contract.id)
      .eq("user_id", userId)
      .in("status", ["active", "cancel_at_period_end"]);

    if (confirmationError) return { status: "pending_reconciliation" };

    return { status: "canceled", accessEndsAt: contract.access_ends_at };
  } catch {
    return { status: "pending_reconciliation" };
  }
}

export { cancelMonthlyBilling };
export type { CancelMonthlyBillingResult };
