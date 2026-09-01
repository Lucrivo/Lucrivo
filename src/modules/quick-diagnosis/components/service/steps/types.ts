import type {
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
} from "../../../types";

type ServiceStepProps = {
  values: ServiceDiagnosisInput;
  errors: ServiceDiagnosisFieldErrors;
  onChange: (field: ServiceDiagnosisField, value: string) => void;
};

export type { ServiceStepProps };
