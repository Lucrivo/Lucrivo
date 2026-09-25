import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { OwnedReportSummary } from "../services/list-reports.service";
import { ReportListCard } from "./report-list-card";
import { ReportsEmptyState } from "./reports-empty-state";

const report = {
  id: 42,
  businessCategory: "service",
  scenario: "hour",
  createdAt: "2026-08-28T22:30:00.000Z",
  analysisMode: "quick",
  currentPriceCents: 8_000,
  realMarginBasisPoints: 1_700,
  unitProfitCents: 1_360,
  verdict: "adequate_margin",
  priority: "volume",
  unit: "hour",
  schemaVersion: 3,
  calculationVersion: 2,
  contentVersion: 3,
  monthlyGrossRevenueCents: null,
  monthlyResultCents: null,
  itemCount: null,
  isPartial: null,
} satisfies OwnedReportSummary;

const productReport = {
  id: 84,
  businessCategory: "product",
  scenario: "resale",
  createdAt: "2026-08-31T15:00:00.000Z",
  analysisMode: "quick",
  currentPriceCents: 10_000,
  realMarginBasisPoints: null,
  unitProfitCents: null,
  verdict: "incomplete_volume",
  priority: "data",
  unit: "unit",
  schemaVersion: 1,
  calculationVersion: 1,
  contentVersion: 2,
  monthlyGrossRevenueCents: null,
  monthlyResultCents: null,
  itemCount: null,
  isPartial: null,
} satisfies OwnedReportSummary;

const productionReport = {
  id: 126,
  businessCategory: "production",
  scenario: "manufacturing",
  createdAt: "2026-09-01T15:00:00.000Z",
  analysisMode: "quick",
  currentPriceCents: 10_000,
  realMarginBasisPoints: 1_200,
  unitProfitCents: 1_200,
  verdict: "tight_margin",
  priority: "margin",
  unit: "unit",
  schemaVersion: 1,
  calculationVersion: 1,
  contentVersion: 2,
  monthlyGrossRevenueCents: null,
  monthlyResultCents: null,
  itemCount: null,
  isPartial: null,
} satisfies OwnedReportSummary;

const detailedReport = {
  ...productReport,
  id: 168,
  analysisMode: "detailed",
  currentPriceCents: null,
  realMarginBasisPoints: 1_850,
  unitProfitCents: null,
  unit: "mix",
  schemaVersion: 1,
  calculationVersion: 1,
  contentVersion: 1,
  monthlyGrossRevenueCents: 500_000,
  monthlyResultCents: 92_500,
  verdict: "adequate_margin",
  priority: "volume",
  itemCount: 3,
  isPartial: false,
} satisfies OwnedReportSummary;

