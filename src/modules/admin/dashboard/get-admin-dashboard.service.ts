import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { requireAdmin } from "@/modules/auth/services/require-admin";

import {
  formatMonthPeriod,
  formatSnapshotTime,
  formatSubscriptionDate,
  presentContractStatus,
} from "./admin-dashboard.formatters";
import { adminDashboardSnapshotSchema } from "./admin-dashboard.schema";
import type { AdminDashboardViewModel } from "./admin-dashboard.types";

class AdminDashboardUnavailableError extends Error {
  constructor() {
    super("admin_dashboard_unavailable");
    this.name = "AdminDashboardUnavailableError";
  }
}

async function getAdminDashboard(): Promise<AdminDashboardViewModel> {
  await requireAdmin();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_admin_dashboard_v1");

    if (error) throw new AdminDashboardUnavailableError();

    const parsed = adminDashboardSnapshotSchema.safeParse(data);

    if (!parsed.success) throw new AdminDashboardUnavailableError();

    const snapshot = parsed.data;

    return {
      generatedAtLabel: formatSnapshotTime(snapshot.generatedAt),
      metrics: snapshot.metrics,
      revenueHistory: snapshot.revenueHistory.map((point) => ({
        ...point,
        label: formatMonthPeriod(point.period),
      })),
      userGrowth: snapshot.userGrowth.map((point) => ({
        ...point,
        label: formatMonthPeriod(point.period),
      })),
      recentSubscriptions: snapshot.recentSubscriptions.map((contract) => ({
        id: contract.id,
        email: contract.email ?? "E-mail indisponível",
        billingModeLabel:
          contract.billingMode === "monthly" ? "Mensal" : "Anual",
        createdAtLabel: formatSubscriptionDate(contract.createdAt),
        status: presentContractStatus(contract.status),
      })),
    };
  } catch (error) {
    if (error instanceof AdminDashboardUnavailableError) throw error;

    throw new AdminDashboardUnavailableError();
  }
}

export { AdminDashboardUnavailableError, getAdminDashboard };
