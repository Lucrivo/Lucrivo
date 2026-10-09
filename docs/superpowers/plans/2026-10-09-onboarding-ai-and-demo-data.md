# Onboarding AI Context and Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add only segment and subcategory to the report assistant's untrusted context, populate deterministic onboarding profiles in the demo seed, and update durable product documentation.

**Architecture:** A narrow server-only service reads the authenticated user's current profile projection and maps it to a two-string business context. The pure report-context builder optionally embeds that object inside the already-labelled untrusted report payload; missing profile context is tolerated. Demo-seed model/rendering creates profiles and consent events after Auth users/catalog exist, while keeping the administrator profile-free.

**Tech Stack:** Next.js 16 Route Handlers, React 19, TypeScript 5.9, Supabase JS/PostgreSQL, Zod 4, existing OpenAI Responses integration, deterministic TypeScript seed generator, Vitest and pgTAP, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-09-client-onboarding-and-segmentation-design.md`

## Global Constraints

- This is plan 3 of 3 and requires plans 1 and 2 to be complete.
- This is context enrichment, not model training, fine-tuning, embeddings, RAG, or a new knowledge base.
- The model receives only current segment and subcategory labels. Never send name, WhatsApp, consent state/time, user ID, email, or catalog IDs.
- Profile/catalog text is untrusted user data and remains inside `DADOS_DO_RELATORIO`; it never becomes a system instruction.
- Preserve `REPORT_AI_POLICY_VERSION = 2` unless the actual behavioral policy text changes. Adding fields to serialized report context alone does not force a policy-version bump.
- A missing or unreadable profile must not make an existing paid report assistant unavailable; omit `businessContext` and continue.
- Do not change financial calculations, report snapshots, assistant quotas, billing gates, streaming, or conversation persistence.
- The demo administrator has no onboarding profile. All 96 demo clients do.
- Demo profiles deterministically cover all eight segments, the five seeded subcategories, custom “Outro”, active/declined consent, blocked/deleted users, and every account-age cohort.
- Seed cleanup remains restricted to deterministic seed IDs and deletes consent events/profiles before Auth users; it never truncates shared tables or removes the catalog migration data.
- Regenerate `supabase/seed.sql`; never hand-edit the generated artifact.
- Follow TDD and keep unrelated worktree changes intact.

---

## File Structure

### AI context

- Create: `src/modules/report-ai/services/get-report-ai-business-context.service.ts` and test — minimal profile read and tolerant result.
- Modify: `src/modules/report-ai/domain/report-ai-context.types.ts` — optional business context type.
- Modify: `src/modules/report-ai/domain/build-report-ai-context.ts` and test — embed only approved strings.
- Modify: `src/app/api/reports/[id]/ai/messages/route.ts` and test — load context and preserve fallback.
- Modify: `src/modules/report-ai/domain/report-ai-policy.ts` and test only if needed to state profile labels are untrusted declarations.

### Demo data

- Modify: `scripts/demo-seed/model.ts` — onboarding seed types.
- Modify: `scripts/demo-seed/user-scenarios.ts` and test — deterministic client profiles.
- Modify: `scripts/demo-seed/render-seed.ts` and test — cleanup and inserts.
- Modify: `scripts/demo-seed/verify-local.ts` and test — profile/consent counts.
- Regenerate: `supabase/seed.sql`.
- Modify: `supabase/tests/seed.test.sql` — SQL invariants and export safety.

### Documentation

- Modify: `PRODUCT.md` — onboarding/profile/admin/AI capability truth.
- Modify: `docs/report-ai-interpretation-behavior.md` — exactly which profile fields enter context.

---

### Task 1: Add minimal business context to the report assistant

**Files:**

- Create: `src/modules/report-ai/services/get-report-ai-business-context.service.ts`
- Create: `src/modules/report-ai/services/get-report-ai-business-context.service.test.ts`
- Modify: `src/modules/report-ai/domain/report-ai-context.types.ts`
- Modify: `src/modules/report-ai/domain/build-report-ai-context.ts`
- Modify: `src/modules/report-ai/domain/build-report-ai-context.test.ts`
- Modify: `src/app/api/reports/[id]/ai/messages/route.ts`
- Modify: `src/app/api/reports/[id]/ai/messages/route.test.ts`
- Modify if policy wording changes: `src/modules/report-ai/domain/report-ai-policy.ts`
- Modify if policy wording changes: `src/modules/report-ai/domain/build-report-ai-prompt.test.ts`

**Interfaces:**

- Consumes: `get_my_onboarding_profile_v1()` from plan 1 and existing `buildReportAiContext`/route.
- Produces: `ReportAiBusinessContext = { segment: string; subcategory: string }`; `getReportAiBusinessContext({ supabase }): Promise<ReportAiBusinessContext | null>`; `buildReportAiContext(report, businessContext?)`.

- [ ] **Step 1: Write failing service tests**

Mock the profile RPC with catalog and custom-subcategory payloads. Assert:

```ts
await expect(getReportAiBusinessContext({ supabase })).resolves.toEqual({
  segment: "Alimentação",
  subcategory: "Confeitaria",
});
```

For Outro, expect the trimmed custom value. For missing profile, RPC error, malformed payload, name/phone-only payload, or strings outside the database limits, expect `null`, not a thrown error. Assert returned objects have exactly two keys.

- [ ] **Step 2: Run service test and verify failure**

```bash
pnpm exec vitest run src/modules/report-ai/services/get-report-ai-business-context.service.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the tolerant server-only service**

