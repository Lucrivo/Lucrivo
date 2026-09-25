const STAGING_PROJECT_REF = "camekuaudqgwawidieym";

function assertStagingSeedAllowed(input: {
  allow: string | undefined;
  linkedProjectRef: string;
}): void {
  if (input.allow !== "true") {
    throw new Error("ALLOW_STAGING_SEED=true is required");
  }
  if (input.linkedProjectRef.trim() !== STAGING_PROJECT_REF) {
    throw new Error("linked Supabase project is not lucrivo-staging");
  }
}

function assertStagingDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) throw new Error("STAGING_DATABASE_URL is required");
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("STAGING_DATABASE_URL is invalid");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !`${parsed.hostname} ${parsed.username}`.includes(STAGING_PROJECT_REF)
  ) {
    throw new Error("database URL is not for lucrivo-staging");
  }
  return databaseUrl;
}

export {
  STAGING_PROJECT_REF,
  assertStagingDatabaseUrl,
  assertStagingSeedAllowed,
};
