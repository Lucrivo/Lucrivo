import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ReportDiscountSimulationBase } from "../types";
import { DiscountSimulator, simulateDiscount } from "./discount-simulator";

const base = {
  originalPriceCents: 10_000,
  unitCostCents: 8_000,
  totalFeeBasisPoints: 0,
  minimumPriceCents: 8_000,
} satisfies ReportDiscountSimulationBase;

describe("simulateDiscount", () => {
  it.each([
    [0, 10_000, 2_000, 2_000, "positive_result"],
    [10, 9_000, 1_000, 1_111, "positive_result"],
    [20, 8_000, 0, 0, "break_even"],
    [50, 5_000, -3_000, -6_000, "loss"],
  ] as const)(
    "classifies the objective state at %i%%",
    (discount, price, profit, margin, status) => {
      expect(simulateDiscount(base, discount)).toEqual({
        discountPercent: discount,
        discountedPriceCents: price,
        unitProfitCents: profit,
        realMarginBasisPoints: margin,
        status,
      });
    },
  );

  it("treats any positive unit result as positive", () => {
    expect(
      simulateDiscount(
        { ...base, unitCostCents: 9_999, minimumPriceCents: 9_999 },
        0,
      ),
    ).toMatchObject({ unitProfitCents: 1, status: "positive_result" });
  });

  it("is unavailable without full unit cost or minimum price", () => {
    expect(simulateDiscount({ ...base, unitCostCents: null }, 10).status).toBe(
      "unavailable",
    );
    expect(
      simulateDiscount({ ...base, minimumPriceCents: null }, 10).status,
    ).toBe("unavailable");
  });
});

describe("DiscountSimulator", () => {
  it("exposes an accessible range and objective positive text", () => {
    render(<DiscountSimulator base={base} context={{ category: "product" }} />);
    const simulator = screen.getByTestId("discount-simulator");
    const slider = within(simulator).getByRole("slider", {
      name: "Desconto simulado",
    });

    expect(slider).toHaveValue("10");
    expect(slider).toHaveAttribute("aria-valuetext", "10% de desconto");
    expect(within(simulator).getByTestId("discount-safety")).toHaveTextContent(
      "Lucro estimado",
    );
    expect(within(simulator).getByText("Resultado por unidade")).toBeVisible();
    expect(simulator.textContent).not.toMatch(/meta|faixa|folga/i);
  });

  it("announces break-even and loss in text, not color alone", () => {
    render(<DiscountSimulator base={base} context={{ category: "product" }} />);
    const slider = screen.getByRole("slider", { name: "Desconto simulado" });

    fireEvent.change(slider, { target: { value: "20" } });
    expect(screen.getByTestId("discount-safety")).toHaveTextContent(
      "sem gerar lucro nem prejuízo",
    );
    expect(screen.getByTestId("discount-safety")).toHaveClass(
      "dark:text-warning",
    );
    fireEvent.change(slider, { target: { value: "50" } });
    expect(screen.getByTestId("discount-safety")).toHaveTextContent(
      "Prejuízo estimado",
    );
  });

  it("disables the range and explains the missing quantity", () => {
    render(
      <DiscountSimulator
        base={{ ...base, unitCostCents: null, minimumPriceCents: null }}
        context={{ category: "production" }}
      />,
    );

    expect(
      screen.getByRole("slider", { name: "Desconto simulado" }),
    ).toBeDisabled();
    expect(screen.getByTestId("discount-safety")).toHaveTextContent(
      "primeiro precisamos de uma quantidade para dividir os gastos do mês",
    );
    expect(screen.getAllByText("Indisponível")).toHaveLength(3);
  });

  it("shows required sales in break-even reference mode", () => {
    render(
      <DiscountSimulator
        base={base}
        context={{
          category: "product",
          breakEvenReference: {
            effectiveFixedCostCents: 500_000,
            directUnitCostCents: 4_000,
            referenceVolume: 100,
          },
        }}
      />,
    );

    expect(
      screen.getByText("Vendas necessárias com este desconto"),
    ).toBeVisible();
    expect(screen.queryByText("Resultado por unidade")).not.toBeInTheDocument();
    expect(screen.getByText("100 vendas")).toBeVisible();
    fireEvent.change(screen.getByRole("slider", { name: "Desconto simulado" }), {
      target: { value: "0" },
    });
    expect(screen.getByText("84 vendas")).toBeVisible();
  });
});
