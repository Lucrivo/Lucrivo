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
    const featured = grid.querySelector<HTMLElement>(
      '[data-featured="true"]',
    );
    expect(featured).not.toBeNull();
    expect(within(featured!).getByText("72 vendas")).toBeVisible();
    expect(
      within(featured!).getByText("17 por semana e 3 por dia."),
    ).toBeVisible();
    expect(grid.textContent).not.toMatch(/meta|preço-alvo/i);
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
