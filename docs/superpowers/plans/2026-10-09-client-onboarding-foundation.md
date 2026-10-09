# Client Onboarding Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the protected onboarding profile contract, require every client to complete it after email confirmation, provide the approved UI-X phone field, and let clients maintain the same data in Minha conta.

**Architecture:** PostgreSQL owns catalog integrity, profile ownership, consent history, optimistic concurrency, and the atomic save operation. Next.js server loaders resolve the current profile and catalog, server actions validate the same bounded payload, and one shared client form renders both the focused `/onboarding` route and `/account`. Authentication remains in Supabase Auth; onboarding data lives in application tables protected by RLS.

**Tech Stack:** PostgreSQL 15/Supabase RLS and pgTAP, Supabase JS, Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Base UI/shadcn, UI-X Phone Input, `react-phone-number-input`, Vitest and Testing Library, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-09-client-onboarding-and-segmentation-design.md`

## Global Constraints

- This is plan 1 of 3. Plans 2 and 3 consume the tables, RPCs, schemas, and services defined here.
- Create two ordered imperative migrations with `pnpm exec supabase migration new`: first `create_client_onboarding`, then `add_client_onboarding_profile_save`. Use each exact path printed by the CLI and never edit a migration after its task is committed or applied.
- Before database implementation, fetch `https://supabase.com/changelog.md`, scan relevant breaking changes, and verify current official RLS/function guidance.
- Code identifiers are English; all user-facing copy is Portuguese (Brazil).
- Exact payload limits: name 2–120 characters, custom subcategory 2–80, segment name 2–60, subcategory name 2–80, consent copy version 1–64, E.164 `+` plus 8–15 digits.
- “Outro” is synthetic. A profile has exactly one of `subcategory_id` or `custom_subcategory`.
- The approved consent copy version is `whatsapp-marketing-v1`; the checkbox starts unchecked and never gates product access.
- Store phone values only in E.164. Default the UI to `BR`, but allow international numbers.
- Add exact dependencies `@base-ui/utils@0.3.1` and `react-phone-number-input@3.4.18`; commit `pnpm-lock.yaml`.
- Direct profile writes are revoked. `save_onboarding_profile_v1` derives identity from `(select auth.uid())` and writes profile plus consent event atomically.
- Public RPC entrypoints and private helpers use `search_path = ''`, schema-qualified objects, explicit grants, and execute revocation from unintended roles.
- Do not send name, WhatsApp, or consent data to the AI. Plan 3 adds only segment and subcategory.
- Preserve keyboard navigation, focus visibility, light/dark themes, responsive behavior, and reduced motion.
- Follow TDD: observe a focused failing test, implement the smallest coherent slice, rerun it, then commit.
- Keep unrelated worktree changes intact.

---

## File Structure

### Database boundary

- Create via Supabase CLI: `supabase/migrations/*_create_client_onboarding.sql` — catalog/profile tables, RLS, and read RPCs.
- Create via Supabase CLI: `supabase/migrations/*_add_client_onboarding_profile_save.sql` — atomic profile save RPC and consent audit.
- Create: `supabase/tests/client_onboarding.test.sql` — schema, constraints, RLS, RPC, consent, archive, and concurrency coverage.
- Regenerate: `src/infrastructure/database/supabase/database.types.ts` — generated tables and RPC signatures.

### Shared onboarding module

- Create: `src/modules/onboarding/onboarding.schema.ts` — strict catalog/profile/action Zod contracts and payload limits.
- Create: `src/modules/onboarding/onboarding.schema.test.ts` — boundary and conditional validation.
- Create: `src/modules/onboarding/get-onboarding.service.ts` — own profile and catalog loaders.
- Create: `src/modules/onboarding/get-onboarding.service.test.ts` — RPC validation and stable failure behavior.
- Create: `src/modules/onboarding/actions/save-onboarding-profile.action.ts` — authenticated action and domain-result mapping.
- Create: `src/modules/onboarding/actions/save-onboarding-profile.action.test.ts` — invalid, saved, conflict, and archived-option paths.
- Create: `src/modules/onboarding/components/onboarding-form.tsx` — shared onboarding/account editor.
- Create: `src/modules/onboarding/components/onboarding-form.test.tsx` — dependencies, Outro, consent, focus, and preservation tests.

