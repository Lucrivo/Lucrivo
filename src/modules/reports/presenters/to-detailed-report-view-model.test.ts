import { describe, expect, it } from "vitest";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";

import { buildDetailedReportSnapshot } from "../domain/build-detailed-report-snapshot";
import { toDetailedReportViewModel } from "./to-detailed-report-view-model";

const baseCommand: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 10_000,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 500,
  cardFeeRateBasisPoints: 250,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 20,
      purchaseUnitCostCents: 1_500,
      packagingUnitCostCents: 200,
    },
  ],
};

function snapshotFor(command: DetailedDiagnosisCommand) {
  return buildDetailedReportSnapshot(
    command,
    calculateDetailedDiagnosis(command),
  );
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("toDetailedReportViewModel", () => {
  it("presents a complete result in plain language without changing values", () => {
    const snapshot = snapshotFor(baseCommand);
    const before = structuredClone(snapshot);
    deepFreeze(snapshot);

    const model = toDetailedReportViewModel({
      id: 168,
      createdAt: "2026-09-17T15:00:00.000Z",
      snapshot,
    });

    expect(model.conclusion).toMatchObject({
      title: "O mix cobre os gastos com folga",
      completenessLabel: "Análise completa",
    });
    expect(model.metrics.map((metric) => metric.label)).toEqual([
      "Quanto entrou com as vendas",
      "Quanto sobrou ou faltou no mês",
      "Quanto precisa vender para cobrir os gastos",
    ]);
    expect(model.items[0]?.rawValues).toEqual({
      unitSalePriceCents: snapshot.inputs.items[0]?.unitSalePriceCents,
      variableUnitCostCents: snapshot.results.items[0]?.variableUnitCostCents,
    });
    expect(snapshot).toEqual(before);
  });

  it("explains unavailable monthly values in a partial report", () => {
    const command = {
      ...baseCommand,
      items: [{ ...baseCommand.items[0]!, monthlySalesVolume: null }],
    };
    const model = toDetailedReportViewModel({
      id: 169,
      createdAt: "2026-09-17T15:00:00.000Z",
      snapshot: snapshotFor(command),
    });

    expect(model.conclusion.completenessLabel).toBe("Análise parcial");
    expect(model.priority.title).toMatch(/Falta informar/i);
    expect(model.metrics[0]).toMatchObject({
      valueLabel: "Ainda não calculado",
      unavailableReason: "Informe as vendas mensais para calcular.",
    });
  });

  it("places direct loss first and keeps item status explicit", () => {
    const command = {
      ...baseCommand,
      items: [
        {
          ...baseCommand.items[0]!,
          purchaseUnitCostCents: 5_500,
          packagingUnitCostCents: 500,
        },
      ],
    };
    const model = toDetailedReportViewModel({
      id: 170,
      createdAt: "2026-09-17T15:00:00.000Z",
      snapshot: snapshotFor(command),
    });

    expect(model.conclusion.tone).toBe("critical");
    expect(model.priority.title).toMatch(/não se paga por venda/i);
    expect(model.items[0]).toMatchObject({
      statusLabel: "Perda por venda",
      statusTone: "critical",
    });
  });
});
