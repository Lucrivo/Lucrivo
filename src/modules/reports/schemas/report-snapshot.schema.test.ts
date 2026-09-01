import { describe, expect, it } from "vitest";

import { parseProductReportSnapshot } from "./product-report-snapshot.schema";
import { parseReportSnapshot } from "./report-snapshot.schema";
import { parseServiceReportSnapshot } from "./service-report-snapshot.schema";

const sectionKeys = [
  "break_even",
  "hidden_cost",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;

const executiveSummary = {
  headline: "A verdade por trás do preço.",
  introduction: "Veja os números essenciais e a prioridade do diagnóstico.",
  verdict: {
    label: "Margem apertada",
    body: "A operação está abaixo da meta.",
    tone: "warning",
  },
  facts: [
    {
      key: "margin",
      currentLabel: "Margem atual",
      currentValue: "12%",
      referenceLabel: "Meta",
      referenceValue: "20%",
    },
    {
      key: "price",
      currentLabel: "Preço atual",
      currentValue: "R$ 100,00",
      referenceLabel: "Preço-alvo",
      referenceValue: "R$ 111,12",
    },
  ],
  priority: {
    label: "Margem",
    body: "Aproxime preço e custo da meta.",
  },
  answers: [
    {
      key: "profitability",
      question: "Estou ganhando dinheiro?",
      answer: "Sim, há lucro por unidade.",
    },
    {
      key: "price_sufficiency",
      question: "Estou cobrando o preço certo?",
      answer: "O preço ainda está abaixo da meta.",
    },
    {
      key: "immediate_action",
      question: "O que preciso fazer agora?",
      answer: "Revise preço e custos.",
    },
  ],
};

const sections = sectionKeys.map((key, index) => ({
  key,
  title: `Seção ${index + 1}`,
  body: `Conteúdo da seção ${index + 1}.`,
  emphasisLabel: index === 0 ? "Preço mínimo" : null,
  emphasisValue: index === 0 ? "R$ 86,96" : null,
  tone: index === 0 ? "positive" : "neutral",
}));

const validServiceSnapshot = {
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
    ...executiveSummary,
    verdict: {
      label: "Acima da meta",
      body: "O preço supera a meta de 15%.",
      tone: "positive",
    },
    facts: executiveSummary.facts.map((fact) =>
      fact.key === "margin"
        ? { ...fact, currentValue: "29,5%", referenceValue: "15%" }
        : {
            ...fact,
            currentValue: "R$ 80,00",
            referenceValue: "R$ 64,94",
          },
    ),
  },
  sections,
  discountSimulationBase: {
    originalPriceCents: 8000,
    unitCostCents: 5000,
    totalFeeBasisPoints: 800,
    targetMarginBasisPoints: 1500,
    minimumPriceCents: 5435,
  },
};

const validProductSnapshot = {
  schemaVersion: 1,
  calculationVersion: 1,
  contentVersion: 1,
  category: "product",
  scenario: "resale",
  currency: "BRL",
  unit: "unit",
  policy: {
    targetMarginBasisPoints: 2000,
    weeklyDivisorHundredths: 433,
    operatingDaysPerWeek: 6,
    maximumDiscountPercent: 50,
    proLaboreIncluded: true,
  },
  inputs: {
    purchaseUnitCostCents: 5000,
    unitSalePriceCents: 10000,
    fixedMonthlyExpensesCents: 100000,
    monthlySalesVolume: 100,
    proLaboreIncluded: true,
    proLaboreCents: 200000,
    taxRateBasisPoints: 600,
    cardFeeRateBasisPoints: 200,
  },
  results: {
    effectiveFixedCostCents: 300000,
    purchaseUnitCostCents: 5000,
    fixedAllocationCents: 3000,
    totalUnitCostCents: 8000,
    currentPriceCents: 10000,
    netRevenueCents: 9200,
    unitContributionCents: 4200,
    unitProfitCents: 1200,
    realMarginBasisPoints: 1200,
    minimumPriceCents: 8696,
    targetPriceCents: 11112,
    priceReferencesPartial: false,
    monthlySalesGoal: 72,
    weeklySalesGoal: 17,
    dailySalesGoal: 3,
    breakEvenDiscountPercent: 13,
    verdict: "tight_margin",
    priority: "margin",
  },
  executiveSummary,
  sections,
  discountSimulationBase: {
    originalPriceCents: 10000,
    unitCostCents: 8000,
    totalFeeBasisPoints: 800,
    targetMarginBasisPoints: 2000,
    minimumPriceCents: 8696,
    partial: false,
  },
};