### Phone field

- Create: `src/components/ui/phone-input-primitive.tsx` — locally owned UI-X primitive adapted to project aliases.
- Create: `src/components/ui/phone-input.tsx` — composed country picker and input.
- Create: `src/components/ui/phone-input.test.tsx` — BR default, international value, initial value, focus, and invalid state.
- Modify: `package.json`, `pnpm-lock.yaml` — exact dependencies.

### Routes and navigation

- Create: `src/app/(onboarding)/onboarding/layout.tsx` and test — authenticated, shell-free route group.
- Create: `src/app/(onboarding)/onboarding/page.tsx` and test — initial loader and completed-profile redirect.
- Create: `src/app/(private)/account/page.tsx` and test — profile editor.
- Modify: `src/modules/auth/services/resolve-authenticated-home.ts` and test — `/onboarding` destination.
- Modify: `src/app/(private)/layout.tsx` and test — mandatory completion gate.
- Modify: `src/components/layout/account-menu.tsx` and test — Minha conta link.

---

### Task 1: Add the catalog, profile, and ownership schema

**Files:**

- Create via CLI: exact path printed by `pnpm exec supabase migration new create_client_onboarding`
- Create: `supabase/tests/client_onboarding.test.sql`

**Interfaces:**

- Consumes: `auth.users(id)`, `auth.uid()`, roles `anon` and `authenticated`.
- Produces: `public.business_segments`, `public.business_subcategories`, `public.onboarding_profiles`; `public.current_user_has_completed_onboarding()`; `public.list_business_catalog_v1()`; `public.get_my_onboarding_profile_v1()`.

- [ ] **Step 1: Discover the installed CLI and create the migration**

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new create_client_onboarding
```

Expected: one empty migration ending in `_create_client_onboarding.sql`. Use only that emitted path below.

- [ ] **Step 2: Write failing pgTAP schema and privilege tests**

Start `supabase/tests/client_onboarding.test.sql` with `begin`, `extensions.pgtap`, and `no_plan()`. Assert the three tables, their primary/foreign keys, RLS, and the three read functions. Include these contract checks:

```sql
select has_function(
  'public', 'current_user_has_completed_onboarding', array[]::text[],
  'completion gate exists'
);
select has_function(
  'public', 'list_business_catalog_v1', array[]::text[],
  'catalog projection exists'
);
select has_function(
  'public', 'get_my_onboarding_profile_v1', array[]::text[],
  'own profile projection exists'
);
select ok(
  not has_table_privilege('anon', 'public.onboarding_profiles', 'select'),
  'anonymous users cannot read profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.onboarding_profiles', 'insert'),
  'clients cannot bypass the save RPC'
);
```

Add fixtures for two authenticated clients and prove each reads only its own profile, while catalog labels are readable. Add failing inserts for long names, malformed E.164, both/neither subcategory representations, mismatched segment/subcategory, and inconsistent consent timestamp. Finish with `finish()` and `rollback`.

- [ ] **Step 3: Run the new SQL test and verify failure**

```bash
pnpm exec supabase test db supabase/tests/client_onboarding.test.sql
```

Expected: FAIL because the onboarding objects do not exist.

- [ ] **Step 4: Create tables and exact constraints in the CLI migration**

Use `bigint generated always as identity` for catalog/event IDs, `timestamptz` for instants, and `on delete restrict` for Auth/catalog references. The profile shape must include:

```sql
create table public.onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null,
  whatsapp_e164 text not null,
  segment_id bigint not null references public.business_segments(id) on delete restrict,
  subcategory_id bigint,
  custom_subcategory text,
  whatsapp_marketing_consent boolean not null default false,
  marketing_consent_granted_at timestamptz,
  completed_at timestamptz not null default pg_catalog.statement_timestamp(),
  updated_at timestamptz not null default pg_catalog.statement_timestamp(),
  version integer not null default 0,
  constraint onboarding_profiles_name_check
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint onboarding_profiles_phone_check
    check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint onboarding_profiles_subcategory_shape_check check (
    (subcategory_id is not null and custom_subcategory is null)
    or (subcategory_id is null and char_length(btrim(custom_subcategory)) between 2 and 80)
  ),
  constraint onboarding_profiles_consent_shape_check check (
    whatsapp_marketing_consent = (marketing_consent_granted_at is not null)
  ),
  constraint onboarding_profiles_version_check check (version >= 0)
);
```

Create `unique (id, segment_id)` on subcategories, then add the profile FK `(subcategory_id, segment_id)`. Create case-insensitive unique expression indexes for segment names globally and subcategory names per segment. Add the indexes required by the spec, including the partial consent index.

Seed the eight approved segments and five approved subcategories in the migration with deterministic `sort_order` values 10, 20, …; do not create an “Outro” row.

- [ ] **Step 5: Add RLS, least-privilege grants, and read projections**

Enable RLS on all public tables. Grant authenticated clients `SELECT` on catalog tables and their profile, but no table mutations. The profile policy is:

```sql
create policy onboarding_profiles_select_own
on public.onboarding_profiles for select to authenticated
using ((select auth.uid()) = user_id);
```

`current_user_has_completed_onboarding()` returns `false` for a missing identity/profile and uses caller identity only. `list_business_catalog_v1()` returns deterministic camelCase JSON arrays with active state and subcategories ordered by `sort_order, id`. `get_my_onboarding_profile_v1()` returns `null` or the caller's bounded profile plus current labels. Grant execute only to `authenticated` after revoking from `public`, `anon`, and `service_role`.

- [ ] **Step 6: Run focused SQL tests**

```bash
pnpm exec supabase test db supabase/tests/client_onboarding.test.sql
```

Expected: all schema, read, and RLS assertions in the current test pass.

- [ ] **Step 7: Commit the schema checkpoint**

```bash
git add supabase/migrations/ supabase/tests/client_onboarding.test.sql
git commit -m "feat: add onboarding profile foundation"
```

---

### Task 2: Add atomic profile and consent persistence

**Files:**

- Create via CLI: exact path printed by `pnpm exec supabase migration new add_client_onboarding_profile_save`
- Modify: `supabase/tests/client_onboarding.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: tables from Task 1.
- Produces: `public.save_onboarding_profile_v1(text,text,bigint,bigint,text,boolean,text,integer) returns jsonb`; result statuses `saved`, `conflict`, `catalog_inactive`; current `version` in successful output.

