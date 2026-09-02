import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ServiceDiagnosisInput, ServiceWorkPeriod } from "../../../types";
import { CurrentPriceStep } from "./current-price-step";
import { MaterialCostStep } from "./material-cost-step";
import { WorkRoutineStep } from "./work-routine-step";

const values: ServiceDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncome: "5000",
  fixedMonthlyExpenses: "1200",
  workHoursPeriod: "month",
  workHours: "160",
  weeklyWorkDays: "5",
  hourlyRate: "125,90",
  minuteRate: "",
  appointmentRate: "",
  appointmentDurationMinutes: "",
  hasMaterialCost: false,
  materialUnitCost: "",
  taxRate: "6,25",
  cardFeeRate: "3,50",
};

describe("Service diagnosis steps", () => {
  it("selects the billable-hours period and adapts the hours question", async () => {
    const user = userEvent.setup();
    const onWorkHoursPeriodChange = vi.fn();

    function WorkRoutineHarness() {
      const [workHoursPeriod, setWorkHoursPeriod] =
        useState<ServiceWorkPeriod>("month");

      return (
        <WorkRoutineStep
          values={{ ...values, workHoursPeriod }}
          errors={{}}
          onChange={vi.fn()}
          onWorkHoursPeriodChange={(period) => {
            onWorkHoursPeriodChange(period);
            setWorkHoursPeriod(period);
          }}
        />
      );
    }

    render(<WorkRoutineHarness />);

    const period = screen.getByRole("combobox", {
      name: "Horas faturáveis por",
    });
    expect(period).toHaveTextContent("Mês");
    expect(
      screen.getByLabelText("Quantas horas faturáveis por mês?"),
    ).toHaveValue("160");

    await user.click(period);
    await user.click(await screen.findByRole("option", { name: "Dia" }));

    expect(onWorkHoursPeriodChange).toHaveBeenCalledWith("day");
    expect(
      screen.getByLabelText("Quantas horas faturáveis por dia?"),
    ).toBeInTheDocument();

    const guidance = screen.getByText(/considere apenas horas/i);
    expect(guidance).toHaveTextContent(/administração/i);
    expect(guidance).toHaveTextContent(/estudo/i);
    expect(guidance).toHaveTextContent(/deslocamento/i);
  });

  it("asks duration before the appointment price", () => {
    render(
      <CurrentPriceStep
        values={{ ...values, pricingMethod: "appointment" }}
        errors={{}}
        onChange={vi.fn()}
      />,
    );

    const duration = screen.getByLabelText("Quanto dura cada atendimento?");
    const price = screen.getByLabelText("Quanto você cobra por atendimento?");

    expect(
      duration.compareDocumentPosition(price) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows only the hourly price when time is sold by hour", () => {
    render(<CurrentPriceStep values={values} errors={{}} onChange={vi.fn()} />);

    expect(
      screen.getByLabelText("Quanto você cobra por hora?"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Quanto dura cada atendimento?"),
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      "hour",
      "Você tem algum custo de material por hora trabalhada?",
      "Custo de material por hora",
    ],
    [
      "minute",
      "Você tem algum custo de material por atendimento?",
      "Custo de material por atendimento",
    ],
    [
      "appointment",
      "Você tem algum custo de material por atendimento?",
      "Custo de material por atendimento",
    ],
  ] as const)(
    "collects material in the unit used by %s pricing",
    async (pricingMethod, question, fieldLabel) => {
      const user = userEvent.setup();

      function MaterialHarness() {
        const [hasMaterialCost, setHasMaterialCost] = useState(false);

        return (
          <MaterialCostStep
            values={{ ...values, pricingMethod, hasMaterialCost }}
            errors={{}}
            onChange={vi.fn()}
            onHasMaterialCostChange={setHasMaterialCost}
          />
        );
      }

      render(<MaterialHarness />);

      const material = screen.getByRole("switch", { name: question });
      expect(material).not.toBeChecked();
      expect(screen.queryByLabelText(fieldLabel)).not.toBeInTheDocument();

      material.focus();
      await user.keyboard(" ");

      expect(material).toBeChecked();
      expect(screen.getByLabelText(fieldLabel)).toBeInTheDocument();
    },
  );
});
