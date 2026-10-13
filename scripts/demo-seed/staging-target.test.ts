import { describe, expect, it } from "vitest";

import {
  STAGING_PROJECT_REF,
  assertStagingDatabaseUrl,
  assertStagingSeedAllowed,
  toPostgresEnvironment,
} from "./staging-target";

describe("assertStagingSeedAllowed", () => {
  it("requires the explicit opt-in", () => {
    expect(() =>
      assertStagingSeedAllowed({
        allow: undefined,
        linkedProjectRef: STAGING_PROJECT_REF,
      }),
    ).toThrow("ALLOW_STAGING_SEED=true is required");
  });

  it("rejects every project other than lucrivo-staging", () => {
    expect(() =>
      assertStagingSeedAllowed({
        allow: "true",
        linkedProjectRef: "vtnoweqrphdlzvbjsqxv",
      }),
    ).toThrow("linked Supabase project is not lucrivo-staging");
  });

  it("accepts the exact staging ref after opt-in", () => {
    expect(() =>
      assertStagingSeedAllowed({
        allow: "true",
        linkedProjectRef: ` ${STAGING_PROJECT_REF}\n`,
      }),
    ).not.toThrow();
  });

  it("also binds the database URL to the staging ref", () => {
    expect(() =>
      assertStagingDatabaseUrl(
        "postgresql://postgres.vtnoweqrphdlzvbjsqxv:secret@pooler.supabase.com/postgres",
      ),
    ).toThrow("database URL is not for lucrivo-staging");
    expect(
      assertStagingDatabaseUrl(
        `postgresql://postgres.${STAGING_PROJECT_REF}:secret@pooler.supabase.com/postgres`,
      ),
    ).toContain(STAGING_PROJECT_REF);
  });
});

describe("toPostgresEnvironment", () => {
  it("passes a staging URI to psql as separate connection parameters", () => {
    expect(
      toPostgresEnvironment(
        `postgresql://postgres.${STAGING_PROJECT_REF}:p%40ss@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require`,
      ),
    ).toEqual({
      PGCONNECT_TIMEOUT: "15",
      PGDATABASE: "postgres",
      PGHOST: "aws-0-sa-east-1.pooler.supabase.com",
      PGPASSWORD: "p@ss",
      PGPORT: "6543",
      PGSSLMODE: "require",
      PGUSER: `postgres.${STAGING_PROJECT_REF}`,
    });
  });

  it("uses the PostgreSQL default port and still requires TLS", () => {
    expect(
      toPostgresEnvironment(
        `postgresql://postgres:secret@db.${STAGING_PROJECT_REF}.supabase.co/postgres`,
      ),
    ).toMatchObject({
      PGDATABASE: "postgres",
      PGPORT: "5432",
      PGSSLMODE: "require",
    });
  });
});
