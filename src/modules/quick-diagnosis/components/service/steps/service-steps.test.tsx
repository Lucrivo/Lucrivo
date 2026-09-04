import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  ServiceFlowInput,
  ServiceMaterialCostUnit,
} from "../../../domain/service-flow";
import { FeesStep } from "./fees-step";
import { MaterialCostStep } from "./material-cost-step";
import { PricingAndPriceStep } from "./pricing-and-price-step";
import { ServiceDurationStep } from "./service-duration-step";
import { WorkRoutineStep } from "./work-routine-step";

const values: ServiceFlowInput = {
  desiredMonthlyIncome: "5000",
  fixedMonthlyExpenses: "2000",
  pricingMethod: "hour",
  currentPrice: "50",
  dailyWorkHours: "8",
  weeklyWorkDays: "5",
  appointmentDurationMinutes: "",
  hasMaterialCost: false,
  materialCost: "",
  materialCostUnit: "",
  paysRevenueTax: false,
  taxRate: "",
  hasPaymentFee: false,
  paymentFeeRate: "",
};

describe("service diagnosis steps", () => {
  it.each([
    ["appointment", "Quanto você cobra por atendimento?"],
    ["minute", "Quanto você cobra por minuto?"],
    ["hour", "Quanto você cobra por hora?"],
    ["day", "Quanto você cobra por diária?"],
    ["week", "Quanto você cobra por semana?"],
    ["month", "Quanto você cobra por mês?"],
  ] as const)("pairs %s pricing with its current price", (method, label) => {
    render(
      <PricingAndPriceStep
        values={{ ...values, pricingMethod: method }}
        errors={{}}
        onChange={vi.fn()}
        onPricingMethodChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(
      screen.queryByText(/quantas horas por dia/i),
    ).not.toBeInTheDocument();
  });

  it("shows monthly capacity and hourly comparisons after routine input", () => {
    render(<WorkRoutineStep values={values} errors={{}} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Quantas horas por dia?")).toHaveValue("8");
    expect(screen.getByLabelText("Quantos dias por semana?")).toHaveValue("5");
    expect(screen.getByText("173,2 horas por mês")).toBeInTheDocument();
    expect(screen.getByText(/R\$ 40,42/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 50,00 por hora/)).toBeInTheDocument();
  });

  it("converts appointment price only after duration is informed", () => {
    render(
      <ServiceDurationStep
        values={{
          ...values,
          pricingMethod: "appointment",
          appointmentDurationMinutes: "45",
        }}
        errors={{}}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText("Duração média do atendimento/serviço"),
    ).toHaveValue("45");
    expect(screen.getByText(/R\$ 66,67 por hora/)).toBeInTheDocument();
  });

  it("collects material value and unit only after yes", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [input, setInput] = useState(values);
      return (
        <MaterialCostStep
          values={input}
          errors={{}}
          onChange={(field, value) =>
            setInput((old) => ({ ...old, [field]: value }))
          }
          onHasMaterialCostChange={(hasMaterialCost) =>
            setInput((old) => ({ ...old, hasMaterialCost }))
          }
          onMaterialCostUnitChange={(
            materialCostUnit: ServiceMaterialCostUnit,
          ) => setInput((old) => ({ ...old, materialCostUnit }))}
        />
      );
    }

    render(<Harness />);
    const question = screen.getByRole("radiogroup", {
      name: "Você possui algum custo para realizar o serviço?",
    });
    await user.click(within(question).getByRole("radio", { name: "Sim" }));

    expect(
      screen.getByLabelText(
        "Quanto custa, em média, o material ou insumo utilizado?",
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("combobox", { name: "Esse custo acontece" }),
    );
    expect(
      await screen.findByRole("option", { name: "Por mês" }),
    ).toBeInTheDocument();
  });

  it("reveals tax and platform percentages independently", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [input, setInput] = useState(values);
      return (
        <FeesStep
          values={input}
          errors={{}}
          onChange={(field, value) =>
            setInput((old) => ({ ...old, [field]: value }))
          }
          onPaysRevenueTaxChange={(paysRevenueTax) =>
            setInput((old) => ({ ...old, paysRevenueTax }))
          }
          onHasPaymentFeeChange={(hasPaymentFee) =>
            setInput((old) => ({ ...old, hasPaymentFee }))
          }
        />
      );
    }

    render(<Harness />);
    const tax = screen.getByRole("radiogroup", {
      name: "Você paga imposto sobre o faturamento?",
    });
    await user.click(within(tax).getByRole("radio", { name: "Sim" }));

    expect(
      screen.getByLabelText("Percentual médio de imposto"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Percentual médio da taxa"),
    ).not.toBeInTheDocument();
  });
});
