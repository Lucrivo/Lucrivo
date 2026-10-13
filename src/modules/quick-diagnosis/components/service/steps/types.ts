import type {
  ServiceFlowField,
  ServiceFlowFieldErrors,
  ServiceFlowInput,
  ServiceFlowPricingMethod,
  ServiceMaterialCostUnit,
} from "../../../domain/service-flow";

type ServiceStepProps = {
  values: ServiceFlowInput;
  errors: ServiceFlowFieldErrors;
  onChange: (field: ServiceFlowField, value: string) => void;
};

type ServicePricingStepProps = ServiceStepProps & {
  onPricingMethodChange: (value: ServiceFlowPricingMethod) => void;
};

type ServiceMaterialCostStepProps = ServiceStepProps & {
  onHasMaterialCostChange: (value: boolean) => void;
  onMaterialCostUnitChange: (value: ServiceMaterialCostUnit) => void;
};

type ServiceFeesStepProps = ServiceStepProps & {
  onPaysRevenueTaxChange: (value: boolean) => void;
  onHasPaymentFeeChange: (value: boolean) => void;
};

export type {
  ServiceFeesStepProps,
  ServiceMaterialCostStepProps,
  ServicePricingStepProps,
  ServiceStepProps,
};
