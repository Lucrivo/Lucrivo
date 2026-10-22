import "server-only";

import { readLandingOfferDialogEnabled } from "@/config/landing-offer-dialog-environment";
import { readLaunchOfferEnvironment } from "@/config/launch-offer-environment";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { isLaunchOfferActive } from "@/modules/billing/domain/launch-offer";
import { listActivePrices } from "@/modules/billing/services/list-active-prices.service";
import type { ActiveBillingPrice } from "@/modules/billing/types";

import type { LaunchOfferView } from "./landing-offer";

type LandingOfferContext = {
  prices: ActiveBillingPrice[];
  launchOffer: LaunchOfferView | null;
  offerDialogEnabled: boolean;
};

async function loadLandingOfferContext(): Promise<LandingOfferContext> {
  const offerDialogEnabled = readLandingOfferDialogEnabled();
  const launchOffer = readLaunchOfferEnvironment();

  if (launchOffer.phase === "invalid") {
    console.error(
      JSON.stringify({ event: "launch_offer_configuration_invalid" }),
    );
    return { prices: [], launchOffer: null, offerDialogEnabled };
  }

  const supabase = await createClient();
  const result = await listActivePrices({
    supabase,
    catalogCode: launchOffer.catalogCode,
  });

  return {
    prices: result.status === "success" ? result.prices : [],
    launchOffer: isLaunchOfferActive(launchOffer)
      ? { phase: launchOffer.phase, endsAt: launchOffer.endsAt }
      : null,
    offerDialogEnabled,
  };
}

export { loadLandingOfferContext };
export type { LandingOfferContext };
