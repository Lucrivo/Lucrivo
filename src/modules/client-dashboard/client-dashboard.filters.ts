import type { Database } from "@/infrastructure/database/supabase/database.types";
import type {
  ReportPriority,
  ReportScenario,
  ReportVerdict,
} from "@/modules/reports/types";

const dashboardCategories = ["service", "product", "production"] as const;
const dashboardModes = ["quick", "detailed"] as const;
const dashboardScenarios = [
  "hour",
  "minute",
  "appointment",
  "day",
  "week",
  "month",
  "resale",
  "digital",
  "manufacturing",
] as const satisfies readonly ReportScenario[];
const dashboardVerdicts = [
  "missing_price",
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "no_sales",
  "break_even",
  "positive_result",
] as const satisfies readonly ReportVerdict[];
const dashboardPriorities = [
  "cost",
  "data",
  "price",
  "margin",
  "volume",
] as const satisfies readonly ReportPriority[];
const dashboardDataStates = ["all", "complete", "pending"] as const;

const categoryScenarios = {
  service: ["hour", "minute", "appointment", "day", "week", "month"],
  product: ["resale", "digital"],
  production: ["manufacturing"],
} as const satisfies Record<DashboardCategory, readonly ReportScenario[]>;

type DashboardSearchParams = Record<
  string,
  string | string[] | undefined
>;
type DashboardCategory = (typeof dashboardCategories)[number];
type DashboardMode = (typeof dashboardModes)[number];
type DashboardDataState = (typeof dashboardDataStates)[number];

type ClientDashboardFilters = {
  from: string | null;
  to: string | null;
  categories: DashboardCategory[];
  modes: DashboardMode[];
  scenarios: ReportScenario[];
  verdicts: ReportVerdict[];
  priorities: ReportPriority[];
  dataState: DashboardDataState;
  reportId: number | null;
};

type GeneratedDashboardRpcArgs =
  Database["public"]["Functions"]["get_client_dashboard_v1"]["Args"];

type ClientDashboardRpcArgs = {
  p_from_date: GeneratedDashboardRpcArgs["p_from_date"] | null;
  p_to_date: GeneratedDashboardRpcArgs["p_to_date"] | null;
  p_categories: GeneratedDashboardRpcArgs["p_categories"] | null;
  p_modes: GeneratedDashboardRpcArgs["p_modes"] | null;
  p_scenarios: GeneratedDashboardRpcArgs["p_scenarios"] | null;
  p_verdicts: GeneratedDashboardRpcArgs["p_verdicts"] | null;
  p_priorities: GeneratedDashboardRpcArgs["p_priorities"] | null;
  p_data_state: DashboardDataState;
  p_focus_id: GeneratedDashboardRpcArgs["p_focus_id"] | null;
};

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function orderedValues<const Value extends string>(
  raw: string | undefined,
  accepted: readonly Value[],
): Value[] {
  if (!raw) return [];
  const requested = new Set(raw.split(","));
  return accepted.filter((value) => requested.has(value));
}

function parseCalendarDate(raw: string | undefined): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === raw ? raw : null;
}

function parseReportId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const reportId = Number(raw);
  return Number.isSafeInteger(reportId) && reportId > 0 ? reportId : null;
}

function compatibleScenarios(
  categories: readonly DashboardCategory[],
): Set<ReportScenario> {
  if (categories.length === 0) return new Set(dashboardScenarios);
  return new Set(categories.flatMap((category) => categoryScenarios[category]));
}

function normalizeClientDashboardFilters(
  filters: ClientDashboardFilters,
): ClientDashboardFilters {
  const hasValidRange =
    filters.from === null || filters.to === null || filters.from < filters.to;
  const allowedScenarios = compatibleScenarios(filters.categories);

  return {
    ...filters,
    from: hasValidRange ? filters.from : null,
    to: hasValidRange ? filters.to : null,
    scenarios: filters.scenarios.filter((scenario) =>
      allowedScenarios.has(scenario),
    ),
  };
}

function parseClientDashboardFilters(
  searchParams: DashboardSearchParams,
): ClientDashboardFilters {
  const categories = orderedValues(
    scalar(searchParams.category),
    dashboardCategories,
  );
  const scenarios = orderedValues(
    scalar(searchParams.scenario),
    dashboardScenarios,
  );
  const rawDataState = scalar(searchParams.dataState);
  const dataState = dashboardDataStates.includes(
    rawDataState as DashboardDataState,
  )
    ? (rawDataState as DashboardDataState)
    : "all";

  return normalizeClientDashboardFilters({
    from: parseCalendarDate(scalar(searchParams.from)),
    to: parseCalendarDate(scalar(searchParams.to)),
    categories,
    modes: orderedValues(scalar(searchParams.mode), dashboardModes),
    scenarios,
    verdicts: orderedValues(scalar(searchParams.verdict), dashboardVerdicts),
    priorities: orderedValues(
      scalar(searchParams.priority),
      dashboardPriorities,
    ),
    dataState,
    reportId: parseReportId(scalar(searchParams.report)),
  });
}

function nullableList<Value>(values: Value[]): Value[] | null {
  return values.length > 0 ? values : null;
}

function toClientDashboardRpcArgs(
  filters: ClientDashboardFilters,
): ClientDashboardRpcArgs {
  return {
    p_from_date: filters.from,
    p_to_date: filters.to,
    p_categories: nullableList(filters.categories),
    p_modes: nullableList(filters.modes),
    p_scenarios: nullableList(filters.scenarios),
    p_verdicts: nullableList(filters.verdicts),
    p_priorities: nullableList(filters.priorities),
    p_data_state: filters.dataState,
    p_focus_id: filters.reportId,
  };
}

function buildClientDashboardHref(
  filters: ClientDashboardFilters,
  patch: Partial<ClientDashboardFilters>,
): string {
  const changesFilter = Object.keys(patch).some((key) => key !== "reportId");
  const next = normalizeClientDashboardFilters({
    ...filters,
    ...patch,
    reportId: changesFilter ? null : (patch.reportId ?? filters.reportId),
  });
  const params = new URLSearchParams();

  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.categories.length > 0)
    params.set("category", next.categories.join(","));
  if (next.modes.length > 0) params.set("mode", next.modes.join(","));
  if (next.scenarios.length > 0)
    params.set("scenario", next.scenarios.join(","));
  if (next.verdicts.length > 0)
    params.set("verdict", next.verdicts.join(","));
  if (next.priorities.length > 0)
    params.set("priority", next.priorities.join(","));
  if (next.dataState !== "all") params.set("dataState", next.dataState);
  if (next.reportId !== null) params.set("report", String(next.reportId));

  const query = params.toString();
  return `/dashboard${query ? `?${query}` : ""}`;
}

function moveCalendarDate(value: string, days: number): string {
  const parsed = parseCalendarDate(value);
  if (!parsed) throw new Error("invalid_calendar_date");
  const date = new Date(`${parsed}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextCalendarDate(value: string): string {
  return moveCalendarDate(value, 1);
}

function previousCalendarDate(value: string): string {
  return moveCalendarDate(value, -1);
}

export {
  buildClientDashboardHref,
  dashboardCategories,
  dashboardDataStates,
  dashboardModes,
  dashboardPriorities,
  dashboardScenarios,
  dashboardVerdicts,
  nextCalendarDate,
  parseClientDashboardFilters,
  previousCalendarDate,
  toClientDashboardRpcArgs,
  type ClientDashboardFilters,
  type ClientDashboardRpcArgs,
  type DashboardCategory,
  type DashboardDataState,
  type DashboardMode,
  type DashboardSearchParams,
};
