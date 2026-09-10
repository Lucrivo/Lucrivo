type BillingContractStatus =
  | "pending"
  | "pending_reconciliation"
  | "active"
  | "cancel_at_period_end"
  | "expired"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "failed";

type BillingMode = "monthly" | "annual";
type BillingPaymentMethod = "credit_card" | "pix";

type BillingOverview = {
  tier: "free" | "paid";
  canCreateDiagnosis: boolean;
  freeReportUsed: boolean;
  contract: null | {
    billingMode: BillingMode;
    paymentMethod: BillingPaymentMethod;
    status: BillingContractStatus;
    accessEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
  };
};

type GetBillingOverviewResult =
  { status: "success"; overview: BillingOverview } | { status: "read_failed" };

export type {
  BillingContractStatus,
  BillingMode,
  BillingOverview,
  BillingPaymentMethod,
  GetBillingOverviewResult,
};
