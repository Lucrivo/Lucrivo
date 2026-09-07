import { useReducer } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ProductionDiagnosisInput } from "../../../types";
import {
  createInitialProductionWizardState,
  productionWizardReducer,
} from "../production-wizard-state";
import { AnalysisModeStep } from "./analysis-mode-step";
import { MonthlyVolumeStep } from "./monthly-volume-step";
import { OwnerCompensationStep } from "./owner-compensation-step";
import { ProductionFeesStep } from "./production-fees-step";
import { ProductionFixedExpensesStep } from "./production-fixed-expenses-step";
import { ProductionValuesStep } from "./production-values-step";
import { productionStepFields } from "./types";

const values: ProductionDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: false,
  productionUnitCost: "40,00",
  materialUnitCost: "30,00",
  packagingUnitCost: "5,00",
  directLaborUnitCost: "10,00",
  otherVariableUnitCost: "5,00",
  unitSalePrice: "100,00",
  fixedMonthlyExpenses: "0",
  monthlySalesVolume: "",
  proLaboreIncluded: false,
  proLabore: "",
  taxRate: "6",
  cardFeeRate: "2",
};

const onChange = vi.fn();

describe("Production diagnosis steps", () => {
  it("declares the exact fields validated by each input step", () => {
    expect(productionStepFields).toEqual({
      productionValues: [
        "costCompositionEnabled",
        "productionUnitCost",
        "materialUnitCost",
        "packagingUnitCost",
        "directLaborUnitCost",
        "otherVariableUnitCost",
        "unitSalePrice",
      ],
      fixedExpenses: ["fixedMonthlyExpenses"],
      monthlyVolume: ["monthlySalesVolume"],
      ownerCompensation: ["proLabore"],
      fees: ["taxRate", "cardFeeRate"],
    });
  });

  it("offers Quick by keyboard and disables Detailed with Em breve", async () => {
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

  it("links summarized Production value errors and excludes other categories", () => {
    render(
      <ProductionValuesStep
        values={values}
        errors={{ productionUnitCost: ["Informe um custo válido."] }}
        onChange={onChange}
        onCostCompositionEnabledChange={vi.fn()}
      />,
    );

    const productionCost = screen.getByLabelText(
      "Quanto custa produzir uma unidade?",
    );
    expect(productionCost).toHaveAttribute("aria-invalid", "true");
    expect(productionCost).toHaveAttribute(
      "aria-describedby",
      "productionUnitCost-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um custo válido.",
    );
    expect(
      screen.getByLabelText("Por quanto você vende cada unidade?"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/custo de compra/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hora faturável/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/atendimento/i)).not.toBeInTheDocument();
  });

  it("toggles cost composition by keyboard and exposes an announced exact total", async () => {
    const user = userEvent.setup();

    function ValuesHarness() {
      const [state, dispatch] = useReducer(productionWizardReducer, {
        ...createInitialProductionWizardState(values.submissionId),
        values,
      });

      return (
        <ProductionValuesStep
          values={state.values}
          errors={state.fieldErrors}
          onChange={(field, value) =>
            dispatch({ type: "setField", field, value })
          }
          onCostCompositionEnabledChange={(value) =>
            dispatch({ type: "setCostCompositionEnabled", value })
          }
        />
      );
    }

    render(<ValuesHarness />);
    const composition = screen.getByRole("switch", {
      name: "Quer somar os gastos de produção por partes?",
    });

    expect(composition).not.toBeChecked();
    expect(
      screen.getByLabelText("Quanto custa produzir uma unidade?"),
    ).toBeVisible();
    expect(screen.queryByLabelText("Materiais")).toBeNull();

    composition.focus();
    await user.keyboard(" ");

    expect(composition).toBeChecked();
    expect(screen.getByLabelText("Materiais")).toHaveValue("30,00");
    expect(screen.getByLabelText("Embalagem")).toHaveValue("5,00");
    expect(screen.getByLabelText("Seu tempo de produção")).toHaveValue("10,00");
    expect(screen.getByLabelText("Outros gastos por unidade")).toHaveValue(
      "5,00",
    );
    expect(screen.getByRole("status")).toHaveTextContent("R$ 50,00");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText(/some os gastos usados para produzir/i),
    ).toBeVisible();
    expect(
      screen.getByText(/valor que você recebe pelo seu trabalho/i),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Quanto custa produzir uma unidade?"),
    ).not.toBeInTheDocument();

    composition.focus();
    await user.keyboard(" ");

    expect(composition).not.toBeChecked();
    expect(
      screen.getByLabelText("Quanto custa produzir uma unidade?"),
    ).toHaveValue("50,00");
    expect(screen.queryByLabelText("Materiais")).toBeNull();
  });

  it("links a cost-mode error to its switch", () => {
    render(
      <ProductionValuesStep
        values={values}
        errors={{ costCompositionEnabled: ["Escolha uma forma de custo."] }}
        onChange={onChange}
        onCostCompositionEnabledChange={vi.fn()}
      />,
    );

    const composition = screen.getByRole("switch", {
      name: "Quer somar os gastos de produção por partes?",
    });
    expect(composition).toHaveAttribute("aria-invalid", "true");
    expect(composition).toHaveAttribute(
      "aria-describedby",
      "costCompositionEnabled-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escolha uma forma de custo.",
    );
  });

  it("accepts zero monthly expenses and explains what to include", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProductionFixedExpensesStep
        values={values}
        errors={{}}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText("Gastos que existem todo mês")).toHaveValue(
      "0",
    );
    const help = screen.getByRole("button", { name: "O que incluir?" });
    help.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByText(
        "Some aluguel, energia, internet, sistemas e outros gastos que continuam mesmo quando você vende pouco.",
      ),
    ).toBeInTheDocument();

    rerender(
      <MonthlyVolumeStep values={values} errors={{}} onChange={onChange} />,
    );
    expect(screen.getByText(/opcional/i)).toBeVisible();
    expect(
      screen.getByLabelText("Quantas unidades você vende em um mês comum?"),
    ).toHaveValue("");
  });

  it("starts compensation off and toggles its field by keyboard", async () => {
    const user = userEvent.setup();

    function CompensationHarness() {
      const [state, dispatch] = useReducer(productionWizardReducer, {
        ...createInitialProductionWizardState(values.submissionId),
        values,
      });

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
      name: "Você quer incluir o valor que recebe pelo seu trabalho?",
    });

    expect(compensation).not.toBeChecked();
    expect(
      screen.queryByLabelText("Quanto você quer receber por mês?"),
    ).toBeNull();

    compensation.focus();
    await user.keyboard(" ");

    expect(compensation).toBeChecked();
    expect(
      screen.getByLabelText("Quanto você quer receber por mês?"),
    ).toHaveValue("");
  });

  it("exposes Production tax and card fee fields", () => {
    render(
      <ProductionFeesStep values={values} errors={{}} onChange={onChange} />,
    );

    expect(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
    ).toHaveValue("6");
    expect(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
    ).toHaveValue("2");
  });
});
