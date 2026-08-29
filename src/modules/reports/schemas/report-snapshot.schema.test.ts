import { describe, expect, it } from "vitest";

import { parseReportSnapshot } from "./report-snapshot.schema";

const sectionKeys = [
  "break_even",
  "hidden_cost",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;

const validSnapshot = {
  schemaVersion: 2,
  calculationVersion: 1,
  contentVersion: 2,
  category: "service",
  scenario: "appointment",
  currency: "BRL",
  unit: "appointment",
  policy: {
    targetMarginBasisPoints: 1500,
    weeklyDivisorHundredths: 433,
    maximumDiscountPercent: 50,
    proLaboreIncluded: true,
  },
  inputs: {
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
  },
  results: {
    monthlyCostCents: 600000,
    hourCostCents: 6000,
    unitCostCents: 5000,
    currentPriceCents: 8000,
    netRevenueCents: 7360,
    unitProfitCents: 2360,
    realMarginBasisPoints: 2950,
    minimumPriceCents: 5435,
    targetPriceCents: 6494,
    monthlySalesGoal: 93,
    weeklySalesGoal: 22,
    dailySalesGoal: 5,
    breakEvenDiscountPercent: 32,
    verdict: "above_target",
    priority: "volume",
  },
  executiveSummary: {
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
  },
  sections: sectionKeys.map((key, index) => ({
    key,
    title: `Seção ${index + 1}`,
    body: `Conteúdo da seção ${index + 1}.`,
    emphasisLabel: index === 0 ? "Preço mínimo" : null,
    emphasisValue: index === 0 ? "R$ 54,35" : null,
    tone: index === 0 ? "positive" : "neutral",
  })),
  discountSimulationBase: {
    originalPriceCents: 8000,
    unitCostCents: 5000,
    totalFeeBasisPoints: 800,
    targetMarginBasisPoints: 1500,
    minimumPriceCents: 5435,
  },
};

describe("parseReportSnapshot", () => {
  it("parses a complete version 2 Service snapshot", () => {
    expect(parseReportSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it("rejects a version 1 snapshot", () => {
    expect(() =>
      parseReportSnapshot({
        ...validSnapshot,
        schemaVersion: 1,
        contentVersion: 1,
      }),
    ).toThrow();
  });

  it.each([
    [
      "facts",
      [
        validSnapshot.executiveSummary.facts[1],
        validSnapshot.executiveSummary.facts[0],
      ],
    ],
    [
      "answers",
      [
        validSnapshot.executiveSummary.answers[1],
        validSnapshot.executiveSummary.answers[0],
        validSnapshot.executiveSummary.answers[2],
      ],
    ],
  ] as const)("rejects reordered executive-summary %s", (field, value) => {
    expect(() =>
      parseReportSnapshot({
        ...validSnapshot,
        executiveSummary: {
          ...validSnapshot.executiveSummary,
          [field]: value,
        },
      }),
    ).toThrow();
  });

  it("rejects a missing executive summary", () => {
    const { executiveSummary: _removed, ...withoutSummary } = validSnapshot;
    expect(() => parseReportSnapshot(withoutSummary)).toThrow();
  });

  it("rejects a missing fifth section", () => {
    expect(() =>
      parseReportSnapshot({
        ...validSnapshot,
        sections: validSnapshot.sections.slice(0, 4),
      }),
    ).toThrow();
  });

  it("rejects reordered or duplicated section keys", () => {
    expect(() =>
      parseReportSnapshot({
        ...validSnapshot,
        sections: validSnapshot.sections.map((section, index) =>
          index === 1 ? { ...section, key: "break_even" } : section,
        ),
      }),
    ).toThrow();
  });

  it("rejects a category outside the Service adapter", () => {
    expect(() =>
      parseReportSnapshot({ ...validSnapshot, category: "product" }),
    ).toThrow();
  });

  it("rejects noninteger monetary values", () => {
    expect(() =>
      parseReportSnapshot({
        ...validSnapshot,
        results: { ...validSnapshot.results, currentPriceCents: 8000.5 },
      }),
    ).toThrow();
  });
});
