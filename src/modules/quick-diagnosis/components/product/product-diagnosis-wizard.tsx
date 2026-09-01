"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { useRouter } from "next/navigation";

import { validateProductDiagnosisFields } from "../../schemas/product-diagnosis.schema";
import type {
  CreateProductDiagnosisActionResult,
  ProductDiagnosisField,
  ProductDiagnosisFieldErrors,
  ProductDiagnosisInput,
} from "../../types";
import { WizardShell } from "../shared/wizard-shell";
import {
  productWizardSteps,
  type ProductWizardAction,
  type ProductWizardState,
  type ProductWizardStep,
} from "./product-wizard-state";
import { AnalysisModeStep } from "./steps/analysis-mode-step";
import { MonthlyVolumeStep } from "./steps/monthly-volume-step";
import { OwnerCompensationStep } from "./steps/owner-compensation-step";
import { ProductFeesStep } from "./steps/product-fees-step";
import { ProductFixedExpensesStep } from "./steps/product-fixed-expenses-step";
import { ProductReviewStep } from "./steps/product-review-step";
import { ProductValuesStep } from "./steps/product-values-step";
import { productStepFields } from "./steps/types";

type CreateProductDiagnosisAction = (
  input: ProductDiagnosisInput,
) => Promise<CreateProductDiagnosisActionResult>;

type ProductDiagnosisWizardProps = {
  state: ProductWizardState;
  dispatch: Dispatch<ProductWizardAction>;
  createDiagnosis: CreateProductDiagnosisAction;
  createSubmissionId: () => string;
  onBackToType: () => void;
};

const stepTitles: Record<ProductWizardStep, string> = {
  analysisMode: "Qual análise você quer fazer?",
  productValues: "Quais são o custo e o preço do produto?",
  fixedExpenses: "Quais são as despesas fixas mensais?",
  monthlyVolume: "Quantas unidades você vende por mês?",
  ownerCompensation: "Você quer incluir seu pró-labore?",
  fees: "Quais taxas incidem nas vendas?",
  review: "Revise as informações do produto",
};

const fieldStep: Record<ProductDiagnosisField, ProductWizardStep> = {
  submissionId: "analysisMode",
  purchaseUnitCost: "productValues",
  unitSalePrice: "productValues",
  fixedMonthlyExpenses: "fixedExpenses",
  monthlySalesVolume: "monthlyVolume",
  proLaboreIncluded: "ownerCompensation",
  proLabore: "ownerCompensation",
  taxRate: "fees",
  cardFeeRate: "fees",
};

const fieldOrder: ProductDiagnosisField[] = [
  "submissionId",
  "purchaseUnitCost",
  "unitSalePrice",
  "fixedMonthlyExpenses",
  "monthlySalesVolume",
  "proLaboreIncluded",
  "proLabore",
  "taxRate",
  "cardFeeRate",
];

function firstInvalidField(
  fieldErrors: ProductDiagnosisFieldErrors,
): ProductDiagnosisField | undefined {
  return fieldOrder
    .filter((field) => fieldErrors[field]?.length)
    .sort((left, right) => {
      const stepDifference =
        productWizardSteps.indexOf(fieldStep[left]) -
        productWizardSteps.indexOf(fieldStep[right]);

      return (
        stepDifference || fieldOrder.indexOf(left) - fieldOrder.indexOf(right)
      );
    })[0];
}

