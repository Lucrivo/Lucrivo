# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a secure, audited `/admin/users` list and user detail with complimentary access, block, and soft-delete workflows.

**Architecture:** Private account-state and audit tables drive user eligibility; narrowly scoped MFA-protected RPCs expose admin reads and mutations. Server services validate RPC payloads, while App Router pages render responsive list/detail UI using existing components. Billing remains the authority for paid entitlement.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres and pgTAP, Zod 4, Vitest, Tailwind/shadcn UI.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-user-management-design.md`

## Global Constraints

- The assigned administrator cannot be listed or targeted.
- All admin RPCs require the database's existing `private.has_admin_access()` (singleton administrator and `aal2`); the server also calls `requireAdmin()`.
- Paid access remains derived from verified contracts. Complimentary grants never mutate billing records or dashboard revenue/subscription metrics.
- Block and soft delete are denied when a valid paid interval currently grants access. Both deny app use with an existing session; soft delete preserves Auth identity and financial/diagnosis data.
- Mutations require a bounded non-empty reason, are atomic with an immutable audit event, and never contact Asaas.
- No user email/profile editing, permanent erasure, refund or subscription-cancellation workflow is in scope.
- User-facing copy is Portuguese; calendar dates display in `America/Sao_Paulo`.
- Create migration filenames using `pnpm exec supabase migration new <name>`; never hand-invent a timestamp. Run tests against the local database before regenerating `database.types.ts`.
- Before the first Supabase change, review `https://supabase.com/changelog.md` for relevant breaking changes and the current Auth/RLS/RPC documentation.
- Discover supported CLI flags with `pnpm exec supabase <group> <command> --help`. The existing local database contains user, diagnosis and contract data: do not run `db reset`. Apply pending migrations with `pnpm exec supabase migration up --local` and require every pgTAP fixture to run inside `begin; ... rollback;`.

## File map and task boundaries

1. A CLI-created `supabase/migrations/*_admin_user_state.sql` owns private state, audit and eligibility helpers; `supabase/tests/admin_user_state.test.sql` verifies security and constraints.
2. A CLI-created `supabase/migrations/*_admin_user_enforcement.sql` owns policy/function changes; `supabase/tests/admin_user_enforcement.test.sql` verifies old-session denial and courtesy; `src/modules/auth/services/require-user.ts` and `src/app/(private)/layout.tsx` enforce the page boundary.
3. A CLI-created `supabase/migrations/*_admin_user_reads.sql` owns bounded list/detail/child RPCs; `supabase/tests/admin_user_reads.test.sql` verifies projection, access and pagination.
4. A CLI-created `supabase/migrations/*_admin_user_mutations.sql` owns atomic actions; `supabase/tests/admin_user_mutations.test.sql` verifies conflicts, auditing and privileges.
5. `src/modules/admin/users/` owns schemas, types, formatters and server read/action services. `src/infrastructure/database/supabase/database.types.ts` is regenerated from the local schema.
6. `src/modules/admin/users/components/` owns list, detail, menus and dialogs. The two App Router destinations remain thin page adapters.
7. Existing scaffold tests and admin loading/error routes are updated only where needed by this feature.

Each numbered task below ends at an independently testable checkpoint. Do not merge migration creation and application to a remote project; local DB verification precedes any deployment.

### Task 1: Account-state and audit foundation

**Files:** Create the CLI-generated `*_admin_user_state.sql` migration and `supabase/tests/admin_user_state.test.sql`.

**Interfaces:** Produce `private.admin_user_state(user_id, blocked_at, deleted_at, courtesy_expires_at, version, updated_at)`, `private.admin_user_events(id, user_id, actor_id, action, reason, before_state, after_state, created_at)`, and `private.account_is_eligible()` for the caller's own identity. No direct client access to either table.

- [x] **Step 1: Write failing pgTAP tests.** Assert private tables exist, `anon/authenticated/service_role` have no table access, and `private.account_is_eligible()` returns true with no state and false when blocked/deleted. Start with:

