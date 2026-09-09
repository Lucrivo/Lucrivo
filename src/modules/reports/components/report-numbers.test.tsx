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

  it("keeps long values readable and opens help from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <div className="w-64">
        <ReportNumbers
          numbers={[
            {
              key: "minimum",
              label: "Menor preço sem prejuízo",
              value: "R$ 1.234.567.890,00",
              help: {
                triggerLabel: "Como calculamos?",
                title: "Menor preço sem prejuízo",
                description:
                  "Inclui os gastos mensais, quanto você quer receber, materiais e taxas.",
              },
            },
            {
              key: "sales",
              label: "Quantidade de serviços por mês",
              value: "123.456 atendimentos",
              supportingText: "28.511 por semana e 5.703 por dia de trabalho.",
            },
          ]}
          title="Seus números"
          description="Valores calculados com o que você informou."
        />
      </div>,
    );

    const trigger = screen.getByRole("button", { name: "Como calculamos?" });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByText("Menor preço sem prejuízo", { selector: "h2" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();

    expect(screen.getByText("R$ 1.234.567.890,00")).toHaveClass("break-words");
    expect(screen.getByText("123.456 atendimentos")).toHaveClass("break-words");
  });
});
