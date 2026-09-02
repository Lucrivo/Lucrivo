import type {
  ServiceDiagnosisField,
  ServiceDiagnosisFieldErrors,
  ServiceDiagnosisInput,
  ServiceWorkPeriod,
} from "../../../types";

type ServiceStepProps = {
  values: ServiceDiagnosisInput;
  errors: ServiceDiagnosisFieldErrors;
  onChange: (field: ServiceDiagnosisField, value: string) => void;
};

type ServiceWorkRoutineStepProps = ServiceStepProps & {
  onWorkHoursPeriodChange: (value: ServiceWorkPeriod) => void;
};

type ServiceMaterialCostStepProps = ServiceStepProps & {
  onHasMaterialCostChange: (value: boolean) => void;
};

export type {
  ServiceMaterialCostStepProps,
  ServiceStepProps,
  ServiceWorkRoutineStepProps,
};