```sql
select has_table('private', 'admin_user_state', 'account state exists');
select has_table('private', 'admin_user_events', 'audit exists');
select ok(not has_table_privilege('authenticated', 'private.admin_user_state', 'select'), 'client cannot read account state');
select has_function('private', 'account_is_eligible', array[]::text[], 'eligibility helper exists');
```

- [x] **Step 2: Run the failing test.** `pnpm exec supabase test db supabase/tests/admin_user_state.test.sql --local`; expect missing tables/function.
- [x] **Step 3: Create a migration through the CLI and implement.** Run `pnpm exec supabase migration new admin_user_state`; edit the printed path. Use UUID FKs to `auth.users` with `on delete restrict`, `timestamptz`, `bigint generated always as identity` for event ID, reason length 1–500, action check constraint, state version for optimistic concurrency, and indexes on audit `(user_id, created_at desc, id desc)` and actor FK. Make audit append-only via privilege revocation and a trigger rejecting UPDATE/DELETE, including privileged accidental writes. Use explicit empty `search_path` in helper functions. The core schema shape is:

```sql
create table private.admin_user_state (
  user_id uuid primary key references auth.users(id) on delete restrict,
  blocked_at timestamptz,
  deleted_at timestamptz,
  courtesy_expires_at timestamptz,
  version bigint not null default 0 check (version >= 0),
  updated_at timestamptz not null default statement_timestamp()
);
create table private.admin_user_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('courtesy_granted','courtesy_ended','blocked','unblocked','soft_deleted','restored')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default statement_timestamp()
);
```

- [x] **Step 4: Apply locally and rerun tests.** Run `pnpm exec supabase migration up --local`, then the pgTAP file; expect pass. Confirm the existing user/diagnosis/contract counts are unchanged. Review grants with `information_schema.table_privileges` and verify RLS is enabled on any exposed table.
- [x] **Step 5: Commit only this checkpoint.** Stage the CLI-generated migration and test, then `git commit -m "feat: add audited admin user state"`.

### Task 2: Enforce eligibility and complimentary report access

**Files:** Create CLI-generated `*_admin_user_enforcement.sql`, `*_admin_user_courtesy_overview.sql`, `supabase/tests/admin_user_enforcement.test.sql`, `src/app/(public)/account-unavailable/page.tsx` and its test; modify `src/modules/auth/services/require-user.ts`, `require-user.test.ts`, `src/modules/auth/services/resolve-authenticated-home.ts` and its test, `src/app/(private)/layout.tsx`, `src/modules/billing/services/get-billing-overview.service.ts` and its test, `src/modules/billing/types.ts`, `src/app/(private)/billing/page.tsx`, and relevant route tests.

**Interfaces:** Consume `private.admin_user_state` and `private.account_is_eligible()`. Produce `private.has_report_entitlement_for_user(uuid,timestamptz)` (billing OR unexpired courtesy, never billing mutation), caller-scoped `public.current_account_is_eligible()` and `public.current_courtesy_access_expires_at()` RPCs, and `AccountUnavailableError` in `require-user.ts`. `BillingOverview.tier` becomes `free | paid | courtesy`, with paid taking precedence and courtesy expiry explicit.

- [x] **Step 1: Write failing database and unit tests.** Fixture users with free, paid, courtesy, blocked and deleted states. Verify direct reads of `diagnoses`, child diagnosis tables, contracts and payments fail for blocked/deleted users with valid JWTs; all three report creation functions reject them; courtesy grants paid-report access but not an extra free report; billing semantics remain unchanged. For the app guard:

```ts
it("rejects a blocked account after authenticating", async () => {
  rpc.mockResolvedValue({ data: false, error: null });
  await expect(requireUser()).rejects.toThrow(AccountUnavailableError);
});
```

