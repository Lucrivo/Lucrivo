import { z } from "zod";

import {
  dashboardCategories,
  dashboardDataStates,
  dashboardModes,
  dashboardPriorities,
  dashboardScenarios,
  dashboardVerdicts,
  normalizeClientDashboardFilters,
  parseClientDashboardFilters,
  toStoredClientDashboardFilters,
  type ClientDashboardFilters,
  type DashboardSearchParams,
  type StoredClientDashboardFilters,
} from "./client-dashboard.filters";

const CLIENT_DASHBOARD_FILTER_COOKIE = "lucrivo_client_dashboard_filters";
const MAX_FILTER_COOKIE_LENGTH = 2048;
const clientDashboardFilterKeys = [
  "from",
  "to",
  "category",
  "mode",
  "scenario",
  "verdict",
  "priority",
  "dataState",
] as const;

const storedClientDashboardFilterSchema = z.strictObject({
  from: z.iso.date().nullable(),
  to: z.iso.date().nullable(),
  categories: z.array(z.enum(dashboardCategories)).max(3),
  modes: z.array(z.enum(dashboardModes)).max(2),
  scenarios: z.array(z.enum(dashboardScenarios)).max(9),
  verdicts: z.array(z.enum(dashboardVerdicts)).max(7),
  priorities: z.array(z.enum(dashboardPriorities)).max(5),
  dataState: z.enum(dashboardDataStates),
});

function hasExplicitClientDashboardFilters(
  searchParams: DashboardSearchParams,
): boolean {
  return clientDashboardFilterKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(searchParams, key),
  );
}

function parseStoredClientDashboardFilters(
  raw: string | undefined,
): StoredClientDashboardFilters | null {
  if (!raw || raw.length > MAX_FILTER_COOKIE_LENGTH) return null;

  try {
    const parsed = storedClientDashboardFilterSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;

    return toStoredClientDashboardFilters(
      normalizeClientDashboardFilters({
        ...parsed.data,
        reportId: null,
      }),
    );
  } catch {
    return null;
  }
}

function resolveClientDashboardFilters(
  searchParams: DashboardSearchParams,
  rawCookie: string | undefined,
): ClientDashboardFilters {
  const urlFilters = parseClientDashboardFilters(searchParams);
  if (hasExplicitClientDashboardFilters(searchParams)) return urlFilters;

  const stored = parseStoredClientDashboardFilters(rawCookie);
  if (!stored) return urlFilters;

  return normalizeClientDashboardFilters({
    ...stored,
    reportId: urlFilters.reportId,
  });
}

export {
  CLIENT_DASHBOARD_FILTER_COOKIE,
  hasExplicitClientDashboardFilters,
  parseStoredClientDashboardFilters,
  resolveClientDashboardFilters,
  storedClientDashboardFilterSchema,
};
