import { NextResponse } from "next/server";
import { z } from "zod";

import { readBillingEnvironment } from "@/config/billing-environment";
import { readLaunchOfferEnvironment } from "@/config/launch-offer-environment";
import { createAdminClient } from "@/infrastructure/database/supabase/clients/admin.client";
import { createAsaasGateway } from "@/infrastructure/payments/asaas/asaas.client";
import {
  AuthRequiredError,
  LegalAcceptanceRequiredError,
  requireClientAccess,
} from "@/modules/auth/services/require-user";
import { createHostedCheckout } from "@/modules/billing/services/create-hosted-checkout.service";

const checkoutInputSchema = z.strictObject({
  priceId: z.uuid(),
  paymentMethod: z.enum(["credit_card", "pix"]),
});

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function POST(request: Request) {
  let userId: string;

  try {
    ({ userId } = await requireClientAccess());
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return json({ error: "unauthorized" }, 401);
    }
    if (error instanceof LegalAcceptanceRequiredError) {
      return json({ error: "legal_acceptance_required" }, 403);
    }
    return json({ error: "service_unavailable" }, 503);
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const parsed = checkoutInputSchema.safeParse(requestBody);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);

  try {
    const launchOffer = readLaunchOfferEnvironment();
    if (launchOffer.phase === "invalid") {
      console.error(
        JSON.stringify({ event: "launch_offer_configuration_invalid" }),
      );
      return json({ error: "service_unavailable" }, 503);
    }

    const environment = readBillingEnvironment();
    const admin = createAdminClient();
    const asaas = createAsaasGateway({
      apiUrl: environment.asaasApiUrl,
      apiKey: environment.asaasApiKey,
    });
    const result = await createHostedCheckout({
      userId,
      priceId: parsed.data.priceId,
      paymentMethod: parsed.data.paymentMethod,
      catalogCode: launchOffer.catalogCode,
      admin,
      asaas,
      appUrl: environment.appUrl,
    });

    switch (result.status) {
      case "created":
        return json({ checkoutUrl: result.checkoutUrl }, 201);
      case "reused":
        return json({ checkoutUrl: result.checkoutUrl }, 200);
      case "not_found":
        return json({ error: "price_not_found" }, 404);
      case "already_subscribed":
        return json({ error: "already_subscribed" }, 409);
      case "rejected":
        return json({ error: "checkout_rejected" }, 422);
      case "pending_reconciliation":
        return json({ error: "pending_reconciliation" }, 503);
    }
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export { POST };
