import { render, screen } from "@testing-library/react";
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
});
