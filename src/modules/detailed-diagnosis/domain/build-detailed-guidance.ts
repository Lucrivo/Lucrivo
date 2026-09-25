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

function buildMissingVolumeGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (!calculation.isPartial) return null;

  return {
    key: "missing_volume",
    tone: "neutral",
    title: "Falta informar algumas vendas",
    body: `Informe o volume mensal de ${namesFor(command, calculation.missingVolumeItemIds)} para concluir o resultado geral. Os valores por unidade continuam disponíveis.`,
    itemIds: calculation.missingVolumeItemIds,
  };
}

function buildDirectLossGuidance(
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
        ? "Um item não se paga por venda"
        : "Há itens que não se pagam por venda",
    body: `${namesFor(command, itemIds)} não cobre custos variáveis e taxas com o preço atual. Revise preço ou custos antes de ampliar as vendas.`,
    itemIds,
  };
}

function buildBusinessResultGuidance(
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (calculation.isPartial) return null;

  const content: Record<
    DetailedDiagnosisCalculation["verdict"],
    Pick<DetailedGuidance, "tone" | "title" | "body">
  > = {
    direct_loss: {
      tone: "critical",
      title: "O conjunto de itens contém perda por venda",
      body: "Corrija os itens que não deixam contribuição antes de buscar mais volume.",
    },
    incomplete_volume: {
      tone: "neutral",
      title: "Faltam dados para concluir",
      body: "Informe todos os volumes para calcular o resultado do negócio.",
    },
    no_sales: {
      tone: "warning",
      title: "O mês está sem vendas",
      body: "Com volume zero, os gastos mensais permanecem sem cobertura.",
    },
    operational_loss: {
      tone: "critical",
      title: "As vendas não cobrem os gastos mensais",
      body: "O valor deixado por todos os itens ainda é menor que os gastos mensais considerados.",
    },
    break_even: {
      tone: "warning",
      title: "O negócio está no ponto de equilíbrio",
      body: "As vendas cobrem exatamente os gastos mensais, sem formar margem final.",
    },
    tight_margin: {
      tone: "warning",
      title: "O resultado tem pouca folga",
      body: "O conjunto de itens supera os gastos mensais, mas a margem final ainda é apertada.",
    },
    adequate_margin: {
      tone: "positive",
      title: "O conjunto de itens cobre os gastos com folga",
      body: "O resultado mensal está acima do ponto de equilíbrio e tem margem adequada.",
    },
  };

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

function buildConcentrationGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (calculation.isPartial) return null;

  const positiveItems = positiveMonthlyItems(calculation);
  const totalPositiveContribution = positiveItems.reduce(
    (sum, item) => sum + BigInt(item.monthlyContributionCents ?? 0),
    BigInt(0),
  );
  const leadingItem = positiveItems.reduce<DetailedItemCalculation | null>(
    (best, item) =>
      best === null ||
      (item.monthlyContributionCents ?? 0) >
        (best.monthlyContributionCents ?? 0)
        ? item
        : best,
    null,
  );

  if (
    leadingItem === null ||
    BigInt(leadingItem.monthlyContributionCents ?? 0) * BigInt(10_000) <=
      totalPositiveContribution * BigInt(CONCENTRATION_THRESHOLD_BASIS_POINTS)
  ) {
    return null;
  }

  return {
    key: "concentration",
    tone: "warning",
    title: "A contribuição está concentrada em um item",
    body: `${namesFor(command, [leadingItem.itemId])} responde por mais de 45% do valor positivo deixado pelo conjunto de itens. Acompanhe essa dependência.`,
    itemIds: [leadingItem.itemId],
  };
}

function buildHighVolumeLowMarginGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  if (calculation.isPartial) return null;

  const positiveMarginItems = calculation.items.filter(
    (item) =>
      item.contributionMarginBasisPoints !== null &&
      item.contributionMarginBasisPoints > 0,
  );
  if (positiveMarginItems.length < 2) return null;

  const volumeById = new Map(
    command.items.map((item) => [item.id, item.monthlySalesVolume ?? 0]),
  );
  const highestVolumeItem = positiveMarginItems.reduce((highest, item) =>
    (volumeById.get(item.itemId) ?? 0) > (volumeById.get(highest.itemId) ?? 0)
      ? item
      : highest,
  );
  const worstPositiveMargin = Math.min(
    ...positiveMarginItems.map(
      (item) => item.contributionMarginBasisPoints ?? Number.MAX_SAFE_INTEGER,
    ),
  );
  if (highestVolumeItem.contributionMarginBasisPoints !== worstPositiveMargin) {
    return null;
  }

  return {
    key: "high_volume_low_margin",
    tone: "warning",
    title: "O item mais vendido tem a menor margem positiva",
    body: `${namesFor(command, [highestVolumeItem.itemId])} lidera o volume, mas deixa proporcionalmente menos por venda. Uma pequena melhoria nele pode ter impacto recorrente.`,
    itemIds: [highestVolumeItem.itemId],
  };
}

function buildBestUnitContributionGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance | null {
  const bestItem = calculation.items.reduce<DetailedItemCalculation | null>(
    (best, item) =>
      best === null || item.unitContributionCents > best.unitContributionCents
        ? item
        : best,
    null,
  );
  if (bestItem === null || bestItem.unitContributionCents <= 0) return null;

  return {
    key: "best_unit_contribution",
    tone: "positive",
    title: "Este item deixa mais valor por venda",
    body: `${namesFor(command, [bestItem.itemId])} deixa o maior valor por venda entre os itens analisados.`,
    itemIds: [bestItem.itemId],
  };
}

function buildDetailedGuidance(
  command: DetailedDiagnosisCommand,
  calculation: DetailedDiagnosisCalculation,
): DetailedGuidance[] {
  return [
    buildMissingVolumeGuidance(command, calculation),
    buildDirectLossGuidance(command, calculation),
    buildBusinessResultGuidance(calculation),
    buildConcentrationGuidance(command, calculation),
    buildHighVolumeLowMarginGuidance(command, calculation),
    buildBestUnitContributionGuidance(command, calculation),
  ].filter((guidance): guidance is DetailedGuidance => guidance !== null);
}

export { CONCENTRATION_THRESHOLD_BASIS_POINTS, buildDetailedGuidance };
