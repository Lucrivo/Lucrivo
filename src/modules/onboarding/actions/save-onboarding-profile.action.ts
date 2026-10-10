"use server";

import { revalidatePath } from "next/cache";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import { requireUser } from "@/modules/auth/services/require-user";

import {
  ONBOARDING_CONSENT_COPY_VERSION,
  onboardingInputSchema,
  onboardingRpcResultSchema,
  type SaveOnboardingResult,
} from "../onboarding.schema";

type GeneratedSaveOnboardingRpcArgs =
  Database["public"]["Functions"]["save_onboarding_profile_v1"]["Args"];

function fieldErrors(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "form";
    errors[path] = [...(errors[path] ?? []), issue.message];
  }

  return errors;
}

async function saveOnboardingProfile(
  input: unknown,
): Promise<SaveOnboardingResult> {
  const parsedInput = onboardingInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      status: "invalid",
      fieldErrors: fieldErrors(parsedInput.error),
    };
  }

  try {
    const { supabase } = await requireUser();
    const rpcArgs = {
      p_full_name: parsedInput.data.fullName,
      p_whatsapp_e164: parsedInput.data.whatsappE164,
      p_segment_id: parsedInput.data.segmentId,
      p_subcategory_id: parsedInput.data.subcategoryId,
      p_custom_subcategory: parsedInput.data.customSubcategory,
      p_whatsapp_marketing_consent: parsedInput.data.whatsappMarketingConsent,
      p_consent_copy_version: ONBOARDING_CONSENT_COPY_VERSION,
      p_expected_version: parsedInput.data.expectedVersion,
    } as unknown as GeneratedSaveOnboardingRpcArgs;
    const { data, error } = await supabase.rpc(
      "save_onboarding_profile_v1",
      rpcArgs,
    );

    if (error) return { status: "error" };

    const parsedResult = onboardingRpcResultSchema.safeParse(data);
    if (!parsedResult.success) return { status: "error" };

    if (parsedResult.data.status === "saved") {
      revalidatePath("/account");
      revalidatePath("/onboarding");
    }

    return parsedResult.data;
  } catch {
    return { status: "error" };
  }
}

export { saveOnboardingProfile };
