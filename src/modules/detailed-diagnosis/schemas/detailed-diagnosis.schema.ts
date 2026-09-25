import { z } from "zod";

import { scaledInteger } from "@/modules/quick-diagnosis/schemas/decimal-input";

import type {
  DetailedDiagnosisCommand,
  DetailedDiagnosisFieldErrors,
  DetailedDiagnosisInput,
  DetailedIngredientInput,
} from "../types";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

function scaledString(
  scale: number,
  message: string,
  options: { allowBlank?: boolean; min?: number; max?: number } = {},
) {
  return z.string().superRefine((value, context) => {
    if (options.allowBlank && value.trim() === "") return;
    try {
      const parsed = scaledInteger(value, scale);
      if (
        (options.min !== undefined && parsed < options.min) ||
        (options.max !== undefined && parsed > options.max)
      ) {
        throw new Error("out_of_range");
      }
    } catch {
      context.addIssue({ code: "custom", message });
    }
  });
}

const uuidSchema = z.uuid("Envie um identificador válido.");
const requiredNameSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "Informe um nome.");
const requiredUnitSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "Informe a unidade de medida.");
const optionalMoneyStringSchema = scaledString(
  2,
  "Informe um valor monetário válido com até duas casas decimais.",
  { allowBlank: true, min: 0 },
);
const positiveMoneyStringSchema = scaledString(
  2,
  "Informe um valor monetário positivo com até duas casas decimais.",
  { min: 1 },
);
const requiredMoneyStringSchema = scaledString(
  2,
  "Informe um valor monetário válido com até duas casas decimais.",
  { min: 0 },
);
const ingredientUnitCostSchema = z.string().superRefine((value, context) => {
  if (value.trim() === "") {
    context.addIssue({
      code: "custom",
      message:
        "Informe o custo unitário. Se este ingrediente não tiver custo, digite 0.",
    });
    return;
  }

  try {
    scaledInteger(value, 4);
  } catch {
    context.addIssue({
      code: "custom",
      message:
        "Informe um custo unitário válido com até quatro casas decimais.",
    });
  }
});
const percentageStringSchema = scaledString(
  2,
  "Informe um percentual entre 0 e 100 com até duas casas decimais.",
  { min: 0, max: 10_000 },
);
const monthlyVolumeStringSchema = scaledString(
  0,
  "Informe um volume mensal inteiro igual ou maior que zero.",
  { allowBlank: true, min: 0, max: POSTGRES_INTEGER_MAX },
);

const detailedIngredientInputSchema = z.strictObject({
  id: uuidSchema,
  name: requiredNameSchema,
  quantity: scaledString(6, "Informe uma quantidade maior que zero.", {
    min: 1,
  }),
  unit: requiredUnitSchema,
  unitCost: ingredientUnitCostSchema,
});

const detailedItemBaseShape = {
  id: uuidSchema,
  name: requiredNameSchema,
  unitSalePrice: positiveMoneyStringSchema,
  monthlySalesVolume: monthlyVolumeStringSchema,
};

const detailedProductItemInputSchema = z.strictObject({
  ...detailedItemBaseShape,
  kind: z.literal("resale"),
  purchaseUnitCost: optionalMoneyStringSchema,
  packagingUnitCost: optionalMoneyStringSchema,
});

const detailedProductionItemBaseShape = {
  ...detailedItemBaseShape,
  kind: z.literal("manufacturing"),
  productionUnitCost: z.string(),
  recipeYield: z.string(),
  lossRate: z.string(),
  packagingUnitCost: z.string(),
  directLaborUnitCost: z.string(),
  otherVariableUnitCost: z.string(),
  ingredients: z.array(z.unknown()),
};

const summarizedProductionItemInputSchema = z.strictObject({
  ...detailedProductionItemBaseShape,
  costMode: z.literal("summarized"),
  productionUnitCost: positiveMoneyStringSchema,
});

const technicalSheetProductionItemInputSchema = z.strictObject({
  ...detailedProductionItemBaseShape,
  costMode: z.literal("technical_sheet"),
  recipeYield: scaledString(
    0,
    "Informe um rendimento inteiro maior que zero.",
    {
      min: 1,
      max: POSTGRES_INTEGER_MAX,
    },
  ),
  lossRate: scaledString(2, "Informe uma perda entre 0 e menos de 100%.", {
    min: 0,
    max: 9_999,
  }),
  packagingUnitCost: optionalMoneyStringSchema,
  directLaborUnitCost: optionalMoneyStringSchema,
  otherVariableUnitCost: optionalMoneyStringSchema,
  ingredients: z.array(detailedIngredientInputSchema).min(1, {
    message: "Informe ao menos um ingrediente.",
  }),
});

const detailedProductionItemInputSchema = z.discriminatedUnion("costMode", [
  summarizedProductionItemInputSchema,
  technicalSheetProductionItemInputSchema,
]);

const detailedItemInputSchema = z.union([
  detailedProductItemInputSchema,
  detailedProductionItemInputSchema,
]);