- [ ] **Step 1: Add failing save, consent, idempotency, and archive tests**

Under an authenticated JWT, call:

```sql
select public.save_onboarding_profile_v1(
  'Maria da Silva',
  '+5511999999999',
  (select id from public.business_segments where name = 'Alimentação'),
  (select id from public.business_subcategories where name = 'Confeitaria'),
  null, true, 'whatsapp-marketing-v1', null
);
```

Assert normalized name, `version = 0`, non-null granted time, and one `granted/onboarding` event. Repeat an update with `expected_version = 0` and unchanged consent; assert `version = 1` and still one event. Revoke with `expected_version = 1`; assert `version = 2`, null granted time, and a `revoked/account` event. Test initial unchecked as `declined/onboarding`, stale version as `conflict`, active mismatch as `catalog_inactive`, archived new selection as `catalog_inactive`, and unchanged archived current selection as `saved`.

- [ ] **Step 2: Run the SQL test and verify failure**

```bash
pnpm exec supabase test db supabase/tests/client_onboarding.test.sql
```

Expected: FAIL because `save_onboarding_profile_v1` is absent.

- [ ] **Step 3: Create the persistence migration**

```bash
pnpm exec supabase migration new add_client_onboarding_profile_save
```

Expected: one empty migration ending in `_add_client_onboarding_profile_save.sql`. Put all remaining database work for this task in that file; do not modify the committed Task 1 migration.

- [ ] **Step 4: Implement the append-only event boundary**

Create `private.whatsapp_consent_events` with `decision in ('granted','declined','revoked')`, `source in ('onboarding','account')`, copy-version length 1–64, indexed `(user_id, created_at desc, id desc)`. Revoke all direct access. Add a trigger function that always rejects UPDATE and rejects DELETE for every session user except the database owner `postgres`; that narrow owner exception is required only for deterministic local seed replacement in plan 3. Prove `authenticated`, `anon`, and `service_role` cannot mutate history, and revoke trigger-function execute permission from public roles.

