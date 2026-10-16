# Bonus Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated Bônus page, secure delivery of three private materials, and permanent paid-customer access that survives cancellation or expiration but is revoked by full refund or chargeback.

**Architecture:** A per-contract `bonus_access_grants` ledger is updated inside the existing transactional Asaas webhook reducer and backfilled for paid access active at release. Three allow-listed objects live in a private Supabase Storage bucket; narrow Storage RLS and a server route jointly enforce access before issuing short-lived signed URLs. A typed bonus module supplies display-safe availability state to a responsive page and upgrade dialog.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/Auth/Storage, PostgreSQL RLS, pgTAP, Tailwind CSS 4, Base UI/shadcn components, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-bonus-library-design.md`

## Global Constraints

- Final binary materials never enter Git or `public/`; only canonical Storage paths are versioned.
- The private bucket is `bonus-materials`; canonical objects are `ebook/ebook.pdf`, `guide/guide.pdf`, and `spreadsheet/cash-flow.xlsx`.
- Authentication unlocks only the e-book; guide and spreadsheet require at least one non-revoked paid-contract grant.
- Courtesy access and administrator status do not qualify.
- Cancellation, expiration, and non-renewal preserve grants; full refund and the existing chargeback transition revoke only the matching contract grant.
- Browser input may select only the allow-listed slug `ebook`, `guide`, or `cash-flow`; it never controls bucket or object paths.
- User-facing copy is Brazilian Portuguese; code identifiers remain English.
- All exposed tables use RLS and explicit grants. Do not authorize with `user_metadata`.
- Keep current packages and visual tokens; add no dependency.
- Before SQL implementation, re-check the current Supabase changelog and official Storage private-bucket, signed-URL, and access-control documentation required by the Supabase skill.
- Use the Supabase CLI to create the imperative migration; do not hand-invent its timestamped filename.

---

### Task 1: Persist and synchronize permanent bonus grants

**Files:**

- Create via `pnpm exec supabase migration new create_bonus_library`: the CLI-emitted `create_bonus_library` migration under `supabase/migrations/`
- Create: `supabase/tests/bonus_library.test.sql`
- Modify: `supabase/tests/billing_webhooks.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `public.billing_contracts`, `private.apply_asaas_webhook_event_v1(text,text,jsonb)`, and the existing paid-access predicate `status in ('active', 'cancel_at_period_end')` with a live access interval.
- Produces: `public.bonus_access_grants`, private bucket `bonus-materials`, authenticated owner reads, narrow object-read RLS, and atomic grant/revoke behavior in the webhook reducer.

- [ ] **Step 1: Verify current Supabase guidance and discover the migration command**

