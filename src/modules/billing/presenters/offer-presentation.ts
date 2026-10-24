import type { ActiveBillingPrice } from "@/modules/billing/types";

type OfferMoment = "launch_bonus" | "launch_price" | "standard";

type OfferPresentation = {
  moment: OfferMoment;
  catalogCode: "launch" | "launch_price" | "standard";
  promotional: boolean;
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatBRL(cents: number): string {
  return currencyFormatter.format(cents / 100).replace(/\u00a0/g, " ");
}

function resolveOfferPresentation(
  prices: ActiveBillingPrice[],
): OfferPresentation | null {
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
  const moment: OfferMoment = approvedLaunch
    ? "launch_bonus"
    : approvedLaunchPrice
      ? "launch_price"
      : "standard";

  return {
    moment,
    catalogCode: monthly.catalogCode,
    promotional,
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

export { formatBRL, resolveOfferPresentation };
export type { OfferMoment, OfferPresentation };
