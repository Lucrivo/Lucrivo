import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "./to-report-view-model";

const command: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

function present(input: ServiceDiagnosisCommand = command) {
  const snapshot = buildSnapshot(input);
  return toReportViewModel({
    id: 42,
    createdAt: "2026-08-28T22:30:00.000Z",
    snapshot,
  });
}

function buildSnapshot(input: ServiceDiagnosisCommand = command) {
  return buildServiceReportSnapshot(input, calculateServiceReport(input));
}

describe("toReportViewModel", () => {
  it("formats identity, persisted summary, and five report numbers", () => {
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
        toneLabel: "Situação positiva",
      },
    });
    expect(viewModel.numbers).toEqual([
      { key: "price", label: "Preço atual", value: "R$ 80,00" },
      { key: "margin", label: "Margem real", value: "17%" },
      { key: "profit", label: "Lucro por hora", value: "R$ 13,60" },
      { key: "minimum", label: "Preço mínimo", value: "R$ 65,22" },
      { key: "target", label: "Preço-alvo (15%)", value: "R$ 77,93" },
    ]);
    expect(viewModel).not.toHaveProperty("summary");
    expect(viewModel).not.toHaveProperty("nextActions");
  });

  it("renders nullable financial references as unavailable", () => {
    const viewModel = present({ ...command, monthlyWorkMinutes: 0 });

    expect(viewModel.numbers).toContainEqual({
      key: "margin",
      label: "Margem real",
      value: "Indisponível",
    });
    expect(viewModel.numbers).toContainEqual({
      key: "profit",
      label: "Lucro por hora",
      value: "Indisponível",
    });
    expect(viewModel.numbers).toEqual(
      expect.arrayContaining([
        { key: "minimum", label: "Preço mínimo", value: "Indisponível" },
        { key: "target", label: "Preço-alvo (15%)", value: "Indisponível" },
      ]),
    );
  });

  it("preserves all five resolved snapshot sections and semantic tone labels", () => {
    const viewModel = present();

    expect(viewModel.sections).toHaveLength(5);
    expect(viewModel.sections.map(({ key }) => key)).toEqual([
      "break_even",
      "hidden_cost",
      "margin_diagnosis",
      "sales_goal",
      "discount_simulator",
    ]);
    expect(viewModel.sections[0]).toEqual(
      expect.objectContaining({
        title: "1 · Ponto de equilíbrio",
        body: "Abaixo de R$ 65,22 por hora você vende no prejuízo. Seu preço de R$ 80,00 cobre o custo.",
        tone: "positive",
        toneLabel: "Situação positiva",
      }),
    );
  });
});
