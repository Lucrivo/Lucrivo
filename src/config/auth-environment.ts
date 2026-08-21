const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

function isAuthFeatureEnabled(value: string | undefined): boolean {
  return value === "true";
}

function normalizeCaptchaToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.trim();
  return token || undefined;
}

function getTurnstileSiteKey(
  value: string | undefined,
  nodeEnv: string | undefined,
): string {
  const siteKey = value?.trim() ?? "";

  if (nodeEnv === "production" && siteKey === TURNSTILE_TEST_SITE_KEY) {
    throw new Error("Turnstile test site key is not allowed in production");
  }

  return siteKey;
}

export {
  getTurnstileSiteKey,
  isAuthFeatureEnabled,
  normalizeCaptchaToken,
  TURNSTILE_TEST_SITE_KEY,
};
