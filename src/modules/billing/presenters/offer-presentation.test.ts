import { describe, expect, it } from "vitest";

import type { ActiveBillingPrice } from "@/modules/billing/types";

import { resolveOfferPresentation } from "./offer-presentation";

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

describe("resolveOfferPresentation", () => {
  it.each([
    ["launch", "launch_bonus", "R$ 39,90", 2, 1],
    ["launch_price", "launch_price", "R$ 39,90", 1, 0],
    ["standard", "standard", "R$ 49,90", 1, 0],
  ] as const)(
    "projects %s as %s",
    (catalogCode, moment, monthlyPriceLabel, accessMonths, bonusMonths) => {
      expect(resolveOfferPresentation(prices(catalogCode))).toMatchObject({
        catalogCode,
        moment,
        promotional: catalogCode !== "standard",
        monthlyPriceLabel,
        monthlyAccessMonths: accessMonths,
        monthlyBonusMonths: bonusMonths,
      });
    },
  );

  it("fails closed for missing, mixed, duplicate, or malformed rows", () => {
    const launch = prices("launch");

    expect(resolveOfferPresentation([])).toBeNull();
    expect(resolveOfferPresentation([launch[0]])).toBeNull();
    expect(resolveOfferPresentation([launch[0], launch[0]])).toBeNull();
    expect(
      resolveOfferPresentation([launch[0], prices("standard")[1]]),
    ).toBeNull();
    expect(
      resolveOfferPresentation([
        launch[0],
        { ...launch[1], amountCents: 17941 },
      ]),
    ).toBeNull();
  });
});
