import { describe, expect, it } from "vitest";

import {
  getTurnstileSiteKey,
  isAuthFeatureEnabled,
  normalizeCaptchaToken,
  TURNSTILE_TEST_SITE_KEY,
} from "./auth-environment";

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

describe("normalizeCaptchaToken", () => {
  it("normalizes a non-empty token", () => {
    expect(normalizeCaptchaToken("  captcha-token  ")).toBe("captcha-token");
  });

  it.each([undefined, null, "", "   ", new File([], "token.txt")])(
    "rejects an invalid token value",
    (value) => {
      expect(normalizeCaptchaToken(value)).toBeUndefined();
    },
  );
});

describe("getTurnstileSiteKey", () => {
  it("allows the official test key outside production", () => {
    expect(getTurnstileSiteKey(TURNSTILE_TEST_SITE_KEY, "development")).toBe(
      TURNSTILE_TEST_SITE_KEY,
    );
  });

  it("rejects the official test key in production", () => {
    expect(() =>
      getTurnstileSiteKey(TURNSTILE_TEST_SITE_KEY, "production"),
    ).toThrow("Turnstile test site key is not allowed in production");
  });
});
