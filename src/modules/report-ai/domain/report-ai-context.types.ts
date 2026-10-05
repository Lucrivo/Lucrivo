import type { ReportPriority, ReportVerdict } from "@/modules/reports/types";

type ReportAiVolumeState =
  "known_positive" | "known_zero" | "unknown" | "not_applicable";

type ReportAiFactScope = "unit" | "month" | "business" | "item";

type ReportAiFact = {
  key: string;
  label: string;
  value: string | null;
  scope: ReportAiFactScope;
};

type ReportAiAvailability = {
  volume: ReportAiVolumeState;
  completeCostAvailable: boolean;
  monthlyResultAvailable: boolean;
  minimumPriceAvailable: boolean;
  requiredVolumeAvailable: boolean;
  discountSimulationAvailable: boolean;
  reasons: string[];
};

type ReportAiItemContext = {
  name: string;
  directLoss: boolean;
  facts: ReportAiFact[];
  technicalDetails: {
    modeLabel: string;
    yieldAndLossLabel?: string;
    ingredients: Array<{
      name: string;
      quantityLabel: string;
      unitCostLabel: string;
    }>;
    additionalCostsLabel?: string;
  } | null;
};

type ReportAiContextV2 = {
  schemaVersion: 2;
  report: {
    id: number;
    version: number;
    category: "service" | "product" | "production";
    scenario: string;
    unit: "hour" | "appointment" | "unit" | "mix";
    analysisMode: "quick" | "detailed";
  };
  diagnosis: {
    verdict: ReportVerdict;
    priority: ReportPriority;
    partial: boolean;
  };
  facts: ReportAiFact[];
  availability: ReportAiAvailability;
  explanations: {
    executiveSummary: unknown;
    sections: unknown[];
    guidance: unknown[];
    comparison: unknown[];
  };
  items?: ReportAiItemContext[];
};

export type {
  ReportAiAvailability,
  ReportAiContextV2,
  ReportAiFact,
  ReportAiFactScope,
  ReportAiItemContext,
  ReportAiVolumeState,
};