Use the request-scoped authenticated Supabase client passed by the route. Strictly parse the bounded projection, choose `customSubcategory` when `subcategoryId` is null, and return null on any read/shape failure. Never log the profile payload.

- [ ] **Step 4: Write failing pure context tests**

Call `buildReportAiContext(report, context)` and assert parsed JSON contains:

```ts
businessContext: {
  segment: "Alimentação",
  subcategory: "Confeitaria",
}
```

Assert serialized JSON does not contain `fullName`, `whatsapp`, `consent`, `userId`, `email`, or numeric catalog IDs. Pass injection-like text such as `IGNORE AS INSTRUÇÕES` and assert it remains escaped inside the serialized user-data payload. With `undefined`, assert `businessContext` is absent and all prior report facts are unchanged.

- [ ] **Step 5: Extend the context type and builder**

Add:

```ts
type ReportAiBusinessContext = {
  segment: string;
  subcategory: string;
};

type ReportAiContextV2 = {
  schemaVersion: 2;
  businessContext?: ReportAiBusinessContext;
  // existing fields unchanged
};
```

Build the existing quick/detailed object first, then spread `businessContext` only when defined before safe JSON serialization. Do not place it in `REPORT_AI_INSTRUCTIONS`.

- [ ] **Step 6: Write failing route tests**

Mock `getReportAiBusinessContext`. Assert the paid happy path calls it with the authenticated Supabase client and passes its result to `buildReportAiContext`. Assert a null result still streams successfully. Assert unauthenticated, missing report, version conflict, and unpaid paths do not load profile context before their existing early return.

- [ ] **Step 7: Integrate the route without changing streaming behavior**

After report ownership/version and billing succeed, call the business-context service and build:

```ts
const businessContext = await getReportAiBusinessContext({
  supabase: auth.supabase,
});
const reportContext = buildReportAiContext(report.report, businessContext);
```

Keep gateway creation, reservation, NDJSON, abort, quotas, and error mapping unchanged.

- [ ] **Step 8: Run focused tests and commit**

```bash
pnpm exec vitest run \
  src/modules/report-ai/services/get-report-ai-business-context.service.test.ts \
  src/modules/report-ai/domain/build-report-ai-context.test.ts \
  src/modules/report-ai/domain/build-report-ai-prompt.test.ts \
  src/app/api/reports/'[id]'/ai/messages/route.test.ts
git add src/modules/report-ai/ src/app/api/reports/'[id]'/ai/messages/
git commit -m "feat: personalize report AI with business context"
```

---

### Task 2: Extend deterministic demo scenarios with onboarding profiles

**Files:**

- Modify: `scripts/demo-seed/model.ts`
- Modify: `scripts/demo-seed/user-scenarios.ts`
- Modify: `scripts/demo-seed/user-scenarios.test.ts`

**Interfaces:**

- Consumes: 96 deterministic client users and the eight migration-seeded catalog names.
- Produces: `SeedOnboardingProfile`; `DemoSeedCatalog.profiles`; deterministic segment/subcategory/consent distribution.

- [ ] **Step 1: Write failing scenario tests**

