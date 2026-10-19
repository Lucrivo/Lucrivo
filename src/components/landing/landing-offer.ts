import { formatBRL } from "@/modules/billing/components/billing-plans";
import type { ActiveLaunchOfferPhase } from "@/modules/billing/domain/launch-offer";
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
  catalogCode: "launch" | "launch_price" | "standard";
  monthlyPriceLabel: string;
  monthlyPriceQualifier: string | null;
  monthlyRenewalPriceLabel: string | null;
  semiannualTotalLabel: string;
  semiannualInstallmentLabel: string;
  monthlyAccessMonths: number;
  monthlyBonusMonths: number;
  semiannualAccessMonths: number;
  semiannualBonusMonths: number;
};
type LaunchOfferView = {
  phase: ActiveLaunchOfferPhase;
  endsAt: string;
};

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
    monthly.installmentLimit !== null ||
    semiannual.installmentLimit !== 6 ||
    semiannual.amountCents % semiannual.installmentLimit !== 0
  ) {
    return null;
  }

  const approvedLaunch =
    monthly.catalogCode === "launch" &&
    monthly.amountCents === 3990 &&
    monthly.accessMonths === 2 &&
    monthly.bonusMonths === 1 &&
    semiannual.amountCents === 17940 &&
    semiannual.accessMonths === 12 &&
    semiannual.bonusMonths === 6;
  const approvedLaunchPrice =
    monthly.catalogCode === "launch_price" &&
    monthly.amountCents === 3990 &&
    monthly.accessMonths === 1 &&
    monthly.bonusMonths === 0 &&
    semiannual.amountCents === 17940 &&
    semiannual.accessMonths === 6 &&
    semiannual.bonusMonths === 0;
  const approvedStandard =
    monthly.catalogCode === "standard" &&
    monthly.amountCents === 4990 &&
    monthly.accessMonths === 1 &&
    monthly.bonusMonths === 0 &&
    semiannual.amountCents === 23940 &&
    semiannual.accessMonths === 6 &&
    semiannual.bonusMonths === 0;

  if (!approvedLaunch && !approvedLaunchPrice && !approvedStandard) return null;

  const promotional = approvedLaunch || approvedLaunchPrice;
  return {
    catalogCode: monthly.catalogCode,
    monthlyPriceLabel: formatBRL(monthly.amountCents),
    monthlyPriceQualifier: promotional ? "no primeiro pagamento" : null,
    monthlyRenewalPriceLabel: promotional ? "Depois, R$ 49,90/mês" : null,
    semiannualTotalLabel: formatBRL(semiannual.amountCents),
    semiannualInstallmentLabel: formatBRL(semiannual.amountCents / 6),
    monthlyAccessMonths: monthly.accessMonths,
    monthlyBonusMonths: monthly.bonusMonths,
    semiannualAccessMonths: semiannual.accessMonths,
    semiannualBonusMonths: semiannual.bonusMonths,
  };
}

export {
  GUARANTEE_DAYS,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
  resolveLandingOfferPresentation,
};
export type { LandingOfferPresentation, LaunchOfferView, SocialLinkId };
