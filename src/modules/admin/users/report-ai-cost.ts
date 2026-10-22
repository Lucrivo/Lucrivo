type AiModelUsage = {
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

type AiCostEstimate = {
  nanoUsd: number;
  priceVersion: string;
};

const AI_PRICE_CATALOG = {
  "gpt-6-luna": {
    version: "openai-standard-2026-10-21",
    source: "https://developers.openai.com/api/docs/pricing",
    inputNanoUsdPerToken: 100,
    cachedInputNanoUsdPerToken: 10,
    outputNanoUsdPerToken: 500,
  },
} as const;

function isSafeTokenCount(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function estimateAiUsage(models: AiModelUsage[]): AiCostEstimate | null {
  let nanoUsd = 0;
  let priceVersion: string | null = null;

  for (const usage of models) {
    const price =
      AI_PRICE_CATALOG[usage.model as keyof typeof AI_PRICE_CATALOG];
    if (
      !price ||
      !isSafeTokenCount(usage.inputTokens) ||
      !isSafeTokenCount(usage.cachedInputTokens) ||
      !isSafeTokenCount(usage.outputTokens)
    ) {
      return null;
    }

    const uncachedInputTokens = Math.max(
      usage.inputTokens - usage.cachedInputTokens,
      0,
    );
    const modelNanoUsd =
      uncachedInputTokens * price.inputNanoUsdPerToken +
      usage.cachedInputTokens * price.cachedInputNanoUsdPerToken +
      usage.outputTokens * price.outputNanoUsdPerToken;

    if (!Number.isSafeInteger(modelNanoUsd)) return null;
    nanoUsd += modelNanoUsd;
    if (!Number.isSafeInteger(nanoUsd)) return null;

    if (priceVersion !== null && priceVersion !== price.version) return null;
    priceVersion = price.version;
  }

  return priceVersion === null ? null : { nanoUsd, priceVersion };
}

const usdFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 9,
});

function formatAiCost(estimate: AiCostEstimate) {
  return `${usdFormatter.format(estimate.nanoUsd / 1_000_000_000)} · Estimativa pelos preços de 21/10/2026`;
}

export {
  AI_PRICE_CATALOG,
  estimateAiUsage,
  formatAiCost,
  type AiCostEstimate,
  type AiModelUsage,
};