- [ ] **Step 5: Implement the versioned save RPC**

Use a public `SECURITY DEFINER` entrypoint with empty search path. It must:

```text
1. derive caller_id from auth.uid(); reject null;
2. normalize full_name and custom_subcategory with btrim plus collapsed spaces;
3. reject any length, E.164, copy-version, or subcategory-shape violation;
4. lock the existing profile FOR UPDATE when present;
5. require expected_version NULL on insert and exact match on update;
6. validate segment/subcategory pairing and active-state rules;
7. insert/update the profile and increment version exactly once;
8. append granted/declined with source onboarding on insert, or granted/revoked with source account only on a changed choice; derive source from insert-versus-update rather than accepting it from the caller;
9. return {"status":"saved","version":N} or a stable non-exception domain status.
```

Unexpected database errors remain errors; do not convert them into misleading success. Grant execute only to `authenticated`.

- [ ] **Step 6: Rebuild locally, run pgTAP, advisors, and generate types**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/client_onboarding.test.sql
pnpm supabase:advisors
pnpm supabase:lint
pnpm supabase:types
```

Expected: all onboarding SQL tests pass, no new advisor/lint errors, and generated types include all four RPCs.

- [ ] **Step 7: Commit the persistence checkpoint**

```bash
git add supabase/migrations/ supabase/tests/client_onboarding.test.sql \
  src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: persist onboarding profiles and consent"
```

---

### Task 3: Add strict application contracts and server services

**Files:**

- Create: `src/modules/onboarding/onboarding.schema.ts`
- Create: `src/modules/onboarding/onboarding.schema.test.ts`
- Create: `src/modules/onboarding/get-onboarding.service.ts`
- Create: `src/modules/onboarding/get-onboarding.service.test.ts`
- Create: `src/modules/onboarding/actions/save-onboarding-profile.action.ts`
- Create: `src/modules/onboarding/actions/save-onboarding-profile.action.test.ts`

**Interfaces:**

- Consumes: generated `list_business_catalog_v1`, `get_my_onboarding_profile_v1`, `save_onboarding_profile_v1`.
- Produces: `getOnboardingData(): Promise<OnboardingData>`; `saveOnboardingProfile(input: unknown): Promise<SaveOnboardingResult>`; `ONBOARDING_CONSENT_COPY_VERSION`.

- [ ] **Step 1: Write failing schema tests**

Define fixtures and assert these boundaries:

```ts
expect(
  onboardingInputSchema.safeParse({
    fullName: "Maria da Silva",
    whatsappE164: "+5511999999999",
    segmentId: 1,
    subcategoryId: 2,
    customSubcategory: null,
    whatsappMarketingConsent: false,
    expectedVersion: null,
  }).success,
).toBe(true);

expect(
  onboardingInputSchema.safeParse({
    fullName: "Maria",
    whatsappE164: "+5511999999999",
    segmentId: 1,
    subcategoryId: 2,
    customSubcategory: "Confeitaria",
    whatsappMarketingConsent: false,
    expectedVersion: null,
  }).success,
).toBe(false);
```

Test every exact max length, invalid integers, malformed phone, both/neither subcategory, and strict rejection of unknown keys.

- [ ] **Step 2: Run schema tests and verify failure**

```bash
pnpm exec vitest run src/modules/onboarding/onboarding.schema.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement schemas and public types**

Export strict schemas for `BusinessSegment`, `BusinessSubcategory`, `OnboardingProfile`, catalog RPC payload, profile RPC payload, action input, and RPC result. Use `z.coerce.number().int().positive()` only at the FormData boundary; domain schemas accept real numbers. Export:

```ts
const ONBOARDING_CONSENT_COPY_VERSION = "whatsapp-marketing-v1" as const;
type OnboardingData = {
  catalog: BusinessSegment[];
  profile: OnboardingProfile | null;
};
type SaveOnboardingResult =
  | { status: "saved"; version: number }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "conflict" | "catalog_inactive" | "error" };
```

