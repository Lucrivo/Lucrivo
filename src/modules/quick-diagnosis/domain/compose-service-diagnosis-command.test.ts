import { describe, expect, it } from "vitest";

import type { ServiceFlowSubmissionInput } from "./service-flow";
import { composeServiceDiagnosisCommand } from "./compose-service-diagnosis-command";

const submissionId = "550e8400-e29b-41d4-a716-446655440000";

function makeSubmission(
  overrides: Partial<ServiceFlowSubmissionInput> = {},
): ServiceFlowSubmissionInput {
  return {
    submissionId,
    desiredMonthlyIncome: "5000",
    fixedMonthlyExpenses: "2000",
    pricingMethod: "hour",
    currentPrice: "30.79",
    dailyWorkHours: "6",
    weeklyWorkDays: "5",
    appointmentDurationMinutes: "",
    hasMaterialCost: false,
    materialCost: "",
    materialCostUnit: "",
    paysRevenueTax: false,
    taxRate: "",
    hasPaymentFee: false,
    paymentFeeRate: "",
    ...overrides,
  };
}

describe("composeServiceDiagnosisCommand", () => {
  it.each([
    ["minute", "0.51", 3_060],
    ["hour", "30.79", 3_079],
    ["day", "184.75", 3_079],
    ["week", "923.70", 3_079],
    ["month", "4000.00", 3_079],
  ] as const)(
    "normalizes %s billing once to cents",
    (pricingMethod, currentPrice, expected) => {
      const command = composeServiceDiagnosisCommand(
        makeSubmission({ pricingMethod, currentPrice }),
      );

      expect(command.pricingMethod).toBe("hour");
      expect(command.hourlyRateCents).toBe(expected);
      expect(command.monthlyWorkMinutes).toBe(7_794);
      expect(command.source).toMatchObject({
        pricingMethod,
        currentPriceCents: Math.round(Number(currentPrice) * 100),
        dailyWorkMinutes: 360,
      });
    },
  );

  it("keeps appointment billing canonical per appointment", () => {
    const command = composeServiceDiagnosisCommand(
      makeSubmission({
        pricingMethod: "appointment",
        currentPrice: "80",
        appointmentDurationMinutes: "30",
      }),
    );

    expect(command).toMatchObject({
      pricingMethod: "appointment",
      hourlyRateCents: 0,
      minuteRateCents: 0,
      appointmentRateCents: 8_000,
      appointmentDurationMinutes: 30,
      source: {
        pricingMethod: "appointment",
        currentPriceCents: 8_000,
        appointmentDurationMinutes: 30,
      },
    });
  });

  it.each([
    ["appointment", "20", "30", 4_000],
    ["hour", "20", "", 2_000],
    ["day", "120", "", 2_000],
    ["month", "2598", "", 2_000],
  ] as const)(
    "normalizes %s material into an hourly command",
    (materialCostUnit, materialCost, appointmentDurationMinutes, expected) => {
      const command = composeServiceDiagnosisCommand(
        makeSubmission({
          hasMaterialCost: true,
          materialCost,
          materialCostUnit,
          appointmentDurationMinutes,
        }),
      );

      expect(command.materialUnitCostCents).toBe(expected);
      expect(command.source.materialCostUnit).toBe(materialCostUnit);
      expect(command.source.materialCostCents).toBe(
        Math.round(Number(materialCost) * 100),
      );
    },
  );

  it.each([
    ["appointment", "20", 2_000],
    ["hour", "40", 2_000],
    ["day", "240", 2_000],
    ["month", "5196", 2_000],
  ] as const)(
    "normalizes %s material into an appointment command",
    (materialCostUnit, materialCost, expected) => {
      const command = composeServiceDiagnosisCommand(
        makeSubmission({
          pricingMethod: "appointment",
          currentPrice: "80",
          appointmentDurationMinutes: "30",
          hasMaterialCost: true,
          materialCost,
          materialCostUnit,
        }),
      );

      expect(command.materialUnitCostCents).toBe(expected);
    },
  );

  it("rounds a half cent up only at the final conversion", () => {
    const command = composeServiceDiagnosisCommand(
      makeSubmission({ pricingMethod: "day", currentPrice: "0.01" }),
    );

    expect(command.hourlyRateCents).toBe(0);

    const materialCommand = composeServiceDiagnosisCommand(
      makeSubmission({
        hasMaterialCost: true,
        materialCost: "0.01",
        materialCostUnit: "appointment",
        appointmentDurationMinutes: "40",
      }),
    );
    expect(materialCommand.materialUnitCostCents).toBe(2);
  });

  it("zeros optional costs that the user said do not apply", () => {
    const command = composeServiceDiagnosisCommand(
      makeSubmission({
        materialCost: "99",
        materialCostUnit: "hour",
        taxRate: "8",
        paymentFeeRate: "4",
      }),
    );

    expect(command).toMatchObject({
      materialUnitCostCents: 0,
      taxRateBasisPoints: 0,
      cardFeeRateBasisPoints: 0,
      source: {
        materialCostUnit: null,
        materialCostCents: 0,
      },
    });
  });
});