Read the official changelog plus Storage access-control, bucket, and signed-URL docs. Then run:

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new create_bonus_library
```

Expected: the CLI prints one new timestamped migration path. Keep that exact path for every migration edit below.

- [ ] **Step 2: Write the failing pgTAP contract**

Create `supabase/tests/bonus_library.test.sql` with `begin`, `create extension if not exists pgtap with schema extensions`, `select no_plan()`, and `finish()/rollback`. Cover the table shape, unique contract, partial live-grant index, constraints, RLS, privileges, bucket configuration, backfill, owner isolation, multiple contracts, and revocation.

The core assertions and fixtures must include:

```sql
select has_table('public', 'bonus_access_grants');
select columns_are(
  'public',
  'bonus_access_grants',
  array[
    'id', 'user_id', 'contract_id', 'granted_at', 'revoked_at',
    'revocation_reason', 'created_at'
  ]
);
select col_is_unique(
  'public', 'bonus_access_grants', 'contract_id',
  'one bonus grant exists per paid contract'
);
select has_index(
  'public', 'bonus_access_grants',
  'bonus_access_grants_live_user_idx',
  'live grant lookups use a partial owner index'
);
select policies_are(
  'public', 'bonus_access_grants',
  array['bonus_access_grants_select_own']
);
select table_privs_are(
  'public', 'bonus_access_grants', 'authenticated', array[]::text[]
);
select is(
  (select public from storage.buckets where id = 'bonus-materials'),
  false,
  'bonus materials bucket is private'
);
```

Use fixed UUIDs to create two users and three paid contracts. Insert a live grant for each contract, revoke one contract, set `request.jwt.claim.sub`, and assert that the owner sees only their rows and remains entitled while one live row exists. Assert that `authenticated` cannot insert, update, or delete. Assert that inconsistent `(revoked_at, revocation_reason)` pairs and a duplicate `contract_id` fail.

Extend `supabase/tests/billing_webhooks.test.sql` after existing activation and refund assertions:

```sql
select results_eq(
  $$
    select contract_id, user_id, revoked_at, revocation_reason
    from public.bonus_access_grants
    where contract_id = '92000000-0000-4000-8000-000000000002'
  $$,
  $$ values (
    '92000000-0000-4000-8000-000000000002'::uuid,
    '91000000-0000-4000-8000-000000000002'::uuid,
    null::timestamptz,
    null::text
  ) $$,
  'first confirmed payment grants the permanent bonus idempotently'
);
```

Add equivalent assertions that duplicate activation leaves one row, normal cancellation leaves it live, `PAYMENT_REFUNDED` sets `full_refund`, partial refund leaves it live, and the reducer's existing chargeback branch sets `chargeback`.

- [ ] **Step 3: Rebuild and verify the tests fail for the missing feature**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/bonus_library.test.sql supabase/tests/billing_webhooks.test.sql --local
```

Expected: FAIL because `bonus_access_grants` and `bonus-materials` do not exist and the reducer creates no grants.

- [ ] **Step 4: Implement schema, bucket, RLS, and active-subscriber backfill**

In the CLI-created migration, add:

```sql
create table public.bonus_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contract_id uuid not null unique
    references public.billing_contracts (id) on delete cascade,
  granted_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default statement_timestamp(),
  constraint bonus_access_grants_revocation_reason_check check (
    revocation_reason is null
    or revocation_reason in ('full_refund', 'chargeback')
  ),
  constraint bonus_access_grants_revocation_state_check check (
    (revoked_at is null) = (revocation_reason is null)
  )
);

create index bonus_access_grants_live_user_idx
on public.bonus_access_grants (user_id)
where revoked_at is null;

alter table public.bonus_access_grants enable row level security;

create policy bonus_access_grants_select_own
on public.bonus_access_grants
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.bonus_access_grants
from public, anon, authenticated, service_role;
grant select (id, user_id, contract_id, granted_at, revoked_at, created_at)
on public.bonus_access_grants to authenticated;
grant select, insert, update, delete on public.bonus_access_grants
to service_role;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'bonus-materials',
  'bonus-materials',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
```

Add one `storage.objects` SELECT policy limited to the three exact names. The e-book predicate requires only an authenticated subject. The guide/spreadsheet predicate requires an owned row in `public.bonus_access_grants` with `revoked_at is null`. Grant no object INSERT, UPDATE, or DELETE policy to client roles.

```sql
create policy bonus_materials_read_allowed_objects
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bonus-materials'
  and (
    name = 'ebook/ebook.pdf'
    or (
      name in (
        'guide/guide.pdf',
        'spreadsheet/cash-flow.xlsx'
      )
      and exists (
        select 1
        from public.bonus_access_grants as bonus_grant
        where bonus_grant.user_id = (select auth.uid())
          and bonus_grant.revoked_at is null
      )
    )
  )
);
```

Backfill only currently paid contracts:

```sql
insert into public.bonus_access_grants (
  user_id, contract_id, granted_at
)
select
  contract.user_id,
  contract.id,
  contract.access_starts_at
from public.billing_contracts as contract
where contract.status in ('active', 'cancel_at_period_end')
  and contract.access_starts_at <= statement_timestamp()
  and contract.access_ends_at > statement_timestamp()
on conflict (contract_id) do nothing;
```

- [ ] **Step 5: Extend the transactional webhook reducer**