Validate WhatsApp with the E.164 shape and `isPossiblePhoneNumber` from `react-phone-number-input`; do not use metadata-sensitive validity as proof that a number owns WhatsApp. The database regex remains the final shape constraint.

- [ ] **Step 4: Write failing service/action tests**

Mock `requireUser().supabase.rpc`. Assert `getOnboardingData` calls both read RPCs, strictly parses them, and throws `OnboardingUnavailableError` on RPC/schema failure. Assert the action rejects invalid input before authentication, passes normalized fields and copy version to the save RPC, maps stable statuses, and calls `revalidatePath("/account")` plus `revalidatePath("/onboarding")` only after `saved`.

- [ ] **Step 5: Run focused tests and verify failure**

```bash
pnpm exec vitest run \
  src/modules/onboarding/get-onboarding.service.test.ts \
  src/modules/onboarding/actions/save-onboarding-profile.action.test.ts
```

Expected: FAIL because services/actions are absent.

- [ ] **Step 6: Implement services and action**

Keep reads server-only. Use the Supabase client returned by `requireUser`, not an admin client. The action accepts the typed object submitted by the client component, validates it, calls `save_onboarding_profile_v1`, and returns only the stable union above. It never logs raw input.

- [ ] **Step 7: Run focused tests and commit**

```bash
pnpm exec vitest run src/modules/onboarding
git add src/modules/onboarding/onboarding.schema.ts \
  src/modules/onboarding/onboarding.schema.test.ts \
  src/modules/onboarding/get-onboarding.service.ts \
  src/modules/onboarding/get-onboarding.service.test.ts \
  src/modules/onboarding/actions/
git commit -m "feat: add onboarding application contracts"
```

---

