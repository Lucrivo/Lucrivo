import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  verdict: "positive_result",
  priority: "volume",
  unit: "hour",
  schemaVersion: 4,
  calculationVersion: 3,
  contentVersion: 5,
  monthlyGrossRevenueCents: null,
  monthlyResultCents: null,
  itemCount: null,
  isPartial: null,
  monthlySalesGoal: 82,
  monthlySalesVolume: null,
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
  schemaVersion: 3,
  calculationVersion: 3,
  contentVersion: 4,
  monthlyGrossRevenueCents: null,
  monthlyResultCents: null,
  itemCount: null,
  isPartial: null,
  monthlySalesGoal: 114,
  monthlySalesVolume: null,
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
  verdict: "positive_result",
  priority: "volume",
  unit: "unit",
  schemaVersion: 3,
  calculationVersion: 3,
  contentVersion: 4,
  monthlyGrossRevenueCents: null,
  monthlyResultCents: null,
  itemCount: null,
  isPartial: null,
  monthlySalesGoal: 114,
  monthlySalesVolume: 200,
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
  verdict: "positive_result",
  priority: "volume",
  itemCount: 3,
  isPartial: false,
  monthlySalesGoal: 125,
  monthlySalesVolume: 200,
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
    expect(within(card).getByText("Resultado positivo")).toBeInTheDocument();
    expect(within(card).getByText("R$ 80,00")).toBeInTheDocument();
    expect(within(card).getByText("17%")).toBeInTheDocument();
    expect(within(card).getByText("82 horas")).toBeInTheDocument();
    expect(
      within(card).queryByText("Volume de vendas"),
    ).not.toBeInTheDocument();
    expect(within(card).queryByText("R$ 13,60")).not.toBeInTheDocument();
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
    expect(screen.getByText("Não calculável")).toBeInTheDocument();
  });

  it("presents a partial Product report with the requested sales metrics", async () => {
    const user = userEvent.setup();
    render(<ReportListCard report={productReport} />);

    const card = screen.getByRole("article", {
      name: "Diagnóstico de Produto — Revenda",
    });
    expect(
      within(card).getByText("Diagnóstico de Produto"),
    ).toBeInTheDocument();
    expect(within(card).getByText("Produto")).toBeInTheDocument();
    expect(within(card).getByText("Revenda")).toBeInTheDocument();
    const verdict = within(card).getByText("Equilíbrio como referência");
    expect(verdict).toBeInTheDocument();
    expect(verdict.closest('[data-slot="badge"]')).toHaveClass(
      "text-foreground",
    );
    expect(within(card).getByText("Preço atual")).toBeInTheDocument();
    expect(within(card).getByText("Margem")).toBeInTheDocument();
    expect(
      within(card).getByText("Vendas necessárias"),
    ).toBeInTheDocument();
    expect(within(card).getByText("114 vendas")).toBeInTheDocument();
    expect(within(card).getByText("Volume de vendas")).toBeInTheDocument();

    const volumeMetric = card.querySelector('[data-metric="volume"]');
    expect(volumeMetric).not.toBeNull();
    expect(
      within(volumeMetric as HTMLElement).getByText("Não informado"),
    ).toBeVisible();
    const help = within(volumeMetric as HTMLElement).getByRole("button", {
      name: /entenda por que volume de vendas está não informado/i,
    });
    await user.hover(help);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "O volume mensal de vendas não foi informado neste diagnóstico.",
    );
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

    const verdict = screen.getByText("Prejuízo por venda");
    expect(verdict.closest('[data-slot="badge"]')).toHaveClass(
      "text-foreground",
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
    expect(within(card).getByText("Resultado positivo")).toBeInTheDocument();
    expect(
      within(card).getByText("Quantidade de vendas necessárias"),
    ).toBeInTheDocument();
    expect(within(card).getByText("114 unidades")).toBeInTheDocument();
    expect(within(card).getByText("Volume de vendas")).toBeInTheDocument();
    expect(within(card).getByText("200 unidades")).toBeInTheDocument();
    expect(card.querySelector('[data-metric="margin"]')).toHaveAttribute(
      "data-tone",
      "positive",
    );
    expect(card.querySelector('[data-metric="volume"]')).toHaveAttribute(
      "data-tone",
      "positive",
    );
    expect(
      within(card).getByRole("link", { name: "Abrir relatório" }),
    ).toHaveAttribute("href", "/reports/126");
  });

  it("uses service-specific metrics without showing sales volume", () => {
    render(<ReportListCard report={{ ...report, unit: "appointment" }} />);

    expect(screen.getByText("Resultado positivo")).toBeInTheDocument();
    expect(screen.getByText("Margem")).toBeInTheDocument();
    expect(screen.getByText("Serviços necessários")).toBeInTheDocument();
    expect(screen.getByText("82 atendimentos")).toBeInTheDocument();
    expect(screen.queryByText("Volume de vendas")).not.toBeInTheDocument();
    expect(screen.getByText("Diagnóstico salvo")).toBeInTheDocument();
  });

  it("uses the saved Digital identity for a detailed Product report", () => {
    render(
      <ReportListCard report={{ ...detailedReport, scenario: "digital" }} />,
    );

    const card = screen.getByRole("article", {
      name: "Análise de produtos — Produto digital",
    });
    expect(within(card).getByText("Produto digital")).toBeVisible();
    expect(within(card).queryByText("Revenda")).not.toBeInTheDocument();
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
    expect(within(card).getByText("Resultado positivo")).toBeVisible();
    expect(within(card).getByText("Vários preços")).toBeVisible();
    expect(within(card).getByText("18,5%")).toBeVisible();
    expect(within(card).getByText("125 unidades")).toBeVisible();
    expect(within(card).getByText("200 unidades")).toBeVisible();
    expect(
      within(card).queryByText("Diagnóstico detalhado"),
    ).not.toBeInTheDocument();
    expect(within(card).queryByText("Completo")).not.toBeInTheDocument();
    expect(within(card).queryByText("Parcial")).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent(/\bmix\b/i);
    expect(within(card).getByText("Preço atual")).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: "Abrir relatório" }),
    ).toHaveAttribute("href", "/reports/168");
  });

  it("explains unavailable metrics in a partial Detailed report", async () => {
    const user = userEvent.setup();
    render(
      <ReportListCard
        report={{
          ...detailedReport,
          monthlyGrossRevenueCents: null,
          monthlyResultCents: null,
          realMarginBasisPoints: null,
          verdict: "incomplete_volume",
          isPartial: true,
          monthlySalesGoal: null,
          monthlySalesVolume: null,
        }}
      />,
    );

    expect(screen.getByText("Equilíbrio como referência")).toBeVisible();
    expect(screen.getAllByText("Não calculável")).toHaveLength(2);
    expect(screen.getByText("Não informado")).toBeVisible();
    const goalHelp = screen.getByRole("button", {
      name: /entenda por que quantidade de vendas necessárias está não calculável/i,
    });
    await user.hover(goalHelp);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "A quantidade necessária depende das vendas mensais de todos os itens do conjunto.",
    );
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
