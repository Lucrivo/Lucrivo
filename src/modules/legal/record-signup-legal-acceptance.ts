import "server-only";

import { createAdminClient } from "@/infrastructure/database/supabase/clients/admin.client";
import { LEGAL_COPY_VERSION } from "@/modules/legal/legal-copy";

async function recordSignupLegalAcceptance(
  userId: string,
): Promise<"recorded" | "failed"> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("record_signup_legal_acceptance_v1", {
      p_user_id: userId,
      p_copy_version: LEGAL_COPY_VERSION,
    });
    return error ? "failed" : "recorded";
  } catch {
    return "failed";
  }
}

export { recordSignupLegalAcceptance };