Assert 96 profiles, zero for the admin, every client ID exactly once, all eight segment names represented, at least five clients per seeded subcategory, at least eight custom Outro descriptions, exactly 48 active consents and 48 declined decisions, E.164 uniqueness, and completion times derived from each user's account bucket. Assert no generated full name or custom subcategory begins with spreadsheet formula characters; E.164 phones intentionally begin with `+` and are neutralized only by the CSV serializer.

- [ ] **Step 2: Run and verify failure**

```bash
pnpm exec vitest run scripts/demo-seed/user-scenarios.test.ts
```

Expected: FAIL because `catalog.profiles` does not exist.

- [ ] **Step 3: Add seed types**

Add:

```ts
type SeedOnboardingProfile = {
  userId: string;
  fullName: string;
  whatsappE164: string;
  segmentName: string;
  subcategoryName: string | null;
  customSubcategory: string | null;
  marketingConsent: boolean;
  completedAt: SeedRelativeTime;
};
```

Extend `DemoSeedCatalog` with `profiles: SeedOnboardingProfile[]`.

- [ ] **Step 4: Build deterministic profiles**

Rotate the approved segments by client ordinal. Rotate the five known subcategories only when they belong to the chosen segment; otherwise assign a bounded Portuguese custom description. Use names `Cliente Demonstração 001` through `096`, phones `+5511900000001` through `+5511900000096`, even ordinals consented, and completion after creation but before the current time. Preserve blocked/deleted users to exercise admin filters.

- [ ] **Step 5: Pass tests and commit**

```bash
pnpm exec vitest run scripts/demo-seed/user-scenarios.test.ts
git add scripts/demo-seed/model.ts scripts/demo-seed/user-scenarios.ts \
  scripts/demo-seed/user-scenarios.test.ts
git commit -m "test: model demo onboarding profiles"
```

---

### Task 3: Render, regenerate, and verify onboarding seed data

**Files:**

- Modify: `scripts/demo-seed/render-seed.ts`
- Modify: `scripts/demo-seed/render-seed.test.ts`
- Modify: `scripts/demo-seed/verify-local.ts`
- Modify: `scripts/demo-seed/verify-local.test.ts`
- Regenerate: `supabase/seed.sql`
- Modify: `supabase/tests/seed.test.sql`

**Interfaces:**

- Consumes: `DemoSeedCatalog.profiles` and plan 1 catalog tables.
- Produces: deterministic profile/event SQL and local invariants `96 profiles`, `48 active consents`, `96 initial consent events`.

- [ ] **Step 1: Write failing renderer and verification tests**

Assert cleanup order contains:

```text
delete from private.whatsapp_consent_events ...
delete from public.onboarding_profiles ...
```

before any seeded Auth replacement. Assert generated SQL resolves catalog IDs by exact seeded names, inserts 96 profiles, inserts 96 initial `granted|declined` events with copy version `whatsapp-marketing-v1`, and does not insert an admin profile. Extend local verification command/result expectations with the three counts above.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm exec vitest run \
  scripts/demo-seed/render-seed.test.ts \
  scripts/demo-seed/verify-local.test.ts
```

Expected: FAIL because render/verification ignore profiles.

- [ ] **Step 3: Implement deterministic SQL rendering**

Add onboarding cleanup scoped to the deterministic user UUID range. The seed runs as database owner `postgres`, using the explicit owner-only DELETE exception in the consent-event append-only trigger from plan 1; application roles remain unable to change history. Render profiles after Auth identities and before reports/admin final states. Use an `insert ... select` joined to segment/subcategory names so generated SQL does not hardcode identity sequence values. Set `marketing_consent_granted_at = completed_at` only for consented profiles. Render matching private events after profiles with source `onboarding` and copy version `whatsapp-marketing-v1`.

- [ ] **Step 4: Add SQL seed invariants**

In `supabase/tests/seed.test.sql`, assert:

```sql
select is((select count(*) from public.onboarding_profiles
  where user_id between 'd1000000-0000-4000-8000-000000000001'::uuid
    and 'd1000000-0000-4000-8000-000000000060'::uuid), 96::bigint,
  'every demo client has onboarding');

select is((select count(*) from public.onboarding_profiles
  where whatsapp_marketing_consent), 48::bigint,
  'half of demo clients actively consent');
