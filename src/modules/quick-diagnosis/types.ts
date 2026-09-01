const pricingMethods = ["hour", "minute", "appointment"] as const;

type ServicePricingMethod = (typeof pricingMethods)[number];

type ServiceDiagnosisInput = {
  submissionId: string;
  pricingMethod: string;
  desiredMonthlyIncome: string;
  fixedMonthlyExpenses: string;
  monthlyWorkHours: string;
  weeklyWorkDays: string;
  hourlyRate: string;
  minuteRate: string;
  appointmentRate: string;
  appointmentDurationMinutes: string;
  taxRate: string;
  cardFeeRate: string;
};

type ServiceDiagnosisCommand = {
  submissionId: string;
  pricingMethod: ServicePricingMethod;
  desiredMonthlyIncomeCents: number;
  fixedMonthlyExpensesCents: number;
  monthlyWorkMinutes: number;
  weeklyWorkDays: number;
  hourlyRateCents: number;
  minuteRateCents: number;
  appointmentRateCents: number;
  appointmentDurationMinutes: number;
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

export {
  pricingMethods,
  type CreateProductDiagnosisActionResult,
  type CreateServiceDiagnosisActionResult,
  type ProductDiagnosisCommand,
  type ProductDiagnosisField,
  type ProductDiagnosisFieldErrors,
  type ProductDiagnosisInput,
  type ServiceDiagnosisCommand,
  type ServiceDiagnosisField,
  type ServiceDiagnosisFieldErrors,
  type ServiceDiagnosisInput,
  type ServicePricingMethod,
};
