import { useReducer } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateServiceDiagnosisAction } from "../../actions/create-service-diagnosis.action";

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
  const submissionId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(
    createDiagnosis = vi
      .fn<CreateServiceDiagnosisAction>()
      .mockResolvedValue({ status: "success", diagnosisId: 42 }),
  ) {
    const onBackToType = vi.fn();

    function ControlledWizard() {
      const [state, dispatch] = useReducer(
        serviceWizardReducer,
        undefined,
        () => createInitialServiceWizardState(submissionId),
      );
      return (
        <ServiceDiagnosisWizard
          state={state}
          dispatch={dispatch}
          createDiagnosis={createDiagnosis}
          createSubmissionId={() => "550e8400-e29b-41d4-a716-446655440001"}
          onBackToType={onBackToType}
        />
      );
    }

    render(<ControlledWizard />);
    return { createDiagnosis, onBackToType };
  }

  async function continueStep(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Continuar" }));
  }

  function renderReview(
    createDiagnosis: CreateServiceDiagnosisAction,
    createSubmissionId = vi
      .fn()
      .mockReturnValue("550e8400-e29b-41d4-a716-446655440001"),
  ) {
    const initial = createInitialServiceWizardState(submissionId);

    function ControlledWizard() {
      const [state, dispatch] = useReducer(serviceWizardReducer, {
        ...initial,
        step: "review",
        values: {
          ...initial.values,
          desiredMonthlyIncome: "5000",
          fixedMonthlyExpenses: "2000",
          pricingMethod: "hour",
          currentPrice: "80",
          dailyWorkHours: "8",
          weeklyWorkDays: "5",
          hasMaterialCost: false,
          paysRevenueTax: false,
          hasPaymentFee: false,
        },
      });

      return (
        <ServiceDiagnosisWizard
          state={state}
          dispatch={dispatch}
          createDiagnosis={createDiagnosis}
          createSubmissionId={createSubmissionId}
          onBackToType={vi.fn()}
        />
      );
    }

    render(<ControlledWizard />);
    return { createSubmissionId };
  }

  it("completes the appointment journey in the specified order", async () => {
    const user = userEvent.setup();
    const { createDiagnosis } = renderWizard();

    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Quanto você quer receber por mês?", {
        selector: "input",
      }),
      "5000",
    );
    await continueStep(user);

    await user.type(
      screen.getByLabelText("Gastos que existem todo mês"),
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
        name: "Quanto tempo dura um serviço?",
      }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Quanto tempo dura, em média, um serviço?"),
      "45",
    );
    expect(screen.getByText(/R\$ 66,67 por hora/)).toBeInTheDocument();
    await continueStep(user);

    const material = screen.getByRole("radiogroup", {
      name: "Você gasta com materiais ou produtos para fazer este serviço?",
    });
    await user.click(within(material).getByRole("radio", { name: "Sim" }));
    await user.type(
      screen.getByLabelText(
        "Quanto você gasta, em média, com esses materiais?",
      ),
      "20",
    );
    await user.click(
      screen.getByRole("combobox", { name: "Quando esse gasto acontece?" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "Por atendimento/serviço" }),
    );
    await continueStep(user);

    const tax = screen.getByRole("radiogroup", {
      name: "Você paga impostos sobre o valor recebido?",
    });
    await user.click(within(tax).getByRole("radio", { name: "Sim" }));
    await user.type(
      screen.getByLabelText(
        "Qual porcentagem do valor recebido vai para impostos?",
      ),
      "6",
    );
    const fee = screen.getByRole("radiogroup", {
      name: "Você recebe por cartão ou plataforma que cobra taxa?",
    });
    await user.click(within(fee).getByRole("radio", { name: "Sim" }));
    await user.type(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
      "3,5",
    );
    await continueStep(user);

    expect(screen.getByText("9 de 9")).toBeInTheDocument();
    expect(screen.getByText("R$ 7.000,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 66,67")).toBeInTheDocument();
    expect(screen.getByText("Quanto você quer receber")).toBeInTheDocument();
    expect(screen.getByText("Gastos que existem todo mês")).toBeInTheDocument();
    expect(
      screen.getByText("Quanto você consegue trabalhar por mês"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
    expect(createDiagnosis).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId,
        pricingMethod: "appointment",
        appointmentDurationMinutes: "45",
      }),
    );
  });

  it("skips duration for every non-appointment pricing method", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(
      screen.getByLabelText("Quanto você quer receber por mês?", {
        selector: "input",
      }),
      "5000",
    );
    await continueStep(user);
    await user.type(
      screen.getByLabelText("Gastos que existem todo mês"),
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
        name: "Você gasta materiais para fazer o serviço?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("6 de 8")).toBeInTheDocument();
  });

  it("keeps invalid conditional fields on their source step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(
      screen.getByLabelText("Quanto você quer receber por mês?", {
        selector: "input",
      }),
      "5000",
    );
    await continueStep(user);
    await user.type(
      screen.getByLabelText("Gastos que existem todo mês"),
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

  it("blocks duplicate confirmation while preparing the report", async () => {
    const user = userEvent.setup();
    let finish!: (result: { status: "success"; diagnosisId: number }) => void;
    const createDiagnosis = vi
      .fn<CreateServiceDiagnosisAction>()
      .mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
    renderReview(createDiagnosis);

    await user.dblClick(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(createDiagnosis).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Preparando relatório..." }),
    ).toBeDisabled();

    finish({ status: "success", diagnosisId: 77 });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/77"));
  });

  it("retries a temporary failure with the same submission id", async () => {
    const user = userEvent.setup();
    const createDiagnosis = vi
      .fn<CreateServiceDiagnosisAction>()
      .mockResolvedValueOnce({ status: "error", error: "create_failed" })
      .mockResolvedValueOnce({ status: "success", diagnosisId: 78 });
    renderReview(createDiagnosis);

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o diagnóstico. Tente novamente.",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(createDiagnosis).toHaveBeenCalledTimes(2);
    expect(createDiagnosis).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ submissionId }),
    );
    expect(createDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ submissionId }),
    );
  });

  it("offers login recovery when the session expired", async () => {
    const user = userEvent.setup();
    const createDiagnosis = vi
      .fn<CreateServiceDiagnosisAction>()
      .mockResolvedValue({ status: "error", error: "unauthorized" });
    renderReview(createDiagnosis);

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(
      await screen.findByRole("link", { name: "Entrar novamente" }),
    ).toHaveAttribute("href", "/login");
  });

  it("returns to and focuses the first invalid visible answer", async () => {
    const user = userEvent.setup();
    const createDiagnosis = vi
      .fn<CreateServiceDiagnosisAction>()
      .mockResolvedValue({
        status: "error",
        error: "invalid_input",
        fieldErrors: { currentPrice: ["Informe o preço que você cobra hoje."] },
      });
    renderReview(createDiagnosis);

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Como você cobra pelo seu trabalho?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quanto você cobra por hora?")).toHaveFocus();
  });

  it("replaces only an invalid submission id and preserves answers", async () => {
    const user = userEvent.setup();
    const createDiagnosis = vi
      .fn<CreateServiceDiagnosisAction>()
      .mockResolvedValueOnce({
        status: "error",
        error: "invalid_input",
        fieldErrors: { submissionId: ["Identificador inválido."] },
      })
      .mockResolvedValueOnce({ status: "success", diagnosisId: 79 });
    const { createSubmissionId } = renderReview(createDiagnosis);

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(screen.getAllByText("R$ 80,00").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(createDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        submissionId: "550e8400-e29b-41d4-a716-446655440001",
        currentPrice: "80",
      }),
    );
  });
});
