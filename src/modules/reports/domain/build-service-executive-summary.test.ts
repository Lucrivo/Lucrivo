import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceExecutiveSummary } from "./build-service-executive-summary";
import { calculateServiceReport } from "./calculate-service-report";

const baseCommand: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "appointment",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  workHoursPeriod: "month",
  workPeriodMinutes: 6000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8000,
  appointmentDurationMinutes: 50,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const baseCalculation = calculateServiceReport(baseCommand);

describe("buildServiceExecutiveSummary", () => {
  it("builds the approved above-target appointment summary", () => {
    expect(buildServiceExecutiveSummary(baseCalculation)).toEqual({
      headline: "Seu serviço dá lucro?",
      introduction:
        "Veja quanto sobra do valor cobrado e o que merece sua atenção primeiro.",
      verdict: {
        label: "Acima da meta",
        body: "O preço paga os gastos e passa da meta de 15%. Acompanhe se seus clientes aceitam o preço e mantenha a quantidade de trabalho.",
        tone: "positive",
      },
      facts: [
        {
          key: "margin",
          currentLabel: "Quanto sobra a cada R$ 100",
          currentValue: "29,5%",
          referenceLabel: "Meta",
          referenceValue: "15%",
        },
        {
          key: "price",
          currentLabel: "Preço atual",
          currentValue: "R$ 80,00",
          referenceLabel: "Preço para alcançar a meta",
          referenceValue: "R$ 64,94",
        },
      ],
      priority: {
        label: "Quantidade de serviços",
        body: "Seu preço alcança a meta. Agora mantenha a quantidade de trabalho usada no cálculo.",
      },
      answers: [
        {
          key: "profitability",
          question: "Estou ganhando dinheiro?",
          answer:
            "Sim — sobram R$ 23,60 por atendimento depois de pagar os gastos considerados.",
        },
        {
          key: "price_sufficiency",
          question: "Estou cobrando o preço certo?",
          answer:
            "Sim — seu preço alcança o valor calculado para a meta de 15%.",
        },
        {
          key: "immediate_action",
          question: "O que preciso fazer agora?",
          answer:
            "Mantenha a quantidade de atendimentos usada no cálculo e acompanhe se seus clientes aceitam o preço.",
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

    expect(summary.verdict.label).toBe("Preço abaixo dos gastos");
    expect(summary.verdict.body).toContain("cada hora");
    expect(summary.answers[0].answer).toBe(
      "Não — faltam R$ 13,20 por hora para pagar os gastos considerados.",
    );
    expect(summary.answers[1].answer).toBe(
      "Não — para pagar todos os gastos, o preço precisa ser pelo menos R$ 65,22.",
    );
  });

  it.each([
    ["missing_price", "Informe o preço", "neutral"],
    ["direct_loss", "Venda com prejuízo", "critical"],
    ["operational_loss", "Preço abaixo dos gastos", "critical"],
    ["tight_margin", "Abaixo da meta", "warning"],
    ["adequate_margin", "Meta alcançada", "positive"],
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
    ["cost", "Gastos", "Revise os maiores gastos antes de buscar mais vendas."],
    [
      "price",
      "Preço",
      "Aumente o preço ou reduza os gastos antes de vender mais.",
    ],
    [
      "margin",
      "Quanto sobra",
      "Ajuste o preço ou os gastos para chegar à meta de 15%.",
    ],
    [
      "volume",
      "Quantidade de serviços",
      "Mantenha a quantidade de atendimentos usada no cálculo e acompanhe se seus clientes aceitam o preço.",
    ],
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
      "Ainda não dá para calcular esse valor com os dados informados.",
    ],
    [
      { unitProfitCents: null },
      "Ainda não dá para calcular esse valor com os dados informados.",
    ],
    [
      { unitProfitCents: -1320 },
      "Não — faltam R$ 13,20 por atendimento para pagar os gastos considerados.",
    ],
    [
      { unitProfitCents: 0 },
      "Não — o valor recebido apenas paga os gastos, sem deixar dinheiro.",
    ],
    [
      { unitProfitCents: 2360 },
      "Sim — sobram R$ 23,60 por atendimento depois de pagar os gastos considerados.",
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
      "Ainda não dá para calcular esse valor com os dados informados.",
    ],
    [
      {
        currentPriceCents: 4000,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Não — para pagar todos os gastos, o preço precisa ser pelo menos R$ 54,35.",
    ],
    [
      {
        currentPriceCents: 6000,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Quase — o preço paga os gastos, mas ainda não alcança a meta de 15%.",
    ],
    [
      {
        currentPriceCents: 6494,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Sim — seu preço alcança o valor calculado para a meta de 15%.",
    ],
    [
      {
        currentPriceCents: 8000,
        minimumPriceCents: 5435,
        targetPriceCents: 6494,
      },
      "Sim — seu preço alcança o valor calculado para a meta de 15%.",
    ],
  ] as const)("builds price answer %#", (override, answer) => {
    expect(
      buildServiceExecutiveSummary({ ...baseCalculation, ...override })
        .answers[1].answer,
    ).toBe(answer);
  });

  it("keeps technical terms out of the executive summary", () => {
    const content = JSON.stringify(
      buildServiceExecutiveSummary(baseCalculation),
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
