import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ActiveBillingPrice } from "../types";
import { BillingPlans } from "./billing-plans";

const prices: ActiveBillingPrice[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    productCode: "quick_diagnosis_pro",
    billingMode: "monthly",
    amountCents: 3990,
    currency: "BRL",
    installmentLimit: null,
    accessMonths: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    productCode: "quick_diagnosis_pro",
    billingMode: "semiannual",
    amountCents: 17940,
    currency: "BRL",
    installmentLimit: 6,
    accessMonths: 6,
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

    expect(screen.getByText("R$ 39,90/mês")).toBeInTheDocument();
    expect(screen.getByText("Mais vantajoso")).toBeInTheDocument();
    expect(screen.getByText("Comece sem custo")).toBeInTheDocument();
    expect(screen.getByText("Mais flexibilidade")).toBeInTheDocument();
    expect(screen.getByText("Melhor custo-benefício")).toBeInTheDocument();

    const semiannual = screen.getByRole("article", {
      name: "Plano Semestral",
    });

    expect(within(semiannual).getByText("6x de")).toBeInTheDocument();
    expect(within(semiannual).getByText("R$ 29,90")).toBeInTheDocument();
    expect(
      within(semiannual).getByText("ou R$ 179,40 à vista"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Economize R$ 60,00 em seis meses"),
    ).toBeInTheDocument();
    expect(
      within(semiannual).getByText("6 meses de acesso"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Segurança e transparência" }),
    ).toHaveTextContent(
      /Pagamento seguro com Asaas[\s\S]*Sem letras miúdas[\s\S]*Acesso liberado após confirmação/,
    );
    expect(container).toHaveTextContent(
      "IA para explicar e interpretar seus relatórios",
    );
    expect(
      screen.getAllByText("Vários produtos no mesmo diagnóstico detalhado"),
    ).toHaveLength(2);
    expect(
      screen.queryByText(
        "Cadastro de múltiplos produtos e controle de estoque",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Começar grátis" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Escolher semestral" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Escolher mensal" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Pagar com Pix")).not.toBeInTheDocument();
    expect(screen.queryByText("Assinar semestral")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Crie a conta primeiro. Cartão ou Pix na hora de assinar.",
      ),
    ).toHaveLength(2);

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
          { ...prices[1], amountCents: 29940 },
        ]}
      />,
    );

    expect(screen.getByText("R$ 59,90/mês")).toBeInTheDocument();

    const semiannual = screen.getByRole("article", {
      name: "Plano Semestral",
    });

    expect(within(semiannual).getByText("6x de")).toBeInTheDocument();
    expect(within(semiannual).getByText("R$ 49,90")).toBeInTheDocument();
    expect(
      within(semiannual).getByText("ou R$ 299,40 à vista"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Economize R$ 60,00 em seis meses"),
    ).toBeInTheDocument();
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
    const semiannual = screen.getByRole("article", {
      name: "Plano Semestral",
    });

    expect(
      within(monthly).getByRole("button", { name: "Assinar mensal" }),
    ).toBeInTheDocument();
    expect(
      within(monthly).getByRole("button", { name: "Pagar com Pix" }),
    ).toBeInTheDocument();
    expect(
      within(semiannual).getByRole("button", {
        name: "Assinar semestral",
      }),
    ).toBeInTheDocument();
    expect(
      within(semiannual).getByRole("button", { name: "Pagar com Pix" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Opções de plano" }),
    ).toHaveAttribute("data-context", "account");
  });

  it("fails closed when the installment value is not exact", () => {
    render(
      <BillingPlans
        context="public"
        prices={[prices[0], { ...prices[1], amountCents: 17941 }]}
      />,
    );

    expect(
      screen.getByText("Planos pagos temporariamente indisponíveis"),
    ).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "Plano Semestral" }),
    ).toBeNull();
  });
});
