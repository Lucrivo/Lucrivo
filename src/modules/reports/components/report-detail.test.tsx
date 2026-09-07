import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  ProductDiagnosisCommand,
  ProductionDiagnosisCommand,
  ServiceDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildProductionReportSnapshot } from "../domain/build-production-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateProductionReport } from "../domain/calculate-production-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "../presenters/to-report-view-model";
import { getReportLanguageProfile } from "../presenters/report-language";
import { ReportDetail } from "./report-detail";

const command: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  workHoursPeriod: "month",
  workPeriodMinutes: 6000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const snapshot = buildServiceReportSnapshot(
  command,
  calculateServiceReport(command),
);
const viewModel = toReportViewModel({
  id: 42,
  createdAt: "2026-08-28T22:30:00.000Z",
  snapshot,
});
const legacyViewModel = {
  ...viewModel,
  language: getReportLanguageProfile({
    category: "service",
    contentVersion: 3,
  }),
  executiveSummary: {
    ...viewModel.executiveSummary,
    headline: "A verdade por trás do preço.",
    verdict: {
      ...viewModel.executiveSummary.verdict,
      label: "Margem adequada",
      toneLabel: "Situação positiva",
    },
  },
  numbers: [
    { key: "price" as const, label: "Preço atual", value: "R$ 80,00" },
    { key: "margin" as const, label: "Margem real", value: "17%" },
    { key: "profit" as const, label: "Lucro por hora", value: "R$ 13,60" },
    { key: "minimum" as const, label: "Preço mínimo", value: "R$ 65,22" },
    { key: "target" as const, label: "Preço-alvo (15%)", value: "R$ 77,93" },
  ],
  sections: viewModel.sections.map((section) => ({
    ...section,
    toneLabel: getReportLanguageProfile({
      category: "service",
      contentVersion: 3,
    }).toneLabels[section.tone],
  })),
};

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: null,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const productViewModel = toReportViewModel({
  id: 84,
  createdAt: "2026-08-31T15:00:00.000Z",
  snapshot: buildProductReportSnapshot(
    productCommand,
    calculateProductReport(productCommand),
  ),
});

const productionCommand: ProductionDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  costCompositionEnabled: false,
  productionUnitCostCents: 5000,
  materialUnitCostCents: null,
  packagingUnitCostCents: null,
  directLaborUnitCostCents: null,
  otherVariableUnitCostCents: null,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: null,
  proLaboreIncluded: false,
  proLaboreCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};
const productionViewModel = toReportViewModel({
  id: 126,
  createdAt: "2026-09-01T15:00:00.000Z",
  snapshot: buildProductionReportSnapshot(
    productionCommand,
    calculateProductionReport(productionCommand),
  ),
});

describe("ReportDetail", () => {
  it("renders one guided report heading and navigation actions", () => {
    render(<ReportDetail viewModel={viewModel} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Diagnóstico de Serviço" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar aos relatórios" }),
    ).toHaveAttribute("href", "/reports");
    expect(
      screen.getByRole("link", { name: "Novo diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
  });

  it("renders the executive summary before numbers and detailed analysis", () => {
    render(<ReportDetail viewModel={viewModel} />);
    const executiveSummary = screen.getByRole("region", {
      name: "Seu serviço dá lucro?",
    });
    const numbers = screen.getByRole("complementary", { name: "Seus números" });
    const analysis = screen.getByRole("region", {
      name: "Como chegamos a esse resultado",
    });

    expect(
      executiveSummary.compareDocumentPosition(numbers) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      executiveSummary.compareDocumentPosition(analysis) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("Leitura principal")).not.toBeInTheDocument();
    expect(screen.queryByText("Prioridade agora")).not.toBeInTheDocument();
  });

  it("renders exactly five persisted sections in snapshot order", () => {
    render(<ReportDetail viewModel={viewModel} />);
    const sections = screen.getAllByTestId("report-section");

    expect(sections).toHaveLength(5);
    expect(
      sections.map(
        (section) => within(section).getByRole("heading").textContent,
      ),
    ).toEqual(viewModel.sections.map(({ title }) => title));
  });

  it("communicates every tone with visible text in addition to color", () => {
    render(<ReportDetail viewModel={viewModel} />);

    for (const toneLabel of new Set(
      viewModel.sections.map(({ toneLabel }) => toneLabel),
    )) {
      expect(screen.getAllByText(toneLabel).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByLabelText("Bom resultado").length).toBeGreaterThan(0);
  });

  it("renders Product identity and partial simulation semantics", () => {
    render(<ReportDetail viewModel={productViewModel} />);

    expect(
      screen.getByRole("heading", { name: "Diagnóstico de Produto" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Revenda")).toBeInTheDocument();
    expect(
      screen.getAllByText("Contribuição por unidade").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Margem de contribuição")).toBeInTheDocument();
    expect(
      screen.getByText("Simulação parcial", { exact: false }),
    ).toBeInTheDocument();
  });

  it("passes Production context to partial simulation wording", () => {
    render(<ReportDetail viewModel={productionViewModel} />);

    expect(
      screen.getByRole("heading", { name: "Diagnóstico de Produção" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fabricação própria")).toBeInTheDocument();
    expect(
      screen.getAllByText("Contribuição por unidade").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Margem de contribuição")).toBeInTheDocument();
    expect(
      screen.getByText("Simulação parcial", { exact: false }),
    ).toBeInTheDocument();
  });

  it("keeps report chrome unchanged for a legacy snapshot", () => {
    render(<ReportDetail viewModel={legacyViewModel} />);

    expect(screen.getByText("Seu relatório financeiro")).toBeInTheDocument();
    expect(screen.getByText("Principal ponto a corrigir")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Entenda seus números" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Situação positiva").length).toBeGreaterThan(0);
    expect(screen.queryByText("Comece por aqui")).not.toBeInTheDocument();
  });

  it("renders the current plain-language report chrome", () => {
    render(<ReportDetail viewModel={viewModel} />);

    expect(
      screen.getByText("Resultado do seu diagnóstico"),
    ).toBeInTheDocument();
    expect(screen.getByText("Comece por aqui")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Como chegamos a esse resultado" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Bom resultado").length).toBeGreaterThan(0);
  });
});
