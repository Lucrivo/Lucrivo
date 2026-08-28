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
});
