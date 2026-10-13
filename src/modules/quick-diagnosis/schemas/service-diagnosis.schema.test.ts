import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisInput } from "../types";
import {
  serviceDiagnosisSchema,
  validateServiceDiagnosisFields,
} from "./service-diagnosis.schema";

const validHour: ServiceDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncome: "R$ 5.000,25",
  fixedMonthlyExpenses: "1.234,56",
  workHoursPeriod: "month",
  workHours: "160,5",
  weeklyWorkDays: "5",
  hourlyRate: "125,90",
  minuteRate: "",
  appointmentRate: "",
  appointmentDurationMinutes: "",
  hasMaterialCost: false,
  materialUnitCost: "",
  taxRate: "6,25",
  cardFeeRate: "3.50",
};

function issuePaths(input: ServiceDiagnosisInput): string[] {
  const result = serviceDiagnosisSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) return [];
  return result.error.issues.map((issue) => String(issue.path[0]));
}

describe("serviceDiagnosisSchema", () => {
  it("returns only errors requested by progressive validation", () => {
    expect(
      validateServiceDiagnosisFields(["workHours", "weeklyWorkDays"], {
        ...validHour,
        hourlyRate: "",
        workHours: "744,01",
        weeklyWorkDays: "8",
      }),
    ).toEqual({
      workHours: ["Informe uma carga mensal entre 0 e 744 horas."],
      weeklyWorkDays: ["Informe no máximo 7 dias de trabalho por semana."],
    });
  });

  it("normalizes a valid hourly diagnosis without floating-point drift", () => {
    expect(serviceDiagnosisSchema.parse(validHour)).toEqual({
      submissionId: validHour.submissionId,
      pricingMethod: "hour",
      desiredMonthlyIncomeCents: 500025,
      fixedMonthlyExpensesCents: 123456,
      workHoursPeriod: "month",
      workPeriodMinutes: 9630,
      monthlyWorkMinutes: 9630,
      weeklyWorkDays: 5,
      hourlyRateCents: 12590,
      minuteRateCents: 0,
      appointmentRateCents: 0,
      appointmentDurationMinutes: 0,
      materialUnitCostCents: 0,
      taxRateBasisPoints: 625,
      cardFeeRateBasisPoints: 350,
    });
  });

  it.each([
    ["submissionId", "not-a-uuid"],
    ["pricingMethod", "daily"],
    ["desiredMonthlyIncome", "-1"],
    ["fixedMonthlyExpenses", "-1"],
    ["workHoursPeriod", "year"],
    ["workHours", "-1"],
    ["weeklyWorkDays", "-1"],
    ["hourlyRate", "-1"],
    ["minuteRate", "-1"],
    ["appointmentRate", "-1"],
    ["appointmentDurationMinutes", "-1"],
    ["taxRate", "-1"],
    ["cardFeeRate", "-1"],
    ["desiredMonthlyIncome", "1,001"],
    ["hourlyRate", "10,999"],
    ["taxRate", "1,001"],
    ["workHours", "744,01"],
    ["weeklyWorkDays", "8"],
    ["taxRate", "100,01"],
    ["cardFeeRate", "100.01"],
    ["desiredMonthlyIncome", "90071992547409,92"],
  ] satisfies [keyof ServiceDiagnosisInput, string][])(
    "rejects invalid %s value %s",
    (field, value) => {
      expect(issuePaths({ ...validHour, [field]: value })).toContain(field);
    },
  );

  it("accepts inclusive numeric boundaries", () => {
    expect(
      serviceDiagnosisSchema.parse({
        ...validHour,
        desiredMonthlyIncome: "0",
        fixedMonthlyExpenses: "0",
        workHours: "744",
        weeklyWorkDays: "7",
        taxRate: "100",
        cardFeeRate: "0",
      }),
    ).toEqual(
      expect.objectContaining({
        desiredMonthlyIncomeCents: 0,
        fixedMonthlyExpensesCents: 0,
        monthlyWorkMinutes: 44640,
        weeklyWorkDays: 7,
        taxRateBasisPoints: 10000,
        cardFeeRateBasisPoints: 0,
      }),
    );
  });

  it("normalizes empty optional numeric strings to zero", () => {
    expect(
      serviceDiagnosisSchema.parse({
        ...validHour,
        desiredMonthlyIncome: "",
        fixedMonthlyExpenses: "",
        workHours: "",
        weeklyWorkDays: "",
        taxRate: "",
        cardFeeRate: "",
      }),
    ).toEqual(
      expect.objectContaining({
        desiredMonthlyIncomeCents: 0,
        fixedMonthlyExpensesCents: 0,
        monthlyWorkMinutes: 0,
        weeklyWorkDays: 0,
        taxRateBasisPoints: 0,
        cardFeeRateBasisPoints: 0,
      }),
    );
  });

  it("requires a positive hourly rate for hourly pricing", () => {
    expect(issuePaths({ ...validHour, hourlyRate: "" })).toContain(
      "hourlyRate",
    );
  });

  it.each([
    ["month", "160,5", 5, 9630, 9630],
    ["week", "40", 5, 2400, 10392],
    ["day", "8", 5, 480, 10392],
  ] as const)(
    "normalizes %s work hours in the command",
    (workHoursPeriod, workHours, weeklyWorkDays, source, monthly) => {
      expect(
        serviceDiagnosisSchema.parse({
          ...validHour,
          workHoursPeriod,
          workHours,
          weeklyWorkDays: String(weeklyWorkDays),
        }),
      ).toEqual(
        expect.objectContaining({
          workHoursPeriod,
          workPeriodMinutes: source,
          monthlyWorkMinutes: monthly,
        }),
      );
    },
  );

  it("requires and normalizes enabled material cost", () => {
    expect(
      serviceDiagnosisSchema.parse({
        ...validHour,
        hasMaterialCost: true,
        materialUnitCost: "30,50",
      }),
    ).toEqual(expect.objectContaining({ materialUnitCostCents: 3050 }));

    expect(
      issuePaths({
        ...validHour,
        hasMaterialCost: true,
        materialUnitCost: "0",
      }),
    ).toContain("materialUnitCost");
  });

  it("zeros disabled material cost", () => {
    expect(
      serviceDiagnosisSchema.parse({
        ...validHour,
        hasMaterialCost: false,
        materialUnitCost: "999",
      }).materialUnitCostCents,
    ).toBe(0);
  });

  it.each([
    ["day", "24,01"],
    ["week", "168,01"],
    ["month", "744,01"],
  ] as const)(
    "rejects excessive %s work hours",
    (workHoursPeriod, workHours) => {
      expect(
        issuePaths({ ...validHour, workHoursPeriod, workHours }),
      ).toContain("workHours");
    },
  );

  it("requires and preserves duration for minute pricing", () => {
    expect(
      serviceDiagnosisSchema.parse({
        ...validHour,
        pricingMethod: "minute",
        minuteRate: "2,50",
        appointmentRate: "800",
        appointmentDurationMinutes: "40",
      }),
    ).toEqual(
      expect.objectContaining({
        pricingMethod: "minute",
        hourlyRateCents: 0,
        minuteRateCents: 250,
        appointmentRateCents: 0,
        appointmentDurationMinutes: 40,
      }),
    );
  });

  it.each(["", "0"])(
    "attaches invalid minute duration %s to appointmentDurationMinutes",
    (appointmentDurationMinutes) => {
      expect(
        issuePaths({
          ...validHour,
          pricingMethod: "minute",
          minuteRate: "2,50",
          appointmentDurationMinutes,
        }),
      ).toContain("appointmentDurationMinutes");
    },
  );

  it("requires a positive minute rate for minute pricing", () => {
    expect(
      issuePaths({
        ...validHour,
        pricingMethod: "minute",
        minuteRate: "0",
      }),
    ).toContain("minuteRate");
  });

  it("keeps the appointment price and integer duration", () => {
    expect(
      serviceDiagnosisSchema.parse({
        ...validHour,
        pricingMethod: "appointment",
        appointmentRate: "350,00",
        appointmentDurationMinutes: "90",
      }),
    ).toEqual(
      expect.objectContaining({
        pricingMethod: "appointment",
        hourlyRateCents: 0,
        appointmentRateCents: 35000,
        appointmentDurationMinutes: 90,
      }),
    );
  });

  it.each([
    ["appointmentRate", "0"],
    ["appointmentDurationMinutes", "0"],
    ["appointmentDurationMinutes", "45,5"],
  ] satisfies [keyof ServiceDiagnosisInput, string][])(
    "attaches an invalid appointment value to %s",
    (field, value) => {
      expect(
        issuePaths({
          ...validHour,
          pricingMethod: "appointment",
          appointmentRate: "350",
          appointmentDurationMinutes: "45",
          [field]: value,
        }),
      ).toContain(field);
    },
  );
});
