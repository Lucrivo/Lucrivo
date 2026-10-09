import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import type {
  BillingContractStatus,
  BillingMode,
  BillingOverview,
  BillingPaymentMethod,
  BillingRefundStatus,
  GetBillingOverviewResult,
} from "../types";

const BILLING_OVERVIEW_CONTRACT_COLUMNS =
  "id, billing_mode, payment_method, status, access_starts_at, access_ends_at, cancel_at_period_end, created_at" as const;

const BILLING_OVERVIEW_REFUND_COLUMNS =
  "status, eligibility_ends_at, requested_at, refund_confirmed_at, last_error_code" as const;

type BillingContractRow = Pick<
  Database["public"]["Tables"]["billing_contracts"]["Row"],
  | "id"
  | "billing_mode"
  | "payment_method"
  | "status"
  | "access_starts_at"
  | "access_ends_at"
  | "cancel_at_period_end"
  | "created_at"
>;

type BillingRefundRow = Pick<
  Database["public"]["Tables"]["billing_refund_requests"]["Row"],
  | "status"
  | "eligibility_ends_at"
  | "requested_at"
  | "refund_confirmed_at"
  | "last_error_code"
>;

type GetBillingOverviewInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  now?: () => Date;
};

function validDate(value: string | null): number | null {
  if (value === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function grantsPaidAccess(
  contract: BillingContractRow,
  instant: number,
): boolean {
  if (
    contract.status !== "active" &&
    contract.status !== "cancel_at_period_end"
  ) {
    return false;
  }

  const startsAt = validDate(contract.access_starts_at);
  const endsAt = validDate(contract.access_ends_at);

  return (
    startsAt !== null &&
    endsAt !== null &&
    startsAt <= instant &&
    endsAt > instant
  );
}

const billingModes = new Set(["monthly", "semiannual"]);
const paymentMethods = new Set(["credit_card", "pix"]);
const contractStatuses = new Set([
  "pending",
  "pending_reconciliation",
  "active",
  "cancel_at_period_end",
  "refund_pending",
  "expired",
  "canceled",
  "refunded",
  "chargeback",
  "failed",
]);
const refundStatuses = new Set([
  "processing",
  "submitted",
  "confirmed",
  "rejected",
  "pending_reconciliation",
]);

function toOverviewContract(
  contract: BillingContractRow | undefined,
  refund: BillingRefundRow | null,
  instant: number,
): BillingOverview["contract"] | undefined {
  if (!contract) return null;

  if (
    !billingModes.has(contract.billing_mode) ||
    !paymentMethods.has(contract.payment_method) ||
    !contractStatuses.has(contract.status)
  ) {
    return undefined;
  }

  const accessStartsAt = validDate(contract.access_starts_at);
  const accessEndsAt = validDate(contract.access_ends_at);
  if (
    (contract.access_starts_at !== null && accessStartsAt === null) ||
    (contract.access_ends_at !== null && accessEndsAt === null)
  ) {
    return undefined;
  }
  const eligibilityEndsAt =
    accessStartsAt === null ? null : accessStartsAt + 7 * 24 * 60 * 60 * 1000;
  const canRequestRefund =
    (contract.status === "active" ||
      contract.status === "cancel_at_period_end") &&
    eligibilityEndsAt !== null &&
    instant <= eligibilityEndsAt &&
    (refund === null || refund.status === "rejected");

  return {
    billingMode: contract.billing_mode as BillingMode,
    paymentMethod: contract.payment_method as BillingPaymentMethod,
    status: contract.status as BillingContractStatus,
    accessEndsAt: contract.access_ends_at,
    cancelAtPeriodEnd: contract.cancel_at_period_end,
    canRequestRefund,
    refundEligibilityEndsAt:
      eligibilityEndsAt === null
        ? null
        : new Date(eligibilityEndsAt).toISOString(),
  };
}

function toOverviewRefund(
  refund: BillingRefundRow | null,
): BillingOverview["refund"] | undefined {
  if (refund === null) return null;
  if (!refundStatuses.has(refund.status)) return undefined;
  if (
    validDate(refund.eligibility_ends_at) === null ||
    validDate(refund.requested_at) === null ||
    (refund.refund_confirmed_at !== null &&
      validDate(refund.refund_confirmed_at) === null)
  ) {
    return undefined;
  }

  return {
    status: refund.status as BillingRefundStatus,
    eligibilityEndsAt: refund.eligibility_ends_at,
    requestedAt: refund.requested_at,
    refundConfirmedAt: refund.refund_confirmed_at,
    lastErrorCode: refund.last_error_code,
  };
}

async function getBillingOverview({
  supabase,
  userId,
  now = () => new Date(),
}: GetBillingOverviewInput): Promise<GetBillingOverviewResult> {
  try {
    const instant = now().getTime();
    if (!Number.isFinite(instant)) return { status: "read_failed" };

    const [contractsResult, freeReportResult, courtesyResult] =
      await Promise.all([
        supabase
          .from("billing_contracts")
          .select(BILLING_OVERVIEW_CONTRACT_COLUMNS)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("diagnoses")
          .select("is_free_report")
          .eq("user_id", userId)
          .eq("is_free_report", true)
          .eq("analysis_mode", "quick")
          .limit(1)
          .maybeSingle(),
        supabase.rpc("current_courtesy_access_expires_at"),
      ]);

    if (
      contractsResult.error ||
      freeReportResult.error ||
      courtesyResult.error
    ) {
      return { status: "read_failed" };
    }

    const courtesyExpiresAt = courtesyResult.data;
    if (
      courtesyExpiresAt !== null &&
      (typeof courtesyExpiresAt !== "string" ||
        validDate(courtesyExpiresAt) === null)
    ) {
      return { status: "read_failed" };
    }

    const contracts = contractsResult.data ?? [];
    const paidContract = contracts.find((contract) =>
      grantsPaidAccess(contract, instant),
    );
    const projectedContract = paidContract ?? contracts[0];
    let refundRow: BillingRefundRow | null = null;
    if (projectedContract) {
      const refundResult = await supabase
        .from("billing_refund_requests")
        .select(BILLING_OVERVIEW_REFUND_COLUMNS)
        .eq("contract_id", projectedContract.id)
        .maybeSingle();
      if (refundResult.error) return { status: "read_failed" };
      refundRow = refundResult.data;
    }
    const refund = toOverviewRefund(refundRow);
    if (refund === undefined) return { status: "read_failed" };
    const overviewContract = toOverviewContract(
      projectedContract,
      refundRow,
      instant,
    );
    if (overviewContract === undefined) return { status: "read_failed" };
    const freeQuickDiagnosisUsed =
      freeReportResult.data?.is_free_report === true;
    const hasPaidAccess = paidContract !== undefined;
    const courtesyInstant = validDate(courtesyExpiresAt);
    const hasCourtesyAccess =
      courtesyInstant !== null && courtesyInstant > instant;
    const hasReportAccess = hasPaidAccess || hasCourtesyAccess;

    return {
      status: "success",
      overview: {
        tier: hasPaidAccess ? "paid" : hasCourtesyAccess ? "courtesy" : "free",
        canCreateQuickDiagnosis: hasReportAccess || !freeQuickDiagnosisUsed,
        canCreateDetailedDiagnosis: hasReportAccess,
        freeQuickDiagnosisUsed,
        courtesyExpiresAt: hasCourtesyAccess ? courtesyExpiresAt : null,
        contract: overviewContract,
        refund,
      },
    };
  } catch {
    return { status: "read_failed" };
  }
}

export {
  BILLING_OVERVIEW_CONTRACT_COLUMNS,
  BILLING_OVERVIEW_REFUND_COLUMNS,
  getBillingOverview,
  type GetBillingOverviewInput,
};
