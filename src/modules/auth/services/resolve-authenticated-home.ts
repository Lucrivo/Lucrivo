import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

type AuthenticatedHome = "/login" | "/dashboard" | "/admin";

async function resolveAuthenticatedHome(): Promise<AuthenticatedHome> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;

  if (claimsError || typeof subject !== "string" || subject.length === 0) {
    return "/login";
  }

  try {
    const { data, error } = await supabase.rpc("current_user_is_admin");
    return !error && data === true ? "/admin" : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export { resolveAuthenticatedHome, type AuthenticatedHome };