const partialProductSnapshot = {
  ...validProductSnapshot,
  inputs: {
    ...validProductSnapshot.inputs,
    monthlySalesVolume: null,
  },
  results: {
    ...validProductSnapshot.results,
    fixedAllocationCents: null,
    totalUnitCostCents: null,
    unitProfitCents: null,
    realMarginBasisPoints: null,
    minimumPriceCents: 5435,
    targetPriceCents: 6945,
    priceReferencesPartial: true,
    breakEvenDiscountPercent: 46,
    verdict: "incomplete_volume",
    priority: "data",
  },
  discountSimulationBase: {
    ...validProductSnapshot.discountSimulationBase,
    unitCostCents: 5000,
    minimumPriceCents: 5435,
    partial: true,
  },
};

describe("category-versioned report snapshots", () => {
  it("preserves the complete Service V2 shape", () => {
    expect(parseServiceReportSnapshot(validServiceSnapshot)).toEqual(
      validServiceSnapshot,
    );
    expect(parseReportSnapshot(validServiceSnapshot).category).toBe("service");
  });

  it("parses a complete Product V1 snapshot", () => {
    expect(parseProductReportSnapshot(validProductSnapshot)).toEqual(
      validProductSnapshot,
    );
    expect(parseReportSnapshot(validProductSnapshot).category).toBe("product");
  });

  it("parses a partial Product V1 snapshot", () => {
    expect(parseReportSnapshot(partialProductSnapshot)).toEqual(
      partialProductSnapshot,
    );
  });

  it.each([
    { ...validProductSnapshot, schemaVersion: 2 },
    { ...validProductSnapshot, scenario: "hour" },
    { ...validProductSnapshot, unknownField: true },
    { ...validServiceSnapshot, schemaVersion: 1 },
    { ...validServiceSnapshot, category: "unknown" },
  ])("rejects unsupported or unknown top-level contract %#", (snapshot) => {
    expect(() => parseReportSnapshot(snapshot)).toThrow();
  });

  it("rejects noninteger money", () => {
    expect(() =>
      parseReportSnapshot({
        ...validProductSnapshot,
        results: {
          ...validProductSnapshot.results,
          currentPriceCents: 10000.5,
        },
      }),
    ).toThrow();
  });

  it("rejects Product-only verdicts inside Service V2", () => {
    expect(() =>
      parseReportSnapshot({
        ...validServiceSnapshot,
        results: {
          ...validServiceSnapshot.results,
          verdict: "direct_loss",
        },
      }),
    ).toThrow();
  });

  it("rejects complete fields inside a partial Product report", () => {
    expect(() =>
      parseReportSnapshot({
        ...partialProductSnapshot,
        results: {
          ...partialProductSnapshot.results,
          unitProfitCents: 0,
        },
      }),
    ).toThrow();
  });

  it("rejects mismatched Product partial flags", () => {
    expect(() =>
      parseReportSnapshot({
        ...partialProductSnapshot,
        discountSimulationBase: {
          ...partialProductSnapshot.discountSimulationBase,
          partial: false,
        },
      }),
    ).toThrow();
  });

  it.each(["sections", "facts", "answers"] as const)(
    "rejects reordered or duplicated Product %s",
    (field) => {
      const snapshot = structuredClone(validProductSnapshot);

      if (field === "sections") {
        snapshot.sections[1] = {
          ...snapshot.sections[1],
          key: "break_even",
        };
      } else {
        snapshot.executiveSummary[field] = [
          snapshot.executiveSummary[field][1],
          snapshot.executiveSummary[field][0],
          ...snapshot.executiveSummary[field].slice(2),
        ] as never;
      }

      expect(() => parseReportSnapshot(snapshot)).toThrow();
    },
  );

  it("rejects compensation and Product scalar inconsistencies", () => {
    expect(() =>
      parseReportSnapshot({
        ...validProductSnapshot,
        inputs: {
          ...validProductSnapshot.inputs,
          proLaboreIncluded: false,
        },
      }),
    ).toThrow();

    expect(() =>
      parseReportSnapshot({
        ...validProductSnapshot,
        results: {
          ...validProductSnapshot.results,
          currentPriceCents: 10001,
        },
      }),
    ).toThrow();
  });

  it("rejects a mismatched Product simulator base", () => {
    expect(() =>
      parseReportSnapshot({
        ...validProductSnapshot,
        discountSimulationBase: {
          ...validProductSnapshot.discountSimulationBase,
          unitCostCents: 5000,
        },
      }),
    ).toThrow();
  });
});