function ProductDiagnosisWizard({
  state,
  dispatch,
  createDiagnosis,
  createSubmissionId,
  onBackToType,
}: ProductDiagnosisWizardProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const invalidFieldToFocusRef = useRef<ProductDiagnosisField | null>(null);
  const stepIndex = productWizardSteps.indexOf(state.step);
  const globalStepNumber = stepIndex + 2;

  useEffect(() => {
    const field = invalidFieldToFocusRef.current;
    if (!field) return;

    const target =
      field === "proLaboreIncluded"
        ? document.getElementById("proLaboreIncluded")
        : document.getElementById(field);

    target?.focus({ preventScroll: true });
    invalidFieldToFocusRef.current = null;
  }, [state.fieldErrors, state.step]);

  const stepProps = {
    values: state.values,
    errors: state.fieldErrors,
    onChange: (field: ProductDiagnosisField, value: string) =>
      dispatch({ type: "setField", field, value }),
  };

  function renderStep() {
    switch (state.step) {
      case "analysisMode":
        return (
          <AnalysisModeStep
            value={state.analysisMode}
            error={state.analysisModeError}
            onChange={(value) => dispatch({ type: "setAnalysisMode", value })}
          />
        );
      case "productValues":
        return <ProductValuesStep {...stepProps} />;
      case "fixedExpenses":
        return <ProductFixedExpensesStep {...stepProps} />;
      case "monthlyVolume":
        return <MonthlyVolumeStep {...stepProps} />;
      case "ownerCompensation":
        return (
          <OwnerCompensationStep
            {...stepProps}
            onProLaboreIncludedChange={(value) =>
              dispatch({ type: "setProLaboreIncluded", value })
            }
          />
        );
      case "fees":
        return <ProductFeesStep {...stepProps} />;
      case "review":
        return (
          <ProductReviewStep
            values={state.values}
            errors={state.fieldErrors}
            pending={state.status === "submitting"}
            submitError={state.submitError}
            onEdit={(step) => dispatch({ type: "edit", step })}
            onBackToType={onBackToType}
            onSubmit={submitDiagnosis}
          />
        );
    }
  }

  function continueToNextStep() {
    if (state.step === "review") return;

    if (state.step === "analysisMode") {
      if (state.analysisMode !== "quick") {
        dispatch({
          type: "setAnalysisModeError",
          error: "Selecione o diagnóstico rápido para continuar.",
        });
        return;
      }

      dispatch({ type: "setAnalysisModeError", error: null });
      dispatch({ type: "next" });
      return;
    }

    const fieldErrors = validateProductDiagnosisFields(
      productStepFields[state.step],
      state.values,
    );
    dispatch({ type: "setFieldErrors", fieldErrors });

    if (Object.keys(fieldErrors).length === 0) {
      dispatch({ type: "next" });
    }
  }

  function goBack() {
    if (stepIndex === 0) {
      onBackToType();
      return;
    }

    dispatch({ type: "back" });
  }

  async function submitDiagnosis() {
    if (submittingRef.current || state.status === "submitting") return;

    submittingRef.current = true;
    dispatch({ type: "submitting" });
    let keepSubmissionLocked = false;

    try {
      const result = await createDiagnosis(state.values);

      if (result.status === "success") {
        router.replace(`/reports/${result.diagnosisId}`);
        keepSubmissionLocked = true;
        return;
      }

      if (result.error === "invalid_input") {
        if (result.fieldErrors.submissionId?.length) {
          invalidFieldToFocusRef.current = null;
          dispatch({ type: "reset", submissionId: createSubmissionId() });
          return;
        }

        const invalidField = firstInvalidField(result.fieldErrors);
        invalidFieldToFocusRef.current = invalidField ?? null;
        dispatch({
          type: "setFieldErrors",
          fieldErrors: result.fieldErrors,
        });
        dispatch({
          type: "edit",
          step: invalidField ? fieldStep[invalidField] : "analysisMode",
        });
        return;
      }

      dispatch({ type: "submitError", error: result.error });
    } catch {
      dispatch({ type: "submitError", error: "create_failed" });
    } finally {
      if (!keepSubmissionLocked) submittingRef.current = false;
    }
  }

  return (
    <WizardShell
      stepNumber={globalStepNumber}
      totalSteps={8}
      title={stepTitles[state.step]}
      onBack={goBack}
      onContinue={state.step === "review" ? undefined : continueToNextStep}
    >
      {renderStep()}
    </WizardShell>
  );
}

export {
  ProductDiagnosisWizard,
  type CreateProductDiagnosisAction,
  type ProductDiagnosisWizardProps,
};
