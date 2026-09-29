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
  it("presents Service values without a target or simulator mode", () => {
    const model = presentService();

    expect(model.identity).toMatchObject({
      title: "Diagnóstico de Serviço",
      categoryLabel: "Serviço",
      scenarioLabel: "Por hora",
      unitLabel: "hora",
    });
    expect(model.executiveSummary.verdict.toneLabel).toBe("Resultado positivo");
    expect(model.numbers.map(({ key }) => key)).toEqual([
      "sales",
      "price",
      "minimum",
      "profit",
      "margin",
    ]);
    expect(model.numbers.at(-1)).toMatchObject({
      label: "Quanto sobra a cada R$ 100",
      value: "34,26%",
    });
    expect(model.discountSimulationContext).toEqual({ category: "service" });
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

    expect(model.numbers[1]?.help?.description).toContain(
      "R$ 10.392,00 por mês",
    );
    expect(model.numbers[1]?.help?.description).toContain("R$ 80,00 por hora");
  });

  it("presents complete Product and Production reports objectively", () => {
    for (const model of [presentProduct(), presentProduction()]) {
      expect(
        model.numbers.map(({ label, value }) => ({ label, value })),
      ).toEqual([
        {
          label: "Vendas necessárias no mês",
          value:
            model.identity.categoryLabel === "Produto"
              ? "72 vendas"
              : "72 unidades",
        },
        { label: "Preço atual", value: "R$ 100,00" },
        {
          label: "Menor preço para não ficar no prejuízo",
          value: "R$ 86,96",
        },
        { label: "Quanto sobra a cada R$ 100", value: "12%" },
        { label: "Resultado do mês", value: "R$ 1.200,00" },
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
  ])(
    "does not invent complete values for partial %s reports",
    (_name, build) => {
      const model = build();
      const minimum = model.numbers.find(({ key }) => key === "minimum");
      const margin = model.numbers.find(({ key }) => key === "margin");
      const result = model.numbers.find(({ key }) => key === "profit");

      expect(minimum).toMatchObject({
        value: "Ainda não calculado",
        supportingText:
          "Informe uma quantidade maior que zero para dividir os gastos do mês.",
      });
      expect(margin).toMatchObject({
        value: "Ainda não calculado",
        supportingText: "Informe uma quantidade maior que zero para calcular.",
      });
      expect(result).toMatchObject({
        value: "Ainda não calculado",
        supportingText:
          "Informe uma quantidade para calcular o resultado do mês.",
      });
      expect(JSON.stringify([minimum, margin, result])).not.toContain(
        "R$ 0,00",
      );
    },
  );

  it("keeps help understandable without accounting vocabulary", () => {
    const helpText = presentProduct({
      ...productCommand,
      monthlySalesVolume: null,
    })
      .numbers.flatMap(({ help }) =>
        help ? [help.title, help.description] : [],
      )
      .join(" ");

    expect(helpText).not.toMatch(/rateio|contribuição/i);
    expect(helpText).toContain("dividir os gastos do mês");
  });
});
