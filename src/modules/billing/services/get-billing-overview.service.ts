import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import type {
  BillingContractStatus,
  BillingMode,
  BillingOverview,
  BillingPaymentMethod,
  GetBillingOverviewResult,
} from "../types";

const BILLING_OVERVIEW_CONTRACT_COLUMNS =
  "billing_mode, payment_method, status, access_starts_at, access_ends_at, cancel_at_period_end, created_at" as const;

type BillingContractRow = Pick<
  Database["public"]["Tables"]["billing_contracts"]["Row"],
  | "billing_mode"
  | "payment_method"
  | "status"
  | "access_starts_at"
  | "access_ends_at"
  | "cancel_at_period_end"
  | "created_at"
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

function toOverviewContract(
  contract: BillingContractRow | undefined,
): BillingOverview["contract"] {
  if (!contract) return null;

  return {
    billingMode: contract.billing_mode as BillingMode,
    paymentMethod: contract.payment_method as BillingPaymentMethod,
    status: contract.status as BillingContractStatus,
    accessEndsAt: contract.access_ends_at,
    cancelAtPeriodEnd: contract.cancel_at_period_end,
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

    const [contractsResult, freeReportResult] = await Promise.all([
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
        .limit(1)
        .maybeSingle(),
    ]);

    if (contractsResult.error || freeReportResult.error) {
      return { status: "read_failed" };
    }

    const contracts = contractsResult.data ?? [];
    const paidContract = contracts.find((contract) =>
      grantsPaidAccess(contract, instant),
    );
    const freeReportUsed = freeReportResult.data?.is_free_report === true;
    const hasPaidAccess = paidContract !== undefined;

    return {
      status: "success",
      overview: {
        tier: hasPaidAccess ? "paid" : "free",
        canCreateDiagnosis: hasPaidAccess || !freeReportUsed,
        freeReportUsed,
        contract: toOverviewContract(paidContract ?? contracts[0]),
      },
    };
  } catch {
    return { status: "read_failed" };
  }
}

export {
  BILLING_OVERVIEW_CONTRACT_COLUMNS,
  getBillingOverview,
  type GetBillingOverviewInput,
};
