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

type ProductReportVerdict =
  | "direct_loss"
  | "incomplete_volume"
  | "operational_loss"
  | "tight_margin"
  | "adequate_margin"
  | "above_target";

type ProductReportPriority =
  | "cost"
  | "data"
  | "price"
  | "margin"
  | "volume";

type ProductReportCalculation = {
  effectiveFixedCostCents: number;
  purchaseUnitCostCents: number;
  fixedAllocationCents: number | null;
  totalUnitCostCents: number | null;
  currentPriceCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
  unitProfitCents: number | null;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  targetPriceCents: number | null;
  priceReferencesPartial: boolean;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  totalFeeBasisPoints: number;
  verdict: ProductReportVerdict;
  priority: ProductReportPriority;
};

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
  type ProductReportCalculation,
  type ProductReportPriority,
  type ProductReportVerdict,
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
