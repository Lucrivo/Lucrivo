import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportNumbers } from "./report-numbers";

const numbers = [
  { key: "price" as const, label: "Preço atual", value: "R$ 80,00" },
  { key: "margin" as const, label: "Margem real", value: "17%" },
  { key: "profit" as const, label: "Lucro por hora", value: "R$ 13,60" },
  { key: "minimum" as const, label: "Preço mínimo", value: "R$ 65,22" },
  { key: "target" as const, label: "Preço-alvo (15%)", value: "R$ 77,93" },
];

describe("ReportNumbers", () => {
  it("renders exactly five labeled values", () => {
    render(<ReportNumbers numbers={numbers} />);
    const rail = screen.getByRole("complementary", { name: "Seus números" });

    expect(
      within(rail).getByRole("heading", { name: "Seus números" }),
    ).toBeInTheDocument();
    expect(
      Array.from(rail.querySelectorAll("dt")).map((term) => term.textContent),
    ).toEqual(numbers.map(({ label }) => label));
    expect(
      Array.from(rail.querySelectorAll("dd")).map(
        (description) => description.textContent,
      ),
    ).toEqual(numbers.map(({ value }) => value));
  });
});
