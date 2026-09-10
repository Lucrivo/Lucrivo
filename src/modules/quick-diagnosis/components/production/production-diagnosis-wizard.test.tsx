import { useReducer, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { productionDiagnosisSchema } from "../../schemas/production-diagnosis.schema";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { ProductionDiagnosisWizard } from "./production-diagnosis-wizard";
import {
  createInitialProductionWizardState,
  productionWizardReducer,
} from "./production-wizard-state";

type CostMode = "summarized" | "composed";

describe("ProductionDiagnosisWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(
    createDiagnosis = vi.fn(),
    createSubmissionId = vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  ) {
    const onBackToType = vi.fn();

    function ControlledProductionWizard() {
      const [submissionId] = useState(createSubmissionId);
      const [state, dispatch] = useReducer(
        productionWizardReducer,
        submissionId,
        createInitialProductionWizardState,
      );

      return (
        <ProductionDiagnosisWizard
          state={state}
          dispatch={dispatch}
          createDiagnosis={createDiagnosis}
          createSubmissionId={createSubmissionId}
          onBackToType={onBackToType}
        />
      );
    }

    const rendered = render(<ControlledProductionWizard />);
    return {
      ...rendered,
      createDiagnosis,
      createSubmissionId,
      onBackToType,
    };
  }

  async function completeValidDiagnosis(options?: {
    mode?: CostMode;
    volume?: boolean;
    compensation?: boolean;
  }) {
    const user = userEvent.setup();
    const mode = options?.mode ?? "summarized";
    const volume = options?.volume ?? true;
    const compensation = options?.compensation ?? true;

    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Que tipo de resultado você quer ver?",
      }),
    ).toHaveFocus();

    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("3 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Quanto custa produzir e por quanto você vende?",
      }),
    ).toHaveFocus();

    if (mode === "composed") {
      await user.click(
        screen.getByRole("switch", {
          name: "Quer somar os gastos de produção por partes?",
        }),
      );
      await user.type(screen.getByLabelText("Materiais"), "30");
      await user.type(screen.getByLabelText("Embalagem"), "5");
      await user.type(screen.getByLabelText("Seu tempo de produção"), "10");
      await user.type(screen.getByLabelText("Outros gastos por unidade"), "5");
      expect(screen.getByRole("status")).toHaveTextContent("R$ 50,00");
    } else {
      await user.type(
        screen.getByLabelText("Quanto custa produzir uma unidade?"),
        "50",
      );
    }
    await user.type(
      screen.getByLabelText("Por quanto você vende cada unidade?"),
      "100",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("4 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Quais gastos você tem todo mês?",
      }),
    ).toHaveFocus();
    await user.type(
      screen.getByLabelText("Gastos que existem todo mês"),
      "1000",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("5 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Quantas unidades você vende por mês?",
      }),
    ).toHaveFocus();
    if (volume) {
      await user.type(
        screen.getByLabelText("Quantas unidades você vende em um mês comum?"),
        "100",
      );
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("6 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Quanto você quer receber por mês?",
      }),
    ).toHaveFocus();
    if (compensation) {
      await user.click(
        screen.getByRole("switch", {
          name: "Você quer incluir o valor que recebe pelo seu trabalho?",
        }),
      );
      await user.type(
        screen.getByLabelText("Quanto você quer receber por mês?", {
          selector: "input",
        }),
        "2000",
      );
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("7 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "O que é descontado de cada venda?",
      }),
    ).toHaveFocus();
    await user.type(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
      "6,25",
    );
    await user.type(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
      "3,50",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("8 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Confira as informações da produção",
      }),
    ).toHaveFocus();

    return user;
  }

  it("validates the current step and returns to diagnosis type from modality", async () => {
    const { onBackToType } = renderWizard();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecione o diagnóstico rápido para continuar.",
    );
    expect(screen.getByText("2 de 8")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("3 de 8")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(
      screen.getByText("Informe quanto custa produzir uma unidade."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Informe por quanto você vende cada unidade."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBackToType).toHaveBeenCalledOnce();
  });

  it("completes the summarized path and exposes every review edit", async () => {
    const { createDiagnosis, createSubmissionId, onBackToType } =
      renderWizard();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);

    const user = await completeValidDiagnosis();

    expect(screen.getByText("Produção")).toBeInTheDocument();
    expect(screen.getByText("Diagnóstico rápido")).toBeInTheDocument();
    expect(
      screen.getByText("Quanto custa produzir uma unidade?"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Materiais")).not.toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
    expect(
      screen.getByText("100 unidades vendidas por mês"),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 2.000,00")).toBeInTheDocument();
    expect(screen.getByText("6,25%")).toBeInTheDocument();
    expect(screen.getByText("3,50%")).toBeInTheDocument();
    expect(createDiagnosis).not.toHaveBeenCalled();

    const edits = [
      ["Editar modalidade", "Que tipo de resultado você quer ver?"],
      [
        "Editar valores da produção",
        "Quanto custa produzir e por quanto você vende?",
      ],
      ["Editar gastos mensais", "Quais gastos você tem todo mês?"],
      ["Editar quantidade de vendas", "Quantas unidades você vende por mês?"],
      ["Editar quanto você quer receber", "Quanto você quer receber por mês?"],
      ["Editar descontos da venda", "O que é descontado de cada venda?"],
    ] as const;

    for (const [buttonName, heading] of edits) {
      await user.click(screen.getByRole("button", { name: buttonName }));
      expect(screen.getByRole("heading", { name: heading })).toHaveFocus();

      if (buttonName === "Editar valores da produção") {
        expect(
          screen.getByRole("switch", {
            name: "Quer somar os gastos de produção por partes?",
          }),
        ).not.toBeChecked();
        expect(
          screen.getByLabelText("Quanto custa produzir uma unidade?"),
        ).toHaveValue("50");
        expect(
          screen.getByLabelText("Por quanto você vende cada unidade?"),
        ).toHaveValue("100");
      }

      while (!screen.queryByText("8 de 8")) {
        await user.click(screen.getByRole("button", { name: "Continuar" }));
      }
    }

    await user.click(
      screen.getByRole("button", { name: "Editar tipo de diagnóstico" }),
    );
    expect(onBackToType).toHaveBeenCalledOnce();
    expect(createSubmissionId).toHaveBeenCalledOnce();
  });

  it("completes the composed path and preserves its raw component values", async () => {
    renderWizard();
    const user = await completeValidDiagnosis({ mode: "composed" });

    expect(screen.getByText("Materiais")).toBeInTheDocument();
    expect(screen.getByText("Embalagem")).toBeInTheDocument();
    expect(screen.getByText("Seu tempo de produção")).toBeInTheDocument();
    expect(screen.getByText("Outros gastos por unidade")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 5,00")).toHaveLength(2);
    expect(screen.getByText("R$ 10,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 30,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Editar valores da produção" }),
    );
    expect(
      screen.getByRole("switch", {
        name: "Quer somar os gastos de produção por partes?",
      }),
    ).toBeChecked();
    expect(screen.getByLabelText("Materiais")).toHaveValue("30");
    expect(screen.getByLabelText("Embalagem")).toHaveValue("5");
    expect(screen.getByLabelText("Seu tempo de produção")).toHaveValue("10");
    expect(screen.getByLabelText("Outros gastos por unidade")).toHaveValue("5");
  });

  it("shows the exact partial warning, absent volume and disabled compensation", async () => {
    const { container } = renderWizard();
    await completeValidDiagnosis({ volume: false, compensation: false });

    expect(screen.getByText("Não informado")).toBeInTheDocument();
    expect(screen.getByText("Não incluído")).toBeInTheDocument();
    expect(screen.queryByText("R$ 2.000,00")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sem essa quantidade, o resultado não consegue incluir os gastos mensais em cada unidade.",
    );
    expect(screen.getByText("Quanto você quer receber")).toBeInTheDocument();
    expect(
      screen.getAllByText("Gastos que existem todo mês").length,
    ).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent("Pró-labore");
    expect(container).not.toHaveTextContent("custos fixos");

    const markup = container.innerHTML;
    expect(markup).toContain("grid");
    expect(markup).toContain("sm:grid-cols-2");
    expect(markup).toContain("max-w-3xl");
    expect(markup).toContain("bg-background");
    expect(markup).toContain("text-foreground");
    expect(markup).toContain("text-muted-foreground");
    expect(markup).toContain("border-warning");
    expect(markup).toContain("motion-reduce:transition-none");
    expect(markup).toContain("motion-reduce:transform-none");
    expect(markup).not.toMatch(/w-\[(?:4\d\d|[5-9]\d\d|\d{4,})px\]/);
  });

  it("copies a composed total when disabling and submits stale components for server normalization", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "create_failed",
    });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis({ mode: "composed" });

    await user.click(
      screen.getByRole("button", { name: "Editar valores da produção" }),
    );
    await user.click(
      screen.getByRole("switch", {
        name: "Quer somar os gastos de produção por partes?",
      }),
    );

    expect(
      screen.getByLabelText("Quanto custa produzir uma unidade?"),
    ).toHaveValue("50,00");

    while (!screen.queryByText("8 de 8")) {
      await user.click(screen.getByRole("button", { name: "Continuar" }));
    }
    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    const submitted = createDiagnosis.mock.calls[0][0];
    expect(submitted).toEqual(
      expect.objectContaining({
        costCompositionEnabled: false,
        productionUnitCost: "50,00",
        materialUnitCost: "30",
        packagingUnitCost: "5",
        directLaborUnitCost: "10",
        otherVariableUnitCost: "5",
      }),
    );
    expect(productionDiagnosisSchema.parse(submitted)).toEqual(
      expect.objectContaining({
        productionUnitCostCents: 5000,
        materialUnitCostCents: null,
        packagingUnitCostCents: null,
        directLaborUnitCostCents: null,
        otherVariableUnitCostCents: null,
      }),
    );
  });

  it("routes invalid server fields to the earliest visible Production input", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        taxRate: ["Taxa inválida."],
        materialUnitCost: ["Composição inválida."],
      },
    });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis({ mode: "composed" });

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByLabelText("Materiais")).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Composição inválida.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("regenerates an invalid submission id and restarts at modality", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "invalid_input",
      fieldErrors: { submissionId: ["Identificador inválido."] },
    });
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
        name: "Que tipo de resultado você quer ver?",
      }),
    ).toHaveFocus();
    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    expect(createSubmissionId).toHaveBeenCalledTimes(2);
  });

  it("locks synchronous double submission and redirects to the report", async () => {
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
    const createSubmissionId = vi.fn(
      () => "550e8400-e29b-41d4-a716-446655440000",
    );
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
    expect(createDiagnosis).toHaveBeenCalledOnce();
    expect(createSubmissionId).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "create_failed",
      "Não foi possível salvar o diagnóstico. Tente novamente.",
    ],
    ["unauthorized", "Sua sessão expirou. Entre novamente para continuar."],
    ["limit_reached", "Seu diagnóstico gratuito já foi usado."],
  ] as const)("preserves answers and UUID after %s", async (error, message) => {
    const createDiagnosis = vi
      .fn()
      .mockResolvedValue({ status: "error", error });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByText("8 de 8")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    if (error === "unauthorized") {
      expect(
        screen.getByRole("link", { name: "Entrar novamente" }),
      ).toHaveAttribute("href", "/login");
    }
    if (error === "limit_reached") {
      expect(
        screen.getByRole("link", { name: "Conhecer os planos" }),
      ).toHaveAttribute("href", "/billing");
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

  it("sanitizes an unexpected action rejection and allows retry", async () => {
    const createDiagnosis = vi.fn().mockRejectedValue(new Error("private"));
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar o diagnóstico. Tente novamente.",
    );
    expect(screen.getByText("8 de 8")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );
    expect(createDiagnosis).toHaveBeenCalledTimes(2);
  });
});
