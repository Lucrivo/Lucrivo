import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import { calculateProductReport } from "@/modules/reports/domain/calculate-product-report";
import { calculateProductionReport } from "@/modules/reports/domain/calculate-production-report";
import { calculateServiceReport } from "@/modules/reports/domain/calculate-service-report";

import { parseDetailedReportSnapshot } from "./detailed-report-snapshot.schema";
import { parseProductReportSnapshot } from "./product-report-snapshot.schema";
import { parseProductionReportSnapshot } from "./production-report-snapshot.schema";
import { parseReportSnapshot } from "./report-snapshot.schema";
import { parseServiceReportSnapshot } from "./service-report-snapshot.schema";

const answers = [
  {
    key: "profitability",
    question: "Estou ganhando dinheiro?",
    answer: "O resultado foi calculado com os valores informados.",
  },
  {
    key: "price_sufficiency",
    question: "O preço paga os valores considerados?",
    answer: "Veja o menor preço calculado quando há quantidade.",
  },
  {
    key: "immediate_action",
    question: "O que fazer agora?",
    answer: "Use os números objetivos para decidir.",
  },
] as const;

function executiveSummary(factKeys: readonly ("margin" | "price")[]) {
  return {
    headline: "Resultado do diagnóstico",
    introduction: "Veja os números calculados com as informações enviadas.",
    verdict: {
      label: "Resultado positivo",
      body: "O resultado estimado do mês ficou positivo.",
      tone: "positive" as const,
    },
    facts: factKeys.map((key) => ({
      key,
      currentLabel: key === "margin" ? "Quanto sobra" : "Preço atual",
      currentValue: key === "margin" ? "R$ 27,55" : "R$ 55,00",
      referenceLabel: "Sem referência",
      referenceValue: "Não se aplica",
    })),
    priority: {
      label: "Quantidade",
      body: "A quantidade informada foi usada no cálculo.",
    },
    answers: [...answers],
  };
}

function sections(keys: readonly string[]) {
  return keys.map((key, index) => ({
    key,
    title: `Seção ${index + 1}`,
    body: "Informação objetiva do diagnóstico.",
    emphasisLabel: null,
    emphasisValue: null,
    tone: "neutral" as const,
  }));
}

