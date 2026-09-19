# Admin Operational Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Show only genuine subscriptions in the admin dashboard, filter that operational list, and persist user-table filters without changing the dashboard KPIs.

**Architecture:** A dedicated protected RPC lists access-granting contracts using validated filters, leaving the existing KPI snapshot contract stable. Admin user filters are applied by server actions that validate input, store a small cookie, and redirect to canonical URLs; the page reads that cookie only when the URL has no explicit filters.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript 5.9, Supabase/Postgres, Zod 4, Vitest, Testing Library, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`

## Global Constraints

- Admin access and AAL2 remain mandatory for every database read and server action.
- Recent subscriptions contain only contracts with non-null access start and end timestamps.
- Dashboard list filters never imply that KPI cards or charts were recalculated.
- URL filters are canonical and shareable.
- Explicit URL values win over cookie values.
- Cursor and back-stack values are never persisted in cookies.
- Cookie values are size-limited and validated before use.
- No new runtime dependency is introduced.

---

## File Structure

| Path                                                                       | Responsibility                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Supabase CLI generated migration named `admin_recent_subscription_filters` | Protected filtered subscription-list RPC and supporting index.                 |
| `supabase/tests/admin_dashboard.test.sql`                                  | Prove checkout attempts are excluded and filters are applied before the limit. |
| `src/modules/admin/dashboard/admin-dashboard-filters.ts`                   | Parse and serialize period, billing mode, and operational state.               |
| `src/modules/admin/dashboard/get-recent-subscriptions.service.ts`          | Call and validate the filtered subscription RPC.                               |
| `src/modules/admin/dashboard/components/recent-subscription-filters.tsx`   | Accessible GET filter controls scoped to the list.                             |
| `src/modules/admin/dashboard/components/recent-subscriptions.tsx`          | Render filter controls and truthful empty states.                              |
| `src/app/(admin-panel)/admin/page.tsx`                                     | Read filters and load dashboard snapshot plus subscription list.               |
| `src/modules/admin/users/admin-user-filter-cookie.ts`                      | Cookie schema, parsing, serialization, and canonical merge rules.              |
| `src/modules/admin/users/admin-user-filters.action.ts`                     | Set or clear the filter cookie and redirect to the first page.                 |
| `src/modules/admin/users/components/admin-user-filter-form.tsx`            | Server-action form and clear control.                                          |
| `src/app/(admin-panel)/admin/users/page.tsx`                               | Resolve URL filters before cookie fallback.                                    |

---

### Task 1: Genuine and filterable recent subscriptions

**Files:**

- Create: Supabase CLI generated migration named `admin_recent_subscription_filters`
- Modify: `supabase/tests/admin_dashboard.test.sql`
- Create: `src/modules/admin/dashboard/admin-dashboard-filters.ts`
- Create: `src/modules/admin/dashboard/admin-dashboard-filters.test.ts`
- Create: `src/modules/admin/dashboard/get-recent-subscriptions.service.ts`
- Create: `src/modules/admin/dashboard/get-recent-subscriptions.service.test.ts`
- Modify: `src/modules/admin/dashboard/admin-dashboard.schema.ts`
- Modify: `src/modules/admin/dashboard/admin-dashboard.types.ts`
- Modify: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `private.has_admin_access()`, contract status and billing-mode enums.
- Produces: `AdminSubscriptionFilters`, `parseAdminSubscriptionFilters`, `list_admin_recent_subscriptions_v1`, `getRecentSubscriptions(filters)`.

- [x] **Step 1: Add failing SQL cases to the dashboard test**

Insert one expired checkout with null access timestamps and one real ended subscription with populated timestamps. Assert only the latter appears. Add more than five rows and prove filtering occurs before `limit 5`:

```sql
select is(
  jsonb_array_length(public.list_admin_recent_subscriptions_v1(
    '30d', 'annual', 'active'
  )),
  5,
  'filters are applied before the five-row limit'
);

select is_empty(
  $$ select value from jsonb_array_elements(
       public.list_admin_recent_subscriptions_v1('all','all','all')
     ) where value ->> 'id' = 'expired-checkout-id' $$,
  'an expired checkout that never granted access is not a subscription'
);
```

Assert regular users, admin at AAL1, and anonymous callers are denied.

- [x] **Step 2: Run SQL test and confirm failure**

```bash
pnpm exec supabase test db supabase/tests/admin_dashboard.test.sql
```

- [x] **Step 3: Create the migration and protected RPC**

Run `pnpm exec supabase migration new admin_recent_subscription_filters`. Implement:

```sql
public.list_admin_recent_subscriptions_v1(
  p_period text,
  p_billing_mode text,
  p_state text
) returns jsonb
```

Validate `p_period in ('7d','30d','90d','all')`, mode in `('monthly','annual','all')`, and state in `('active','ended','all')`. Require `private.has_admin_access()`. The base predicate is:

```sql
contract.access_starts_at is not null
and contract.access_ends_at is not null
and (
  p_state = 'all'
  or (p_state = 'active' and contract.status in ('active','cancel_at_period_end')
      and contract.access_starts_at <= snapshot_at
      and contract.access_ends_at > snapshot_at)
  or (p_state = 'ended' and not (
      contract.status in ('active','cancel_at_period_end')
      and contract.access_starts_at <= snapshot_at
      and contract.access_ends_at > snapshot_at
  ))
)
```

Apply period and mode predicates before ordering by `created_at desc, id desc` and limiting to five. Return the same fields as the existing snapshot list. Revoke default execution and grant only `authenticated`.

- [x] **Step 4: Write filter and service tests**

```ts
expect(
  parseAdminSubscriptionFilters({
    period: "30d",
    billing: "annual",
    subscriptionState: "active",
  }),
).toEqual({ period: "30d", billingMode: "annual", state: "active" });

