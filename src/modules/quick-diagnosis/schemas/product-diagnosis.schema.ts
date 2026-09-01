import { z } from "zod";

import type {
  ProductDiagnosisCommand,
  ProductDiagnosisField,
  ProductDiagnosisFieldErrors,
  ProductDiagnosisInput,
} from "../types";
import { moneySchema, percentageSchema, scaledInteger } from "./decimal-input";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

const monthlySalesVolumeSchema: z.ZodType<number | null, string> = z
  .string()
  .transform((value, context) => {
    if (value.trim() === "") return null;

    try {
      const volume = scaledInteger(value, 0);
      if (volume < 1 || volume > POSTGRES_INTEGER_MAX) {
        throw new Error("out_of_range");
      }
      return volume;
    } catch {
      context.addIssue({
        code: "custom",
        message:
          "Informe um volume mensal inteiro entre 1 e 2147483647 unidades.",
      });
      return z.NEVER;
    }
  });

const requiredMoneySchema = z
  .string()
  .refine(
    (value) => value.trim() !== "",
    "Informe um valor monetário válido com até duas casas decimais.",
  )
  .pipe(moneySchema);

const requiredPercentageSchema = z
  .string()
  .refine(
    (value) => value.trim() !== "",
    "Informe um percentual entre 0 e 100 com até duas casas decimais.",
  )
  .pipe(percentageSchema);

const rawProductDiagnosisSchema = z.strictObject({
  submissionId: z.uuid("Envie um identificador de submissão válido."),
  purchaseUnitCost: moneySchema,
  unitSalePrice: moneySchema,
  fixedMonthlyExpenses: requiredMoneySchema,
  monthlySalesVolume: monthlySalesVolumeSchema,
  proLaboreIncluded: z.boolean(),
  proLabore: z.string(),
  taxRate: requiredPercentageSchema,
  cardFeeRate: requiredPercentageSchema,
});

const productDiagnosisSchema: z.ZodType<
  ProductDiagnosisCommand,
  ProductDiagnosisInput
> = rawProductDiagnosisSchema
  .superRefine((input, context) => {
    if (input.purchaseUnitCost <= 0) {
      context.addIssue({
        code: "custom",
        path: ["purchaseUnitCost"],
        message: "Informe um custo de compra maior que zero.",
      });
    }

    if (input.unitSalePrice <= 0) {
      context.addIssue({
        code: "custom",
        path: ["unitSalePrice"],
        message: "Informe um preço de venda maior que zero.",
      });
    }

    if (input.proLaboreIncluded) {
      try {
        if (scaledInteger(input.proLabore, 2) <= 0) throw new Error();
      } catch {
        context.addIssue({
          code: "custom",
          path: ["proLabore"],
          message: "Informe um pró-labore maior que zero.",
        });
      }
    }
  })
  .transform((input) => ({
    submissionId: input.submissionId,
    purchaseUnitCostCents: input.purchaseUnitCost,
    unitSalePriceCents: input.unitSalePrice,
    fixedMonthlyExpensesCents: input.fixedMonthlyExpenses,
    monthlySalesVolume: input.monthlySalesVolume,
    proLaboreIncluded: input.proLaboreIncluded,
    proLaboreCents: input.proLaboreIncluded
      ? scaledInteger(input.proLabore, 2)
      : 0,
    taxRateBasisPoints: input.taxRate,
    cardFeeRateBasisPoints: input.cardFeeRate,
  }));

function validateProductDiagnosisFields(
  fields: readonly ProductDiagnosisField[],
  values: ProductDiagnosisInput,
): ProductDiagnosisFieldErrors {
  const parsed = productDiagnosisSchema.safeParse(values);
  if (parsed.success) return {};

  const fieldErrors: ProductDiagnosisFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    if (!fields.includes(field as ProductDiagnosisField)) continue;

    const diagnosisField = field as ProductDiagnosisField;
    fieldErrors[diagnosisField] = [
      ...(fieldErrors[diagnosisField] ?? []),
      issue.message,
    ];
  }

  return fieldErrors;
}

export { productDiagnosisSchema, validateProductDiagnosisFields };
