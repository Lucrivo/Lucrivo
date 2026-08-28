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
  const snapshot = buildServiceReportSnapshot(
    input,
    calculateServiceReport(input),
  );
  return toReportViewModel({
    id: 42,
    createdAt: "2026-08-28T22:30:00.000Z",
    snapshot,
  });
}

describe("toReportViewModel", () => {
  it("formats identity, summary, references, and next actions", () => {
    const viewModel = present();

    expect(viewModel.identity).toEqual({
      id: 42,
      title: "Diagnóstico de Serviço",
      categoryLabel: "Serviço",
      scenarioLabel: "Por hora",
      createdAtLabel: "28/08/2026, 19:30",
      unitLabel: "hora",
    });
    expect(viewModel.summary).toEqual({
      verdict: {
        label: "Margem adequada",
        description: "O preço é suficiente para alcançar a meta.",
        tone: "positive",
        toneLabel: "Situação positiva",
      },
      priority: {
        label: "Volume",
        description:
          "Seu preço se sustenta. Agora transforme a meta em rotina comercial.",
      },
      metrics: [
        { key: "price", label: "Preço atual", value: "R$ 80,00" },
        { key: "margin", label: "Margem real", value: "17%" },
        { key: "profit", label: "Lucro por hora", value: "R$ 13,60" },
      ],
    });
    expect(viewModel.priceReferences).toEqual([
      { key: "minimum", label: "Preço mínimo", value: "R$ 65,22" },
      { key: "target", label: "Preço-alvo (15%)", value: "R$ 77,93" },
    ]);
    expect(viewModel.nextActions).toEqual([
      "Use a meta mensal como referência para sua agenda.",
      "Acompanhe ocupação e recorrência antes de conceder descontos.",
    ]);
  });

  it("renders nullable financial references as unavailable", () => {
    const viewModel = present({ ...command, monthlyWorkMinutes: 0 });

    expect(viewModel.summary.metrics).toContainEqual({
      key: "margin",
      label: "Margem real",
      value: "Indisponível",
    });
    expect(viewModel.summary.metrics).toContainEqual({
      key: "profit",
      label: "Lucro por hora",
      value: "Indisponível",
    });
    expect(viewModel.priceReferences).toEqual([
      { key: "minimum", label: "Preço mínimo", value: "Indisponível" },
      { key: "target", label: "Preço-alvo (15%)", value: "Indisponível" },
    ]);
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

  it.each([
    ["price", "Preço", "Corrija o preço antes de buscar mais volume."],
    ["margin", "Margem", "Aproxime seu preço da margem-alvo de 15%."],
    ["volume", "Volume", "Use a meta mensal como referência para sua agenda."],
  ] as const)(
    "maps %s priority to user-facing guidance",
    (priority, label, firstAction) => {
      const viewModel = present();
      const changed = toReportViewModel({
        id: viewModel.identity.id,
        createdAt: "2026-08-28T22:30:00.000Z",
        snapshot: {
          ...buildServiceReportSnapshot(
            command,
            calculateServiceReport(command),
          ),
          results: {
            ...buildServiceReportSnapshot(
              command,
              calculateServiceReport(command),
            ).results,
            priority,
          },
        },
      });

      expect(changed.summary.priority.label).toBe(label);
      expect(changed.nextActions[0]).toBe(firstAction);
    },
  );
});
