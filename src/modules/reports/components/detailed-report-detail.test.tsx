import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { DetailedReportDetail } from "./detailed-report-detail";

const productCommand: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 20_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 0,
  cardFeeRateBasisPoints: 0,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 20,
      purchaseUnitCostCents: 2_000,
      packagingUnitCostCents: 200,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      name: "Camiseta em perda",
      kind: "resale",
      unitSalePriceCents: 3_000,
      monthlySalesVolume: 5,
      purchaseUnitCostCents: 3_500,
      packagingUnitCostCents: 100,
    },
  ],
};

const productionCommand: DetailedDiagnosisCommand = {
  ...productCommand,
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  category: "production",
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      position: 0,
      name: "Bolo de festa",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 15_000,
      monthlySalesVolume: null,
      recipeYield: 10,
      lossRateBasisPoints: 1_000,
      packagingUnitCostCents: 100,
      directLaborUnitCostCents: 500,
      otherVariableUnitCostCents: 250,
      ingredients: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          position: 0,
          name: "Farinha",
          quantityMillionths: 500_000,
          unit: "kg",
          unitCostTenThousandths: 50_000,
        },
      ],
    },
  ],
};

function snapshotFor(command: DetailedDiagnosisCommand) {
  return buildDetailedReportSnapshot(
    command,
    calculateDetailedDiagnosis(command),
  );
}

describe("DetailedReportDetail", () => {
  it("presents quick insights before item details and opens the first item", async () => {
    const user = userEvent.setup();
    render(
      <DetailedReportDetail
        id={168}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(productCommand)}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Resultado dos seus produtos" }),
    ).toBeVisible();
    expect(screen.getByText("Produtos")).toBeVisible();
    expect(screen.getByText("Revenda")).toBeVisible();
    expect(screen.queryByText("Diagnóstico detalhado")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Seus produtos dão lucro?" }),
    ).toBeVisible();
    expect(screen.getByText("Estou ganhando dinheiro?")).toBeVisible();
    expect(screen.getByText("Meus preços pagam os gastos?")).toBeVisible();
    expect(screen.getByText("O que preciso fazer agora?")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Seus números" })).toBeVisible();
    const itemsHeading = screen.getByRole("heading", {
      name: "Item por item",
    });
    const comparisonHeading = screen.getByRole("heading", {
      name: "Quais itens ajudam ou prejudicam o resultado?",
    });
    expect(
      screen.getByRole("heading", {
        name: "Seus menores preços sem prejuízo",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "O que sai das vendas" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Quanto sobra no mês" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Quanto você precisa vender" }),
    ).toBeVisible();
    expect(screen.getByText("Quanto entrou com as vendas")).toBeVisible();
    expect(screen.getByText("Custos do mês")).toBeVisible();
    expect(itemsHeading.compareDocumentPosition(comparisonHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByText(/^Indisponível$/)).not.toBeInTheDocument();

    const firstTrigger = screen.getByRole("button", {
      name: "Abrir detalhes de Caneca",
    });
    const lossTrigger = screen.getByRole("button", {
      name: "Abrir detalhes de Camiseta em perda",
    });
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(lossTrigger).toHaveAttribute("aria-expanded", "false");
    const firstItem = firstTrigger.closest<HTMLElement>(
      '[data-slot="accordion-item"]',
    );
    expect(firstItem).not.toBeNull();
    expect(within(firstItem!).getByTestId("discount-simulator")).toBeVisible();
    expect(firstItem).toHaveTextContent(
      "Os gastos mensais permanecem no resultado geral.",
    );
    await user.click(lossTrigger);
    expect(
      screen.getAllByText("Menor preço sem prejuízo na venda"),
    ).not.toHaveLength(0);
    expect(screen.getByText(/não cobre o custo do item/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Voltar aos relatórios" }),
    ).toHaveAttribute("href", "/reports");
    expect(screen.queryByText(/\bmix\b/i)).not.toBeInTheDocument();
  });

  it("presents a partial Production mix neutrally with technical-sheet details", async () => {
    const user = userEvent.setup();
    render(
      <DetailedReportDetail
        id={169}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(productionCommand)}
      />,
    );

    expect(screen.getByText("Falta informar as vendas")).toBeVisible();
    expect(
      screen.getAllByText(/volume mensal de Bolo de festa/i),
    ).not.toHaveLength(0);
    expect(screen.queryByText(/^Indisponível$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Ainda não calculado")).not.toHaveLength(0);
    expect(screen.getByText(/Sobra por unidade/i)).toBeVisible();

    const trigger = screen.getByRole("button", {
      name: "Abrir detalhes de Bolo de festa",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const item = trigger.closest<HTMLElement>('[data-slot="accordion-item"]');
    expect(item).not.toBeNull();
    expect(
      within(item!).getByText("Vendas mensais ainda não informadas"),
    ).toBeVisible();
    expect(
      within(item!).getAllByText("Entenda este valor").length,
    ).toBeGreaterThan(0);
    await user.click(
      within(item!).getByText("Ver memória de cálculo da produção"),
    );
    expect(within(item!).getByText("Ficha técnica completa")).toBeVisible();
    expect(within(item!).getByText(/Farinha/)).toBeVisible();
    expect(
      screen.queryByText(/inteligência artificial/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ia/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\bmix\b/i)).not.toBeInTheDocument();
  });
});
