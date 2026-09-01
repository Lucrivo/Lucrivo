import { useReducer, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { ProductDiagnosisWizard } from "./product-diagnosis-wizard";
import {
  createInitialProductWizardState,
  productWizardReducer,
} from "./product-wizard-state";

describe("ProductDiagnosisWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(
    createDiagnosis = vi.fn(),
    createSubmissionId = vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  ) {
    const onBackToType = vi.fn();

    function ControlledProductWizard() {
      const [submissionId] = useState(createSubmissionId);
      const [state, dispatch] = useReducer(
        productWizardReducer,
        submissionId,
        createInitialProductWizardState,
      );

      return (
        <ProductDiagnosisWizard
          state={state}
          dispatch={dispatch}
          createDiagnosis={createDiagnosis}
          createSubmissionId={createSubmissionId}
          onBackToType={onBackToType}
        />
      );
    }

    const rendered = render(<ControlledProductWizard />);
    return {
      ...rendered,
      createDiagnosis,
      createSubmissionId,
      onBackToType,
    };
  }

  async function completeValidDiagnosis(options?: {
    volume?: boolean;
    compensation?: boolean;
  }) {
    const user = userEvent.setup();
    const volume = options?.volume ?? true;
    const compensation = options?.compensation ?? true;

    await user.click(screen.getByRole("radio", { name: "Diagnóstico rápido" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("3 de 8")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Custo de compra por unidade"), "50");
    await user.type(screen.getByLabelText("Preço de venda por unidade"), "100");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("4 de 8")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Despesas fixas mensais"), "1000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("5 de 8")).toBeInTheDocument();
    if (volume) {
      await user.type(
        screen.getByLabelText("Volume médio mensal de vendas"),
        "100",
      );
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("6 de 8")).toBeInTheDocument();
    if (compensation) {
      await user.click(
        screen.getByRole("switch", { name: "Incluir pró-labore" }),
      );
      await user.type(screen.getByLabelText("Pró-labore mensal"), "2000");
    }
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("7 de 8")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Impostos"), "6,25");
    await user.type(screen.getByLabelText("Taxa do cartão"), "3,50");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("8 de 8")).toBeInTheDocument();

    return user;
  }

  it("requires quick mode and returns to the diagnosis type from the first step", async () => {
    const { onBackToType } = renderWizard();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecione o diagnóstico rápido para continuar.",
    );
    expect(screen.getByText("2 de 8")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBackToType).toHaveBeenCalledOnce();
  });

  it("completes all global Product steps and edits every source", async () => {
    const { createDiagnosis, createSubmissionId, onBackToType } =
      renderWizard();

    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Qual análise você quer fazer?" }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);

    const user = await completeValidDiagnosis();

    expect(screen.getByText("8 de 8")).toBeInTheDocument();
    expect(screen.getByText("Diagnóstico rápido")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
    expect(screen.getByText("100 unidades por mês")).toBeInTheDocument();
    expect(screen.getByText("R$ 2.000,00")).toBeInTheDocument();
    expect(screen.getByText("6,25%")).toBeInTheDocument();
    expect(createDiagnosis).not.toHaveBeenCalled();

    const edits = [
      ["Editar modalidade", "Qual análise você quer fazer?"],
      ["Editar valores do produto", "Quais são o custo e o preço do produto?"],
      ["Editar despesas fixas", "Quais são as despesas fixas mensais?"],
      ["Editar volume mensal", "Quantas unidades você vende por mês?"],
      ["Editar pró-labore", "Você quer incluir seu pró-labore?"],
      ["Editar taxas", "Quais taxas incidem nas vendas?"],
    ] as const;

    for (const [buttonName, heading] of edits) {
      await user.click(screen.getByRole("button", { name: buttonName }));
      expect(screen.getByRole("heading", { name: heading })).toHaveFocus();

      if (buttonName === "Editar valores do produto") {
        expect(
          screen.getByLabelText("Custo de compra por unidade"),
        ).toHaveValue("50");
        expect(screen.getByLabelText("Preço de venda por unidade")).toHaveValue(
          "100",
        );
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

  it("renders the partial review warning and responsive semantic contract", async () => {
    const { container } = renderWizard();
    await completeValidDiagnosis({ volume: false, compensation: false });

    expect(screen.getAllByText("Não informado").length).toBeGreaterThan(0);
    expect(screen.getByText("Não incluído")).toBeInTheDocument();
    expect(screen.queryByText("R$ 2.000,00")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sem o volume mensal, os custos fixos não podem ser rateados por unidade. O relatório será parcial e não classificará sua margem como adequada.",
    );

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

  it("routes invalid server fields to the earliest Product input", async () => {
    const createDiagnosis = vi.fn().mockResolvedValue({
      status: "error",
      error: "invalid_input",
      fieldErrors: {
        taxRate: ["Taxa inválida."],
        purchaseUnitCost: ["Custo inválido."],
      },
    });
    renderWizard(createDiagnosis);
    const user = await completeValidDiagnosis();

    await user.click(
      screen.getByRole("button", { name: "Confirmar diagnóstico" }),
    );

    expect(
      await screen.findByLabelText("Custo de compra por unidade"),
    ).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent("Custo inválido.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("regenerates an invalid submission id and restarts at analysis mode", async () => {
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
        name: "Qual análise você quer fazer?",
      }),
    ).toHaveFocus();
    expect(screen.getByText("2 de 8")).toBeInTheDocument();
    expect(createSubmissionId).toHaveBeenCalledTimes(2);
  });

  it("locks double submission and redirects to the prepared report", async () => {
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
  ] as const)("preserves review and UUID after %s", async (error, message) => {
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

  it("sanitizes an unexpected action rejection", async () => {
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
  });
});
