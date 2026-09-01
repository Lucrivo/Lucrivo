import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import {
  QuickDiagnosisWizard,
  type CreateProductDiagnosisAction,
  type CreateServiceDiagnosisAction,
} from "./quick-diagnosis-wizard";

const submissionIds = [
  "550e8400-e29b-41d4-a716-446655440001",
  "550e8400-e29b-41d4-a716-446655440002",
  "550e8400-e29b-41d4-a716-446655440003",
] as const;

describe("QuickDiagnosisWizard category orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(options?: {
    createServiceDiagnosis?: CreateServiceDiagnosisAction;
    createProductDiagnosis?: CreateProductDiagnosisAction;
  }) {
    const createServiceDiagnosis =
      options?.createServiceDiagnosis ?? vi.fn<CreateServiceDiagnosisAction>();
    const createProductDiagnosis =
      options?.createProductDiagnosis ?? vi.fn<CreateProductDiagnosisAction>();
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce(submissionIds[0])
      .mockReturnValueOnce(submissionIds[1])
      .mockReturnValueOnce(submissionIds[2]);

    render(
      <QuickDiagnosisWizard
        createServiceDiagnosis={createServiceDiagnosis}
        createProductDiagnosis={createProductDiagnosis}
        createSubmissionId={createSubmissionId}
      />,
    );

    return {
      createServiceDiagnosis,
      createProductDiagnosis,
      createSubmissionId,
    };
  }

  async function openCategoryFromProductValues(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
  }

  async function completeProductDiagnosis(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Custo de compra por unidade"), "50");
    await user.type(screen.getByLabelText("Preço de venda por unidade"), "100");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Despesas fixas mensais"), "1000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Volume médio mensal de vendas"),
      "100",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(
      screen.getByRole("switch", { name: "Incluir pró-labore" }),
    );
    await user.type(screen.getByLabelText("Pró-labore mensal"), "2000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
  }

  async function completeServiceDiagnosis(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await user.type(screen.getByLabelText("Renda mensal desejada"), "5000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Despesas fixas mensais"), "1200");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Horas de trabalho por mês"), "160");
    await user.type(screen.getByLabelText("Dias de trabalho por semana"), "5");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("radio", { name: "Por hora" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Valor por hora"), "125,90");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
  }

  it("enables Service and Product while keeping only Production unavailable", async () => {
    const user = userEvent.setup();
    const { createSubmissionId } = renderWizard();

    expect(screen.getByText("1 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "O que você quer analisar?" }),
    ).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Serviço" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Produto" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Produção" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getAllByText("Em breve")).toHaveLength(1);
    expect(createSubmissionId).not.toHaveBeenCalled();

    const service = screen.getByRole("radio", { name: "Serviço" });
    service.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Produto" })).toBeChecked();
  });

  it("requires an enabled diagnosis type before continuing", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecione o que você quer analisar.",
    );
    expect(screen.getByText("1 de 8")).toBeInTheDocument();
  });

  it("preserves one branch, replaces different branches, and retries Product with UUID C", async () => {
    const user = userEvent.setup();
    const createProductDiagnosis = vi
      .fn()
      .mockResolvedValueOnce({ status: "error", error: "create_failed" })
      .mockResolvedValueOnce({ status: "success", diagnosisId: 42 });
    const { createServiceDiagnosis, createSubmissionId } = renderWizard({
      createProductDiagnosis,
    });

    await user.click(screen.getByRole("radio", { name: "Produto" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(createSubmissionId).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Custo de compra por unidade"), "50");
    await user.type(screen.getByLabelText("Preço de venda por unidade"), "100");
    await openCategoryFromProductValues(user);

    expect(screen.getByRole("radio", { name: "Produto" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Custo de compra por unidade")).toHaveValue(
      "50",
    );
    expect(screen.getByLabelText("Preço de venda por unidade")).toHaveValue(
      "100",
    );
    expect(createSubmissionId).toHaveBeenCalledTimes(1);

    await openCategoryFromProductValues(user);
    await user.click(screen.getByRole("radio", { name: "Serviço" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(createSubmissionId).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    await user.click(screen.getByRole("radio", { name: "Produto" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(createSubmissionId).toHaveBeenCalledTimes(3);
    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Custo de compra por unidade")).toHaveValue(
      "",
    );

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await completeProductDiagnosis(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o diagnóstico. Tente novamente.",
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
    expect(createProductDiagnosis).toHaveBeenCalledTimes(2);
    expect(createProductDiagnosis).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ submissionId: submissionIds[2] }),
    );
    expect(createProductDiagnosis).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ submissionId: submissionIds[2] }),
    );
    expect(createServiceDiagnosis).not.toHaveBeenCalled();
  });

  it("submits the unchanged Service payload only to the Service action", async () => {
    const user = userEvent.setup();
    const createServiceDiagnosis = vi
      .fn()
      .mockResolvedValue({ status: "success", diagnosisId: 42 });
    const { createProductDiagnosis } = renderWizard({
      createServiceDiagnosis,
    });

    await user.click(screen.getByRole("radio", { name: "Serviço" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await completeServiceDiagnosis(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
    expect(createServiceDiagnosis).toHaveBeenCalledWith({
      submissionId: submissionIds[0],
      pricingMethod: "hour",
      desiredMonthlyIncome: "5000",
      fixedMonthlyExpenses: "1200",
      monthlyWorkHours: "160",
      weeklyWorkDays: "5",
      hourlyRate: "125,90",
      minuteRate: "",
      appointmentRate: "",
      appointmentDurationMinutes: "",
      taxRate: "6,25",
      cardFeeRate: "3,50",
    });
    expect(createProductDiagnosis).not.toHaveBeenCalled();
  });
});
