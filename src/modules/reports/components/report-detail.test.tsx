import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  ProductDiagnosisCommand,
  ServiceDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "../presenters/to-report-view-model";
import { ReportDetail } from "./report-detail";

const command: ServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  monthlyWorkMinutes: 6000,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
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
      name: "A verdade por trás do preço.",
    });
    const numbers = screen.getByRole("complementary", { name: "Seus números" });
    const analysis = screen.getByRole("region", { name: "Análise detalhada" });

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
    expect(
      screen.getAllByLabelText("Situação positiva").length,
    ).toBeGreaterThan(0);
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
});
