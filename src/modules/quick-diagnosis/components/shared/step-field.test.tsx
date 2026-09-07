import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StepField } from "./step-field";

describe("StepField", () => {
  it("keeps its label and input aligned to the top when adjacent fields grow", () => {
    render(
      <StepField
        field="price"
        label="Preço"
        value=""
        errors={{}}
        onChange={vi.fn()}
        description="Descrição opcional"
      />,
    );

    const field = screen
      .getByLabelText("Preço")
      .closest("[data-slot=input-group]")?.parentElement;

    expect(field).toHaveClass("content-start");
  });

  it("keeps optional help separate from the input label and description", async () => {
    const user = userEvent.setup();

    render(
      <StepField
        field="monthlyExpenses"
        label="Gastos que existem todo mês"
        value=""
        errors={{}}
        onChange={vi.fn()}
        description="Informe a média de um mês comum."
        help={{
          triggerLabel: "O que incluir?",
          title: "Gastos que existem todo mês",
          description: "Some aluguel, energia, internet e sistemas.",
          technicalTerm: "custos fixos",
        }}
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "Gastos que existem todo mês",
    });
    expect(input).toHaveAccessibleDescription(
      "Informe a média de um mês comum.",
    );

    const trigger = screen.getByRole("button", { name: "O que incluir?" });
    expect(trigger.parentElement).toBe(input.closest("div")?.parentElement);

    await user.click(trigger);

    expect(
      screen.getByText("Some aluguel, energia, internet e sistemas."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nome usado nos cálculos: custos fixos."),
    ).toBeInTheDocument();
  });
});