expect(parseAdminSubscriptionFilters({ period: "invalid" })).toEqual({
  period: "all",
  billingMode: "all",
  state: "all",
});
```

Service tests assert exact RPC args, schema validation, Portuguese presentation mapping, and stable unavailable error behavior.

- [x] **Step 5: Implement parsing and service**

Use a strict Zod schema and scalar URL extraction. `getRecentSubscriptions` calls `requireAdmin`, then the RPC with `p_period`, `p_billing_mode`, and `p_state`; validate the returned JSON using the existing recent-subscription item schema extracted from `admin-dashboard.schema.ts`.

- [x] **Step 6: Verify, regenerate types, and commit**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/admin_dashboard.test.sql
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
pnpm test -- src/modules/admin/dashboard/admin-dashboard-filters.test.ts src/modules/admin/dashboard/get-recent-subscriptions.service.test.ts
git add supabase src/modules/admin/dashboard src/infrastructure/database/supabase/database.types.ts
git commit -m "fix: list genuine admin subscriptions"
```

---

### Task 2: Dashboard subscription filter interface

**Files:**

- Create: `src/modules/admin/dashboard/components/recent-subscription-filters.tsx`
- Create: `src/modules/admin/dashboard/components/recent-subscription-filters.test.tsx`
- Modify: `src/modules/admin/dashboard/components/recent-subscriptions.tsx`
- Modify: `src/modules/admin/dashboard/components/admin-dashboard.tsx`
- Modify: `src/modules/admin/dashboard/components/admin-dashboard.test.tsx`
- Modify: `src/app/(admin-panel)/admin/page.tsx`
- Modify: `src/app/(admin-panel)/admin/page.test.tsx`

**Interfaces:**

- Consumes: `AdminSubscriptionFilters`, `getAdminDashboard`, `getRecentSubscriptions`.
- Produces: URL-scoped filter form and filtered recent-subscription section.

- [x] **Step 1: Write failing page and component tests**

Assert the page parses search params and calls both services. Assert three labeled comboboxes, selected values, reset link, and scoped explanatory copy:

```tsx
expect(
  screen.getByRole("combobox", { name: "Período das assinaturas" }),
).toHaveValue("30d");
expect(screen.getByRole("combobox", { name: "Modalidade" })).toHaveValue(
  "annual",
);
expect(
  screen.getByText("Os filtros abaixo afetam somente esta lista."),
).toBeVisible();
```

Add a filtered empty state: `Nenhuma assinatura corresponde aos filtros.` The unfiltered empty state remains `Nenhuma assinatura registrada até agora.`

- [x] **Step 2: Implement the GET filter form**

Use native labeled selects named `period`, `billing`, and `subscriptionState`. The form submits to `/admin` with method `get`; the reset link points to `/admin`. Keep the filter bar compact, wrap controls below tablet width, and use the existing button styles.

- [x] **Step 3: Compose filtered data without changing KPIs**

The page awaits search params, parses filters, then loads the existing dashboard snapshot and filtered subscriptions with `Promise.all`. Replace only `dashboard.recentSubscriptions` in the view model passed to `AdminDashboard`. Pass filters separately to `RecentSubscriptions`; do not change metric or chart RPC inputs.

- [x] **Step 4: Test, run detector, and commit**

```bash
pnpm test -- src/modules/admin/dashboard/components/recent-subscription-filters.test.tsx src/modules/admin/dashboard/components/admin-dashboard.test.tsx src/app/'(admin-panel)'/admin/page.test.tsx
node .agents/skills/impeccable/scripts/detect.mjs --json \
  src/modules/admin/dashboard/components/recent-subscription-filters.tsx \
  src/modules/admin/dashboard/components/recent-subscriptions.tsx
git add src/modules/admin/dashboard src/app/'(admin-panel)'/admin
git commit -m "feat: filter recent admin subscriptions"
```

---

### Task 3: Persist admin user filters in a cookie

**Files:**

