const STAGING_PROJECT_REF = "camekuaudqgwawidieym";

type PostgresEnvironment = {
  PGCONNECT_TIMEOUT: string;
  PGDATABASE: string;
  PGHOST: string;
  PGPASSWORD: string;
  PGPORT: string;
  PGSSLMODE: "require";
  PGUSER: string;
};

function parseStagingDatabaseUrl(databaseUrl: string | undefined): URL {
  if (!databaseUrl) throw new Error("STAGING_DATABASE_URL is required");
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("STAGING_DATABASE_URL is invalid");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !`${parsed.hostname} ${parsed.username}`.includes(STAGING_PROJECT_REF) ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password ||
    !parsed.pathname ||
    parsed.pathname === "/"
  ) {
    throw new Error("database URL is not for lucrivo-staging");
  }
  return parsed;
}

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
  parseStagingDatabaseUrl(databaseUrl);
  if (!databaseUrl) throw new Error("STAGING_DATABASE_URL is required");
  return databaseUrl;
}

function toPostgresEnvironment(databaseUrl: string): PostgresEnvironment {
  const parsed = parseStagingDatabaseUrl(databaseUrl);
  return {
    PGCONNECT_TIMEOUT: "15",
    PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
    PGHOST: parsed.hostname,
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGPORT: parsed.port || "5432",
    PGSSLMODE: "require",
    PGUSER: decodeURIComponent(parsed.username),
  };
}

export {
  STAGING_PROJECT_REF,
  assertStagingDatabaseUrl,
  assertStagingSeedAllowed,
  toPostgresEnvironment,
};
