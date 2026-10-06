import { describe, expect, it } from "vitest";

import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "./to-report-view-model";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8_000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productKind: "resale",
  purchaseUnitCostCents: 5_000,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  costCompositionEnabled: true,
  productionUnitCostCents: 5_000,
  materialUnitCostCents: 3_000,
  packagingUnitCostCents: 500,
  directLaborUnitCostCents: 1_000,
  otherVariableUnitCostCents: 500,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

function presentService(
  input: NormalizedServiceDiagnosisCommand = serviceCommand,
) {
  return toReportViewModel({
    id: 42,
    createdAt: "2026-08-28T22:30:00.000Z",
    snapshot: buildServiceReportSnapshot(input, calculateServiceReport(input)),
  });
}

function presentProduct(input: ProductDiagnosisCommand = productCommand) {
  return toReportViewModel({
    id: 43,
    createdAt: "2026-08-31T15:00:00.000Z",
    snapshot: buildProductReportSnapshot(input, calculateProductReport(input)),
  });
}

function presentProduction(
  input: ProductionDiagnosisCommand = productionCommand,
) {
  return toReportViewModel({
    id: 44,
    createdAt: "2026-09-01T15:00:00.000Z",
    snapshot: buildProductionReportSnapshot(
      input,
      calculateProductionReport(input),
    ),
  });
}

