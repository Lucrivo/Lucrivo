import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import { buildDetailedReportContent } from "./build-detailed-report-content";

const command: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 1_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 300,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 10,
      purchaseUnitCostCents: 2_000,
      packagingUnitCostCents: 200,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      name: "Caderno",
      kind: "resale",
      unitSalePriceCents: 3_000,
      monthlySalesVolume: 5,
      purchaseUnitCostCents: 1_000,
      packagingUnitCostCents: 100,
    },
  ],
};

describe("buildDetailedReportContent", () => {
  it("builds the quick hierarchy for a complete multi-item report", () => {
    const calculation = calculateDetailedDiagnosis(command);
    const content = buildDetailedReportContent(command, calculation);

    expect(content.executiveSummary).toMatchObject({
      headline: "Seus produtos dão lucro?",
      answers: [
        { key: "profitability", question: "Estou ganhando dinheiro?" },
        {
          key: "price_sufficiency",
          question: "Meus preços pagam os gastos?",
        },
        { key: "immediate_action", question: "O que preciso fazer agora?" },
      ],
    });
    expect(content.sections.map((section) => section.key)).toEqual([
      "break_even",
      "hidden_cost",
      "margin_diagnosis",
      "sales_goal",
    ]);
    expect(content.sections.map((section) => section.title)).toEqual([
      "Seus menores preços sem prejuízo",
      "O que sai das vendas",
      "Quanto sobra no mês",
      "Quanto você precisa vender",
    ]);
    expect(content.executiveSummary.facts[1]).toMatchObject({
      currentLabel: "Faturamento atual",
      referenceLabel: "Quanto precisa vender para cobrir os gastos",
    });
  });

  it("keeps partial business totals unknown and explains the missing volume", () => {
    const partialCommand: DetailedDiagnosisCommand = {
      ...command,
      items: [
        command.items[0],
        { ...command.items[1], monthlySalesVolume: null },
      ],
    };
    const calculation = calculateDetailedDiagnosis(partialCommand);
    const content = buildDetailedReportContent(partialCommand, calculation);

    expect(content.executiveSummary.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ currentValue: "Ainda não calculado" }),
      ]),
    );
    expect(
      content.sections.find(({ key }) => key === "margin_diagnosis")?.body,
    ).toMatch(/falta informar as vendas/i);
    expect(JSON.stringify(content)).not.toContain("R$ 500,00");
  });

  it("uses the plural Production headline", () => {
    const productionCommand: DetailedDiagnosisCommand = {
      ...command,
      category: "production",
      items: command.items.map((item) => ({
        id: item.id,
        position: item.position,
        name: item.name,
        kind: "manufacturing" as const,
        costMode: "summarized" as const,
        unitSalePriceCents: item.unitSalePriceCents,
        monthlySalesVolume: item.monthlySalesVolume,
        productionUnitCostCents:
          item.kind === "resale"
            ? item.purchaseUnitCostCents + item.packagingUnitCostCents
            : 0,
      })),
    };

    expect(
      buildDetailedReportContent(
        productionCommand,
        calculateDetailedDiagnosis(productionCommand),
      ).executiveSummary.headline,
    ).toBe("Suas produções dão lucro?");
  });
});
