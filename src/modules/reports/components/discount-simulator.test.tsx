import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ReportDiscountSimulationBase } from "../types";
import { DiscountSimulator, simulateDiscount } from "./discount-simulator";

const base = {
  originalPriceCents: 10_000,
  unitCostCents: 8_000,
  totalFeeBasisPoints: 0,
  targetMarginBasisPoints: 1_500,
  minimumPriceCents: 8_000,
} satisfies ReportDiscountSimulationBase;

const completeProductBase = {
  originalPriceCents: 10_000,
  unitCostCents: 8_000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2_000,
  minimumPriceCents: 8_696,
  partial: false,
} satisfies ReportDiscountSimulationBase;

const partialProductBase = {
  originalPriceCents: 10_000,
  unitCostCents: 5_000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2_000,
  minimumPriceCents: 5_435,
  partial: true,
} satisfies ReportDiscountSimulationBase;

describe("simulateDiscount", () => {
  it.each([
    {
      discount: 0,
      expected: {
        discountPercent: 0,
        discountedPriceCents: 10_000,
        unitProfitCents: 2_000,
        realMarginBasisPoints: 2_000,
        status: "target",
      },
    },
    {
      discount: 10,
      expected: {
        discountPercent: 10,
        discountedPriceCents: 9_000,
        unitProfitCents: 1_000,
        realMarginBasisPoints: 1_111,
        status: "below_target",
      },
    },
    {
      discount: 20,
      expected: {
        discountPercent: 20,
        discountedPriceCents: 8_000,
        unitProfitCents: 0,
        realMarginBasisPoints: 0,
        status: "break_even",
      },
    },
    {
      discount: 50,
      expected: {
        discountPercent: 50,
        discountedPriceCents: 5_000,
        unitProfitCents: -3_000,
        realMarginBasisPoints: -6_000,
        status: "loss",
      },
    },
  ])(
    "calculates the $discount% boundary with integer math",
    ({ discount, expected }) => {
      expect(simulateDiscount(base, discount)).toMatchObject(expected);
    },
  );

  it("clamps discounts to whole percentages from zero through fifty", () => {
    expect(simulateDiscount(base, -3).discountPercent).toBe(0);
    expect(simulateDiscount(base, 10.8).discountPercent).toBe(11);
    expect(simulateDiscount(base, 90).discountPercent).toBe(50);
  });

  it("returns an unavailable state without enough price information", () => {
    expect(
      simulateDiscount({ ...base, minimumPriceCents: null }, 10),
    ).toMatchObject({ status: "unavailable" });
    expect(
      simulateDiscount({ ...base, originalPriceCents: 0 }, 10),
    ).toMatchObject({ status: "unavailable" });
  });

  it.each([
    [0, 10_000, 1_200, 1_200, "below_target"],
    [10, 9_000, 280, 311, "below_target"],
    [13, 8_700, 4, 5, "below_target"],
    [50, 5_000, -3_400, -6_800, "loss"],
  ] as const)(
    "calculates complete Product profit at %i%%",
    (discount, price, profit, margin, status) => {
      expect(simulateDiscount(completeProductBase, discount)).toMatchObject({
        discountedPriceCents: price,
        unitProfitCents: profit,
        realMarginBasisPoints: margin,
        status,
      });
    },
  );

  it.each([
    [0, 10_000, 4_200, 4_200, "target"],
    [10, 9_000, 3_280, 3_644, "target"],
    [46, 5_400, -32, -59, "loss"],
    [50, 5_000, -400, -800, "loss"],
  ] as const)(
    "calculates partial Product contribution at %i%%",
    (discount, price, contribution, margin, status) => {
      expect(simulateDiscount(partialProductBase, discount)).toMatchObject({
        discountedPriceCents: price,
        unitProfitCents: contribution,
        realMarginBasisPoints: margin,
        status,
      });
    },
  );

  it("keeps the Product break-even boundary deterministic", () => {
    expect(
      simulateDiscount(
        {
          ...partialProductBase,
          totalFeeBasisPoints: 0,
          minimumPriceCents: 5_000,
        },
        50,
      ),
    ).toMatchObject({
      discountedPriceCents: 5_000,
      unitProfitCents: 0,
      realMarginBasisPoints: 0,
      status: "break_even",
    });
  });
});

