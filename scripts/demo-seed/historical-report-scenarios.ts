import { parseProductReportSnapshot } from "@/modules/reports/schemas/product-report-snapshot.schema";
import { parseProductionReportSnapshot } from "@/modules/reports/schemas/production-report-snapshot.schema";

import type { SeedRpcCall, SeedSqlArgument, SqlCast } from "./model";
import {
  currentReportTemplates,
  type SeedReportTemplate,
} from "./report-scenarios";

function argument(
  name: string,
  value: SeedSqlArgument["value"],
  cast: SqlCast,
): SeedSqlArgument {
  return { name, value, cast };
}

function legacySnapshot(category: "product" | "production") {
  const production = category === "production";
  return {
    category,
    scenario: production ? "manufacturing" : "resale",
    currency: "BRL",
    unit: "unit",
    policy: {
      targetMarginBasisPoints: 2000,
      weeklyDivisorHundredths: 433,
      operatingDaysPerWeek: 6,
      maximumDiscountPercent: 50,
      proLaboreIncluded: true,
    },
    inputs: production
      ? {
          costCompositionEnabled: true,
          productionUnitCostCents: 5000,
          materialUnitCostCents: 3000,
          packagingUnitCostCents: 500,
          directLaborUnitCostCents: 1000,
          otherVariableUnitCostCents: 500,
          unitSalePriceCents: 15000,
          fixedMonthlyExpensesCents: 100000,
          monthlySalesVolume: 100,
          proLaboreIncluded: true,
          proLaboreCents: 200000,
          taxRateBasisPoints: 600,
          cardFeeRateBasisPoints: 200,
        }
      : {
          purchaseUnitCostCents: 5000,
          unitSalePriceCents: 15000,
          fixedMonthlyExpensesCents: 100000,
          monthlySalesVolume: 100,
          proLaboreIncluded: true,
          proLaboreCents: 200000,
          taxRateBasisPoints: 600,
          cardFeeRateBasisPoints: 200,
        },
    results: {
      effectiveFixedCostCents: 300000,
      ...(production
        ? { productionUnitCostCents: 5000 }
        : { purchaseUnitCostCents: 5000 }),
      fixedAllocationCents: 3000,
      totalUnitCostCents: 8000,
      currentPriceCents: 15000,
      netRevenueCents: 13800,
      unitContributionCents: 8800,
      unitProfitCents: 5800,
      realMarginBasisPoints: 3867,
      minimumPriceCents: 8696,
      targetPriceCents: 11112,
      priceReferencesPartial: false,
      monthlySalesGoal: 35,
      weeklySalesGoal: 9,
      dailySalesGoal: 2,
      breakEvenDiscountPercent: 42,
      verdict: "above_target",
      priority: "volume",
    },
    executiveSummary: {
      headline: production ? "Sua produção dá lucro?" : "Seu produto dá lucro?",
      introduction: production
        ? "Veja quanto sobra de cada unidade vendida e o que merece sua atenção primeiro."
        : "Veja quanto sobra de cada venda e o que merece sua atenção primeiro.",
      verdict: {
        label: "Acima da meta",
        body: "O preço paga todos os gastos e passa da meta de 20%. Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
        tone: "positive",
      },
      facts: [
        {
          key: "margin",
          currentLabel: "Quanto sobra a cada R$ 100",
          currentValue: "38,67%",
          referenceLabel: "Meta",
          referenceValue: "20%",
        },
        {
          key: "price",
          currentLabel: "Preço atual",
          currentValue: "R$ 150,00",
          referenceLabel: "Preço para alcançar a meta",
          referenceValue: "R$ 111,12",
        },
      ],
      priority: {
        label: "Quantidade de vendas",
        body: "O preço alcança a meta. Agora mantenha a quantidade de vendas usada no cálculo.",
      },
      answers: [
        {
          key: "profitability",
          question: "Estou ganhando dinheiro?",
          answer:
            "Sim — sobram R$ 58,00 por unidade depois de pagar os gastos considerados.",
        },
        {
          key: "price_sufficiency",
          question: "Estou cobrando o preço certo?",
          answer:
            "Sim — seu preço alcança o valor calculado para a meta de 20%.",
        },
        {
          key: "immediate_action",
          question: "O que preciso fazer agora?",
          answer:
            "Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
        },
      ],
    },
    sections: [
      {
        key: "break_even",
        title: "1 · Ponto de equilíbrio",
        body: production
          ? "O preço mínimo de R$ 86,96 por unidade inclui o custo de fabricação, as taxas e o rateio dos custos fixos."
          : "O preço mínimo de R$ 86,96 por unidade inclui o custo de compra, as taxas e o rateio dos custos fixos.",
        emphasisLabel: "Preço mínimo",
        emphasisValue: "R$ 86,96",
        tone: "positive",
      },
      {
        key: "hidden_cost",
        title: "2 · O custo escondido da unidade",
        body: production
          ? "A mão de obra direta integra o custo de fabricação; o pró-labore integra os custos fixos e não deve ser contado novamente. Além do custo de fabricação, cada unidade recebe R$ 30,00 de custos fixos rateados. O custo total por unidade chega a R$ 80,00."
          : "Além do custo de compra, cada unidade recebe R$ 30,00 de custos fixos rateados. O custo total por unidade chega a R$ 80,00.",
        emphasisLabel: "Custo total por unidade",
        emphasisValue: "R$ 80,00",
        tone: "neutral",
      },
      {
        key: "margin_diagnosis",
        title: "3 · Diagnóstico da margem",
        body: "A margem real supera a meta de 20%; valide o preço no mercado e mantenha o volume.",
        emphasisLabel: "Margem real",
        emphasisValue: "38,67%",
        tone: "positive",
      },
      {
        key: "sales_goal",
        title: "Meta de vendas",
        body: "Com a contribuição por unidade atual, a referência é 35 unidades por mês, 9 por semana e 2 por dia, considerando 6 dias de operação por semana.",
        emphasisLabel: "Meta mensal",
        emphasisValue: "35 unidades",
        tone: "positive",
      },
      {
        key: "discount_simulator",
        title: production
          ? "Quanto de desconto cabe na produção?"
          : "Quanto de desconto cabe no produto?",
        body: "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
        emphasisLabel: "Limite antes do prejuízo",
        emphasisValue: "42%",
        tone: "neutral",
      },
    ],
    discountSimulationBase: {
      originalPriceCents: 15000,
      unitCostCents: 8000,
      totalFeeBasisPoints: 800,
      targetMarginBasisPoints: 2000,
      minimumPriceCents: 8696,
      partial: false,
    },
    schemaVersion: 1,
    calculationVersion: 1,
    contentVersion: 2,
  };
}

