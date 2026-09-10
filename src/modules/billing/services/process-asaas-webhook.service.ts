import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import type { AsaasWebhookEnvelope } from "@/infrastructure/payments/asaas/webhook.schema";

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

    return data as Exclude<ProcessAsaasWebhookResult, "failed">;
  } catch {
    return "failed";
  }
}

export { processAsaasWebhook };
export type { ProcessAsaasWebhookResult };
