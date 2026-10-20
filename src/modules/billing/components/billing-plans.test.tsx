import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ActiveBillingPrice } from "../types";
import { BillingPlans } from "./billing-plans";

const launchPrices: ActiveBillingPrice[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productCode: "quick_diagnosis_pro",
    catalogCode: "launch",
    billingMode: "monthly",
    amountCents: 3990,
    currency: "BRL",
    installmentLimit: null,
    accessMonths: 2,
    bonusMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro",
    catalogCode: "launch",
    billingMode: "semiannual",
    amountCents: 17940,
    currency: "BRL",
    installmentLimit: 6,
    accessMonths: 12,
    bonusMonths: 6,
  },
];

const standardPrices: ActiveBillingPrice[] = [
  {
    ...launchPrices[0],
    id: "33333333-3333-4333-8333-333333333333",
    catalogCode: "standard",
    amountCents: 4990,
    accessMonths: 1,
    bonusMonths: 0,
  },
  {
    ...launchPrices[1],
    id: "44444444-4444-4444-8444-444444444444",
    catalogCode: "standard",
    amountCents: 23940,
    accessMonths: 6,
    bonusMonths: 0,
  },
];

const launchPricePrices: ActiveBillingPrice[] = [
  {
    ...launchPrices[0],
    id: "55555555-5555-4555-8555-555555555555",
    catalogCode: "launch_price",
    accessMonths: 1,
    bonusMonths: 0,
  },
  {
    ...launchPrices[1],
    id: "66666666-6666-4666-8666-666666666666",
    catalogCode: "launch_price",
    accessMonths: 6,
    bonusMonths: 0,
  },
];

describe("BillingPlans", () => {
  it("presents the complete launch condition without implying a chosen installment count", () => {
    render(<BillingPlans prices={launchPrices} context="public" />);

    expect(screen.getByText("Oferta de lançamento")).toBeInTheDocument();
    const monthly = screen.getByRole("article", { name: "Plano Mensal" });
    const semiannual = screen.getByRole("article", {
      name: "Plano Semestral",
    });

    expect(within(monthly).getByText("R$ 39,90")).toBeInTheDocument();
    expect(within(monthly).getByText("no primeiro pagamento")).toBeVisible();
    expect(
      within(monthly).getByText("2 meses no primeiro pagamento"),
    ).toBeInTheDocument();
    expect(within(monthly).getByText(/1 mês de bônus/)).toBeInTheDocument();
    expect(within(semiannual).getByText("R$ 29,90")).toBeVisible();
    expect(within(semiannual).getByText(/ou R\$ 179,40 à vista/)).toBeVisible();
    expect(semiannual).toHaveTextContent(
      "em até 6x de R$ 29,90 ou R$ 179,40 à vista",
    );
    expect(within(semiannual).getByText("12 meses de acesso")).toBeVisible();
    expect(within(semiannual).getByText(/6 meses de bônus/)).toBeVisible();
    expect(screen.getByText("Depois, R$ 49,90/mês")).toBeVisible();
    expect(screen.getByText(/Depois da oferta.*R\$ 239,40/)).toBeVisible();
    expect(screen.queryByText(/^6x de$/)).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/condição fica reservada por 1 hora/i),
    ).toHaveLength(2);
    expect(screen.getByText("Garantia de 7 dias")).toBeVisible();
    expect(screen.getByText("Devolvemos todo o valor")).toBeVisible();
  });

  it("presents launch_price without bonus claims", () => {
    const { container } = render(
      <BillingPlans prices={launchPricePrices} context="public" />,
    );

    const monthly = screen.getByRole("article", { name: "Plano Mensal" });
    const semiannual = screen.getByRole("article", {
      name: "Plano Semestral",
    });
    expect(within(monthly).getByText("R$ 39,90")).toBeVisible();
    expect(within(monthly).getByText("no primeiro pagamento")).toBeVisible();
    expect(within(monthly).getByText("Depois, R$ 49,90/mês")).toBeVisible();
    expect(within(monthly).getByText("1 mês de acesso inicial")).toBeVisible();
    expect(within(semiannual).getByText("6 meses de acesso")).toBeVisible();
    expect(container).not.toHaveTextContent(/m[eê]s(?:es)? de bônus/i);
    expect(
      screen.getAllByText(/condição fica reservada por 1 hora/i),
    ).toHaveLength(2);
  });

  it("presents the standard catalog without launch or bonus language", () => {
    const { container } = render(
      <BillingPlans prices={standardPrices} context="public" />,
    );

    expect(screen.queryByText("Oferta de lançamento")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("bônus");
    expect(container).not.toHaveTextContent("R$ 39,90/mês");
    expect(
      screen.getByRole("article", { name: "Plano Mensal" }),
    ).toHaveTextContent("R$ 49,90/mês");
    expect(
      screen.getByRole("article", { name: "Plano Semestral" }),
    ).toHaveTextContent("em até 6x de R$ 39,90 ou R$ 239,40 à vista");
    expect(screen.getByText("6 meses de acesso")).toBeVisible();
    expect(screen.getByText("Garantia de 7 dias")).toBeVisible();
  });

  it("keeps free available when paid catalog data is unavailable", () => {
    render(<BillingPlans context="public" prices={[]} />);

    expect(screen.getByRole("heading", { name: "Grátis" })).toBeInTheDocument();
    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeInTheDocument();
  });

  it("offers both payment methods for each paid account plan", () => {
    render(<BillingPlans context="account" prices={launchPrices} />);

    for (const name of ["Plano Mensal", "Plano Semestral"]) {
      const plan = screen.getByRole("article", { name });
      expect(
        within(plan).getByRole("button", { name: /Assinar/ }),
      ).toBeVisible();
      expect(
        within(plan).getByRole("button", { name: "Pagar com Pix" }),
      ).toBeVisible();
    }
  });

  it("fails closed for mixed catalogs or inexact installments", () => {
    const { rerender } = render(
      <BillingPlans
        context="public"
        prices={[launchPrices[0], standardPrices[1]]}
      />,
    );
    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeVisible();

    rerender(
      <BillingPlans
        context="public"
        prices={[launchPrices[0], { ...launchPrices[1], amountCents: 17941 }]}
      />,
    );
    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeVisible();
  });
});
