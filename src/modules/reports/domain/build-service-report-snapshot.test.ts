import { describe, expect, it } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { calculateServiceReport } from "./calculate-service-report";
import { buildServiceReportSnapshot } from "./build-service-report-snapshot";

const baseCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 3_079,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "month",
    currentPriceCents: 400_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};

function build(command: NormalizedServiceDiagnosisCommand = baseCommand) {
  return buildServiceReportSnapshot(command, calculateServiceReport(command));
}

describe("buildServiceReportSnapshot", () => {
  it("builds the normalized current contract in the approved order", () => {
    const snapshot = build();

    expect(snapshot).toEqual(
      expect.objectContaining({
        schemaVersion: 4,
        calculationVersion: 3,
        contentVersion: 5,
        category: "service",
        scenario: "month",
        currency: "BRL",
        unit: "hour",
        source: baseCommand.source,
      }),
    );
    expect(snapshot.executiveSummary.facts.map(({ key }) => key)).toEqual([
      "price",
      "margin",
    ]);
    expect(snapshot.sections.map(({ key }) => key)).toEqual([
      "break_even",
      "margin_diagnosis",
      "sales_goal",
      "discount_simulator",
    ]);
  });

  it("uses the minimum price and concise sales copy", () => {
    const snapshot = build();

    expect(snapshot.sections[0]).toEqual(
      expect.objectContaining({
        title: "Seu menor preço sem prejuízo",
        emphasisLabel: "Menor preço sem prejuízo",
      }),
    );
    expect(snapshot.sections[1].title).toBe("Quanto sobra no preço");
    expect(snapshot.sections[2]).toEqual(
      expect.objectContaining({
        title: "Quanto você precisa vender",
        emphasisLabel: "Por mês",
      }),
    );
  });

  it("stores canonical inputs beside the original answers", () => {
    const snapshot = build();

    expect(snapshot.inputs).toEqual(
      expect.objectContaining({
        workHoursPeriod: "day",
        workPeriodMinutes: 360,
        monthlyWorkMinutes: 7_794,
        hourlyRateCents: 3_079,
        materialUnitCostCents: 0,
      }),
    );
    expect(snapshot.results.currentPriceCents).toBe(3_079);
    expect(snapshot.source).toEqual(baseCommand.source);
  });

  it("makes current and minimum prices explicit for a loss", () => {
    const command = {
      ...baseCommand,
      hourlyRateCents: 1_000,
      source: { ...baseCommand.source, currentPriceCents: 129_900 },
    };
    const snapshot = build(command);

    expect(snapshot.executiveSummary.verdict.label).toBe("Prejuízo");
    expect(snapshot.executiveSummary.facts[0]).toEqual(
      expect.objectContaining({
        currentValue: "R$ 10,00",
        referenceLabel: "Menor preço sem prejuízo",
      }),
    );
    expect(snapshot.sections[0].body).toContain("Você cobra R$ 10,00");
  });

  it("does not persist forbidden main-copy terms or the removed card", () => {
    const snapshot = build();
    const content = JSON.stringify({
      executiveSummary: snapshot.executiveSummary,
      sections: snapshot.sections,
    });

    expect(content).not.toMatch(
      /meta de 15%|preço-alvo|pró-labore|alíquota|rateio|A conta que ninguém faz/i,
    );
  });
});
