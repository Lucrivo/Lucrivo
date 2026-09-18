"use client";

import { useState, type Dispatch } from "react";

import {
  DetailedDiagnosisWizard,
  type CreateDetailedDiagnosisAction,
} from "@/modules/detailed-diagnosis/components/detailed-diagnosis-wizard";
import {
  createInitialDetailedWizardState,
  detailedWizardReducer,
  type DetailedWizardAction,
  type DetailedWizardState,
} from "@/modules/detailed-diagnosis/components/detailed-wizard-state";
import type { DetailedDiagnosisCategory } from "@/modules/detailed-diagnosis/types";

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
  ProductionDiagnosisWizard,
  type CreateProductionDiagnosisAction,
} from "./production/production-diagnosis-wizard";
import {
  createInitialProductionWizardState,
  productionWizardReducer,
  type ProductionWizardAction,
  type ProductionWizardState,
} from "./production/production-wizard-state";
import { ServiceDiagnosisWizard } from "./service/service-diagnosis-wizard";
import type { CreateServiceDiagnosisAction } from "../actions/create-service-diagnosis.action";
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
  | { type: "product"; state: ProductWizardState }
  | { type: "production"; state: ProductionWizardState }
  | { type: "detailed"; state: DetailedWizardState };

type QuickDiagnosisWizardProps = {
  createServiceDiagnosis: CreateServiceDiagnosisAction;
  createProductDiagnosis: CreateProductDiagnosisAction;
  createProductionDiagnosis: CreateProductionDiagnosisAction;
  createDetailedDiagnosis: CreateDetailedDiagnosisAction;
  createSubmissionId?: () => string;
};

function QuickDiagnosisWizard({
  createServiceDiagnosis,
  createProductDiagnosis,
  createProductionDiagnosis,
  createDetailedDiagnosis,
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

  const productionDispatch: Dispatch<ProductionWizardAction> = (action) => {
    setActiveBranch((branch) =>
      branch?.type === "production"
        ? {
            type: "production",
            state: productionWizardReducer(branch.state, action),
          }
        : branch,
    );
  };

  const detailedDispatch: Dispatch<DetailedWizardAction> = (action) => {
    setActiveBranch((branch) =>
      branch?.type === "detailed"
        ? {
            type: "detailed",
            state: detailedWizardReducer(branch.state, action),
          }
        : branch,
    );
  };

  function startDetailed(category: DetailedDiagnosisCategory) {
    setActiveBranch({
      type: "detailed",
      state: createInitialDetailedWizardState(category, createSubmissionId),
    });
  }

  function returnToMode(category: DetailedDiagnosisCategory) {
    if (category === "product") {
      const initialState =
        createInitialProductWizardState(createSubmissionId());
      setActiveBranch({
        type: "product",
        state: productWizardReducer(initialState, {
          type: "setAnalysisMode",
          value: "detailed",
        }),
      });
      return;
    }

    const initialState =
      createInitialProductionWizardState(createSubmissionId());
    setActiveBranch({
      type: "production",
      state: productionWizardReducer(initialState, {
        type: "setAnalysisMode",
        value: "detailed",
      }),
    });
  }

  function selectDiagnosisType(value: DiagnosisType) {
    setDiagnosisType(value);
    setDiagnosisTypeError(null);
  }

  function continueToBranch() {
    if (!diagnosisType) {
      setDiagnosisTypeError("Selecione o que você quer analisar.");
      return;
    }

    if (activeBranch?.type !== diagnosisType) {
      switch (diagnosisType) {
        case "service": {
          const submissionId = createSubmissionId();
          setActiveBranch({
            type: "service",
            state: createInitialServiceWizardState(submissionId),
          });
          break;
        }
        case "product": {
          const submissionId = createSubmissionId();
          setActiveBranch({
            type: "product",
            state: createInitialProductWizardState(submissionId),
          });
          break;
        }
        case "production": {
          const submissionId = createSubmissionId();
          setActiveBranch({
            type: "production",
            state: createInitialProductionWizardState(submissionId),
          });
          break;
        }
      }
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
        onStartDetailed={() => startDetailed("product")}
      />
    );
  }

  if (!showCategory && activeBranch?.type === "detailed") {
    return (
      <DetailedDiagnosisWizard
        state={activeBranch.state}
        dispatch={detailedDispatch}
        createDiagnosis={createDetailedDiagnosis}
        createId={createSubmissionId}
        onBackToMode={() => returnToMode(activeBranch.state.values.category)}
      />
    );
  }

  if (!showCategory && activeBranch?.type === "production") {
    return (
      <ProductionDiagnosisWizard
        state={activeBranch.state}
        dispatch={productionDispatch}
        createDiagnosis={createProductionDiagnosis}
        createSubmissionId={createSubmissionId}
        onBackToType={() => setShowCategory(true)}
        onStartDetailed={() => startDetailed("production")}
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
  type CreateProductionDiagnosisAction,
  type CreateServiceDiagnosisAction,
  type QuickDiagnosisWizardProps,
};
