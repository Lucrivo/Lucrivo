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
    render(
      <ReportExecutiveSummary
        summary={viewModel.executiveSummary}
        priorityEyebrow={viewModel.language.priorityEyebrow}
      />,
    );
    const summary = screen.getByRole("region", {
      name: "Seu serviço dá lucro?",
    });

    expect(
      within(summary).getByRole("heading", {
        level: 2,
        name: "Seu serviço dá lucro?",
      }),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Meta alcançada")).toBeInTheDocument();
    expect(within(summary).getByText("Bom resultado")).toBeInTheDocument();
    expect(within(summary).getByText("Comece por aqui")).toBeInTheDocument();
    expect(
      within(summary).getByText("Quantidade de serviços"),
    ).toBeInTheDocument();

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
    ["warning", "Fique de olho"],
    ["critical", "Precisa de atenção"],
    ["positive", "Bom resultado"],
  ] as const)("keeps a visible label for the %s tone", (tone, toneLabel) => {
    render(
      <ReportExecutiveSummary
        summary={{
          ...viewModel.executiveSummary,
          verdict: { ...viewModel.executiveSummary.verdict, tone, toneLabel },
        }}
        priorityEyebrow="Comece por aqui"
      />,
    );

    expect(screen.getByText(toneLabel)).toBeInTheDocument();
  });
});
