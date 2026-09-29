import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ReportNumberViewModel } from "../presenters/to-report-view-model";
import { ReportNumbers } from "./report-numbers";

const numbers: ReportNumberViewModel[] = [
  { key: "price", label: "Preço atual", value: "R$ 80,00" },
  {
    key: "minimum",
    label: "Menor preço para não ficar no prejuízo",
    value: "R$ 50,21",
  },
  {
    key: "profit",
    label: "Resultado por hora",
    value: "R$ 27,41",
  },
  {
    key: "margin",
    label: "Quanto sobra a cada R$ 100",
    value: "34,26%",
  },
];

describe("ReportNumbers", () => {
  it("renders objective labeled values without target numbers", () => {
    render(
      <ReportNumbers
        numbers={numbers}
        title="Seus números"
        description="Valores calculados com o que você informou."
      />,
    );
    const rail = screen.getByRole("complementary", { name: "Seus números" });

    expect(
      Array.from(rail.querySelectorAll("dt")).map((term) => term.textContent),
    ).toEqual(numbers.map(({ label }) => label));
    expect(rail.textContent).not.toMatch(/meta|preço-alvo/i);
  });

  it("features a sales goal and keeps its explanation visible", () => {
    render(
      <ReportNumbers
        numbers={[
          {
            key: "sales",
            label: "Vendas necessárias no mês",
            value: "72 vendas",
            supportingText: "17 por semana e 3 por dia.",
          },
          ...numbers,
        ]}
        title="Seus números"
        description="Valores calculados com o que você informou."
      />,
    );

    const featured = document.querySelector<HTMLElement>(
      '[data-slot="featured-report-number"]',
    );
    expect(featured).not.toBeNull();
    expect(within(featured!).getByText("72 vendas")).toBeVisible();
    expect(
      within(featured!).getByText("17 por semana e 3 por dia."),
    ).toBeVisible();
  });

  it("shows why a complete value is unavailable and opens help by keyboard", async () => {
    const user = userEvent.setup();
    render(
      <ReportNumbers
        numbers={[
          {
            key: "minimum",
            label: "Menor preço para não ficar no prejuízo",
            value: "Ainda não calculado",
            supportingText:
              "Informe uma quantidade maior que zero para dividir os gastos do mês.",
            help: {
              triggerLabel: "Por que está indisponível?",
              title: "Falta uma quantidade para completar o cálculo",
              description:
                "Informe uma quantidade maior que zero para dividir os gastos do mês e calcular o custo completo.",
            },
          },
        ]}
        title="Seus números"
        description="Valores calculados com o que você informou."
      />,
    );

    expect(screen.getByText("Ainda não calculado")).toBeVisible();
    expect(
      screen.getByText(
        "Informe uma quantidade maior que zero para dividir os gastos do mês.",
      ),
    ).toBeVisible();
    const trigger = screen.getByRole("button", {
      name: "Por que está indisponível?",
    });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", {
        name: "Falta uma quantidade para completar o cálculo",
      }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("keeps long financial values readable", () => {
    render(
      <div className="w-64">
        <ReportNumbers
          numbers={[
            {
              key: "minimum",
              label: "Menor preço para não ficar no prejuízo",
              value: "R$ 1.234.567.890,00",
            },
          ]}
          title="Seus números"
          description="Valores calculados com o que você informou."
        />
      </div>,
    );

    expect(screen.getByText("R$ 1.234.567.890,00")).toHaveClass("break-words");
  });
});
