import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseClientDashboardFilters } from "../client-dashboard.filters";
import type { ClientDashboardViewModel } from "../client-dashboard.types";
import { ClientDashboardMetricGrid } from "./client-dashboard-metric-grid";
import { DashboardDistributions } from "./dashboard-distributions";

function dashboardFixture(allZero = false): ClientDashboardViewModel {
  const value = (count: number) => (allZero ? 0 : count);
  return {
    generatedAtLabel: "01/10/2026",
    hasAnyReports: true,
    focusReportId: 42,
    metrics: {
      totalReports: value(12),
      positiveResultReports: value(5),
      lossReports: value(3),
      pendingDataReports: value(2),
    },
    verdictCounts: [
      {
        verdict: "missing_price",
        count: value(1),
        label: "Preço não informado",
        tone: "info",
      },
      {
        verdict: "direct_loss",
        count: value(2),
        label: "Perda por venda",
        tone: "danger",
      },
      {
        verdict: "incomplete_volume",
        count: value(1),
        label: "Volume não informado",
        tone: "info",
      },
      {
        verdict: "operational_loss",
        count: value(1),
        label: "Prejuízo no cenário informado",
        tone: "danger",
      },
      {
        verdict: "no_sales",
        count: value(1),
        label: "Mês sem vendas",
        tone: "info",
      },
      {
        verdict: "break_even",
        count: value(1),
        label: "Zero a zero",
        tone: "warning",
      },
      {
        verdict: "positive_result",
        count: value(5),
        label: "Resultado positivo",
        tone: "success",
      },
    ],
    priorityCounts: [
      { priority: "cost", count: value(4), label: "Revisar custos" },
      { priority: "data", count: value(2), label: "Completar dados" },
      { priority: "price", count: value(3), label: "Revisar preço" },
      { priority: "margin", count: value(2), label: "Avaliar margem" },
      { priority: "volume", count: value(1), label: "Avaliar volume" },
    ],
    recentReports: [],
  };
}

describe("client dashboard overview", () => {
  it("renders the four count indicators without financial quality claims", () => {
    render(
      <ClientDashboardMetricGrid
        dashboard={dashboardFixture()}
        filters={parseClientDashboardFilters({ category: "product" })}
      />,
    );

    for (const label of [
      "Relatórios no recorte",
      "Com resultado positivo",
      "Com perda ou prejuízo",
      "Com dados pendentes",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(
      screen.queryByText(/na meta|margem boa|saudável/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver resultados positivos" }),
    ).toHaveAttribute(
      "href",
      "/dashboard?category=product&verdict=positive_result",
    );
    expect(
      screen.getByRole("link", { name: "Ver perdas e prejuízos" }),
    ).toHaveAttribute(
      "href",
      "/dashboard?category=product&verdict=direct_loss%2Coperational_loss",
    );
    expect(
      screen.getByRole("link", { name: "Ver dados pendentes" }),
    ).toHaveAttribute("href", "/dashboard?category=product&dataState=pending");
  });

  it("shows text-first distributions with direct values and complete summaries", () => {
    render(<DashboardDistributions dashboard={dashboardFixture()} />);

    const situations = screen
      .getByRole("heading", { name: "Situações dos relatórios" })
      .closest("section");
    expect(situations).not.toBeNull();
    expect(within(situations!).getByText("Resultado positivo")).toBeVisible();
    expect(within(situations!).getByText(/Preço não informado: 1/)).toHaveClass(
      "sr-only",
    );
    const visibleSituationLabels = within(situations!).getAllByRole("listitem");
    expect(visibleSituationLabels[0]).toHaveTextContent("Perda por venda");
    expect(visibleSituationLabels[1]).toHaveTextContent("Preço não informado");

    for (const progress of screen.getAllByRole("progressbar")) {
      expect(progress).toHaveAttribute("aria-valuemin", "0");
      expect(progress).toHaveAttribute("aria-valuemax");
      expect(progress).toHaveAttribute("aria-valuenow");
    }
  });

  it("keeps all zero-filled states in the accessible summary", () => {
    render(<DashboardDistributions dashboard={dashboardFixture(true)} />);

    expect(
      screen.getAllByText("Nenhum diagnóstico neste recorte."),
    ).toHaveLength(2);
    expect(screen.getByText(/Resultado positivo: 0/)).toHaveClass("sr-only");
    expect(screen.getByText(/Avaliar volume: 0/)).toHaveClass("sr-only");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