describe("DiscountSimulator", () => {
  it("exposes an accessible range and starts at the approved ten percent", () => {
    render(<DiscountSimulator base={base} />);

    const slider = screen.getByRole("slider", { name: "Desconto simulado" });
    expect(slider).toHaveValue("10");
    expect(slider).toHaveAttribute("aria-valuetext", "10% de desconto");
    expect(screen.getByText("10%", { selector: "output" })).toBeInTheDocument();
  });

  it("updates price, profit, margin, and live safety copy at each boundary", () => {
    render(<DiscountSimulator base={base} />);
    const simulator = screen.getByTestId("discount-simulator");
    const slider = within(simulator).getByRole("slider", {
      name: "Desconto simulado",
    });

    fireEvent.change(slider, { target: { value: "0" } });
    expect(within(simulator).getAllByText("R$ 100,00")).toHaveLength(2);
    expect(within(simulator).getByText("R$ 20,00")).toBeInTheDocument();
    expect(within(simulator).getByText("20%")).toBeInTheDocument();
    expect(within(simulator).getByTestId("discount-safety")).toHaveTextContent(
      "continua na meta",
    );

    fireEvent.change(slider, { target: { value: "10" } });
    expect(within(simulator).getByText("R$ 90,00")).toBeInTheDocument();
    expect(within(simulator).getByText("R$ 10,00")).toBeInTheDocument();
    expect(within(simulator).getByText("11,11%")).toBeInTheDocument();
    expect(within(simulator).getByTestId("discount-safety")).toHaveTextContent(
      "abaixo da meta",
    );

    fireEvent.change(slider, { target: { value: "20" } });
    expect(within(simulator).getByText("R$ 80,00")).toBeInTheDocument();
    expect(within(simulator).getByText("R$ 0,00")).toBeInTheDocument();
    expect(within(simulator).getByTestId("discount-safety")).toHaveTextContent(
      "chegou ao limite",
    );

    fireEvent.change(slider, { target: { value: "50" } });
    expect(within(simulator).getByText("R$ 50,00")).toBeInTheDocument();
    expect(within(simulator).getByText("-R$ 30,00")).toBeInTheDocument();
    expect(within(simulator).getByText("-60%")).toBeInTheDocument();
    expect(within(simulator).getByTestId("discount-safety")).toHaveTextContent(
      "vende no prejuízo",
    );
  });

  it("renders a stable explanation when simulation is unavailable", () => {
    render(<DiscountSimulator base={{ ...base, unitCostCents: null }} />);

    expect(screen.getByTestId("discount-safety")).toHaveTextContent(
      "Não foi possível simular",
    );
    expect(
      screen.getByRole("slider", { name: "Desconto simulado" }),
    ).toBeDisabled();
  });

  it("uses real profit language for a complete Product simulation", () => {
    render(<DiscountSimulator base={completeProductBase} />);

    expect(screen.getByText("Margem real")).toBeInTheDocument();
    expect(screen.getByText("Lucro por unidade")).toBeInTheDocument();
    expect(
      screen.queryByText("Simulação parcial", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("uses contribution language and a warning for a partial Product simulation", () => {
    render(<DiscountSimulator base={partialProductBase} />);

    expect(screen.getByText("Margem de contribuição")).toBeInTheDocument();
    expect(screen.getByText("Contribuição por unidade")).toBeInTheDocument();
    expect(
      screen.getByText("Simulação parcial", { exact: false }),
    ).toHaveTextContent(
      "Simulação parcial: despesas fixas e pró-labore não foram rateados por unidade.",
    );
    expect(screen.queryByText("Lucro por unidade")).not.toBeInTheDocument();
    expect(screen.queryByText("Margem real")).not.toBeInTheDocument();
  });

  it("keeps immutable Service simulator copy unchanged", () => {
    render(<DiscountSimulator base={base} />);

    expect(screen.getByText("Nova margem")).toBeInTheDocument();
    expect(screen.getByText("Lucro por venda")).toBeInTheDocument();
    expect(
      screen.queryByText("Simulação parcial", { exact: false }),
    ).not.toBeInTheDocument();
  });
});
