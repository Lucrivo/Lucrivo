import { useReducer } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ProductDiagnosisInput } from "../../../types";
import {
  createInitialProductWizardState,
  productWizardReducer,
} from "../product-wizard-state";
import { AnalysisModeStep } from "./analysis-mode-step";
import { MonthlyVolumeStep } from "./monthly-volume-step";
import { OwnerCompensationStep } from "./owner-compensation-step";
import { ProductFeesStep } from "./product-fees-step";
import { ProductFixedExpensesStep } from "./product-fixed-expenses-step";
import { ProductValuesStep } from "./product-values-step";

const values: ProductDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCost: "50,00",
  unitSalePrice: "100,00",
  fixedMonthlyExpenses: "0",
  monthlySalesVolume: "",
  proLaboreIncluded: false,
  proLabore: "",
  taxRate: "6",
  cardFeeRate: "2",
};

const onChange = vi.fn();

describe("Product diagnosis steps", () => {
  it("offers keyboard-accessible quick analysis and disables detailed mode", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(<AnalysisModeStep value="" error={null} onChange={onModeChange} />);

    const quick = screen.getByRole("radio", { name: "Diagnóstico rápido" });
    quick.focus();
    await user.keyboard(" ");

    expect(onModeChange).toHaveBeenCalledWith("quick");
    expect(quick).toBeEnabled();
    expect(
      screen.getByRole("radio", { name: "Diagnóstico detalhado" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Em breve")).toBeVisible();
  });

  it("links Product value errors and contains no Service fields", () => {
    render(
      <ProductValuesStep
        values={values}
        errors={{ purchaseUnitCost: ["Informe um custo válido."] }}
        onChange={onChange}
      />,
    );

    const purchaseCost = screen.getByLabelText("Custo de compra por unidade");
    expect(purchaseCost).toHaveAttribute("aria-invalid", "true");
    expect(purchaseCost).toHaveAttribute(
      "aria-describedby",
      "purchaseUnitCost-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um custo válido.",
    );
    expect(
      screen.getByLabelText("Preço de venda por unidade"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/hora faturável/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/atendimento/i)).not.toBeInTheDocument();
  });

  it("accepts zero fixed expenses and marks monthly volume as optional", () => {
    const { rerender } = render(
      <ProductFixedExpensesStep
        values={values}
        errors={{}}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText("Despesas fixas mensais")).toHaveValue("0");

    rerender(
      <MonthlyVolumeStep values={values} errors={{}} onChange={onChange} />,
    );
    expect(screen.getByText(/opcional/i)).toBeVisible();
    expect(screen.getByLabelText("Volume médio mensal de vendas")).toHaveValue(
      "",
    );
  });

  it("toggles compensation by keyboard and removes stale browser text", async () => {
    const user = userEvent.setup();

    function CompensationHarness() {
      const [state, dispatch] = useReducer(
        productWizardReducer,
        values.submissionId,
        createInitialProductWizardState,
      );

      return (
        <OwnerCompensationStep
          values={state.values}
          errors={state.fieldErrors}
          onChange={(field, value) =>
            dispatch({ type: "setField", field, value })
          }
          onProLaboreIncludedChange={(value) =>
            dispatch({ type: "setProLaboreIncluded", value })
          }
        />
      );
    }

    render(<CompensationHarness />);
    const compensation = screen.getByRole("switch", {
      name: "Incluir pró-labore",
    });

    expect(compensation).not.toBeChecked();
    expect(
      screen.queryByLabelText("Pró-labore mensal"),
    ).not.toBeInTheDocument();

    compensation.focus();
    await user.keyboard(" ");
    expect(compensation).toBeChecked();
    await user.type(screen.getByLabelText("Pró-labore mensal"), "2000");

    compensation.focus();
    await user.keyboard(" ");
    expect(compensation).not.toBeChecked();
    expect(
      screen.queryByLabelText("Pró-labore mensal"),
    ).not.toBeInTheDocument();

    compensation.focus();
    await user.keyboard(" ");
    expect(screen.getByLabelText("Pró-labore mensal")).toHaveValue("");
  });

  it("exposes Product tax and card fee fields", () => {
    render(<ProductFeesStep values={values} errors={{}} onChange={onChange} />);

    expect(screen.getByLabelText("Impostos")).toHaveValue("6");
    expect(screen.getByLabelText("Taxa do cartão")).toHaveValue("2");
  });
});
