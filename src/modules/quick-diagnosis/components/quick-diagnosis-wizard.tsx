"use client";

import { useState, type Dispatch } from "react";

import {
  ProductDiagnosisWizard,
  type CreateProductDiagnosisAction,
} from "./product/product-diagnosis-wizard";
import {
  createInitialProductWizardState,
  productWizardReducer,
  type ProductWizardAction,
  type ProductWizardState,
} from "./product/product-wizard-state";
import {
  ServiceDiagnosisWizard,
  type CreateServiceDiagnosisAction,
} from "./service/service-diagnosis-wizard";
import {
  createInitialServiceWizardState,
  serviceWizardReducer,
  type ServiceWizardAction,
  type ServiceWizardState,
} from "./service/service-wizard-state";
import { WizardShell } from "./shared/wizard-shell";
import {
  DiagnosisTypeStep,
  type DiagnosisType,
} from "./steps/diagnosis-type-step";

type ActiveDiagnosisBranch =
  | { type: "service"; state: ServiceWizardState }
  | { type: "product"; state: ProductWizardState };

type QuickDiagnosisWizardProps = {
  createServiceDiagnosis: CreateServiceDiagnosisAction;
  createProductDiagnosis: CreateProductDiagnosisAction;
  createSubmissionId?: () => string;
};

function QuickDiagnosisWizard({
  createServiceDiagnosis,
  createProductDiagnosis,
  createSubmissionId = () => crypto.randomUUID(),
}: QuickDiagnosisWizardProps) {
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType | "">("");
  const [diagnosisTypeError, setDiagnosisTypeError] = useState<string | null>(
    null,
  );
  const [activeBranch, setActiveBranch] =
    useState<ActiveDiagnosisBranch | null>(null);
  const [showCategory, setShowCategory] = useState(true);

  const serviceDispatch: Dispatch<ServiceWizardAction> = (action) => {
    setActiveBranch((branch) =>
      branch?.type === "service"
        ? {
            type: "service",
            state: serviceWizardReducer(branch.state, action),
          }
        : branch,
    );
  };

  const productDispatch: Dispatch<ProductWizardAction> = (action) => {
    setActiveBranch((branch) =>
      branch?.type === "product"
        ? {
            type: "product",
            state: productWizardReducer(branch.state, action),
          }
        : branch,
    );
  };

  function selectDiagnosisType(value: DiagnosisType) {
    setDiagnosisType(value);
    setDiagnosisTypeError(null);
  }

  function continueToBranch() {
    if (diagnosisType !== "service" && diagnosisType !== "product") {
      setDiagnosisTypeError("Selecione o que você quer analisar.");
      return;
    }

    if (activeBranch?.type !== diagnosisType) {
      const submissionId = createSubmissionId();
      setActiveBranch(
        diagnosisType === "service"
          ? {
              type: "service",
              state: createInitialServiceWizardState(submissionId),
            }
          : {
              type: "product",
              state: createInitialProductWizardState(submissionId),
            },
      );
    }

    setShowCategory(false);
  }

  if (!showCategory && activeBranch?.type === "service") {
    return (
      <ServiceDiagnosisWizard
        state={activeBranch.state}
        dispatch={serviceDispatch}
        createDiagnosis={createServiceDiagnosis}
        createSubmissionId={createSubmissionId}
        onBackToType={() => setShowCategory(true)}
      />
    );
  }

  if (!showCategory && activeBranch?.type === "product") {
    return (
      <ProductDiagnosisWizard
        state={activeBranch.state}
        dispatch={productDispatch}
        createDiagnosis={createProductDiagnosis}
        createSubmissionId={createSubmissionId}
        onBackToType={() => setShowCategory(true)}
      />
    );
  }

  return (
    <WizardShell
      stepNumber={1}
      totalSteps={8}
      title="O que você quer analisar?"
      backDisabled
      onBack={() => undefined}
      onContinue={continueToBranch}
    >
      <DiagnosisTypeStep
        value={diagnosisType}
        error={diagnosisTypeError}
        onChange={selectDiagnosisType}
      />
    </WizardShell>
  );
}

export {
  QuickDiagnosisWizard,
  type ActiveDiagnosisBranch,
  type CreateProductDiagnosisAction,
  type CreateServiceDiagnosisAction,
  type QuickDiagnosisWizardProps,
};
