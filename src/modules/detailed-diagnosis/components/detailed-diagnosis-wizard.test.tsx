import { useReducer } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import {
  DetailedDiagnosisWizard,
  type CreateDetailedDiagnosisAction,
} from "./detailed-diagnosis-wizard";
import {
  createInitialDetailedWizardState,
  detailedWizardReducer,
  type DetailedWizardState,
} from "./detailed-wizard-state";

const ids = [
  "550e8400-e29b-41d4-a716-446655440001",
  "550e8400-e29b-41d4-a716-446655440002",
  "550e8400-e29b-41d4-a716-446655440003",
] as const;

describe("DetailedDiagnosisWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard(options?: {
    state?: DetailedWizardState;
    createDiagnosis?: CreateDetailedDiagnosisAction;
  }) {
    let idIndex = 0;
    const createId = vi.fn(() => ids[idIndex++] ?? ids[2]);
    const initialState =
      options?.state ?? createInitialDetailedWizardState("product", createId);
    const createDiagnosis =
      options?.createDiagnosis ?? vi.fn<CreateDetailedDiagnosisAction>();
    const onBackToMode = vi.fn();

    function ControlledWizard() {
      const [state, dispatch] = useReducer(detailedWizardReducer, initialState);
      return (
        <DetailedDiagnosisWizard
          state={state}
          dispatch={dispatch}
          createDiagnosis={createDiagnosis}
          createId={createId}
          onBackToMode={onBackToMode}
        />
      );
    }

    render(<ControlledWizard />);
    return { createDiagnosis, createId, onBackToMode };
  }

  it("validates each phase and returns to the selected modality", async () => {
    const { onBackToMode } = renderWizard();
    const user = userEvent.setup();

    expect(screen.getByText("3 de 7")).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Gastos que existem todo mês"),
      "inválido",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um valor monetário válido",
    );

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBackToMode).toHaveBeenCalledOnce();
  });

  it("completes a partial Product diagnosis, locks submission, and redirects", async () => {
    let resolveAction: (
      value: Awaited<ReturnType<CreateDetailedDiagnosisAction>>,
    ) => void = () => undefined;
    const createDiagnosis = vi.fn<CreateDetailedDiagnosisAction>(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    renderWizard({ createDiagnosis });
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Gastos que existem todo mês"),
      "1000",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.type(
      screen.getByLabelText("Qual porcentagem da venda vai para impostos?"),
      "6",
    );
    await user.type(
      screen.getByLabelText(
        "Qual porcentagem fica com o cartão ou a plataforma?",
      ),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.type(screen.getByLabelText("Nome do produto"), "Camiseta");
    await user.type(screen.getByLabelText("Preço de venda por unidade"), "100");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Custo de compra por unidade"), "40");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(
      screen.getByRole("button", { name: "Revisar diagnóstico" }),
    );

    expect(screen.getByText(/resultado será parcial/i)).toBeVisible();
    const submit = screen.getByRole("button", {
      name: "Gerar diagnóstico detalhado",
    });
    await user.dblClick(submit);

    expect(createDiagnosis).toHaveBeenCalledOnce();
    expect(submit).toBeDisabled();
    expect(createDiagnosis.mock.calls[0][0]).toMatchObject({
      category: "product",
      fixedMonthlyExpenses: "1000",
      items: [
        {
          name: "Camiseta",
          unitSalePrice: "100",
          monthlySalesVolume: "",
          purchaseUnitCost: "40",
        },
      ],
    });

    resolveAction({ status: "success", diagnosisId: 42 });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/reports/42"));
  });

  it("routes a server field error to its phase and focuses the input", async () => {
    const initial = createInitialDetailedWizardState(
      "product",
      (() => {
        let index = 0;
        return () => ids[index++] ?? ids[2];
      })(),
    );
    const state: DetailedWizardState = {
      ...initial,
      phase: "review",
      itemSubstep: "complete",
      values: {
        ...initial.values,
        fixedMonthlyExpenses: "1000",
        taxRate: "6",
        cardFeeRate: "3",
        items: [
          {
            ...initial.values.items[0],
            kind: "resale",
            name: "Camiseta",
            unitSalePrice: "100",
            purchaseUnitCost: "40",
            packagingUnitCost: "0",
          },
        ],
      },
    };
    const createDiagnosis = vi
      .fn<CreateDetailedDiagnosisAction>()
      .mockResolvedValue({
        status: "error",
        error: "invalid_input",
        fieldErrors: {
          "items.0.purchaseUnitCost": ["Revise o custo de compra."],
        },
      });
    renderWizard({ state, createDiagnosis });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Gerar diagnóstico detalhado" }),
    );

    const field = await screen.findByLabelText("Custo de compra por unidade");
    expect(field).toHaveFocus();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Revise o custo de compra.",
    );
  });
});
