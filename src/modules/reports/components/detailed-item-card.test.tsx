import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Accordion } from "@/components/ui/accordion";

import type { DetailedItemViewModel } from "../presenters/to-detailed-report-view-model";
import { DetailedItemCard } from "./detailed-item-card";

const item = {
  id: "11111111-1111-4111-8111-111111111111",
  category: "product",
  name: "Caneca",
  volumeLabel: "20 unidades vendidas no mês",
  statusLabel: "Cobre o mês",
  statusTone: "positive",
  headlineLabel: "Resultado por venda",
  headlineValue: "R$ 23,00",
  headlineValueTone: "positive",
  unitProfitTone: "positive",
  realMarginTone: "positive",
  unitContributionTone: "neutral",
  allocationNote:
    "Os gastos do mês foram divididos igualmente entre as 20 unidades informadas.",
  monthlyContributionContext:
    "20 vendas × R$ 28,00. Este total ainda será comparado com os gastos do mês.",
  priceLabel: "R$ 50,00",
  variableCostLabel: "R$ 22,00",
  feeLabel: "R$ 0,00",
  netRevenueLabel: "R$ 50,00",
  fixedAllocationLabel: "R$ 5,00",
  totalUnitCostLabel: "R$ 27,00",
  unitProfitLabel: "R$ 23,00",
  realMarginLabel: "46%",
  unitContributionLabel: "R$ 28,00",
  monthlyContributionLabel: "R$ 560,00",
  marginLabel: "56%",
  breakEvenLabel: "R$ 27,00",
  technicalDetails: null,
  discountSimulationBase: {
    originalPriceCents: 5_000,
    unitCostCents: 2_700,
    totalFeeBasisPoints: 0,
    minimumPriceCents: 2_700,
  },
} satisfies DetailedItemViewModel;

function renderItem(value: DetailedItemViewModel = item) {
  render(
    <Accordion multiple defaultValue={[value.id]}>
      <DetailedItemCard item={value} />
    </Accordion>,
  );
  const trigger = screen.getByRole("button", {
    name: `Abrir detalhes de ${value.name}`,
  });
  const card = trigger.closest<HTMLElement>('[data-slot="accordion-item"]');
  if (!card) throw new Error("Expected item card");
  return card;
}

describe("DetailedItemCard", () => {
  it("shows direct cost, monthly share, full cost, profit, margin and contribution separately", () => {
    const card = renderItem();

    for (const label of [
      "Preço",
      "Valor depois de impostos e cartão",
      "Quanto esta unidade custa",
      "Parte dos gastos do mês",
      "Custo completo por unidade",
      "Resultado por venda",
      "Quanto sobra a cada R$ 100",
      "Menor preço para não ficar no prejuízo",
      "Valor deixado por venda",
      "Total deixado no mês, antes dos gastos",
    ]) {
      expect(within(card).getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(
      within(card).getAllByText("R$ 27,00", { selector: "dd" }),
    ).toHaveLength(2);
    expect(within(card).getAllByText("R$ 23,00").length).toBeGreaterThan(0);
    expect(
      within(card).getByText(
        "Os gastos do mês foram divididos igualmente entre as 20 unidades informadas.",
      ),
    ).toBeVisible();
    expect(
      within(card).getByText(
        "20 vendas × R$ 28,00. Este total ainda será comparado com os gastos do mês.",
      ),
    ).toBeVisible();
    expect(within(card).getByText("46%")).toBeVisible();
    expect(within(card).getByTestId("discount-simulator")).toBeVisible();
  });

  it("explains a sale that leaves money without covering the month", () => {
    const card = renderItem({
      ...item,
      statusLabel: "Não cobre o mês",
      statusTone: "warning",
      headlineLabel: "Resultado por venda",
      headlineValue: "-R$ 291,34",
      headlineValueTone: "critical",
      unitProfitTone: "critical",
      realMarginTone: "critical",
      coverageNote:
        "Cada venda deixa R$ 42,00. A parte dos gastos do mês desta unidade é R$ 333,34, então o resultado é -R$ 291,34.",
    });

    expect(within(card).getByText("Não cobre o mês")).toBeVisible();
    expect(within(card).getByText("-R$ 291,34")).toHaveClass(
      "text-destructive",
    );
    expect(
      within(card).getByText("Menor preço para não ficar no prejuízo")
        .parentElement,
    ).toHaveClass("content-start", "self-start");
    expect(within(card).getByText(/Cada venda deixa R\$ 42,00/)).toBeVisible();
  });

  it("shows the item break-even reference when volume is unknown", () => {
    const card = renderItem({
      ...item,
      volumeLabel:
        "Sem quantidade informada · equilíbrio com 4 unidades no mês",
      breakEvenReferenceLabel:
        "Para não ter prejuízo vendendo só este item: 4 unidades por mês.",
      unitProfitLabel: "R$ 0,00 no equilíbrio",
      realMarginLabel: "0% no equilíbrio",
    });

    expect(
      within(card).getByText(
        "Para não ter prejuízo vendendo só este item: 4 unidades por mês.",
      ),
    ).toBeVisible();
    expect(within(card).getByText("R$ 0,00 no equilíbrio")).toBeVisible();
  });

  it("explains incomplete full-cost rows without showing a direct-cost floor", () => {
    const reason = "Informe uma quantidade para dividir os gastos do mês.";
    const card = renderItem({
      ...item,
      fixedAllocationLabel: "Ainda não calculado",
      totalUnitCostLabel: "Ainda não calculado",
      unitProfitLabel: "Ainda não calculado",
      realMarginLabel: "Ainda não calculado",
      breakEvenLabel: "Ainda não calculado",
      completeCostUnavailableReason: reason,
      breakEvenUnavailableReason: reason,
      discountSimulationBase: {
        ...item.discountSimulationBase,
        unitCostCents: null,
        minimumPriceCents: null,
      },
    });

    expect(within(card).getAllByText("Ainda não calculado")).toHaveLength(5);
    expect(within(card).getAllByText(reason).length).toBeGreaterThan(0);
    expect(
      within(card).getByRole("slider", { name: "Desconto simulado" }),
    ).toBeDisabled();
    expect(
      within(card).queryByText("R$ 22,00", { selector: "dd" }),
    ).toBeVisible();
    expect(
      within(card).queryByText("R$ 22,00", { selector: "dd + *" }),
    ).toBeNull();
  });
});
