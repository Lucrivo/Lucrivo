import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import type { Database } from "@/infrastructure/database/supabase/database.types";
import { AuthRequiredError } from "@/modules/auth/services/require-user";

class AdminRequiredError extends Error {
  constructor() {
    super("Administrative access required");
    this.name = "AdminRequiredError";
  }
}

class AdminMfaRequiredError extends Error {
  constructor() {
    super("Multi-factor authentication required");
    this.name = "AdminMfaRequiredError";
  }
}

async function requireAdmin(): Promise<{
  userId: string;
  supabase: SupabaseClient<Database>;
}> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;

  if (claimsError || typeof subject !== "string" || subject.length === 0) {
    throw new AuthRequiredError();
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "current_user_is_admin",
  );

  if (adminError || isAdmin !== true) {
    throw new AdminRequiredError();
  }

  if (claimsData?.claims?.aal !== "aal2") {
    throw new AdminMfaRequiredError();
  }

  return { userId: subject, supabase };
}

export { AdminMfaRequiredError, AdminRequiredError, requireAdmin };
