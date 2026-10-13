import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ReportIndicatorViewModel } from "../presenters/to-report-view-model";
import { ReportIndicators } from "./report-indicators";

const indicators: ReportIndicatorViewModel[] = [
  {
    key: "price",
    label: "Preço de venda",
    value: "R$ 80,00",
    tone: "neutral",
    toneLabel: "Informação",
  },
  {
    key: "minimum",
    label: "Menor preço para não ficar no prejuízo",
    value: "R$ 50,21",
    tone: "positive",
    toneLabel: "Resultado positivo",
  },
  {
    key: "sales",
    label: "Vendas necessárias no mês",
    value: "72 vendas",
    tone: "positive",
    toneLabel: "Resultado positivo",
    supportingText: "17 por semana e 3 por dia.",
    featured: true,
  },
  {
    key: "margin",
    label: "Margem de lucro",
    value: "34,26%",
    tone: "positive",
    toneLabel: "Resultado positivo",
    supportingText: "Lucro de R$ 27,41 no mês.",
  },
  {
    key: "discount",
    label: "Desconto máximo sem prejuízo",
    value: "12%",
    tone: "positive",
    toneLabel: "Resultado positivo",
  },
];

describe("ReportIndicators", () => {
  it("renders labeled values with tone and features the sales card", () => {
    render(<ReportIndicators indicators={indicators} />);
    const grid = screen.getByTestId("report-indicators");

    expect(
      Array.from(grid.querySelectorAll("[data-testid=report-indicator]")).map(
        (card) => card.getAttribute("data-indicator-key"),
      ),
    ).toEqual(["sales", "price", "minimum", "margin", "discount"]);
    const featured = grid.querySelector<HTMLElement>('[data-featured="true"]');
    expect(featured).not.toBeNull();
    expect(within(featured!).getByText("72 vendas")).toBeVisible();
    expect(
      within(featured!).getByText("17 por semana e 3 por dia."),
    ).toBeVisible();
    expect(grid.textContent).not.toMatch(/meta|preço-alvo/i);
    expect(grid).toHaveAttribute("data-layout", "featured-with-four");
    expect(
      Array.from(grid.querySelectorAll("[data-testid=report-indicator]"))
        .slice(1)
        .every((card) => card.classList.contains("xl:col-span-4")),
    ).toBe(true);
  });

  it("balances a featured indicator with three regular indicators", () => {
    render(
      <ReportIndicators
        indicators={indicators.filter(({ key }) => key !== "price")}
      />,
    );

    const cards = screen.getAllByTestId("report-indicator");
    expect(screen.getByTestId("report-indicators")).toHaveAttribute(
      "data-layout",
      "featured-with-three",
    );
    expect(cards[0]).toHaveClass("xl:col-span-8");
    expect(cards[1]).toHaveClass("xl:col-span-4");
    expect(cards[2]).toHaveClass("xl:col-span-6");
    expect(cards[3]).toHaveClass("xl:col-span-6");
  });

  it("renders unavailable values below calculated values in the hierarchy", () => {
    render(
      <ReportIndicators
        indicators={[
          {
            key: "sales",
            label: "Unidades necessárias no mês",
            value: "Sem meta única",
            tone: "neutral",
            toneLabel: "Informação",
            unavailable: true,
            details: [
              {
                id: "caneca",
                label: "Caneca",
                value: "4 unidades se vendido sozinho",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Sem meta única")).toHaveAttribute(
      "data-value-state",
      "unavailable",
    );
    expect(screen.getByText("Caneca")).toBeVisible();
    expect(screen.getByText("4 unidades se vendido sozinho")).toBeVisible();
  });

  it("keeps warning values readable in dark mode", () => {
    render(
      <ReportIndicators
        indicators={[
          {
            key: "discount",
            label: "Desconto máximo sem prejuízo",
            value: "0%",
            tone: "warning",
            toneLabel: "Atenção",
          },
        ]}
      />,
    );

    expect(screen.getByText("0%")).toHaveClass("dark:text-warning");
  });

  it("shows why a complete value is unavailable and opens help by keyboard", async () => {
    const user = userEvent.setup();
    render(
      <ReportIndicators
        indicators={[
          {
            key: "minimum",
            label: "Menor preço para não ficar no prejuízo",
            value: "Ainda não calculado",
            tone: "neutral",
            toneLabel: "Informação",
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
        <ReportIndicators
          indicators={[
            {
              key: "minimum",
              label: "Menor preço para não ficar no prejuízo",
              value: "R$ 1.234.567.890,00",
              tone: "neutral",
              toneLabel: "Informação",
            },
          ]}
        />
      </div>,
    );

    expect(screen.getByText("R$ 1.234.567.890,00")).toHaveClass(
      "wrap-break-word",
    );
  });
});
