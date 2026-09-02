import { useReducer, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { ServiceDiagnosisWizard } from "./service-diagnosis-wizard";
import {
  createInitialServiceWizardState,
  serviceWizardReducer,
} from "./service-wizard-state";

describe("ServiceDiagnosisWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(
    createDiagnosis = vi.fn(),
    createSubmissionId = vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  ) {
    const onBackToType = vi.fn();

    function ControlledServiceWizard() {
      const [submissionId] = useState(createSubmissionId);
      const [state, dispatch] = useReducer(
        serviceWizardReducer,
        submissionId,
        createInitialServiceWizardState,
      );

      return (
        <ServiceDiagnosisWizard
          state={state}
          dispatch={dispatch}
          createDiagnosis={createDiagnosis}
          createSubmissionId={createSubmissionId}
          onBackToType={onBackToType}
        />
      );
    }

    render(<ControlledServiceWizard />);
    return { createDiagnosis, createSubmissionId, onBackToType };
  }

  async function completeValidDiagnosis() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Pró-labore mensal"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Contas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quantas horas faturáveis por mês?"),
      "160",
    );
    await user.type(
      screen.getByLabelText("Quantos dias por semana você trabalha?"),
      "5",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quanto você cobra por hora?"),
      "125,90",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    return user;
  }

  async function completeAppointmentDiagnosis() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Pró-labore mensal"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Contas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.click(
      screen.getByRole("combobox", { name: "Horas faturáveis por" }),
    );
    await user.click(screen.getByRole("option", { name: "Dia" }));
    await user.type(
      screen.getByLabelText("Quantas horas faturáveis por dia?"),
      "6",
    );
    await user.type(
      screen.getByLabelText("Quantos dias por semana você trabalha?"),
      "5",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.click(screen.getByRole("radio", { name: "Por atendimento" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quanto dura cada atendimento?"),
      "60",
    );
    await user.type(
      screen.getByLabelText("Quanto você cobra por atendimento?"),
      "125,90",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.click(
      screen.getByRole("switch", {
        name: "Você tem algum custo de material por atendimento?",
      }),
    );
    await user.type(
      screen.getByLabelText("Custo de material por atendimento"),
      "20",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    return user;
  }

  it("submits the complete nine-step appointment journey", async () => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValue({ status: "success", diagnosisId: 42 });
    renderWizard(createDiagnosis);

    const user = await completeAppointmentDiagnosis();

    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getByText("6 horas faturáveis por dia")).toBeInTheDocument();
    expect(
      screen.getByText("129,9 horas faturáveis por mês"),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 20,00 por atendimento")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(createDiagnosis).toHaveBeenCalledWith({
      submissionId: "550e8400-e29b-41d4-a716-446655440000",
      pricingMethod: "appointment",
      desiredMonthlyIncome: "5000",
      fixedMonthlyExpenses: "1200",
      workHoursPeriod: "day",
      workHours: "6",
      weeklyWorkDays: "5",
      hourlyRate: "",
      minuteRate: "",
      appointmentRate: "125,90",
      appointmentDurationMinutes: "60",
      hasMaterialCost: true,
      materialUnitCost: "20",
      taxRate: "6,25",
      cardFeeRate: "3,50",
    });
  });

  it("routes a material server error to its step and focuses the cost", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "invalid_input",
      fieldErrors: { materialUnitCost: ["Custo de material inválido."] },
    });
    renderWizard(createDiagnosis);
    const user = await completeAppointmentDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(
      await screen.findByLabelText("Custo de material por atendimento"),
    ).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Custo de material inválido.",
    );
  });

  it("renders global step two focused and delegates Back to category", async () => {
    const user = userEvent.setup();
    const { createDiagnosis, createSubmissionId, onBackToType } =
      renderWizard();

    expect(screen.getByText("2 de 9")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "9",
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Quanto você quer tirar por mês pra você?",
      }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(onBackToType).toHaveBeenCalledOnce();
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it.each([
    ["Por hora", "Quanto você cobra por hora?"],
    ["Por minuto", "Quanto você cobra por minuto?"],
    ["Por atendimento", "Quanto você cobra por atendimento?"],
  ])("renders only the price fields for %s", async (method, priceLabel) => {
    const user = userEvent.setup();
    const { createDiagnosis } = renderWizard();

    await user.type(screen.getByLabelText("Pró-labore mensal"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Contas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quantas horas faturáveis por mês?"),
      "160",
    );
    await user.type(
      screen.getByLabelText("Quantos dias por semana você trabalha?"),
      "5",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("radio", { name: method }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText(priceLabel)).toBeInTheDocument();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    if (method === "Por minuto" || method === "Por atendimento") {
      expect(
        screen.getByLabelText("Quanto dura cada atendimento?"),
      ).toBeInTheDocument();
    } else {
      expect(
        screen.queryByLabelText("Quanto dura cada atendimento?"),
      ).not.toBeInTheDocument();
    }

    await user.type(screen.getByLabelText(priceLabel), "125");
    if (method === "Por minuto" || method === "Por atendimento") {
      await user.type(
        screen.getByLabelText("Quanto dura cada atendimento?"),
        "40",
      );
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    if (method === "Por minuto") {
      expect(screen.getByText("40 minutos")).toBeInTheDocument();
    }
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it("completes all seven input steps and preserves values when going back", async () => {
    const user = userEvent.setup();
    const { createDiagnosis } = renderWizard();

    await user.type(screen.getByLabelText("Pró-labore mensal"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Contas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quantas horas faturáveis por mês?"),
      "160",
    );
    await user.type(
      screen.getByLabelText("Quantos dias por semana você trabalha?"),
      "5",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quanto você cobra por hora?"),
      "125,90",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createDiagnosis).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByLabelText("Impostos")).toHaveValue("6,25");
    expect(screen.getByLabelText("Taxa do cartão")).toHaveValue("3,50");
  });

  it("links work-routine errors and stays on the invalid step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quantas horas faturáveis por mês?"),
      "744,01",
    );
    await user.type(
      screen.getByLabelText("Quantos dias por semana você trabalha?"),
      "8",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    const hours = screen.getByLabelText("Quantas horas faturáveis por mês?");
    const days = screen.getByLabelText(
      "Quantos dias por semana você trabalha?",
    );
    expect(hours).toHaveAttribute("aria-invalid", "true");
    expect(hours).toHaveAttribute("aria-describedby", "workHours-error");
    expect(days).toHaveAttribute("aria-invalid", "true");
    expect(days).toHaveAttribute("aria-describedby", "weeklyWorkDays-error");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(
      screen.getByRole("heading", {
        name: "Qual é sua capacidade de atendimento?",
      }),
    ).toBeInTheDocument();
  });

  it("rejects zero/fractional appointment values and excessive fees", async () => {
    const user = userEvent.setup();
    renderWizard();

    for (let step = 0; step < 3; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    await user.click(screen.getByRole("radio", { name: "Por atendimento" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quanto você cobra por atendimento?"),
      "0",
    );
    await user.type(
      screen.getByLabelText("Quanto dura cada atendimento?"),
      "45,5",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByLabelText("Quanto dura cada atendimento?"),
    ).toHaveAttribute("aria-invalid", "true");

    await user.clear(screen.getByLabelText("Quanto dura cada atendimento?"));
    await user.type(
      screen.getByLabelText("Quanto dura cada atendimento?"),
      "45",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByLabelText("Quanto você cobra por atendimento?"),
    ).toHaveAttribute("aria-invalid", "true");

    await user.clear(
      screen.getByLabelText("Quanto você cobra por atendimento?"),
    );
    await user.type(
      screen.getByLabelText("Quanto você cobra por atendimento?"),
      "350",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "100,01");
    await user.type(screen.getByLabelText("Taxa do cartão"), "100,01");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText("Impostos")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Taxa do cartão")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("supports keyboard radio selection and clears an old method price", async () => {
    const user = userEvent.setup();
    renderWizard();

    for (let step = 0; step < 3; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    const hour = screen.getByRole("radio", { name: "Por hora" });
    hour.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Por minuto" })).toBeChecked();
    await user.click(hour);

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Quanto você cobra por hora?"),
      "125",
    );
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await user.click(screen.getByRole("radio", { name: "Por minuto" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText("Quanto você cobra por minuto?")).toHaveValue(
      "",
    );
    expect(
      screen.queryByLabelText("Quanto você cobra por hora?"),
    ).not.toBeInTheDocument();
  });

  it("reviews grouped, formatted answers and edits each source step", async () => {
    const { createDiagnosis, onBackToType } = renderWizard();
    const user = await completeValidDiagnosis();

    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getByText("Serviço")).toBeInTheDocument();
    expect(screen.getByText("Por hora")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.000,00")).toBeInTheDocument();
    expect(
      screen.getByText("160 horas faturáveis por mês"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sem custo de material")).toBeInTheDocument();
    expect(screen.getByText("6,25%")).toBeInTheDocument();
    expect(createDiagnosis).not.toHaveBeenCalled();

    const edits = [
      ["Editar forma de cobrança", "Como você vende seu tempo?"],
      ["Editar meta mensal", "Quanto você quer tirar por mês pra você?"],
      ["Editar despesas fixas", "Quanto são suas contas fixas do mês?"],
      ["Editar rotina", "Qual é sua capacidade de atendimento?"],
      ["Editar preço atual", "Quanto você cobra?"],
      [
        "Editar custo de material",
        "Você tem algum custo de material por hora trabalhada?",
      ],
      ["Editar taxas", "Você paga imposto e taxa de cartão?"],
    ] as const;

    for (const [buttonName, heading] of edits) {
      await user.click(screen.getByRole("button", { name: buttonName }));
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      while (!screen.queryByText("9 de 9")) {
        await user.click(screen.getByRole("button", { name: "Continuar" }));
      }
    }

    await user.click(
      screen.getByRole("button", { name: "Editar meta mensal" }),
    );
    expect(screen.getByLabelText("Pró-labore mensal")).toHaveValue("5000");

    while (!screen.queryByText("9 de 9")) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    await user.click(
      screen.getByRole("button", { name: "Editar tipo de diagnóstico" }),
    );
    expect(onBackToType).toHaveBeenCalledOnce();
  });

  it("locks a double submission and redirects to the prepared report", async () => {
    let resolveDiagnosis: (result: {
      status: "success";
      diagnosisId: number;
    }) => void = () => undefined;
    const createDiagnosis = vi.fn(
      () =>
        new Promise<{ status: "success"; diagnosisId: number }>((resolve) => {
          resolveDiagnosis = resolve;
        }),
    );
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440000")
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440001");
    renderWizard(createDiagnosis, createSubmissionId);
    const user = await completeValidDiagnosis();

    const confirm = screen.getByRole("button", {
      name: "Confirmar diagnóstico",
    });
    await user.dblClick(confirm);

    expect(createDiagnosis).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Preparando relatório..." }),
    ).toBeDisabled();
    expect(createDiagnosis).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );

    resolveDiagnosis({ status: "success", diagnosisId: 42 });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
    expect(replace).toHaveBeenCalledOnce();
    expect(createDiagnosis).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Preparando relatório..." }),
    ).toBeDisabled();
    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(createSubmissionId).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "create_failed",
      "Não foi possível salvar o diagnóstico. Tente novamente.",
    ],
    ["unauthorized", "Sua sessão expirou. Entre novamente para continuar."],
  ] as const)("preserves the review after %s", async (error, message) => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValue({ status: "error", error });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.000,00")).toBeInTheDocument();
    if (error === "unauthorized") {
      expect(
        screen.getByRole("link", { name: "Entrar novamente" }),
      ).toHaveAttribute("href", "/login");
    }

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(createDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("navigates to the original report after an idempotent retry", async () => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValueOnce({ status: "error", error: "create_failed" })
      .mockResolvedValueOnce({ status: "success", diagnosisId: 42 });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
    expect(createDiagnosis).toHaveBeenCalledTimes(2);
    expect(createDiagnosis.mock.calls[0]?.[0].submissionId).toBe(
      createDiagnosis.mock.calls[1]?.[0].submissionId,
    );
  });

  it("routes invalid server fields to the earliest step and focuses the input", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        taxRate: ["Taxa inválida."],
        desiredMonthlyIncome: ["Meta inválida."],
      },
    });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByLabelText("Pró-labore mensal")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Meta inválida.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("regenerates an invalid uneditable submission id", async () => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValueOnce({
        status: "error",
        error: "invalid_input",
        fieldErrors: { submissionId: ["Identificador inválido."] },
      })
      .mockResolvedValueOnce({ status: "success", diagnosisId: 42 });
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440000")
      .mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440001");
    renderWizard(createDiagnosis, createSubmissionId);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Como você vende seu tempo?",
      }),
    ).toBeInTheDocument();

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(createDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
  });
});