- [x] **Step 2: Run failing tests.** Run targeted pgTAP and `pnpm vitest run src/modules/auth/services/require-user.test.ts`; expect eligibility checks absent.
- [x] **Step 3: Implement database enforcement.** CLI-create the migration. Preserve `private.has_paid_access_for_user` as billing-only. Add `private.has_report_entitlement_for_user`; update `private.can_read_diagnosis`, all three report-create implementations, and owner RLS policies for `diagnoses`, the three child diagnosis tables, `billing_contracts`, `billing_payments`, and any additional owner-facing tables identified by `rg -n 'create policy|create function' supabase/migrations`. Revoke public execution of internal helpers and grant only caller-scoped RPCs. Core entitlement rule:

```sql
return private.has_paid_access_for_user(p_user_id, p_at)
  or exists (
    select 1 from private.admin_user_state s
    where s.user_id = p_user_id
      and s.deleted_at is null and s.blocked_at is null
      and s.courtesy_expires_at > p_at
  );
```

Use `private.account_is_eligible()` as an AND condition in owner policies and before report-creation writes. Ensure `public.current_account_is_eligible()` only answers for `(select auth.uid())`; it must not accept an arbitrary user ID.

- [x] **Step 4: Implement the server guard and rerun tests.** `requireUser()` checks `current_account_is_eligible` after `getClaims()`, and `PrivateLayout` calls `requireUser()` instead of trusting claims alone; redirect unavailable accounts to a dedicated public `/account-unavailable` page with a logout action, without an infinite login loop. The guard's added call is:

```ts
const { data: eligible, error: eligibilityError } = await supabase.rpc(
  "current_account_is_eligible",
);
if (eligibilityError || eligible !== true) throw new AccountUnavailableError();
```

Run `pnpm exec supabase migration up --local`, targeted pgTAP and Vitest. Confirm the existing data counts are unchanged. Review service-role report reads to confirm all entrypoints still call `requireUser` first. The billing overview must call the courtesy-expiry RPC, display a distinct courtesy state without claiming a paid subscription, and continue to allow diagnoses after the free report is used.

- [x] **Step 5: Commit.** `git commit -m "feat: enforce managed account eligibility"`.

### Task 3: Admin list and detail read RPCs

**Files:** Create CLI-generated `*_admin_user_reads.sql` and `supabase/tests/admin_user_reads.test.sql`.

**Interfaces:** Produce `public.list_admin_users_v1(p_query text,p_state text,p_access text,p_cursor_created_at timestamptz,p_cursor_id uuid,p_limit integer) returns jsonb`, `public.get_admin_user_v1(p_user_id uuid) returns jsonb`, and `public.list_admin_user_items_v1(p_user_id uuid,p_kind text,p_cursor_created_at timestamptz,p_cursor_id text,p_limit integer) returns jsonb`. `p_kind` is `diagnoses`, `subscriptions`, or `history`; each item projection is explicit.

- [x] **Step 1: Write failing pgTAP tests.** Assert anon, ordinary user and admin at `aal1` cannot execute; admin at `aal2` can. Assert admin self-exclusion, case-insensitive email search, account/access filters, stable `(created_at,id)` ordering, cursor continuation without duplicates, capped page size, no raw report snapshots/provider IDs, 404-like null for absent user, and excluded-user detail visibility. Follow the JWT/role fixture pattern in `supabase/tests/admin_dashboard.test.sql`.
- [x] **Step 2: Run the test and confirm failure.** `pnpm exec supabase test db supabase/tests/admin_user_reads.test.sql --local`.
- [x] **Step 3: Implement bounded projections.** CLI-create migration. Each RPC starts:

```sql
if not coalesce((select private.has_admin_access()), false) then
  raise exception using errcode = '42501', message = 'administrator access required';
end if;
```

Validate filter enums and clamp `p_limit` to 1–50. Use `(created_at,id) < (cursor_created_at,cursor_id)` and fetch `limit + 1`; return `{items,nextCursor}` with an opaque cursor payload built from exact sort keys. For child items with heterogeneous IDs, use a per-kind typed cursor rather than unsafe text-to-UUID coercion. The list projection contains only ID, email, dates, state, effective access label, current contract summary, diagnosis count and action eligibility. The detail and child RPCs omit secrets and raw snapshots. Add indexes after checking local `EXPLAIN` on filter/search and child queries; avoid unbounded auth-admin `listUsers` loops.

