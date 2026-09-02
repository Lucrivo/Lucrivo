"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { useRouter } from "next/navigation";

import { validateProductionDiagnosisFields } from "../../schemas/production-diagnosis.schema";
import type {
  CreateProductionDiagnosisActionResult,
  ProductionDiagnosisField,
  ProductionDiagnosisFieldErrors,
  ProductionDiagnosisInput,
} from "../../types";
import { WizardShell } from "../shared/wizard-shell";
import {
  productionWizardSteps,
  type ProductionWizardAction,
  type ProductionWizardState,
  type ProductionWizardStep,
} from "./production-wizard-state";
import { AnalysisModeStep } from "./steps/analysis-mode-step";
import { MonthlyVolumeStep } from "./steps/monthly-volume-step";
import { OwnerCompensationStep } from "./steps/owner-compensation-step";
import { ProductionFeesStep } from "./steps/production-fees-step";
import { ProductionFixedExpensesStep } from "./steps/production-fixed-expenses-step";
import { ProductionReviewStep } from "./steps/production-review-step";
import { ProductionValuesStep } from "./steps/production-values-step";
import { productionStepFields } from "./steps/types";

type CreateProductionDiagnosisAction = (
  input: ProductionDiagnosisInput,
) => Promise<CreateProductionDiagnosisActionResult>;

type ProductionDiagnosisWizardProps = {
  state: ProductionWizardState;
  dispatch: Dispatch<ProductionWizardAction>;
  createDiagnosis: CreateProductionDiagnosisAction;
  createSubmissionId: () => string;
  onBackToType: () => void;
};

const stepTitles: Record<ProductionWizardStep, string> = {
  analysisMode: "Qual análise você quer fazer?",
  productionValues: "Quanto custa fabricar e por quanto você vende?",
  fixedExpenses: "Quais são as despesas fixas mensais?",
  monthlyVolume: "Quantas unidades você vende por mês?",
  ownerCompensation: "Você quer incluir seu pró-labore?",
  fees: "Quais taxas incidem nas vendas?",
  review: "Revise as informações da produção",
};

const fieldStep: Record<ProductionDiagnosisField, ProductionWizardStep> = {
  submissionId: "analysisMode",
  costCompositionEnabled: "productionValues",
  productionUnitCost: "productionValues",
  materialUnitCost: "productionValues",
  packagingUnitCost: "productionValues",
  directLaborUnitCost: "productionValues",
  otherVariableUnitCost: "productionValues",
  unitSalePrice: "productionValues",
  fixedMonthlyExpenses: "fixedExpenses",
  monthlySalesVolume: "monthlyVolume",
  proLaboreIncluded: "ownerCompensation",
  proLabore: "ownerCompensation",
  taxRate: "fees",
  cardFeeRate: "fees",
};

const productionFieldOrder: ProductionDiagnosisField[] = [
  "submissionId",
  "costCompositionEnabled",
  "productionUnitCost",
  "materialUnitCost",
  "packagingUnitCost",
  "directLaborUnitCost",
  "otherVariableUnitCost",
  "unitSalePrice",
  "fixedMonthlyExpenses",
  "monthlySalesVolume",
  "proLaboreIncluded",
  "proLabore",
  "taxRate",
  "cardFeeRate",
];

function firstInvalidField(
  fieldErrors: ProductionDiagnosisFieldErrors,
): ProductionDiagnosisField | undefined {
  return productionFieldOrder
    .filter((field) => fieldErrors[field]?.length)
    .sort((left, right) => {
      const stepDifference =
        productionWizardSteps.indexOf(fieldStep[left]) -
        productionWizardSteps.indexOf(fieldStep[right]);

      return (
        stepDifference ||
        productionFieldOrder.indexOf(left) - productionFieldOrder.indexOf(right)
      );
    })[0];
}

function ProductionDiagnosisWizard({
  state,
  dispatch,
  createDiagnosis,
  createSubmissionId,
  onBackToType,
}: ProductionDiagnosisWizardProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const invalidFieldToFocusRef = useRef<ProductionDiagnosisField | null>(null);
  const stepIndex = productionWizardSteps.indexOf(state.step);
  const globalStepNumber = stepIndex + 2;

  useEffect(() => {
    const field = invalidFieldToFocusRef.current;
    if (!field) return;

    const target = document.getElementById(field);
    target?.focus({ preventScroll: true });
    invalidFieldToFocusRef.current = null;
  }, [state.fieldErrors, state.step]);

  const stepProps = {
    values: state.values,
    errors: state.fieldErrors,
    onChange: (field: ProductionDiagnosisField, value: string) =>
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
      case "productionValues":
        return (
          <ProductionValuesStep
            {...stepProps}
            onCostCompositionEnabledChange={(value) =>
              dispatch({ type: "setCostCompositionEnabled", value })
            }
          />
        );
      case "fixedExpenses":
        return <ProductionFixedExpensesStep {...stepProps} />;
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
        return <ProductionFeesStep {...stepProps} />;
      case "review":
        return (
          <ProductionReviewStep
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

    const fieldErrors = validateProductionDiagnosisFields(
      productionStepFields[state.step],
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
  ProductionDiagnosisWizard,
  type CreateProductionDiagnosisAction,
  type ProductionDiagnosisWizardProps,
};
