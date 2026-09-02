const pricingMethods = ["hour", "minute", "appointment"] as const;
const serviceWorkPeriods = ["day", "week", "month"] as const;

type ServicePricingMethod = (typeof pricingMethods)[number];
type ServiceWorkPeriod = (typeof serviceWorkPeriods)[number];

type ServiceDiagnosisInput = {
  submissionId: string;
  pricingMethod: string;
  desiredMonthlyIncome: string;
  fixedMonthlyExpenses: string;
  workHoursPeriod: string;
  workHours: string;
  weeklyWorkDays: string;
  hourlyRate: string;
  minuteRate: string;
  appointmentRate: string;
  appointmentDurationMinutes: string;
  hasMaterialCost: boolean;
  materialUnitCost: string;
  taxRate: string;
  cardFeeRate: string;
};

type ServiceDiagnosisCommand = {
  submissionId: string;
  pricingMethod: ServicePricingMethod;
  desiredMonthlyIncomeCents: number;
  fixedMonthlyExpensesCents: number;
  workHoursPeriod: ServiceWorkPeriod;
  workPeriodMinutes: number;
  monthlyWorkMinutes: number;
  weeklyWorkDays: number;
  hourlyRateCents: number;
  minuteRateCents: number;
  appointmentRateCents: number;
  appointmentDurationMinutes: number;
  materialUnitCostCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};

type ServiceDiagnosisField = keyof ServiceDiagnosisInput;
type ServiceDiagnosisFieldErrors = Partial<
  Record<ServiceDiagnosisField, string[]>
>;

type CreateServiceDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: ServiceDiagnosisFieldErrors;
    }
  | { status: "error"; error: "unauthorized" | "create_failed" };

type ProductDiagnosisInput = {
  submissionId: string;
  purchaseUnitCost: string;
  unitSalePrice: string;
  fixedMonthlyExpenses: string;
  monthlySalesVolume: string;
  proLaboreIncluded: boolean;
  proLabore: string;
  taxRate: string;
  cardFeeRate: string;
};

type ProductDiagnosisCommand = {
  submissionId: string;
  purchaseUnitCostCents: number;
  unitSalePriceCents: number;
  fixedMonthlyExpensesCents: number;
  monthlySalesVolume: number | null;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};

type ProductDiagnosisField = keyof ProductDiagnosisInput;
type ProductDiagnosisFieldErrors = Partial<
  Record<ProductDiagnosisField, string[]>
>;

type CreateProductDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: ProductDiagnosisFieldErrors;
    }
  | { status: "error"; error: "unauthorized" | "create_failed" };

type ProductionDiagnosisInput = {
  submissionId: string;
  costCompositionEnabled: boolean;
  productionUnitCost: string;
  materialUnitCost: string;
  packagingUnitCost: string;
  directLaborUnitCost: string;
  otherVariableUnitCost: string;
  unitSalePrice: string;
  fixedMonthlyExpenses: string;
  monthlySalesVolume: string;
  proLaboreIncluded: boolean;
  proLabore: string;
  taxRate: string;
  cardFeeRate: string;
};

type ProductionDiagnosisValidatedInput = {
  submissionId: string;
  costCompositionEnabled: boolean;
  productionUnitCostCents: number | null;
  materialUnitCostCents: number | null;
  packagingUnitCostCents: number | null;
  directLaborUnitCostCents: number | null;
  otherVariableUnitCostCents: number | null;
  unitSalePriceCents: number;
  fixedMonthlyExpensesCents: number;
  monthlySalesVolume: number | null;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};

type ProductionDiagnosisCommand = Omit<
  ProductionDiagnosisValidatedInput,
  "productionUnitCostCents"
> & {
  productionUnitCostCents: number;
};

type ProductionDiagnosisField = keyof ProductionDiagnosisInput;
type ProductionDiagnosisFieldErrors = Partial<
  Record<ProductionDiagnosisField, string[]>
>;

type CreateProductionDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: ProductionDiagnosisFieldErrors;
    }
  | { status: "error"; error: "unauthorized" | "create_failed" };

export {
  pricingMethods,
  serviceWorkPeriods,
  type CreateProductDiagnosisActionResult,
  type CreateProductionDiagnosisActionResult,
  type CreateServiceDiagnosisActionResult,
  type ProductDiagnosisCommand,
  type ProductDiagnosisField,
  type ProductDiagnosisFieldErrors,
  type ProductDiagnosisInput,
  type ProductionDiagnosisCommand,
  type ProductionDiagnosisField,
  type ProductionDiagnosisFieldErrors,
  type ProductionDiagnosisInput,
  type ProductionDiagnosisValidatedInput,
  type ServiceDiagnosisCommand,
  type ServiceDiagnosisField,
  type ServiceDiagnosisFieldErrors,
  type ServiceDiagnosisInput,
  type ServicePricingMethod,
  type ServiceWorkPeriod,
};
