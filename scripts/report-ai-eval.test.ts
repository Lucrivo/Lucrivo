import { describe, expect, it } from "vitest";

import { checkForbiddenPatterns } from "./report-ai-eval";

describe("checkForbiddenPatterns", () => {
  it("reports every forbidden expression found in an answer", () => {
    expect(
      checkForbiddenPatterns("Sua margem saudável. Venda mais.", [
        /margem saudável/i,
        /venda mais/i,
      ]),
    ).toEqual({
      passed: false,
      matchedForbiddenPatterns: ["margem saudável", "venda mais"],
    });
  });
});