- [x] **Step 4: Apply and rerun tests.** `pnpm exec supabase migration up --local` and targeted pgTAP. Check the actual query plan for email search; if substring search requires it, use a reviewed `pg_trgm` GIN expression index instead of full scanning at scale.
- [x] **Step 5: Commit.** `git commit -m "feat: expose guarded admin user projections"`.

### Task 4: Atomic admin mutations

**Files:** Create CLI-generated `*_admin_user_mutations.sql` and `supabase/tests/admin_user_mutations.test.sql`.

**Interfaces:** Produce `public.change_admin_user_v1(p_user_id uuid,p_action text,p_reason text,p_courtesy_expires_at timestamptz,p_expected_version bigint) returns jsonb`. Result is `{status:'updated'|'conflict'|'paid_conflict'|'not_found', version, state}`. Actions are the six audit event types from Task 1.

- [x] **Step 1: Write failing pgTAP tests.** Test MFA and privilege denial, malformed reason/action/expiry, admin self-target, stale version, duplicate action, paid-block and paid-delete conflicts, restoration of prior blocked state, existing-session eligibility, and exactly one audit row per successful change. Use two transaction sessions or a deterministic lock test for concurrent paid activation, not timing sleeps.
- [x] **Step 2: Run test and confirm failure.** `pnpm exec supabase test db supabase/tests/admin_user_mutations.test.sql --local`.
- [x] **Step 3: Implement the RPC.** CLI-create migration with `security definer`, empty `search_path`, explicit `revoke execute ... from public, anon, service_role`, and `grant execute ... to authenticated`. Validate AAL2 first, lock the target Auth row and state row, compare `version`, recheck active paid interval, apply one state update, and append one audit row in the same transaction. Use `statement_timestamp()` consistently. Core flow:

```sql
perform 1 from auth.users where id = p_user_id for update;
if not found then return jsonb_build_object('status','not_found'); end if;
if p_action in ('blocked','soft_deleted') and exists (
  select 1 from public.billing_contracts c
  where c.user_id = p_user_id
    and c.status in ('active','cancel_at_period_end')
    and c.access_starts_at <= statement_timestamp()
    and c.access_ends_at > statement_timestamp()
) then return jsonb_build_object('status','paid_conflict'); end if;
```

Add a `before insert or update` trigger on `billing_contracts` when a valid paid interval becomes active. It locks the same `auth.users` row and rejects activation if account state is blocked/deleted, leaving the webhook event retryable and visible for operational resolution. This prevents an activation from racing past the admin check; test both transaction orders. Return typed conflicts rather than arbitrary SQL errors for normal stale-state cases.

- [x] **Step 4: Apply and rerun tests.** Use `pnpm exec supabase migration up --local`; include advisor/security checks and verify that a failed audit insert rolls back the state change.
- [x] **Step 5: Commit.** `git commit -m "feat: add audited admin user actions"`.

### Task 5: Typed server boundary and URLs

**Files:** Create `src/modules/admin/users/admin-users.schema.ts`, `admin-users.schema.test.ts`, `admin-users.types.ts`, `admin-users.formatters.ts`, `admin-users.formatters.test.ts`, `get-admin-users.service.ts`, `get-admin-users.service.test.ts`, `change-admin-user.action.ts`, `change-admin-user.action.test.ts`; regenerate `src/infrastructure/database/supabase/database.types.ts`.

**Interfaces:** `getAdminUsers(filters): Promise<AdminUserListViewModel>`, `getAdminUser(userId): Promise<AdminUserDetailViewModel|null>`, `getAdminUserItems(userId,kind,cursor): Promise<AdminUserItemsViewModel>`, `changeAdminUser(input): Promise<AdminUserActionResult>`. URL helpers validate `q`, `state`, `access`, `cursor`, `tab` and preserve search context without arbitrary redirect URLs.