describe("ReportListCard", () => {
  it("presents the owned report identity, verdict, and summary metrics", () => {
    render(<ReportListCard report={report} />);

    const card = screen.getByRole("article", {
      name: "Diagnóstico de Serviço — Por hora",
    });
    expect(within(card).getByText("Serviço")).toBeInTheDocument();
    expect(within(card).getByText("Por hora")).toBeInTheDocument();
    expect(within(card).getByText("28/08/2026, 19:30")).toBeInTheDocument();
    expect(within(card).getByText("Margem adequada")).toBeInTheDocument();
    expect(within(card).getByText("R$ 80,00")).toBeInTheDocument();
    expect(within(card).getByText("17%")).toBeInTheDocument();
    expect(within(card).getByText("R$ 13,60")).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Abrir relatório" }),
    ).toHaveAttribute("href", "/reports/42");
  });

  it("shows unavailable nullable metrics without inventing values", () => {
    render(
      <ReportListCard
        report={{
          ...report,
          realMarginBasisPoints: null,
          unitProfitCents: null,
          verdict: "missing_price",
        }}
      />,
    );

    expect(screen.getByText("Informe o preço")).toBeInTheDocument();
    expect(screen.getAllByText("Indisponível")).toHaveLength(2);
  });

  it("presents a partial Product report without Service fallbacks", () => {
    render(<ReportListCard report={productReport} />);

    const card = screen.getByRole("article", {
      name: "Diagnóstico de Produto — Revenda",
    });
    expect(
      within(card).getByText("Diagnóstico de Produto"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Produto")).toBeInTheDocument();
    expect(within(card).getByText("Revenda")).toBeInTheDocument();
    const verdict = within(card).getByText("Falta informar as vendas");
    expect(verdict).toBeInTheDocument();
    expect(verdict.closest('[data-slot="badge"]')).toHaveClass("text-info");
    expect(
      within(card).getByText("Quanto sobra por unidade"),
    ).toBeInTheDocument();
    expect(within(card).queryByText("Lucro por venda")).not.toBeInTheDocument();
  });

  it("presents direct Product loss as destructive", () => {
    render(
      <ReportListCard
        report={{
          ...productReport,
          verdict: "direct_loss",
          unitProfitCents: -400,
        }}
      />,
    );

    const verdict = screen.getByText("Venda com prejuízo");
    expect(verdict.closest('[data-slot="badge"]')).toHaveClass(
      "text-destructive",
    );
  });

  it("presents a Production report without Service fallbacks", () => {
    render(<ReportListCard report={productionReport} />);

    const card = screen.getByRole("article", {
      name: "Diagnóstico de Produção — Fabricação própria",
    });
    expect(
      within(card).getByText("Diagnóstico de Produção"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Produção")).toBeInTheDocument();
    expect(within(card).getByText("Fabricação própria")).toBeInTheDocument();
    expect(within(card).getByText("Abaixo da meta")).toBeInTheDocument();
    expect(
      within(card).getByText("Quanto sobra por unidade"),
    ).toBeInTheDocument();
    expect(within(card).queryByText("Lucro por venda")).not.toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Abrir relatório" }),
    ).toHaveAttribute("href", "/reports/126");
  });

  it("uses the saved plain-language labels for a current Service report", () => {
    render(
      <ReportListCard
        report={{ ...report, contentVersion: 4, unit: "appointment" }}
      />,
    );

    expect(screen.getByText("Meta alcançada")).toBeInTheDocument();
    expect(screen.getByText("Quanto sobra a cada R$ 100")).toBeInTheDocument();
    expect(
      screen.getByText("Quanto sobra por atendimento"),
    ).toBeInTheDocument();
    expect(screen.getByText("Diagnóstico salvo")).toBeInTheDocument();
  });

  it("presents a complete Detailed report with the current unit identity", () => {
    render(<ReportListCard report={detailedReport} />);

    const card = screen.getByRole("article", {
      name: "Análise de produtos — Revenda",
    });
    expect(within(card).getByText("Produto")).toBeVisible();
    expect(within(card).getByText("Revenda")).toBeVisible();
    expect(within(card).getByText("Análise de produtos")).toBeVisible();
    expect(within(card).getByText("3 itens analisados")).toBeVisible();
    expect(within(card).getByText("Lucro")).toBeVisible();
    expect(within(card).getByText("R$ 925,00")).toBeVisible();
    expect(within(card).getByText("18,5%")).toBeVisible();
    expect(
      within(card).queryByText("Diagnóstico detalhado"),
    ).not.toBeInTheDocument();
    expect(within(card).queryByText("Completo")).not.toBeInTheDocument();
    expect(within(card).queryByText("Parcial")).not.toBeInTheDocument();
    expect(
      within(card).queryByText("Resultado do mix"),
    ).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent(/\bmix\b/i);
    expect(within(card).queryByText("Preço atual")).not.toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Abrir relatório" }),
    ).toHaveAttribute("href", "/reports/168");
  });

  it("presents a partial Detailed report without invented totals", () => {
    render(
      <ReportListCard
        report={{
          ...detailedReport,
          monthlyGrossRevenueCents: null,
          monthlyResultCents: null,
          realMarginBasisPoints: null,
          verdict: "incomplete_volume",
          isPartial: true,
        }}
      />,
    );

    expect(screen.getByText("Falta informar as vendas")).toBeVisible();
    expect(screen.getByText(/complete os volumes pendentes/i)).toBeVisible();
    expect(screen.queryByText("Resultado mensal")).not.toBeInTheDocument();
    expect(screen.queryByText("Parcial")).not.toBeInTheDocument();
    expect(screen.queryByText(/\bmix\b/i)).not.toBeInTheDocument();
  });
});

describe("ReportsEmptyState", () => {
  it("explains the empty library and offers a new diagnosis", () => {
    render(<ReportsEmptyState />);

    expect(
      screen.getByRole("heading", { name: "Diagnósticos salvos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Criar primeiro diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
  });
});
