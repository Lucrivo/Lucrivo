import { useReducer, useState } from "react";
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
import { ProductReviewStep } from "./product-review-step";
import { ProductValuesStep } from "./product-values-step";

const values: ProductDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  productKind: "resale",
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
  it("offers both analysis modes by keyboard", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(<AnalysisModeStep value="" error={null} onChange={onModeChange} />);

    const quick = screen.getByRole("radio", { name: "Diagnóstico rápido" });
    quick.focus();
    await user.keyboard(" ");

    expect(onModeChange).toHaveBeenCalledWith("quick");
    expect(quick).toBeEnabled();
    const detailed = screen.getByRole("radio", {
      name: "Diagnóstico detalhado",
    });
    await user.click(detailed);
    expect(detailed).toBeEnabled();
    expect(onModeChange).toHaveBeenLastCalledWith("detailed");
    expect(screen.queryByText(/\bmix\b/i)).not.toBeInTheDocument();
  });

  it("links Product value errors and contains no Service fields", () => {
    render(
      <ProductValuesStep
        values={values}
        errors={{ purchaseUnitCost: ["Informe um custo válido."] }}
        onChange={onChange}
      />,
    );

    const purchaseCost = screen.getByLabelText(
      "Quanto você paga ao fornecedor por unidade?",
    );
    expect(purchaseCost).toHaveAttribute("aria-invalid", "true");
    expect(purchaseCost).toHaveAttribute(
      "aria-describedby",
      "purchaseUnitCost-description purchaseUnitCost-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um custo válido.",
    );
    expect(
      screen.getByLabelText("Por quanto você vende cada unidade?"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/hora faturável/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/atendimento/i)).not.toBeInTheDocument();
  });

  it("switches Product kind by keyboard and preserves the direct cost", async () => {
    const user = userEvent.setup();

    function ValuesHarness() {
      const [currentValues, setCurrentValues] = useState(values);

      return (
        <ProductValuesStep
          values={currentValues}
          errors={{}}
          onChange={(field, value) =>
            setCurrentValues((current) => ({ ...current, [field]: value }))
          }
        />
      );
    }

    render(<ValuesHarness />);
    const resale = screen.getByRole("radio", { name: "Produto para revenda" });
    expect(resale).toBeChecked();
    expect(
      screen.getByLabelText("Quanto você paga ao fornecedor por unidade?"),
    ).toHaveValue("50,00");

    resale.focus();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("radio", { name: "Produto digital" }),
    ).toBeChecked();
    expect(
      screen.getByLabelText("Existe algum gasto a cada venda?"),
    ).toHaveValue("50,00");

    await user.click(
      screen.getByRole("button", { name: "Entenda este custo" }),
    );
    expect(
      screen.getByText(
        "Um produto digital pode não ter custo direto. Se houver licença, plataforma, entrega ou outra cobrança que acontece a cada venda, informe esse valor.",
      ),
    ).toBeVisible();
  });

  it("marks purchase cost as optional and explains the zero-cost case", () => {
    render(
      <ProductValuesStep
        values={{ ...values, purchaseUnitCost: "" }}
        errors={{}}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByLabelText("Quanto você paga ao fornecedor por unidade?"),
    ).toHaveValue("");
    expect(
      screen.getByText(
        "Opcional. Deixe em branco se o produto não tiver custo direto.",
      ),
    ).toBeVisible();
  });

  it("accepts zero monthly expenses and explains what to include", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProductFixedExpensesStep
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
    expect(
      screen.getByText(
        /Se você já vende este item, informe a média mensal[\s\S]*Digite 0[\s\S]*deixe em branco[\s\S]*resultado será parcial/i,
      ),
    ).toBeVisible();
    expect(screen.getByText("Opcional")).toBeVisible();
    expect(
      screen.getByLabelText("Quantas unidades você vende por mês?"),
    ).toHaveValue("");
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
      name: "Você quer incluir o valor que recebe pelo seu trabalho?",
    });

    expect(compensation).not.toBeChecked();
    expect(
      screen.queryByLabelText("Quanto você quer receber por mês?"),
    ).not.toBeInTheDocument();

    compensation.focus();
    await user.keyboard(" ");
    expect(compensation).toBeChecked();
    await user.type(
      screen.getByLabelText("Quanto você quer receber por mês?"),
      "2000",
    );

    compensation.focus();
    await user.keyboard(" ");
    expect(compensation).not.toBeChecked();
    expect(
      screen.queryByLabelText("Quanto você quer receber por mês?"),
    ).not.toBeInTheDocument();

    compensation.focus();
    await user.keyboard(" ");
    expect(
      screen.getByLabelText("Quanto você quer receber por mês?"),
    ).toHaveValue("");
  });

  it("exposes Product tax and card fee fields", () => {
    render(<ProductFeesStep values={values} errors={{}} onChange={onChange} />);

    expect(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
    ).toHaveValue("6");
    expect(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
    ).toHaveValue("2");
  });

  it("reviews Digital zero cost and keeps supplier wording for Resale", () => {
    const props = {
      errors: {},
      pending: false,
      submitError: null,
      onEdit: vi.fn(),
      onBackToType: vi.fn(),
      onSubmit: vi.fn(),
    } as const;
    const { rerender } = render(
      <ProductReviewStep
        {...props}
        values={{ ...values, productKind: "digital", purchaseUnitCost: "" }}
      />,
    );

    expect(screen.getByText("Produto digital")).toBeVisible();
    expect(screen.getByText("Sem custo por venda")).toBeVisible();

    rerender(<ProductReviewStep {...props} values={values} />);
    expect(screen.getByText("Produto para revenda")).toBeVisible();
    expect(screen.getByText("Custo de compra por unidade")).toBeVisible();
    expect(screen.getByText("R$ 50,00")).toBeVisible();
  });
});