- [x] **Step 1: Write failing schema/service/action tests.** Reject malformed RPC JSON, invalid UUID, out-of-range limit, unknown tab/action and overlong reason. Verify `requireAdmin` runs before every RPC; a failed read is never mapped to an empty list. Verify action success revalidates `/admin/users` and `/admin/users/{id}`. Example:

```ts
expect(() => adminUserListSchema.parse({ items: [{ id: "bad" }] })).toThrow();
expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
  rpc.mock.invocationCallOrder[0],
);
expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
```

- [x] **Step 2: Run targeted Vitest; expect failure.** `pnpm vitest run src/modules/admin/users`.
- [x] **Step 3: Implement schemas/services/action.** Zod schemas match the exact RPC JSON keys. Services call `requireAdmin()`, use its request-scoped client, throw `AdminUsersUnavailableError` on DB/parse failure, and map timestamp/currency/status copy in `pt-BR`. The server action validates FormData, invokes `change_admin_user_v1`, maps status codes to user-facing errors, and calls `revalidatePath` only on `updated`:

```ts
const { supabase } = await requireAdmin();
const { data, error } = await supabase.rpc("list_admin_users_v1", args);
if (error) throw new AdminUsersUnavailableError();
return adminUserListSchema.parse(data);
```

Run `pnpm exec supabase types gen typescript --local --schema public` through the repository's `pnpm supabase:types` script and inspect the diff; do not hand-edit generated types.

- [x] **Step 4: Run tests and typecheck.** `pnpm vitest run src/modules/admin/users` and `pnpm typecheck`.
- [x] **Step 5: Commit.** `git commit -m "feat: add typed admin user services"`.

### Task 6: Responsive user list and accessible menu

**Files:** Modify `src/app/(admin-panel)/admin/users/page.tsx`, `src/app/(admin-panel)/admin/pages.test.tsx`; create `src/modules/admin/users/components/admin-user-list.tsx`, `admin-user-list.test.tsx`, `admin-user-row-actions.tsx`, `admin-user-row-actions.test.tsx`, `src/app/(admin-panel)/admin/users/loading.tsx`, `error.tsx`.

**Interfaces:** Page consumes parsed search params and `getAdminUsers`. `AdminUserList` receives a serializable view model and filter URLs. Row actions take a user ID, status and list-context URL; they do not own data fetching.

- [x] **Step 1: Write failing UI tests.** Assert real table columns, mobile card equivalents, search/filter controls, next/previous links, empty and error states, one row detail link, a separate menu button, permanent chevron, keyboard focus and no `Editar` item. Clicking the menu must not invoke row navigation. Replace the old scaffold assertion for `/admin/users` only.
- [x] **Step 2: Run tests; expect failure.** `pnpm vitest run src/modules/admin/users/components/admin-user-list.test.tsx src/app/'(admin-panel)'/admin/pages.test.tsx`.
- [x] **Step 3: Implement UI.** Reuse `Table`, `Card`, `Badge`, `DropdownMenu`, `Pagination`, `Input` and existing admin tokens; use a responsive card list on narrow screens. Make one semantic anchor stretch the visual row while its action button has its own stacking context; the anchor and menu each need visible focus. Page shape:

```tsx
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminUserFilters(await searchParams);
  return (
    <AdminUserList data={await getAdminUsers(filters)} filters={filters} />
  );
}
```

Filter controls submit GET parameters and reset the cursor. Use status/help text to explain paid conflicts rather than hiding actions.

- [x] **Step 4: Run UI tests and typecheck.** Verify desktop and narrow widths if a browser is available.
- [x] **Step 5: Commit.** `git commit -m "feat: build admin user list"`.

### Task 7: Detail page, tabs, history and action dialogs