describe("toReportViewModel", () => {
  it("presents Service indicators without a target or simulator mode", () => {
    const model = presentService();

    expect(model.identity).toMatchObject({
      title: "Diagnóstico de Serviço",
      categoryLabel: "Serviço",
      scenarioLabel: "Por hora",
      unitLabel: "hora",
    });
    expect(model.executiveSummary.verdict.toneLabel).toBe("Resultado positivo");
    expect(model.indicators.map(({ key }) => key)).toEqual([
      "price",
      "minimum",
      "sales",
      "margin",
      "discount",
    ]);
    expect(model.indicators.find(({ key }) => key === "sales")).toMatchObject({
      featured: true,
    });
    expect(model.indicators.find(({ key }) => key === "margin")).toMatchObject({
      label: "Margem de lucro",
      value: "34,26%",
    });
    expect(model.discountSimulationContext).toEqual({
      category: "service",
      breakEvenReference: null,
    });
    expect(JSON.stringify(model)).not.toMatch(/target|legacy_target|meta/i);
  });

  it("explains an original monthly price through its hourly equivalent", () => {
    const model = presentService({
      ...serviceCommand,
      source: {
        ...serviceCommand.source,
        pricingMethod: "month",
        currentPriceCents: 1_039_200,
      },
    });

    expect(
      model.indicators.find(({ key }) => key === "price")?.help?.description,
    ).toContain("R$ 10.392,00 por mês");
    expect(
      model.indicators.find(({ key }) => key === "price")?.help?.description,
    ).toContain("R$ 80,00 por hora");
  });

  it("explains unavailable Service values when the price is missing", () => {
    const model = presentService({
      ...serviceCommand,
      hourlyRateCents: 0,
      source: {
        ...serviceCommand.source,
        currentPriceCents: 0,
      },
    });

    for (const key of ["sales", "margin"] as const) {
      expect(
        model.indicators.find((indicator) => indicator.key === key),
      ).toMatchObject({
        value: "Ainda não calculado",
        supportingText: "Informe um preço maior que zero para calcular.",
      });
    }
  });

  it("presents complete Product and Production reports objectively", () => {
    for (const model of [presentProduct(), presentProduction()]) {
      expect(
        model.indicators.map(({ key, label, value }) => ({
          key,
          label,
          value,
        })),
      ).toEqual([
        { key: "price", label: "Preço de venda", value: "R$ 100,00" },
        {
          key: "minimum",
          label: "Menor preço para não ficar no prejuízo",
          value: "R$ 86,96",
        },
        {
          key: "sales",
          label: "Vendas necessárias no mês",
          value:
            model.identity.categoryLabel === "Produto"
              ? "72 vendas"
              : "72 unidades",
        },
        { key: "margin", label: "Margem de lucro", value: "12%" },
        {
          key: "discount",
          label: "Desconto máximo sem prejuízo",
          value: expect.stringMatching(/^\d+%$/),
        },
      ]);
      expect(model.executiveSummary.verdict.toneLabel).toBe(
        "Resultado positivo",
      );
    }
  });

  it("adds answer helpers only to the new content version", () => {
    const currentSnapshot = buildProductReportSnapshot(
      productCommand,
      calculateProductReport(productCommand),
    );
    const historicalSnapshot = {
      ...currentSnapshot,
      contentVersion: 4 as const,
    };
    const current = toReportViewModel({
      id: 45,
      createdAt: "2026-09-01T15:00:00.000Z",
      snapshot: currentSnapshot,
    });
    const historical = toReportViewModel({
      id: 46,
      createdAt: "2026-09-01T15:00:00.000Z",
      snapshot: historicalSnapshot,
    });

    expect(
      current.executiveSummary.answers.map(({ help }) => help?.title),
    ).toEqual([
      "Como calculamos o resultado do mês",
      "O que o preço precisa pagar",
      "Como escolhemos a prioridade",
    ]);
    expect(historical.executiveSummary.answers.every(({ help }) => !help)).toBe(
      true,
    );
  });

  it.each([
    [
      "Product",
      () => presentProduct({ ...productCommand, monthlySalesVolume: null }),
    ],
    [
      "Production",
      () =>
        presentProduction({ ...productionCommand, monthlySalesVolume: null }),
    ],
  ])("derives a break-even reference for unknown-volume %s reports", (_name, build) => {
    const model = build();
    const minimum = model.indicators.find(({ key }) => key === "minimum");
    const margin = model.indicators.find(({ key }) => key === "margin");
    const sales = model.indicators.find(({ key }) => key === "sales");

    expect(minimum?.value).not.toBe("Ainda não calculado");
    expect(minimum?.supportingText).toMatch(/Referência com/);
    expect(margin).toMatchObject({
      value: "0%",
      tone: "neutral",
    });
    expect(margin?.supportingText).toMatch(/No ponto de equilíbrio/);
    expect(sales?.tone).toBe("neutral");
    expect(sales?.supportingText).toMatch(/Referência de equilíbrio/);
    expect(model.discountSimulationContext.breakEvenReference).not.toBeNull();
  });

  it("does not apply the scenario to a known month without sales", () => {
    const model = presentProduct({ ...productCommand, monthlySalesVolume: 0 });
    const margin = model.indicators.find(({ key }) => key === "margin");

    expect(margin?.tone).toBe("critical");
    expect(margin?.supportingText).toMatch(/Prejuízo de/);
    expect(model.discountSimulationContext.breakEvenReference).toBeNull();
  });

  it("keeps the persisted narrative on older content versions", () => {
    const currentSnapshot = buildProductReportSnapshot(
      { ...productCommand, monthlySalesVolume: null },
      calculateProductReport({ ...productCommand, monthlySalesVolume: null }),
    );
    const historical = toReportViewModel({
      id: 47,
      createdAt: "2026-09-01T15:00:00.000Z",
      snapshot: { ...currentSnapshot, contentVersion: 5 },
    });
    const margin = historical.indicators.find(({ key }) => key === "margin");
    const minimum = historical.indicators.find(({ key }) => key === "minimum");

    expect(margin?.value).toBe("Ainda não calculado");
    expect(minimum?.value).toBe("Ainda não calculado");
    expect(historical.discountSimulationContext.breakEvenReference).toBeNull();
  });

  it("keeps help understandable without accounting vocabulary", () => {
    const helpText = presentProduct({
      ...productCommand,
      monthlySalesVolume: null,
    })
      .indicators.flatMap(({ help }) =>
        help ? [help.title, help.description] : [],
      )
      .join(" ");

    expect(helpText).not.toMatch(/rateio|contribuição/i);
    expect(helpText).toContain("gastos do mês");
  });
});