const productSnapshot = parseProductReportSnapshot(legacySnapshot("product"));
const productionSnapshot = parseProductionReportSnapshot(
  legacySnapshot("production"),
);

function legacyProductRpc(submissionId: string): SeedRpcCall {
  return {
    functionName: "public.create_product_diagnosis_report",
    arguments: [
      argument("p_submission_id", submissionId, "uuid"),
      argument("p_purchase_unit_cost_cents", 5000, "bigint"),
      argument("p_unit_sale_price_cents", 15000, "bigint"),
      argument("p_fixed_monthly_expenses_cents", 100000, "bigint"),
      argument("p_monthly_sales_volume", 100, "integer"),
      argument("p_pro_labore_included", true, "boolean"),
      argument("p_pro_labore_cents", 200000, "bigint"),
      argument("p_tax_rate_basis_points", 600, "integer"),
      argument("p_card_fee_rate_basis_points", 200, "integer"),
      argument("p_schema_version", 1, "smallint"),
      argument("p_calculation_version", 1, "smallint"),
      argument("p_content_version", 2, "smallint"),
      argument("p_scenario", "resale", "text"),
      argument("p_current_price_cents", 15000, "bigint"),
      argument("p_real_margin_basis_points", 3867, "integer"),
      argument("p_unit_profit_cents", 5800, "bigint"),
      argument("p_verdict", "above_target", "text"),
      argument("p_priority", "volume", "text"),
      argument("p_unit", "unit", "text"),
      argument("p_report_snapshot", productSnapshot, "jsonb"),
    ],
  };
}

function legacyProductionRpc(submissionId: string): SeedRpcCall {
  return {
    functionName: "public.create_production_diagnosis_report",
    arguments: [
      argument("p_submission_id", submissionId, "uuid"),
      argument("p_cost_composition_enabled", true, "boolean"),
      argument("p_production_unit_cost_cents", 5000, "bigint"),
      argument("p_material_unit_cost_cents", 3000, "bigint"),
      argument("p_packaging_unit_cost_cents", 500, "bigint"),
      argument("p_direct_labor_unit_cost_cents", 1000, "bigint"),
      argument("p_other_variable_unit_cost_cents", 500, "bigint"),
      argument("p_unit_sale_price_cents", 15000, "bigint"),
      argument("p_fixed_monthly_expenses_cents", 100000, "bigint"),
      argument("p_monthly_sales_volume", 100, "integer"),
      argument("p_pro_labore_included", true, "boolean"),
      argument("p_pro_labore_cents", 200000, "bigint"),
      argument("p_tax_rate_basis_points", 600, "integer"),
      argument("p_card_fee_rate_basis_points", 200, "integer"),
      argument("p_schema_version", 1, "smallint"),
      argument("p_calculation_version", 1, "smallint"),
      argument("p_content_version", 2, "smallint"),
      argument("p_scenario", "manufacturing", "text"),
      argument("p_current_price_cents", 15000, "bigint"),
      argument("p_real_margin_basis_points", 3867, "integer"),
      argument("p_unit_profit_cents", 5800, "bigint"),
      argument("p_verdict", "above_target", "text"),
      argument("p_priority", "volume", "text"),
      argument("p_unit", "unit", "text"),
      argument("p_report_snapshot", productionSnapshot, "jsonb"),
    ],
  };
}

const historicalReportTemplates: SeedReportTemplate[] = [
  {
    key: "product.quick.above_target.legacy",
    category: "product",
    analysisMode: "quick",
    expectedVerdict: "above_target",
    materialize(ids) {
      return {
        templateKey: this.key,
        submissionId: ids.submissionId,
        verdict: "above_target",
        priority: "volume",
        rpc: legacyProductRpc(ids.submissionId),
      };
    },
  },
  {
    key: "production.quick.above_target.legacy",
    category: "production",
    analysisMode: "quick",
    expectedVerdict: "above_target",
    materialize(ids) {
      return {
        templateKey: this.key,
        submissionId: ids.submissionId,
        verdict: "above_target",
        priority: "volume",
        rpc: legacyProductionRpc(ids.submissionId),
      };
    },
  },
];

const allAdminReportTemplates: SeedReportTemplate[] = [
  ...currentReportTemplates,
  ...historicalReportTemplates,
];

export { allAdminReportTemplates, historicalReportTemplates };
