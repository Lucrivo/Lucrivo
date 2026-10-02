import type { ReportNumberViewModel } from "@/modules/reports/presenters/to-report-view-model";
import type { ReportPriority, ReportVerdict } from "@/modules/reports/types";

import type { ClientDashboardSnapshot } from "./client-dashboard.schema";

type DashboardTone = "success" | "warning" | "danger" | "info" | "neutral";

type DashboardRecentReportViewModel = {
  id: number;
  title: string;
  categoryLabel: string;
  scenarioLabel: string;
  modeLabel: string;
  createdAtLabel: string;
  verdict: { label: string; tone: DashboardTone };
  priorityLabel: string;
  dataStateLabel: "Dados completos" | "Dados pendentes";
  itemCountLabel: string | null;
  monthlyResultLabel: string | null;
  realMarginLabel: string | null;
  openHref: string;
};

type DashboardComplementaryFact = {
  key:
    | "direct_loss_items"
    | "missing_volume_items"
    | "analyzed_items"
    | "updated_at"
    | "discount_limit";
  label: string;
  value: string;
  supportingText?: string;
};

type DashboardReportFocusViewModel = {
  id: number;
  title: string;
  categoryLabel: string;
  scenarioLabel: string;
  modeLabel: string;
  createdAtLabel: string;
  updatedAtLabel: string | null;
  verdict: { label: string; tone: DashboardTone };
  priorityLabel: string;
  metrics: ReportNumberViewModel[];
  complementaryFacts: DashboardComplementaryFact[];
  openHref: string;
};

type ClientDashboardViewModel = {
  generatedAtLabel: string;
  hasAnyReports: boolean;
  focusReportId: number | null;
  metrics: ClientDashboardSnapshot["metrics"];
  verdictCounts: Array<{
    verdict: ReportVerdict;
    count: number;
    label: string;
    tone: DashboardTone;
  }>;
  priorityCounts: Array<{
    priority: ReportPriority;
    count: number;
    label: string;
  }>;
  recentReports: DashboardRecentReportViewModel[];
};

type DashboardFocusLoad =
  | { status: "ready"; report: DashboardReportFocusViewModel }
  | { status: "none" }
  | { status: "unavailable"; reportId: number };

export type {
  ClientDashboardViewModel,
  DashboardComplementaryFact,
  DashboardFocusLoad,
  DashboardRecentReportViewModel,
  DashboardReportFocusViewModel,
  DashboardTone,
};
