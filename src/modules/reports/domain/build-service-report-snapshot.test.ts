import { describe, expect, it } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { calculateServiceReport } from "./calculate-service-report";
import { buildServiceReportSnapshot } from "./build-service-report-snapshot";

const command: NormalizedServiceDiagnosisCommand = {
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
  materialUnitCostCents: 1_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "appointment",
    currentPriceCents: 8_000,
    materialCostUnit: "appointment",
    materialCostCents: 1_000,
    dailyWorkMinutes: 480,
    appointmentDurationMinutes: 50,
  },
};

function build(input = command) {
  return buildServiceReportSnapshot(input, calculateServiceReport(input));
}

describe("buildServiceReportSnapshot", () => {
  it("builds the Service 4/3/6 contract with direct summary language", () => {
    const snapshot = build();
    expect(snapshot).toMatchObject({
      schemaVersion: 4,
      calculationVersion: 3,
      contentVersion: 6,
      results: { verdict: "positive_result" },
    });
    expect(snapshot).not.toHaveProperty("policy.targetMarginBasisPoints");
    expect(snapshot.results).not.toHaveProperty("targetPriceCents");
    expect(snapshot.executiveSummary.facts.map(({ key }) => key)).toEqual([
      "price",
      "margin",
    ]);
  });

  it("uses objective complete-cost labels", () => {
    const snapshot = build();
    const content = JSON.stringify(snapshot);
    expect(content).toContain("Menor preço para não ficar no prejuízo");
    expect(content).toContain("Custo completo");
    expect(content).toContain("Resultado por serviço");
    expect(content).toContain("Quanto sobra a cada R$ 100");
    expect(content).toContain("Resultado positivo");
    expect(
      snapshot.sections.find(({ key }) => key === "sales_goal"),
    ).toMatchObject({
      title: "Quanto você precisa vender",
      emphasisLabel: "Faturamento necessário no mês",
      emphasisValue: "R$ 7.547,17",
    });
  });

  it("keeps complete values unavailable without capacity", () => {
    const snapshot = build({
      ...command,
      monthlyWorkMinutes: 0,
      workPeriodMinutes: 0,
      source: { ...command.source, dailyWorkMinutes: 0 },
    });
    expect(snapshot.results).toMatchObject({
      unitCostCents: null,
      unitProfitCents: null,
      realMarginBasisPoints: null,
      minimumPriceCents: null,
    });
  });

  it("contains no target-based or margin-quality language", () => {
    expect(JSON.stringify(build())).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 15%|meta de 20%|preço-alvo/i,
    );
  });
});
