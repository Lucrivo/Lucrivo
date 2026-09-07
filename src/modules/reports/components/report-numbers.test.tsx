import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    render(
      <ReportNumbers
        numbers={numbers}
        title="Seus números"
        description="Referências financeiras deste diagnóstico."
      />,
    );
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

  it("explains only the two calculated terms and restores focus", async () => {
    const user = userEvent.setup();
    const explainedNumbers = numbers.map((number) =>
      number.key === "margin"
        ? {
            ...number,
            help: {
              title: "Quanto sobra a cada R$ 100",
              description:
                "Mostra quanto fica no negócio depois de pagar os gastos usados neste cálculo.",
              technicalTerm: "margem",
            },
          }
        : number.key === "target"
          ? {
              ...number,
              help: {
                triggerLabel: "Como calculamos?",
                title: "Preço para alcançar a meta",
                description:
                  "É o preço calculado com seus gastos, taxas e a meta definida neste diagnóstico.",
                technicalTerm: "preço-alvo",
              },
            }
          : number,
    );

    render(
      <ReportNumbers
        numbers={explainedNumbers}
        title="Seus números"
        description="Valores calculados com o que você informou."
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    const trigger = screen.getByRole("button", { name: "Como calculamos?" });
    await user.click(trigger);
    expect(
      screen.getByText(
        "É o preço calculado com seus gastos, taxas e a meta definida neste diagnóstico.",
      ),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });
});
