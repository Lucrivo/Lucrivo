import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IngredientNameEntry } from "./ingredient-name-entry";

describe("IngredientNameEntry", () => {
  it("keeps the name first and submits with Enter", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <IngredientNameEntry
        id="ingredient-1"
        value="Ingrediente 1"
        canCancel
        onChange={vi.fn()}
        onContinue={onContinue}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Nome do ingrediente")).toHaveValue(
      "Ingrediente 1",
    );
    expect(screen.queryByLabelText("Quantidade usada")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Nome do ingrediente"));
    await user.keyboard("{Enter}");
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("explains that an empty name cannot continue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <IngredientNameEntry
        id="ingredient-1"
        value=""
        canCancel
        onChange={vi.fn()}
        onContinue={onContinue}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continuar com este ingrediente" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um nome.");
    expect(onContinue).not.toHaveBeenCalled();
  });
});