const quickSectionKeys = [
  "break_even",
  "hidden_cost",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;

const serviceInputs = {
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day" as const,
  workPeriodMinutes: 480,
  monthlyWorkMinutes: 10_392,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8_000,
  appointmentDurationMinutes: 50,
  materialUnitCostCents: 1_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const serviceResults = calculateServiceReport({
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  pricingMethod: "appointment",
  ...serviceInputs,
});
const validServiceSnapshot = {
  schemaVersion: 4,
  calculationVersion: 3,
  contentVersion: 5,
  category: "service",
  scenario: "appointment",
  currency: "BRL",
  unit: "appointment",
  policy: {
    weeklyDivisorHundredths: 433,
    maximumDiscountPercent: 50,
    proLaboreIncluded: true,
  },
  inputs: serviceInputs,
  source: {
    pricingMethod: "appointment",
    currentPriceCents: 8_000,
    materialCostUnit: "appointment",
    materialCostCents: 1_000,
    dailyWorkMinutes: 480,
    appointmentDurationMinutes: 50,
  },
  results: serviceResults,
  executiveSummary: executiveSummary(["price", "margin"]),
  sections: sections([
    "break_even",
    "margin_diagnosis",
    "sales_goal",
    "discount_simulator",
  ]),
  discountSimulationBase: {
    originalPriceCents: serviceResults.currentPriceCents,
    unitCostCents: serviceResults.unitCostCents,
    totalFeeBasisPoints: serviceResults.totalFeeBasisPoints,
    minimumPriceCents: serviceResults.minimumPriceCents,
  },
};

const productInputs = {
  productKind: "resale" as const,
  purchaseUnitCostCents: 1_600,
  unitSalePriceCents: 5_500,
  fixedMonthlyExpensesCents: 300_000,
  monthlySalesVolume: 200,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};
const productResults = calculateProductReport({
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ...productInputs,
});
const validProductSnapshot = {
  schemaVersion: 3,
  calculationVersion: 3,
  contentVersion: 4,
  category: "product",
  scenario: "resale",
  currency: "BRL",
  unit: "unit",
  policy: {
    weeklyDivisorHundredths: 433,
    operatingDaysPerWeek: 6,
    maximumDiscountPercent: 50,
    proLaboreIncluded: true,
  },
  inputs: productInputs,
  results: productResults,
  executiveSummary: executiveSummary(["margin", "price"]),
  sections: sections(quickSectionKeys),
  discountSimulationBase: {
    originalPriceCents: productResults.currentPriceCents,
    unitCostCents: productResults.totalUnitCostCents,
    totalFeeBasisPoints: productResults.totalFeeBasisPoints,
    minimumPriceCents: productResults.minimumPriceCents,
  },
};

const productionInputs = {
  costCompositionEnabled: true,
  productionUnitCostCents: 1_600,
  materialUnitCostCents: 1_000,
  packagingUnitCostCents: 200,
  directLaborUnitCostCents: 300,
  otherVariableUnitCostCents: 100,
  unitSalePriceCents: 5_500,
  fixedMonthlyExpensesCents: 300_000,
  monthlySalesVolume: null,
  proLaboreIncluded: false,
  proLaboreCents: 999_999,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
};
const productionResults = calculateProductionReport({
  submissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  ...productionInputs,
});
const validProductionSnapshot = {
  schemaVersion: 3,
  calculationVersion: 3,
  contentVersion: 4,
  category: "production",
  scenario: "manufacturing",
  currency: "BRL",
  unit: "unit",
  policy: {
    weeklyDivisorHundredths: 433,
    operatingDaysPerWeek: 6,
    maximumDiscountPercent: 50,
    proLaboreIncluded: false,
  },
  inputs: productionInputs,
  results: productionResults,
  executiveSummary: executiveSummary(["margin", "price"]),
  sections: sections(quickSectionKeys),
  discountSimulationBase: {
    originalPriceCents: productionResults.currentPriceCents,
    unitCostCents: null,
    totalFeeBasisPoints: productionResults.totalFeeBasisPoints,
    minimumPriceCents: null,
  },
};

const detailedInputs = {
  submissionId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  category: "product" as const,
  fixedMonthlyExpensesCents: 300_000,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 200,
  items: [
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      position: 0,
      name: "Caneca",
      kind: "resale" as const,
      unitSalePriceCents: 5_500,
      monthlySalesVolume: 200,
      purchaseUnitCostCents: 1_500,
      packagingUnitCostCents: 100,
    },
  ],
};
const detailedResults = calculateDetailedDiagnosis(detailedInputs);
const validDetailedSnapshot = {
  schemaVersion: 1,
  calculationVersion: 1,
  contentVersion: 1,
  analysisMode: "detailed",
  category: "product",
  scenario: "resale",
  currency: "BRL",
  unit: "mix",
  policy: {
    concentrationThresholdBasisPoints: 4_500,
    weeklyDivisorHundredths: 433,
    operatingDaysPerWeek: 6,
    proLaboreIncluded: true,
  },
  inputs: detailedInputs,
  results: detailedResults,
  executiveSummary: executiveSummary(["margin", "price"]),
  sections: sections([
    "break_even",
    "hidden_cost",
    "margin_diagnosis",
    "sales_goal",
  ]),
  guidance: [],
};

describe("current report snapshot schemas", () => {
  it("accepts exactly the four corrected current contracts", () => {
    expect(parseServiceReportSnapshot(validServiceSnapshot)).toBeTruthy();
    expect(parseProductReportSnapshot(validProductSnapshot)).toBeTruthy();
    expect(parseProductionReportSnapshot(validProductionSnapshot)).toBeTruthy();
    expect(parseDetailedReportSnapshot(validDetailedSnapshot)).toBeTruthy();

    for (const snapshot of [
      validServiceSnapshot,
      validProductSnapshot,
      validProductionSnapshot,
      validDetailedSnapshot,
    ]) {
      expect(parseReportSnapshot(snapshot)).toBeTruthy();
    }
  });

  it("accepts positive_result across all four report families", () => {
    expect(serviceResults.verdict).toBe("positive_result");
    expect(productResults.verdict).toBe("positive_result");
    expect(detailedResults.verdict).toBe("positive_result");

    const positiveProductionInputs = {
      ...productionInputs,
      monthlySalesVolume: 200,
      proLaboreIncluded: true,
      proLaboreCents: 100_000,
    };
    const positiveResults = calculateProductionReport({
      submissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ...positiveProductionInputs,
    });
    expect(
      parseProductionReportSnapshot({
        ...validProductionSnapshot,
        policy: {
          ...validProductionSnapshot.policy,
          proLaboreIncluded: true,
        },
        inputs: positiveProductionInputs,
        results: positiveResults,
        discountSimulationBase: {
          originalPriceCents: positiveResults.currentPriceCents,
          unitCostCents: positiveResults.totalUnitCostCents,
          totalFeeBasisPoints: positiveResults.totalFeeBasisPoints,
          minimumPriceCents: positiveResults.minimumPriceCents,
        },
      }),
    ).toBeTruthy();
  });

  it("rejects target, attention, partial-floor, and historical fields", () => {
    expect(() =>
      parseProductReportSnapshot({
        ...validProductSnapshot,
        policy: {
          ...validProductSnapshot.policy,
          attentionBandBasisPoints: 2_000,
        },
      }),
    ).toThrow();
    expect(() =>
      parseServiceReportSnapshot({
        ...validServiceSnapshot,
        results: { ...serviceResults, targetPriceCents: 9_999 },
      }),
    ).toThrow();
    expect(() =>
      parseProductionReportSnapshot({
        ...validProductionSnapshot,
        discountSimulationBase: {
          ...validProductionSnapshot.discountSimulationBase,
          partial: true,
          unitCostCents: 1_600,
          minimumPriceCents: 1_721,
        },
      }),
    ).toThrow();
    expect(() =>
      parseProductReportSnapshot({ ...validProductSnapshot, schemaVersion: 2 }),
    ).toThrow();
  });

  it("rejects results that do not match normalized inputs", () => {
    expect(() =>
      parseProductReportSnapshot({
        ...validProductSnapshot,
        results: { ...productResults, monthlyResultCents: 1 },
      }),
    ).toThrow();
  });

  it("requires unavailable discount values when positive volume is missing", () => {
    expect(productionResults.totalUnitCostCents).toBeNull();
    expect(validProductionSnapshot.discountSimulationBase).toMatchObject({
      unitCostCents: null,
      minimumPriceCents: null,
    });
    expect(parseProductionReportSnapshot(validProductionSnapshot)).toBeTruthy();
  });

  it("keeps the four nullable detailed full-cost item fields", () => {
    expect(detailedResults.items[0]).toMatchObject({
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      unitProfitCents: 1_515,
      realMarginBasisPoints: 2_755,
    });
  });
});
