import type {
  DetailedDiagnosisCategory,
  DetailedDiagnosisFieldErrors,
  DetailedDiagnosisInput,
  DetailedIngredientInput,
  DetailedProductItemInput,
  DetailedProductionCostMode,
  DetailedProductionItemInput,
} from "../types";

type DetailedWizardPhase =
  | "itemName"
  | "itemValues"
  | "fixedExpenses"
  | "itemVolume"
  | "ownerCompensation"
  | "fees"
  | "itemComplete"
  | "review";

type DetailedItemJourney = "first" | "additional" | "editing";
type DetailedSubmitError = "unauthorized" | "limit_reached" | "create_failed";

type DetailedWizardState = {
  phase: DetailedWizardPhase;
  itemJourney: DetailedItemJourney;
  activeItemId: string;
  values: DetailedDiagnosisInput;
  fieldErrors: DetailedDiagnosisFieldErrors;
  pendingIngredientNameId: string | null;
  pendingRemovalItemId: string | null;
  status: "editing" | "submitting";
  submitError: DetailedSubmitError | null;
};

type DetailedGeneralField =
  | "fixedMonthlyExpenses"
  | "proLaboreIncluded"
  | "proLabore"
  | "taxRate"
  | "cardFeeRate";

type DetailedItemTextField =
  | "name"
  | "unitSalePrice"
  | "monthlySalesVolume"
  | "purchaseUnitCost"
  | "packagingUnitCost"
  | "productionUnitCost"
  | "recipeYield"
  | "lossRate"
  | "directLaborUnitCost"
  | "otherVariableUnitCost";

type DetailedIngredientTextField = "name" | "quantity" | "unit" | "unitCost";

type DetailedWizardAction =
  | {
      type: "changeGeneralField";
      field: DetailedGeneralField;
      value: string | boolean;
    }
  | {
      type: "changeItemField";
      itemId: string;
      field: DetailedItemTextField;
      value: string;
    }
  | {
      type: "setCostMode";
      itemId: string;
      costMode: DetailedProductionCostMode;
    }
  | {
      type: "changeIngredientField";
      itemId: string;
      ingredientId: string;
      field: DetailedIngredientTextField;
      value: string;
    }
  | { type: "addIngredient"; itemId: string; createId: () => string }
  | {
      type: "confirmIngredientName";
      itemId: string;
      ingredientId: string;
    }
  | {
      type: "cancelIngredientName";
      itemId: string;
      ingredientId: string;
    }
  | { type: "removeIngredient"; itemId: string; ingredientId: string }
  | { type: "addItem"; createId: () => string }
  | { type: "editItem"; itemId: string }
  | { type: "requestRemoveItem"; itemId: string }
  | { type: "cancelRemoveItem" }
  | { type: "confirmRemoveItem" }
  | { type: "next" }
  | { type: "back" }
  | { type: "applyServerErrors"; fieldErrors: DetailedDiagnosisFieldErrors }
  | { type: "submit" }
  | { type: "submitFailed"; error: DetailedSubmitError }
  | { type: "reset"; createId: () => string };

function nextDetailedPhase(state: DetailedWizardState): DetailedWizardPhase {
  if (state.phase === "itemName") return "itemValues";
  if (state.phase === "itemValues")
    return state.itemJourney === "first" ? "fixedExpenses" : "itemVolume";
  if (state.phase === "fixedExpenses") return "itemVolume";
  if (state.phase === "itemVolume")
    return state.itemJourney === "first" ? "ownerCompensation" : "itemComplete";
  if (state.phase === "ownerCompensation") return "fees";
  if (state.phase === "fees") return "itemComplete";
  if (state.phase === "itemComplete") return "review";
  return "review";
}

function previousDetailedPhase(
  state: DetailedWizardState,
): DetailedWizardPhase {
  if (state.phase === "itemName") return "itemComplete";
  if (state.phase === "itemValues") return "itemName";
  if (state.phase === "fixedExpenses") return "itemValues";
  if (state.phase === "itemVolume")
    return state.itemJourney === "first" ? "fixedExpenses" : "itemValues";
  if (state.phase === "ownerCompensation") return "itemVolume";
  if (state.phase === "fees") return "ownerCompensation";
  if (state.phase === "itemComplete")
    return state.itemJourney === "first" ? "fees" : "itemVolume";
  if (state.phase === "review") return "itemComplete";
  return "itemName";
}

