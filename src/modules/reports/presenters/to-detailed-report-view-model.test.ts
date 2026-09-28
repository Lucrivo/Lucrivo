import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { toDetailedReportViewModel } from "./to-detailed-report-view-model";

const baseCommand: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 10_000,
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

function present(command: DetailedDiagnosisCommand = baseCommand) {
  const calculation = calculateDetailedDiagnosis(command);
  return toDetailedReportViewModel({
    id: 168,
    createdAt: "2026-09-17T15:00:00.000Z",
    snapshot: buildDetailedReportSnapshot(command, calculation),
  });
}

describe("toDetailedReportViewModel", () => {
  it("shows full unit economics separately from the value left for the month", () => {
    const model = present();

    expect(model.executiveSummary.verdict.toneLabel).toBe("Resultado positivo");
    expect(model.items[0]).toMatchObject({
      priceLabel: "R$ 50,00",
      netRevenueLabel: "R$ 50,00",
      variableCostLabel: "R$ 22,00",
      fixedAllocationLabel: "R$ 5,00",
      totalUnitCostLabel: "R$ 27,00",
      unitProfitLabel: "R$ 23,00",
      realMarginLabel: "46%",
      unitContributionLabel: "R$ 28,00",
      monthlyContributionLabel: "R$ 560,00",
      breakEvenLabel: "R$ 27,00",
      discountSimulationBase: {
        originalPriceCents: 5_000,
        unitCostCents: 2_700,
        totalFeeBasisPoints: 0,
        minimumPriceCents: 2_700,
      },
    });
    expect(model.comparison[0]).toMatchObject({
      amountCents: 46_000,
      amountLabel: "R$ 460,00",
      contextLabel: "no mês",
      statusLabel: "Resultado estimado do item",
    });
  });

  it("does not invent complete values when the item volume is unknown", () => {
    const model = present({
      ...baseCommand,
      items: [{ ...baseCommand.items[0]!, monthlySalesVolume: null }],
    });

    expect(model.items[0]).toMatchObject({
      fixedAllocationLabel: "Ainda não calculado",
      totalUnitCostLabel: "Ainda não calculado",
      unitProfitLabel: "Ainda não calculado",
      realMarginLabel: "Ainda não calculado",
      breakEvenLabel: "Ainda não calculado",
      completeCostUnavailableReason:
        "Informe uma quantidade para dividir os gastos do mês.",
      breakEvenUnavailableReason:
        "Informe uma quantidade para dividir os gastos do mês.",
      discountSimulationBase: {
        unitCostCents: null,
        minimumPriceCents: null,
      },
    });
    expect([
      model.items[0]?.fixedAllocationLabel,
      model.items[0]?.totalUnitCostLabel,
      model.items[0]?.unitProfitLabel,
      model.items[0]?.realMarginLabel,
      model.items[0]?.breakEvenLabel,
    ]).not.toContain("R$ 0,00");
    expect(model.comparison[0]).toMatchObject({
      amountCents: 2_800,
      contextLabel: "por unidade",
      statusLabel: "Ajuda a pagar os gastos do mês",
    });
  });

  it("shows a single-item unknown-volume goal without weekly or daily text", () => {
    const model = present({
      ...baseCommand,
      items: [{ ...baseCommand.items[0]!, monthlySalesVolume: null }],
    });

    expect(model.numbers[0]).toEqual({
      key: "sales",
      label: "Unidades necessárias no mês",
      value: "4 unidades",
    });
  });

  it("keeps the combined goal unavailable without an observed item mix", () => {
    const model = present({
      ...baseCommand,
      items: [
        { ...baseCommand.items[0]!, monthlySalesVolume: null },
        {
          ...baseCommand.items[0]!,
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Copo",
          monthlySalesVolume: 10,
        },
      ],
    });

    expect(model.numbers[0]).toEqual({
      key: "sales",
      label: "Unidades necessárias no mês",
      value: "Indisponível",
      supportingText:
        "Para calcular uma quantidade única, informe as vendas mensais de todos os itens.",
    });
  });

  it("uses help descriptions that explain the value in everyday language", () => {
    const model = present();
    const descriptions = model.numbers
      .flatMap(({ help }) => (help ? [help.description] : []))
      .join(" ");

    expect(descriptions).not.toMatch(/rateio|contribuição/i);
    expect(descriptions).toMatch(/pagar os gastos|quanto fica/i);
  });
});
