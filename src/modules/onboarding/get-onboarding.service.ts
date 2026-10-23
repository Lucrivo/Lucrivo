import "server-only";

import { requireUser } from "@/modules/auth/services/require-user";

import {
  onboardingCatalogSchema,
  onboardingProfileRpcSchema,
  type OnboardingData,
} from "./onboarding.schema";

type OnboardingUnavailableStage =
  | "catalog_rpc"
  | "profile_rpc"
  | "catalog_payload"
  | "profile_payload"
  | "unexpected";

class OnboardingUnavailableError extends Error {
  readonly stage: OnboardingUnavailableStage;

  constructor(stage: OnboardingUnavailableStage, options?: ErrorOptions) {
    super("Onboarding data unavailable", options);
    this.name = "OnboardingUnavailableError";
    this.stage = stage;
  }
}

function rpcFailureCause(operation: "catalog" | "profile", error: unknown) {
  const candidate =
    typeof error === "object" && error !== null && "code" in error
      ? Reflect.get(error, "code")
      : null;
  const code =
    typeof candidate === "string" && /^[a-z\d_]{1,32}$/i.test(candidate)
      ? candidate
      : "unknown";

  return new Error(`${operation} RPC failed (${code})`);
}

async function getOnboardingData(): Promise<OnboardingData> {
  const { supabase } = await requireUser();

  try {
    const [catalogResult, profileResult] = await Promise.all([
      supabase.rpc("list_business_catalog_v1"),
      supabase.rpc("get_my_onboarding_profile_v1"),
    ]);

    if (catalogResult.error) {
      throw new OnboardingUnavailableError("catalog_rpc", {
        cause: rpcFailureCause("catalog", catalogResult.error),
      });
    }

    if (profileResult.error) {
      throw new OnboardingUnavailableError("profile_rpc", {
        cause: rpcFailureCause("profile", profileResult.error),
      });
    }

    const catalog = onboardingCatalogSchema.safeParse(catalogResult.data);
    const profile = onboardingProfileRpcSchema.safeParse(profileResult.data);

    if (!catalog.success) {
      throw new OnboardingUnavailableError("catalog_payload", {
        cause: new Error("Catalog payload failed schema validation"),
      });
    }

    if (!profile.success) {
      throw new OnboardingUnavailableError("profile_payload", {
        cause: new Error("Profile payload failed schema validation"),
      });
    }

    return { catalog: catalog.data, profile: profile.data };
  } catch (error) {
    if (error instanceof OnboardingUnavailableError) throw error;
    throw new OnboardingUnavailableError("unexpected", {
      cause: new Error(
        error instanceof Error
          ? `Unexpected onboarding failure (${error.name})`
          : "Unexpected onboarding failure (non-error value)",
      ),
    });
  }
}

export { OnboardingUnavailableError, getOnboardingData };