const rawDetailedDiagnosisSchema = z
  .strictObject({
    submissionId: uuidSchema,
    category: z.enum(["product", "production"]),
    fixedMonthlyExpenses: requiredMoneyStringSchema,
    proLaboreIncluded: z.boolean(),
    proLabore: z.string(),
    taxRate: percentageStringSchema,
    cardFeeRate: percentageStringSchema,
    items: z.array(detailedItemInputSchema).min(1, {
      message: "Cadastre ao menos um item.",
    }),
  })
  .superRefine((input, context) => {
    if (input.proLaboreIncluded) {
      try {
        if (scaledInteger(input.proLabore, 2) <= 0) throw new Error();
      } catch {
        context.addIssue({
          code: "custom",
          path: ["proLabore"],
          message: "Informe quanto você quer receber por mês.",
        });
      }
    }

    const itemIds = new Set<string>();
    input.items.forEach((item, itemIndex) => {
      if (itemIds.has(item.id))
        context.addIssue({
          code: "custom",
          path: ["items", itemIndex, "id"],
          message: "Cada item precisa ter um identificador diferente.",
        });
      itemIds.add(item.id);

      const expectedKind =
        input.category === "product" ? "resale" : "manufacturing";
      if (item.kind !== expectedKind)
        context.addIssue({
          code: "custom",
          path: ["items", itemIndex, "kind"],
          message: "O tipo do item não corresponde à categoria do diagnóstico.",
        });

      if (item.kind !== "manufacturing" || item.costMode !== "technical_sheet")
        return;

      const ingredientIds = new Set<string>();
      let ingredientTotal = BigInt(0);
      item.ingredients.forEach((ingredient, ingredientIndex) => {
        if (ingredientIds.has(ingredient.id))
          context.addIssue({
            code: "custom",
            path: ["items", itemIndex, "ingredients", ingredientIndex, "id"],
            message: "Cada ingrediente precisa ter um identificador diferente.",
          });
        ingredientIds.add(ingredient.id);
        try {
          ingredientTotal +=
            BigInt(scaledInteger(ingredient.quantity, 6)) *
            BigInt(scaledInteger(ingredient.unitCost, 4));
        } catch {
          // Field-level validation already reports invalid decimals.
        }
      });
      if (item.ingredients.length > 0 && ingredientTotal === BigInt(0))
        context.addIssue({
          code: "custom",
          path: ["items", itemIndex, "ingredients"],
          message:
            "A receita precisa ter pelo menos um ingrediente com custo maior que zero.",
        });
    });
  });

function parseOptionalScaled(value: string, scale: number): number {
  return value.trim() === "" ? 0 : scaledInteger(value, scale);
}

function normalizeIngredient(
  ingredient: DetailedIngredientInput,
  position: number,
) {
  return {
    id: ingredient.id,
    position,
    name: ingredient.name.trim(),
    quantityMillionths: scaledInteger(ingredient.quantity, 6),
    unit: ingredient.unit.trim(),
    unitCostTenThousandths: scaledInteger(ingredient.unitCost, 4),
  };
}

function normalizeItem(
  item: z.output<typeof detailedItemInputSchema>,
  position: number,
): DetailedDiagnosisCommand["items"][number] {
  const common = {
    id: item.id,
    position,
    name: item.name.trim(),
    unitSalePriceCents: scaledInteger(item.unitSalePrice, 2),
    monthlySalesVolume:
      item.monthlySalesVolume.trim() === ""
        ? null
        : scaledInteger(item.monthlySalesVolume, 0),
  };

  if (item.kind === "resale")
    return {
      ...common,
      kind: "resale",
      purchaseUnitCostCents: parseOptionalScaled(item.purchaseUnitCost, 2),
      packagingUnitCostCents: parseOptionalScaled(item.packagingUnitCost, 2),
    };

  if (item.costMode === "summarized")
    return {
      ...common,
      kind: "manufacturing",
      costMode: "summarized",
      productionUnitCostCents: scaledInteger(item.productionUnitCost, 2),
    };

  return {
    ...common,
    kind: "manufacturing",
    costMode: "technical_sheet",
    recipeYield: scaledInteger(item.recipeYield, 0),
    lossRateBasisPoints: scaledInteger(item.lossRate, 2),
    packagingUnitCostCents: parseOptionalScaled(item.packagingUnitCost, 2),
    directLaborUnitCostCents: parseOptionalScaled(item.directLaborUnitCost, 2),
    otherVariableUnitCostCents: parseOptionalScaled(
      item.otherVariableUnitCost,
      2,
    ),
    ingredients: item.ingredients.map(normalizeIngredient),
  };
}

const detailedDiagnosisSchema = rawDetailedDiagnosisSchema.transform(
  (input): DetailedDiagnosisCommand => ({
    submissionId: input.submissionId,
    category: input.category,
    fixedMonthlyExpensesCents: scaledInteger(input.fixedMonthlyExpenses, 2),
    proLaboreIncluded: input.proLaboreIncluded,
    proLaboreCents: input.proLaboreIncluded
      ? scaledInteger(input.proLabore, 2)
      : 0,
    taxRateBasisPoints: scaledInteger(input.taxRate, 2),
    cardFeeRateBasisPoints: scaledInteger(input.cardFeeRate, 2),
    items: input.items.map(normalizeItem),
  }),
);

function detailedIssuePath(issue: z.core.$ZodIssue): string {
  return issue.path.map(String).join(".");
}

function validateDetailedDiagnosisPaths(
  paths: readonly string[],
  input: DetailedDiagnosisInput,
): DetailedDiagnosisFieldErrors {
  const parsed = detailedDiagnosisSchema.safeParse(input);
  if (parsed.success) return {};

  const errors: DetailedDiagnosisFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const issuePath = detailedIssuePath(issue);
    if (
      !paths.some(
        (path) => issuePath === path || issuePath.startsWith(`${path}.`),
      )
    )
      continue;
    errors[issuePath] = [...(errors[issuePath] ?? []), issue.message];
  }
  return errors;
}

export {
  detailedDiagnosisSchema,
  detailedIssuePath,
  validateDetailedDiagnosisPaths,
};
