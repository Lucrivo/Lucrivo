import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ActiveBillingPrice } from "../types";
import { BillingPlans } from "./billing-plans";

const prices: ActiveBillingPrice[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productCode: "quick_diagnosis_pro",
    billingMode: "monthly",
    amountCents: 4990,
    currency: "BRL",
    installmentLimit: null,
    accessMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro",
    billingMode: "annual",
    amountCents: 47880,
    currency: "BRL",
    installmentLimit: 12,
    accessMonths: 12,
  },
];

describe("BillingPlans", () => {
  it("derives every public offer and payment explanation from the catalog", () => {
    const { container } = render(
      <BillingPlans prices={prices} context="public" />,
    );

    expect(screen.getByRole("heading", { name: "Grátis" })).toBeInTheDocument();
    expect(screen.getByText("1 diagnóstico rápido")).toBeInTheDocument();
    expect(
      screen.getByText("1 relatório disponível para consulta"),
    ).toBeInTheDocument();

    expect(screen.getByText("R$ 49,90/mês")).toBeInTheDocument();
    expect(screen.getByText("Mais popular")).toBeInTheDocument();
    expect(screen.getByText("Comece sem custo")).toBeInTheDocument();
    expect(screen.getByText("Flexibilidade para crescer")).toBeInTheDocument();
    expect(screen.getByText("Mais economia no ano")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Renovação automática no cartão. Cancele quando quiser.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No Pix, você recebe 1 mês de acesso sem renovação automática.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "R$ 478,80 no Pix à vista ou em até 12x sem juros no cartão — 12x de R$ 39,90. Sem renovação automática.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Economize R$ 120,00 no ano.")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Segurança e transparência" }),
    ).toHaveTextContent(
      /Checkout protegido pelo Asaas[\s\S]*Cobrança explicada antes de pagar[\s\S]*Acesso liberado após confirmação/,
    );
    expect(container).not.toHaveTextContent(/interpretad[oa] por IA/i);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", "/register");
    }
  });

  it("updates all displayed amounts when catalog versions change", () => {
    render(
      <BillingPlans
        context="public"
        prices={[
          { ...prices[0], amountCents: 5990 },
          { ...prices[1], amountCents: 59880 },
        ]}
      />,
    );

    expect(screen.getByText("R$ 59,90/mês")).toBeInTheDocument();
    expect(
      screen.getByText(
        "R$ 598,80 no Pix à vista ou em até 12x sem juros no cartão — 12x de R$ 49,90. Sem renovação automática.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Economize R$ 120,00 no ano.")).toBeInTheDocument();
    expect(screen.queryByText("R$ 49,90/mês")).not.toBeInTheDocument();
  });

  it("keeps free available when paid catalog data is unavailable", () => {
    render(<BillingPlans context="public" prices={[]} />);

    expect(screen.getByRole("heading", { name: "Grátis" })).toBeInTheDocument();
    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Mensal" }),
    ).not.toBeInTheDocument();
  });

  it("offers both payment methods for each paid account plan", () => {
    render(<BillingPlans context="account" prices={prices} />);

    const monthly = screen.getByRole("article", { name: "Plano Mensal" });
    const annual = screen.getByRole("article", { name: "Plano Anual" });

    expect(
      within(monthly).getByRole("button", { name: "Assinar no cartão" }),
    ).toBeInTheDocument();
    expect(
      within(monthly).getByRole("button", { name: "Pagar com Pix" }),
    ).toBeInTheDocument();
    expect(
      within(annual).getByRole("button", { name: "Pagar no cartão" }),
    ).toBeInTheDocument();
    expect(
      within(annual).getByRole("button", { name: "Pagar com Pix" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Opções de plano" }),
    ).toHaveAttribute("data-context", "account");
  });
});
