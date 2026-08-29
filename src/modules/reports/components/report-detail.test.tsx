import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
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
});
