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

type AdminIdentity = {
  userId: string;
  aal: unknown;
  email: string;
  supabase: SupabaseClient<Database>;
};

async function requireAdminIdentity(): Promise<AdminIdentity> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const subject = claims?.sub;

  if (
    claimsError ||
    !claims ||
    typeof subject !== "string" ||
    subject.length === 0
  ) {
    throw new AuthRequiredError();
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "current_user_is_admin",
  );

  if (adminError || isAdmin !== true) {
    throw new AdminRequiredError();
  }

  const email = typeof claims.email === "string" ? claims.email : "Sua conta";

  return {
    userId: subject,
    aal: claims.aal,
    email,
    supabase,
  };
}

async function requireAdmin(): Promise<{
  userId: string;
  supabase: SupabaseClient<Database>;
}> {
  const { userId, aal, supabase } = await requireAdminIdentity();

  if (aal !== "aal2") throw new AdminMfaRequiredError();

  return { userId, supabase };
}

export {
  AdminMfaRequiredError,
  AdminRequiredError,
  requireAdmin,
  requireAdminIdentity,
  type AdminIdentity,
};
