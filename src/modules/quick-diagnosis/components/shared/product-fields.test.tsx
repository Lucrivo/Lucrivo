import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductDirectCostField, ProductKindField } from "./product-fields";

describe("shared Product fields", () => {
  it("exposes the Product kind group, valid choices, and linked errors", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ProductKindField
        field="productKind"
        value=""
        error="Escolha o tipo de produto."
        onChange={onChange}
      />,
    );

    const group = screen.getByRole("radiogroup", { name: "Tipo de produto" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-describedby", "productKind-error");
    expect(screen.getByRole("alert")).toHaveAttribute(
      "id",
      "productKind-error",
    );

    await user.click(
      screen.getByRole("radio", { name: "Produto para revenda" }),
    );
    await user.click(screen.getByRole("radio", { name: "Produto digital" }));

    expect(onChange.mock.calls).toEqual([["resale"], ["digital"]]);
  });

  it("preserves the resale direct-cost label", () => {
    render(
      <ProductDirectCostField
        kind="resale"
        field="purchaseUnitCost"
        value="50,00"
        errors={{}}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByLabelText("Quanto você paga ao fornecedor por unidade?"),
    ).toHaveValue("50,00");
  });

  it("preserves the digital direct-cost label, optional copy, and help", async () => {
    const user = userEvent.setup();

    render(
      <ProductDirectCostField
        kind="digital"
        field="purchaseUnitCost"
        value=""
        errors={{ purchaseUnitCost: ["Informe um custo válido."] }}
        onChange={() => undefined}
      />,
    );

    const field = screen.getByLabelText("Existe algum gasto a cada venda?");
    expect(field).toHaveAttribute(
      "aria-describedby",
      "purchaseUnitCost-description purchaseUnitCost-error",
    );
    expect(
      screen.getByText(
        "Opcional. Deixe em branco se o produto não tiver custo direto.",
      ),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Entenda este custo" }),
    );
    expect(
      screen.getByText(
        "Um produto digital pode não ter custo direto. Se houver licença, plataforma, entrega ou outra cobrança que acontece a cada venda, informe esse valor.",
      ),
    ).toBeVisible();
  });
});
