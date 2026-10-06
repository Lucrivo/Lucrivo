import {
  formatBasisPoints,
  formatCurrency,
  formatIntegerVolume,
} from "../formatters";
import type { ReportExecutiveSummary } from "../types";
import type { BreakEvenScenario } from "./break-even-scenario";

type ScenarioUnitWord = "vendas" | "unidades";

const BREAK_EVEN_REFERENCE_VERDICT = {
  label: "Equilíbrio como referência",
  body: "Sem a quantidade vendida, mostramos quanto você precisa vender para não ter prejuízo.",
  tone: "neutral",
} as const satisfies ReportExecutiveSummary["verdict"];

const BREAK_EVEN_REFERENCE_PRIORITY_BODY =
  "Use a quantidade de equilíbrio como referência e informe suas vendas para ver o resultado exato.";

function volumeLabel(count: number, unitWord: ScenarioUnitWord): string {
  return `${formatIntegerVolume(count)} ${unitWord}`;
}

function scenarioContributionText(
  scenario: BreakEvenScenario,
  unitContributionCents: number,
  unitWord: ScenarioUnitWord,
): string {
  const saleWord = unitWord === "vendas" ? "venda" : "unidade vendida";
  const share =
    scenario.contributionMarginBasisPoints === null
      ? ""
      : ` (${formatBasisPoints(scenario.contributionMarginBasisPoints)} do preço)`;
  return `Cada ${saleWord} deixa ${formatCurrency(unitContributionCents)}${share} para pagar os gastos do mês.`;
}

function scenarioMinimumPriceBody(
  scenario: BreakEvenScenario,
  unitWord: ScenarioUnitWord,
): string {
  return `Vendendo ${volumeLabel(scenario.referenceVolume, unitWord)} no mês, este é o preço de equilíbrio: cada unidade paga ${formatCurrency(scenario.fixedAllocationCents)} dos gastos do mês e nada sobra nem falta.`;
}

function scenarioMonthlyBody(
  scenario: BreakEvenScenario,
  unitContributionCents: number,
  unitWord: ScenarioUnitWord,
): string {
  return `Sem a quantidade vendida, mostramos o ponto de equilíbrio: com ${volumeLabel(scenario.referenceVolume, unitWord)} no mês não há lucro nem prejuízo. ${scenarioContributionText(scenario, unitContributionCents, unitWord)}`;
}

function scenarioSalesGoalBody(
  scenario: BreakEvenScenario,
  unitWord: ScenarioUnitWord,
): string {
  return `Para não ter prejuízo no preço atual, a referência é vender ${volumeLabel(scenario.referenceVolume, unitWord)} no mês, cerca de ${formatIntegerVolume(scenario.weeklyGoal)} por semana e ${formatIntegerVolume(scenario.dailyGoal)} por dia.`;
}

function scenarioDiscountBody(
  scenario: BreakEvenScenario,
  unitWord: ScenarioUnitWord,
): string {
  return `No ponto de equilíbrio não há folga para desconto: qualquer desconto exige vender mais do que ${volumeLabel(scenario.referenceVolume, unitWord)} no mês.`;
}

function scenarioProfitabilityAnswer(
  scenario: BreakEvenScenario,
  unitContributionCents: number,
  unitWord: ScenarioUnitWord,
): string {
  const extraWord = unitWord === "vendas" ? "venda" : "unidade";
  return `Depende de quanto você vende. No preço atual, você precisa de ${volumeLabel(scenario.referenceVolume, unitWord)} no mês para não ter prejuízo; cada ${extraWord} a mais deixa ${formatCurrency(unitContributionCents)} de lucro.`;
}

function scenarioPriceSufficiencyAnswer(
  scenario: BreakEvenScenario,
  unitWord: ScenarioUnitWord,
): string {
  return `Sim, se você vender pelo menos ${volumeLabel(scenario.referenceVolume, unitWord)} no mês. Com essa quantidade, o preço atual é o preço de equilíbrio.`;
}

function scenarioImmediateAction(
  scenario: BreakEvenScenario,
  unitWord: ScenarioUnitWord,
): string {
  const usual =
    unitWord === "vendas"
      ? "quantas vendas costuma fazer no mês"
      : "quantas unidades costuma vender no mês";
  return `Confira se ${volumeLabel(scenario.referenceVolume, unitWord)} por mês é realista para você. Para ver o resultado exato, informe ${usual}.`;
}

export {
  BREAK_EVEN_REFERENCE_PRIORITY_BODY,
  BREAK_EVEN_REFERENCE_VERDICT,
  scenarioContributionText,
  scenarioDiscountBody,
  scenarioImmediateAction,
  scenarioMinimumPriceBody,
  scenarioMonthlyBody,
  scenarioPriceSufficiencyAnswer,
  scenarioProfitabilityAnswer,
  scenarioSalesGoalBody,
  type ScenarioUnitWord,
};