Copy the complete current definition of `private.apply_asaas_webhook_event_v1` from `20261012220800_add_launch_offer_catalog.sql` into `create or replace function` in the new migration. Do not create a trigger or application-side follow-up write.

After the `CHECKOUT_PAID` branch and after the `PAYMENT_CONFIRMED` activation branches, execute this idempotent insert inside the same function transaction:

```sql
insert into public.bonus_access_grants (
  user_id, contract_id, granted_at
)
select contract.user_id, contract.id, contract.access_starts_at
from public.billing_contracts as contract
where contract.id = v_contract.id
  and contract.status in ('active', 'cancel_at_period_end')
  and contract.access_starts_at is not null
on conflict (contract_id) do nothing;
```

Inside `PAYMENT_REFUNDED`, after the contract update, add:

```sql
update public.bonus_access_grants
set revoked_at = coalesce(revoked_at, v_event_at),
    revocation_reason = coalesce(revocation_reason, 'full_refund')
where contract_id = v_contract.id;
```

Inside the existing chargeback branch, use the same update with
`revocation_reason = coalesce(revocation_reason, 'chargeback')`. Do not revoke
on `PAYMENT_PARTIALLY_REFUNDED`, cancellation, expiration, or subscription
inactivation.

- [ ] **Step 6: Run the database contract and generate stable types**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/bonus_library.test.sql supabase/tests/billing_webhooks.test.sql --local
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
sha256sum src/infrastructure/database/supabase/database.types.ts
pnpm supabase:types
sha256sum src/infrastructure/database/supabase/database.types.ts
```

Expected: focused pgTAP PASS; lint/advisors add no actionable finding; the two generated-type hashes match exactly.

- [ ] **Step 7: Commit the database slice**

```bash
git add supabase/migrations supabase/tests/bonus_library.test.sql supabase/tests/billing_webhooks.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: persist permanent bonus access"
```

---

### Task 2: Define the bonus catalog and server read model

**Files:**

- Create: `src/modules/bonus/bonus-catalog.ts`
- Create: `src/modules/bonus/bonus-catalog.test.ts`
- Create: `src/modules/bonus/services/get-bonus-library.service.ts`
- Create: `src/modules/bonus/services/get-bonus-library.service.test.ts`

**Interfaces:**

- Consumes: an authenticated `SupabaseClient<Database>` whose JWT is subject to grant and Storage RLS.
- Produces: `BONUS_MATERIALS`, `getBonusMaterial(slug)`, `hasPermanentBonusAccess({ supabase, userId })`, `getBonusObjectStatus({ supabase, material })`, and `getBonusLibrary({ supabase, userId })`.

- [ ] **Step 1: Write failing catalog tests**

Assert exact slug-to-path mapping, access kind, and delivery mode:

```ts
expect(
  BONUS_MATERIALS.map(({ slug, objectPath }) => [slug, objectPath]),
).toEqual([
  ["ebook", "ebook/ebook.pdf"],
  ["guide", "guide/guide.pdf"],
  ["cash-flow", "spreadsheet/cash-flow.xlsx"],
]);
expect(getBonusMaterial("../../secret")).toBeNull();
expect(getBonusMaterial("guide")?.requiresPaidAccess).toBe(true);
```

Run `pnpm vitest run src/modules/bonus/bonus-catalog.test.ts` and expect module-not-found failure.

- [ ] **Step 2: Implement the immutable catalog**

Define and export:

```ts
const BONUS_BUCKET = "bonus-materials";
type BonusMaterialSlug = "ebook" | "guide" | "cash-flow";
type BonusDelivery = "new_tab" | "download";
type BonusMaterial = {
  slug: BonusMaterialSlug;
  typeLabel: "E-book" | "Guia" | "Planilha";
  title: string;
  description: string;
  objectPath: string;
  requiresPaidAccess: boolean;
  delivery: BonusDelivery;
  downloadName: string | null;
};
```

Use the approved working labels and Portuguese descriptions. `getBonusMaterial(slug: string)` must use exact equality against `BONUS_MATERIALS` and return `null` for every unknown value.

- [ ] **Step 3: Write failing read-model tests**

Mock Supabase's fluent grant query and `storage.from(BONUS_BUCKET).list`. Cover:

```ts
expect(result).toEqual({
  status: "success",
  overview: {
    unlockedCount: 1,
    hasPermanentAccess: false,
    materials: expect.arrayContaining([
      expect.objectContaining({ slug: "ebook", access: "available" }),
      expect.objectContaining({ slug: "guide", access: "locked" }),
    ]),
  },
});
```

Also assert: one live grant yields three unlocked materials; courtesy has no special input and therefore remains locked; exact filename match is required; a missing object produces `availability: "preparing"`; a Storage error produces `availability: "unavailable"`; grant-read errors return `{ status: "read_failed" }`; and locked materials do not require a Storage list call.

Run `pnpm vitest run src/modules/bonus/services/get-bonus-library.service.test.ts` and expect failure.

- [ ] **Step 4: Implement entitlement and object helpers**

Use these stable result types:

```ts
type BonusMaterialView = Omit<
  BonusMaterial,
  "objectPath" | "requiresPaidAccess" | "downloadName"
