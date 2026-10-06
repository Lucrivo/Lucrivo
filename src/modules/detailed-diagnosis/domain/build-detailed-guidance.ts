import { deriveDetailedBreakEvenScenario } from "@/modules/reports/domain/detailed-break-even-scenario";
import { formatIntegerVolume } from "@/modules/reports/formatters";

import type {
  DetailedDiagnosisCalculation,
  DetailedDiagnosisCommand,
  DetailedGuidance,
  DetailedItemCalculation,
} from "../types";

const CONCENTRATION_THRESHOLD_BASIS_POINTS = 4_500;

function namesFor(
  command: DetailedDiagnosisCommand,
  itemIds: string[],
): string {
  const ids = new Set(itemIds);
  return command.items
    .filter((item) => ids.has(item.id))
    .map((item) => item.name)
    .join(", ");
}

function missingVolumeGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (!calculation.isPartial) return null;
  const scenario = deriveDetailedBreakEvenScenario(command, calculation);
  const references = command.items
    .flatMap((item) => {
      const reference = scenario.byItem.get(item.id);
      return reference
        ? [`${item.name}: ${formatIntegerVolume(reference.referenceVolume)} unidades`]
        : [];
    })
    .join(" · ");
  const names = namesFor(command, calculation.missingVolumeItemIds);
  return {
    key: "missing_volume",
    tone: "neutral",
    title:
      command.items.length === 1
        ? "Equilíbrio como referência"
        : "Equilíbrio como referência para itens sem quantidade",
    body:
      command.items.length === 1
        ? `Sem a quantidade de ${names}, mostramos quanto precisa vender para não ter prejuízo${references ? ` (${references})` : ""}. Informe a quantidade mensal para ver o resultado exato.`
        : `${references ? `Vendendo apenas aquele item, o equilíbrio seria: ${references}. ` : ""}Informe a quantidade mensal de ${names} para calcular o resultado do conjunto sem inventar uma proporção entre os itens.`,
    itemIds: calculation.missingVolumeItemIds,
  };
}

function directLossGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  const itemIds = calculation.items
    .filter((item) => item.directLoss)
    .map((item) => item.itemId);
  if (itemIds.length === 0) return null;
  return {
    key: "direct_loss",
    tone: "critical",
    title:
      itemIds.length === 1
        ? "Um item não paga seus valores diretos"
        : "Há itens que não pagam seus valores diretos",
    body: `${namesFor(command, itemIds)} não deixa valor para os gastos do mês no preço atual. Revise preço ou custo antes de ampliar as vendas.`,
    itemIds,
  };
}

function businessResultGuidance(
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (calculation.isPartial) return null;
  const content = {
    direct_loss: {
      tone: "critical",
      title: "Há perda direta no conjunto",
      body: "Revise os itens que não deixam valor para os gastos do mês.",
    },
    incomplete_volume: {
      tone: "neutral",
      title: "Faltam quantidades",
      body: "Informe todas as quantidades para calcular o resultado do conjunto.",
    },
    no_sales: {
      tone: "neutral",
      title: "O mês informado está sem vendas",
      body: "Com volume zero, o resultado corresponde aos gastos mensais.",
    },
    operational_loss: {
      tone: "critical",
      title: "O resultado estimado do mês ficou negativo",
      body: "O valor deixado pelas vendas é menor que os gastos mensais considerados.",
    },
    break_even: {
      tone: "neutral",
      title: "O resultado está no ponto de equilíbrio",
      body: "As vendas pagam exatamente os valores considerados, sem sobra.",
    },
    positive_result: {
      tone: "positive",
      title: "O resultado estimado do mês ficou positivo",
      body: `Depois dos valores considerados, o resultado do mês é ${calculation.monthlyResultCents ?? 0} centavos.`,
    },
  } as const;
  return {
    key: "business_result",
    ...content[calculation.verdict],
    itemIds: [],
  };
}

function positiveMonthlyItems(
  calculation: DetailedDiagnosisCalculation,
): DetailedItemCalculation[] {
  return calculation.items.filter(
    (item) =>
      item.monthlyContributionCents !== null &&
      item.monthlyContributionCents > 0,
  );
}

function concentrationGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (calculation.isPartial) return null;
  const positiveItems = positiveMonthlyItems(calculation);
  const total = positiveItems.reduce(
    (sum, item) => sum + BigInt(item.monthlyContributionCents ?? 0),
    BigInt(0),
  );
  const leading = positiveItems.reduce<DetailedItemCalculation | null>(
    (best, item) =>
      best === null ||
      (item.monthlyContributionCents ?? 0) >
        (best.monthlyContributionCents ?? 0)
        ? item
        : best,
    null,
  );
  if (
    leading === null ||
    BigInt(leading.monthlyContributionCents ?? 0) * BigInt(10_000) <=
      total * BigInt(CONCENTRATION_THRESHOLD_BASIS_POINTS)
  ) {
    return null;
  }
  return {
    key: "concentration",
    tone: "warning",
    title: "Um item deixa a maior parte do valor do conjunto",
    body: `${namesFor(command, [leading.itemId])} responde por mais de 45% do valor positivo deixado pelas vendas informadas.`,
    itemIds: [leading.itemId],
  };
}

function highVolumeLowerResultGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (calculation.isPartial) return null;
  const comparable = calculation.items.filter(
    (item) =>
      item.realMarginBasisPoints !== null && item.unitProfitCents !== null,
  );
  if (comparable.length < 2) return null;
  const volumeById = new Map(
    command.items.map((item) => [item.id, item.monthlySalesVolume ?? 0]),
  );
  const highestVolume = comparable.reduce((highest, item) =>
    (volumeById.get(item.itemId) ?? 0) > (volumeById.get(highest.itemId) ?? 0)
      ? item
      : highest,
  );
  const lowestMargin = Math.min(
    ...comparable.map((item) => item.realMarginBasisPoints ?? 0),
  );
  if (highestVolume.realMarginBasisPoints !== lowestMargin) return null;
  return {
    key: "high_volume_low_margin",
    tone: "neutral",
    title: "O item mais vendido deixa menos proporcionalmente",
    body: `${namesFor(command, [highestVolume.itemId])} tem a maior quantidade e deixa menos por venda do que os outros itens informados.`,
    itemIds: [highestVolume.itemId],
  };
}

function bestUnitResultGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  const candidates = calculation.items.filter(
    (item) => item.unitProfitCents !== null,
  );
  const best = candidates.reduce<DetailedItemCalculation | null>(
    (current, item) =>
      current === null ||
      (item.unitProfitCents ?? Number.MIN_SAFE_INTEGER) >
        (current.unitProfitCents ?? Number.MIN_SAFE_INTEGER)
        ? item
        : current,
    null,
  );
  if (best === null) return null;
  return {
    key: "best_unit_contribution",
    tone: "positive",
    title: "Este item deixa mais depois dos valores considerados",
    body: `${namesFor(command, [best.itemId])} deixa o maior valor por venda entre os itens com custo completo calculado.`,
    itemIds: [best.itemId],
  };
}

function buildDetailedGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance[] {
  return [
    missingVolumeGuidance(command, calculation),
    directLossGuidance(command, calculation),
    businessResultGuidance(calculation),
    concentrationGuidance(command, calculation),
    highVolumeLowerResultGuidance(command, calculation),
    bestUnitResultGuidance(command, calculation),
  ].filter((guidance): guidance is DetailedGuidance => guidance !== null);
}

export { CONCENTRATION_THRESHOLD_BASIS_POINTS, buildDetailedGuidance };