### Task 4: Install and adapt the UI-X Phone Input

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/components/ui/phone-input-primitive.tsx`
- Create: `src/components/ui/phone-input.tsx`
- Create: `src/components/ui/phone-input.test.tsx`

**Interfaces:**

- Consumes: project `Input`, `Select`, `cn`; UI-X source contract; `react-phone-number-input` `Value`/`Country`.
- Produces: `PhoneInput`, `PhoneInputInput`, `PhoneInputCountrySelect`, `PhoneInputCountrySelectValue`, `PhoneInputCountrySelectContent`, `PhoneInputCountrySelectOptions`, `Value`, `Country`.

- [ ] **Step 1: Write the failing component contract tests**

Render the composed field with `preferredCountry="BR"`, controlled `value`, and `onValueChange`. Assert the country trigger is keyboard operable, typing a Brazilian national number yields `+5511999999999`, an initial E.164 value renders without losing focus, selecting an international country updates output, and `aria-invalid` reaches the input.

- [ ] **Step 2: Run the test and verify failure**

```bash
pnpm exec vitest run src/components/ui/phone-input.test.tsx
```

Expected: FAIL because the UI-X files and dependencies are absent.

- [ ] **Step 3: Install exact dependencies**

```bash
pnpm add --save-exact @base-ui/utils@0.3.1 react-phone-number-input@3.4.18
```

Do not use a floating range. Confirm both exact versions appear in `package.json` and the lockfile.

- [ ] **Step 4: Copy the two UI-X components into project-owned paths**

Use the official UI-X v4 implementations of `phone-input-primitive.tsx` and `phone-input.tsx`. Change imports from `@/registry/new-york/ui/...` to `@/components/ui/...`; preserve the memoized rendered input and stable callback workaround. Translate visible country labels to `react-phone-number-input/locale/pt-BR` and use “Internacional” instead of “International”. Do not introduce runtime imports from `ui-x.junwen-k.dev`.

- [ ] **Step 5: Pass the component tests and commit**

```bash
pnpm exec vitest run src/components/ui/phone-input.test.tsx
pnpm typecheck
git add package.json pnpm-lock.yaml src/components/ui/phone-input*.tsx
git commit -m "feat: add UI-X phone input"
```

---

### Task 5: Build the shared onboarding form and focused route

**Files:**

- Create: `src/modules/onboarding/components/onboarding-form.tsx`
- Create: `src/modules/onboarding/components/onboarding-form.test.tsx`
- Create: `src/app/(onboarding)/onboarding/layout.tsx`
- Create: `src/app/(onboarding)/onboarding/layout.test.tsx`
- Create: `src/app/(onboarding)/onboarding/page.tsx`
- Create: `src/app/(onboarding)/onboarding/page.test.tsx`

**Interfaces:**

- Consumes: `OnboardingData`, `saveOnboardingProfile`, composed Phone Input.
- Produces: `OnboardingForm({ data, mode: "onboarding" | "account", action })`.

- [ ] **Step 1: Write failing form interaction tests**

Assert the exact heading/copy and field order. Cover: subcategory disabled before segment; only matching active options after selection; changing segment clears subcategory; “Outro” reveals a required 80-character field; checkbox starts unchecked for a new profile; phone starts in Brazil; invalid action response moves focus to an alert summary; values survive `catalog_inactive`; account mode displays the profile's current archived segment/subcategory with an `Arquivada` label but offers no other archived choice; saved onboarding calls `router.replace("/quick-diagnosis")` and `router.refresh()`.

- [ ] **Step 2: Run the form test and verify failure**

```bash
pnpm exec vitest run src/modules/onboarding/components/onboarding-form.test.tsx
```

Expected: FAIL because the form is absent.

- [ ] **Step 3: Implement the shared form**

Use controlled state so conditional fields and server failures preserve values. Submit the typed object rather than trusting hidden text. New choices list only active catalog entries; account mode may retain its exact archived current pair until the client deliberately changes it. The consent label and helper must be exactly:

```text
Quero receber pelo WhatsApp novidades, conteúdos e ofertas do Lucrivo.
Esta autorização é opcional e pode ser cancelada a qualquer momento.
```

In account mode, append `Esta escolha se aplica ao número de WhatsApp salvo acima.` so changing the number does not silently imply a new consent decision.

Use CTA `Começar meu diagnóstico` in onboarding mode and `Salvar alterações` in account mode. Use native labels/descriptions, `aria-invalid`, `aria-describedby`, an alert summary with programmatic focus, and disabled/pending labels without removing controls.

- [ ] **Step 4: Write failing route/layout tests**

Mock `requireUser`, `getOnboardingData`, and `redirect`. Assert unauthenticated access redirects `/login`, unavailable accounts redirect `/account-unavailable`, a completed profile redirects `/dashboard`, and an incomplete client sees the shell-free form with logo and no sidebar.

- [ ] **Step 5: Implement the route group**

The onboarding layout performs only authentication/eligibility handling. The page loads `getOnboardingData`, redirects completed profiles, and renders the form. Keep it outside `(private)` to prevent the completion gate from redirecting itself.

- [ ] **Step 6: Run focused tests and commit**

```bash
pnpm exec vitest run \
  src/modules/onboarding/components/onboarding-form.test.tsx \
  'src/app/(onboarding)/onboarding/layout.test.tsx' \
  'src/app/(onboarding)/onboarding/page.test.tsx'
git add src/modules/onboarding/components/ src/app/'(onboarding)'/
git commit -m "feat: add required onboarding experience"
```

---

### Task 6: Enforce onboarding in authenticated routing

**Files:**

- Modify: `src/modules/auth/services/resolve-authenticated-home.ts`
- Modify: `src/modules/auth/services/resolve-authenticated-home.test.ts`
- Modify: `src/app/(private)/layout.tsx`
- Modify: `src/app/(private)/layout.test.tsx`

**Interfaces:**

- Consumes: `current_user_has_completed_onboarding()`.
- Produces: authenticated home union including `/onboarding`; private layout redirect for incomplete non-admin clients.

- [ ] **Step 1: Add failing resolver tests**

Assert call order and destinations:

```ts
// eligible admin: eligibility -> admin, returns /admin without onboarding RPC
// eligible client, incomplete: eligibility -> admin(false) -> onboarding(false), returns /onboarding
// eligible client, complete: eligibility -> admin(false) -> onboarding(true), returns /dashboard
// onboarding RPC error or non-boolean: fail closed to /account-unavailable
```

- [ ] **Step 2: Add failing private-layout tests**

For a non-admin, mock completion false and expect `redirect:/onboarding`; for complete expect the shell. For an admin using the financial area, bypass completion and preserve `isAdminUser=true`. Assert an onboarding RPC failure redirects `/account-unavailable`, not `/dashboard`.

- [ ] **Step 3: Run tests and verify failure**

```bash
pnpm exec vitest run \
  src/modules/auth/services/resolve-authenticated-home.test.ts \
  'src/app/(private)/layout.test.tsx'
