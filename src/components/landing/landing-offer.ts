import { formatBRL } from "@/modules/billing/components/billing-plans";
import type { ActiveBillingPrice } from "@/modules/billing/types";

const SUPPORT_EMAIL = "atendimento@lucrivo.com.br";
const GUARANTEE_DAYS = 7;

// Used only when the live catalog is unavailable, so the offer copy never
// renders without a price.
const FALLBACK_MONTHLY_PRICE_LABEL = "R$ 39,90";

// Placeholder destinations until the final profile URLs are provided.
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

function resolveMonthlyPriceLabel(prices: ActiveBillingPrice[]): string {
  const monthly = prices.find((price) => price.billingMode === "monthly");

  return monthly
    ? formatBRL(monthly.amountCents)
    : FALLBACK_MONTHLY_PRICE_LABEL;
}

export {
  FALLBACK_MONTHLY_PRICE_LABEL,
  GUARANTEE_DAYS,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
  resolveMonthlyPriceLabel,
};
export type { SocialLinkId };
