"use client";

import { useEffect, useRef, type Dispatch } from "react";
import { useRouter } from "next/navigation";

import { WizardShell } from "@/modules/quick-diagnosis/components/shared/wizard-shell";

import { validateDetailedDiagnosisPaths } from "../schemas/detailed-diagnosis.schema";
import type {
  CreateDetailedDiagnosisActionResult,
  DetailedDiagnosisInput,
} from "../types";
import {
  type DetailedWizardAction,
  type DetailedWizardPhase,
  type DetailedWizardState,
} from "./detailed-wizard-state";
import { DetailedFeesStep } from "./steps/detailed-fees-step";
import { DetailedFixedExpensesStep } from "./steps/detailed-fixed-expenses-step";
import { DetailedItemCompleteStep } from "./steps/detailed-item-complete-step";
import { DetailedItemNameStep } from "./steps/detailed-item-name-step";
import { DetailedItemVolumeStep } from "./steps/detailed-item-volume-step";
import { DetailedOwnerCompensationStep } from "./steps/detailed-owner-compensation-step";
import { DetailedProductCostsStep } from "./steps/detailed-product-costs-step";
import { DetailedProductionCostsStep } from "./steps/detailed-production-costs-step";
import { DetailedReviewStep } from "./steps/detailed-review-step";

type CreateDetailedDiagnosisAction = (
  input: DetailedDiagnosisInput,
) => Promise<CreateDetailedDiagnosisActionResult>;

type DetailedDiagnosisWizardProps = {
  state: DetailedWizardState;
  dispatch: Dispatch<DetailedWizardAction>;
  createDiagnosis: CreateDetailedDiagnosisAction;
  createId: () => string;
  onBackToMode: () => void;
};

const phaseProgress: Record<DetailedWizardPhase, number> = {
  itemName: 3,
  itemValues: 4,
  fixedExpenses: 5,
  itemVolume: 6,
  ownerCompensation: 7,
  fees: 8,
  itemComplete: 9,
  review: 10,
};

function activeItemIndex(state: DetailedWizardState): number {
  return state.values.items.findIndex((item) => item.id === state.activeItemId);
}

function itemLabel(state: DetailedWizardState): string {
  return state.values.category === "product" ? "Produto" : "Produção";
}

function stepTitle(state: DetailedWizardState): string {
  const itemNumber = Math.max(activeItemIndex(state), 0) + 1;
  switch (state.phase) {
    case "itemName":
      return `${itemLabel(state)} ${itemNumber} · nome`;
    case "itemValues":
      return `${itemLabel(state)} ${itemNumber} · custos e preço`;
    case "fixedExpenses":
      return "Quais gastos você tem todo mês?";
    case "itemVolume":
      return `${itemLabel(state)} ${itemNumber} · vendas no mês`;
    case "ownerCompensation":
      return "Quanto você quer receber por mês?";
    case "fees":
      return "Quais taxas se aplicam a todos os itens?";
    case "itemComplete":
      return "Revise os itens do diagnóstico";
    case "review":
      return "Confira o diagnóstico detalhado";
  }
}

function pathsForCurrentPhase(state: DetailedWizardState): string[] {
  const index = activeItemIndex(state);
  switch (state.phase) {
    case "itemName":
      return [`items.${index}.name`];
    case "itemValues": {
      const item = state.values.items[index];
      if (item?.kind === "resale") {
        return [
          `items.${index}.purchaseUnitCost`,
          `items.${index}.packagingUnitCost`,
          `items.${index}.unitSalePrice`,
        ];
      }
      return [
        `items.${index}.costMode`,
        `items.${index}.productionUnitCost`,
        `items.${index}.recipeYield`,
        `items.${index}.lossRate`,
        `items.${index}.packagingUnitCost`,
        `items.${index}.directLaborUnitCost`,
        `items.${index}.otherVariableUnitCost`,
        `items.${index}.ingredients`,
        `items.${index}.unitSalePrice`,
      ];
    }
    case "fixedExpenses":
      return ["fixedMonthlyExpenses"];
    case "itemVolume":
      return [`items.${index}.monthlySalesVolume`];
    case "ownerCompensation":
      return ["proLaboreIncluded", "proLabore"];
    case "fees":
      return ["taxRate", "cardFeeRate"];
    case "itemComplete":
    case "review":
      return [];
  }
}

function DetailedDiagnosisWizard({
  state,
  dispatch,
  createDiagnosis,
  createId,
  onBackToMode,
}: DetailedDiagnosisWizardProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const invalidPathToFocusRef = useRef<string | null>(null);

  useEffect(() => {
    const path = invalidPathToFocusRef.current;
    if (!path) return;

    document.getElementById(path)?.focus({ preventScroll: true });
    invalidPathToFocusRef.current = null;
  }, [state.fieldErrors, state.phase]);

  const stepProps = { state, dispatch };

  function renderStep() {
    switch (state.phase) {
      case "itemName":
        return <DetailedItemNameStep {...stepProps} />;
      case "itemValues":
        return state.values.category === "product" ? (
          <DetailedProductCostsStep {...stepProps} />
        ) : (
          <DetailedProductionCostsStep {...stepProps} />
        );
      case "fixedExpenses":
        return <DetailedFixedExpensesStep {...stepProps} />;
      case "itemVolume":
        return <DetailedItemVolumeStep {...stepProps} />;
      case "ownerCompensation":
        return <DetailedOwnerCompensationStep {...stepProps} />;
      case "fees":
        return <DetailedFeesStep {...stepProps} />;
      case "itemComplete":
        return <DetailedItemCompleteStep {...stepProps} />;
      case "review":
        return <DetailedReviewStep {...stepProps} onSubmit={submitDiagnosis} />;
    }
  }

  function continueToNextStep() {
    const paths = pathsForCurrentPhase(state);
    const fieldErrors = validateDetailedDiagnosisPaths(paths, state.values);
    dispatch({ type: "applyServerErrors", fieldErrors });
    if (Object.keys(fieldErrors).length === 0) dispatch({ type: "next" });
  }

  function goBack() {
    if (state.phase === "itemName" && state.itemJourney === "first") {
      onBackToMode();
      return;
    }
    dispatch({ type: "back" });
  }

  async function submitDiagnosis() {
    if (submittingRef.current || state.status === "submitting") return;

    submittingRef.current = true;
    dispatch({ type: "submit" });
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
          dispatch({ type: "reset", createId });
          return;
        }

        invalidPathToFocusRef.current =
          Object.keys(result.fieldErrors)[0] ?? null;
        dispatch({
          type: "applyServerErrors",
          fieldErrors: result.fieldErrors,
        });
        return;
      }

      dispatch({ type: "submitFailed", error: result.error });
    } catch {
      dispatch({ type: "submitFailed", error: "create_failed" });
    } finally {
      if (!keepSubmissionLocked) submittingRef.current = false;
    }
  }

  const onContinue =
    state.phase === "itemComplete" || state.phase === "review"
      ? undefined
      : continueToNextStep;

  return (
    <WizardShell
      stepNumber={phaseProgress[state.phase]}
      totalSteps={10}
      title={stepTitle(state)}
      onBack={goBack}
      onContinue={onContinue}
    >
      {renderStep()}
    </WizardShell>
  );
}

export {
  DetailedDiagnosisWizard,
  type CreateDetailedDiagnosisAction,
  type DetailedDiagnosisWizardProps,
};
