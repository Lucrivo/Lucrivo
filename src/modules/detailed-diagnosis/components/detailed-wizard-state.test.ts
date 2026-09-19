import { describe, expect, it } from "vitest";

import type { DetailedProductionItemInput } from "../types";
import {
  createInitialDetailedWizardState,
  detailedWizardReducer,
} from "./detailed-wizard-state";

function ids(...values: string[]) {
  let index = 0;
  return () => values[index++] ?? `generated-${index}`;
}

function productState() {
  return createInitialDetailedWizardState(
    "product",
    ids("submission-1", "item-1"),
  );
}

function productionState() {
  return createInitialDetailedWizardState(
    "production",
    ids("submission-1", "item-1", "ingredient-1"),
  );
}

describe("createInitialDetailedWizardState", () => {
  it("starts Product with one resale item and the approved promotion margin", () => {
    const state = productState();

    expect(state).toMatchObject({
      phase: "fixedExpenses",
      itemSubstep: "basics",
      activeItemId: "item-1",
      status: "editing",
      pendingIngredientNameId: null,
      pendingRemovalItemId: null,
      submitError: null,
      values: {
        submissionId: "submission-1",
        category: "product",
        promotionMarginRate: "15",
      },
    });
    expect(state.values.items).toEqual([
      {
        id: "item-1",
        name: "",
        kind: "resale",
        unitSalePrice: "",
        monthlySalesVolume: "",
        purchaseUnitCost: "",
        packagingUnitCost: "",
      },
    ]);
  });

  it("starts Production in technical-sheet mode with one ingredient", () => {
    const state = productionState();

    expect(state.values.promotionMarginRate).toBe("15");
    expect(state.values.items).toEqual([
      {
        id: "item-1",
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
        ingredients: [
          {
            id: "ingredient-1",
            name: "Ingrediente 1",
            quantity: "",
            unit: "",
            unitCost: "",
          },
        ],
      },
    ]);
    expect(state.pendingIngredientNameId).toBe("ingredient-1");
  });
});

