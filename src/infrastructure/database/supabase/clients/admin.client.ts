import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readBillingEnvironment } from "@/config/billing-environment";
import type { Database } from "@/infrastructure/database/supabase/database.types";

function createAdminClient(): SupabaseClient<Database> {
  const environment = readBillingEnvironment();

  return createClient<Database>(
    environment.supabaseUrl,
    environment.supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

export { createAdminClient };
