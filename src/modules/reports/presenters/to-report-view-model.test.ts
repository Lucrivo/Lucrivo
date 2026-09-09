import { describe, expect, it } from "vitest";

import type {
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
  NormalizedServiceDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import type { ReportSnapshot } from "../types";
import { toReportViewModel } from "./to-report-view-model";

const command: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
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

function present(input: NormalizedServiceDiagnosisCommand = command) {
  const snapshot = buildSnapshot(input);
  return toReportViewModel({
    id: 42,
    createdAt: "2026-08-28T22:30:00.000Z",
    snapshot,
  });
}

function buildSnapshot(input: NormalizedServiceDiagnosisCommand = command) {
  return buildServiceReportSnapshot(input, calculateServiceReport(input));
}

function presentProduct(input: ProductDiagnosisCommand = productCommand) {
  const snapshot = buildProductReportSnapshot(
    input,
    calculateProductReport(input),
  );

  return toReportViewModel({
    id: 42,
    createdAt: "2026-08-31T15:00:00.000Z",
    snapshot,
  });
}

function presentProduction(
  input: ProductionDiagnosisCommand = productionCommand,
) {
  const snapshot = buildProductionReportSnapshot(
    input,
    calculateProductionReport(input),
  );

  return toReportViewModel({
    id: 126,
    createdAt: "2026-09-01T15:00:00.000Z",
    snapshot,
  });
}

describe("toReportViewModel", () => {
  it("presents the normalized Service report without a target price", () => {
    const snapshot = buildSnapshot();
    const viewModel = present();

    expect(viewModel.identity).toEqual({
      id: 42,
      title: "Diagnóstico de Serviço",
      categoryLabel: "Serviço",
      scenarioLabel: "Por hora",
      createdAtLabel: "28/08/2026, 19:30",
      unitLabel: "hora",
    });
    expect(viewModel.executiveSummary).toEqual({
      ...snapshot.executiveSummary,
      verdict: {
        ...snapshot.executiveSummary.verdict,
        toneLabel: "Bom resultado",
      },
    });
    expect(
      viewModel.numbers.map(({ label, value }) => ({ label, value })),
    ).toEqual([
      { label: "Preço atual", value: "R$ 80,00" },
      { label: "Menor preço sem prejuízo", value: "R$ 50,21" },
      { label: "Quanto sobra a cada R$ 100", value: "R$ 34,26" },
      { label: "Quantidade de serviços por mês", value: "82 horas" },
    ]);
    expect(
      viewModel.numbers.filter(({ help }) => help).length,
    ).toBeGreaterThanOrEqual(2);
    expect(viewModel.numbers.map(({ label }) => label).join(" ")).not.toMatch(
      /meta|preço-alvo/i,
    );
    expect(viewModel.discountSimulationContext).toEqual({
      category: "service",
      usesAttentionBand: true,
    });
    expect(viewModel.language.isPlainLanguage).toBe(true);
    expect(viewModel).not.toHaveProperty("summary");
    expect(viewModel).not.toHaveProperty("nextActions");
  });

  it("explains an original monthly price through its hourly equivalent", () => {
    const viewModel = present({
      ...command,
      source: {
        ...command.source,
        pricingMethod: "month",
        currentPriceCents: 1039200,
      },
    });

    expect(viewModel.executiveSummary.facts[0].help).toMatchObject({
      title: "Por que mostramos o valor por hora?",
    });
    expect(viewModel.executiveSummary.facts[0].help?.description).toContain(
      "R$ 10.392,00 por mês",
    );
    expect(viewModel.executiveSummary.facts[0].help?.description).toContain(
      "R$ 80,00 por hora",
    );
  });

  it("renders nullable financial references as unavailable", () => {
    const current = buildSnapshot();
    const viewModel = toReportViewModel({
      id: 42,
      createdAt: "2026-08-28T22:30:00.000Z",
      snapshot: {
        ...current,
        schemaVersion: 3,
        calculationVersion: 2,
        contentVersion: 4,
        results: {
          ...current.results,
          realMarginBasisPoints: null,
          unitProfitCents: null,
          minimumPriceCents: null,
          targetPriceCents: null,
        },
      } as unknown as ReportSnapshot,
    });

    expect(viewModel.numbers).toContainEqual({
      key: "margin",
      label: "Quanto sobra a cada R$ 100",
      value: "Indisponível",
      help: expect.any(Object),
    });
    expect(viewModel.numbers).toContainEqual({
      key: "profit",
      label: "Quanto sobra por hora",
      value: "Indisponível",
    });
    expect(viewModel.numbers).toEqual(
      expect.arrayContaining([
        {
          key: "minimum",
          label: "Menor preço sem prejuízo",
          value: "Indisponível",
        },
        {
          key: "target",
          label: "Preço para alcançar a meta (15%)",
          value: "Indisponível",
          help: expect.any(Object),
        },
      ]),
    );
  });

  it("preserves all four normalized snapshot sections and semantic tone labels", () => {
    const viewModel = present();

    expect(viewModel.sections).toHaveLength(4);
    expect(viewModel.sections.map(({ key }) => key)).toEqual([
      "break_even",
      "margin_diagnosis",
      "sales_goal",
      "discount_simulator",
    ]);
    expect(viewModel.sections[0]).toEqual(
      expect.objectContaining({
        title: "Seu menor preço sem prejuízo",
        body: "Você cobra R$ 80,00, R$ 29,79 acima desse valor por hora.",
        tone: "positive",
        toneLabel: "Bom resultado",
      }),
    );
  });

  it("presents a complete Product report with category-specific numbers", () => {
    const viewModel = presentProduct();

    expect(viewModel.identity).toEqual({
      id: 42,
      title: "Diagnóstico de Produto",
      categoryLabel: "Produto",
      scenarioLabel: "Revenda",
      createdAtLabel: "31/08/2026, 12:00",
      unitLabel: "unidade",
    });
    expect(
      viewModel.numbers.map(({ label, value }) => ({ label, value })),
    ).toEqual([
      { label: "Preço atual", value: "R$ 100,00" },
      { label: "Quanto sobra a cada R$ 100", value: "12%" },
      { label: "Quanto sobra por unidade", value: "R$ 12,00" },
      { label: "Menor preço sem prejuízo", value: "R$ 86,96" },
      { label: "Preço para alcançar a meta (20%)", value: "R$ 111,12" },
    ]);
  });

  it("presents partial Product references without inventing real profit", () => {
    const viewModel = presentProduct({
      ...productCommand,
      monthlySalesVolume: null,
    });

    expect(
      viewModel.numbers.map(({ label, value }) => ({ label, value })),
    ).toEqual([
      { label: "Preço atual", value: "R$ 100,00" },
      { label: "Quanto sobra a cada R$ 100", value: "Indisponível" },
      {
        label: "Quanto sobra antes dos gastos mensais",
        value: "R$ 42,00",
      },
      {
        label: "Menor preço antes dos gastos mensais",
        value: "R$ 54,35",
      },
      {
        label: "Preço para a meta, sem gastos mensais",
        value: "R$ 69,45",
      },
    ]);
  });

  it("presents a complete Production report with manufacturing identity", () => {
    const viewModel = presentProduction();

    expect(viewModel.identity).toEqual({
      id: 126,
      title: "Diagnóstico de Produção",
      categoryLabel: "Produção",
      scenarioLabel: "Fabricação própria",
      createdAtLabel: "01/09/2026, 12:00",
      unitLabel: "unidade",
    });
    expect(
      viewModel.numbers.map(({ label, value }) => ({ label, value })),
    ).toEqual([
      { label: "Preço atual", value: "R$ 100,00" },
      { label: "Quanto sobra a cada R$ 100", value: "12%" },
      { label: "Quanto sobra por unidade", value: "R$ 12,00" },
      { label: "Menor preço sem prejuízo", value: "R$ 86,96" },
      { label: "Preço para alcançar a meta (20%)", value: "R$ 111,12" },
    ]);
    expect(viewModel.discountSimulationContext).toEqual({
      category: "production",
      usesAttentionBand: false,
    });
  });

  it("presents partial Production references without inventing real profit", () => {
    const viewModel = presentProduction({
      ...productionCommand,
      monthlySalesVolume: null,
    });

    expect(
      viewModel.numbers.map(({ label, value }) => ({ label, value })),
    ).toEqual([
      { label: "Preço atual", value: "R$ 100,00" },
      { label: "Quanto sobra a cada R$ 100", value: "Indisponível" },
      {
        label: "Quanto sobra antes dos gastos mensais",
        value: "R$ 42,00",
      },
      {
        label: "Menor preço antes dos gastos mensais",
        value: "R$ 54,35",
      },
      {
        label: "Preço para a meta, sem gastos mensais",
        value: "R$ 69,45",
      },
    ]);
  });

  it("keeps legacy labels for an older persisted report", () => {
    const current = buildSnapshot();
    const legacySnapshot = {
      ...current,
      contentVersion: 3,
      executiveSummary: {
        ...current.executiveSummary,
        headline: "A verdade por trás do preço.",
        verdict: {
          ...current.executiveSummary.verdict,
          label: "Margem adequada",
        },
      },
    } as unknown as ReportSnapshot;
    const legacy = toReportViewModel({
      id: 43,
      createdAt: "2026-08-28T22:30:00.000Z",
      snapshot: legacySnapshot,
    });

    expect(legacy.language.reportEyebrow).toBe("Seu relatório financeiro");
    expect(legacy.executiveSummary.verdict.toneLabel).toBe("Situação positiva");
    expect(legacy.numbers.map(({ label }) => label)).toEqual([
      "Preço atual",
      "Margem real",
      "Lucro por hora",
      "Preço mínimo",
      "Preço-alvo (15%)",
    ]);
    expect(legacy.numbers.every(({ help }) => help === undefined)).toBe(true);
  });

  it("keeps the V4 target-based presentation unchanged", () => {
    const current = buildSnapshot();
    const v4 = toReportViewModel({
      id: 44,
      createdAt: "2026-08-28T22:30:00.000Z",
      snapshot: {
        ...current,
        schemaVersion: 3,
        calculationVersion: 2,
        contentVersion: 4,
      } as unknown as ReportSnapshot,
    });

    expect(v4.numbers.map(({ label }) => label)).toEqual([
      "Preço atual",
      "Quanto sobra a cada R$ 100",
      "Quanto sobra por hora",
      "Menor preço sem prejuízo",
      "Preço para alcançar a meta (15%)",
    ]);
    expect(v4.discountSimulationContext).toEqual({
      category: "service",
      usesAttentionBand: false,
    });
  });
});
