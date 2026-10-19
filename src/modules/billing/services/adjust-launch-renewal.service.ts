import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import {
  AsaasGatewayError,
  type AsaasGateway,
} from "@/infrastructure/payments/asaas/asaas.client";

const renewalClaimSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("not_required") }),
  z.strictObject({
    status: z.literal("not_ready"),
    retry: z.literal(true),
  }),
  z.strictObject({ status: z.literal("completed") }),
  z.strictObject({
    status: z.literal("ready"),
    contractId: z.uuid(),
    subscriptionId: z.string().trim().min(1),
    nextDueDate: z.iso.date(),
    renewalAmountCents: z.literal(4990),
  }),
]);

type AdjustLaunchRenewalResult = "not_required" | "completed" | "retry_later";

type AdjustLaunchRenewalInput = {
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
  eventId: string;
};

async function recordResult(
  admin: SupabaseClient<Database>,
  input: {
    contractId: string;
    status: "completed" | "pending_reconciliation";
    errorCode: "provider_rejected" | "provider_ambiguous" | null;
  },
): Promise<boolean> {
  const { data, error } = await admin.rpc(
    "record_billing_renewal_adjustment_result",
    {
      p_contract_id: input.contractId,
      p_status: input.status,
      // Postgres accepts NULL for this text argument, while generated types do
      // not retain function-argument nullability.
      p_error_code: input.errorCode as string,
    },
  );

  return !error && data === true;
}

async function adjustLaunchRenewal({
  admin,
  asaas,
  eventId,
}: AdjustLaunchRenewalInput): Promise<AdjustLaunchRenewalResult> {
  try {
    const { data, error } = await admin.rpc(
      "begin_billing_renewal_adjustment",
      { p_event_id: eventId },
    );
    if (error) return "retry_later";

    const parsed = renewalClaimSchema.safeParse(data);
    if (!parsed.success) return "retry_later";

    const claim = parsed.data;
    if (claim.status === "not_required" || claim.status === "completed") {
      return "not_required";
    }
    if (claim.status === "not_ready") return "retry_later";

    try {
      await asaas.updateSubscriptionRenewal(claim.subscriptionId, {
        cycle: "MONTHLY",
        nextDueDate: claim.nextDueDate,
        value: claim.renewalAmountCents / 100,
      });
    } catch (providerError) {
      const errorCode =
        providerError instanceof AsaasGatewayError &&
        providerError.kind === "rejected"
          ? "provider_rejected"
          : "provider_ambiguous";

      await recordResult(admin, {
        contractId: claim.contractId,
        status: "pending_reconciliation",
        errorCode,
      });
      return "retry_later";
    }

    const persisted = await recordResult(admin, {
      contractId: claim.contractId,
      status: "completed",
      errorCode: null,
    });
    if (!persisted) {
      console.error(
        JSON.stringify({
          event: "launch_renewal_adjustment_persist_failed",
          contractId: claim.contractId,
        }),
      );
      return "retry_later";
    }

    return "completed";
  } catch {
    return "retry_later";
  }
}

export { adjustLaunchRenewal };
export type { AdjustLaunchRenewalInput, AdjustLaunchRenewalResult };
