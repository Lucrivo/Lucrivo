import { describe, expect, it } from "vitest";

import { buildDemoCatalog } from "./user-scenarios";
import { renderDemoSeed } from "./render-seed";

describe("renderDemoSeed", () => {
  const catalog = buildDemoCatalog();
  const sql = renderDemoSeed(catalog);

  it("renders a deterministic guarded transaction", () => {
    expect(sql).toMatch(/^-- GENERATED FILE/);
    expect(sql).toContain("admin@seed.lucrivo.test / LucrivoSeed2026AA");
    expect(sql).toContain("begin;\nset local lock_timeout = '5s';");
    expect(sql).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(sql).toContain("demo_seed_refuses_to_replace_administrator");
    expect(
      sql.indexOf("demo_seed_refuses_to_replace_administrator"),
    ).toBeLessThan(
      sql.indexOf("delete from public.detailed_diagnosis_ingredients"),
    );
    expect(sql).toMatch(/commit;\n$/);
    expect(renderDemoSeed(catalog)).toBe(sql);
  });

  it("limits cleanup to the deterministic namespace", () => {
    expect(sql).not.toMatch(/truncate\s/i);
    expect(sql).not.toMatch(/delete from auth\.(users|identities)/i);
    expect(sql).not.toMatch(/delete from private\.admin_user_events/i);
    expect(sql).toContain("d1000000-0000-4000-8000-000000000000");
    expect(sql).toContain("d1000000-0000-4000-8000-000000000060");
    expect(sql).toContain("delete from private.admin_user_state");
  });

  it("batches operational data and emits exactly 295 report calls", () => {
    expect(sql).toContain("insert into auth.users");
    expect(sql).toContain("insert into auth.identities");
    expect(sql).toContain("insert into public.billing_contracts");
    expect(sql).toContain("insert into public.billing_payments");
    expect(
      sql.match(
        /select public\.create_(?:service|product|production|detailed)_diagnosis_report(?:_v\d+)?\(/g,
      ),
    ).toHaveLength(295);
  });

  it("creates reports before final states and enforces final invariants", () => {
    const lastReport = sql.lastIndexOf("select public.create_");
    expect(lastReport).toBeGreaterThan(0);
    expect(lastReport).toBeLessThan(
      sql.indexOf("insert into private.admin_user_state"),
    );
    expect(sql).toContain("demo_seed_invariant_failed");
    expect(sql).toContain("295");
    expect(sql).toContain("47880");
  });
});
