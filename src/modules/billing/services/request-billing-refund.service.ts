import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import {
  AsaasGatewayError,
  type AsaasGateway,
} from "@/infrastructure/payments/asaas/asaas.client";

const terminalClaimSchema = z.object({
  status: z.enum([
    "already_submitted",
    "pending_reconciliation",
    "not_found",
    "not_eligible",
    "not_ready",
    "confirmed",
  ]),
});

const identifier = z.string().trim().min(1);
const requestIdentifier = z.uuid();

const readyClaimSchema = z.union([
  z.object({
    status: z.literal("ready"),
    requestId: requestIdentifier,
    billingMode: z.literal("monthly"),
    paymentMethod: z.literal("pix"),
    paymentId: identifier,
    installmentId: z.null(),
    subscriptionId: z.null(),
  }),
  z.object({
    status: z.literal("ready"),
    requestId: requestIdentifier,
    billingMode: z.literal("monthly"),
    paymentMethod: z.literal("credit_card"),
    paymentId: identifier,
    installmentId: z.null(),
    subscriptionId: identifier,
  }),
  z.object({
    status: z.literal("ready"),
    requestId: requestIdentifier,
    billingMode: z.literal("semiannual"),
    paymentMethod: z.literal("pix"),
    paymentId: identifier,
    installmentId: z.null(),
    subscriptionId: z.null(),
  }),
  z.object({
    status: z.literal("ready"),
    requestId: requestIdentifier,
    billingMode: z.literal("semiannual"),
    paymentMethod: z.literal("credit_card"),
    paymentId: z.null(),
    installmentId: identifier,
    subscriptionId: z.null(),
  }),
]);

const claimSchema = z.union([terminalClaimSchema, readyClaimSchema]);

type RequestBillingRefundResult =
  | { status: "submitted" | "already_submitted" | "confirmed" }
  | { status: "not_found" | "not_eligible" | "not_ready" | "rejected" }
  | { status: "pending_reconciliation" };

type RequestBillingRefundInput = {
  userId: string;
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
};

async function recordResult(
  admin: SupabaseClient<Database>,
  input: {
    requestId: string;
    result: "submitted" | "rejected" | "pending_reconciliation";
    errorCode:
      | "provider_rejected"
      | "provider_ambiguous"
      | "subscription_cancellation_failed"
      | null;
    recurrenceCanceled: boolean;
  },
): Promise<string | null> {
  const { data, error } = await admin.rpc(
    "record_billing_refund_provider_result",
    {
      p_request_id: input.requestId,
      p_result: input.result,
      p_recurrence_canceled: input.recurrenceCanceled,
      ...(input.errorCode === null ? {} : { p_error_code: input.errorCode }),
    },
  );
  return error || typeof data !== "string" ? null : data;
}

async function requestBillingRefund({
  userId,
  admin,
  asaas,
}: RequestBillingRefundInput): Promise<RequestBillingRefundResult> {
  try {
    const { data, error } = await admin.rpc("begin_billing_refund", {
      p_user_id: userId,
    });
    if (error) return { status: "pending_reconciliation" };

    const parsed = claimSchema.safeParse(data);
    if (!parsed.success) return { status: "pending_reconciliation" };
    const claim = parsed.data;
    if (claim.status !== "ready") return { status: claim.status };

    let recurrenceCanceled = false;
    try {
      if (
        claim.billingMode === "semiannual" &&
        claim.paymentMethod === "credit_card"
      ) {
        await asaas.refundInstallment(claim.installmentId);
      } else {
        await asaas.refundPayment(claim.paymentId);
      }

      if (
        claim.billingMode === "monthly" &&
        claim.paymentMethod === "credit_card"
      ) {
        try {
          await asaas.deleteSubscription(claim.subscriptionId);
          recurrenceCanceled = true;
        } catch {
          await recordResult(admin, {
            requestId: claim.requestId,
            result: "pending_reconciliation",
            errorCode: "subscription_cancellation_failed",
            recurrenceCanceled: false,
          });
          return { status: "pending_reconciliation" };
        }
      }
    } catch (providerError) {
      const rejected =
        providerError instanceof AsaasGatewayError &&
        providerError.kind === "rejected";
      const persisted = await recordResult(admin, {
        requestId: claim.requestId,
        result: rejected ? "rejected" : "pending_reconciliation",
        errorCode: rejected ? "provider_rejected" : "provider_ambiguous",
        recurrenceCanceled: false,
      });
      if (persisted === null) return { status: "pending_reconciliation" };
      return { status: rejected ? "rejected" : "pending_reconciliation" };
    }

    const persisted = await recordResult(admin, {
      requestId: claim.requestId,
      result: "submitted",
      errorCode: null,
      recurrenceCanceled,
    });
    if (persisted === null) return { status: "pending_reconciliation" };
    return persisted === "confirmed"
      ? { status: "confirmed" }
      : { status: "submitted" };
  } catch {
    return { status: "pending_reconciliation" };
  }
}

export { requestBillingRefund };
export type { RequestBillingRefundInput, RequestBillingRefundResult };
