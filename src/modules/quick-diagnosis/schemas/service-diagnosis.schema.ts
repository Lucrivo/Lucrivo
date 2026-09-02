import { z } from "zod";

import {
  pricingMethods,
  serviceWorkPeriods,
  type ServiceDiagnosisCommand,
  type ServiceDiagnosisField,
  type ServiceDiagnosisFieldErrors,
  type ServiceDiagnosisInput,
  type ServicePricingMethod,
  type ServiceWorkPeriod,
} from "../types";
import {
  convertedNumber,
  moneySchema,
  percentageSchema,
  scaledInteger,
} from "./decimal-input";
import {
  normalizeMonthlyWorkMinutes,
  parseServiceWorkPeriodMinutes,
} from "./service-work-capacity";

const nonNegativeInteger = convertedNumber(
  (value) => scaledInteger(value, 0),
  "Informe um número inteiro não negativo.",
);

const rawServiceDiagnosisSchema = z.object({
  submissionId: z.uuid("Envie um identificador de submissão válido."),
  pricingMethod: z
    .string()
    .refine(
      (value): value is ServicePricingMethod =>
        pricingMethods.some((method) => method === value),
      "Selecione uma forma de cobrança válida.",
    ),
  desiredMonthlyIncome: moneySchema,
  fixedMonthlyExpenses: moneySchema,
  workHoursPeriod: z
    .string()
    .refine(
      (value): value is ServiceWorkPeriod =>
        serviceWorkPeriods.some((period) => period === value),
      "Selecione um período válido para as horas faturáveis.",
    ),
  workHours: z.string(),
  weeklyWorkDays: nonNegativeInteger.refine(
    (value) => value <= 7,
    "Informe no máximo 7 dias de trabalho por semana.",
  ),
  hourlyRate: moneySchema,
  minuteRate: moneySchema,
  appointmentRate: moneySchema,
  appointmentDurationMinutes: nonNegativeInteger,
  hasMaterialCost: z.boolean(),
  materialUnitCost: z.string(),
  taxRate: percentageSchema,
  cardFeeRate: percentageSchema,
});

const workHoursMessages = {
  day: "Informe uma carga diária entre 0 e 24 horas.",
  week: "Informe uma carga semanal entre 0 e 168 horas.",
  month: "Informe uma carga mensal entre 0 e 744 horas.",
} satisfies Record<ServiceWorkPeriod, string>;

const serviceDiagnosisSchema: z.ZodType<
  ServiceDiagnosisCommand,
  ServiceDiagnosisInput
> = rawServiceDiagnosisSchema
  .superRefine((input, context) => {
    try {
      parseServiceWorkPeriodMinutes(input.workHours, input.workHoursPeriod);
    } catch {
      context.addIssue({
        code: "custom",
        path: ["workHours"],
        message: workHoursMessages[input.workHoursPeriod],
      });
    }

    if (input.hasMaterialCost) {
      try {
        if (scaledInteger(input.materialUnitCost, 2) <= 0) throw new Error();
      } catch {
        context.addIssue({
          code: "custom",
          path: ["materialUnitCost"],
          message: "Informe um custo de material maior que zero.",
        });
      }
    }
  })
  .transform(
    ({
      submissionId,
      pricingMethod,
      desiredMonthlyIncome,
      fixedMonthlyExpenses,
      workHoursPeriod,
      workHours,
      weeklyWorkDays,
      hourlyRate,
      minuteRate,
      appointmentRate,
      appointmentDurationMinutes,
      hasMaterialCost,
      materialUnitCost,
      taxRate,
      cardFeeRate,
    }): ServiceDiagnosisCommand => {
      const workPeriodMinutes = parseServiceWorkPeriodMinutes(
        workHours,
        workHoursPeriod,
      );

      return {
        submissionId,
        pricingMethod,
        desiredMonthlyIncomeCents: desiredMonthlyIncome,
        fixedMonthlyExpensesCents: fixedMonthlyExpenses,
        workHoursPeriod,
        workPeriodMinutes,
        monthlyWorkMinutes: normalizeMonthlyWorkMinutes(
          workHoursPeriod,
          workPeriodMinutes,
          weeklyWorkDays,
        ),
        weeklyWorkDays,
        hourlyRateCents: pricingMethod === "hour" ? hourlyRate : 0,
        minuteRateCents: pricingMethod === "minute" ? minuteRate : 0,
        appointmentRateCents:
          pricingMethod === "appointment" ? appointmentRate : 0,
        appointmentDurationMinutes:
          pricingMethod === "minute" || pricingMethod === "appointment"
            ? appointmentDurationMinutes
            : 0,
        materialUnitCostCents: hasMaterialCost
          ? scaledInteger(materialUnitCost, 2)
          : 0,
        taxRateBasisPoints: taxRate,
        cardFeeRateBasisPoints: cardFeeRate,
      };
    },
  )
  .superRefine((command, context) => {
    if (command.pricingMethod === "hour" && command.hourlyRateCents <= 0) {
      context.addIssue({
        code: "custom",
        path: ["hourlyRate"],
        message: "Informe um valor por hora maior que zero.",
      });
    }

    if (command.pricingMethod === "minute" && command.minuteRateCents <= 0) {
      context.addIssue({
        code: "custom",
        path: ["minuteRate"],
        message: "Informe um valor por minuto maior que zero.",
      });
    }

    if (
      command.pricingMethod === "appointment" &&
      command.appointmentRateCents <= 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["appointmentRate"],
        message: "Informe um valor por atendimento maior que zero.",
      });
    }

    if (
      (command.pricingMethod === "minute" ||
        command.pricingMethod === "appointment") &&
      command.appointmentDurationMinutes <= 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["appointmentDurationMinutes"],
        message: "Informe uma duração maior que zero.",
      });
    }
  });

function validateServiceDiagnosisFields(
  fields: readonly ServiceDiagnosisField[],
  values: ServiceDiagnosisInput,
): ServiceDiagnosisFieldErrors {
  const parsed = serviceDiagnosisSchema.safeParse(values);
  if (parsed.success) return {};

  const fieldErrors: ServiceDiagnosisFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    if (!fields.includes(field as ServiceDiagnosisField)) continue;

    const diagnosisField = field as ServiceDiagnosisField;
    fieldErrors[diagnosisField] = [
      ...(fieldErrors[diagnosisField] ?? []),
      issue.message,
    ];
  }

  return fieldErrors;
}

export { serviceDiagnosisSchema, validateServiceDiagnosisFields };