describe("detailedWizardReducer", () => {
  it("clears only the changed general and active-item field errors", () => {
    const state = {
      ...productState(),
      fieldErrors: {
        fixedMonthlyExpenses: ["Inválido"],
        taxRate: ["Inválido"],
        "items.0.name": ["Obrigatório"],
        "items.0.unitSalePrice": ["Inválido"],
      },
    };
    const changedGeneral = detailedWizardReducer(state, {
      type: "changeGeneralField",
      field: "fixedMonthlyExpenses",
      value: "1000",
    });
    const changedItem = detailedWizardReducer(changedGeneral, {
      type: "changeItemField",
      itemId: "item-1",
      field: "name",
      value: "Caneca",
    });

    expect(changedItem.values.fixedMonthlyExpenses).toBe("1000");
    expect(changedItem.values.items[0].name).toBe("Caneca");
    expect(changedItem.fieldErrors).toEqual({
      taxRate: ["Inválido"],
      "items.0.unitSalePrice": ["Inválido"],
    });
  });

  it("adds a blank item, activates it, and preserves completed items", () => {
    const populated = detailedWizardReducer(productState(), {
      type: "changeItemField",
      itemId: "item-1",
      field: "name",
      value: "Caneca",
    });
    const state = detailedWizardReducer(
      { ...populated, phase: "itemComplete", itemSubstep: "complete" },
      { type: "addItem", createId: ids("item-2") },
    );

    expect(state.phase).toBe("itemBasics");
    expect(state.itemSubstep).toBe("basics");
    expect(state.activeItemId).toBe("item-2");
    expect(state.values.items).toHaveLength(2);
    expect(state.values.items[0].name).toBe("Caneca");
    expect(state.values.items[1]).toMatchObject({
      id: "item-2",
      name: "",
      kind: "resale",
    });
  });

  it("edits an existing item without changing any sibling", () => {
    let state = detailedWizardReducer(productState(), {
      type: "addItem",
      createId: ids("item-2"),
    });
    state = detailedWizardReducer(state, {
      type: "changeItemField",
      itemId: "item-2",
      field: "name",
      value: "Caderno",
    });
    const beforeFirst = state.values.items[0];
    state = detailedWizardReducer(state, {
      type: "editItem",
      itemId: "item-1",
    });
    state = detailedWizardReducer(state, {
      type: "changeItemField",
      itemId: "item-1",
      field: "unitSalePrice",
      value: "25,00",
    });

    expect(state.activeItemId).toBe("item-1");
    expect(state.phase).toBe("itemBasics");
    expect(state.values.items[0]).toEqual({
      ...beforeFirst,
      unitSalePrice: "25,00",
    });
    expect(state.values.items[1].name).toBe("Caderno");
  });

  it("requires confirmation before removing an item and keeps one item", () => {
    let state = detailedWizardReducer(productState(), {
      type: "addItem",
      createId: ids("item-2"),
    });
    const requested = detailedWizardReducer(state, {
      type: "requestRemoveItem",
      itemId: "item-1",
    });

    expect(requested.values.items).toHaveLength(2);
    expect(requested.pendingRemovalItemId).toBe("item-1");

    state = detailedWizardReducer(requested, { type: "confirmRemoveItem" });
    expect(state.pendingRemovalItemId).toBeNull();
    expect(state.values.items.map((item) => item.id)).toEqual(["item-2"]);

    const lastRequested = detailedWizardReducer(state, {
      type: "requestRemoveItem",
      itemId: "item-2",
    });
    const lastConfirmed = detailedWizardReducer(lastRequested, {
      type: "confirmRemoveItem",
    });
    expect(lastRequested.pendingRemovalItemId).toBeNull();
    expect(lastConfirmed.values.items).toHaveLength(1);
  });

  it("adds and removes ingredients while preserving IDs and one line", () => {
    let state = productionState();
    state = detailedWizardReducer(state, {
      type: "addIngredient",
      itemId: "item-1",
      createId: ids("ingredient-2"),
    });
    state = detailedWizardReducer(state, {
      type: "changeIngredientField",
      itemId: "item-1",
      ingredientId: "ingredient-2",
      field: "name",
      value: "Açúcar",
    });

    let item = state.values.items[0] as DetailedProductionItemInput;
    expect(item.ingredients.map((ingredient) => ingredient.id)).toEqual([
      "ingredient-1",
      "ingredient-2",
    ]);
    expect(item.ingredients[1].name).toBe("Açúcar");
    expect(state.pendingIngredientNameId).toBe("ingredient-2");

    state = detailedWizardReducer(state, {
      type: "removeIngredient",
      itemId: "item-1",
      ingredientId: "ingredient-1",
    });
    item = state.values.items[0] as DetailedProductionItemInput;
    expect(item.ingredients.map((ingredient) => ingredient.id)).toEqual([
      "ingredient-2",
    ]);

    state = detailedWizardReducer(state, {
      type: "removeIngredient",
      itemId: "item-1",
      ingredientId: "ingredient-2",
    });
    item = state.values.items[0] as DetailedProductionItemInput;
    expect(item.ingredients).toHaveLength(1);
  });

  it("confirms and cancels the ingredient name step", () => {
    let state = productionState();

    state = detailedWizardReducer(state, {
      type: "confirmIngredientName",
      itemId: "item-1",
      ingredientId: "ingredient-1",
    });
    expect(state.pendingIngredientNameId).toBeNull();

    state = detailedWizardReducer(state, {
      type: "addIngredient",
      itemId: "item-1",
      createId: ids("ingredient-2"),
    });
    let item = state.values.items[0] as DetailedProductionItemInput;
    expect(state.pendingIngredientNameId).toBe("ingredient-2");
    expect(item.ingredients[1].name).toBe("Ingrediente 2");

    state = detailedWizardReducer(state, {
      type: "cancelIngredientName",
      itemId: "item-1",
      ingredientId: "ingredient-2",
    });
    item = state.values.items[0] as DetailedProductionItemInput;
    expect(state.pendingIngredientNameId).toBeNull();
    expect(item.ingredients.map((ingredient) => ingredient.id)).toEqual([
      "ingredient-1",
    ]);

    state = detailedWizardReducer(
      {
        ...state,
        pendingIngredientNameId: "ingredient-1",
        values: {
          ...state.values,
          items: [
            { ...item, ingredients: [{ ...item.ingredients[0], name: "" }] },
          ],
        },
      },
      {
        type: "cancelIngredientName",
        itemId: "item-1",
        ingredientId: "ingredient-1",
      },
    );
    item = state.values.items[0] as DetailedProductionItemInput;
    expect(state.pendingIngredientNameId).toBe("ingredient-1");
    expect(item.ingredients).toEqual([
      expect.objectContaining({ id: "ingredient-1", name: "Ingrediente 1" }),
    ]);
  });

  it("preserves inactive Production cost values when switching modes", () => {
    let state = productionState();
    state = detailedWizardReducer(state, {
      type: "changeItemField",
      itemId: "item-1",
      field: "productionUnitCost",
      value: "12,00",
    });
    state = detailedWizardReducer(state, {
      type: "changeIngredientField",
      itemId: "item-1",
      ingredientId: "ingredient-1",
      field: "name",
      value: "Farinha",
    });
    state = detailedWizardReducer(state, {
      type: "setCostMode",
      itemId: "item-1",
      costMode: "summarized",
    });
    state = detailedWizardReducer(state, {
      type: "setCostMode",
      itemId: "item-1",
      costMode: "technical_sheet",
    });

    const item = state.values.items[0] as DetailedProductionItemInput;
    expect(item.productionUnitCost).toBe("12,00");
    expect(item.ingredients[0].name).toBe("Farinha");
  });

  it("moves forward and backward through stable phases", () => {
    let state = productState();
    const forward = [
      "ownerCompensation",
      "fees",
      "itemBasics",
      "itemCosts",
      "itemComplete",
      "review",
    ];
    for (const phase of forward) {
      state = detailedWizardReducer(state, { type: "next" });
      expect(state.phase).toBe(phase);
    }

    const backward = [
      "itemComplete",
      "itemCosts",
      "itemBasics",
      "fees",
      "ownerCompensation",
      "fixedExpenses",
    ];
    for (const phase of backward) {
      state = detailedWizardReducer(state, { type: "back" });
      expect(state.phase).toBe(phase);
    }
  });

  it("opens the first invalid item and cost phase for nested server errors", () => {
    let state = detailedWizardReducer(productionState(), {
      type: "addItem",
      createId: ids("item-2", "ingredient-2"),
    });
    state = detailedWizardReducer(state, {
      type: "applyServerErrors",
      fieldErrors: {
        "items.1.ingredients.0.quantity": ["Quantidade inválida"],
        fixedMonthlyExpenses: ["Valor inválido"],
      },
    });

    expect(state.activeItemId).toBe("item-2");
    expect(state.phase).toBe("itemCosts");
    expect(state.itemSubstep).toBe("costs");
    expect(state.status).toBe("editing");
    expect(state.fieldErrors).toEqual({
      "items.1.ingredients.0.quantity": ["Quantidade inválida"],
      fixedMonthlyExpenses: ["Valor inválido"],
    });
  });

  it.each([
    ["fixedMonthlyExpenses", "fixedExpenses"],
    ["proLabore", "ownerCompensation"],
    ["cardFeeRate", "fees"],
    ["items.0.name", "itemBasics"],
    ["items.0.purchaseUnitCost", "itemCosts"],
  ] as const)("maps server path %s to phase %s", (path, phase) => {
    const state = detailedWizardReducer(productState(), {
      type: "applyServerErrors",
      fieldErrors: { [path]: ["Inválido"] },
    });

    expect(state.phase).toBe(phase);
  });

  it("locks duplicate submits, reports failure, and resets with fresh IDs", () => {
    const initial = productState();
    const submitting = detailedWizardReducer(initial, { type: "submit" });
    const duplicate = detailedWizardReducer(submitting, { type: "submit" });

    expect(submitting.status).toBe("submitting");
    expect(duplicate).toBe(submitting);

    const failed = detailedWizardReducer(submitting, {
      type: "submitFailed",
      error: "limit_reached",
    });
    expect(failed).toMatchObject({
      status: "editing",
      submitError: "limit_reached",
    });

    const reset = detailedWizardReducer(failed, {
      type: "reset",
      createId: ids("submission-2", "item-2"),
    });
    expect(reset.values.submissionId).toBe("submission-2");
    expect(reset.activeItemId).toBe("item-2");
    expect(reset.submitError).toBeNull();
  });
});