```

Expected: FAIL because authenticated routing does not query completion.

- [ ] **Step 4: Implement fail-closed routing**

Extend `AuthenticatedHome` with `/onboarding`. Preserve eligibility as the first check and admin resolution as the second. Query completion only for regular clients. In the private layout, reuse the existing Supabase client: resolve admin first; only non-admin clients call the completion RPC. Treat an invalid/error result as unavailable.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm exec vitest run \
  src/modules/auth/services/resolve-authenticated-home.test.ts \
  'src/app/(private)/layout.test.tsx' \
  src/app/auth/continue/route.test.ts \
  src/app/auth/confirm/route.test.ts
git add src/modules/auth/services/resolve-authenticated-home* \
  'src/app/(private)/layout.tsx' 'src/app/(private)/layout.test.tsx'
git commit -m "feat: gate client routes on onboarding"
```

---

### Task 7: Add Minha conta and account navigation

**Files:**

- Create: `src/app/(private)/account/page.tsx`
- Create: `src/app/(private)/account/page.test.tsx`
- Modify: `src/components/layout/account-menu.tsx`
- Modify: `src/components/layout/account-menu.test.tsx`

**Interfaces:**

- Consumes: shared `OnboardingForm` in `account` mode and `getOnboardingData`.
- Produces: `/account` profile editor and account-menu link.

- [ ] **Step 1: Write failing page/menu tests**

Assert `/account` loads a completed profile, displays email read-only plus the shared editor, and redirects an impossible missing profile to `/onboarding`. In the menu, assert a keyboard-accessible `Minha conta` link to `/account` appears before the separator and logout remains a separate destructive action.

- [ ] **Step 2: Run tests and verify failure**

```bash
pnpm exec vitest run \
  'src/app/(private)/account/page.test.tsx' \
  src/components/layout/account-menu.test.tsx
```

Expected: FAIL because page and link are absent.

- [ ] **Step 3: Implement account maintenance**

Load claims for the read-only email, load onboarding data, and pass the existing profile to the shared form. On save, stay on `/account`, show `Perfil atualizado`, replace the local version with the returned version, and leave consent unchanged unless the checkbox changes.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm exec vitest run \
  'src/app/(private)/account/page.test.tsx' \
  src/components/layout/account-menu.test.tsx \
  src/modules/onboarding/components/onboarding-form.test.tsx
git add 'src/app/(private)/account/' src/components/layout/account-menu*
git commit -m "feat: let clients maintain onboarding profile"
```

---

### Task 8: Verify the complete client foundation

**Files:**

- Modify only if a verification finding requires a scoped correction to files already listed in this plan.

**Interfaces:**

- Consumes: all plan 1 deliverables.
- Produces: a clean, tested foundation for plans 2 and 3.

- [ ] **Step 1: Run the complete database gate**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:advisors
pnpm supabase:lint
pnpm supabase:types
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
```

Expected: reset, all pgTAP tests, advisors, and lint pass; generated types are current.

- [ ] **Step 2: Run application quality gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Expected: all commands pass.

- [ ] **Step 3: Perform one bounded visual inspection**

Inspect `/onboarding` and `/account` together at desktop and mobile widths in light and dark themes. Verify no horizontal overflow, the country list is keyboard usable, the custom field appears without layout jump, focus reaches errors, and pending/error states preserve data. Fix findings in one batch, then perform at most one confirmation pass.

- [ ] **Step 4: Commit verification fixes if any**

```bash
git status --short
git add package.json pnpm-lock.yaml src supabase
git commit -m "fix: harden client onboarding flow"
```

Skip this commit when verification made no changes. End with `git status --short` showing no unintended files.
