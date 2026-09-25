import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  FixedExpensesField,
  MonthlyVolumeField,
  OwnerCompensationFields,
  SalesFeesFields,
  type FieldBinding,
} from "./business-fields";
import {
  ProductionUnitCostField,
  ResalePurchaseCostField,
  UnitSalePriceField,
} from "./unit-value-fields";

function binding(field: string, value = ""): FieldBinding {
  return {
    field,
    value,
    errors: {},
    onChange: () => undefined,
  };
}

describe("shared diagnosis fields", () => {
  it("preserves the quick-flow business copy and help", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FixedExpensesField {...binding("fixedMonthlyExpenses")} />,
    );

    expect(screen.getByLabelText("Gastos que existem todo mês")).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "O que incluir?" }));
    expect(
      screen.getByText(/aluguel, energia, internet, sistemas/i),
    ).toBeVisible();

    rerender(<MonthlyVolumeField {...binding("monthlySalesVolume")} />);
    expect(screen.getByText("Opcional")).toBeVisible();
    expect(
      screen.getByText(/Digite 0 se não vendeu nenhuma unidade/),
    ).toBeVisible();

    function OwnerHarness() {
      const [included, setIncluded] = useState(false);

      return (
        <OwnerCompensationFields
          switchId="proLaboreIncluded"
          included={included}
          amount={binding("proLabore")}
          onIncludedChange={setIncluded}
        />
      );
    }

    rerender(<OwnerHarness />);
    const ownerSwitch = screen.getByRole("switch", {
      name: "Você quer incluir o valor que recebe pelo seu trabalho?",
    });
    await user.click(ownerSwitch);
    expect(
      screen.getByLabelText("Quanto você quer receber por mês?"),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Por que informar?" }));
    expect(
      screen.getByText(/quanto o negócio precisa pagar pelo seu trabalho/i),
    ).toBeVisible();

    rerender(
      <SalesFeesFields
        tax={binding("taxRate")}
        card={binding("cardFeeRate")}
      />,
    );
    expect(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
    ).toBeEnabled();
    expect(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
    ).toBeEnabled();
  });

  it("preserves the quick-flow unit-value labels", () => {
    const { rerender } = render(
      <ResalePurchaseCostField {...binding("purchaseUnitCost")} />,
    );

    expect(
      screen.getByLabelText("Quanto você paga ao fornecedor por unidade?"),
    ).toBeEnabled();

    rerender(<ProductionUnitCostField {...binding("productionUnitCost")} />);
    expect(
      screen.getByLabelText("Quanto custa produzir uma unidade?"),
    ).toBeEnabled();

    rerender(<UnitSalePriceField {...binding("unitSalePrice")} />);
    expect(
      screen.getByLabelText("Por quanto você vende cada unidade?"),
    ).toBeEnabled();
  });
});
