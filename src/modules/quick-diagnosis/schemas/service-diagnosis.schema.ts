import { z } from "zod";

import {
  pricingMethods,
  type ServiceDiagnosisCommand,
  type ServiceDiagnosisField,
  type ServiceDiagnosisFieldErrors,
  type ServiceDiagnosisInput,
  type ServicePricingMethod,
} from "../types";

function canonicalDecimal(value: string): string {
  const compact = value
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");

  if (compact === "") return "0";

  return compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
}

function scaledInteger(value: string, scale: number): number {
  const match = canonicalDecimal(value).match(/^(\d+)(?:\.(\d+))?$/);

  if (!match || (match[2]?.length ?? 0) > scale) {
    throw new Error("invalid_decimal");
  }

  const factor = BigInt(10) ** BigInt(scale);
  const fraction = (match[2] ?? "").padEnd(scale, "0");
  const result = BigInt(match[1]) * factor + BigInt(fraction || "0");

  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("unsafe_integer");
  }

  return Number(result);
}

function roundedMinutes(value: string): number {
  const canonical = canonicalDecimal(value);
  const [whole, fraction = ""] = canonical.split(".");

  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) {
    throw new Error("invalid_decimal");
  }

  const denominator = BigInt(10) ** BigInt(fraction.length);
  const numerator = BigInt(whole) * denominator + BigInt(fraction || "0");
  const minutes =
    (numerator * BigInt(120) + denominator) / (BigInt(2) * denominator);

  if (minutes > BigInt(44640)) throw new Error("out_of_range");

  return Number(minutes);
}

function convertedNumber(convert: (value: string) => number, message: string) {
  return z.string().transform((value, context) => {
    try {
      return convert(value);
    } catch {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });
}

const money = convertedNumber(
  (value) => scaledInteger(value, 2),
  "Informe um valor monetário válido com até duas casas decimais.",
);

const percentage = convertedNumber((value) => {
  const basisPoints = scaledInteger(value, 2);
  if (basisPoints > 10000) throw new Error("out_of_range");
  return basisPoints;
}, "Informe um percentual entre 0 e 100 com até duas casas decimais.");

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
  desiredMonthlyIncome: money,
  fixedMonthlyExpenses: money,
  monthlyWorkHours: convertedNumber(
    roundedMinutes,
    "Informe uma carga mensal entre 0 e 744 horas.",
  ),
  weeklyWorkDays: nonNegativeInteger.refine(
    (value) => value <= 7,
    "Informe no máximo 7 dias de trabalho por semana.",
  ),
  hourlyRate: money,
  minuteRate: money,
  appointmentRate: money,
  appointmentDurationMinutes: nonNegativeInteger,
  taxRate: percentage,
  cardFeeRate: percentage,
});

const serviceDiagnosisSchema: z.ZodType<
  ServiceDiagnosisCommand,
  ServiceDiagnosisInput
> = rawServiceDiagnosisSchema
  .transform(
    ({
      submissionId,
      pricingMethod,
      desiredMonthlyIncome,
      fixedMonthlyExpenses,
      monthlyWorkHours,
      weeklyWorkDays,
      hourlyRate,
      minuteRate,
      appointmentRate,
      appointmentDurationMinutes,
      taxRate,
      cardFeeRate,
    }): ServiceDiagnosisCommand => ({
      submissionId,
      pricingMethod,
      desiredMonthlyIncomeCents: desiredMonthlyIncome,
      fixedMonthlyExpensesCents: fixedMonthlyExpenses,
      monthlyWorkMinutes: monthlyWorkHours,
      weeklyWorkDays,
      hourlyRateCents: pricingMethod === "hour" ? hourlyRate : 0,
      minuteRateCents: pricingMethod === "minute" ? minuteRate : 0,
      appointmentRateCents:
        pricingMethod === "appointment" ? appointmentRate : 0,
      appointmentDurationMinutes:
        pricingMethod === "appointment" ? appointmentDurationMinutes : 0,
      taxRateBasisPoints: taxRate,
      cardFeeRateBasisPoints: cardFeeRate,
    }),
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

    if (command.pricingMethod === "appointment") {
      if (command.appointmentRateCents <= 0) {
        context.addIssue({
          code: "custom",
          path: ["appointmentRate"],
          message: "Informe um valor por atendimento maior que zero.",
        });
      }

      if (command.appointmentDurationMinutes <= 0) {
        context.addIssue({
          code: "custom",
          path: ["appointmentDurationMinutes"],
          message: "Informe uma duração maior que zero.",
        });
      }
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
