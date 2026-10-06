import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseClientDashboardFilters } from "../client-dashboard.filters";
import type {
  DashboardFocusLoad,
  DashboardRecentReportViewModel,
  DashboardReportFocusViewModel,
} from "../client-dashboard.types";
import { DashboardRecentReports } from "./dashboard-recent-reports";
import { DashboardReportFocus } from "./dashboard-report-focus";

function recent(
  id: number,
  values: Partial<DashboardRecentReportViewModel> = {},
): DashboardRecentReportViewModel {
  return {
    id,
    title: "Diagnóstico de Produto",
    categoryLabel: "Produto",
    scenarioLabel: "Revenda",
    modeLabel: "Rápido",
    createdAtLabel: "01/10/2026",
    verdict: { label: "Resultado positivo", tone: "success" },
    priorityLabel: "Avaliar margem",
    dataStateLabel: "Dados completos",
    itemCountLabel: "1 item",
    monthlyResultLabel: "R$ 1.200,00",
    realMarginLabel: "20%",
    openHref: `/reports/${id}`,
    ...values,
  };
}

const focusedReport: DashboardReportFocusViewModel = {
  id: 42,
  title: "Diagnóstico de Produto",
  categoryLabel: "Produto",
  scenarioLabel: "Revenda",
  modeLabel: "Rápido",
  createdAtLabel: "30/09/2026",
  updatedAtLabel: "01/10/2026",
  verdict: { label: "Resultado positivo", tone: "success" },
  priorityLabel: "Avaliar margem",
  metrics: [
    {
      key: "sales",
      label: "Vendas necessárias no mês",
      value: "100",
      tone: "positive",
      toneLabel: "Resultado positivo",
    },
    {
      key: "minimum",
      label: "Menor preço para não ficar no prejuízo",
      value: "Indisponível",
      tone: "neutral",
      toneLabel: "Informação",
      supportingText: "Falta uma quantidade para completar o cálculo.",
    },
    {
      key: "margin",
      label: "Margem de lucro",
      value: "20%",
      tone: "positive",
      toneLabel: "Resultado positivo",
    },
    {
      key: "discount",
      label: "Desconto máximo sem prejuízo",
      value: "8%",
      tone: "positive",
      toneLabel: "Resultado positivo",
      help: {
        title: "Desconto máximo sem prejuízo",
        description:
          "É um limite calculado, não uma recomendação de desconto.",
      },
    },
  ],
  complementaryFacts: [
    {
      key: "analyzed_items",
      label: "Ofertas analisadas",
      value: "1 produto analisado",
    },
  ],
  openHref: "/reports/42",
};

describe("DashboardRecentReports", () => {
  it("renders at most five recent reports as a table and a compact mobile list", () => {
    const reports = [42, 41, 40, 39, 38, 37, 36].map((id, index) =>
      recent(id, {
        createdAtLabel: `${String(7 - index).padStart(2, "0")}/10/2026`,
      }),
    );
    render(
      <DashboardRecentReports
        reports={reports}
        focusReportId={42}
        filters={parseClientDashboardFilters({ category: "product" })}
      />,
    );

    const table = screen.getByRole("table", { name: "Relatórios recentes" });
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      "07/10/2026",
    );
    const mobileList = screen.getByRole("list", {
      name: "Relatórios recentes em telas menores",
    });
    expect(within(mobileList).getAllByRole("listitem")).toHaveLength(5);
    expect(
      screen.getAllByRole("button", {
        name: /Relatório selecionado: Diagnóstico de Produto/,
      }),
    ).toHaveLength(2);
    expect(
      within(table).getAllByRole("link", {
        name: /Ver detalhes nesta página.*Diagnóstico de Produto/i,
      })[0],
    ).toHaveAttribute("href", "/dashboard?category=product&report=42");
    expect(
      within(table).getAllByRole("link", {
        name: "Selecionar relatório: Diagnóstico de Produto",
      })[0],
    ).toHaveAttribute("href", "/dashboard?category=product&report=41");
    expect(
      within(table).getAllByRole("link", {
        name: /Abrir relatório.*Diagnóstico de Produto/i,
      })[0],
    ).toHaveAttribute("href", "/reports/42");
  });

  it("omits absent financial fields rather than displaying zero", () => {
    render(
      <DashboardRecentReports
        reports={[
          recent(42, { monthlyResultLabel: null, realMarginLabel: null }),
        ]}
        focusReportId={null}
        filters={parseClientDashboardFilters({})}
      />,
    );

    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getAllByText("Indisponível")).toHaveLength(2);
  });
});

describe("DashboardReportFocus", () => {
  it("renders identity, persisted status, metrics, dates and complementary facts", () => {
    const focus: DashboardFocusLoad = {
      status: "ready",
      report: focusedReport,
    };
    render(<DashboardReportFocus focus={focus} />);

    expect(screen.getByText("Relatório selecionado")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Diagnóstico de Produto" }),
    ).toBeVisible();
    expect(
      screen.getByText(/criado em 30\/09\/2026.*atualizado em 01\/10\/2026/),
    ).toBeVisible();
    expect(screen.getAllByText("Resultado positivo").length).toBeGreaterThan(0);
    expect(screen.getByText("Avaliar margem")).toBeVisible();
    for (const label of [
      "Vendas necessárias no mês",
      "Menor preço para não ficar no prejuízo",
      "Margem de lucro",
      "Desconto máximo sem prejuízo",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(
      screen.getByText("Falta uma quantidade para completar o cálculo."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Entenda Desconto máximo sem prejuízo",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Limite antes do prejuízo")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir relatório completo" }),
    ).toHaveAttribute("href", "/reports/42");
  });

  it("renders nothing without a focus report", () => {
    const { container } = render(
      <DashboardReportFocus focus={{ status: "none" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("isolates a focus read failure and keeps a direct report route", () => {
    render(
      <DashboardReportFocus focus={{ status: "unavailable", reportId: 42 }} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Detalhes do relatório indisponíveis",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Abrir relatório" }),
    ).toHaveAttribute("href", "/reports/42");
  });

  it("dims unavailable metrics from their semantic state instead of their copy", () => {
    const sales = {
      ...focusedReport.metrics[0]!,
      value: "Sem meta única",
      unavailable: true,
    };
    const report = {
      ...focusedReport,
      metrics: [sales, ...focusedReport.metrics.slice(1)],
    };

    render(<DashboardReportFocus focus={{ status: "ready", report }} />);

    expect(
      screen.getByText("Sem meta única").closest("div.relative"),
    ).toHaveClass("bg-muted/25");
  });
});
