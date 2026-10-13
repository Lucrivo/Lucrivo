import { describe, expect, it } from "vitest";

import { reportAiBehaviorCases } from "./report-ai-behavior-cases";

describe("report AI behavior cases", () => {
  it("covers every approved high-risk scenario with unique IDs", () => {
    const requiredIds = [
      "direct-loss",
      "operational-loss",
      "break-even",
      "positive-result",
      "unknown-volume",
      "zero-volume",
      "service-missing-capacity",
      "detailed-item-loss",
      "detailed-partial",
      "discount-request",
      "market-question",
      "customer-resistance",
      "prompt-injection",
      "out-of-scope",
    ];
    expect(reportAiBehaviorCases.map(({ id }) => id)).toEqual(requiredIds);
    expect(new Set(requiredIds).size).toBe(requiredIds.length);
  });

  it("uses only fictitious V2 context and explicit review criteria", () => {
    for (const behaviorCase of reportAiBehaviorCases) {
      expect(behaviorCase.context.schemaVersion).toBe(2);
      expect(behaviorCase.requiredBehaviors).not.toHaveLength(0);
      expect(behaviorCase.forbiddenBehaviors).not.toHaveLength(0);
      expect(JSON.stringify(behaviorCase.context)).not.toMatch(
        /user_id|submissionId|billing|@/,
      );
    }
  });
});
