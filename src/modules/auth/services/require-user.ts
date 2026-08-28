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

  return { userId: subject, supabase };
}

export { AuthRequiredError, requireUser };
