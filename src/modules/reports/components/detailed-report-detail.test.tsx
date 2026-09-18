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
  promotionMarginBasisPoints: 1_500,
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
  it("presents a complete Product mix, loss warning, price floors, and guidance", () => {
    render(
      <DetailedReportDetail
        id={168}
        createdAt="2026-09-17T15:00:00.000Z"
        snapshot={snapshotFor(productCommand)}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Resultado detalhado do seu mix" }),
    ).toBeVisible();
    expect(screen.getByText("Análise completa")).toBeVisible();
    expect(screen.getByText("Faturamento mensal")).toBeVisible();
    expect(screen.getByText("Faturamento de equilíbrio")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "O que cada item deixa para o negócio",
      }),
    ).toBeVisible();
    expect(screen.getByText("Perda por venda")).toBeVisible();
    expect(screen.getAllByText("Preço de equilíbrio")).toHaveLength(2);
    expect(screen.getAllByText("Piso para promoção")).toHaveLength(2);
    expect(screen.getByText("Onde agir primeiro")).toBeVisible();
    expect(screen.getByText(/não cobre os custos variáveis/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Voltar aos relatórios" }),
    ).toHaveAttribute("href", "/reports");
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

    expect(screen.getByText("Análise parcial")).toBeVisible();
    expect(
      screen.getAllByText(/volume mensal de Bolo de festa/i),
    ).not.toHaveLength(0);
    expect(screen.getAllByText("Indisponível").length).toBeGreaterThanOrEqual(
      3,
    );
    expect(
      screen.getByText(/comparação usa o valor deixado por unidade/i),
    ).toBeVisible();

    const item = screen
      .getByRole("heading", { name: "Bolo de festa" })
      .closest<HTMLElement>('[data-slot="card"]');
    expect(item).not.toBeNull();
    expect(within(item!).getByText("Volume mensal pendente")).toBeVisible();
    await user.click(within(item!).getByText("Detalhes da produção"));
    expect(within(item!).getByText(/Ficha técnica/)).toBeVisible();
    expect(within(item!).getByText(/Farinha/)).toBeVisible();
    expect(
      screen.queryByText(/inteligência artificial/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ia/i }),
    ).not.toBeInTheDocument();
  });
});
