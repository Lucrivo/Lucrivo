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

    expect(summary.headline).toBe(
      "A verdade por trás do preço da sua produção.",
    );
    expect(summary.facts).toEqual([
      {
        key: "margin",
        currentLabel: "Margem atual",
        currentValue: "Indisponível",
        referenceLabel: "Meta",
        referenceValue: "20%",
      },
      {
        key: "price",
        currentLabel: "Preço atual",
        currentValue: "R$ 100,00",
        referenceLabel: "Preço-alvo sem rateio fixo",
        referenceValue: "R$ 69,45",
      },
    ]);
    expect(summary.answers).toEqual([
      expect.objectContaining({
        key: "profitability",
        answer: expect.stringContaining("contribuição por unidade é positiva"),
      }),
      expect.objectContaining({
        key: "price_sufficiency",
        answer: expect.stringContaining("referência ainda é parcial"),
      }),
      expect.objectContaining({
        key: "immediate_action",
        answer: expect.stringContaining("volume médio mensal"),
      }),
    ]);
    expect(summary.answers[0].answer).not.toContain("lucro real é positivo");
    expect(summary.verdict.body).toContain(
      "custos fixos e o pró-labore ainda não foram rateados",
    );
  });

  it.each([
    [
      "direct_loss",
      "cost",
      "Prejuízo direto",
      "critical",
      "Revise o custo de fabricação ou aumente o preço antes de buscar volume.",
    ],
    [
      "incomplete_volume",
      "data",
      "Complete o diagnóstico",
      "neutral",
      "Informe o volume médio mensal para concluir o diagnóstico.",
    ],
    [
      "operational_loss",
      "price",
      "Prejuízo operacional",
      "critical",
      "Corrija o preço ou o custo operacional rateado antes de avançar.",
    ],
    [
      "tight_margin",
      "margin",
      "Margem apertada",
      "warning",
      "Aproxime preço e custo da meta financeira de 20%.",
    ],
    [
      "adequate_margin",
      "volume",
      "Margem adequada",
      "positive",
      "Mantenha o volume de vendas necessário para sustentar o resultado.",
    ],
    [
      "above_target",
      "volume",
      "Acima da meta",
      "positive",
      "Valide a aceitação do mercado e mantenha o volume de vendas.",
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

    expect(summary.verdict.label).toBe("Prejuízo direto");
    expect(summary.answers[0].answer).toContain("contribuição por unidade");
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
    expect(summary.answers[0].answer).toContain("lucro por unidade");
    expect(summary.introduction).toContain("cada venda fabricada deixa");
    expect(content).toContain("custo de fabricação");
    expect(content).not.toContain("custo de compra");
    expect(content).not.toContain("fornecedor");
  });
});
