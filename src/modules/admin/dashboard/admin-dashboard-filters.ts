import { z } from "zod";

const adminSubscriptionFiltersSchema = z.strictObject({
  period: z.enum(["7d", "30d", "90d", "all"]),
  billingMode: z.enum(["monthly", "annual", "all"]),
  state: z.enum(["active", "ended", "all"]),
});

type AdminSubscriptionFilters = z.infer<typeof adminSubscriptionFiltersSchema>;
type AdminDashboardSearchParams = Record<string, string | string[] | undefined>;

const defaultAdminSubscriptionFilters: AdminSubscriptionFilters = {
  period: "all",
  billingMode: "all",
  state: "all",
};

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseAdminSubscriptionFilters(
  searchParams: AdminDashboardSearchParams,
): AdminSubscriptionFilters {
  const parsed = adminSubscriptionFiltersSchema.safeParse({
    period: scalar(searchParams.period) ?? "all",
    billingMode: scalar(searchParams.billing) ?? "all",
    state: scalar(searchParams.subscriptionState) ?? "all",
  });
  return parsed.success ? parsed.data : defaultAdminSubscriptionFilters;
}

function hasAdminSubscriptionFilters(filters: AdminSubscriptionFilters) {
  return (
    filters.period !== "all" ||
    filters.billingMode !== "all" ||
    filters.state !== "all"
  );
}

export {
  adminSubscriptionFiltersSchema,
  defaultAdminSubscriptionFilters,
  hasAdminSubscriptionFilters,
  parseAdminSubscriptionFilters,
  type AdminDashboardSearchParams,
  type AdminSubscriptionFilters,
};
