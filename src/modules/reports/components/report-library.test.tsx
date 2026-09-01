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
  currentPriceCents: 8_000,
  realMarginBasisPoints: 1_700,
  unitProfitCents: 1_360,
  verdict: "adequate_margin",
  priority: "volume",
  unit: "hour",
} satisfies OwnedReportSummary;

const productReport = {
  id: 84,
  businessCategory: "product",
  scenario: "resale",
  createdAt: "2026-08-31T15:00:00.000Z",
  currentPriceCents: 10_000,
  realMarginBasisPoints: null,
  unitProfitCents: null,
  verdict: "incomplete_volume",
  priority: "data",
  unit: "unit",
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
    expect(within(card).getByText("Diagnóstico de Produto")).toBeInTheDocument();
    expect(within(card).getByText("Produto")).toBeInTheDocument();
    expect(within(card).getByText("Revenda")).toBeInTheDocument();
    const verdict = within(card).getByText("Complete o diagnóstico");
    expect(verdict).toBeInTheDocument();
    expect(verdict.closest('[data-slot="badge"]')).toHaveClass("text-info");
    expect(within(card).getByText("Lucro por unidade")).toBeInTheDocument();
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

    const verdict = screen.getByText("Prejuízo direto");
    expect(verdict.closest('[data-slot="badge"]')).toHaveClass(
      "text-destructive",
    );
  });
});

describe("ReportsEmptyState", () => {
  it("explains the empty library and offers a new diagnosis", () => {
    render(<ReportsEmptyState />);

    expect(
      screen.getByRole("heading", { name: "Seu histórico começa aqui" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Criar primeiro diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
  });
});
