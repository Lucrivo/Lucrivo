import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { LEGAL_COPY_VERSION } from "@/modules/legal/legal-copy";

class AuthRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthRequiredError";
  }
}

class AccountUnavailableError extends Error {
  constructor() {
    super("Account unavailable");
    this.name = "AccountUnavailableError";
  }
}

class LegalAcceptanceRequiredError extends Error {
  constructor() {
    super("Legal acceptance required");
    this.name = "LegalAcceptanceRequiredError";
  }
}

async function requireUser(): Promise<{
  userId: string;
  supabase: SupabaseClient<Database>;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || subject.length === 0) {
    throw new AuthRequiredError();
  }

  try {
    const { data: eligible, error: eligibilityError } = await supabase.rpc(
      "current_account_is_eligible",
    );

    if (eligibilityError || eligible !== true) {
      throw new AccountUnavailableError();
    }
  } catch {
    throw new AccountUnavailableError();
  }

  return { userId: subject, supabase };
}

async function requireClientAccess(): Promise<{
  userId: string;
  supabase: SupabaseClient<Database>;
  isAdmin: boolean;
}> {
  const { userId, supabase } = await requireUser();
  let isAdmin = false;

  try {
    const { data, error } = await supabase.rpc("current_user_is_admin");
    if (!error && data === true) isAdmin = true;
  } catch {
    isAdmin = false;
  }

  if (isAdmin) return { userId, supabase, isAdmin: true };

  let accepted = false;
  try {
    const { data, error } = await supabase.rpc(
      "current_user_has_accepted_legal_copy_v1",
      { p_copy_version: LEGAL_COPY_VERSION },
    );
    accepted = !error && data === true;
  } catch {
    accepted = false;
  }

  if (!accepted) throw new LegalAcceptanceRequiredError();
  return { userId, supabase, isAdmin: false };
}

export {
  AccountUnavailableError,
  AuthRequiredError,
  LegalAcceptanceRequiredError,
  requireClientAccess,
  requireUser,
};
