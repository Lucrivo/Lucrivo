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
  const names = command.items
    .filter((item) => ids.has(item.id))
    .map((item) => item.name);
  if (names.length <= 1) return names[0] ?? "um item";
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} e ${names[2]}`;
  return `${names[0]}, ${names[1]} e outros ${names.length - 2} itens`;
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
        ? [
            `${item.name}: ${formatIntegerVolume(reference.referenceVolume)} unidades`,
          ]
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
  const plural = itemIds.length > 1;
  return {
    key: "direct_loss",
    tone: "critical",
    title:
      itemIds.length === 1
        ? "Um item não paga seus valores diretos"
        : "Há itens que não pagam seus valores diretos",
    body: `${namesFor(command, itemIds)} não ${plural ? "deixam" : "deixa"} valor para os gastos do mês no preço atual. Revise preço ou custo antes de ampliar as vendas.`,
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
  const highestContribution = Math.max(
    ...positiveItems.map((item) => item.monthlyContributionCents ?? 0),
  );
  const leaders = positiveItems.filter(
    (item) => item.monthlyContributionCents === highestContribution,
  );
  const [leading] = leaders;
  if (
    !leading ||
    BigInt(leading.monthlyContributionCents ?? 0) * BigInt(10_000) <=
      total * BigInt(CONCENTRATION_THRESHOLD_BASIS_POINTS)
  ) {
    return null;
  }
  const itemIds = leaders.map((item) => item.itemId);
  const plural = itemIds.length > 1;
  return {
    key: "concentration",
    tone: "warning",
    title: plural
      ? "Estes itens deixam a maior parte do valor do conjunto"
      : "Um item deixa a maior parte do valor do conjunto",
    body: plural
      ? `${namesFor(command, itemIds)} empatam e cada um responde por mais de 45% do valor positivo deixado pelas vendas informadas.`
      : `${namesFor(command, itemIds)} responde por mais de 45% do valor positivo deixado pelas vendas informadas.`,
    itemIds,
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
  const volumes = comparable.map((item) => volumeById.get(item.itemId) ?? 0);
  const highestVolume = Math.max(...volumes);
  if (highestVolume === Math.min(...volumes)) return null;
  const topSellers = comparable.filter(
    (item) => (volumeById.get(item.itemId) ?? 0) === highestVolume,
  );
  const smallerItems = comparable.filter(
    (item) => (volumeById.get(item.itemId) ?? 0) < highestVolume,
  );
  const worstSmallerMargin = Math.min(
    ...smallerItems.map((item) => item.realMarginBasisPoints ?? 0),
  );
  const groupLeavesLess = topSellers.every(
    (item) => (item.realMarginBasisPoints ?? 0) < worstSmallerMargin,
  );
  if (!groupLeavesLess) return null;

  const itemIds = topSellers.map((item) => item.itemId);
  const plural = itemIds.length > 1;
  return {
    key: "high_volume_low_margin",
    tone: "neutral",
    title: plural
      ? "Os itens mais vendidos deixam menos proporcionalmente"
      : "O item mais vendido deixa menos proporcionalmente",
    body: plural
      ? `${namesFor(command, itemIds)} têm a maior quantidade e deixam menos por venda do que os outros itens informados.`
      : `${namesFor(command, itemIds)} tem a maior quantidade e deixa menos por venda do que os outros itens informados.`,
    itemIds,
  };
}

function bestUnitResultGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  const candidates = calculation.items.filter(
    (item) => item.unitProfitCents !== null,
  );
  const bestResult = Math.max(
    ...candidates.map(
      (item) => item.unitProfitCents ?? Number.MIN_SAFE_INTEGER,
    ),
  );
  const hasLowerResult = candidates.some(
    (item) => (item.unitProfitCents ?? Number.MIN_SAFE_INTEGER) < bestResult,
  );
  if (!hasLowerResult) return null;

  const bestItems = candidates.filter(
    (item) => item.unitProfitCents === bestResult,
  );
  const itemIds = bestItems.map((item) => item.itemId);
  const plural = itemIds.length > 1;
  const names = namesFor(command, itemIds);
  if (bestResult < 0) {
    return {
      key: "best_unit_contribution",
      tone: "neutral",
      title: plural
        ? "Estes itens perdem menos por venda do que os outros"
        : "Este item perde menos por venda do que os outros",
      body: plural
        ? `${names} têm o prejuízo menor por venda entre os itens com custo completo calculado.`
        : `${names} tem o prejuízo menor por venda entre os itens com custo completo calculado.`,
      itemIds,
    };
  }
  return {
    key: "best_unit_contribution",
    tone: bestResult > 0 ? "positive" : "neutral",
    title: plural
      ? "Estes itens deixam mais depois dos valores considerados"
      : "Este item deixa mais depois dos valores considerados",
    body: plural
      ? `${names} deixam o maior valor por venda entre os itens com custo completo calculado.`
      : `${names} deixa o maior valor por venda entre os itens com custo completo calculado.`,
    itemIds,
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
