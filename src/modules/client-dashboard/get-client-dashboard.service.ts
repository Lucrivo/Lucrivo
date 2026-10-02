import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/infrastructure/database/supabase/database.types";
import { getOwnedReport } from "@/modules/reports/services/get-report.service";

import {
  toClientDashboardRpcArgs,
  type ClientDashboardFilters,
} from "./client-dashboard.filters";
import { toClientDashboardViewModel } from "./client-dashboard.formatters";
import { clientDashboardSnapshotSchema } from "./client-dashboard.schema";
import type {
  ClientDashboardViewModel,
  DashboardFocusLoad,
} from "./client-dashboard.types";
import { toDashboardReportFocus } from "./to-dashboard-report-focus";

type GetClientDashboardInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  filters: ClientDashboardFilters;
};

type GetClientDashboardResult = {
  dashboard: ClientDashboardViewModel;
  focus: DashboardFocusLoad;
};

type GeneratedDashboardRpcArgs =
  Database["public"]["Functions"]["get_client_dashboard_v1"]["Args"];

class ClientDashboardUnavailableError extends Error {
  constructor() {
    super("client_dashboard_unavailable");
    this.name = "ClientDashboardUnavailableError";
  }
}

async function getClientDashboard({
  supabase,
  userId,
  filters,
}: GetClientDashboardInput): Promise<GetClientDashboardResult> {
  let aggregate: ClientDashboardViewModel;
  let focusReportId: number | null;

  try {
    const rpcArgs =
      toClientDashboardRpcArgs(filters) as unknown as GeneratedDashboardRpcArgs;
    const { data, error } = await supabase.rpc(
      "get_client_dashboard_v1",
      rpcArgs,
    );

    if (error) throw new ClientDashboardUnavailableError();

    const parsed = clientDashboardSnapshotSchema.safeParse(data);
    if (!parsed.success) throw new ClientDashboardUnavailableError();

    aggregate = toClientDashboardViewModel(parsed.data, filters);
    focusReportId = parsed.data.focusReportId;
  } catch {
    throw new ClientDashboardUnavailableError();
  }

  if (focusReportId === null) {
    return { dashboard: aggregate, focus: { status: "none" } };
  }

  try {
    const reportResult = await getOwnedReport({
      supabase,
      userId,
      diagnosisId: String(focusReportId),
    });

    if (reportResult.status === "found") {
      return {
        dashboard: aggregate,
        focus: {
          status: "ready",
          report: toDashboardReportFocus(reportResult.report),
        },
      };
    }
  } catch {
    // The aggregate remains useful when the single focus report cannot load.
  }

  return {
    dashboard: aggregate,
    focus: { status: "unavailable", reportId: focusReportId },
  };
}

export {
  ClientDashboardUnavailableError,
  getClientDashboard,
  type GetClientDashboardInput,
  type GetClientDashboardResult,
};
