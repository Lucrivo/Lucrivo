import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ServiceFlowInput } from "../../../domain/service-flow";
import { MaterialCostStep } from "./material-cost-step";

const values: ServiceFlowInput = {
  desiredMonthlyIncome: "5000",
  fixedMonthlyExpenses: "2000",
  pricingMethod: "hour",
  currentPrice: "80",
  dailyWorkHours: "8",
  weeklyWorkDays: "5",
  appointmentDurationMinutes: "",
  hasMaterialCost: true,
  materialCost: "20",
  materialCostUnit: "appointment",
  paysRevenueTax: false,
  taxRate: "",
  hasPaymentFee: false,
  paymentFeeRate: "",
};

function renderStep(overrides: Partial<ServiceFlowInput> = {}) {
  render(
    <MaterialCostStep
      values={{ ...values, ...overrides }}
      errors={{}}
      onChange={vi.fn()}
      onHasMaterialCostChange={vi.fn()}
      onMaterialCostUnitChange={vi.fn()}
    />,
  );
}

describe("MaterialCostStep appointment duration", () => {
  it("asks for duration when hourly billing uses material per appointment", async () => {
    const user = userEvent.setup();
    renderStep();

    expect(
      screen.getByLabelText("Quanto tempo dura, em média, um serviço?"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Entenda este valor" }),
    );
    expect(
      screen.getByText(
        "Usamos esse tempo somente para distribuir o gasto do atendimento no valor por hora.",
      ),
    ).toBeInTheDocument();
  });

  it("does not ask for duration for hourly material", () => {
    renderStep({ materialCostUnit: "hour" });
    expect(
      screen.queryByLabelText("Quanto tempo dura, em média, um serviço?"),
    ).not.toBeInTheDocument();
  });

  it("does not duplicate the duration collected for appointment billing", () => {
    renderStep({
      pricingMethod: "appointment",
      appointmentDurationMinutes: "45",
    });
    expect(
      screen.queryByLabelText("Quanto tempo dura, em média, um serviço?"),
    ).not.toBeInTheDocument();
  });
});