> & {
  access: "available" | "locked";
  availability: "ready" | "preparing" | "unavailable";
};

type BonusAccessResult =
  | { status: "success"; hasPermanentAccess: boolean }
  | { status: "read_failed" };

type BonusObjectResult =
  { status: "ready" } | { status: "missing" } | { status: "unavailable" };

type BonusLibraryResult =
  | {
      status: "success";
      overview: {
        unlockedCount: 1 | 3;
        hasPermanentAccess: boolean;
        materials: BonusMaterialView[];
      };
    }
  | { status: "read_failed" };
```

`hasPermanentBonusAccess` must query `bonus_access_grants`, filter the supplied `userId`, require `revoked_at is null`, limit to one row, and return `read_failed` on any Supabase error. `getBonusObjectStatus` must split the canonical path into folder and filename, list only that folder with `search: filename`, require an exact returned `name` match, and distinguish `missing` from `unavailable`. `getBonusLibrary` checks Storage only for materials the user may access, maps `missing` to `preparing`, preserves `unavailable`, and never includes object paths in its return value.

- [ ] **Step 5: Run focused tests and commit**

```bash
pnpm vitest run src/modules/bonus/bonus-catalog.test.ts src/modules/bonus/services/get-bonus-library.service.test.ts
pnpm typecheck
git add src/modules/bonus
git commit -m "feat: add bonus library read model"
```

Expected: catalog/read-model tests and typecheck PASS.

---

### Task 3: Authorize and sign material downloads

**Files:**

- Create: `src/modules/bonus/services/get-bonus-download.service.ts`
- Create: `src/modules/bonus/services/get-bonus-download.service.test.ts`
- Create: `src/app/api/bonus/[slug]/route.ts`
- Create: `src/app/api/bonus/[slug]/route.test.ts`

**Interfaces:**

- Consumes: `getBonusMaterial`, `hasPermanentBonusAccess`, `getBonusObjectStatus`, authenticated user ID, and session-bound Supabase client.
- Produces: `getBonusDownload({ supabase, userId, slug })` and `GET /api/bonus/:slug`.

- [ ] **Step 1: Write failing download-service tests**

Cover unknown slug, free e-book, forbidden protected material, missing object, signing failure, PDF delivery, and spreadsheet download name. Use this result union:

```ts
type BonusDownloadResult =
  | { status: "ready"; signedUrl: string; delivery: "new_tab" | "download" }
  | { status: "not_found" | "forbidden" | "preparing" | "unavailable" };
