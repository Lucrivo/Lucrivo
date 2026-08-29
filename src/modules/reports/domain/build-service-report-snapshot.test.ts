import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { calculateServiceReport } from "./calculate-service-report";
import { buildServiceReportSnapshot } from "./build-service-report-snapshot";

const baseCommand: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "appointment",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 0,
  minuteRateCents: 0,
  appointmentRateCents: 8000,
  appointmentDurationMinutes: 50,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

function build(command: ServiceDiagnosisCommand) {
  return buildServiceReportSnapshot(command, calculateServiceReport(command));
}

describe("buildServiceReportSnapshot", () => {
  it.each([
    {
      name: "Hour",
      command: {
        ...baseCommand,
        pricingMethod: "hour" as const,
        hourlyRateCents: 8000,
        appointmentRateCents: 0,
        appointmentDurationMinutes: 0,
      },
      expectedBodies: [
        "Abaixo de R$ 65,22 por hora você vende no prejuízo. Seu preço de R$ 80,00 cobre o custo.",
        "Só 100h/mês são realmente pagas — é sobre elas que caem seus custos. Por isso a hora custa R$ 60,00, não o que você imagina. É com esse número que a conta fecha.",
        "O preço é suficiente para alcançar a meta.",
        "Para cobrir seus custos fixos (pró-labore incluído), sua meta é de 82 horas por mês, 19 por semana e 4 por dia.",
        "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
      ],
    },
    {
      name: "Minute",
      command: {
        ...baseCommand,
        pricingMethod: "minute" as const,
        minuteRateCents: 250,
        appointmentRateCents: 0,
        appointmentDurationMinutes: 40,
      },
      expectedBodies: [
        "Abaixo de R$ 43,48 por atendimento você vende no prejuízo. Seu preço de R$ 100,00 cobre o custo.",
        "Só 100h/mês são realmente pagas — é sobre elas que caem seus custos. Por isso a hora custa R$ 60,00, não o que você imagina. É com esse número que a conta fecha.",
        "Há folga; valide a aceitação do mercado.",
        "Para cobrir seus custos fixos (pró-labore incluído), sua meta é de 66 atendimentos por mês, 16 por semana e 4 por dia.",
        "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
      ],
    },
    {
      name: "Appointment",
      command: baseCommand,
      expectedBodies: [
        "Abaixo de R$ 54,35 por atendimento você vende no prejuízo. Seu preço de R$ 80,00 cobre o custo.",
        "Só 100h/mês são realmente pagas — é sobre elas que caem seus custos. Por isso a hora custa R$ 60,00, não o que você imagina. É com esse número que a conta fecha.",
        "Há folga; valide a aceitação do mercado.",
        "Para cobrir seus custos fixos (pró-labore incluído), sua meta é de 82 atendimentos por mês, 19 por semana e 4 por dia.",
        "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
      ],
    },
  ])(
    "builds exact $name copy in the approved order",
    ({ command, expectedBodies }) => {
      const snapshot = build(command);

      expect(snapshot).toEqual(
        expect.objectContaining({
          schemaVersion: 1,
          calculationVersion: 1,
          contentVersion: 1,
          category: "service",
          scenario: command.pricingMethod,
          currency: "BRL",
        }),
      );
      expect(snapshot.sections.map(({ key }) => key)).toEqual([
        "break_even",
        "hidden_cost",
        "margin_diagnosis",
        "sales_goal",
        "discount_simulator",
      ]);
      expect(snapshot.sections.map(({ body }) => body)).toEqual(expectedBodies);
      expect(snapshot.sections[4]).toEqual(
        expect.objectContaining({
          title: "Quanto de desconto eu consigo dar sem destruir minha margem?",
          body: "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
        }),
      );
    },
  );

  it("marks a loss as critical and tells the user to correct price first", () => {
    const snapshot = build({ ...baseCommand, appointmentRateCents: 4000 });

    expect(snapshot.sections[0].tone).toBe("critical");
    expect(snapshot.sections[2]).toEqual(
      expect.objectContaining({
        emphasisValue: "Preço não cobre a operação",
        body: "O preço atual não cobre toda a operação.",
        tone: "critical",
      }),
    );
    expect(snapshot.sections[3]).toEqual(
      expect.objectContaining({
        body: "Seu preço atual não sustenta a operação. Corrija o preço antes de buscar mais volume.",
        tone: "critical",
      }),
    );
    expect(snapshot.sections[3].body).not.toContain("sua meta é de");
  });

  it("marks a positive margin below tolerance as warning", () => {
    const snapshot = build({ ...baseCommand, appointmentRateCents: 6000 });

    expect(snapshot.sections[2]).toEqual(
      expect.objectContaining({
        emphasisValue: "Margem apertada",
        body: "O preço cobre os custos, mas sobra menos que o desejado.",
        tone: "warning",
      }),
    );
  });

  it("stores normalized inputs, results, policy, and simulator base", () => {
    const calculation = calculateServiceReport(baseCommand);
    const snapshot = buildServiceReportSnapshot(baseCommand, calculation);

    expect(snapshot.inputs).toEqual(
      expect.objectContaining({
        desiredMonthlyIncomeCents: 400000,
        appointmentRateCents: 8000,
      }),
    );
    expect(snapshot.results).toEqual(
      expect.objectContaining({
        currentPriceCents: 8000,
        unitProfitCents: 2360,
        realMarginBasisPoints: 2950,
      }),
    );
    expect(snapshot.policy).toEqual({
      targetMarginBasisPoints: 1500,
      weeklyDivisorHundredths: 433,
      maximumDiscountPercent: 50,
      proLaboreIncluded: true,
    });
    expect(snapshot.discountSimulationBase).toEqual({
      originalPriceCents: 8000,
      unitCostCents: 5000,
      totalFeeBasisPoints: 800,
      targetMarginBasisPoints: 1500,
      minimumPriceCents: 5435,
    });
  });
});
