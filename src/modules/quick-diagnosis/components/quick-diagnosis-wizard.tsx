"use client";

import { useReducer, useState } from "react";

import { DiagnosisTypeStep, type DiagnosisType } from "./steps/diagnosis-type-step";
import { WizardShell } from "./shared/wizard-shell";
import {
  ServiceDiagnosisWizard,
  type CreateServiceDiagnosisAction,
} from "./service/service-diagnosis-wizard";
import {
  createInitialServiceWizardState,
  serviceWizardReducer,
} from "./service/service-wizard-state";

type QuickDiagnosisWizardProps = {
  createDiagnosis: CreateServiceDiagnosisAction;
  createSubmissionId?: () => string;
};

function QuickDiagnosisWizard({
  createDiagnosis,
  createSubmissionId = () => crypto.randomUUID(),
}: QuickDiagnosisWizardProps) {
  const [initialSubmissionId] = useState(createSubmissionId);
  const [serviceState, serviceDispatch] = useReducer(
    serviceWizardReducer,
    initialSubmissionId,
    createInitialServiceWizardState,
  );
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType | "">("");
  const [diagnosisTypeError, setDiagnosisTypeError] = useState<string | null>(
    null,
  );
  const [activeBranch, setActiveBranch] = useState<"category" | "service">(
    "category",
  );

  function selectDiagnosisType(value: DiagnosisType) {
    setDiagnosisType(value);
    setDiagnosisTypeError(null);
  }

  function continueToBranch() {
    if (diagnosisType !== "service") {
      setDiagnosisTypeError("Selecione o que você quer analisar.");
      return;
    }

    setActiveBranch("service");
  }

  if (activeBranch === "service") {
    return (
      <ServiceDiagnosisWizard
        state={serviceState}
        dispatch={serviceDispatch}
        createDiagnosis={createDiagnosis}
        createSubmissionId={createSubmissionId}
        onBackToType={() => setActiveBranch("category")}
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
  type CreateServiceDiagnosisAction,
  type QuickDiagnosisWizardProps,
};
