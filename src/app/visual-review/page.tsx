"use client";

import { Suspense, useReducer } from "react";
import { useSearchParams } from "next/navigation";

import { calculateDetailedDiagnosis } from "@/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis";
import type { DetailedDiagnosisCommand } from "@/modules/detailed-diagnosis/types";
import {
  createInitialDetailedWizardState,
  detailedWizardReducer,
} from "@/modules/detailed-diagnosis/components/detailed-wizard-state";
import { DetailedProductionCostsStep } from "@/modules/detailed-diagnosis/components/steps/detailed-production-costs-step";
import { buildDetailedReportSnapshot } from "@/modules/reports/domain/build-detailed-report-snapshot";
import { toEditableReportDraft } from "@/modules/reports/editor/report-editor.adapters";
import { DetailedReportDetail } from "@/modules/reports/components/detailed-report-detail";
import { ReportEditor } from "@/modules/reports/components/report-editor";

const completeProductCommand: DetailedDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  category: "product",
  fixedMonthlyExpensesCents: 100_000,
  proLaboreIncluded: true,
  proLaboreCents: 100_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 350,
  items: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      position: 0,
      name: "Kit presenteável com caneca, café especial e embalagem artesanal",
      kind: "resale",
      unitSalePriceCents: 15_000,
      monthlySalesVolume: 40,
      purchaseUnitCostCents: 7_000,
      packagingUnitCostCents: 150,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      position: 1,
      name: "Caderno de planejamento financeiro para pequenos negócios",
      kind: "resale",
      unitSalePriceCents: 5_000,
      monthlySalesVolume: 80,
      purchaseUnitCostCents: 2_400,
      packagingUnitCostCents: 200,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      position: 2,
      name: "Garrafa térmica compacta",
      kind: "resale",
      unitSalePriceCents: 8_500,
      monthlySalesVolume: 25,
      purchaseUnitCostCents: 3_000,
      packagingUnitCostCents: 250,
    },
  ],
};

const partialProductionCommand: DetailedDiagnosisCommand = {
  submissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  category: "production",
  fixedMonthlyExpensesCents: 200_000,
  proLaboreIncluded: true,
  proLaboreCents: 300_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 350,
  items: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      position: 0,
      name: "Bolo artesanal de chocolate com cobertura especial e frutas da estação",
      kind: "manufacturing",
      costMode: "technical_sheet",
      unitSalePriceCents: 15_000,
      monthlySalesVolume: null,
      recipeYield: 10,
      lossRateBasisPoints: 500,
      packagingUnitCostCents: 150,
      directLaborUnitCostCents: 800,
      otherVariableUnitCostCents: 200,
      ingredients: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          position: 0,
          name: "Farinha de trigo especial para confeitaria",
          quantityMillionths: 500_000,
          unit: "kg",
          unitCostTenThousandths: 70_000,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          position: 1,
          name: "Chocolate meio amargo",
          quantityMillionths: 800_000,
          unit: "kg",
          unitCostTenThousandths: 420_000,
        },
      ],
    },
    {
      id: "77777777-7777-4777-8777-777777777777",
      position: 1,
      name: "Torta individual",
      kind: "manufacturing",
      costMode: "summarized",
      unitSalePriceCents: 3_500,
      monthlySalesVolume: 80,
      productionUnitCostCents: 1_800,
    },
  ],
};

const completeProductSnapshot = buildDetailedReportSnapshot(
  completeProductCommand,
  calculateDetailedDiagnosis(completeProductCommand),
);
const partialProductionSnapshot = buildDetailedReportSnapshot(
  partialProductionCommand,
  calculateDetailedDiagnosis(partialProductionCommand),
);

function VisualReviewContent() {
  const mode = useSearchParams().get("mode") ?? "report";
  const [wizardState, dispatch] = useReducer(
    detailedWizardReducer,
    createInitialDetailedWizardState("production", () => crypto.randomUUID()),
  );
  const draft = toEditableReportDraft(
    completeProductSnapshot,
    () => "44444444-4444-4444-8444-444444444444",
  );

  if (mode === "ingredient") {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-8">
        <DetailedProductionCostsStep
          state={{ ...wizardState, phase: "itemValues" }}
          dispatch={dispatch}
        />
      </main>
    );
  }
  if (mode === "editor" && draft?.kind === "detailed") {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        <ReportEditor
          diagnosisId={168}
          version={1}
          initialDraft={draft}
          initialSnapshot={completeProductSnapshot}
          onCancel={() => undefined}
          onPlanRequired={() => undefined}
        />
      </main>
    );
  }
  if (mode === "partial-report") {
    return (
      <div className="p-4 sm:p-8">
        <DetailedReportDetail
          id={169}
          createdAt="2026-09-19T15:30:00.000Z"
          snapshot={partialProductionSnapshot}
        />
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-8">
      <DetailedReportDetail
        id={168}
        createdAt="2026-09-19T15:00:00.000Z"
        snapshot={completeProductSnapshot}
      />
    </div>
  );
}

function VisualReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="text-muted-foreground mx-auto max-w-7xl p-4 text-sm sm:p-8">
          Carregando revisão visual…
        </main>
      }
    >
      <VisualReviewContent />
    </Suspense>
  );
}

export default VisualReviewPage;
