import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

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

export { AccountUnavailableError, AuthRequiredError, requireUser };
