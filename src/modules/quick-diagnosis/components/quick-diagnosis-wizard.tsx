"use client";

import type {
  CreateServiceDiagnosisActionResult,
  ServiceDiagnosisInput,
} from "../types";

type CreateServiceDiagnosisAction = (
  input: ServiceDiagnosisInput,
) => Promise<CreateServiceDiagnosisActionResult>;

type QuickDiagnosisWizardProps = {
  createDiagnosis: CreateServiceDiagnosisAction;
};

function QuickDiagnosisWizard({ createDiagnosis }: QuickDiagnosisWizardProps) {
  void createDiagnosis;

  return <div aria-hidden="true" />;
}

export {
  QuickDiagnosisWizard,
  type CreateServiceDiagnosisAction,
  type QuickDiagnosisWizardProps,
};
