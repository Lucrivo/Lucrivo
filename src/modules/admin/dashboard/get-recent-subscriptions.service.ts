import "server-only";

import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  formatSubscriptionDate,
  presentContractStatus,
} from "./admin-dashboard.formatters";
import type { AdminSubscriptionFilters } from "./admin-dashboard-filters";
import { recentSubscriptionsSchema } from "./admin-dashboard.schema";
import type { AdminDashboardViewModel } from "./admin-dashboard.types";

class AdminRecentSubscriptionsUnavailableError extends Error {
  constructor() {
    super("admin_recent_subscriptions_unavailable");
    this.name = "AdminRecentSubscriptionsUnavailableError";
  }
}

async function getRecentSubscriptions(
  filters: AdminSubscriptionFilters,
): Promise<AdminDashboardViewModel["recentSubscriptions"]> {
  const { supabase } = await requireAdmin();

  try {
    const { data, error } = await supabase.rpc(
      "list_admin_recent_subscriptions_v1",
      {
        p_period: filters.period,
        p_billing_mode: filters.billingMode,
        p_state: filters.state,
      },
    );
    if (error) throw new AdminRecentSubscriptionsUnavailableError();

    const parsed = recentSubscriptionsSchema.safeParse(data);
    if (!parsed.success) throw new AdminRecentSubscriptionsUnavailableError();

    return parsed.data.map((contract) => ({
      id: contract.id,
      email: contract.email ?? "E-mail indisponível",
      billingModeLabel:
        contract.billingMode === "monthly" ? "Mensal" : "Anual",
      createdAtLabel: formatSubscriptionDate(contract.createdAt),
      status: presentContractStatus(contract.status),
    }));
  } catch (error) {
    if (error instanceof AdminRecentSubscriptionsUnavailableError) throw error;
    throw new AdminRecentSubscriptionsUnavailableError();
  }
}

export {
  AdminRecentSubscriptionsUnavailableError,
  getRecentSubscriptions,
};
