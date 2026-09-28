import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { NormalizedServiceDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "../presenters/to-report-view-model";
import { ReportExecutiveSummary } from "./report-executive-summary";

const command: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400000,
  fixedMonthlyExpensesCents: 200000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "day",
    currentPriceCents: 48000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
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
  it("starts with the priority and keeps three ordered answers", () => {
    render(
      <ReportExecutiveSummary
        summary={viewModel.executiveSummary}
        priorityEyebrow={viewModel.language.priorityEyebrow}
      />,
    );
    const summary = screen.getByRole("region", {
      name: "Comece por aqui",
    });

    expect(
      within(summary).getByRole("heading", {
        level: 2,
        name: "Comece por aqui",
      }),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Resultado positivo")).toBeInTheDocument();
    expect(
      within(summary).getByText("Quantidade de serviços"),
    ).toBeInTheDocument();
    expect(
      within(summary).queryByText("Seu serviço dá lucro?"),
    ).not.toBeInTheDocument();
    expect(within(summary).queryByText("Preço atual")).not.toBeInTheDocument();

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
    ["warning", "Atenção"],
    ["critical", "Precisa de atenção"],
    ["positive", "Resultado positivo"],
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

  it("does not repeat the values already shown in Your numbers", () => {
    render(
      <ReportExecutiveSummary
        summary={viewModel.executiveSummary}
        priorityEyebrow={viewModel.language.priorityEyebrow}
      />,
    );

    expect(screen.queryByText("Preço atual")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Quanto sobra a cada R$ 100"),
    ).not.toBeInTheDocument();
  });
});
