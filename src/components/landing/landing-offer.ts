import { formatBRL } from "@/modules/billing/components/billing-plans";
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
type LandingOfferPresentation = {
  catalogCode: "launch" | "standard";
  monthlyPriceLabel: string;
  semiannualTotalLabel: string;
  semiannualInstallmentLabel: string;
  monthlyAccessMonths: number;
  semiannualAccessMonths: number;
};
type LaunchOfferView = { endsAt: string };

function resolveLandingOfferPresentation(
  prices: ActiveBillingPrice[],
): LandingOfferPresentation | null {
  if (prices.length !== 2) return null;
  const monthly = prices.find((price) => price.billingMode === "monthly");
  const semiannual = prices.find((price) => price.billingMode === "semiannual");
  if (
    !monthly ||
    !semiannual ||
    monthly.catalogCode !== semiannual.catalogCode ||
    semiannual.installmentLimit !== 6 ||
    semiannual.amountCents % semiannual.installmentLimit !== 0
  )
    return null;

  const approvedLaunch =
    monthly.catalogCode === "launch" &&
    monthly.amountCents === 3990 &&
    monthly.accessMonths === 2 &&
    monthly.bonusMonths === 1 &&
    semiannual.amountCents === 17940 &&
    semiannual.accessMonths === 12 &&
    semiannual.bonusMonths === 6;
  const approvedStandard =
    monthly.catalogCode === "standard" &&
    monthly.amountCents === 4990 &&
    monthly.accessMonths === 1 &&
    monthly.bonusMonths === 0 &&
    semiannual.amountCents === 23940 &&
    semiannual.accessMonths === 6 &&
    semiannual.bonusMonths === 0;
  if (!approvedLaunch && !approvedStandard) return null;

  return {
    catalogCode: monthly.catalogCode,
    monthlyPriceLabel: formatBRL(monthly.amountCents),
    semiannualTotalLabel: formatBRL(semiannual.amountCents),
    semiannualInstallmentLabel: formatBRL(semiannual.amountCents / 6),
    monthlyAccessMonths: monthly.accessMonths,
    semiannualAccessMonths: semiannual.accessMonths,
  };
}

export {
  GUARANTEE_DAYS,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
  resolveLandingOfferPresentation,
};
export type { LandingOfferPresentation, LaunchOfferView, SocialLinkId };
