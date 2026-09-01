import { describe, expect, it } from "vitest";

import {
  createInitialProductionWizardState,
  deriveProductionUnitCostDisplay,
  productionWizardReducer,
  productionWizardSteps,
  type ProductionWizardState,
} from "./production-wizard-state";

const firstSubmissionId = "550e8400-e29b-41d4-a716-446655440000";
const nextSubmissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function withProductionValues(): ProductionWizardState {
  return {
    ...createInitialProductionWizardState(firstSubmissionId),
    step: "ownerCompensation",
    analysisMode: "quick",
    values: {
      ...createInitialProductionWizardState(firstSubmissionId).values,
      productionUnitCost: "40,00",
      materialUnitCost: "30,00",
      packagingUnitCost: "5,00",
      directLaborUnitCost: "10,00",
      otherVariableUnitCost: "5,00",
      unitSalePrice: "100.00",
      fixedMonthlyExpenses: "0",
      monthlySalesVolume: "100",
      proLaboreIncluded: true,
      proLabore: "2.000,00",
      taxRate: "6,25",
      cardFeeRate: "3.50",
    },
  };
}

describe("production wizard state", () => {
  it("starts with exact raw Production fields and seven local steps", () => {
    expect(createInitialProductionWizardState(firstSubmissionId)).toEqual({
      step: "analysisMode",
      analysisMode: "",
      analysisModeError: null,
      values: {
        submissionId: firstSubmissionId,
        costCompositionEnabled: false,
        productionUnitCost: "",
        materialUnitCost: "",
        packagingUnitCost: "",
        directLaborUnitCost: "",
        otherVariableUnitCost: "",
        unitSalePrice: "",
        fixedMonthlyExpenses: "",
        monthlySalesVolume: "",
        proLaboreIncluded: false,
        proLabore: "",
        taxRate: "",
        cardFeeRate: "",
      },
      fieldErrors: {},
      status: "editing",
      submitError: null,
    });
    expect(productionWizardSteps).toEqual([
      "analysisMode",
      "productionValues",
      "fixedExpenses",
      "monthlyVolume",
      "ownerCompensation",
      "fees",
      "review",
    ]);
  });

  it("selects quick analysis and clears its modality error", () => {
    const invalid = productionWizardReducer(
      createInitialProductionWizardState(firstSubmissionId),
      { type: "setAnalysisModeError", error: "Selecione uma análise." },
    );

    expect(
      productionWizardReducer(invalid, {
        type: "setAnalysisMode",
        value: "quick",
      }),
    ).toEqual(
      expect.objectContaining({
        analysisMode: "quick",
        analysisModeError: null,
      }),
    );
  });

  it("derives an exact pt-BR total without changing domain values", () => {
    const state = withProductionValues();

    expect(deriveProductionUnitCostDisplay(state.values)).toBe("50,00");
    expect(state.values.productionUnitCost).toBe("40,00");
    expect(
      deriveProductionUnitCostDisplay({
        ...state.values,
        materialUnitCost: "1.000,01",
        packagingUnitCost: "0,02",
        directLaborUnitCost: "0,03",
        otherVariableUnitCost: "0,04",
      }),
    ).toBe("1.000,10");
    expect(
      deriveProductionUnitCostDisplay({
        ...state.values,
        materialUnitCost: "inválido",
      }),
    ).toBeNull();
  });

  it("copies a valid composed total when disabling and preserves components", () => {
    const summarized = withProductionValues();
    const enabled = productionWizardReducer(summarized, {
      type: "setCostCompositionEnabled",
      value: true,
    });
    const disabled = productionWizardReducer(enabled, {
      type: "setCostCompositionEnabled",
      value: false,
    });
    const restored = productionWizardReducer(disabled, {
      type: "setCostCompositionEnabled",
      value: true,
    });

    expect(enabled.values.productionUnitCost).toBe("40,00");
    expect(deriveProductionUnitCostDisplay(enabled.values)).toBe("50,00");
    expect(disabled.values).toEqual({
      ...enabled.values,
      costCompositionEnabled: false,
      productionUnitCost: "50,00",
    });
    expect(restored.values.materialUnitCost).toBe("30,00");
    expect(restored.values.packagingUnitCost).toBe("5,00");
    expect(restored.values.directLaborUnitCost).toBe("10,00");
    expect(restored.values.otherVariableUnitCost).toBe("5,00");
  });

  it("keeps the last summarized value when a component is invalid", () => {
    const state = {
      ...withProductionValues(),
      values: {
        ...withProductionValues().values,
        costCompositionEnabled: true,
        materialUnitCost: "não-numérico",
      },
    };

    expect(
      productionWizardReducer(state, {
        type: "setCostCompositionEnabled",
        value: false,
      }).values.productionUnitCost,
    ).toBe("40,00");
  });

  it("does not replace an empty summarized cost on a redundant mode action", () => {
    const initial = createInitialProductionWizardState(firstSubmissionId);

    expect(
      productionWizardReducer(initial, {
        type: "setCostCompositionEnabled",
        value: false,
      }).values.productionUnitCost,
    ).toBe("");
  });

  it("preserves raw strings and clears only the edited component error", () => {
    const state = {
      ...withProductionValues(),
      fieldErrors: {
        directLaborUnitCost: ["Mão de obra inválida."],
        packagingUnitCost: ["Embalagem inválida."],
      },
    } satisfies ProductionWizardState;
    const next = productionWizardReducer(state, {
      type: "setField",
      field: "directLaborUnitCost",
      value: "R$ 010,90",
    });

    expect(next.values.directLaborUnitCost).toBe("R$ 010,90");
    expect(next.fieldErrors).toEqual({
      packagingUnitCost: ["Embalagem inválida."],
    });
  });

  it("clears only the cost-mode error when toggling composition", () => {
    const state = {
      ...withProductionValues(),
      fieldErrors: {
        costCompositionEnabled: ["Escolha uma forma de custo."],
        unitSalePrice: ["Preço inválido."],
      },
    } satisfies ProductionWizardState;

    expect(
      productionWizardReducer(state, {
        type: "setCostCompositionEnabled",
        value: true,
      }).fieldErrors,
    ).toEqual({ unitSalePrice: ["Preço inválido."] });
  });

  it("clears compensation value and error when disabling", () => {
    const state = {
      ...withProductionValues(),
      fieldErrors: { proLabore: ["Pró-labore inválido."] },
    } satisfies ProductionWizardState;
    const disabled = productionWizardReducer(state, {
      type: "setProLaboreIncluded",
      value: false,
    });

    expect(disabled.values.proLaboreIncluded).toBe(false);
    expect(disabled.values.proLabore).toBe("");
    expect(disabled.fieldErrors.proLabore).toBeUndefined();
  });

  it("navigates, clamps boundaries, and edits a named step", () => {
    const initial = createInitialProductionWizardState(firstSubmissionId);
    const next = productionWizardReducer(initial, { type: "next" });
    const back = productionWizardReducer(next, { type: "back" });
    const review = {
      ...withProductionValues(),
      step: "review",
    } satisfies ProductionWizardState;

    expect(next.step).toBe("productionValues");
    expect(back.step).toBe("analysisMode");
    expect(back.values).toEqual(initial.values);
    expect(productionWizardReducer(initial, { type: "back" }).step).toBe(
      "analysisMode",
    );
    expect(productionWizardReducer(review, { type: "next" }).step).toBe(
      "review",
    );
    expect(
      productionWizardReducer(review, { type: "edit", step: "monthlyVolume" })
        .step,
    ).toBe("monthlyVolume");
  });

  it("tracks field errors, submitting, safe retry errors, and reset", () => {
    const state = withProductionValues();
    const withErrors = productionWizardReducer(state, {
      type: "setFieldErrors",
      fieldErrors: { unitSalePrice: ["Informe o preço."] },
    });
    const submitting = productionWizardReducer(withErrors, {
      type: "submitting",
    });
    const retry = productionWizardReducer(submitting, {
      type: "submitError",
      error: "create_failed",
    });
    const reset = productionWizardReducer(retry, {
      type: "reset",
      submissionId: nextSubmissionId,
    });

    expect(withErrors.fieldErrors).toEqual({
      unitSalePrice: ["Informe o preço."],
    });
    expect(submitting).toEqual(
      expect.objectContaining({ status: "submitting", submitError: null }),
    );
    expect(retry).toEqual(
      expect.objectContaining({
        status: "editing",
        submitError: "create_failed",
      }),
    );
    expect(reset).toEqual(createInitialProductionWizardState(nextSubmissionId));
  });
});
