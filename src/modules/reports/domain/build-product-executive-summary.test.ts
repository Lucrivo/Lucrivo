import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { buildProductExecutiveSummary } from "./build-product-executive-summary";
import { calculateProductReport } from "./calculate-product-report";

const command: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  productKind: "resale",
  purchaseUnitCostCents: 1_600,
  unitSalePriceCents: 5_500,
  fixedMonthlyExpensesCents: 300_000,
  monthlySalesVolume: 200,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};

describe("buildProductExecutiveSummary", () => {
  it("uses the three direct questions in their decision order", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport(command),
      "resale",
    );

    expect(summary.answers.map(({ question }) => question)).toEqual([
      "Estou ganhando dinheiro?",
      "Meu preço paga todos os gastos?",
      "O que preciso fazer agora?",
    ]);
  });

  it("describes a positive result factually", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport(command),
      "resale",
    );
    expect(summary.verdict).toMatchObject({
      label: "Resultado positivo",
      tone: "positive",
    });
    expect(JSON.stringify(summary)).toContain("Quanto sobra a cada R$ 100");
    expect(summary.answers[0]?.answer).toMatch(/^Sim\./);
    expect(summary.answers[1]?.answer).toMatch(/^Sim\./);
  });
  it.each([
    {
      name: "direct loss",
      input: { unitSalePriceCents: 1_000, purchaseUnitCostCents: 1_600 },
      first: /^Não\./,
      second: /^Não\./,
      third: /antes de vender mais/,
    },
    {
      name: "missing volume",
      input: { monthlySalesVolume: null },
      first: /^Ainda não dá para calcular o resultado do mês\./,
      second: /^Ainda não dá para confirmar\./,
      third: /Informe quantas vendas/,
    },
    {
      name: "no sales",
      input: { monthlySalesVolume: 0 },
      first: /^Ainda não houve vendas/,
      second: /^Ainda não dá para confirmar/,
      third: /quantidade necessária/,
    },
    {
      name: "operational loss",
      input: { monthlySalesVolume: 10 },
      first: /^Não\./,
      second: /^Não\./,
      third: /menor preço/,
    },
    {
      name: "break even",
      input: {
        purchaseUnitCostCents: 1_500,
        unitSalePriceCents: 5_500,
        fixedMonthlyExpensesCents: 300_000,
        proLaboreCents: 100_000,
        taxRateBasisPoints: 0,
        cardFeeRateBasisPoints: 0,
        monthlySalesVolume: 100,
      },
      first: /^Ainda não\./,
      second: /^Sim, exatamente\./,
      third: /pequena folga/,
    },
  ])(
    "adapts the three answers for $name",
    ({ input, first, second, third }) => {
      const summary = buildProductExecutiveSummary(
        calculateProductReport({ ...command, ...input }),
        "resale",
      );

      expect(summary.answers[0]?.answer).toMatch(first);
      expect(summary.answers[1]?.answer).toMatch(second);
      expect(summary.answers[2]?.answer).toMatch(third);
    },
  );

  it("keeps complete price unavailable without volume", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport({ ...command, monthlySalesVolume: null }),
      "resale",
    );
    expect(summary.facts[1].referenceValue).toBe("Ainda não calculado");
    expect(summary.answers[1].answer).toMatch(/falta uma quantidade/i);
  });

  it("contains no target-based or margin-quality language", () => {
    const summary = buildProductExecutiveSummary(
      calculateProductReport(command),
      "resale",
    );
    expect(JSON.stringify(summary)).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 20%|preço-alvo/i,
    );
  });
});
