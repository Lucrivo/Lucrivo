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

const multiItemProductCommand: DetailedDiagnosisCommand = {
  ...productCommand,
  submissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  items: [
    ...productCommand.items,
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      name: "Garrafa",
      kind: "resale",
      unitSalePriceCents: 7_000,
      monthlySalesVolume: 10,
      purchaseUnitCostCents: 3_000,
      packagingUnitCostCents: 300,
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
  it("links a multi-item summary to the item-by-item details", () => {
    render(
      <DetailedReportDetail
        id={167}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(multiItemProductCommand)}
      />,
    );

    const link = screen.getByRole("link", {
      name: "Ver mais detalhes item por item",
    });
    expect(link).toHaveAttribute("href", "#item-details");
    expect(link.closest('[data-testid="report-indicator"]')).toHaveAttribute(
      "data-indicator-key",
      "sales",
    );
    expect(document.querySelector("#item-details")).toHaveAccessibleName(
      "Item por item",
    );
  });

  it("shows complete item values and monthly-result comparison", () => {
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
    const trigger = screen.getByRole("button", {
      name: "Abrir detalhes de Caneca",
    });
    const item = trigger.closest<HTMLElement>('[data-slot="accordion-item"]');
    expect(item).not.toBeNull();
    expect(within(item!).getByText("Parte dos gastos do mês")).toBeVisible();
    expect(within(item!).getByText("Custo completo por unidade")).toBeVisible();
    expect(within(item!).getByText("Resultado por venda")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Como cada item participa do resultado?",
      }),
    ).toBeVisible();
    expect(screen.getByText("Resultado estimado do item")).toBeVisible();
    expect(
      screen.getByText(/Resultado estimado de cada item no mês/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Ver mais detalhes item por item" }),
    ).not.toBeInTheDocument();
  });

  it("shows a single-item goal and the item break-even reference", async () => {
    const user = userEvent.setup();
    render(
      <DetailedReportDetail
        id={169}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(productionCommand)}
      />,
    );

    const featured = document.querySelector<HTMLElement>(
      '[data-featured="true"]',
    );
    expect(featured).not.toBeNull();
    expect(within(featured!).getByText(/unidades$/)).toBeVisible();
    expect(screen.getByText("Entenda o resultado")).toBeVisible();

    const trigger = screen.getByRole("button", {
      name: "Abrir detalhes de Bolo de festa",
    });
    const item = trigger.closest<HTMLElement>('[data-slot="accordion-item"]');
    expect(item).not.toBeNull();
    expect(
      within(item!).getByText(/Para não ter prejuízo vendendo só este item/),
    ).toBeVisible();
    expect(
      within(item!).getByRole("slider", { name: "Desconto simulado" }),
    ).toBeEnabled();
    await user.click(
      within(item!).getByText("Ver memória de cálculo da produção"),
    );
    expect(within(item!).getByText("Ficha técnica completa")).toBeVisible();
    expect(within(item!).getByText(/Farinha/)).toBeVisible();
  });

  it("labels direct contribution without calling it profit when volume is absent", () => {
    render(
      <DetailedReportDetail
        id={170}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(productionCommand)}
      />,
    );

    const comparison = screen.getByRole("region", {
      name: "Como cada item participa do resultado?",
    });
    expect(comparison).toHaveTextContent("Valor deixado por venda");
    expect(comparison).toHaveTextContent("Ajuda a pagar os gastos do mês");
    expect(comparison).not.toHaveTextContent(/lucro por unidade/i);
  });

  it("shows structured minimum prices without restoring the repeated sales section", () => {
    render(
      <DetailedReportDetail
        id={168}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(productCommand)}
      />,
    );

    const currentSections = screen
      .queryAllByTestId("report-section")
      .filter(
        (section) =>
          within(section).queryByTestId("discount-simulator") === null,
      );
    expect(currentSections).toHaveLength(1);
    expect(
      within(currentSections[0]!).getByRole("heading", {
        name: "Menores preços para não ficar no prejuízo",
      }),
    ).toBeVisible();
    expect(within(currentSections[0]!).getByText("Caneca")).toBeVisible();
    expect(within(currentSections[0]!).getByText("R$ 32,00")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Quanto você precisa vender" }),
    ).not.toBeInTheDocument();
  });

  it("preserves legacy narrative once outside the indicators", () => {
    const snapshot = snapshotFor(productCommand);
    render(
      <DetailedReportDetail
        id={168}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={{ ...snapshot, contentVersion: 2 }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Detalhes preservados deste relatório",
      }),
    ).toBeVisible();
    const persistedSections = screen
      .getAllByTestId("report-section")
      .filter(
        (section) =>
          within(section).queryByTestId("discount-simulator") === null,
      );
    expect(persistedSections).toHaveLength(3);
  });
});