```

Assert signing arguments exactly:

```ts
expect(createSignedUrl).toHaveBeenCalledWith("ebook/ebook.pdf", 60);
expect(createSignedUrl).toHaveBeenCalledWith("spreadsheet/cash-flow.xlsx", 60, {
  download: "planilha-controle-fluxo-de-caixa.xlsx",
});
```

Run the test and expect module-not-found failure.

- [ ] **Step 2: Implement the fail-closed download service**

Resolve the slug before any Storage call. For paid materials, require a successful entitlement read with a live grant before checking object presence; map an entitlement read failure to `unavailable`, never `forbidden`. Verify presence immediately before signing to give missing files a stable `preparing` result and Storage failures a stable `unavailable` result. Sign for 60 seconds; omit options for PDFs and pass the fixed Portuguese filename for the spreadsheet. Catch signing exceptions and return `unavailable`; never log the signed URL.

- [ ] **Step 3: Write failing route tests**

Mock `requireClientAccess` and `getBonusDownload`. Cover:

- unauthenticated → JSON `401 unauthorized`;
- legal acceptance required → JSON `403 legal_acceptance_required`;
- unknown slug → JSON `404 material_not_found`;
- forbidden → `303 /bonus?notice=locked`;
- preparing → `303 /bonus?notice=preparing`;
- unavailable → `303 /bonus?notice=unavailable`;
- ready → `302` to the exact signed URL;
- every response contains `Cache-Control: private, no-store` and no provider IDs, bucket path, secret, or signed token in error bodies.

Run `pnpm vitest run 'src/app/api/bonus/[slug]/route.test.ts'` and expect failure.

- [ ] **Step 4: Implement the route**

Use the Next.js 16 async context shape:

```ts
async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  // authenticate, call getBonusDownload, map stable outcomes
}
```

Reuse the authenticated Supabase client returned by `requireClientAccess`; do not create an admin client. Build internal notice redirects from `new URL("/bonus", request.url)` and set only the fixed `notice` values above. Use `NextResponse.redirect(result.signedUrl, 302)` only for the server-produced signed URL.

- [ ] **Step 5: Run focused tests and commit**

```bash
pnpm vitest run src/modules/bonus/services/get-bonus-download.service.test.ts 'src/app/api/bonus/[slug]/route.test.ts'
pnpm typecheck
git add src/modules/bonus/services/get-bonus-download.service.ts src/modules/bonus/services/get-bonus-download.service.test.ts 'src/app/api/bonus/[slug]/route.ts' 'src/app/api/bonus/[slug]/route.test.ts'
git commit -m "feat: secure bonus material downloads"
```

---

### Task 4: Build the bonus cards and upgrade dialog

**Files:**

- Create: `src/modules/bonus/components/bonus-upgrade-dialog.tsx`
- Create: `src/modules/bonus/components/bonus-upgrade-dialog.test.tsx`
- Create: `src/modules/bonus/components/bonus-library.tsx`
- Create: `src/modules/bonus/components/bonus-library.test.tsx`

**Interfaces:**

- Consumes: `BonusMaterialView[]`, `unlockedCount`, and an optional stable notice from the route.
- Produces: accessible client component `BonusLibrary` and controlled `BonusUpgradeDialog`.

- [ ] **Step 1: Load the UI quality guidance before editing**

Run the required design guidance commands before editing:

```bash
.agents/skills/impeccable/scripts/impeccable context --target 'src/app/(private)/bonus/page.tsx'
sed -n '1,360p' .agents/skills/impeccable/reference/new-work.md
sed -n '1,360p' .agents/skills/impeccable/reference/craft-floor.md
sed -n '1,320p' /home/pereira/.agents/skills/frontend-design/SKILL.md
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "financial SaaS resource library" --design-system -p "Lucrivo Bônus"
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "responsive cards locked content" --stack nextjs
```

Follow current `PRODUCT.md` and existing app-shell truth over any generic suggestion.

Expected direction: a calm, practical resource shelf within the existing Lucrivo visual system, not a marketing landing page and not a new palette/font system.

- [ ] **Step 2: Write failing dialog tests**

Test the approved copy and actions:

```tsx
expect(
  screen.getByRole("heading", {
    name: "Desbloqueie seus bônus permanentes",
  }),
).toBeVisible();
expect(
  screen.getByText(/continuam disponíveis mesmo se você não renovar/i),
).toBeVisible();
expect(
  screen.getByRole("link", { name: "Conhecer os planos" }),
).toHaveAttribute("href", "/billing");
```

Use `userEvent` to close through **Agora não** and assert the controlled callback. Assert the dialog keeps the existing reduced-motion classes and relies on Base UI focus restoration.

- [ ] **Step 3: Implement the controlled upgrade dialog**

Compose existing `Dialog`, `Button`, and `buttonVariants`. Props are:

```ts
type BonusUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
```

Copy must say that both guide and spreadsheet unlock after confirmed subscription, remain after normal cancellation/expiration, and link to `/billing`. It must not say courtesy or Checkout creation qualifies.

- [ ] **Step 4: Write failing library tests**

Render free, entitled, and preparing states. Assert:

- free summary is `1 de 3 materiais liberados`;
- entitled summary is `3 de 3 materiais liberados`;
- all three titles are always visible;
- a ready PDF link uses `/api/bonus/ebook`, `target="_blank"`, and an accessible new-tab hint;
- the spreadsheet uses `/api/bonus/cash-flow` without `target="_blank"`;
- locked buttons open the upgrade dialog;
- preparing actions are disabled and say `Material em preparação`;
- unavailable actions are disabled and say `Tente novamente mais tarde`;
- statuses include text and icons, not color alone;
- `notice=locked|preparing|unavailable` produces one Portuguese status alert.

- [ ] **Step 5: Implement the responsive material shelf**

Use one client component with local dialog state. Render a semantic `<section>` and three `<article>` cards in a one-column mobile grid that becomes three columns when space permits. Use `BookOpenIcon`, `MapIcon`, and `SheetIcon` from Lucide with a consistent icon-tile treatment, `Badge` for states, and existing brand/muted/success/warning tokens only.

Action rules are exact:

```ts
if (material.access === "locked") return "Desbloquear bônus";
if (material.availability === "preparing") return "Material em preparação";
if (material.availability === "unavailable")
  return "Tente novamente mais tarde";
