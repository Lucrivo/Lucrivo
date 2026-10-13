import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { LEGAL_COPY_VERSION } from "@/modules/legal/legal-copy";

type AuthenticatedHome =
  | "/login"
  | "/dashboard"
  | "/admin"
  | "/onboarding"
  | "/account-unavailable"
  | "/accept-terms";

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

    let isAdmin = false;
    try {
      const { data: admin, error: adminError } = await supabase.rpc(
        "current_user_is_admin",
      );
      if (!adminError && admin === true) isAdmin = true;
    } catch {
      isAdmin = false;
    }
    if (isAdmin) return "/admin";

    try {
      const { data: accepted, error: acceptedError } = await supabase.rpc(
        "current_user_has_accepted_legal_copy_v1",
        { p_copy_version: LEGAL_COPY_VERSION },
      );
      if (acceptedError || accepted !== true) return "/accept-terms";
    } catch {
      return "/accept-terms";
    }

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
