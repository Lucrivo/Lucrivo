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
    expect(screen.getByText("1 relatório completo")).toBeInTheDocument();

    expect(screen.getByText("R$ 49,90/mês")).toBeInTheDocument();
    expect(screen.getByText("Mais vantajoso")).toBeInTheDocument();
    expect(screen.getByText("Comece sem custo")).toBeInTheDocument();
    expect(screen.getByText("Mais flexibilidade")).toBeInTheDocument();
    expect(screen.getByText("Melhor custo-benefício")).toBeInTheDocument();

    const annual = screen.getByRole("article", { name: "Plano Anual" });

    expect(within(annual).getByText("12x de")).toBeInTheDocument();
    expect(within(annual).getByText("R$ 39,90")).toBeInTheDocument();
    expect(
      within(annual).getByText("ou R$ 478,80 à vista"),
    ).toBeInTheDocument();
    expect(screen.getByText("Economize R$ 120,00 no ano.")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Segurança e transparência" }),
    ).toHaveTextContent(
      /Pagamento seguro com Asaas[\s\S]*Sem letras miúdas[\s\S]*Acesso liberado após confirmação/,
    );
    expect(container).toHaveTextContent(
      "IA para explicar e interpretar seus relatórios",
    );

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

    const annual = screen.getByRole("article", { name: "Plano Anual" });

    expect(within(annual).getByText("12x de")).toBeInTheDocument();
    expect(within(annual).getByText("R$ 49,90")).toBeInTheDocument();
    expect(
      within(annual).getByText("ou R$ 598,80 à vista"),
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
      within(monthly).getByRole("button", { name: "Assinar mensal" }),
    ).toBeInTheDocument();
    expect(
      within(monthly).getByRole("button", { name: "Pagar com Pix" }),
    ).toBeInTheDocument();
    expect(
      within(annual).getByRole("button", { name: "Assinar anual" }),
    ).toBeInTheDocument();
    expect(
      within(annual).getByRole("button", { name: "Pagar com Pix" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Opções de plano" }),
    ).toHaveAttribute("data-context", "account");
  });
});
