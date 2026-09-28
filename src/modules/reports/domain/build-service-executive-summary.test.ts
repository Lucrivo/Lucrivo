import { describe, expect, it } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";
import { buildServiceExecutiveSummary } from "./build-service-executive-summary";
import { calculateServiceReport } from "./calculate-service-report";

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

describe("buildServiceExecutiveSummary", () => {
  it("puts current and minimum prices before objective result values", () => {
    const summary = buildServiceExecutiveSummary(
      command,
      calculateServiceReport(command),
    );
    expect(summary.facts.map(({ key }) => key)).toEqual(["price", "margin"]);
    expect(summary.facts[0].referenceLabel).toBe(
      "Menor preço para não ficar no prejuízo",
    );
    expect(summary.facts[1].referenceLabel).toBe("Quanto sobra a cada R$ 100");
  });

  it("describes any positive result without a quality judgment", () => {
    const summary = buildServiceExecutiveSummary(
      command,
      calculateServiceReport(command),
    );
    expect(summary.verdict.label).toBe("Resultado positivo");
    expect(JSON.stringify(summary)).not.toMatch(
      /margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 15%|preço-alvo/i,
    );
  });
});
