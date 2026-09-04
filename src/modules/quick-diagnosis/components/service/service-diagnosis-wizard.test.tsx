import { useReducer } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ServiceDiagnosisWizard } from "./service-diagnosis-wizard";
import {
  createInitialServiceWizardState,
  serviceWizardReducer,
} from "./service-wizard-state";

describe("ServiceDiagnosisWizard", () => {
  function renderWizard() {
    const onBackToType = vi.fn();

    function ControlledWizard() {
      const [state, dispatch] = useReducer(
        serviceWizardReducer,
        undefined,
        createInitialServiceWizardState,
      );
      return (
        <ServiceDiagnosisWizard
          state={state}
          dispatch={dispatch}
          onBackToType={onBackToType}
        />
      );
    }

    render(<ControlledWizard />);
    return { onBackToType };
  }

  async function continueStep(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Continuar" }));
  }

  it("completes the appointment journey in the specified order", async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Ganho mensal desejado"), "5000");
    await continueStep(user);

    await user.type(
      screen.getByLabelText("Total dos custos fixos mensais"),
      "2000",
    );
    expect(screen.getByText(/R\$ 7.000,00/)).toBeInTheDocument();
    await continueStep(user);

    await user.click(
      screen.getByRole("radio", { name: "Por atendimento/serviço" }),
    );
    await user.type(
      screen.getByLabelText("Quanto você cobra por atendimento?"),
      "50",
    );
    expect(
      screen.queryByText("Quantas horas por dia?"),
    ).not.toBeInTheDocument();
    await continueStep(user);

    expect(screen.getByText("5 de 9")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Quantas horas por dia?"), "8");
    await user.type(screen.getByLabelText("Quantos dias por semana?"), "5");
    expect(screen.getByText("173,2 horas por mês")).toBeInTheDocument();
    await continueStep(user);

    expect(
      screen.getByRole("heading", {
        name: "Quanto tempo você leva para realizar um atendimento/serviço?",
      }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Duração média do atendimento/serviço"),
      "45",
    );
    expect(screen.getByText(/R\$ 66,67 por hora/)).toBeInTheDocument();
    await continueStep(user);

    const material = screen.getByRole("radiogroup", {
      name: "Você possui algum custo para realizar o serviço?",
    });
    await user.click(within(material).getByRole("radio", { name: "Sim" }));
    await user.type(
      screen.getByLabelText(
        "Quanto custa, em média, o material ou insumo utilizado?",
      ),
      "20",
    );
    await user.click(
      screen.getByRole("combobox", { name: "Esse custo acontece" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "Por atendimento/serviço" }),
    );
    await continueStep(user);

    const tax = screen.getByRole("radiogroup", {
      name: "Você paga imposto sobre o faturamento?",
    });
    await user.click(within(tax).getByRole("radio", { name: "Sim" }));
    await user.type(screen.getByLabelText("Percentual médio de imposto"), "6");
    const fee = screen.getByRole("radiogroup", {
      name: "Você recebe por cartão ou plataforma que cobra taxa?",
    });
    await user.click(within(fee).getByRole("radio", { name: "Sim" }));
    await user.type(screen.getByLabelText("Percentual médio da taxa"), "3,5");
    await continueStep(user);

    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getByText("R$ 7.000,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 66,67")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Gerar relatório temporariamente indisponível",
      }),
    ).toBeDisabled();
  });

  it("skips duration for every non-appointment pricing method", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Ganho mensal desejado"), "5000");
    await continueStep(user);
    await user.type(
      screen.getByLabelText("Total dos custos fixos mensais"),
      "2000",
    );
    await continueStep(user);
    await user.click(screen.getByRole("radio", { name: "Por minuto" }));
    await user.type(
      screen.getByLabelText("Quanto você cobra por minuto?"),
      "2",
    );
    await continueStep(user);
    await user.type(screen.getByLabelText("Quantas horas por dia?"), "8");
    await user.type(screen.getByLabelText("Quantos dias por semana?"), "5");
    await continueStep(user);

    expect(
      screen.getByRole("heading", {
        name: "Você possui algum custo para realizar o serviço?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("6 de 8")).toBeInTheDocument();
  });

  it("keeps invalid conditional fields on their source step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Ganho mensal desejado"), "5000");
    await continueStep(user);
    await user.type(
      screen.getByLabelText("Total dos custos fixos mensais"),
      "2000",
    );
    await continueStep(user);
    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.type(screen.getByLabelText("Quanto você cobra por hora?"), "50");
    await continueStep(user);
    await user.type(screen.getByLabelText("Quantas horas por dia?"), "25");
    await user.type(screen.getByLabelText("Quantos dias por semana?"), "8");
    await continueStep(user);

    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByLabelText("Quantas horas por dia?")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
