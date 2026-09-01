import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceExecutiveSummary } from "./build-service-executive-summary";
import { calculateServiceReport } from "./calculate-service-report";

const baseCommand: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "appointment",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8000,
  appointmentDurationMinutes: 50,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const baseCalculation = calculateServiceReport(baseCommand);

describe("buildServiceExecutiveSummary", () => {
  it("builds the approved above-target appointment summary", () => {
    expect(buildServiceExecutiveSummary(baseCalculation)).toEqual({
      headline: "A verdade por trás do preço.",
      introduction:
        "O Lucrivo revela o que está escondido nos seus números e mostra exatamente o que fazer a respeito.",
      verdict: {
        label: "Acima da meta",
        body: "O preço cobre os custos e supera a meta financeira de 15%. Há folga na margem; confirme se o mercado aceita esse preço e acompanhe o volume.",
        tone: "positive",
      },
      facts: [
        {
          key: "margin",
          currentLabel: "Margem atual",
          currentValue: "29,5%",
          referenceLabel: "Meta",
          referenceValue: "15%",
        },
        {
          key: "price",
          currentLabel: "Preço atual",
          currentValue: "R$ 80,00",
          referenceLabel: "Preço-alvo",
          referenceValue: "R$ 64,94",
        },
      ],
      priority: {
        label: "Volume",
        body: "Seu preço sustenta a operação e a meta. Agora transforme o volume necessário em rotina comercial.",
      },
      answers: [
        {
          key: "profitability",
          question: "Estou ganhando dinheiro?",
          answer:
            "Sim — cada atendimento deixa R$ 23,60 após os custos considerados.",
        },
        {
          key: "price_sufficiency",
          question: "Estou cobrando o preço certo?",
          answer: "Sim — alcança a referência financeira para a meta de 15%.",
        },
        {
          key: "immediate_action",
          question: "O que preciso fazer agora?",
          answer: "Trabalhe para alcançar a meta de vendas calculada.",
        },
      ],
    });
  });

  it("uses hour wording and an absolute loss amount", () => {
    const summary = buildServiceExecutiveSummary({
      ...baseCalculation,
      unit: "hour",
      verdict: "operational_loss",
      priority: "price",
      currentPriceCents: 4000,
      unitProfitCents: -1320,
      realMarginBasisPoints: -3300,
      minimumPriceCents: 6522,
      targetPriceCents: 7793,
    });

    expect(summary.verdict.label).toBe("Prejuízo");
    expect(summary.verdict.body).toContain("cada hora");
    expect(summary.answers[0].answer).toBe(
      "Não — hoje cada hora fecha no vermelho em R$ 13,20.",
    );
    expect(summary.answers[1].answer).toBe(
      "Não — está abaixo do mínimo financeiro de R$ 65,22.",
    );
  });

  it.each([
    ["missing_price", "Informe o preço", "neutral"],
    ["operational_loss", "Prejuízo", "critical"],
    ["tight_margin", "Margem apertada", "warning"],
    ["adequate_margin", "Margem adequada", "positive"],
    ["above_target", "Acima da meta", "positive"],
  ] as const)(
    "maps %s to persisted verdict content",
    (verdict, label, tone) => {
      expect(
        buildServiceExecutiveSummary({ ...baseCalculation, verdict }).verdict,
      ).toEqual(expect.objectContaining({ label, tone }));
    },
  );

  it.each([
    ["cost", "Custo", "Revise os custos antes de acelerar as vendas."],
    ["price", "Preço", "Ajuste o preço antes de buscar mais volume."],
    ["margin", "Margem", "Aproxime a operação da meta financeira de 15%."],
    ["volume", "Volume", "Trabalhe para alcançar a meta de vendas calculada."],
  ] as const)("maps %s to one correction", (priority, label, answer) => {
    const summary = buildServiceExecutiveSummary({
      ...baseCalculation,
      priority,
    });
    expect(summary.priority.label).toBe(label);
    expect(summary.answers[2].answer).toBe(answer);
  });

  it.each([
    [
      { verdict: "missing_price" as const, currentPriceCents: 0 },
      "Ainda não é possível responder sem o preço atual.",
    ],
    [
      { unitProfitCents: null },
      "Ainda não é possível calcular o lucro por atendimento com os dados informados.",
    ],
    [
      { unitProfitCents: -1320 },
      "Não — hoje cada atendimento fecha no vermelho em R$ 13,20.",
    ],
    [
      { unitProfitCents: 0 },
      "Não — cada atendimento apenas cobre os custos, sem gerar lucro.",
    ],
    [
      { unitProfitCents: 2360 },
      "Sim — cada atendimento deixa R$ 23,60 após os custos considerados.",
    ],
  ] as const)("builds profitability answer %#", (override, answer) => {
    expect(
      buildServiceExecutiveSummary({ ...baseCalculation, ...override })
        .answers[0].answer,
    ).toBe(answer);
  });

  it.each([
    [
      { verdict: "missing_price" as const, currentPriceCents: 0 },
      "Ainda não — informe o preço atual para fazer a comparação.",
    ],
    [
      { minimumPriceCents: null, targetPriceCents: null },
      "Ainda não é possível calcular uma referência financeira segura com os dados informados.",
    ],
    [
      {
        currentPriceCents: 4000,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Não — está abaixo do mínimo financeiro de R$ 54,35.",
    ],
    [
      {
        currentPriceCents: 6000,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Parcialmente — cobre os custos, mas ainda não alcança a meta de 15%.",
    ],
    [
      {
        currentPriceCents: 6494,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Sim — alcança a referência financeira para a meta de 15%.",
    ],
    [
      {
        currentPriceCents: 8000,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Sim — alcança a referência financeira para a meta de 15%.",
    ],
  ] as const)("builds price answer %#", (override, answer) => {
    expect(
      buildServiceExecutiveSummary({ ...baseCalculation, ...override })
        .answers[1].answer,
    ).toBe(answer);
  });
});
