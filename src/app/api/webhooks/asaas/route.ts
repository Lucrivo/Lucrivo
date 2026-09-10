import { NextResponse } from "next/server";

import { readBillingEnvironment } from "@/config/billing-environment";
import { createAdminClient } from "@/infrastructure/database/supabase/clients/admin.client";
import { parseAsaasWebhook } from "@/infrastructure/payments/asaas/webhook.schema";
import { processAsaasWebhook } from "@/modules/billing/services/process-asaas-webhook.service";

import { hasValidWebhookToken } from "./webhook-token";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function POST(request: Request) {
  let expectedToken: string;

  try {
    expectedToken = readBillingEnvironment().asaasWebhookToken;
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }

  if (
    !hasValidWebhookToken(
      request.headers.get("asaas-access-token"),
      expectedToken,
    )
  ) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const parsed = parseAsaasWebhook(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);

  try {
    const result = await processAsaasWebhook({
      admin: createAdminClient(),
      event: parsed.event,
    });

    return result === "processed" ||
      result === "duplicate" ||
      result === "ignored"
      ? json({ status: "received" }, 200)
      : json({ error: "retry_later" }, 503);
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { POST };
