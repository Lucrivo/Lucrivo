import type { ActiveLaunchOfferPhase } from "@/modules/billing/domain/launch-offer";
import {
  resolveOfferPresentation,
  type OfferPresentation,
} from "@/modules/billing/presenters/offer-presentation";
import type { ActiveBillingPrice } from "@/modules/billing/types";

const SUPPORT_EMAIL = "atendimento@lucrivo.com.br";
const GUARANTEE_DAYS = 7;

const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/somoslucrivo/",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@somoslucrivo",
  },
] as const;

type SocialLinkId = (typeof SOCIAL_LINKS)[number]["id"];
type LandingOfferPresentation = OfferPresentation;
type LaunchOfferView = {
  phase: ActiveLaunchOfferPhase;
  endsAt: string;
};

function resolveActiveLaunchOffer(
  launchOffer: LaunchOfferView | null | undefined,
  offer: LandingOfferPresentation | null,
): LaunchOfferView | null {
  if (
    launchOffer &&
    offer?.monthlyRenewalPriceLabel !== null &&
    ((launchOffer.phase === "bonus_active" &&
      offer?.catalogCode === "launch") ||
      (launchOffer.phase === "price_active" &&
        offer?.catalogCode === "launch_price"))
  ) {
    return launchOffer;
  }

  return null;
}

function shouldShowLandingOfferDialog(
  prices: ActiveBillingPrice[],
  launchOffer: LaunchOfferView | null | undefined,
  offerDialogEnabled: boolean,
): LandingOfferPresentation | null {
  const offer = resolveLandingOfferPresentation(prices);
  if (!offer) return null;
  if (!resolveActiveLaunchOffer(launchOffer, offer) && !offerDialogEnabled) {
    return null;
  }

  return offer;
}

function resolveLandingOfferPresentation(
  prices: ActiveBillingPrice[],
): LandingOfferPresentation | null {
  return resolveOfferPresentation(prices);
}

export {
  GUARANTEE_DAYS,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
  resolveActiveLaunchOffer,
  resolveLandingOfferPresentation,
  shouldShowLandingOfferDialog,
};
export type { LandingOfferPresentation, LaunchOfferView, SocialLinkId };
