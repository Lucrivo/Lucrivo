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
  statusLabel: "Deixa valor por venda",
  statusTone: "positive",
  priceLabel: "R$ 50,00",
  variableCostLabel: "R$ 22,00",
  feeLabel: "R$ 0,00",
  netRevenueLabel: "R$ 50,00",
  unitContributionLabel: "R$ 28,00",
  monthlyContributionLabel: "R$ 560,00",
  marginLabel: "56%",
  breakEvenLabel: "R$ 22,00",
  technicalDetails: null,
  discountSimulationBase: {
    originalPriceCents: 5_000,
    unitCostCents: 2_200,
    totalFeeBasisPoints: 0,
    attentionBandBasisPoints: 2_000,
    minimumPriceCents: 2_200,
    partial: true,
  },
} satisfies DetailedItemViewModel;

describe("DetailedItemCard", () => {
  it("groups the item values and keeps the detailed simulator in the open panel", () => {
    render(
      <Accordion multiple defaultValue={[item.id]}>
        <DetailedItemCard item={item} />
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {
      name: "Abrir detalhes de Caneca",
    });
    const card = trigger.closest<HTMLElement>('[data-slot="accordion-item"]');
    expect(card).not.toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      within(card!).getAllByText("Quanto este item deixa no mês"),
    ).toHaveLength(2);
    expect(within(card!).getByText("Venda")).toBeVisible();
    expect(within(card!).getByText("Gastos desta venda")).toBeVisible();
    expect(
      within(card!).getByText("Menor preço sem prejuízo na venda"),
    ).toBeVisible();
    expect(within(card!).getByTestId("discount-simulator")).toBeVisible();
  });
});
