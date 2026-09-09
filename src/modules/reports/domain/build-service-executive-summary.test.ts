import { describe, expect, it } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { calculateServiceReport } from "./calculate-service-report";
import { buildServiceExecutiveSummary } from "./build-service-executive-summary";

const baseCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "appointment",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 480,
  monthlyWorkMinutes: 10_392,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8_000,
  appointmentDurationMinutes: 50,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "appointment",
    currentPriceCents: 8_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 480,
    appointmentDurationMinutes: 50,
  },
};

function build(command: NormalizedServiceDiagnosisCommand) {
  return buildServiceExecutiveSummary(command, calculateServiceReport(command));
}

describe("buildServiceExecutiveSummary", () => {
  it("puts current and minimum prices before the amount left", () => {
    const summary = build(baseCommand);

    expect(summary.facts).toEqual([
      expect.objectContaining({
        key: "price",
        currentLabel: "Você cobra",
        currentValue: "R$ 80,00",
        referenceLabel: "Menor preço sem prejuízo",
      }),
      expect.objectContaining({
        key: "margin",
        currentLabel: "Quanto sobra a cada R$ 100",
        referenceLabel: "Leitura",
        referenceValue: "Boa folga",
      }),
    ]);
  });

  it.each([
    [3_000, "Prejuízo", "critical"],
    [3_600, "Pouca folga", "warning"],
    [8_000, "Boa folga", "positive"],
  ] as const)(
    "uses plain-language reading for price %s",
    (appointmentRateCents, label, tone) => {
      const command = {
        ...baseCommand,
        appointmentRateCents,
        source: {
          ...baseCommand.source,
          currentPriceCents: appointmentRateCents,
        },
      };
      const summary = build(command);

      expect(summary.verdict).toEqual(expect.objectContaining({ label, tone }));
      expect(summary.facts[1].referenceValue).toBe(label);
    },
  );

  it.each([
    [
      { desiredMonthlyIncomeCents: 700_000 },
      "Quanto você quer receber por mês",
    ],
    [
      {
        desiredMonthlyIncomeCents: 100_000,
        fixedMonthlyExpensesCents: 800_000,
      },
      "Gastos que existem todo mês",
    ],
    [
      {
        desiredMonthlyIncomeCents: 100_000,
        fixedMonthlyExpensesCents: 100_000,
        materialUnitCostCents: 5_000,
      },
      "Materiais usados",
    ],
    [
      {
        desiredMonthlyIncomeCents: 100_000,
        fixedMonthlyExpensesCents: 100_000,
        taxRateBasisPoints: 5_000,
        cardFeeRateBasisPoints: 4_000,
      },
      "Impostos e taxas",
    ],
  ] as const)(
    "highlights the largest financial weight %#",
    (override, label) => {
      const command = {
        ...baseCommand,
        ...override,
        appointmentRateCents: 4_000,
        source: { ...baseCommand.source, currentPriceCents: 4_000 },
      };

      expect(build(command).priority.label).toBe(label);
    },
  );

  it("uses deterministic tie order", () => {
    const command = {
      ...baseCommand,
      desiredMonthlyIncomeCents: 300_000,
      fixedMonthlyExpensesCents: 300_000,
      appointmentRateCents: 3_500,
      source: { ...baseCommand.source, currentPriceCents: 3_500 },
    };

    expect(build(command).priority.label).toBe(
      "Quanto você quer receber por mês",
    );
  });

  it("keeps sales volume as the healthy priority", () => {
    expect(build(baseCommand).priority.label).toBe("Quantidade de serviços");
  });

  it("keeps forbidden technical and target wording out", () => {
    const content = JSON.stringify(build(baseCommand));

    expect(content).not.toMatch(
      /meta de 15%|preço-alvo|pró-labore|alíquota|rateio|A conta que ninguém faz/i,
    );
  });
});
