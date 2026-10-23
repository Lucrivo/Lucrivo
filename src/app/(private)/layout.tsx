import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { readLaunchOfferEnvironment } from "@/config/launch-offer-environment";
import {
  AccountUnavailableError,
  AuthRequiredError,
  LegalAcceptanceRequiredError,
  requireClientAccess,
} from "@/modules/auth/services/require-user";
import type { BillingBannerView } from "@/modules/billing/components/billing-banner";
import { isLaunchOfferActive } from "@/modules/billing/domain/launch-offer";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let access: Awaited<ReturnType<typeof requireClientAccess>>;

  try {
    access = await requireClientAccess();
  } catch (error) {
    if (error instanceof AuthRequiredError) redirect("/login");
    if (error instanceof AccountUnavailableError) {
      redirect("/account-unavailable");
    }
    if (error instanceof LegalAcceptanceRequiredError) {
      redirect("/accept-terms");
    }
    throw error;
  }

  const { supabase, isAdmin, userId } = access;
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Sua conta";

  if (!isAdmin) {
    const { data: hasCompletedOnboarding, error: onboardingError } =
      await supabase.rpc("current_user_has_completed_onboarding");

    if (onboardingError || typeof hasCompletedOnboarding !== "boolean") {
      redirect("/account-unavailable");
    }

    if (!hasCompletedOnboarding) redirect("/onboarding");
  }

  let billingBanner: BillingBannerView | null = null;
  let preDiagnosisDialog = false;

  if (!isAdmin) {
    try {
      const billing = await getBillingOverview({ supabase, userId });
      if (billing.status === "success" && billing.overview.tier === "free") {
        if (!billing.overview.freeQuickDiagnosisUsed) {
          billingBanner = { kind: "free_diagnosis" };
          preDiagnosisDialog = true;
        } else {
          const launchOffer = readLaunchOfferEnvironment();
          if (isLaunchOfferActive(launchOffer)) {
            billingBanner = {
              kind: "launch_offer",
              phase: launchOffer.phase,
              endsAt: launchOffer.endsAt,
            };
          }
        }
      }
    } catch {
      billingBanner = null;
    }
  }

  return (
    <AppShell
      email={email}
      sidebarVariant="financial"
      isAdminUser={isAdmin}
      contextTitle="Área financeira"
      contextDescription="Acompanhe e organize suas decisões em um só lugar."
      billingBanner={billingBanner}
      preDiagnosisDialog={preDiagnosisDialog}
    >
      {children}
    </AppShell>
  );
}
