import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DetailedProductItemInput } from "../../types";
import { createInitialDetailedWizardState } from "../detailed-wizard-state";
import { DetailedFeesStep } from "./detailed-fees-step";
import { DetailedFixedExpensesStep } from "./detailed-fixed-expenses-step";
import { DetailedItemBasicsStep } from "./detailed-item-basics-step";
import { DetailedItemCompleteStep } from "./detailed-item-complete-step";
import { DetailedOwnerCompensationStep } from "./detailed-owner-compensation-step";
import { DetailedProductCostsStep } from "./detailed-product-costs-step";
import { DetailedProductionCostsStep } from "./detailed-production-costs-step";
import { DetailedReviewStep } from "./detailed-review-step";

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

describe("detailed common steps", () => {
  it("connects a visible fixed-expense label and inline error", () => {
    const state = {
      ...productState(),
      values: { ...productState().values, fixedMonthlyExpenses: "1000" },
      fieldErrors: { fixedMonthlyExpenses: ["Informe um valor válido."] },
    };

    render(<DetailedFixedExpensesStep state={state} dispatch={vi.fn()} />);

    const field = screen.getByLabelText("Gastos que existem todo mês");
    expect(field).toHaveValue("1000");
    expect(field).toHaveAccessibleDescription(/Informe um valor válido\./);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um valor válido.",
    );
  });

  it("uses a labelled switch and exposes owner compensation only when enabled", () => {
    const state = productState();
    const { rerender } = render(
      <DetailedOwnerCompensationStep state={state} dispatch={vi.fn()} />,
    );

    expect(
      screen.getByRole("switch", {
        name: "Você quer incluir o valor que recebe pelo seu trabalho?",
      }),
    ).not.toBeChecked();
    expect(
      screen.queryByLabelText("Quanto você quer receber por mês?"),
    ).not.toBeInTheDocument();

    rerender(
      <DetailedOwnerCompensationStep
        state={{
          ...state,
          values: { ...state.values, proLaboreIncluded: true },
        }}
        dispatch={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText("Quanto você quer receber por mês?"),
    ).toBeEnabled();
  });

  it("makes global fees and the promotion simulation explicit", () => {
    render(<DetailedFeesStep state={productState()} dispatch={vi.fn()} />);

    expect(
      screen.getByText(/se aplicam igualmente a todos os itens/i),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
    ).toBeEnabled();
    expect(
      screen.getByLabelText("Margem mínima para simular promoções"),
    ).toHaveValue("15");
  });

  it("shows the approved optional-volume guidance next to item basics", () => {
    render(
      <DetailedItemBasicsStep state={productState()} dispatch={vi.fn()} />,
    );

    expect(screen.getByLabelText("Nome do produto")).toBeEnabled();
    expect(screen.getByLabelText("Preço de venda por unidade")).toBeEnabled();
    expect(
      screen.getByLabelText("Quantas unidades você vende por mês? (Opcional)"),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "Se você já vende este item, informe a média mensal. Digite 0 se não vendeu nenhuma unidade. Se ainda não sabe ou quer descobrir quanto precisa vender, deixe em branco — o resultado será parcial e a meta aparecerá apenas como referência.",
      ),
    ).toBeVisible();
  });
});

