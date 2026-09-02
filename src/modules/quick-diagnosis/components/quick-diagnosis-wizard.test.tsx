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
  type CreateProductionDiagnosisAction,
  type CreateServiceDiagnosisAction,
} from "./quick-diagnosis-wizard";

const submissionIds = [
  "550e8400-e29b-41d4-a716-446655440001",
  "550e8400-e29b-41d4-a716-446655440002",
  "550e8400-e29b-41d4-a716-446655440003",
  "550e8400-e29b-41d4-a716-446655440004",
  "550e8400-e29b-41d4-a716-446655440005",
] as const;

describe("QuickDiagnosisWizard category orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(options?: {
    createServiceDiagnosis?: CreateServiceDiagnosisAction;
    createProductDiagnosis?: CreateProductDiagnosisAction;
    createProductionDiagnosis?: CreateProductionDiagnosisAction;
  }) {
    const createServiceDiagnosis =
      options?.createServiceDiagnosis ?? vi.fn<CreateServiceDiagnosisAction>();
    const createProductDiagnosis =
      options?.createProductDiagnosis ?? vi.fn<CreateProductDiagnosisAction>();
    const createProductionDiagnosis =
      options?.createProductionDiagnosis ??
      vi.fn<CreateProductionDiagnosisAction>();
    const createSubmissionId = vi
      .fn()
      .mockReturnValueOnce(submissionIds[0])
      .mockReturnValueOnce(submissionIds[1])
      .mockReturnValueOnce(submissionIds[2])
      .mockReturnValueOnce(submissionIds[3])
      .mockReturnValueOnce(submissionIds[4]);

    render(
      <QuickDiagnosisWizard
        createServiceDiagnosis={createServiceDiagnosis}
        createProductDiagnosis={createProductDiagnosis}
        createProductionDiagnosis={createProductionDiagnosis}
        createSubmissionId={createSubmissionId}
      />,
    );

    return {
      createServiceDiagnosis,
      createProductDiagnosis,
      createProductionDiagnosis,
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
  }

  async function completeProductionDiagnosis(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    const productionCost = screen.getByLabelText(
      "Custo de fabricação por unidade",
    );
    const salePrice = screen.getByLabelText("Preço de venda por unidade");
    if ((productionCost as HTMLInputElement).value === "") {
      await user.type(productionCost, "50");
    }
    if ((salePrice as HTMLInputElement).value === "") {
      await user.type(salePrice, "100");
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Despesas fixas mensais"), "1000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Volume médio mensal de unidades vendidas"),
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

  it("enables all three diagnosis categories without a coming-soon badge", async () => {
    const user = userEvent.setup();
    const { createSubmissionId } = renderWizard();

    expect(screen.getByText("1 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "O que você quer analisar?" }),
    ).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Serviço" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Produto" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "Produção" })).toBeEnabled();
    expect(screen.queryByText("Em breve")).not.toBeInTheDocument();
    expect(createSubmissionId).not.toHaveBeenCalled();

    const service = screen.getByRole("radio", { name: "Serviço" });
    service.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Produto" })).toBeChecked();
  });

  it("preserves one Production branch and submits only to its Action", async () => {
    const user = userEvent.setup();
    const createProductionDiagnosis = vi
      .fn<CreateProductionDiagnosisAction>()
      .mockResolvedValue({ status: "success", diagnosisId: 126 });
    const {
      createServiceDiagnosis,
      createProductDiagnosis,
      createSubmissionId,
    } = renderWizard({ createProductionDiagnosis });

    await user.click(screen.getByRole("radio", { name: "Produção" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Qual análise você quer fazer?" }),
    ).toHaveFocus();
    expect(createSubmissionId).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(
      screen.getByLabelText("Custo de fabricação por unidade"),
      "50",
    );
    await user.type(screen.getByLabelText("Preço de venda por unidade"), "100");
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.getByRole("radio", { name: "Produção" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByLabelText("Custo de fabricação por unidade"),
    ).toHaveValue("50");
    expect(screen.getByLabelText("Preço de venda por unidade")).toHaveValue(
      "100",
    );
    expect(createSubmissionId).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await completeProductionDiagnosis(user);
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/126"));
    expect(createProductionDiagnosis).toHaveBeenCalledWith({
      submissionId: submissionIds[0],
      costCompositionEnabled: false,
      productionUnitCost: "50",
      materialUnitCost: "",
      packagingUnitCost: "",
      directLaborUnitCost: "",
      otherVariableUnitCost: "",
      unitSalePrice: "100",
      fixedMonthlyExpenses: "1000",
      monthlySalesVolume: "100",
      proLaboreIncluded: true,
      proLabore: "2000",
      taxRate: "6,25",
      cardFeeRate: "3,50",
    });
    expect(createServiceDiagnosis).not.toHaveBeenCalled();
    expect(createProductDiagnosis).not.toHaveBeenCalled();
  });

  it.each(["Produto", "Serviço"] as const)(
    "discards an abandoned %s branch when switching through Production",
    async (initialCategory) => {
      const user = userEvent.setup();
      const { createSubmissionId } = renderWizard();

      await user.click(screen.getByRole("radio", { name: initialCategory }));
      await user.click(screen.getByRole("button", { name: "Continuar" }));

      if (initialCategory === "Produto") {
        await user.click(
          screen.getByRole("radio", { name: "Diagnóstico rápido" }),
        );
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.type(
          screen.getByLabelText("Custo de compra por unidade"),
          "77",
        );
        await user.click(screen.getByRole("button", { name: "Voltar" }));
        await user.click(screen.getByRole("button", { name: "Voltar" }));
      } else {
        await user.type(screen.getByLabelText("Pró-labore mensal"), "5000");
        await user.click(screen.getByRole("button", { name: "Voltar" }));
      }

      await user.click(screen.getByRole("radio", { name: "Produção" }));
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      expect(createSubmissionId).toHaveBeenCalledTimes(2);
      expect(screen.getByText("2 de 8")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Voltar" }));

      await user.click(screen.getByRole("radio", { name: initialCategory }));
      await user.click(screen.getByRole("button", { name: "Continuar" }));
      expect(createSubmissionId).toHaveBeenCalledTimes(3);

      if (initialCategory === "Produto") {
        expect(
          screen.getByRole("radio", { name: "Diagnóstico rápido" }),
        ).not.toBeChecked();
      } else {
        expect(screen.getByLabelText("Pró-labore mensal")).toHaveValue("");
      }
    },
  );

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
    const {
      createServiceDiagnosis,
      createProductionDiagnosis,
      createSubmissionId,
    } = renderWizard({ createProductDiagnosis });

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
    expect(createProductionDiagnosis).not.toHaveBeenCalled();
  });

  it("submits the unchanged Service payload only to the Service action", async () => {
    const user = userEvent.setup();
    const createServiceDiagnosis = vi
      .fn()
      .mockResolvedValue({ status: "success", diagnosisId: 42 });
    const { createProductDiagnosis, createProductionDiagnosis } = renderWizard({
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
    });
    expect(createProductDiagnosis).not.toHaveBeenCalled();
    expect(createProductionDiagnosis).not.toHaveBeenCalled();
  });
});
