import { describe, expect, it } from "vitest";

import {
  createInitialProductWizardState,
  productWizardReducer,
  productWizardSteps,
  type ProductWizardState,
} from "./product-wizard-state";

const firstSubmissionId = "550e8400-e29b-41d4-a716-446655440000";
const nextSubmissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function withProductValues(): ProductWizardState {
  return {
    ...createInitialProductWizardState(firstSubmissionId),
    step: "ownerCompensation",
    analysisMode: "quick",
    values: {
      ...createInitialProductWizardState(firstSubmissionId).values,
      purchaseUnitCost: "50,00",
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

describe("product wizard state", () => {
  it("starts with exact raw Product fields and seven local steps", () => {
    expect(createInitialProductWizardState(firstSubmissionId)).toEqual({
      step: "analysisMode",
      analysisMode: "",
      analysisModeError: null,
      values: {
        submissionId: firstSubmissionId,
        purchaseUnitCost: "",
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
    expect(productWizardSteps).toEqual([
      "analysisMode",
      "productValues",
      "fixedExpenses",
      "monthlyVolume",
      "ownerCompensation",
      "fees",
      "review",
    ]);
  });

  it("selects quick analysis and clears its validation error", () => {
    const invalid = productWizardReducer(
      createInitialProductWizardState(firstSubmissionId),
      { type: "setAnalysisModeError", error: "Selecione uma análise." },
    );

    expect(
      productWizardReducer(invalid, {
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

  it("preserves exact raw strings and clears only the edited field error", () => {
    const state = {
      ...withProductValues(),
      fieldErrors: {
        purchaseUnitCost: ["Custo inválido."],
        unitSalePrice: ["Preço inválido."],
      },
    } satisfies ProductWizardState;
    const next = productWizardReducer(state, {
      type: "setField",
      field: "purchaseUnitCost",
      value: "R$ 050,90",
    });

    expect(next.values).toEqual({
      ...state.values,
      purchaseUnitCost: "R$ 050,90",
    });
    expect(next.fieldErrors).toEqual({
      unitSalePrice: ["Preço inválido."],
    });
  });

  it("enables compensation and clears stale value/error when disabling", () => {
    const initial = createInitialProductWizardState(firstSubmissionId);
    const enabled = productWizardReducer(initial, {
      type: "setProLaboreIncluded",
      value: true,
    });
    const withValue = productWizardReducer(
      {
        ...enabled,
        fieldErrors: { proLabore: ["Pró-labore inválido."] },
      },
      { type: "setField", field: "proLabore", value: "2.000,00" },
    );
    const disabled = productWizardReducer(withValue, {
      type: "setProLaboreIncluded",
      value: false,
    });

    expect(enabled.values.proLaboreIncluded).toBe(true);
    expect(disabled.values.proLaboreIncluded).toBe(false);
    expect(disabled.values.proLabore).toBe("");
    expect(disabled.fieldErrors.proLabore).toBeUndefined();
  });

  it("sets and replaces field errors", () => {
    const state = createInitialProductWizardState(firstSubmissionId);
    const fieldErrors = { unitSalePrice: ["Informe o preço."] };

    expect(
      productWizardReducer(state, { type: "setFieldErrors", fieldErrors })
        .fieldErrors,
    ).toEqual(fieldErrors);
  });

  it("navigates, clamps boundaries, and edits a named step", () => {
    const initial = createInitialProductWizardState(firstSubmissionId);
    const next = productWizardReducer(initial, { type: "next" });
    const back = productWizardReducer(next, { type: "back" });
    const review = {
      ...withProductValues(),
      step: "review",
    } satisfies ProductWizardState;

    expect(next.step).toBe("productValues");
    expect(back.step).toBe("analysisMode");
    expect(back.values).toEqual(initial.values);
    expect(productWizardReducer(initial, { type: "back" }).step).toBe(
      "analysisMode",
    );
    expect(productWizardReducer(review, { type: "next" }).step).toBe("review");
    expect(
      productWizardReducer(review, { type: "edit", step: "monthlyVolume" })
        .step,
    ).toBe("monthlyVolume");
  });

  it("tracks submitting and safe retry errors", () => {
    const state = withProductValues();
    const submitting = productWizardReducer(state, { type: "submitting" });
    const retry = productWizardReducer(submitting, {
      type: "submitError",
      error: "create_failed",
    });

    expect(submitting).toEqual(
      expect.objectContaining({ status: "submitting", submitError: null }),
    );
    expect(retry).toEqual({
      ...state,
      status: "editing",
      submitError: "create_failed",
    });
  });

  it("resets every Product answer with a fresh submission id", () => {
    const reset = productWizardReducer(
      {
        ...withProductValues(),
        analysisModeError: "Erro",
        fieldErrors: { proLabore: ["Erro"] },
        submitError: "unauthorized",
      },
      { type: "reset", submissionId: nextSubmissionId },
    );

    expect(reset).toEqual(createInitialProductWizardState(nextSubmissionId));
  });
});
