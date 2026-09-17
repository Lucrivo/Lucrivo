import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type AuthenticatedHome =
  "/login" | "/dashboard" | "/admin" | "/account-unavailable";

async function resolveAuthenticatedHome(): Promise<AuthenticatedHome> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;

  if (claimsError || typeof subject !== "string" || subject.length === 0) {
    return "/login";
  }

  try {
    const { data: eligible, error: eligibilityError } = await supabase.rpc(
      "current_account_is_eligible",
    );
    if (eligibilityError || eligible !== true) return "/account-unavailable";

    const { data, error } = await supabase.rpc("current_user_is_admin");
    return !error && data === true ? "/admin" : "/dashboard";
  } catch {
    return "/account-unavailable";
  }
}

export { resolveAuthenticatedHome, type AuthenticatedHome };