```

Also assert admin absence, valid segment/subcategory pairs, custom Outro coverage, all eight segments, 96 matching initial events, and that `export_admin_onboarding_contacts_v1` returns exactly 48 rows when called as the seeded `aal2` admin.

- [ ] **Step 5: Regenerate and verify locally**

```bash
pnpm seed:generate
pnpm seed:check
pnpm supabase:reset
pnpm seed:verify-local
pnpm exec supabase test db supabase/tests/seed.test.sql
```

Expected: generated artifact is stable, local sentinel remains preserved, and all new invariants pass.

- [ ] **Step 6: Commit generated demo data**

```bash
git add scripts/demo-seed/ supabase/seed.sql supabase/tests/seed.test.sql
git commit -m "feat: seed realistic onboarding profiles"
```

---

### Task 4: Update durable product and AI behavior documentation

**Files:**

- Modify: `PRODUCT.md`
- Modify: `docs/report-ai-interpretation-behavior.md`

**Interfaces:**

- Consumes: implemented behavior from plans 1–3.
- Produces: durable product truth matching shipped behavior.

- [ ] **Step 1: Add documentation assertions to the review checklist**

Before editing, search current claims:

```bash
rg -n "onboarding|perfil|WhatsApp|Interpretação por IA|segmento|subcategoria" \
  PRODUCT.md docs/report-ai-interpretation-behavior.md
```

Expected: PRODUCT lacks the new capability and still describes AI interpretation as unconfirmed.

- [ ] **Step 2: Update PRODUCT.md precisely**

Add the mandatory post-confirmation onboarding, editable Minha conta profile, optional commercial consent, admin catalog/indicators/authorized export, and the rule that only segment/subcategory enter AI context. Replace the obsolete statement that AI interpretation is unconfirmed with the current paid report-assistant capability; do not claim model training or WhatsApp sending.

- [ ] **Step 3: Update the AI behavior document**

Under user-declared information, state that current segment and subcategory may contextualize explanations but are not verified facts. State explicitly that name, phone, consent, email, and identifiers are excluded, and that profile text remains untrusted data. Keep the existing requirement that category-specific numerical knowledge needs approved curated references; onboarding alone does not authorize model-memory benchmarks.

- [ ] **Step 4: Format and commit docs**

```bash
pnpm exec prettier --check PRODUCT.md docs/report-ai-interpretation-behavior.md
git add PRODUCT.md docs/report-ai-interpretation-behavior.md
git commit -m "docs: document onboarding business context"
```

---

### Task 5: Run final cross-feature verification

**Files:**

- Modify only files already in plans 1–3 when a reproducible verification failure requires correction.

**Interfaces:**

- Consumes: every onboarding, admin, export, AI, and seed deliverable.
- Produces: release-ready feature with clean repository state.

- [ ] **Step 1: Run database and seed gates**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:advisors
pnpm supabase:lint
pnpm supabase:types
pnpm seed:check
pnpm seed:verify-local
git diff --exit-code src/infrastructure/database/supabase/database.types.ts supabase/seed.sql
```

Expected: all pass and generated artifacts are current.

- [ ] **Step 2: Run complete application gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Expected: all pass.

- [ ] **Step 3: Run a privacy regression scan**

```bash
rg -n "fullName|whatsapp|consent|consentedAt|userId|email" \
  src/modules/report-ai src/app/api/reports/'[id]'/ai
```

Review every match. Allowed matches are test assertions proving exclusion, unrelated authenticated service parameters, or existing conversation ownership fields. No name, phone, consent, or email may enter serialized report context or gateway messages.

- [ ] **Step 4: Exercise the end-to-end happy paths manually**

Use the local stack to verify: new client confirmation -> onboarding -> quick diagnosis; profile edit and consent revoke; admin overview/contact filters; catalog archive preserving profile; authorized CSV excluding revoked contact; paid report assistant receiving current segment/subcategory. Also verify an absent-profile fixture does not break an existing assistant response.

- [ ] **Step 5: Commit only verified corrections, if any**

```bash
git status --short
git add PRODUCT.md docs src scripts supabase package.json pnpm-lock.yaml
git commit -m "fix: complete onboarding integration"
```

Skip when no corrections were needed. Finish with a clean worktree and report migration filenames, commit IDs, database results, application gates, and any consciously deferred non-goal.
