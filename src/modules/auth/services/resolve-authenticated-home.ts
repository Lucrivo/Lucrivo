import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type AuthenticatedHome =
  "/login" | "/dashboard" | "/admin" | "/onboarding" | "/account-unavailable";

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

    const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
    if (isAdmin === true) return "/admin";

    const { data: hasCompletedOnboarding, error: onboardingError } =
      await supabase.rpc("current_user_has_completed_onboarding");

    if (onboardingError || typeof hasCompletedOnboarding !== "boolean") {
      return "/account-unavailable";
    }

    return hasCompletedOnboarding ? "/dashboard" : "/onboarding";
  } catch {
    return "/account-unavailable";
  }
}

export { resolveAuthenticatedHome, type AuthenticatedHome };
