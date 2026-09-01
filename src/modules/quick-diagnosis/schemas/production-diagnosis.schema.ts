import { z } from "zod";

import type {
  ProductionDiagnosisField,
  ProductionDiagnosisFieldErrors,
  ProductionDiagnosisInput,
  ProductionDiagnosisValidatedInput,
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

const rawProductionDiagnosisSchema = z.strictObject({
  submissionId: z.uuid("Envie um identificador de submissão válido."),
  costCompositionEnabled: z.boolean(),
  productionUnitCost: z.string(),
  materialUnitCost: z.string(),
  packagingUnitCost: z.string(),
  directLaborUnitCost: z.string(),
  otherVariableUnitCost: z.string(),
  unitSalePrice: moneySchema,
  fixedMonthlyExpenses: requiredMoneySchema,
  monthlySalesVolume: monthlySalesVolumeSchema,
  proLaboreIncluded: z.boolean(),
  proLabore: z.string(),
  taxRate: requiredPercentageSchema,
  cardFeeRate: requiredPercentageSchema,
});

type ConditionalCostField =
  | "productionUnitCost"
  | "materialUnitCost"
  | "packagingUnitCost"
  | "directLaborUnitCost"
  | "otherVariableUnitCost";

function parseConditionalMoney(
  field: ConditionalCostField,
  value: string,
  context: z.RefinementCtx,
): number | null {
  const parsed = moneySchema.safeParse(value);
  if (parsed.success) return parsed.data;

  for (const issue of parsed.error.issues) {
    context.addIssue({
      code: "custom",
      path: [field],
      message: issue.message,
    });
  }
  return null;
}

function validateConditionalCostsAndCompensation(
  input: z.output<typeof rawProductionDiagnosisSchema>,
  context: z.RefinementCtx,
): void {
  if (input.costCompositionEnabled) {
    const components = [
      parseConditionalMoney(
        "materialUnitCost",
        input.materialUnitCost,
        context,
      ),
      parseConditionalMoney(
        "packagingUnitCost",
        input.packagingUnitCost,
        context,
      ),
      parseConditionalMoney(
        "directLaborUnitCost",
        input.directLaborUnitCost,
        context,
      ),
      parseConditionalMoney(
        "otherVariableUnitCost",
        input.otherVariableUnitCost,
        context,
      ),
    ];

    if (components.every((value) => value !== null)) {
      const total = components.reduce(
        (sum, value) => sum + BigInt(value),
        BigInt(0),
      );
      if (total <= BigInt(0) || total > BigInt(Number.MAX_SAFE_INTEGER)) {
        context.addIssue({
          code: "custom",
          path: ["materialUnitCost"],
          message: "Informe uma composição com total válido e maior que zero.",
        });
      }
    }
  } else {
    const productionUnitCost = parseConditionalMoney(
      "productionUnitCost",
      input.productionUnitCost,
      context,
    );
    if (productionUnitCost !== null && productionUnitCost <= 0) {
      context.addIssue({
        code: "custom",
        path: ["productionUnitCost"],
        message: "Informe um custo de produção maior que zero.",
      });
    }
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
}

function normalizeProductionInput(
  input: z.output<typeof rawProductionDiagnosisSchema>,
): ProductionDiagnosisValidatedInput {
  const compositionEnabled = input.costCompositionEnabled;

  return {
    submissionId: input.submissionId,
    costCompositionEnabled: compositionEnabled,
    productionUnitCostCents: compositionEnabled
      ? null
      : scaledInteger(input.productionUnitCost, 2),
    materialUnitCostCents: compositionEnabled
      ? scaledInteger(input.materialUnitCost, 2)
      : null,
    packagingUnitCostCents: compositionEnabled
      ? scaledInteger(input.packagingUnitCost, 2)
      : null,
    directLaborUnitCostCents: compositionEnabled
      ? scaledInteger(input.directLaborUnitCost, 2)
      : null,
    otherVariableUnitCostCents: compositionEnabled
      ? scaledInteger(input.otherVariableUnitCost, 2)
      : null,
    unitSalePriceCents: input.unitSalePrice,
    fixedMonthlyExpensesCents: input.fixedMonthlyExpenses,
    monthlySalesVolume: input.monthlySalesVolume,
    proLaboreIncluded: input.proLaboreIncluded,
    proLaboreCents: input.proLaboreIncluded
      ? scaledInteger(input.proLabore, 2)
      : 0,
    taxRateBasisPoints: input.taxRate,
    cardFeeRateBasisPoints: input.cardFeeRate,
  };
}

const productionDiagnosisSchema: z.ZodType<
  ProductionDiagnosisValidatedInput,
  ProductionDiagnosisInput
> = rawProductionDiagnosisSchema
  .superRefine(validateConditionalCostsAndCompensation)
  .transform(normalizeProductionInput);

function validateProductionDiagnosisFields(
  fields: readonly ProductionDiagnosisField[],
  values: ProductionDiagnosisInput,
): ProductionDiagnosisFieldErrors {
  const parsed = productionDiagnosisSchema.safeParse(values);
  if (parsed.success) return {};

  const fieldErrors: ProductionDiagnosisFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    if (!fields.includes(field as ProductionDiagnosisField)) continue;

    const diagnosisField = field as ProductionDiagnosisField;
    fieldErrors[diagnosisField] = [
      ...(fieldErrors[diagnosisField] ?? []),
      issue.message,
    ];
  }

  return fieldErrors;
}

export { productionDiagnosisSchema, validateProductionDiagnosisFields };