- Create: `src/modules/admin/users/admin-user-filter-cookie.ts`
- Create: `src/modules/admin/users/admin-user-filter-cookie.test.ts`
- Create: `src/modules/admin/users/admin-user-filters.action.ts`
- Create: `src/modules/admin/users/admin-user-filters.action.test.ts`
- Create: `src/modules/admin/users/components/admin-user-filter-form.tsx`
- Create: `src/modules/admin/users/components/admin-user-filter-form.test.tsx`
- Modify: `src/modules/admin/users/components/admin-user-list.tsx`
- Modify: `src/modules/admin/users/components/admin-user-list.test.tsx`
- Modify: `src/app/(admin-panel)/admin/users/page.tsx`
- Modify: `src/app/(admin-panel)/admin/users/page.test.tsx`
- Modify: `src/modules/admin/users/admin-users.urls.ts`

**Interfaces:**

- Consumes: `listFilterSchema`, `listUrl`, `requireAdmin`, Next `cookies` and `redirect`.
- Produces: `ADMIN_USER_FILTER_COOKIE`, `resolveAdminUserFilters(url,cookie)`, `persistAdminUserFilters(formData)`, `clearAdminUserFilters()`.

- [x] **Step 1: Write cookie precedence tests**

Cover no URL values, explicit defaults, malformed JSON, oversized values, and cursor exclusion:

```ts
expect(
  resolveAdminUserFilters(
    {},
    JSON.stringify({ q: "cliente@", state: "blocked", access: "paid" }),
  ),
).toMatchObject({ q: "cliente@", state: "blocked", access: "paid" });

expect(
  resolveAdminUserFilters(
    { state: "active" },
    JSON.stringify({ q: "cliente@", state: "blocked", access: "paid" }),
  ),
).toMatchObject({ q: "", state: "active", access: "all" });
```

The second case establishes that the presence of any explicit filter query starts a new complete filter set; omitted values use defaults instead of stale cookie values.

- [x] **Step 2: Write server-action tests**

Mock `requireAdmin`, cookies, and redirect. Assert persisted value contains only `q`, `state`, and `access`, and options are:

```ts
{
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/admin/users",
  maxAge: 60 * 60 * 24 * 90,
}
```

Assert both actions redirect to the first page and `clearAdminUserFilters` deletes the cookie.

- [x] **Step 3: Implement cookie parsing and canonical resolution**

Set `ADMIN_USER_FILTER_COOKIE = "lucrivo_admin_user_filters"`. Reject raw values over 1,024 characters. Parse JSON with a strict schema containing only `q`, `state`, and `access`. Reuse `listFilterSchema` defaults. Add `hasExplicitUserFilters(searchParams)` based on own-property presence of any of those three names.

- [x] **Step 4: Implement protected server actions**

Both actions start with `await requireAdmin()`. `persistAdminUserFilters` parses `FormData`, writes the validated cookie, and redirects to `listUrl(filters)` without cursor/back. Clear deletes the cookie and redirects to `/admin/users`.

- [x] **Step 5: Extract and integrate the filter form**

Move the existing search and selects to `AdminUserFilterForm`. Set `action={persistAdminUserFilters}` and add a separate form/button for `clearAdminUserFilters` when filters differ from defaults. Keep the current method-independent labels and responsive grid.

In the page:

```ts
const rawParams = await searchParams;
const cookieStore = await cookies();
const filters = resolveAdminUserFilters(
  rawParams,
  cookieStore.get(ADMIN_USER_FILTER_COOKIE)?.value,
);
```

Pagination links continue to use URL filters and never trigger the action.

- [x] **Step 6: Run focused tests and commit**

```bash
pnpm test -- src/modules/admin/users/admin-user-filter-cookie.test.ts src/modules/admin/users/admin-user-filters.action.test.ts src/modules/admin/users/components/admin-user-filter-form.test.tsx src/modules/admin/users/components/admin-user-list.test.tsx src/app/'(admin-panel)'/admin/users/page.test.tsx
git add src/modules/admin/users src/app/'(admin-panel)'/admin/users
git commit -m "feat: persist admin user filters"
```

---

### Task 4: Admin regression and quality gates

**Files:**

- Modify only files that fail because of Tasks 1–3.

**Interfaces:**

- Consumes: completed admin filter behavior.
- Produces: verified admin dashboard and user management.

- [x] **Step 1: Run all admin and authorization tests**

```bash
pnpm test -- src/modules/admin src/app/'(admin-panel)'/admin
pnpm exec supabase test db supabase/tests/admin_authorization.test.sql supabase/tests/admin_dashboard.test.sql supabase/tests/admin_user_reads.test.sql supabase/tests/admin_user_mutations.test.sql
```

- [x] **Step 2: Run repository gates**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

- [x] **Step 3: Commit any gate fixes**

```bash
git add src supabase
git commit -m "test: verify admin operational adjustments"
```

Do not start the separate client-dashboard KPI initiative in this plan.