**Files:** Create `src/app/(admin-panel)/admin/users/[userId]/page.tsx`, `page.test.tsx`, `loading.tsx`, `error.tsx`; `src/modules/admin/users/components/admin-user-detail.tsx`, `admin-user-detail.test.tsx`, `admin-user-action-dialog.tsx`, `admin-user-action-dialog.test.tsx`; modify `admin-user-row-actions.tsx`.

**Interfaces:** Detail page validates UUID, tab and cursors, calls read services, returns `notFound()` for missing user. URL tab values are `profile`, `diagnoses`, `subscription`, `history`. Dialog calls `changeAdminUser` with `expectedVersion` and current reason/expiry.

- [x] **Step 1: Write failing tests.** Assert breadcrumb/back link, URL-addressable tabs, real Auth fields only, paginated diagnosis/contract/history rows, no raw report/provider payloads, blocked/excluded status, paid-conflict message, reason/expiry validation, confirmation, success/error feedback, focus restoration and direct `/admin/users/{id}?tab=history` navigation. Example:

```tsx
expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute(
  "aria-selected",
  "true",
);
expect(screen.getByRole("link", { name: /voltar.*usuários/i })).toHaveAttribute(
  "href",
  "/admin/users",
);
```

- [x] **Step 2: Run tests; expect failure.** `pnpm vitest run src/modules/admin/users/components/admin-user-detail.test.tsx src/app/'(admin-panel)'/admin/users/'[userId]'/page.test.tsx`.
- [x] **Step 3: Implement detail and actions.** Use existing Tabs, Breadcrumb, AlertDialog/Dialog and form components. Show diagnoses metadata only; render billing history from projected data; render audit actions with actor/date/reason and explicit registration/last-login facts. Menu shortcuts link to `?tab=history` and `?tab=subscription`. Confirmation dialog always sends `expectedVersion`; on conflict, show a refresh message, never optimistic success. The route loader calls:

```tsx
const user = await getAdminUser(userId);
if (!user) notFound();
const items =
  tab === "profile"
    ? null
    : await getAdminUserItems(userId, tabToKind(tab), cursor);
return <AdminUserDetail user={user} tab={tab} items={items} />;
```

- [x] **Step 4: Run tests and accessibility checks.** Confirm tab/menu keyboard traversal and focus recovery; run `pnpm typecheck`.
- [x] **Step 5: Commit.** `git commit -m "feat: build admin user detail and actions"`.

### Task 8: Cross-route verification and release audit

**Files:** Modify only tests or code found defective by the checks; update `docs/operations/admin-access-runbook.md` with safe operational semantics and recovery instructions.

**Interfaces:** No new public API. The deliverable is a verified feature with documented distinction between suspension, soft delete and privacy erasure.

- [x] **Step 1: Write and run an integration regression.** Exercise admin `aal2` listing/action, ordinary-user denial, admin `aal1` denial, paid conflict, complimentary report entitlement, blocked old-session denial, restoration, and preserved payment data. Add a test fixture that asserts:

```sql
select is((select count(*) from public.billing_payments where contract_id = '95000000-0000-4000-8000-000000000001'::uuid), 1::bigint, 'soft delete retains payment history');
```

- [x] **Step 2: Run the full local DB and app checks.** `pnpm exec supabase migration up --local`, `pnpm exec supabase test db --local`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`. Recheck existing local data counts and resolve failures rather than reporting unverified success.
- [x] **Step 3: Review security and query plans.** Run `pnpm supabase:lint` and `pnpm supabase:advisors`; inspect grants, RLS and `EXPLAIN (ANALYZE, BUFFERS)` for list filters/cursors. Confirm no new `NEXT_PUBLIC_` secret or service-role browser import. Compare every item in the spec with a test or a manual check.
- [x] **Step 4: Inspect responsive UI.** Check list/detail at narrow and desktop widths in light/dark themes, including no horizontal overflow, visible focus, menu layering and action confirmations. Record any environment limitation accurately.
- [x] **Step 5: Document and commit.** Add the operational rules to the runbook and commit verified fixes/documentation with `git commit -m "test: verify admin user management"`.
