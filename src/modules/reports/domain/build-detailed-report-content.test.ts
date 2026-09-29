import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import { buildDetailedReportContent } from "./build-detailed-report-content";

const command: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 300_000,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_500,
      monthlySalesVolume: 200,
      purchaseUnitCostCents: 1_500,
      packagingUnitCostCents: 100,
    },
  ],
};

describe("buildDetailedReportContent", () => {
  it("uses direct plural questions for the item mix", () => {
    const content = buildDetailedReportContent(
      command,
      calculateDetailedDiagnosis(command),
    );

    expect(
      content.executiveSummary.answers.map(({ question }) => question),
    ).toEqual([
      "Estou ganhando dinheiro?",
      "Meus preços pagam todos os gastos?",
      "O que preciso fazer agora?",
    ]);
  });

  it("uses complete item prices and objective positive-result copy", () => {
    const content = buildDetailedReportContent(
      command,
      calculateDetailedDiagnosis(command),
    );
    expect(content.executiveSummary.verdict.label).toBe("Resultado positivo");
    expect(JSON.stringify(content)).toContain(
      "Cada valor inclui o custo direto, a parte dos gastos do mês",
    );
    expect(JSON.stringify(content)).toContain("Quanto sobra a cada R$ 100");
    expect(content.executiveSummary.answers[0]?.answer).toMatch(
      /^Sim\. O lucro estimado do conjunto é de R\$ .+ no mês\.$/,
    );
  });

  it("shows one unknown item's monthly quantity without a weekly split", () => {
    const partial = {
      ...command,
      items: [{ ...command.items[0], monthlySalesVolume: null }],
    };
    const content = buildDetailedReportContent(
      partial,
      calculateDetailedDiagnosis(partial),
    );
    const sales = content.sections.find(({ key }) => key === "sales_goal");
    expect(sales?.body).toContain("Como há um único item");
    expect(sales?.body).not.toMatch(/por semana|por dia/);
  });

  it("explains why a multi-item partial quantity is unavailable", () => {
    const partial = {
      ...command,
      items: [
        { ...command.items[0], monthlySalesVolume: 10 },
        {
          ...command.items[0],
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          monthlySalesVolume: null,
        },
      ],
    };
    const content = buildDetailedReportContent(
      partial,
      calculateDetailedDiagnosis(partial),
    );
    expect(JSON.stringify(content)).toContain("inventar uma proporção");
  });
  it("keeps a positive mix while exposing an item that loses per sale", () => {
    const mixed: DetailedDiagnosisCommand = {
      ...command,
      fixedMonthlyExpensesCents: 0,
      proLaboreIncluded: false,
      proLaboreCents: 0,
      taxRateBasisPoints: 0,
      cardFeeRateBasisPoints: 0,
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          position: 0,
          name: "Item com perda",
          kind: "resale",
          unitSalePriceCents: 1_000,
          monthlySalesVolume: 1,
          purchaseUnitCostCents: 1_500,
          packagingUnitCostCents: 0,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          position: 1,
          name: "Item rentável",
          kind: "resale",
          unitSalePriceCents: 10_000,
          monthlySalesVolume: 100,
          purchaseUnitCostCents: 100,
          packagingUnitCostCents: 0,
        },
      ],
    };
    const content = buildDetailedReportContent(
      mixed,
      calculateDetailedDiagnosis(mixed),
    );

    expect(content.executiveSummary.verdict.label).toBe("Prejuízo por venda");
    expect(content.executiveSummary.answers[0]?.answer).toMatch(
      /^Sim\. O lucro estimado do conjunto/,
    );
    expect(content.executiveSummary.answers[0]?.answer).toContain(
      "Item com perda",
    );
    expect(content.executiveSummary.answers[1]?.answer).toMatch(
      /^Não completamente\./,
    );
  });
});
