const SERVICE_REPORT_SCHEMA_VERSION = 4;
const SERVICE_REPORT_CALCULATION_VERSION = 3;
const SERVICE_REPORT_CONTENT_VERSION = 6;
const PRODUCT_REPORT_SCHEMA_VERSION = 3;
const PRODUCT_CALCULATION_VERSION = 3;
const PRODUCT_CONTENT_VERSION = 6;
const PRODUCTION_REPORT_SCHEMA_VERSION = 3;
const PRODUCTION_CALCULATION_VERSION = 3;
const PRODUCTION_CONTENT_VERSION = 6;
const DETAILED_REPORT_SCHEMA_VERSION = 1;
const DETAILED_REPORT_CALCULATION_VERSION = 1;
const DETAILED_REPORT_CONTENT_VERSION = 3;

const reportTones = ["neutral", "positive", "warning", "critical"] as const;
const serviceReportVerdicts = [
  "missing_price",
  "direct_loss",
  "operational_loss",
  "break_even",
  "positive_result",
] as const;
const productReportVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "no_sales",
  "break_even",
  "positive_result",
] as const;
const productionReportVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "no_sales",
  "break_even",
  "positive_result",
] as const;
const reportVerdicts = [
  "missing_price",
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "no_sales",
  "break_even",
  "positive_result",
] as const;
const serviceReportPriorities = ["cost", "price", "margin", "volume"] as const;
const productReportPriorities = [
  "cost",
  "data",
  "price",
  "margin",
  "volume",
] as const;
const productionReportPriorities = [
  "cost",
  "data",
  "price",
  "margin",
  "volume",
] as const;
const reportPriorities = ["cost", "data", "price", "margin", "volume"] as const;
const serviceReportUnits = ["hour", "appointment"] as const;
const productReportUnits = ["unit"] as const;
const productionReportUnits = ["unit"] as const;
const reportUnits = ["hour", "appointment", "unit"] as const;
const reportScenarios = [
  "hour",
  "minute",
  "appointment",
  "day",
  "week",
  "month",
  "resale",
  "digital",
  "digital",
  "manufacturing",
] as const;
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
type ServiceReportVerdict = (typeof serviceReportVerdicts)[number];
type ProductReportVerdict = (typeof productReportVerdicts)[number];
type ProductionReportVerdict = (typeof productionReportVerdicts)[number];
type ReportVerdict = (typeof reportVerdicts)[number];
type ServiceReportPriority = (typeof serviceReportPriorities)[number];
type ProductReportPriority = (typeof productReportPriorities)[number];
type ProductionReportPriority = (typeof productionReportPriorities)[number];
type ReportPriority = (typeof reportPriorities)[number];
type ServiceReportUnit = (typeof serviceReportUnits)[number];
type ProductReportUnit = (typeof productReportUnits)[number];
type ProductionReportUnit = (typeof productionReportUnits)[number];
type ReportUnit = (typeof reportUnits)[number];
type ReportScenario = (typeof reportScenarios)[number];
type ReportSectionKey = (typeof reportSectionKeys)[number];

type ProductReportCalculation = {
  effectiveFixedCostCents: number;
  purchaseUnitCostCents: number;
  fixedAllocationCents: number | null;
  totalUnitCostCents: number | null;
  currentPriceCents: number;
  feeAmountCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
  unitProfitCents: number | null;
  monthlySalesVolumeUsed: number | null;
  monthlyGrossRevenueCents: number | null;
  monthlyNetRevenueCents: number | null;
  monthlyResultCents: number | null;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  totalFeeBasisPoints: number;
  verdict: ProductReportVerdict;
  priority: ProductReportPriority;
};

type ProductionReportCalculation = {
  effectiveFixedCostCents: number;
  productionUnitCostCents: number;
  fixedAllocationCents: number | null;
  totalUnitCostCents: number | null;
  currentPriceCents: number;
  feeAmountCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
  unitProfitCents: number | null;
  monthlySalesVolumeUsed: number | null;
  monthlyGrossRevenueCents: number | null;
  monthlyNetRevenueCents: number | null;
  monthlyResultCents: number | null;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  totalFeeBasisPoints: number;
  verdict: ProductionReportVerdict;
  priority: ProductionReportPriority;
};

export {
  DETAILED_REPORT_CALCULATION_VERSION,
  DETAILED_REPORT_CONTENT_VERSION,
  DETAILED_REPORT_SCHEMA_VERSION,
  PRODUCT_CALCULATION_VERSION,
  PRODUCT_CONTENT_VERSION,
  PRODUCT_REPORT_SCHEMA_VERSION,
  PRODUCTION_CALCULATION_VERSION,
  PRODUCTION_CONTENT_VERSION,
  PRODUCTION_REPORT_SCHEMA_VERSION,
  SERVICE_REPORT_CALCULATION_VERSION,
  SERVICE_REPORT_CONTENT_VERSION,
  SERVICE_REPORT_SCHEMA_VERSION,
  productReportPriorities,
  productReportUnits,
  productReportVerdicts,
  productionReportPriorities,
  productionReportUnits,
  productionReportVerdicts,
  reportExecutiveSummaryAnswerKeys,
  reportExecutiveSummaryFactKeys,
  reportPriorities,
  reportScenarios,
  reportSectionKeys,
  reportTones,
  reportUnits,
  reportVerdicts,
  serviceReportPriorities,
  serviceReportUnits,
  serviceReportVerdicts,
  type ProductReportCalculation,
  type ProductReportPriority,
  type ProductReportUnit,
  type ProductReportVerdict,
  type ProductionReportCalculation,
  type ProductionReportPriority,
  type ProductionReportUnit,
  type ProductionReportVerdict,
  type ReportPriority,
  type ReportScenario,
  type ReportSectionKey,
  type ReportTone,
  type ReportUnit,
  type ReportVerdict,
  type ServiceReportPriority,
  type ServiceReportUnit,
  type ServiceReportVerdict,
};

export type {
  CurrentDetailedReportSnapshot,
  DetailedReportSnapshot,
} from "./schemas/detailed-report-snapshot.schema";
export type {
  ExecutiveSummaryAnswer,
  ExecutiveSummaryFact,
  ReportExecutiveSummary,
  ReportSection,
} from "./schemas/report-content.schema";
export type {
  CurrentProductReportSnapshot,
  ProductReportDiscountSimulationBase,
  ProductReportSnapshot,
} from "./schemas/product-report-snapshot.schema";
export type {
  CurrentProductionReportSnapshot,
  ProductionReportDiscountSimulationBase,
  ProductionReportSnapshot,
} from "./schemas/production-report-snapshot.schema";
export type {
  QuickReportSnapshot,
  ReportDiscountSimulationBase,
  ReportSnapshot,
} from "./schemas/report-snapshot.schema";
export type {
  CurrentServiceReportSnapshot,
  ServiceReportDiscountSimulationBase,
  ServiceReportSnapshot,
} from "./schemas/service-report-snapshot.schema";
