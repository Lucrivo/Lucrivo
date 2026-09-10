import { NextResponse } from "next/server";

import { readBillingEnvironment } from "@/config/billing-environment";
import { createAdminClient } from "@/infrastructure/database/supabase/clients/admin.client";
import { createAsaasGateway } from "@/infrastructure/payments/asaas/asaas.client";
import {
  AuthRequiredError,
  requireUser,
} from "@/modules/auth/services/require-user";
import { cancelMonthlyBilling } from "@/modules/billing/services/cancel-monthly-billing.service";

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function POST() {
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
    const admin = createAdminClient();
    const asaas = createAsaasGateway({
      apiUrl: environment.asaasApiUrl,
      apiKey: environment.asaasApiKey,
    });
    const result = await cancelMonthlyBilling({ userId, admin, asaas });

    switch (result.status) {
      case "canceled":
        return json(
          { status: "canceled", accessEndsAt: result.accessEndsAt },
          200,
        );
      case "already_canceled":
        return json({ status: "already_canceled" }, 200);
      case "not_found":
        return json({ error: "subscription_not_found" }, 404);
      case "rejected":
        return json({ error: "cancellation_rejected" }, 422);
      case "pending_reconciliation":
        return json({ error: "pending_reconciliation" }, 503);
    }
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { POST };
