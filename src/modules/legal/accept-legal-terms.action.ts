"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/modules/auth/services/require-user";
import { LEGAL_COPY_VERSION } from "@/modules/legal/legal-copy";

type AcceptLegalTermsState = { status: "error" } | null;

async function acceptLegalTerms(
  previousState: AcceptLegalTermsState,
  formData: FormData,
): Promise<AcceptLegalTermsState> {
  void previousState;
  void formData;

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("accept_current_legal_terms_v1", {
      p_copy_version: LEGAL_COPY_VERSION,
    });
    if (error) return { status: "error" };
  } catch {
    return { status: "error" };
  }

  redirect("/auth/continue");
}

export { acceptLegalTerms, type AcceptLegalTermsState };
