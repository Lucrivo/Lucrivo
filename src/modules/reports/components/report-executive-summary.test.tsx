import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "../presenters/to-report-view-model";
import { ReportExecutiveSummary } from "./report-executive-summary";

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

describe("ReportExecutiveSummary", () => {
  it("renders the persisted verdict, correction, and three ordered answers", () => {
    render(<ReportExecutiveSummary summary={viewModel.executiveSummary} />);
    const summary = screen.getByRole("region", {
      name: "A verdade por trás do preço.",
    });

    expect(
      within(summary).getByRole("heading", {
        level: 2,
        name: "A verdade por trás do preço.",
      }),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Margem adequada")).toBeInTheDocument();
    expect(within(summary).getByText("Situação positiva")).toBeInTheDocument();
    expect(
      within(summary).getByText("Principal ponto a corrigir"),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Volume")).toBeInTheDocument();

    const answers = within(summary).getAllByRole("listitem");
    expect(answers).toHaveLength(3);
    expect(answers.map((answer) => answer.textContent)).toEqual(
      viewModel.executiveSummary.answers.map(({ question, answer }) =>
        expect.stringContaining(`${question}${answer}`),
      ),
    );
  });

  it.each([
    ["neutral", "Informação"],
    ["warning", "Ponto de atenção"],
    ["critical", "Ação necessária"],
    ["positive", "Situação positiva"],
  ] as const)("keeps a visible label for the %s tone", (tone, toneLabel) => {
    render(
      <ReportExecutiveSummary
        summary={{
          ...viewModel.executiveSummary,
          verdict: { ...viewModel.executiveSummary.verdict, tone, toneLabel },
        }}
      />,
    );

    expect(screen.getByText(toneLabel)).toBeInTheDocument();
  });
});