describe("category-specific detailed costs", () => {
  it("keeps Product focused on resale purchase and packaging costs", () => {
    const state = productState();
    render(<DetailedProductCostsStep state={state} dispatch={vi.fn()} />);

    expect(screen.getByText(/produto para revenda/i)).toBeVisible();
    expect(screen.getByLabelText("Custo de compra por unidade")).toBeEnabled();
    expect(screen.getByLabelText("Embalagem por unidade")).toBeEnabled();
    expect(screen.queryByText(/ingrediente/i)).not.toBeInTheDocument();
  });

  it("renders both Production modes without discarding technical-sheet fields", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = productionState();
    const { rerender } = render(
      <DetailedProductionCostsStep state={state} dispatch={dispatch} />,
    );

    expect(
      screen.getByRole("radio", { name: /ficha técnica completa/i }),
    ).toBeChecked();
    expect(screen.getByLabelText("Rendimento da receita")).toHaveValue("1");
    expect(screen.getByLabelText("Perda da produção")).toHaveValue("0");
    expect(
      screen.getByRole("group", { name: "Ingredientes da receita" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Nome do ingrediente")).toHaveValue(
      "Ingrediente 1",
    );
    expect(screen.queryByLabelText("Quantidade usada")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Continuar com Ingrediente 1" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "confirmIngredientName",
      itemId: "item-1",
      ingredientId: "ingredient-1",
    });

    await user.click(
      screen.getByRole("radio", { name: /custo total por unidade/i }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "setCostMode",
      itemId: "item-1",
      costMode: "summarized",
    });

    const item = state.values.items[0];
    if (item.kind !== "manufacturing") throw new Error("unexpected item");
    rerender(
      <DetailedProductionCostsStep
        state={{
          ...state,
          values: {
            ...state.values,
            items: [{ ...item, costMode: "summarized" }],
          },
        }}
        dispatch={dispatch}
      />,
    );
    expect(
      screen.getByLabelText("Custo total por unidade pronta"),
    ).toBeEnabled();
    expect(
      screen.queryByText("Ingredientes da receita"),
    ).not.toBeInTheDocument();
  });

  it("dispatches ingredient additions and accessible removals", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = productionState();
    const item = state.values.items[0];
    if (item.kind !== "manufacturing") throw new Error("unexpected item");
    const withTwo = {
      ...state,
      pendingIngredientNameId: null,
      values: {
        ...state.values,
        items: [
          {
            ...item,
            ingredients: [
              ...item.ingredients,
              {
                id: "ingredient-2",
                name: "Açúcar",
                quantity: "1",
                unit: "kg",
                unitCost: "4",
              },
            ],
          },
        ],
      },
    };

    render(<DetailedProductionCostsStep state={withTwo} dispatch={dispatch} />);
    await user.click(
      screen.getByRole("button", { name: "Adicionar ingrediente" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "addIngredient",
      itemId: "item-1",
      createId: expect.any(Function),
    });

    await user.click(screen.getByRole("button", { name: "Remover Açúcar" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "removeIngredient",
      itemId: "item-1",
      ingredientId: "ingredient-2",
    });
  });
});

describe("detailed item completion and review", () => {
  it("offers exact item actions and confirms destructive removal", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const state = productState();
    const item = state.values.items[0] as DetailedProductItemInput;
    const withTwo = {
      ...state,
      phase: "itemComplete" as const,
      itemSubstep: "complete" as const,
      values: {
        ...state.values,
        items: [
          {
            ...item,
            name: "Caneca",
            unitSalePrice: "30",
            monthlySalesVolume: "37",
          },
          { ...item, id: "item-2", name: "Caderno", monthlySalesVolume: "0" },
        ],
      },
    };
    const { rerender } = render(
      <DetailedItemCompleteStep state={withTwo} dispatch={dispatch} />,
    );

    await user.click(screen.getByRole("button", { name: "Editar Caneca" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "editItem",
      itemId: "item-1",
    });
    await user.click(screen.getByRole("button", { name: "Remover Caneca" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "requestRemoveItem",
      itemId: "item-1",
    });
    expect(
      screen.getByRole("button", { name: "Adicionar outro produto" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Revisar diagnóstico" }),
    ).toBeEnabled();

    rerender(
      <DetailedItemCompleteStep
        state={{ ...withTwo, pendingRemovalItemId: "item-1" }}
        dispatch={dispatch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirmar remoção" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "confirmRemoveItem" });
  });

  it("distinguishes missing, zero, and known volumes and allows partial submit", () => {
    const state = productState();
    const item = state.values.items[0] as DetailedProductItemInput;
    const onSubmit = vi.fn();
    render(
      <DetailedReviewStep
        state={{
          ...state,
          phase: "review",
          values: {
            ...state.values,
            items: [
              { ...item, name: "Sem volume", monthlySalesVolume: "" },
              {
                ...item,
                id: "item-2",
                name: "Sem vendas",
                monthlySalesVolume: "0",
              },
              {
                ...item,
                id: "item-3",
                name: "Caneca",
                monthlySalesVolume: "37",
              },
            ],
          },
        }}
        dispatch={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("Volume ainda não informado")).toBeVisible();
    expect(screen.getByText("Nenhuma venda no mês")).toBeVisible();
    expect(screen.getByText("37 unidades por mês")).toBeVisible();
    expect(screen.getByText(/resultado será parcial/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Gerar diagnóstico detalhado" }),
    ).toBeEnabled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