function blankIngredient(
  id: string,
  position: number,
): DetailedIngredientInput {
  return {
    id,
    name: `Ingrediente ${position + 1}`,
    quantity: "",
    unit: "",
    unitCost: "",
  };
}

function blankProductItem(id: string): DetailedProductItemInput {
  return {
    id,
    name: "",
    kind: "resale",
    unitSalePrice: "",
    monthlySalesVolume: "",
    purchaseUnitCost: "",
    packagingUnitCost: "",
  };
}

function blankProductionItem(
  id: string,
  ingredientId: string,
): DetailedProductionItemInput {
  return {
    id,
    name: "",
    kind: "manufacturing",
    costMode: "technical_sheet",
    unitSalePrice: "",
    monthlySalesVolume: "",
    productionUnitCost: "",
    recipeYield: "1",
    lossRate: "0",
    packagingUnitCost: "",
    directLaborUnitCost: "",
    otherVariableUnitCost: "",
    ingredients: [blankIngredient(ingredientId, 0)],
  };
}

function createBlankItem(
  category: DetailedDiagnosisCategory,
  createId: () => string,
) {
  const itemId = createId();
  return category === "product"
    ? blankProductItem(itemId)
    : blankProductionItem(itemId, createId());
}

function createInitialDetailedWizardState(
  category: DetailedDiagnosisCategory,
  createId: () => string,
): DetailedWizardState {
  const submissionId = createId();
  const item = createBlankItem(category, createId);

  return {
    phase: "itemName",
    itemJourney: "first",
    activeItemId: item.id,
    values: {
      submissionId,
      category,
      fixedMonthlyExpenses: "",
      proLaboreIncluded: false,
      proLabore: "",
      taxRate: "",
      cardFeeRate: "",
      items: [item],
    },
    fieldErrors: {},
    pendingIngredientNameId:
      item.kind === "manufacturing" ? item.ingredients[0]?.id : null,
    pendingRemovalItemId: null,
    status: "editing",
    submitError: null,
  };
}

function withoutError(
  errors: DetailedDiagnosisFieldErrors,
  path: string,
): DetailedDiagnosisFieldErrors {
  if (!(path in errors)) return errors;
  const next = { ...errors };
  delete next[path];
  return next;
}

function withoutErrorsUnder(
  errors: DetailedDiagnosisFieldErrors,
  path: string,
): DetailedDiagnosisFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(
      ([candidate]) => candidate !== path && !candidate.startsWith(`${path}.`),
    ),
  );
}

function itemIndex(state: DetailedWizardState, itemId: string): number {
  return state.values.items.findIndex((item) => item.id === itemId);
}

function updateItem(
  state: DetailedWizardState,
  itemId: string,
  update: (
    item: DetailedDiagnosisInput["items"][number],
  ) => DetailedDiagnosisInput["items"][number],
): DetailedWizardState {
  if (itemIndex(state, itemId) < 0) return state;
  return {
    ...state,
    values: {
      ...state.values,
      items: state.values.items.map((item) =>
        item.id === itemId ? update(item) : item,
      ),
    },
    submitError: null,
  };
}

function resolveErrorPhase(path: string): {
  phase: DetailedWizardPhase;
  itemIndex: number | null;
} {
  if (path === "fixedMonthlyExpenses")
    return { phase: "fixedExpenses", itemIndex: null };
  if (path === "proLaboreIncluded" || path === "proLabore")
    return { phase: "ownerCompensation", itemIndex: null };
  if (path === "taxRate" || path === "cardFeeRate")
    return { phase: "fees", itemIndex: null };

  const match = /^items\.(\d+)(?:\.(.+))?/.exec(path);
  if (!match) return { phase: "itemName", itemIndex: null };
  const nestedPath = match[2] ?? "";
  if (nestedPath === "name" || nestedPath === "id" || nestedPath === "kind")
    return { phase: "itemName", itemIndex: Number(match[1]) };
  if (nestedPath === "monthlySalesVolume")
    return { phase: "itemVolume", itemIndex: Number(match[1]) };

  return {
    phase: "itemValues",
    itemIndex: Number(match[1]),
  };
}

