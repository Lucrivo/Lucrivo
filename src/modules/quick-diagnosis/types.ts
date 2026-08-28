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

export {
  pricingMethods,
  type CreateServiceDiagnosisActionResult,
  type ServiceDiagnosisCommand,
  type ServiceDiagnosisField,
  type ServiceDiagnosisFieldErrors,
  type ServiceDiagnosisInput,
  type ServicePricingMethod,
};
