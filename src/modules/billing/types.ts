type BillingContractStatus =
  | "pending"
  | "pending_reconciliation"
  | "active"
  | "cancel_at_period_end"
  | "refund_pending"
  | "expired"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "failed";

type BillingMode = "monthly" | "semiannual";
type BillingPaymentMethod = "credit_card" | "pix";
type BillingRefundStatus =
  | "processing"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "pending_reconciliation";

type ActiveBillingPrice = {
  id: string;
  productCode: "quick_diagnosis_pro";
  billingMode: BillingMode;
  amountCents: number;
  currency: "BRL";
  installmentLimit: number | null;
  accessMonths: number;
};

type BillingRefundSummary = {
  status: BillingRefundStatus;
  eligibilityEndsAt: string;
  requestedAt: string;
  refundConfirmedAt: string | null;
  lastErrorCode: string | null;
};

type BillingOverview = {
  tier: "free" | "paid" | "courtesy";
  canCreateQuickDiagnosis: boolean;
  canCreateDetailedDiagnosis: boolean;
  freeQuickDiagnosisUsed: boolean;
  courtesyExpiresAt: string | null;
  contract: null | {
    billingMode: BillingMode;
    paymentMethod: BillingPaymentMethod;
    status: BillingContractStatus;
    accessEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    canRequestRefund: boolean;
    refundEligibilityEndsAt: string | null;
  };
  refund: BillingRefundSummary | null;
};

type GetBillingOverviewResult =
  { status: "success"; overview: BillingOverview } | { status: "read_failed" };

export type {
  ActiveBillingPrice,
  BillingContractStatus,
  BillingMode,
  BillingOverview,
  BillingPaymentMethod,
  BillingRefundStatus,
  BillingRefundSummary,
  GetBillingOverviewResult,
};
