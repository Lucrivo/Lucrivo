import { describe, expect, it } from "vitest";

import type { ProductionDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildProductionExecutiveSummary } from "./build-production-executive-summary";
import { calculateProductionReport } from "./calculate-production-report";

const completeCommand: ProductionDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCostCents: 5000,
  materialUnitCostCents: 3000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const completeCalculation = calculateProductionReport(completeCommand);

describe("buildProductionExecutiveSummary", () => {
  it("builds the partial facts and answers in exact order", () => {
    const summary = buildProductionExecutiveSummary(
      calculateProductionReport({
        ...completeCommand,
        monthlySalesVolume: null,
      }),
    );

    expect(summary.headline).toBe("Sua produção dá lucro?");
    expect(summary.facts).toEqual([
      {
        key: "margin",
        currentLabel: "Quanto sobra a cada R$ 100",
        currentValue: "Indisponível",
        referenceLabel: "Meta",
        referenceValue: "20%",
      },
      {
        key: "price",
        currentLabel: "Preço atual",
        currentValue: "R$ 100,00",
        referenceLabel: "Preço para a meta, sem gastos mensais",
        referenceValue: "R$ 69,45",
      },
    ]);
    expect(summary.answers).toEqual([
      expect.objectContaining({
        key: "profitability",
        answer:
          "Ainda não dá para saber quanto sobra de verdade. Informe quantas unidades você vende por mês para incluir os gastos mensais.",
      }),
      expect.objectContaining({
        key: "price_sufficiency",
        answer:
          "Ainda é uma estimativa: R$ 69,45 inclui o custo de fabricação e as taxas, mas não os gastos mensais.",
      }),
      expect.objectContaining({
        key: "immediate_action",
        answer:
          "Informe quantas unidades você vende por mês para concluir o diagnóstico.",
      }),
    ]);
    expect(summary.verdict.body).toBe(
      "A venda paga o custo de fabricação, mas falta informar quantas unidades você vende por mês para incluir os gastos mensais.",
    );
  });

  it.each([
    [
      "direct_loss",
      "cost",
      "Venda com prejuízo",
      "critical",
      "Reduza o custo de fabricação ou aumente o preço antes de vender mais.",
    ],
    [
      "incomplete_volume",
      "data",
      "Falta informar as vendas",
      "neutral",
      "Informe quantas unidades você vende por mês para concluir o diagnóstico.",
    ],
    [
      "operational_loss",
      "price",
      "Preço abaixo dos gastos",
      "critical",
      "Aumente o preço ou reduza os gastos de cada unidade.",
    ],
    [
      "tight_margin",
      "margin",
      "Abaixo da meta",
      "warning",
      "Ajuste o preço ou os gastos para chegar à meta de 20%.",
    ],
    [
      "adequate_margin",
      "volume",
      "Meta alcançada",
      "positive",
      "Mantenha a quantidade de vendas usada no cálculo.",
    ],
    [
      "above_target",
      "volume",
      "Acima da meta",
      "positive",
      "Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
    ],
  ] as const)(
    "maps %s to Production-only verdict and priority content",
    (verdict, priority, label, tone, action) => {
      const summary = buildProductionExecutiveSummary({
        ...completeCalculation,
        verdict,
        priority,
      });

      expect(summary.verdict).toEqual(expect.objectContaining({ label, tone }));
      expect(summary.priority.body.length).toBeGreaterThan(0);
      expect(summary.answers[2]).toEqual(
        expect.objectContaining({ key: "immediate_action", answer: action }),
      );
    },
  );

  it("never recommends more volume for a direct loss", () => {
    const summary = buildProductionExecutiveSummary(
      calculateProductionReport({
        ...completeCommand,
        unitSalePriceCents: 5000,
        monthlySalesVolume: null,
      }),
    );
    const content = JSON.stringify(summary);

    expect(summary.verdict.label).toBe("Venda com prejuízo");
    expect(summary.answers[0].answer).toContain("faltam");
    expect(content).not.toContain("aumente o volume");
    expect(content).not.toContain("venda mais");
  });

  it("uses Production profitability language for a complete report", () => {
    const summary = buildProductionExecutiveSummary(completeCalculation);
    const content = JSON.stringify(summary);

    expect(summary.answers.map(({ key }) => key)).toEqual([
      "profitability",
      "price_sufficiency",
      "immediate_action",
    ]);
    expect(summary.answers[0].answer).toContain("sobram");
    expect(summary.introduction).toBe(
      "Veja quanto sobra de cada unidade vendida e o que merece sua atenção primeiro.",
    );
    expect(content).not.toContain("custo de compra");
    expect(content).not.toContain("fornecedor");
  });

  it("keeps technical terms out of the executive summary", () => {
    const content = JSON.stringify(
      buildProductionExecutiveSummary(completeCalculation),
    ).toLocaleLowerCase("pt-BR");

    for (const term of [
      "pró-labore",
      "rateio",
      "receita líquida",
      "contribuição",
      "operacional",
      "referência financeira",
    ]) {
      expect(content).not.toContain(term);
    }
  });
});