if (material.slug === "cash-flow") return "Baixar planilha";
return "Ler e baixar";
```

Make every action at least `h-11`, preserve visible focus, hide decorative icons with `aria-hidden`, and add stagger only through existing reduced-motion-safe CSS utilities.

- [ ] **Step 6: Run component tests and commit**

```bash
pnpm vitest run src/modules/bonus/components/bonus-upgrade-dialog.test.tsx src/modules/bonus/components/bonus-library.test.tsx
pnpm typecheck
git add src/modules/bonus/components
git commit -m "feat: build bonus library experience"
```

---

### Task 5: Integrate the private page, loading state, and sidebar

**Files:**

- Create: `src/app/(private)/bonus/page.tsx`
- Create: `src/app/(private)/bonus/page.test.tsx`
- Create: `src/app/(private)/bonus/loading.tsx`
- Create: `src/app/(private)/bonus/loading.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`

**Interfaces:**

- Consumes: `requireUser`, `getBonusLibrary`, `BonusLibrary`, and query notices `locked`, `preparing`, `unavailable`.
- Produces: `/bonus`, its route loading state, and the financial-sidebar entry.

- [ ] **Step 1: Write failing page tests**

Mock `requireUser` and `getBonusLibrary`. Cover free and entitled views, normalized notices, service invocation with the authenticated context, and stable route failure:

```ts
expect(getBonusLibrary).toHaveBeenCalledWith({
  supabase,
  userId: "trusted-user",
});
expect(screen.getByRole("heading", { name: "Bônus", level: 1 })).toBeVisible();
await expect(BonusPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
  "bonus_library_unavailable",
);
```

Unknown, repeated-array, or malformed `notice` values normalize to `null` and render no alert.

- [ ] **Step 2: Implement the page composition**

The server page accepts:

```ts
type BonusPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
  }>;
};
```

Call `requireUser`, then `getBonusLibrary`. Throw `bonus_library_unavailable` on grant-read failure. Render a `max-w-6xl` main, an outcome-focused header, a compact permanent-access assurance, and `BonusLibrary`. Do not send Storage paths or grant rows to the client component.

- [ ] **Step 3: Add and test the loading state**

Create a skeleton that mirrors the header and three-card grid. Test `aria-busy="true"`, `aria-label="Carregando bônus"`, a screen-reader status, and three `data-skeleton-kind="bonus-material"` articles.

- [ ] **Step 4: Add the sidebar item and active-state tests**

Import `GiftIcon` and insert this item before **Plano**:

```ts
{
  label: "Bônus",
  href: "/bonus",
  icon: GiftIcon,
},
```

Extend `app-sidebar.test.tsx` to assert the link, tooltip, and active state on `/bonus`. Also assert `/billing` no longer appears active while `/bonus` is selected.

- [ ] **Step 5: Run the integrated frontend slice**

```bash
pnpm vitest run 'src/app/(private)/bonus/page.test.tsx' 'src/app/(private)/bonus/loading.test.tsx' src/components/layout/app-sidebar.test.tsx src/modules/bonus/components/bonus-library.test.tsx
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: targeted tests, typecheck, lint, and formatting PASS.