function detailedWizardReducer(
  state: DetailedWizardState,
  action: DetailedWizardAction,
): DetailedWizardState {
  switch (action.type) {
    case "changeGeneralField":
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        fieldErrors: withoutError(state.fieldErrors, action.field),
        submitError: null,
      } as DetailedWizardState;

    case "changeItemField": {
      const index = itemIndex(state, action.itemId);
      if (index < 0) return state;
      const updated = updateItem(state, action.itemId, (item) => ({
        ...item,
        [action.field]: action.value,
      }));
      return {
        ...updated,
        fieldErrors: withoutError(
          updated.fieldErrors,
          `items.${index}.${action.field}`,
        ),
      };
    }

    case "setCostMode": {
      const index = itemIndex(state, action.itemId);
      if (index < 0) return state;
      const updated = updateItem(state, action.itemId, (item) =>
        item.kind === "manufacturing"
          ? { ...item, costMode: action.costMode }
          : item,
      );
      return {
        ...updated,
        fieldErrors: withoutError(
          updated.fieldErrors,
          `items.${index}.costMode`,
        ),
      };
    }

    case "changeIngredientField": {
      const index = itemIndex(state, action.itemId);
      if (index < 0) return state;
      const item = state.values.items[index];
      if (item.kind !== "manufacturing") return state;
      const ingredientIndex = item.ingredients.findIndex(
        (ingredient) => ingredient.id === action.ingredientId,
      );
      if (ingredientIndex < 0) return state;
      const updated = updateItem(state, action.itemId, (candidate) =>
        candidate.kind === "manufacturing"
          ? {
              ...candidate,
              ingredients: candidate.ingredients.map((ingredient) =>
                ingredient.id === action.ingredientId
                  ? { ...ingredient, [action.field]: action.value }
                  : ingredient,
              ),
            }
          : candidate,
      );
      return {
        ...updated,
        fieldErrors: withoutError(
          updated.fieldErrors,
          `items.${index}.ingredients.${ingredientIndex}.${action.field}`,
        ),
      };
    }

    case "addIngredient": {
      const item = state.values.items.find(
        (candidate) => candidate.id === action.itemId,
      );
      if (!item || item.kind !== "manufacturing") return state;
      const ingredientId = action.createId();
      const updated = updateItem(state, action.itemId, (candidate) =>
        candidate.kind === "manufacturing"
          ? {
              ...candidate,
              ingredients: [
                ...candidate.ingredients,
                blankIngredient(ingredientId, candidate.ingredients.length),
              ],
            }
          : candidate,
      );
      return { ...updated, pendingIngredientNameId: ingredientId };
    }

    case "confirmIngredientName": {
      const index = itemIndex(state, action.itemId);
      if (index < 0) return state;
      const item = state.values.items[index];
      if (item.kind !== "manufacturing") return state;
      const ingredientIndex = item.ingredients.findIndex(
        (ingredient) => ingredient.id === action.ingredientId,
      );
      if (
        ingredientIndex < 0 ||
        item.ingredients[ingredientIndex].name.trim() === ""
      )
        return state;
      const path = `items.${index}.ingredients.${ingredientIndex}.name`;
      return {
        ...state,
        pendingIngredientNameId:
          state.pendingIngredientNameId === action.ingredientId
            ? null
            : state.pendingIngredientNameId,
        fieldErrors: withoutError(state.fieldErrors, path),
      };
    }

    case "cancelIngredientName": {
      const index = itemIndex(state, action.itemId);
      if (index < 0) return state;
      const item = state.values.items[index];
      if (item.kind !== "manufacturing") return state;
      const ingredientIndex = item.ingredients.findIndex(
        (ingredient) => ingredient.id === action.ingredientId,
      );
      if (ingredientIndex < 0) return state;
      const path = `items.${index}.ingredients.${ingredientIndex}`;
      if (item.ingredients.length === 1) {
        const updated = updateItem(state, action.itemId, (candidate) =>
          candidate.kind === "manufacturing"
            ? {
                ...candidate,
                ingredients: [blankIngredient(action.ingredientId, 0)],
              }
            : candidate,
        );
        return {
          ...updated,
          pendingIngredientNameId: action.ingredientId,
          fieldErrors: withoutErrorsUnder(updated.fieldErrors, path),
        };
      }
      const updated = updateItem(state, action.itemId, (candidate) =>
        candidate.kind === "manufacturing"
          ? {
              ...candidate,
              ingredients: candidate.ingredients.filter(
                (ingredient) => ingredient.id !== action.ingredientId,
              ),
            }
          : candidate,
      );
      return {
        ...updated,
        pendingIngredientNameId: null,
        fieldErrors: withoutErrorsUnder(updated.fieldErrors, path),
      };
    }

    case "removeIngredient": {
      const updated = updateItem(state, action.itemId, (item) => {
        if (item.kind !== "manufacturing" || item.ingredients.length <= 1)
          return item;
        return {
          ...item,
          ingredients: item.ingredients.filter(
            (ingredient) => ingredient.id !== action.ingredientId,
          ),
        };
      });
      return {
        ...updated,
        pendingIngredientNameId:
          state.pendingIngredientNameId === action.ingredientId
            ? null
            : state.pendingIngredientNameId,
      };
    }

    case "addItem": {
      const item = createBlankItem(state.values.category, action.createId);
      return {
        ...state,
        phase: "itemName",
        itemJourney: "additional",
        activeItemId: item.id,
        values: { ...state.values, items: [...state.values.items, item] },
        pendingIngredientNameId:
          item.kind === "manufacturing" ? item.ingredients[0]?.id : null,
        pendingRemovalItemId: null,
        submitError: null,
      };
    }

    case "editItem":
      return itemIndex(state, action.itemId) < 0
        ? state
        : {
            ...state,
            phase: "itemName",
            itemJourney: "editing",
            activeItemId: action.itemId,
            pendingRemovalItemId: null,
          };

    case "requestRemoveItem":
      return state.values.items.length <= 1 ||
        itemIndex(state, action.itemId) < 0
        ? { ...state, pendingRemovalItemId: null }
        : { ...state, pendingRemovalItemId: action.itemId };

    case "cancelRemoveItem":
      return { ...state, pendingRemovalItemId: null };

    case "confirmRemoveItem": {
      if (!state.pendingRemovalItemId || state.values.items.length <= 1)
        return { ...state, pendingRemovalItemId: null };
      const items = state.values.items.filter(
        (item) => item.id !== state.pendingRemovalItemId,
      );
      if (items.length === state.values.items.length) {
        return { ...state, pendingRemovalItemId: null };
      }
      const activeItemId =
        state.activeItemId === state.pendingRemovalItemId
          ? items[0].id
          : state.activeItemId;
      return {
        ...state,
        activeItemId,
        values: { ...state.values, items },
        fieldErrors: Object.fromEntries(
          Object.entries(state.fieldErrors).filter(
            ([path]) => !path.startsWith("items."),
          ),
        ),
        pendingRemovalItemId: null,
        submitError: null,
      };
    }

    case "next": {
      return { ...state, phase: nextDetailedPhase(state) };
    }

    case "back": {
      return { ...state, phase: previousDetailedPhase(state) };
    }

    case "applyServerErrors": {
      const firstPath = Object.keys(action.fieldErrors)[0];
      if (!firstPath)
        return {
          ...state,
          fieldErrors: {},
          status: "editing",
          submitError: null,
        };
      const resolved = resolveErrorPhase(firstPath);
      const activeItem =
        resolved.itemIndex === null
          ? null
          : state.values.items[resolved.itemIndex];
      return {
        ...state,
        phase: resolved.phase,
        itemJourney:
          resolved.itemIndex === null
            ? "first"
            : state.itemJourney === "first" && state.phase !== "review"
              ? "first"
              : "editing",
        activeItemId: activeItem?.id ?? state.activeItemId,
        fieldErrors: action.fieldErrors,
        status: "editing",
        submitError: null,
      };
    }

    case "submit":
      return state.status === "submitting"
        ? state
        : { ...state, status: "submitting", submitError: null };

    case "submitFailed":
      return { ...state, status: "editing", submitError: action.error };

    case "reset":
      return createInitialDetailedWizardState(
        state.values.category,
        action.createId,
      );
  }
}

export {
  createInitialDetailedWizardState,
  detailedWizardReducer,
  type DetailedGeneralField,
  type DetailedIngredientTextField,
  type DetailedItemJourney,
  type DetailedItemTextField,
  type DetailedSubmitError,
  type DetailedWizardAction,
  type DetailedWizardPhase,
  type DetailedWizardState,
};
