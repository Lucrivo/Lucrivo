import { describe, expect, it } from "vitest";

import { estimateAiUsage, formatAiCost } from "./report-ai-cost";

describe("admin report AI cost estimate", () => {
  it("uses the immutable standard gpt-6-luna nano-USD rates", () => {
    expect(
      estimateAiUsage([
        {
          model: "gpt-6-luna",
          inputTokens: 1_000_000,
          cachedInputTokens: 200_000,
          outputTokens: 100_000,
        },
      ]),
    ).toEqual({
      nanoUsd: 132_000_000,
      priceVersion: "openai-standard-2026-10-21",
    });
  });

  it("fails closed for unknown models and unsafe counters", () => {
    expect(
      estimateAiUsage([
        {
          model: "unknown",
          inputTokens: 10,
          cachedInputTokens: 0,
          outputTokens: 5,
        },
      ]),
    ).toBeNull();
    expect(
      estimateAiUsage([
        {
          model: "gpt-6-luna",
          inputTokens: Number.MAX_SAFE_INTEGER + 1,
          cachedInputTokens: 0,
          outputTokens: 0,
        },
      ]),
    ).toBeNull();
  });

  it("clamps uncached input and formats precise Portuguese USD copy", () => {
    const estimate = estimateAiUsage([
      {
        model: "gpt-6-luna",
        inputTokens: 10,
        cachedInputTokens: 20,
        outputTokens: 5,
      },
    ]);
    expect(estimate).toEqual({
      nanoUsd: 2_700,
      priceVersion: "openai-standard-2026-10-21",
    });
    expect(formatAiCost(estimate!)).toContain(
      "Estimativa pelos preços de 21/10/2026",
    );
    expect(formatAiCost(estimate!)).toContain("US$");
  });
});
