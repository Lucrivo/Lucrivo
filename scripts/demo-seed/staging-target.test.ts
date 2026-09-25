import { describe, expect, it } from "vitest";

import {
  STAGING_PROJECT_REF,
  assertStagingDatabaseUrl,
  assertStagingSeedAllowed,
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
