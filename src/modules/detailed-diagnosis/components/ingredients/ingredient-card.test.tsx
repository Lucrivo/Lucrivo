import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IngredientCard } from "./ingredient-card";

const ingredient = {
  id: "ingredient-1",
  name: "Farinha",
  quantity: "2",
  unit: "kg",
  unitCost: "6,50",
};

describe("IngredientCard", () => {
  it("uses the ingredient name and reveals only its technical fields", async () => {
    const user = userEvent.setup();
    render(
      <IngredientCard
        ingredient={ingredient}
        basePath="items.0.ingredients.0"
        errors={{}}
        canRemove={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Farinha")).toBeVisible();
    expect(screen.queryByLabelText("Quantidade usada")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir Farinha" }));
    expect(screen.getByLabelText("Quantidade usada")).toHaveValue("2");
    expect(screen.getByLabelText("Unidade de compra")).toHaveValue("kg");
    expect(screen.getByLabelText("Custo por unidade de compra")).toHaveValue(
      "6,50",
    );
  });

  it("renames inline, validates blank text, and cancels without mutation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IngredientCard
        ingredient={ingredient}
        basePath="items.0.ingredients.0"
        errors={{}}
        canRemove
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Renomear Farinha" }));
    const input = screen.getByLabelText("Nome do ingrediente");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um nome.");

    await user.type(input, "Trigo");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Renomear Farinha" }));
    await user.clear(screen.getByLabelText("Nome do ingrediente"));
    await user.type(
      screen.getByLabelText("Nome do ingrediente"),
      "Farinha fina",
    );
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(onChange).toHaveBeenCalledWith("name", "Farinha fina");
  });
  it("confirms removal and explains why the last ingredient cannot be removed", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const { rerender } = render(
      <IngredientCard
        ingredient={ingredient}
        basePath="items.0.ingredients.0"
        errors={{}}
        canRemove
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Remover Farinha" });
    await user.click(trigger);
    expect(onRemove).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Remover Farinha?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: "Remover ingrediente" }),
    );
    expect(onRemove).toHaveBeenCalledOnce();

    rerender(
      <IngredientCard
        ingredient={ingredient}
        basePath="items.0.ingredients.0"
        errors={{}}
        canRemove={false}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    const disabledTrigger = screen.getByRole("button", {
      name: "Remover Farinha",
    });
    expect(disabledTrigger).toBeDisabled();
    const wrapper = screen.getByRole("group", {
      name: "Remover Farinha. Mantenha pelo menos um ingrediente.",
    });
    await user.hover(wrapper);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Mantenha pelo menos um ingrediente.",
    );
  });
});
