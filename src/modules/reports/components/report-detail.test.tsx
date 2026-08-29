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

  it("shows verdict, priority, metrics, and price references in the summary rail", () => {
    render(<ReportDetail viewModel={viewModel} />);
    const summary = screen.getByRole("complementary", {
      name: "Resumo da decisão",
    });

    expect(within(summary).getByText("Margem adequada")).toBeInTheDocument();
    expect(within(summary).getByText("Volume")).toBeInTheDocument();
    expect(within(summary).getByText("R$ 80,00")).toBeInTheDocument();
    expect(within(summary).getByText("17%")).toBeInTheDocument();
    expect(within(summary).getByText("R$ 13,60")).toBeInTheDocument();
    expect(within(summary).getByText("R$ 65,22")).toBeInTheDocument();
    expect(within(summary).getByText("R$ 77,93")).toBeInTheDocument();
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
