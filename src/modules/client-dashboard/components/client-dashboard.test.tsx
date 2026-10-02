import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { parseClientDashboardFilters } from "../client-dashboard.filters";
import type { ClientDashboardViewModel } from "../client-dashboard.types";
import { ClientDashboard } from "./client-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

function dashboardFixture(
  values: Partial<ClientDashboardViewModel> = {},
): ClientDashboardViewModel {
  return {
    generatedAtLabel: "01/10/2026",
    hasAnyReports: true,
    focusReportId: 42,
    metrics: {
      totalReports: 1,
      positiveResultReports: 1,
      lossReports: 0,
      pendingDataReports: 0,
    },
    verdictCounts: [
      {
        verdict: "missing_price",
        count: 0,
        label: "Preço não informado",
        tone: "info",
      },
      {
        verdict: "direct_loss",
        count: 0,
        label: "Perda por venda",
        tone: "danger",
      },
      {
        verdict: "incomplete_volume",
        count: 0,
        label: "Volume não informado",
        tone: "info",
      },
      {
        verdict: "operational_loss",
        count: 0,
        label: "Prejuízo no cenário informado",
        tone: "danger",
      },
      { verdict: "no_sales", count: 0, label: "Mês sem vendas", tone: "info" },
      {
        verdict: "break_even",
        count: 0,
        label: "Zero a zero",
        tone: "warning",
      },
      {
        verdict: "positive_result",
        count: 1,
        label: "Resultado positivo",
        tone: "success",
      },
    ],
    priorityCounts: [
      { priority: "cost", count: 0, label: "Revisar custos" },
      { priority: "data", count: 0, label: "Completar dados" },
      { priority: "price", count: 0, label: "Revisar preço" },
      { priority: "margin", count: 1, label: "Avaliar margem" },
      { priority: "volume", count: 0, label: "Avaliar volume" },
    ],
    recentReports: [],
    ...values,
  };
}

describe("ClientDashboard", () => {
  const filters = parseClientDashboardFilters({});

  it("renders populated sections in the approved semantic order", () => {
    const { container } = render(
      <ClientDashboard
        dashboard={dashboardFixture()}
        focus={{ status: "unavailable", reportId: 42 }}
        filters={filters}
      />,
    );

    const names = [
      "header",
      "filters",
      "indicators",
      "distributions",
      "recent-reports",
      "report-focus",
    ];
    const sections = names.map((name) =>
      container.querySelector(`[data-dashboard-section="${name}"]`),
    );
    sections.forEach((section) => expect(section).not.toBeNull());
    sections.slice(1).forEach((section, index) => {
      expect(
        sections[index]!.compareDocumentPosition(section!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    expect(container.querySelector("main")).toHaveClass(
      "grid-cols-[minmax(0,1fr)]",
    );
    expect(
      screen.getByRole("heading", { name: "Olá, empreendedor" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Acompanhe seus diagnósticos e veja o que merece sua atenção primeiro.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Seus relatórios")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-dashboard-section="header"]'),
    ).not.toHaveClass("bg-card", "rounded-3xl", "border", "shadow-sm");
    expect(
      screen.getByRole("link", { name: "Novo diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(
      screen.getByRole("link", { name: "Ver biblioteca completa" }),
    ).toHaveAttribute("href", "/reports");
    expect(container).not.toHaveTextContent("28,4%");
    expect(container).not.toHaveTextContent("R$ 15,80");
    expect(container).not.toHaveTextContent("R$ 6,20");
  });

  it("renders only the header and first-diagnosis state without history", () => {
    render(
      <ClientDashboard
        dashboard={dashboardFixture({
          hasAnyReports: false,
          focusReportId: null,
        })}
        focus={{ status: "none" }}
        filters={filters}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Crie seu primeiro diagnóstico" }),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Filtros dos relatórios"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Indicadores do recorte"),
    ).not.toBeInTheDocument();
  });

  it("keeps filters and recovery actions for an empty filtered recorte", () => {
    render(
      <ClientDashboard
        dashboard={dashboardFixture({
          metrics: {
            totalReports: 0,
            positiveResultReports: 0,
            lossReports: 0,
            pendingDataReports: 0,
          },
          focusReportId: null,
        })}
        focus={{ status: "none" }}
        filters={parseClientDashboardFilters({ category: "product" })}
      />,
    );

    expect(screen.getByLabelText("Filtros dos relatórios")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Nenhum relatório corresponde aos filtros selecionados",
      }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Limpar filtros" }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole("link", { name: "Novo diagnóstico" }),
    ).not.toHaveLength(0);
  });
});
