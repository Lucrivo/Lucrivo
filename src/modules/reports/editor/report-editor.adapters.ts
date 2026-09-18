import type {
  DetailedDiagnosisInput,
  DetailedProductionItemInput,
} from "@/modules/detailed-diagnosis/types";

import {
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
  type ReportSnapshot,
} from "../types";
import type { EditableReportDraft } from "./report-editor.types";

function scaledIntegerToInput(value: number, scale: number): string {
  const factor = 10 ** scale;
  const whole = Math.trunc(value / factor);
  const remainder = Math.abs(value % factor);
  if (scale === 0) return String(whole);
  const fraction = String(remainder).padStart(scale, "0").replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : String(whole);
}

const centsToInput = (value: number) => scaledIntegerToInput(value, 2);
const basisPointsToInput = (value: number) => scaledIntegerToInput(value, 2);
const millionthsToInput = (value: number) => scaledIntegerToInput(value, 6);
const tenThousandthsToInput = (value: number) =>
  scaledIntegerToInput(value, 4);

function serviceHoursInput(minutes: number): string {
  return scaledIntegerToInput(Math.round((minutes * 100) / 60), 2);
}

function toEditableReportDraft(
  snapshot: ReportSnapshot,
  createId: () => string = () => crypto.randomUUID(),
): EditableReportDraft | null {
  if (
    snapshot.category === "service" &&
    snapshot.schemaVersion === SERVICE_REPORT_SCHEMA_VERSION &&
    snapshot.calculationVersion === SERVICE_REPORT_CALCULATION_VERSION &&
    snapshot.contentVersion === SERVICE_REPORT_CONTENT_VERSION &&
    "source" in snapshot
  ) {
    return {
      kind: "service",
      values: {
        submissionId: createId(),
        desiredMonthlyIncome: centsToInput(
          snapshot.inputs.desiredMonthlyIncomeCents,
        ),
        fixedMonthlyExpenses: centsToInput(
          snapshot.inputs.fixedMonthlyExpensesCents,
        ),
        pricingMethod: snapshot.source.pricingMethod,
        currentPrice: centsToInput(snapshot.source.currentPriceCents),
        dailyWorkHours: serviceHoursInput(snapshot.source.dailyWorkMinutes),
        weeklyWorkDays: String(snapshot.inputs.weeklyWorkDays),
        appointmentDurationMinutes: String(
          snapshot.source.appointmentDurationMinutes,
        ),
        hasMaterialCost: snapshot.source.materialCostUnit !== null,
        materialCost: centsToInput(snapshot.source.materialCostCents),
        materialCostUnit: snapshot.source.materialCostUnit ?? "hour",
        paysRevenueTax: snapshot.inputs.taxRateBasisPoints > 0,
        taxRate: basisPointsToInput(snapshot.inputs.taxRateBasisPoints),
        hasPaymentFee: snapshot.inputs.cardFeeRateBasisPoints > 0,
        paymentFeeRate: basisPointsToInput(
          snapshot.inputs.cardFeeRateBasisPoints,
        ),
      },
    };
  }

  if (
    snapshot.category === "product" &&
    !("analysisMode" in snapshot) &&
    snapshot.schemaVersion === PRODUCT_REPORT_SCHEMA_VERSION &&
    snapshot.calculationVersion === PRODUCT_CALCULATION_VERSION &&
    snapshot.contentVersion === PRODUCT_CONTENT_VERSION
  ) {
    return {
      kind: "product",
      values: {
        submissionId: createId(),
        productKind: snapshot.inputs.productKind,
        purchaseUnitCost: centsToInput(
          snapshot.inputs.purchaseUnitCostCents,
        ),
        unitSalePrice: centsToInput(snapshot.inputs.unitSalePriceCents),
        fixedMonthlyExpenses: centsToInput(
          snapshot.inputs.fixedMonthlyExpensesCents,
        ),
        monthlySalesVolume:
          snapshot.inputs.monthlySalesVolume === null
            ? ""
            : String(snapshot.inputs.monthlySalesVolume),
        proLaboreIncluded: snapshot.inputs.proLaboreIncluded,
        proLabore: centsToInput(snapshot.inputs.proLaboreCents),
        taxRate: basisPointsToInput(snapshot.inputs.taxRateBasisPoints),
        cardFeeRate: basisPointsToInput(
          snapshot.inputs.cardFeeRateBasisPoints,
        ),
      },
    };
  }

  if (
    snapshot.category === "production" &&
    !("analysisMode" in snapshot) &&
    snapshot.schemaVersion === PRODUCTION_REPORT_SCHEMA_VERSION &&
    snapshot.calculationVersion === PRODUCTION_CALCULATION_VERSION &&
    snapshot.contentVersion === PRODUCTION_CONTENT_VERSION
  ) {
    const inputs = snapshot.inputs;
    return {
      kind: "production",
      values: {
        submissionId: createId(),
        costCompositionEnabled: inputs.costCompositionEnabled,
        productionUnitCost: centsToInput(inputs.productionUnitCostCents),
        materialUnitCost: centsToInput(inputs.materialUnitCostCents ?? 0),
        packagingUnitCost: centsToInput(inputs.packagingUnitCostCents ?? 0),
        directLaborUnitCost: centsToInput(
          inputs.directLaborUnitCostCents ?? 0,
        ),
        otherVariableUnitCost: centsToInput(
          inputs.otherVariableUnitCostCents ?? 0,
        ),
        unitSalePrice: centsToInput(inputs.unitSalePriceCents),
        fixedMonthlyExpenses: centsToInput(inputs.fixedMonthlyExpensesCents),
        monthlySalesVolume:
          inputs.monthlySalesVolume === null
            ? ""
            : String(inputs.monthlySalesVolume),
        proLaboreIncluded: inputs.proLaboreIncluded,
        proLabore: centsToInput(inputs.proLaboreCents),
        taxRate: basisPointsToInput(inputs.taxRateBasisPoints),
        cardFeeRate: basisPointsToInput(inputs.cardFeeRateBasisPoints),
      },
    };
  }

  if (
    "analysisMode" in snapshot &&
    snapshot.analysisMode === "detailed" &&
    snapshot.schemaVersion === DETAILED_REPORT_SCHEMA_VERSION &&
    snapshot.calculationVersion === DETAILED_REPORT_CALCULATION_VERSION &&
    snapshot.contentVersion === DETAILED_REPORT_CONTENT_VERSION
  ) {
    const values: DetailedDiagnosisInput = {
      submissionId: createId(),
      category: snapshot.inputs.category,
      fixedMonthlyExpenses: centsToInput(
        snapshot.inputs.fixedMonthlyExpensesCents,
      ),
      proLaboreIncluded: snapshot.inputs.proLaboreIncluded,
      proLabore: centsToInput(snapshot.inputs.proLaboreCents),
      taxRate: basisPointsToInput(snapshot.inputs.taxRateBasisPoints),
      cardFeeRate: basisPointsToInput(
        snapshot.inputs.cardFeeRateBasisPoints,
      ),
      promotionMarginRate: basisPointsToInput(
        snapshot.inputs.promotionMarginBasisPoints,
      ),
      items: snapshot.inputs.items.map((item) => {
        const common = {
          id: item.id,
          name: item.name,
          unitSalePrice: centsToInput(item.unitSalePriceCents),
          monthlySalesVolume:
            item.monthlySalesVolume === null
              ? ""
              : String(item.monthlySalesVolume),
        };

        if (item.kind === "resale")
          return {
            ...common,
            kind: "resale" as const,
            purchaseUnitCost: centsToInput(item.purchaseUnitCostCents),
            packagingUnitCost: centsToInput(item.packagingUnitCostCents),
          };

        if (item.costMode === "summarized")
          return {
            ...common,
            kind: "manufacturing" as const,
            costMode: "summarized" as const,
            productionUnitCost: centsToInput(item.productionUnitCostCents),
            recipeYield: "",
            lossRate: "",
            packagingUnitCost: "",
            directLaborUnitCost: "",
            otherVariableUnitCost: "",
            ingredients: [],
          } satisfies DetailedProductionItemInput;

        return {
          ...common,
          kind: "manufacturing" as const,
          costMode: "technical_sheet" as const,
          productionUnitCost: "",
          recipeYield: String(item.recipeYield),
          lossRate: basisPointsToInput(item.lossRateBasisPoints),
          packagingUnitCost: centsToInput(item.packagingUnitCostCents),
          directLaborUnitCost: centsToInput(item.directLaborUnitCostCents),
          otherVariableUnitCost: centsToInput(
            item.otherVariableUnitCostCents,
          ),
          ingredients: item.ingredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.name,
            quantity: millionthsToInput(ingredient.quantityMillionths),
            unit: ingredient.unit,
            unitCost: tenThousandthsToInput(
              ingredient.unitCostTenThousandths,
            ),
          })),
        } satisfies DetailedProductionItemInput;
      }),
    };
    return { kind: "detailed", values };
  }

  return null;
}

function createDraftSubmissionId(draft: EditableReportDraft): EditableReportDraft {
  return {
    ...draft,
    values: { ...draft.values, submissionId: crypto.randomUUID() },
  } as EditableReportDraft;
}

export {
  basisPointsToInput,
  centsToInput,
  createDraftSubmissionId,
  millionthsToInput,
  scaledIntegerToInput,
  tenThousandthsToInput,
  toEditableReportDraft,
};