- [ ] **Step 6: Inspect desktop and mobile once, then fix in one batch**

Run the app against the local Supabase stack. Capture `/bonus` at representative desktop width and 390-pixel mobile width for a free user and a user with a live grant. Inspect light and dark themes in the same bounded pass for overflow, status contrast, focus visibility, dialog focus return, and 44-pixel actions. Apply one batched correction, then perform at most one confirmation capture.

- [ ] **Step 7: Commit the route integration**

```bash
git add 'src/app/(private)/bonus' src/components/layout/app-sidebar.tsx src/components/layout/app-sidebar.test.tsx
git commit -m "feat: add bonus page to client navigation"
```

---

### Task 6: Add deterministic demo grants and operational documentation

**Files:**

- Modify: `scripts/demo-seed/model.ts`
- Modify: `scripts/demo-seed/ids.ts`
- Modify: `scripts/demo-seed/ids.test.ts`
- Modify: `scripts/demo-seed/render-seed.ts`
- Modify: `scripts/demo-seed/render-seed.test.ts`
- Modify: `supabase/seed.sql` through the generator only
- Modify: `supabase/tests/seed.test.sql`
- Modify: `PRODUCT.md`
- Modify: `docs/asaas-billing-runbook.md`
- Modify: `docs/operations/deployment-runbook.md`

**Interfaces:**

- Consumes: deterministic contracts/payments and canonical Storage paths.
- Produces: repeatable bonus-grant demo states plus upload, refund, reconciliation, and release instructions.

- [ ] **Step 1: Write failing seed-renderer and pgTAP assertions**

Add renderer assertions for `insert into public.bonus_access_grants` and make `supabase/tests/seed.test.sql` verify:

- pending/failed/unpaid contracts create no grant;
- confirmed/received/partially-refunded purchases have live grants;
- refunded grants use `full_refund`;
- chargeback grants use `chargeback`;
- active courtesy-only clients have no grant;
- one seeded user with two contracts remains entitled when only one grant is revoked.

Run:

```bash
pnpm vitest run scripts/demo-seed/render-seed.test.ts scripts/demo-seed/user-scenarios.test.ts
pnpm seed:generate
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/seed.test.sql --local
```

Expected: assertions fail because the generator emits no bonus grants.

- [ ] **Step 2: Extend the deterministic seed model and renderer**

Add:

```ts
type SeedBonusGrant = {
  id: string;
  userId: string;
  contractId: string;
  grantedAt: SeedRelativeTime;
  revokedAt: SeedRelativeTime | null;
  revocationReason: "full_refund" | "chargeback" | null;
};
```

Add `"bonusGrant"` to `SeedUuidKind`, assign it a distinct deterministic prefix in `ids.ts`, and cover that prefix in `ids.test.ts`. Derive grants from paid payment history and render them after contracts exist. `confirmed`, `received`, and `partially_refunded` remain live; `refunded` maps to `full_refund`; `chargeback_requested` and `chargeback_dispute` map to `chargeback`; unpaid contracts produce no row. Upsert by `contract_id` and update revocation fields so the seed remains idempotent.

