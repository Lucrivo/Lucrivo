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

  it("cleans onboarding history and profiles before replacing seeded Auth rows", () => {
    const consentCleanup = sql.indexOf(
      "delete from private.whatsapp_consent_events",
    );
    const profileCleanup = sql.indexOf(
      "delete from public.onboarding_profiles",
    );
    const authReplacement = sql.indexOf("insert into auth.users");

    expect(consentCleanup).toBeGreaterThan(0);
    expect(profileCleanup).toBeGreaterThan(consentCleanup);
    expect(authReplacement).toBeGreaterThan(profileCleanup);
  });

  it("renders all client profiles through exact catalog-name joins", () => {
    const profileInsert = sql.indexOf("insert into public.onboarding_profiles");
    const identityInsert = sql.indexOf("insert into auth.identities");
    const firstReport = sql.indexOf("select public.create_");

    expect(profileInsert).toBeGreaterThan(identityInsert);
    expect(profileInsert).toBeLessThan(firstReport);
    expect(sql).toContain("join public.business_segments as segment");
    expect(sql).toContain("segment.name = seed.segment_name");
    expect(sql).toContain(
      "left join public.business_subcategories as subcategory",
    );
    expect(sql).toContain("subcategory.name = seed.subcategory_name");
    expect(sql.match(/Cliente Demonstração \d{3}/g)).toHaveLength(96);
    expect(sql).not.toContain("Cliente Demonstração 000");
  });

  it("renders one matching initial consent event for every profile", () => {
    const eventInsert = sql.indexOf(
      "insert into private.whatsapp_consent_events",
    );
    const eventSection = sql.slice(
      eventInsert,
      sql.indexOf("insert into public.billing_customers"),
    );

    expect(eventInsert).toBeGreaterThan(0);
    expect(eventSection).toContain("whatsapp-marketing-v1");
    expect(eventSection).toContain("'onboarding'::text");
    expect(eventSection.match(/'(?:granted|declined)'::text/g)).toHaveLength(
      96,
    );
  });

  it("batches operational data and emits exactly 288 report calls", () => {
    expect(sql).toContain("insert into auth.users");
    expect(sql).toContain("insert into auth.identities");
    expect(sql).toContain("insert into public.billing_contracts");
    expect(sql).toContain("insert into public.billing_payments");
    expect(sql).toContain("insert into public.bonus_access_grants");
    expect(
      sql.match(
        /select public\.create_(?:service|product|production|detailed)_diagnosis_report(?:_v\d+)?\(/g,
      ),
    ).toHaveLength(288);
  });

  it("renders permanent bonus grants from paid history", () => {
    const grantInsert = sql.indexOf("insert into public.bonus_access_grants");
    const paymentInsert = sql.indexOf("insert into public.billing_payments");

    expect(grantInsert).toBeGreaterThan(paymentInsert);
    expect(sql).toContain("on conflict (contract_id) do update set");
    expect(sql).toContain("revoked_at = excluded.revoked_at");
    expect(sql).toContain("revocation_reason = excluded.revocation_reason");
    expect(sql).toContain("'full_refund'::text");
    expect(sql).toContain("'chargeback'::text");
  });

  it("creates reports before final states and enforces final invariants", () => {
    const lastReport = sql.lastIndexOf("select public.create_");
    expect(lastReport).toBeGreaterThan(0);
    expect(lastReport).toBeLessThan(
      sql.indexOf("insert into private.admin_user_state"),
    );
    expect(sql).toContain("demo_seed_invariant_failed");
    expect(sql).toContain("288");
    expect(sql).toContain("'semiannual'");
    expect(sql).toContain("17940");
    expect(sql).toContain("6");
    expect(sql).not.toContain("'annual'");
    expect(sql).not.toContain("47880");
  });

  it("renders immutable standard and promotional contract snapshots", () => {
    expect(sql).toContain("catalog_code");
    expect(sql).toContain("bonus_months");
    expect(sql).toContain("renewal_adjustment_status");
    expect(sql).toContain("'standard'::text");
    expect(sql).toContain("'launch'::text");
    expect(sql).toContain("'launch_price'::text");
    expect(sql).toContain("20000000-0000-4000-8000-000000000005");
    expect(sql).toContain("20000000-0000-4000-8000-000000000006");
    expect(sql).toContain("sub_demo_launch_price_047");
    expect(sql).toContain("4990");
    expect(sql).toContain("23940");

    expect(
      catalog.contracts.filter(
        (contract) => contract.catalogCode === "standard",
      ).length,
    ).toBeGreaterThan(
      catalog.contracts.filter((contract) => contract.catalogCode === "launch")
        .length,
    );
    expect(catalog.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          catalogCode: "launch_price",
          billingMode: "monthly",
          accessMonths: 1,
          bonusMonths: 0,
          asaasSubscriptionId: "sub_demo_launch_price_047",
          renewalAdjustmentStatus: "completed",
        }),
        expect.objectContaining({
          catalogCode: "launch_price",
          billingMode: "semiannual",
          paymentMethod: "pix",
          accessMonths: 6,
          bonusMonths: 0,
          asaasSubscriptionId: null,
          renewalAdjustmentStatus: "not_required",
        }),
        expect.objectContaining({
          catalogCode: "launch",
          billingMode: "semiannual",
          accessMonths: 12,
          bonusMonths: 6,
        }),
        expect.objectContaining({
          catalogCode: "launch",
          billingMode: "monthly",
          accessMonths: 2,
          bonusMonths: 1,
          renewalAdjustmentStatus: "completed",
        }),
        expect.objectContaining({
          catalogCode: "launch",
          billingMode: "monthly",
          renewalAdjustmentStatus: "pending_reconciliation",
          renewalAdjustmentLastErrorCode: "provider_ambiguous",
        }),
      ]),
    );
  });
});
