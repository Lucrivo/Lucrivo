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
  taxRateBasisPoints: 0,
  cardFeeRateBasisPoints: 0,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Caneca",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 20,
      purchaseUnitCostCents: 2_000,
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

    expect(model.executiveSummary.headline).toBe("Seus produtos dão lucro?");
    expect(model.numbers.map((number) => number.label)).toEqual([
      "Quanto entrou com as vendas",
      "Custos do mês",
      "Resultado do mês",
      "Quanto sobra a cada R$ 100",
      "Quanto precisa vender para cobrir os gastos",
    ]);
    expect(model.sections.map((section) => section.key)).toEqual([
      "break_even",
      "hidden_cost",
      "margin_diagnosis",
      "sales_goal",
    ]);
    expect(model.items[0]?.discountSimulationBase).toEqual({
      originalPriceCents: 5_000,
      unitCostCents: 2_200,
      totalFeeBasisPoints: 0,
      attentionBandBasisPoints: 2_000,
      minimumPriceCents: 2_200,
      partial: true,
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

    expect(model.executiveSummary.verdict.label).toMatch(/Falta informar/i);
    expect(model.numbers[0]).toMatchObject({
      value: "Ainda não calculado",
      supportingText: "Informe as vendas mensais para calcular.",
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

    expect(model.executiveSummary.verdict.tone).toBe("critical");
    expect(model.executiveSummary.priority.body).toMatch(/preços e os gastos/i);
    expect(model.items[0]).toMatchObject({
      statusLabel: "Perda por venda",
      statusTone: "critical",
    });
  });
});
