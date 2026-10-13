import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { AsaasGateway } from "@/infrastructure/payments/asaas/asaas.client";
import type { AsaasWebhookEnvelope } from "@/infrastructure/payments/asaas/webhook.schema";

import { adjustLaunchRenewal } from "./adjust-launch-renewal.service";

type ProcessAsaasWebhookResult =
  "processed" | "duplicate" | "ignored" | "unresolved" | "failed";

const reducerResults = new Set<ProcessAsaasWebhookResult>([
  "processed",
  "duplicate",
  "ignored",
  "unresolved",
]);

async function processAsaasWebhook(input: {
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
  event: AsaasWebhookEnvelope;
}): Promise<ProcessAsaasWebhookResult> {
  try {
    const { data, error } = await input.admin.rpc("apply_asaas_webhook_event", {
      p_event_id: input.event.id,
      p_event_type: input.event.event,
      p_payload: input.event.redactedPayload,
    });

    if (error || !reducerResults.has(data as ProcessAsaasWebhookResult)) {
      return "failed";
    }

    const reducerResult = data as Exclude<ProcessAsaasWebhookResult, "failed">;
    if (reducerResult !== "processed" && reducerResult !== "duplicate") {
      return reducerResult;
    }

    const adjustment = await adjustLaunchRenewal({
      admin: input.admin,
      asaas: input.asaas,
      eventId: input.event.id,
    });

    return adjustment === "retry_later" ? "failed" : reducerResult;
  } catch {
    return "failed";
  }
}

export { processAsaasWebhook };
export type { ProcessAsaasWebhookResult };
