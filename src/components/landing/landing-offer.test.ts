import { describe, expect, it } from "vitest";

import type { ActiveBillingPrice } from "@/modules/billing/types";

import { resolveLandingOfferPresentation } from "./landing-offer";

function prices(
  catalogCode: "launch" | "launch_price" | "standard",
): ActiveBillingPrice[] {
  const promotional = catalogCode !== "standard";
  const bonus = catalogCode === "launch";
  return [
    {
      id: "10000000-0000-4000-8000-000000000001",
      productCode: "quick_diagnosis_pro",
      catalogCode,
      billingMode: "monthly",
      amountCents: promotional ? 3990 : 4990,
      currency: "BRL",
      installmentLimit: null,
      accessMonths: bonus ? 2 : 1,
      bonusMonths: bonus ? 1 : 0,
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      productCode: "quick_diagnosis_pro",
      catalogCode,
      billingMode: "semiannual",
      amountCents: promotional ? 17940 : 23940,
      currency: "BRL",
      installmentLimit: 6,
      accessMonths: bonus ? 12 : 6,
      bonusMonths: bonus ? 6 : 0,
    },
  ];
}

describe("resolveLandingOfferPresentation", () => {
  it("projects bonus launch terms and first-payment renewal copy", () => {
    expect(resolveLandingOfferPresentation(prices("launch"))).toMatchObject({
      catalogCode: "launch",
      monthlyPriceLabel: "R$ 39,90",
      monthlyPriceQualifier: "no primeiro pagamento",
      monthlyRenewalPriceLabel: "Depois, R$ 49,90/mês",
      monthlyAccessMonths: 2,
      monthlyBonusMonths: 1,
      semiannualAccessMonths: 12,
      semiannualBonusMonths: 6,
    });
  });

  it("projects price-only launch terms without bonus access", () => {
    expect(
      resolveLandingOfferPresentation(prices("launch_price")),
    ).toMatchObject({
      catalogCode: "launch_price",
      monthlyPriceLabel: "R$ 39,90",
      monthlyPriceQualifier: "no primeiro pagamento",
      monthlyRenewalPriceLabel: "Depois, R$ 49,90/mês",
      monthlyAccessMonths: 1,
      monthlyBonusMonths: 0,
      semiannualAccessMonths: 6,
      semiannualBonusMonths: 0,
    });
  });

  it("keeps standard renewal qualifiers empty", () => {
    expect(resolveLandingOfferPresentation(prices("standard"))).toMatchObject({
      catalogCode: "standard",
      monthlyPriceLabel: "R$ 49,90",
      monthlyPriceQualifier: null,
      monthlyRenewalPriceLabel: null,
    });
  });

  it("fails closed for missing, mixed, duplicate, or malformed rows", () => {
    const launch = prices("launch");
    expect(resolveLandingOfferPresentation([])).toBeNull();
    expect(resolveLandingOfferPresentation([launch[0]])).toBeNull();
    expect(resolveLandingOfferPresentation([launch[0], launch[0]])).toBeNull();
    expect(
      resolveLandingOfferPresentation([launch[0], prices("standard")[1]]),
    ).toBeNull();
    expect(
      resolveLandingOfferPresentation([
        launch[0],
        { ...launch[1], amountCents: 17941 },
      ]),
    ).toBeNull();
  });
});
