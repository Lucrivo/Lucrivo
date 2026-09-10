import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";

import type { ActiveBillingPrice } from "../types";

const ACTIVE_BILLING_PRICE_COLUMNS =
  "id, product_code, billing_mode, amount_cents, currency, installment_limit, access_months" as const;

type ActiveBillingPriceRow = Pick<
  Database["public"]["Tables"]["billing_prices"]["Row"],
  | "id"
  | "product_code"
  | "billing_mode"
  | "amount_cents"
  | "currency"
  | "installment_limit"
  | "access_months"
>;

type ListActivePricesResult =
  | { status: "success"; prices: ActiveBillingPrice[] }
  | { status: "read_failed" };

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function normalizePrice(row: ActiveBillingPriceRow): ActiveBillingPrice | null {
  if (
    row.product_code !== "quick_diagnosis_pro" ||
    row.currency !== "BRL" ||
    row.id.trim() === "" ||
    !isPositiveSafeInteger(row.amount_cents)
  ) {
    return null;
  }

  if (
    row.billing_mode === "monthly" &&
    row.installment_limit === null &&
    row.access_months === 1
  ) {
    return {
      id: row.id,
      productCode: row.product_code,
      billingMode: row.billing_mode,
      amountCents: row.amount_cents,
      currency: row.currency,
      installmentLimit: null,
      accessMonths: row.access_months,
    };
  }

  if (
    row.billing_mode === "annual" &&
    row.installment_limit === 12 &&
    row.access_months === 12 &&
    row.amount_cents % row.installment_limit === 0
  ) {
    return {
      id: row.id,
      productCode: row.product_code,
      billingMode: row.billing_mode,
      amountCents: row.amount_cents,
      currency: row.currency,
      installmentLimit: row.installment_limit,
      accessMonths: row.access_months,
    };
  }

  return null;
}

async function listActivePrices(input: {
  supabase: SupabaseClient<Database>;
}): Promise<ListActivePricesResult> {
  try {
    const { data, error } = await input.supabase
      .from("billing_prices")
      .select(ACTIVE_BILLING_PRICE_COLUMNS)
      .eq("is_active", true)
      .eq("product_code", "quick_diagnosis_pro");

    if (error || !data) return { status: "read_failed" };

    const prices = data.map(normalizePrice);
    if (prices.some((price) => price === null)) {
      return { status: "read_failed" };
    }

    const normalizedPrices = prices as ActiveBillingPrice[];
    const monthlyCount = normalizedPrices.filter(
      (price) => price.billingMode === "monthly",
    ).length;
    const annualCount = normalizedPrices.filter(
      (price) => price.billingMode === "annual",
    ).length;

    if (monthlyCount !== 1 || annualCount !== 1) {
      return { status: "read_failed" };
    }

    normalizedPrices.sort((left, right) =>
      left.billingMode === right.billingMode
        ? 0
        : left.billingMode === "monthly"
          ? -1
          : 1,
    );

    return { status: "success", prices: normalizedPrices };
  } catch {
    return { status: "read_failed" };
  }
}

export {
  ACTIVE_BILLING_PRICE_COLUMNS,
  listActivePrices,
  type ListActivePricesResult,
};
