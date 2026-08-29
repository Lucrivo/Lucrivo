const REPORT_SCHEMA_VERSION = 2;
const SERVICE_CALCULATION_VERSION = 1;
const SERVICE_CONTENT_VERSION = 2;

const reportTones = ["neutral", "positive", "warning", "critical"] as const;
const reportVerdicts = [
  "missing_price",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;
const reportPriorities = ["cost", "price", "margin", "volume"] as const;
const reportUnits = ["hour", "appointment"] as const;
const reportSectionKeys = [
  "break_even",
  "hidden_cost",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;
const reportExecutiveSummaryFactKeys = ["margin", "price"] as const;
const reportExecutiveSummaryAnswerKeys = [
  "profitability",
  "price_sufficiency",
  "immediate_action",
] as const;

type ReportTone = (typeof reportTones)[number];
type ReportVerdict = (typeof reportVerdicts)[number];
type ReportPriority = (typeof reportPriorities)[number];
type ReportUnit = (typeof reportUnits)[number];
type ReportSectionKey = (typeof reportSectionKeys)[number];

export {
  REPORT_SCHEMA_VERSION,
  SERVICE_CALCULATION_VERSION,
  SERVICE_CONTENT_VERSION,
  reportExecutiveSummaryAnswerKeys,
  reportExecutiveSummaryFactKeys,
  reportPriorities,
  reportSectionKeys,
  reportTones,
  reportUnits,
  reportVerdicts,
  type ReportPriority,
  type ReportSectionKey,
  type ReportTone,
  type ReportUnit,
  type ReportVerdict,
};

export type {
  ExecutiveSummaryAnswer,
  ExecutiveSummaryFact,
  ReportDiscountSimulationBase,
  ReportExecutiveSummary,
  ReportInputs,
  ReportPolicy,
  ReportResults,
  ReportSection,
  ReportSnapshot,
} from "./schemas/report-snapshot.schema";
