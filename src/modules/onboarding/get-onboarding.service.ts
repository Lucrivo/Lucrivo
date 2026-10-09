import "server-only";

import { requireUser } from "@/modules/auth/services/require-user";

import {
  onboardingCatalogSchema,
  onboardingProfileRpcSchema,
  type OnboardingData,
} from "./onboarding.schema";

class OnboardingUnavailableError extends Error {
  constructor() {
    super("Onboarding data unavailable");
    this.name = "OnboardingUnavailableError";
  }
}

async function getOnboardingData(): Promise<OnboardingData> {
  const { supabase } = await requireUser();

  try {
    const [catalogResult, profileResult] = await Promise.all([
      supabase.rpc("list_business_catalog_v1"),
      supabase.rpc("get_my_onboarding_profile_v1"),
    ]);

    if (catalogResult.error || profileResult.error) {
      throw new OnboardingUnavailableError();
    }

    const catalog = onboardingCatalogSchema.safeParse(catalogResult.data);
    const profile = onboardingProfileRpcSchema.safeParse(profileResult.data);

    if (!catalog.success || !profile.success) {
      throw new OnboardingUnavailableError();
    }

    return { catalog: catalog.data, profile: profile.data };
  } catch (error) {
    if (error instanceof OnboardingUnavailableError) throw error;
    throw new OnboardingUnavailableError();
  }
}

export { OnboardingUnavailableError, getOnboardingData };
