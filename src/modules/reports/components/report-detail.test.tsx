import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  NormalizedServiceDiagnosisCommand,
  ProductDiagnosisCommand,
} from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { buildServiceReportSnapshot } from "../domain/build-service-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { calculateServiceReport } from "../domain/calculate-service-report";
import { toReportViewModel } from "../presenters/to-report-view-model";
import { ReportDetail } from "./report-detail";

const serviceCommand: NormalizedServiceDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 400_000,
  fixedMonthlyExpensesCents: 200_000,
  workHoursPeriod: "day",
  workPeriodMinutes: 360,
  monthlyWorkMinutes: 7_794,
  weeklyWorkDays: 5,
  hourlyRateCents: 8_000,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  materialUnitCostCents: 0,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
  source: {
    pricingMethod: "hour",
    currentPriceCents: 8_000,
    materialCostUnit: null,
    materialCostCents: 0,
    dailyWorkMinutes: 360,
    appointmentDurationMinutes: 0,
  },
};
const serviceViewModel = toReportViewModel({
  id: 42,
  createdAt: "2026-08-28T22:30:00.000Z",
  snapshot: buildServiceReportSnapshot(
    serviceCommand,
    calculateServiceReport(serviceCommand),
  ),
});

const productCommand: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productKind: "resale",
  purchaseUnitCostCents: 5_000,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: null,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
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
  it("renders the current report structure and objective language", () => {
    render(<ReportDetail viewModel={serviceViewModel} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Diagnóstico de Serviço" }),
    ).toBeVisible();
    expect(screen.getByText("Resultado do seu diagnóstico")).toBeVisible();
    expect(screen.getAllByText("Resultado positivo").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/preço-alvo|meta de margem/i);
  });

  it("keeps the summary before indicators and the simulator", () => {
    render(<ReportDetail viewModel={serviceViewModel} />);
    const summary = screen.getByRole("region", { name: "Comece por aqui" });
    const analysis = screen.getByRole("region", {
      name: "Como chegamos a esse resultado",
    });
    const indicators = screen.getByTestId("report-indicators");

    expect(
      summary.compareDocumentPosition(analysis) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(analysis).getByTestId("report-indicators")).toBe(indicators);
    expect(within(analysis).getByTestId("discount-simulator")).toBeVisible();
  });

  it("replaces persisted sections with indicators and the objective simulator", () => {
    render(<ReportDetail viewModel={serviceViewModel} />);
    const sections = screen.getAllByTestId("report-section");

    expect(sections).toHaveLength(1);
    expect(
      within(sections[0]!).getByRole("heading", {
        name: "Quanto de desconto posso dar sem ter prejuízo?",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("slider", { name: "Desconto simulado" }),
    ).toBeEnabled();
    expect(screen.getByText("Entenda o resultado")).toBeVisible();
  });

  it("uses the break-even reference when a Product volume is unknown", () => {
    render(<ReportDetail viewModel={productViewModel} />);

    expect(
      screen.getByRole("heading", { name: "Diagnóstico de Produto" }),
    ).toBeVisible();
    expect(
      screen.getByText(/quantidade de equilíbrio como referência/i),
    ).toBeVisible();
    expect(screen.getByText(/Referência de equilíbrio/)).toBeVisible();
    expect(
      screen.getByRole("slider", { name: "Desconto simulado" }),
    ).toBeEnabled();
    expect(screen.getByText("Vendas necessárias com este desconto")).toBeVisible();
  });
});