Do not hand-edit `supabase/seed.sql`. Run `pnpm seed:generate` and then `pnpm seed:check`.

- [ ] **Step 3: Update product and operations documentation**

Add to `PRODUCT.md` the three materials, free e-book, permanent paid entitlement, courtesy exclusion, and full-refund/chargeback revocation.

Add to `docs/asaas-billing-runbook.md`:

- how the transactional reducer grants and revokes bonus access;
- how to compare contract, payment, and `bonus_access_grants` state during reconciliation;
- why cancellation/expiration must not revoke;
- the focused pgTAP command.

Add to `docs/operations/deployment-runbook.md` this release checklist:

1. Confirm migration created the private `bonus-materials` bucket.
2. Upload PDFs and XLSX through Supabase Dashboard or Storage API at the three canonical paths; never insert `storage.objects` rows manually.
3. Validate MIME type and the 25 MiB per-object limit.
4. Test free, courtesy, active paid, expired paid, refunded, and chargeback accounts in staging.
5. Confirm no deployment is needed when files are uploaded later at the same paths.

- [ ] **Step 4: Verify seed and documentation slice**

```bash
pnpm vitest run scripts/demo-seed/render-seed.test.ts scripts/demo-seed/user-scenarios.test.ts
pnpm seed:check
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/seed.test.sql supabase/tests/bonus_library.test.sql --local
```

Expected: deterministic generation and focused pgTAP PASS.

- [ ] **Step 5: Commit demo and operations work**

```bash
git add scripts/demo-seed supabase/seed.sql supabase/tests/seed.test.sql PRODUCT.md docs/asaas-billing-runbook.md docs/operations/deployment-runbook.md
git commit -m "docs: prepare bonus materials operations"
```

---

### Task 7: Run complete release verification

**Files:**

- Verify all files changed in Tasks 1–6
- Modify only files implicated by a failing gate

**Interfaces:**

- Consumes: the complete bonus feature.
- Produces: a reproducible, fully checked release candidate with only the binary uploads intentionally pending.

- [ ] **Step 1: Run all database gates**

```bash
pnpm seed:check
pnpm supabase:reset
pnpm exec supabase test db --local
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
sha256sum src/infrastructure/database/supabase/database.types.ts
pnpm supabase:types
sha256sum src/infrastructure/database/supabase/database.types.ts
```

Expected: reset and all pgTAP suites PASS, lint/advisors report no new actionable finding, and the two generated-type hashes match exactly.

- [ ] **Step 2: Run all application gates**

```bash
pnpm check
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
```

Expected: Vitest, typecheck, ESLint, Prettier, and the production webpack build PASS.

- [ ] **Step 3: Perform the staging authorization matrix**

With temporary staging objects at the canonical paths, verify:

```text
free client       ebook ready; guide locked; spreadsheet locked
courtesy client   ebook ready; guide locked; spreadsheet locked
active paid       all three ready
expired paid      all three ready
canceled paid     all three ready
full refund       ebook ready; protected materials locked unless another live grant exists
chargeback        ebook ready; protected materials locked unless another live grant exists
```

Also test direct requests for an unknown slug and a protected slug as a free user. Confirm signed URLs expire, errors contain no object path/token, PDFs open in a new tab, and XLSX downloads with the fixed filename.

- [ ] **Step 4: Confirm the no-file deployment state**

Remove only the temporary staging objects through the Storage API or Dashboard, not through SQL. Confirm `/bonus` remains healthy and shows **Material em preparação** for authorized items. Re-upload the same keys and confirm they become available without deploying application code.

- [ ] **Step 5: Commit any gate-driven corrections and record the result**

```bash
git status --short
```

If corrections exist, stage each exact path reported by `git status --short`
individually and commit with `git commit -m "test: verify bonus library release"`.
Skip the commit when the status is empty. Record the exact commands and
pass/fail results in the final handoff; do not claim the production files were
uploaded unless that external operation actually occurred.
