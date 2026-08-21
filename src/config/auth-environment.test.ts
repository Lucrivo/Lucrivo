import { describe, expect, it } from "vitest";

import { isAuthFeatureEnabled } from "./auth-environment";

describe("isAuthFeatureEnabled", () => {
  it("enables the feature only for the explicit true value", () => {
    expect(isAuthFeatureEnabled("true")).toBe(true);
  });

  it.each([undefined, "", "false", "TRUE", "1", " true "])(
    "uses the safe disabled default for %s",
    (value) => {
      expect(isAuthFeatureEnabled(value)).toBe(false);
    },
  );
});
