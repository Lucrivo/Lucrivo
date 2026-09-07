import { z } from "zod";

import {
  isServiceFlowPricingMethod,
  isServiceMaterialCostUnit,
  type ServiceFlowField,
  type ServiceFlowFieldErrors,
  type ServiceFlowInput,
} from "../domain/service-flow";
import { canonicalDecimal, scaledInteger } from "./decimal-input";

const serviceFlowSchema = z
  .object({
    desiredMonthlyIncome: z.string(),
    fixedMonthlyExpenses: z.string(),
    pricingMethod: z.string(),
    currentPrice: z.string(),
    dailyWorkHours: z.string(),
    weeklyWorkDays: z.string(),
    appointmentDurationMinutes: z.string(),
    hasMaterialCost: z.boolean().nullable(),
    materialCost: z.string(),
    materialCostUnit: z.string(),
    paysRevenueTax: z.boolean().nullable(),
    taxRate: z.string(),
    hasPaymentFee: z.boolean().nullable(),
    paymentFeeRate: z.string(),
  })
  .superRefine((input, context) => {
    function positiveMoney(field: ServiceFlowField, message: string) {
      try {
        if (scaledInteger(input[field] as string, 2) <= 0) throw new Error();
      } catch {
        context.addIssue({ code: "custom", path: [field], message });
      }
    }

    function nonNegativeMoney(field: ServiceFlowField, message: string) {
      try {
        scaledInteger(input[field] as string, 2);
      } catch {
        context.addIssue({ code: "custom", path: [field], message });
      }
    }

    function positivePercentage(field: "taxRate" | "paymentFeeRate") {
      try {
        const value = scaledInteger(input[field], 2);
        if (value <= 0 || value > 10_000) throw new Error();
      } catch {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Informe um percentual maior que zero e de até 100%.",
        });
      }
    }

    positiveMoney(
      "desiredMonthlyIncome",
      "Informe quanto você quer ganhar por mês.",
    );
    nonNegativeMoney(
      "fixedMonthlyExpenses",
      "Informe um valor válido para os custos fixos.",
    );

    if (!isServiceFlowPricingMethod(input.pricingMethod)) {
      context.addIssue({
        code: "custom",
        path: ["pricingMethod"],
        message: "Selecione como você cobra pelo seu trabalho.",
      });
    }
    positiveMoney("currentPrice", "Informe o preço que você cobra hoje.");

    try {
      const hours = Number(canonicalDecimal(input.dailyWorkHours));
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        throw new Error();
      }
    } catch {
      context.addIssue({
        code: "custom",
        path: ["dailyWorkHours"],
        message: "Informe uma jornada diária maior que zero e de até 24 horas.",
      });
    }

    try {
      const days = scaledInteger(input.weeklyWorkDays, 0);
      if (days <= 0 || days > 7) throw new Error();
    } catch {
      context.addIssue({
        code: "custom",
        path: ["weeklyWorkDays"],
        message: "Informe de 1 a 7 dias de trabalho por semana.",
      });
    }

    if (input.pricingMethod === "appointment") {
      try {
        if (scaledInteger(input.appointmentDurationMinutes, 0) <= 0) {
          throw new Error();
        }
      } catch {
        context.addIssue({
          code: "custom",
          path: ["appointmentDurationMinutes"],
          message: "Informe a duração média do atendimento em minutos.",
        });
      }
    }

    if (input.hasMaterialCost === null) {
      context.addIssue({
        code: "custom",
        path: ["hasMaterialCost"],
        message: "Informe se existe custo de material ou insumo.",
      });
    } else if (input.hasMaterialCost) {
      positiveMoney(
        "materialCost",
        "Informe o custo médio do material ou insumo.",
      );
      if (!isServiceMaterialCostUnit(input.materialCostUnit)) {
        context.addIssue({
          code: "custom",
          path: ["materialCostUnit"],
          message: "Selecione a unidade desse custo.",
        });
      }
    }

    if (input.paysRevenueTax === null) {
      context.addIssue({
        code: "custom",
        path: ["paysRevenueTax"],
        message: "Informe se você paga imposto sobre o faturamento.",
      });
    } else if (input.paysRevenueTax) {
      positivePercentage("taxRate");
    }

    if (input.hasPaymentFee === null) {
      context.addIssue({
        code: "custom",
        path: ["hasPaymentFee"],
        message: "Informe se cartão ou plataforma cobra uma taxa.",
      });
    } else if (input.hasPaymentFee) {
      positivePercentage("paymentFeeRate");
    }
  });

function validateServiceFlowFields(
  fields: readonly string[],
  values: ServiceFlowInput,
): ServiceFlowFieldErrors {
  const parsed = serviceFlowSchema.safeParse(values);
  if (parsed.success) return {};

  const fieldErrors: ServiceFlowFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || !fields.includes(field)) continue;

    const serviceField = field as ServiceFlowField;
    fieldErrors[serviceField] = [
      ...(fieldErrors[serviceField] ?? []),
      issue.message,
    ];
  }
  return fieldErrors;
}

export { serviceFlowSchema, validateServiceFlowFields };
