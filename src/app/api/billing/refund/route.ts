import { NextResponse } from "next/server";

import { readBillingEnvironment } from "@/config/billing-environment";
import { createAdminClient } from "@/infrastructure/database/supabase/clients/admin.client";
import { createAsaasGateway } from "@/infrastructure/payments/asaas/asaas.client";
import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { requestBillingRefund } from "@/modules/billing/services/request-billing-refund.service";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function hasExpectedOrigin(request: Request, expected: URL): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    return (
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.origin === expected.origin
    );
  } catch {
    return false;
  }
}

async function POST(request: Request) {
  let userId: string;

  try {
    ({ userId } = await requireUser());
  } catch (error) {
    return error instanceof AuthRequiredError
      ? json({ error: "unauthorized" }, 401)
      : json({ error: "service_unavailable" }, 503);
  }

  try {
    const environment = readBillingEnvironment();
    if (!hasExpectedOrigin(request, environment.appUrl)) {
      return json({ error: "forbidden" }, 403);
    }

    const admin = createAdminClient();
    const asaas = createAsaasGateway({
      apiUrl: environment.asaasApiUrl,
      apiKey: environment.asaasApiKey,
    });
    const result = await requestBillingRefund({ userId, admin, asaas });

    switch (result.status) {
      case "submitted":
        return json({ status: "submitted" }, 202);
      case "already_submitted":
        return json({ status: "already_submitted" }, 200);
      case "confirmed":
        return json({ status: "confirmed" }, 200);
      case "not_found":
        return json({ error: "refundable_contract_not_found" }, 404);
      case "not_eligible":
        return json({ error: "refund_not_eligible" }, 409);
      case "not_ready":
        return json({ error: "payment_not_ready" }, 409);
      case "rejected":
        return json({ error: "refund_rejected" }, 422);
      case "pending_reconciliation":
        return json({ error: "pending_reconciliation" }, 503);
    }
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { POST };
