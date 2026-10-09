# Admin Onboarding Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the MFA-protected Onboarding administration area with cohort indicators, filtered contacts, safe authorized-contact CSV exports, and versioned catalog management.

**Architecture:** Versioned PostgreSQL RPCs are the authoritative admin boundary and call `private.has_admin_access()` on every entrypoint. Read RPCs return strict, bounded JSON for overview and cursor-paginated contacts; mutation RPCs use optimistic versions; export generation revalidates consent in the database and records a PII-free audit event. Next.js server pages validate URL state with Zod and render three URL-addressable sections under `/admin/onboarding`.

**Tech Stack:** PostgreSQL 15/Supabase RLS and pgTAP, Supabase JS, Next.js 16 App Router and Route Handlers, React 19, TypeScript 5.9, Zod 4, Base UI/shadcn, Recharts 3, Vitest and Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-09-client-onboarding-and-segmentation-design.md`

## Global Constraints

- This is plan 2 of 3 and requires plan 1 to be complete.
- Create three ordered imperative migrations with `pnpm exec supabase migration new`: `create_admin_onboarding_reads`, `add_admin_onboarding_catalog_mutations`, and `add_admin_onboarding_exports`. Use each exact path printed by the CLI and never edit a migration after its task is committed or applied.
- Before database implementation, verify the current Supabase changelog and official guidance for RLS and `SECURITY DEFINER` functions.
- Every RPC checks `private.has_admin_access()` internally; `requireAdmin()` remains an application defense, not the authorization boundary.
- Admin `aal1`, ordinary authenticated users, `anon`, and `service_role` receive no usable admin RPC access.
- Overview date ranges form account-created cohorts in `America/Sao_Paulo`; contact/export date ranges filter `completed_at` in that timezone. `from` is inclusive and `to` is exclusive.
- Exclude the configured administrator and logically deleted accounts from overview cohorts; include blocked clients.
- Page size is 1–50. Search is at most 120 characters. CSV export is 0–5,000 authorized rows and never returns a partial file.
- Export contains only name, E.164 WhatsApp, segment, subcategory, and current consent time. It never contains email, user ID, reports, billing, or financial data.
- CSV formula protection must neutralize trimmed cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return before RFC 4180 quoting.
- Export audits store actor, bounded filters, count, and timestamp; never CSV contents or phone values.
- Catalog items are created, renamed, ordered, archived, or restored; they are never physically deleted.
- Preserve exact payload limits and catalog semantics from plan 1.
- User-facing copy remains Portuguese (Brazil); code identifiers remain English.
- Follow TDD and commit each independently testable task.

---

## File Structure

### Database boundary

- Create via CLI: `supabase/migrations/*_create_admin_onboarding_reads.sql` — protected overview and contact reads.
- Create via CLI: `supabase/migrations/*_add_admin_onboarding_catalog_mutations.sql` — versioned catalog writes.
- Create via CLI: `supabase/migrations/*_add_admin_onboarding_exports.sql` — authorized-contact export and audit.
- Create: `supabase/tests/admin_onboarding.test.sql` — authorization, metrics, filters, cursor, catalog concurrency, export, and audit.
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`.

### Admin domain and services

- Create: `src/modules/admin/onboarding/admin-onboarding.schema.ts` and test — strict RPC/action/filter contracts.
- Create: `src/modules/admin/onboarding/admin-onboarding.filters.ts` and test — parse and serialize URL filters.
- Create: `src/modules/admin/onboarding/get-admin-onboarding.service.ts` and test — overview, contacts, and catalog loaders.
- Create: `src/modules/admin/onboarding/change-business-catalog.action.ts` and test — segment/subcategory mutations.
- Create: `src/modules/admin/onboarding/onboarding-export.ts` and test — safe CSV serialization.

### Admin UI and routes

- Create: `src/modules/admin/onboarding/components/admin-onboarding-nav.tsx`.
- Create: `src/modules/admin/onboarding/components/admin-onboarding-overview.tsx` and test.
- Create: `src/modules/admin/onboarding/components/admin-onboarding-contacts.tsx` and test.
- Create: `src/modules/admin/onboarding/components/admin-onboarding-filters.tsx` and test.
- Create: `src/modules/admin/onboarding/components/admin-onboarding-catalog.tsx` and test.
- Create: `src/app/(admin-panel)/admin/onboarding/page.tsx` and test.
- Create: `src/app/(admin-panel)/admin/onboarding/loading.tsx`.
- Create: `src/app/(admin-panel)/admin/onboarding/error.tsx`.
- Create: `src/app/api/admin/onboarding/export/route.ts` and test.
- Modify: `src/components/layout/app-sidebar.tsx` and test.

---

### Task 1: Add protected overview and contact-list RPCs

**Files:**

- Create via CLI: exact path printed by `pnpm exec supabase migration new create_admin_onboarding_reads`
- Create: `supabase/tests/admin_onboarding.test.sql`

**Interfaces:**

- Consumes: plan 1 tables; `private.app_administrator`; `private.admin_user_state`; `private.has_admin_access()`.
- Produces: `public.get_admin_onboarding_overview_v1(date,date) returns jsonb`; `public.list_admin_onboarding_contacts_v1(text,bigint,bigint,text,date,date,timestamptz,uuid,integer) returns jsonb`.

- [ ] **Step 1: Create the migration through the installed CLI**

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new create_admin_onboarding_reads
```

Expected: a single empty migration ending in `_create_admin_onboarding_reads.sql`.

- [ ] **Step 2: Write failing authorization and overview tests**

Create admin, ordinary, blocked, deleted, completed, incomplete, consented, and declined fixtures. Assert both functions exist and revoke execute from unintended roles. Exercise ordinary authenticated, admin `aal1`, and admin `aal2` JWT claims. Only `aal2` succeeds.

For a fixed cohort range, assert this shape:

```json
{
  "generatedAt": "2026-10-09T12:00:00+00:00",
  "metrics": {
    "accountCount": 4,
    "completedCount": 3,
    "completionRateBasisPoints": 7500,
    "activeConsentCount": 2,
    "consentRateBasisPoints": 6667
  },
  "segments": [{ "id": 1, "name": "Alimentação", "count": 2 }],
  "subcategories": [{ "id": null, "name": "Outro", "count": 1 }]
}
```

Also assert null percentages for a zero denominator, excluded administrator/deleted users, included blocked users, current renamed labels, and deterministic `count desc, id asc` ordering.

- [ ] **Step 3: Write failing contact filter and cursor tests**

Assert search across name and E.164 phone, exact segment/subcategory, consent `all|granted|declined`, completion date range, page size cap, and `(completed_at,user_id)` cursor without repeats. The payload must expose `customSubcategory` only for Outro and must not expose Auth email, report, billing, or consent-event history.

- [ ] **Step 4: Run the SQL test and verify failure**

```bash
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql
```

Expected: FAIL because the two RPCs do not exist.

- [ ] **Step 5: Implement the overview RPC**

Use `SECURITY DEFINER`, `stable`, `search_path = ''`, and reject invalid/inverted date ranges. Build the cohort from confirmed `auth.users.created_at`, excluding the administrator and `private.admin_user_state.deleted_at is not null`. Compute rate basis points with rounded numeric division; return JSON null when the denominator is zero. Join profile/catalog labels and group custom values under a single `Outro` bucket.

- [ ] **Step 6: Implement the contact-list RPC**

Validate search length, consent enum, paired cursor, positive IDs, and limit. Use static predicates, never dynamic SQL. Return:

```ts
type AdminOnboardingContacts = {
  items: Array<{
    userId: string;
    fullName: string;
    whatsappE164: string;
    segment: { id: number; name: string };
    subcategory: { id: number | null; name: string };
    customSubcategory: string | null;
    consent: boolean;
    consentedAt: string | null;
    completedAt: string;
  }>;
  nextCursor: { completedAt: string; userId: string } | null;
};
```

Cap inside the database with `least(greatest(coalesce(p_limit,20),1),50)`.

- [ ] **Step 7: Run focused SQL tests and commit**

```bash
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql
git add supabase/migrations/ supabase/tests/admin_onboarding.test.sql
git commit -m "feat: add admin onboarding insights"
```

---

### Task 2: Add versioned catalog administration RPCs

**Files:**

- Create via CLI: exact path printed by `pnpm exec supabase migration new add_admin_onboarding_catalog_mutations`
- Modify: `supabase/tests/admin_onboarding.test.sql`

**Interfaces:**

- Consumes: plan 1 catalog tables and admin authorization.
- Produces: `save_admin_business_segment_v1(bigint,text,integer,boolean,integer)` and `save_admin_business_subcategory_v1(bigint,bigint,text,integer,boolean,integer)`, both returning JSON status/item.

- [ ] **Step 1: Add failing mutation tests**

For each RPC, test create with `p_id = null` and `p_expected_version = null`; rename/reorder/archive/restore with exact expected version; stale version as `conflict`; absent ID as `not_found`; case-insensitive duplicate as `duplicate`; invalid lengths/order as SQLSTATE `22023`; ordinary user/admin `aal1` as `42501`. Prove archive preserves referenced profiles and no DELETE grant exists.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql
```

Expected: new function-contract assertions fail.

- [ ] **Step 3: Create the catalog-mutation migration**

```bash
pnpm exec supabase migration new add_admin_onboarding_catalog_mutations
```

Expected: one empty migration ending in `_add_admin_onboarding_catalog_mutations.sql`. Put the two mutation RPCs in that file; do not modify the committed Task 1 migration.

- [ ] **Step 4: Implement segment mutation**

Use an admin-checked `SECURITY DEFINER` function. On create, normalize the name and insert version 0. On update, lock by ID and compare `expected_version`, update name/order/active state, set `updated_at`, and increment exactly once. Catch unique violations and return `{"status":"duplicate"}`. Return the saved item in camelCase.

- [ ] **Step 5: Implement subcategory mutation**

Apply the same contract plus a required existing segment. New subcategories may only attach to active segments. Existing subcategories retain their immutable `segment_id`; moving between segments is rejected as invalid rather than rewriting historical grouping.

- [ ] **Step 6: Run tests and commit**

```bash
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql
git add supabase/migrations/ supabase/tests/admin_onboarding.test.sql
git commit -m "feat: manage onboarding business catalog"
```

---

### Task 3: Add consent-safe export and audit RPC

**Files:**

- Create via CLI: exact path printed by `pnpm exec supabase migration new add_admin_onboarding_exports`
- Modify: `supabase/tests/admin_onboarding.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: current profile consent and admin authorization.
- Produces: `private.admin_onboarding_export_events`; `public.export_admin_onboarding_contacts_v1(bigint,bigint,date,date) returns jsonb` with `ready`, `empty`, or `limit_exceeded`.

- [ ] **Step 1: Add failing export tests**

Assert declined/revoked profiles never appear even when the caller supplies no consent filter. Assert segment/subcategory/date filters, current consent time, Outro text, zero rows as `empty`, 5,001 rows as `limit_exceeded` with no partial `items`, and a `ready` response capped at 5,000. Assert one audit row only for `ready`, containing actor, filters, count, and no phone/name/CSV.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql
```

Expected: export/audit assertions fail.

- [ ] **Step 3: Create the export migration**

```bash
pnpm exec supabase migration new add_admin_onboarding_exports
```

Expected: one empty migration ending in `_add_admin_onboarding_exports.sql`. Put the audit table and export RPC in that file; do not modify either committed migration from Tasks 1–2.

- [ ] **Step 4: Implement audit table and export RPC**

Create the private table with `filters jsonb`, `row_count between 0 and 5000`, a check `char_length(filters::text) <= 2000`, indexed actor/time, and no grants. The volatile export function selects at most 5,001 rows after all filters and the mandatory predicate:

```sql
profile.whatsapp_marketing_consent
and profile.marketing_consent_granted_at is not null
```

Return no item array for overflow. Insert the PII-free audit in the same transaction only for a `ready` result.

- [ ] **Step 5: Verify database and regenerate types**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql
pnpm supabase:advisors
pnpm supabase:lint
pnpm supabase:types
```

Expected: all tests and checks pass; generated types include five admin RPCs.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/ supabase/tests/admin_onboarding.test.sql \
  src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: export authorized onboarding contacts"
```

---

### Task 4: Add admin schemas, filters, services, and mutation actions

**Files:**

- Create: `src/modules/admin/onboarding/admin-onboarding.schema.ts`
- Create: `src/modules/admin/onboarding/admin-onboarding.schema.test.ts`
- Create: `src/modules/admin/onboarding/admin-onboarding.filters.ts`
- Create: `src/modules/admin/onboarding/admin-onboarding.filters.test.ts`
- Create: `src/modules/admin/onboarding/get-admin-onboarding.service.ts`
- Create: `src/modules/admin/onboarding/get-admin-onboarding.service.test.ts`
- Create: `src/modules/admin/onboarding/change-business-catalog.action.ts`
- Create: `src/modules/admin/onboarding/change-business-catalog.action.test.ts`

**Interfaces:**

- Consumes: admin RPCs from Tasks 1–3 and `requireAdmin()`.
- Produces: strict overview/contact/catalog types; `parseAdminOnboardingNavigation`; `getAdminOnboardingOverview`; `getAdminOnboardingContacts`; `getAdminBusinessCatalog`; `changeBusinessCatalog`.

- [ ] **Step 1: Write failing strict-schema and URL tests**

Test the exact JSON shapes above, integer/rate bounds `0..10000`, max 50 items, ISO dates, and rejection of extra keys. URL parsing accepts only `tab=overview|contacts|catalog`, scalar search, positive numeric IDs, `consent=all|granted|declined`, valid dates, and a bounded encoded cursor; invalid values fall back safely and serialization emits canonical parameters.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm exec vitest run \
  src/modules/admin/onboarding/admin-onboarding.schema.test.ts \
  src/modules/admin/onboarding/admin-onboarding.filters.test.ts
```

Expected: FAIL because files are absent.

- [ ] **Step 3: Implement schemas and filter helpers**

Export:

```ts
type AdminOnboardingTab = "overview" | "contacts" | "catalog";
type AdminOnboardingFilters = {
  q: string;
  segmentId: number | null;
  subcategoryId: number | null;
  consent: "all" | "granted" | "declined";
  from: string | null;
  to: string | null;
  cursor: string | null;
};
```

Use a base64url JSON cursor `{ completedAt, userId }`, validated after decoding. Reset cursor whenever another filter changes.

- [ ] **Step 4: Write failing service/action tests**

Mock `requireAdmin().supabase.rpc`. Assert exact argument mapping, strict parsing, and `AdminOnboardingUnavailableError` for errors or malformed JSON. Mutation actions validate before auth, map `saved|conflict|duplicate|not_found`, and revalidate `/admin/onboarding` only on saved.

- [ ] **Step 5: Implement services/actions and pass tests**

```bash
pnpm exec vitest run src/modules/admin/onboarding
```

Keep services server-only; never use an admin/service-role Supabase client.

- [ ] **Step 6: Commit**

```bash
git add src/modules/admin/onboarding/
git commit -m "feat: add admin onboarding contracts"
```

---

### Task 5: Build the overview, contacts, filters, and admin route

**Files:**

- Create: `src/modules/admin/onboarding/components/admin-onboarding-nav.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-overview.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-overview.test.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-contacts.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-contacts.test.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-filters.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-filters.test.tsx`
- Create: `src/app/(admin-panel)/admin/onboarding/page.tsx`
- Create: `src/app/(admin-panel)/admin/onboarding/page.test.tsx`
- Create: `src/app/(admin-panel)/admin/onboarding/loading.tsx`
- Create: `src/app/(admin-panel)/admin/onboarding/error.tsx`

**Interfaces:**

- Consumes: Task 4 loaders/types.
- Produces: URL-addressable `overview`, `contacts`, and `catalog` sections; catalog section is completed in Task 6.

- [ ] **Step 1: Write failing overview and contacts tests**

Assert cards for contas, perfis, taxa de preenchimento, consentimentos, and taxa de consentimento. Null rates render `Ainda sem dados`. Distribution bars expose name/count text and do not rely on color. Contacts render responsive table/cards with consent badge, custom Outro text, cursor links, and no email/financial fields.

- [ ] **Step 2: Write failing filter/navigation tests**

Assert the three tabs have real URLs, filter submit uses `router.replace`, changing segment clears subcategory and cursor, active filters are removable, and date/search max lengths are present. Test keyboard use of every control.

- [ ] **Step 3: Run component tests and verify failure**

```bash
pnpm exec vitest run src/modules/admin/onboarding/components
```

Expected: FAIL because components are absent.

- [ ] **Step 4: Implement overview and contact components**

Use the existing admin card language and `ChartContainer`/Recharts for ranked horizontal bars, with an adjacent semantic list containing identical counts. On narrow screens, contacts become cards; do not force a wide table. The primary empty copy is `Ainda não há perfis concluídos neste período.`

- [ ] **Step 5: Implement server route orchestration and route states**

Parse `searchParams`, load only the active tab's data, and render the shared navigation. `loading.tsx` mirrors stable page geometry. `error.tsx` offers retry. Invalid cursors fall back to the first page; service failures surface the route error boundary.

- [ ] **Step 6: Run focused tests and commit**

```bash
pnpm exec vitest run \
  src/modules/admin/onboarding/components \
  'src/app/(admin-panel)/admin/onboarding/page.test.tsx'
git add src/modules/admin/onboarding/components/ \
  'src/app/(admin-panel)/admin/onboarding/'
git commit -m "feat: add onboarding admin insights"
```

---

### Task 6: Build catalog administration

**Files:**

- Create: `src/modules/admin/onboarding/components/admin-onboarding-catalog.tsx`
- Create: `src/modules/admin/onboarding/components/admin-onboarding-catalog.test.tsx`
- Modify: `src/app/(admin-panel)/admin/onboarding/page.tsx`
- Modify: `src/app/(admin-panel)/admin/onboarding/page.test.tsx`

**Interfaces:**

- Consumes: catalog loader and `changeBusinessCatalog`.
- Produces: create/edit/order/archive/restore UI with optimistic-version feedback.

- [ ] **Step 1: Write failing catalog UI tests**

Test segment accordion, nested subcategories, create form limits, rename, numeric ordering 0–10,000, archive/restore confirmation, archived badge, pending state, duplicate inline error, stale conflict message, and focus restoration after dialog close. Assert no delete action exists and “Outro” is explained as automatic rather than editable.

- [ ] **Step 2: Run and verify failure**

```bash
pnpm exec vitest run src/modules/admin/onboarding/components/admin-onboarding-catalog.test.tsx
```

Expected: FAIL because the catalog editor is absent.

- [ ] **Step 3: Implement catalog editor**

Use existing `Dialog`/`AlertDialog`, `Input`, `Switch`, and buttons. Keep one focused form per mutation. Send `id`, immutable `segmentId` for existing subcategories, normalized name, order, active state, and `expectedVersion`. On saved, call `router.refresh`; on conflict retain input and instruct `Atualize a página para carregar a versão mais recente.`

- [ ] **Step 4: Run tests and commit**

```bash
pnpm exec vitest run \
  src/modules/admin/onboarding/components/admin-onboarding-catalog.test.tsx \
  'src/app/(admin-panel)/admin/onboarding/page.test.tsx'
git add src/modules/admin/onboarding/components/admin-onboarding-catalog* \
  'src/app/(admin-panel)/admin/onboarding/page.tsx' \
  'src/app/(admin-panel)/admin/onboarding/page.test.tsx'
git commit -m "feat: add onboarding catalog administration"
```

---

### Task 7: Add safe CSV delivery and sidebar navigation

**Files:**

- Create: `src/modules/admin/onboarding/onboarding-export.ts`
- Create: `src/modules/admin/onboarding/onboarding-export.test.ts`
- Create: `src/app/api/admin/onboarding/export/route.ts`
- Create: `src/app/api/admin/onboarding/export/route.test.ts`
- Modify: `src/modules/admin/onboarding/components/admin-onboarding-contacts.tsx`
- Modify: `src/modules/admin/onboarding/components/admin-onboarding-contacts.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`

**Interfaces:**

- Consumes: `export_admin_onboarding_contacts_v1`, current contact filters, `requireAdmin`.
- Produces: `serializeAuthorizedContactsCsv(items): string`; GET `/api/admin/onboarding/export`; Onboarding sidebar item.

- [ ] **Step 1: Write failing CSV serializer tests**

Test UTF-8 header order, CRLF rows, quotes/commas/newlines, E.164 preservation, Outro substitution, and spreadsheet payloads such as `=HYPERLINK(...)`, `+cmd`, `-1+1`, `@SUM`, tab, carriage return, and leading whitespace followed by any dangerous prefix. Each dangerous trimmed cell must be prefixed with `'` before normal CSV quoting.

- [ ] **Step 2: Write failing route tests**

Assert `requireAdmin`, validated query filters, exact RPC args, and responses: `401/503` auth failures, `204` empty, `422` limit exceeded, `200 text/csv; charset=utf-8` ready. Assert `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and attachment filename `lucrivo-contatos-autorizados-YYYY-MM-DD.csv`.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm exec vitest run \
  src/modules/admin/onboarding/onboarding-export.test.ts \
  src/app/api/admin/onboarding/export/route.test.ts
```

Expected: FAIL because serializer and route are absent.

- [ ] **Step 4: Implement serializer and route**

The route calls the export RPC, strictly parses its status/payload, serializes only a `ready` result, and never accepts a caller-supplied consent flag. Encode UTF-8 with a BOM for common Brazilian spreadsheet compatibility. Do not log the payload.

- [ ] **Step 5: Add handled download action and admin navigation**

Contacts render a client-side `Exportar contatos autorizados` button that calls the route with the current non-consent filters. For `200`, build a Blob from the response and trigger the filename from `Content-Disposition`; for `204`, show `Nenhum contato autorizado corresponde aos filtros.`; for `422`, show an instruction to narrow the filters; for other failures, show a retryable generic error. Disable the button while downloading, preserve keyboard/focus behavior, and revoke the temporary object URL. Explain that only active authorizations are included.

Extend the component tests to cover success, empty, limit-exceeded, retryable failure, and double-submit prevention. Add `{ label: "Onboarding", href: "/admin/onboarding", icon: ListChecksIcon }` to `adminNavigationItems` and test active state.

- [ ] **Step 6: Run tests and commit**

```bash
pnpm exec vitest run \
  src/modules/admin/onboarding \
  src/app/api/admin/onboarding/export/route.test.ts \
  src/components/layout/app-sidebar.test.tsx
git add src/modules/admin/onboarding/ src/app/api/admin/onboarding/ \
  src/components/layout/app-sidebar*
git commit -m "feat: export authorized onboarding contacts"
```

---

### Task 8: Verify the complete administration slice

**Files:**

- Modify only scoped files from this plan if verification finds defects.

**Interfaces:**

- Consumes: all plan 2 deliverables.
- Produces: tested admin insights, catalog management, and safe export.

- [ ] **Step 1: Run database checks**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:advisors
pnpm supabase:lint
pnpm supabase:types
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
```

- [ ] **Step 2: Run application checks**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

- [ ] **Step 3: Perform one bounded visual inspection**

Inspect all three `/admin/onboarding` tabs at desktop/mobile widths and light/dark themes. Verify responsive contacts, numeric chart labels, URL state, dialogs, focus restoration, empty/error states, long labels, archived items, and the export explanation. Fix in one batch and confirm once.

- [ ] **Step 4: Commit verification fixes if needed**

```bash
git status --short
git add src supabase
git commit -m "fix: harden onboarding administration"
```

Skip when no files changed. Confirm no unintended worktree changes remain.
