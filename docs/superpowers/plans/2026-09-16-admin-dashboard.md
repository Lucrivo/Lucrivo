# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin` scaffold with a secure, data-backed operational dashboard for users, diagnoses, subscriptions, revenue, and cancellations.

**Architecture:** A versioned PostgreSQL RPC performs one protected aggregate snapshot using the authenticated administrator's `aal2` session. A server-only Next.js service validates and maps that payload into a display-oriented view model, and focused dashboard components render the metrics, Recharts visualizations, cancellation analysis, and recent subscriptions inside the existing admin shell.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase/PostgreSQL, Zod 4, Tailwind CSS 4, shadcn/Base UI, Recharts, Vitest, Testing Library, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-16-admin-dashboard-design.md`

## Global Constraints

- All dashboard calendar boundaries and labels use `America/Sao_Paulo`; weeks begin on Monday.
- `auth.users` acquisition and activity aggregates exclude the UUID in `private.app_administrator`.
- Administrator role and an `aal2` JWT are both required at the layout, server-service, and RPC boundaries.
- Counts and revenue may become zero only after a successful query; failures render the route error boundary.
- Currency remains integer BRL cents until presentation formatting.
- Active users mean `last_sign_in_at` within the trailing 30 days.
- Active subscriptions include `active` and `cancel_at_period_end` only while the access interval contains the snapshot instant.
- Revenue includes current `confirmed` and `received` payment states and excludes refunded or chargeback states.
- Cancellation rate is current-month confirmed cancellations divided by the active opening-month base; a zero denominator maps to unavailable.
- Historical series are fixed at 12 revenue months and 6 acquisition months, ordered oldest to newest and zero-filled.
- No fake customer names, avatars, plan names, comparison percentages, date controls, or actions may appear.
- Interface copy is Brazilian Portuguese; identifiers and code remain English.
- Reuse existing card, tooltip, badge, table, skeleton, and button primitives; add only shadcn Chart/Recharts.
- Interactions must be keyboard accessible, have visible focus, preserve 44×44 px touch targets, and honor reduced motion.

---

## File Structure

### Database

- Create `supabase/migrations/20260916200000_create_admin_dashboard_snapshot.sql` — versioned, MFA-aware aggregate RPC.
- Create `supabase/tests/admin_dashboard.test.sql` — permissions, boundary, aggregation, and result-shape coverage.
- Modify `src/infrastructure/database/supabase/database.types.ts` — generated `get_admin_dashboard_v1` RPC type.

### Server domain

- Create `src/modules/admin/dashboard/admin-dashboard.schema.ts` — strict Zod contract for the RPC JSON.
- Create `src/modules/admin/dashboard/admin-dashboard.types.ts` — UI view-model and status-tone types.
- Create `src/modules/admin/dashboard/admin-dashboard.formatters.ts` — São Paulo date, period, currency, and status presentation.
- Create `src/modules/admin/dashboard/get-admin-dashboard.service.ts` — strict guard, request-scoped RPC call, validation, and mapping.
- Create focused tests beside each nontrivial server file.

### Shared UI infrastructure

- Create `src/components/ui/chart.tsx` through the shadcn CLI.
- Modify `package.json` and `pnpm-lock.yaml` through the same CLI operation.
- Modify `src/components/shared/metrics/metric-card.tsx` — reusable accessible help text and optional detail region.
- Create `src/components/shared/metrics/metric-card.test.tsx`.

### Dashboard UI and route

- Create `src/modules/admin/dashboard/components/admin-dashboard.tsx` — page composition and semantic sections.
- Create `src/modules/admin/dashboard/components/admin-metric-grid.tsx` — six KPI groups and segmented acquisition card.
- Create `src/modules/admin/dashboard/components/admin-analytics.tsx` — revenue, cancellation, and acquisition panels.
- Create `src/modules/admin/dashboard/components/recent-subscriptions.tsx` — desktop table and compact mobile list.
- Create `src/modules/admin/dashboard/components/admin-dashboard.test.tsx`.
- Modify `src/app/(admin-panel)/admin/page.tsx` — protected data load and render.
- Create `src/app/(admin-panel)/admin/page.test.tsx`.
- Create `src/app/(admin-panel)/admin/loading.tsx`.
- Create `src/app/(admin-panel)/admin/error.tsx`.
- Create `src/app/(admin-panel)/admin/route-states.test.tsx`.
- Modify `src/app/(admin-panel)/admin/pages.test.tsx` — retain only the two remaining scaffold-route assertions.

---

### Task 1: Protected database snapshot

**Files:**

- Create: `supabase/tests/admin_dashboard.test.sql`
- Create: `supabase/migrations/20260916200000_create_admin_dashboard_snapshot.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `private.has_admin_access()`, `private.app_administrator`, `auth.users`, `public.diagnoses`, `public.billing_contracts`, and `public.billing_payments`.
- Produces: `public.get_admin_dashboard_v1() returns jsonb` with keys `generatedAt`, `metrics`, `revenueHistory`, `userGrowth`, and `recentSubscriptions`.

- [ ] **Step 1: Load the required Supabase and PostgreSQL guidance**

Read both skills completely and announce their use before changing SQL:

```bash
cat /home/pereira/projetos/Lucrivo/.agents/skills/supabase/SKILL.md
cat /home/pereira/projetos/Lucrivo/.agents/skills/supabase-postgres-best-practices/SKILL.md
```

Follow their security-definer, RLS, query, index, migration, and local-test instructions. The approved spec and the security constraints in this plan remain authoritative.

- [ ] **Step 2: Write the failing pgTAP contract and authorization tests**

Create the test transaction and assert the function's security shape before adding aggregate fixtures:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'get_admin_dashboard_v1',
  array[]::text[],
  'versioned dashboard RPC exists'
);

select ok(
  (
    select prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = 'public.get_admin_dashboard_v1()'::regprocedure
  ),
  'dashboard RPC is stable security definer with empty search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_admin_dashboard_v1()',
    'execute'
  ),
  'anonymous callers cannot execute the dashboard RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_admin_dashboard_v1()',
    'execute'
  ),
  'authenticated callers may reach the internal authorization check'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.get_admin_dashboard_v1()',
    'execute'
  ),
  'service role cannot bypass caller-scoped dashboard authorization'
);
```

Insert an admin and a regular user, assign only the admin, then use the same JWT setup pattern as `supabase/tests/admin_authorization.test.sql`:

```sql
delete from private.app_administrator;

insert into auth.users (id, aud, role, email, created_at, last_sign_in_at)
values
  (
    '94000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin-dashboard@example.com',
    statement_timestamp() - interval '1 day',
    statement_timestamp()
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'regular-dashboard@example.com',
    statement_timestamp() - interval '1 day',
    statement_timestamp()
  );

insert into private.app_administrator (user_id)
values ('94000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$ select public.get_admin_dashboard_v1() $$,
  '42501',
  'administrator access required',
  'ordinary users are denied at aal2'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$ select public.get_admin_dashboard_v1() $$,
  '42501',
  'administrator access required',
  'assigned administrator is denied at aal1'
);
reset role;
```

- [ ] **Step 3: Add deterministic aggregation fixtures and assertions**

Derive all fixtures from the São Paulo month boundary so the test works in any month. Insert users on both sides of day/week/month and 30-day boundaries, one free diagnosis, active/canceling contracts, confirmed/received/refunded payments, and more than five recent contracts. Use these assertions after switching the assigned admin JWT to `aal2`:

```sql
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

select is(
  jsonb_typeof(public.get_admin_dashboard_v1()),
  'object',
  'authorized administrator receives one JSON object'
);

select is(
  jsonb_array_length(
    public.get_admin_dashboard_v1() -> 'revenueHistory'
  ),
  12,
  'revenue history always contains twelve zero-filled buckets'
);

select is(
  jsonb_array_length(
    public.get_admin_dashboard_v1() -> 'userGrowth'
  ),
  6,
  'user growth always contains six zero-filled buckets'
);

select ok(
  jsonb_array_length(
    public.get_admin_dashboard_v1() -> 'recentSubscriptions'
  ) <= 5,
  'recent subscriptions are capped at five'
);

select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,monthlyRevenueCents}')::bigint,
  3000::bigint,
  'confirmed and received payments are summed while refunded payments are excluded'
);

```

Before the zero-base assertion, assert the seeded values directly:

```sql
select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,newUsers,today}')::bigint,
  1::bigint,
  'the administrator is excluded and the day boundary is inclusive'
);
select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,activeUsers}')::bigint,
  2::bigint,
  'only non-admin users signed in during the trailing thirty days are active'
);
select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,freeDiagnoses}')::bigint,
  1::bigint,
  'only free diagnoses contribute to the free total'
);
select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,activeSubscriptions}')::bigint,
  2::bigint,
  'active and scheduled-cancellation access are both counted'
);
select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,canceledSubscriptions}')::bigint,
  1::bigint,
  'the current-month confirmed cancellation is counted once'
);
select is(
  (public.get_admin_dashboard_v1() #>> '{metrics,cancellationRateBasisPoints}')::integer,
  5000,
  'one cancellation over an opening base of two is fifty percent'
);
select is(
  public.get_admin_dashboard_v1() #>> '{revenueHistory,11,valueCents}',
  '3000',
  'the newest revenue bucket is the current month'
);
select is(
  public.get_admin_dashboard_v1() #>> '{recentSubscriptions,0,email}',
  'newest-dashboard@example.com',
  'recent contracts use deterministic newest-first order'
);

delete from public.billing_payments;
delete from public.billing_contracts;

select is(
  public.get_admin_dashboard_v1() #>> '{metrics,cancellationRateBasisPoints}',
  null,
  'a zero opening base returns an unavailable cancellation rate'
);

select * from finish();
rollback;
```

Seed the exact counts above with UUIDs beginning `94000000`, and use distinct
billing external references beginning `admin-dashboard-test-`. Add paired users
at the exact São Paulo day, week, and month boundaries and one microsecond before
each boundary; derive expected week and month counts from those named fixture
rows so the assertions remain correct when the test runs on a Monday or the
first day of a month.

- [ ] **Step 4: Run the database test to verify it fails**

Run:

```bash
pnpm exec supabase test db supabase/tests/admin_dashboard.test.sql --local
```

Expected: FAIL because `public.get_admin_dashboard_v1()` does not exist.

- [ ] **Step 5: Implement the versioned aggregate RPC**

Create the migration with a single stable, security-definer entry point and no optional time argument:

```sql
create function public.get_admin_dashboard_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  snapshot_at timestamptz := statement_timestamp();
  local_now timestamp;
  day_start timestamptz;
  week_start timestamptz;
  month_start timestamptz;
  next_month_start timestamptz;
  active_window_start timestamptz;
  administrator_id uuid;
  cancellation_opening_base bigint;
  canceled_subscriptions bigint;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  select administrator.user_id
  into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  local_now := snapshot_at at time zone 'America/Sao_Paulo';
  day_start := date_trunc('day', local_now)
    at time zone 'America/Sao_Paulo';
  week_start := date_trunc('week', local_now)
    at time zone 'America/Sao_Paulo';
  month_start := date_trunc('month', local_now)
    at time zone 'America/Sao_Paulo';
  next_month_start := (date_trunc('month', local_now) + interval '1 month')
    at time zone 'America/Sao_Paulo';
  active_window_start := snapshot_at - interval '30 days';

  select count(*)
  into cancellation_opening_base
  from public.billing_contracts as contract
  where contract.access_starts_at <= month_start
    and contract.access_ends_at > month_start;

  select count(*)
  into canceled_subscriptions
  from public.billing_contracts as contract
  where coalesce(
      contract.cancellation_confirmed_at,
      contract.canceled_at
    ) >= month_start
    and coalesce(
      contract.cancellation_confirmed_at,
      contract.canceled_at
    ) < next_month_start;

  return jsonb_build_object(
    'generatedAt', to_jsonb(snapshot_at),
    'metrics', jsonb_build_object(
      'newUsers', jsonb_build_object(
        'today', (
          select count(*) from auth.users as app_user
          where app_user.id <> administrator_id
            and app_user.created_at >= day_start
            and app_user.created_at <= snapshot_at
        ),
        'week', (
          select count(*) from auth.users as app_user
          where app_user.id <> administrator_id
            and app_user.created_at >= week_start
            and app_user.created_at <= snapshot_at
        ),
        'month', (
          select count(*) from auth.users as app_user
          where app_user.id <> administrator_id
            and app_user.created_at >= month_start
            and app_user.created_at <= snapshot_at
        )
      ),
      'activeUsers', (
        select count(*) from auth.users as app_user
        where app_user.id <> administrator_id
          and app_user.last_sign_in_at >= active_window_start
          and app_user.last_sign_in_at <= snapshot_at
      ),
      'freeDiagnoses', (
        select count(*) from public.diagnoses as diagnosis
        where diagnosis.is_free_report
      ),
      'activeSubscriptions', (
        select count(*) from public.billing_contracts as contract
        where contract.status in ('active', 'cancel_at_period_end')
          and contract.access_starts_at <= snapshot_at
          and contract.access_ends_at > snapshot_at
      ),
      'canceledSubscriptions', canceled_subscriptions,
      'monthlyRevenueCents', (
        select coalesce(sum(payment.value_cents), 0)
        from public.billing_payments as payment
        where payment.status in ('confirmed', 'received')
          and coalesce(payment.received_at, payment.confirmed_at) >= month_start
          and coalesce(payment.received_at, payment.confirmed_at) < next_month_start
          and coalesce(payment.received_at, payment.confirmed_at) <= snapshot_at
      ),
      'cancellationOpeningBase', cancellation_opening_base,
      'cancellationRateBasisPoints', case
        when cancellation_opening_base = 0 then null
        else round(
          canceled_subscriptions * 10000.0 / cancellation_opening_base
        )::integer
      end
    ),
    'revenueHistory', (
      select jsonb_agg(
        jsonb_build_object(
          'period', to_char(bucket.local_start, 'YYYY-MM-DD'),
          'valueCents', bucket.value_cents
        ) order by bucket.local_start
      )
      from (
        select
          series.local_start,
          coalesce(sum(payment.value_cents), 0)::bigint as value_cents
        from generate_series(
          date_trunc('month', local_now) - interval '11 months',
          date_trunc('month', local_now),
          interval '1 month'
        ) as series(local_start)
        left join public.billing_payments as payment
          on payment.status in ('confirmed', 'received')
          and coalesce(payment.received_at, payment.confirmed_at) >=
            series.local_start at time zone 'America/Sao_Paulo'
          and coalesce(payment.received_at, payment.confirmed_at) <
            (series.local_start + interval '1 month')
              at time zone 'America/Sao_Paulo'
          and coalesce(payment.received_at, payment.confirmed_at) <= snapshot_at
        group by series.local_start
      ) as bucket
    ),
    'userGrowth', (
      select jsonb_agg(
        jsonb_build_object(
          'period', to_char(bucket.local_start, 'YYYY-MM-DD'),
          'value', bucket.user_count
        ) order by bucket.local_start
      )
      from (
        select
          series.local_start,
          count(app_user.id)::bigint as user_count
        from generate_series(
          date_trunc('month', local_now) - interval '5 months',
          date_trunc('month', local_now),
          interval '1 month'
        ) as series(local_start)
        left join auth.users as app_user
          on app_user.id <> administrator_id
          and app_user.created_at >=
            series.local_start at time zone 'America/Sao_Paulo'
          and app_user.created_at <
            (series.local_start + interval '1 month')
              at time zone 'America/Sao_Paulo'
          and app_user.created_at <= snapshot_at
        group by series.local_start
      ) as bucket
    ),
    'recentSubscriptions', coalesce((
      select jsonb_agg(to_jsonb(recent_contract) order by recent_contract."createdAt" desc, recent_contract.id desc)
      from (
        select
          contract.id,
          app_user.email,
          contract.billing_mode as "billingMode",
          contract.status,
          contract.created_at as "createdAt"
        from public.billing_contracts as contract
        join auth.users as app_user on app_user.id = contract.user_id
        order by contract.created_at desc, contract.id desc
        limit 5
      ) as recent_contract
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_admin_dashboard_v1()
from public, anon, authenticated, service_role;
grant execute on function public.get_admin_dashboard_v1()
to authenticated;
```

Keep the SQL formatter's line wrapping if it differs, but preserve the exact
authorization, half-open intervals, schema qualification, and return keys.

- [ ] **Step 6: Reset the local database and run the focused pgTAP test**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/admin_dashboard.test.sql --local
```

Expected: the reset succeeds and every dashboard assertion passes.

- [ ] **Step 7: Regenerate TypeScript database types**

Run:

```bash
pnpm supabase:types
```

Verify `Database["public"]["Functions"]["get_admin_dashboard_v1"]` has `Args: Record<PropertyKey, never>` and `Returns: Json`. Do not hand-edit unrelated generated definitions.

- [ ] **Step 8: Run the complete local database suite**

Run:

```bash
pnpm exec supabase test db --local
```

Expected: all existing and new pgTAP files pass.

- [ ] **Step 9: Commit the database boundary**

```bash
git add supabase/migrations/20260916200000_create_admin_dashboard_snapshot.sql supabase/tests/admin_dashboard.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add protected admin dashboard snapshot"
```

---

### Task 2: Validated server dashboard service

**Files:**

- Create: `src/modules/admin/dashboard/admin-dashboard.schema.ts`
- Create: `src/modules/admin/dashboard/admin-dashboard.schema.test.ts`
- Create: `src/modules/admin/dashboard/admin-dashboard.types.ts`
- Create: `src/modules/admin/dashboard/admin-dashboard.formatters.ts`
- Create: `src/modules/admin/dashboard/admin-dashboard.formatters.test.ts`
- Create: `src/modules/admin/dashboard/get-admin-dashboard.service.ts`
- Create: `src/modules/admin/dashboard/get-admin-dashboard.service.test.ts`

**Interfaces:**

- Consumes: `public.get_admin_dashboard_v1()`, `requireAdmin()`, and the request-scoped `createClient()`.
- Produces: `getAdminDashboard(): Promise<AdminDashboardViewModel>` and a sanitized `AdminDashboardUnavailableError`.

- [ ] **Step 1: Write the strict payload-schema tests**

Use one complete fixture with integer counts and cents. Assert that the schema accepts the fixture and rejects missing keys, negative values, fractional counts, more or fewer history buckets, more than five subscriptions, unknown statuses, malformed dates, and additional keys.

```ts
const validSnapshot = {
  generatedAt: "2026-09-16T18:30:00.000Z",
  metrics: {
    newUsers: { today: 2, week: 8, month: 21 },
    activeUsers: 45,
    freeDiagnoses: 19,
    activeSubscriptions: 12,
    canceledSubscriptions: 1,
    monthlyRevenueCents: 289_900,
    cancellationOpeningBase: 20,
    cancellationRateBasisPoints: 500,
  },
  revenueHistory: [
    "2025-10-01",
    "2025-11-01",
    "2025-12-01",
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ].map((period, index) => ({
    period,
    valueCents: index * 10_000,
  })),
  userGrowth: [
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ].map((period, index) => ({
    period,
    value: index + 1,
  })),
  recentSubscriptions: [
    {
      id: "95000000-0000-4000-8000-000000000001",
      email: "cliente@example.com",
      billingMode: "monthly",
      status: "active",
      createdAt: "2026-09-16T15:00:00.000Z",
    },
  ],
};
```

- [ ] **Step 2: Implement the RPC Zod contract**

Define strict reusable primitives and the exact fixed-length arrays:

```ts
import { z } from "zod";

const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const monthPeriodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-01$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00.000Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().startsWith(value)
    );
  });

const historyPointSchema = z.strictObject({
  period: monthPeriodSchema,
  valueCents: countSchema,
});

const growthPointSchema = z.strictObject({
  period: monthPeriodSchema,
  value: countSchema,
});

const contractStatusSchema = z.enum([
  "pending",
  "pending_reconciliation",
  "active",
  "cancel_at_period_end",
  "expired",
  "canceled",
  "refunded",
  "chargeback",
  "failed",
]);

const adminDashboardSnapshotSchema = z.strictObject({
  generatedAt: z.iso.datetime({ offset: true }),
  metrics: z.strictObject({
    newUsers: z.strictObject({
      today: countSchema,
      week: countSchema,
      month: countSchema,
    }),
    activeUsers: countSchema,
    freeDiagnoses: countSchema,
    activeSubscriptions: countSchema,
    canceledSubscriptions: countSchema,
    monthlyRevenueCents: countSchema,
    cancellationOpeningBase: countSchema,
    cancellationRateBasisPoints: z.number().int().nonnegative().nullable(),
  }),
  revenueHistory: z.array(historyPointSchema).length(12),
  userGrowth: z.array(growthPointSchema).length(6),
  recentSubscriptions: z
    .array(
      z.strictObject({
        id: z.uuid(),
        email: z.email().nullable(),
        billingMode: z.enum(["monthly", "annual"]),
        status: contractStatusSchema,
        createdAt: z.iso.datetime({ offset: true }),
      }),
    )
    .max(5),
});

type AdminDashboardSnapshot = z.infer<typeof adminDashboardSnapshotSchema>;

export {
  adminDashboardSnapshotSchema,
  contractStatusSchema,
  type AdminDashboardSnapshot,
};
```

- [ ] **Step 3: Run the schema tests**

Run:

```bash
pnpm test -- src/modules/admin/dashboard/admin-dashboard.schema.test.ts
```

Expected: PASS.

- [ ] **Step 4: Write formatter and status-mapping tests**

Assert these exact examples:

```ts
expect(formatCurrency(289_900)).toBe("R$ 2.899,00");
expect(formatCompactCurrency(289_900)).toBe("R$ 2,9 mil");
expect(formatPercentage(500)).toBe("5,0%");
expect(formatMonthPeriod("2026-09-01")).toBe("set.");
expect(formatSnapshotTime("2026-09-16T18:30:00.000Z")).toBe(
  "16/09/2026, 15:30",
);
expect(formatSubscriptionDate("2026-09-16T02:30:00.000Z")).toBe("15 set. 2026");
expect(presentContractStatus("active")).toEqual({
  label: "Ativa",
  tone: "success",
});
expect(presentContractStatus("cancel_at_period_end")).toEqual({
  label: "Cancelamento agendado",
  tone: "warning",
});
```

Cover every database status with a Portuguese label and one of `success`, `warning`, `danger`, `info`, or `neutral`.

- [ ] **Step 5: Implement types and pure formatters**

Define the UI contract independently from the RPC casing details:

```ts
type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type AdminDashboardViewModel = {
  generatedAtLabel: string;
  metrics: {
    newUsers: { today: number; week: number; month: number };
    activeUsers: number;
    freeDiagnoses: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    monthlyRevenueCents: number;
    cancellationOpeningBase: number;
    cancellationRateBasisPoints: number | null;
  };
  revenueHistory: Array<{
    period: string;
    label: string;
    valueCents: number;
  }>;
  userGrowth: Array<{ period: string; label: string; value: number }>;
  recentSubscriptions: Array<{
    id: string;
    email: string;
    billingModeLabel: "Mensal" | "Anual";
    createdAtLabel: string;
    status: { label: string; tone: StatusTone };
  }>;
};
```

Use module-level `Intl.NumberFormat` and `Intl.DateTimeFormat` instances with `pt-BR` and `America/Sao_Paulo`; do not instantiate formatters during every render. Export `formatCurrency`, `formatCompactCurrency`, `formatPercentage`, `formatMonthPeriod`, `formatSnapshotTime`, `formatSubscriptionDate`, and `presentContractStatus`.

- [ ] **Step 6: Run formatter tests**

Run:

```bash
pnpm test -- src/modules/admin/dashboard/admin-dashboard.formatters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Write the failing service tests**

Mock `requireAdmin` and `createClient`. Cover call order and all closed failures:

```ts
it("authorizes before requesting the snapshot", async () => {
  const order: string[] = [];
  requireAdmin.mockImplementation(async () => {
    order.push("authorize");
    return { userId: "admin" };
  });
  rpc.mockImplementation(async () => {
    order.push("rpc");
    return { data: validSnapshot, error: null };
  });

  await getAdminDashboard();

  expect(order).toEqual(["authorize", "rpc"]);
  expect(rpc).toHaveBeenCalledWith("get_admin_dashboard_v1");
});

it.each([
  [{ data: null, error: { message: "database detail" } }],
  [{ data: { malformed: true }, error: null }],
])("throws only the stable unavailable error for %j", async (rpcResult) => {
  rpc.mockResolvedValue(rpcResult);
  await expect(getAdminDashboard()).rejects.toBeInstanceOf(
    AdminDashboardUnavailableError,
  );
});
```

Also assert the successful view model, null-email fallback, monthly/annual labels, period labels, and status presentation.

- [ ] **Step 8: Run the service test to verify it fails**

Run:

```bash
pnpm test -- src/modules/admin/dashboard/get-admin-dashboard.service.test.ts
```

Expected: FAIL because the service is not implemented.

- [ ] **Step 9: Implement the strict server service**

```ts
import "server-only";

import { createClient } from "@/infrastructure/database/supabase/clients/server.client";
import { requireAdmin } from "@/modules/auth/services/require-admin";

import { adminDashboardSnapshotSchema } from "./admin-dashboard.schema";
import {
  formatMonthPeriod,
  formatSnapshotTime,
  formatSubscriptionDate,
  presentContractStatus,
} from "./admin-dashboard.formatters";
import type { AdminDashboardViewModel } from "./admin-dashboard.types";

class AdminDashboardUnavailableError extends Error {
  constructor() {
    super("admin_dashboard_unavailable");
    this.name = "AdminDashboardUnavailableError";
  }
}

async function getAdminDashboard(): Promise<AdminDashboardViewModel> {
  await requireAdmin();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_admin_dashboard_v1");
    if (error) throw new AdminDashboardUnavailableError();

    const parsed = adminDashboardSnapshotSchema.safeParse(data);
    if (!parsed.success) throw new AdminDashboardUnavailableError();

    const snapshot = parsed.data;
    return {
      generatedAtLabel: formatSnapshotTime(snapshot.generatedAt),
      metrics: snapshot.metrics,
      revenueHistory: snapshot.revenueHistory.map((point) => ({
        ...point,
        label: formatMonthPeriod(point.period),
      })),
      userGrowth: snapshot.userGrowth.map((point) => ({
        ...point,
        label: formatMonthPeriod(point.period),
      })),
      recentSubscriptions: snapshot.recentSubscriptions.map((contract) => ({
        id: contract.id,
        email: contract.email ?? "E-mail indisponível",
        billingModeLabel:
          contract.billingMode === "monthly" ? "Mensal" : "Anual",
        createdAtLabel: formatSubscriptionDate(contract.createdAt),
        status: presentContractStatus(contract.status),
      })),
    };
  } catch (error) {
    if (error instanceof AdminDashboardUnavailableError) throw error;
    throw new AdminDashboardUnavailableError();
  }
}

export { AdminDashboardUnavailableError, getAdminDashboard };
```

Do not catch or translate the error from `requireAdmin()`; keep the authorization call outside the query `try` block so redirects and not-found behavior remain intact.

- [ ] **Step 10: Run all admin dashboard server tests**

Run:

```bash
pnpm test -- src/modules/admin/dashboard/admin-dashboard.schema.test.ts src/modules/admin/dashboard/admin-dashboard.formatters.test.ts src/modules/admin/dashboard/get-admin-dashboard.service.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit the server contract**

```bash
git add src/modules/admin/dashboard
git commit -m "feat: map admin dashboard snapshot"
```

---

### Task 3: Chart infrastructure and reusable metric help

**Files:**

- Create: `src/components/ui/chart.tsx`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/components/shared/metrics/metric-card.tsx`
- Create: `src/components/shared/metrics/metric-card.test.tsx`

**Interfaces:**

- Consumes: existing shadcn configuration and Base UI tooltip primitive.
- Produces: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, and `MetricCard` props `helpText?: string` and `details?: React.ReactNode`.

- [ ] **Step 1: Install the pinned-project shadcn Chart primitive**

Run the already-installed CLI rather than an unpinned remote command:

```bash
pnpm exec shadcn add chart
```

Expected changes: `src/components/ui/chart.tsx`, `package.json`, and `pnpm-lock.yaml`. Reject unrelated component overwrites if the CLI prompts. Verify the generated file imports from `recharts` and uses `@/lib/utils`.

- [ ] **Step 2: Verify the generated chart primitive compiles**

Run:

```bash
pnpm typecheck
```

Expected: PASS with the generated chart API.

- [ ] **Step 3: Write failing metric-card accessibility tests**

```tsx
it("exposes explanatory help to keyboard users", async () => {
  const user = userEvent.setup();
  render(
    <MetricCard
      title="Usuários ativos"
      value="45"
      helpText="Pessoas que entraram no Lucrivo nos últimos 30 dias."
    />,
  );

  await user.tab();
  expect(
    screen.getByRole("button", { name: "Entenda Usuários ativos" }),
  ).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(
    await screen.findByRole("tooltip", {
      name: /Pessoas que entraram no Lucrivo nos últimos 30 dias/i,
    }),
  ).toBeVisible();
});

it("renders a reusable detail region", () => {
  render(
    <MetricCard
      title="Receita mensal"
      value="R$ 2.899,00"
      details={<span>Pagamentos confirmados</span>}
    />,
  );
  expect(screen.getByText("Pagamentos confirmados")).toBeVisible();
});
```

- [ ] **Step 4: Run the metric-card test to verify it fails**

Run:

```bash
pnpm test -- src/components/shared/metrics/metric-card.test.tsx
```

Expected: FAIL because `helpText` and `details` do not exist.

- [ ] **Step 5: Add general-purpose help and details seams**

Add props without adding admin-specific knowledge:

```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: MetricTrend;
  status?: MetricStatus;
  helpText?: string;
  details?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}
```

Render the trigger beside the title, wrapped in `TooltipProvider`, and preserve a minimum 44×44 px hit target:

```tsx
{
  helpText && (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label={`Entenda ${title}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -m-3 grid size-11 place-items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <CircleHelpIcon aria-hidden="true" className="size-4" />
        </TooltipTrigger>
        <TooltipContent role="tooltip">{helpText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

Render `details` after the value/supporting-copy block with `mt-4`; do not alter the existing trend and status behavior.

- [ ] **Step 6: Run the shared component and existing dashboard tests**

Run:

```bash
pnpm test -- src/components/shared/metrics/metric-card.test.tsx
```

Expected: the new test passes. The full suite in Step 7 verifies that the existing financial dashboard still renders and typechecks with the extended props.

- [ ] **Step 7: Run typecheck and full Vitest after dependency installation**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: PASS.

- [ ] **Step 8: Commit the UI infrastructure**

```bash
git add package.json pnpm-lock.yaml src/components/ui/chart.tsx src/components/shared/metrics/metric-card.tsx src/components/shared/metrics/metric-card.test.tsx
git commit -m "feat: add dashboard chart primitives"
```

---

### Task 4: Operational dashboard components

**Files:**

- Create: `src/modules/admin/dashboard/components/admin-dashboard.tsx`
- Create: `src/modules/admin/dashboard/components/admin-metric-grid.tsx`
- Create: `src/modules/admin/dashboard/components/admin-analytics.tsx`
- Create: `src/modules/admin/dashboard/components/recent-subscriptions.tsx`
- Create: `src/modules/admin/dashboard/components/admin-dashboard.test.tsx`

**Interfaces:**

- Consumes: `AdminDashboardViewModel`, `MetricCard`, shadcn Chart/Card/Badge/Table, and formatters from Task 2.
- Produces: `<AdminDashboard dashboard={viewModel} />` as the complete route body.

- [ ] **Step 1: Apply the requested UI skills before writing components**

Read both skill files completely and announce their use:

```bash
cat /home/pereira/.agents/skills/frontend-design/SKILL.md
cat /home/pereira/projetos/Lucrivo/.agents/skills/ui-ux-pro-max/SKILL.md
```

Run the required new-page design-system search and focused chart/Next.js searches:

```bash
python3 /home/pereira/projetos/Lucrivo/.agents/skills/ui-ux-pro-max/scripts/search.py "financial SaaS admin analytics refined" --design-system --variance 5 --motion 3 --density 8 -p "Lucrivo Admin"
python3 /home/pereira/projetos/Lucrivo/.agents/skills/ui-ux-pro-max/scripts/search.py "financial trend dashboard" --domain chart
python3 /home/pereira/projetos/Lucrivo/.agents/skills/ui-ux-pro-max/scripts/search.py "responsive dashboard server client" --stack nextjs
```

Verify each result's category and product fit. If one returns no useful match, retry once with `"admin metrics chart"` in the same domain and document that the skill defaults were used if the retry is also empty. Use the approved spec as the source of truth when a generic recommendation conflicts with Lucrivo.

- [ ] **Step 2: Write the dashboard component tests first**

Use a stable `AdminDashboardViewModel` fixture. Cover the six KPI groups, unique cancellation responsibilities, figures, data summaries, recent subscriptions, and empty states:

```tsx
it("presents the operational hierarchy without duplicate cancellation headlines", () => {
  render(<AdminDashboard dashboard={dashboardFixture} />);

  expect(screen.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  expect(screen.getByText("Hoje")).toBeVisible();
  expect(screen.getByText("Esta semana")).toBeVisible();
  expect(screen.getByText("Este mês")).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Receita dos últimos 12 meses" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Taxa de cancelamento" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Novos usuários nos últimos 6 meses" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Assinaturas recentes" }),
  ).toBeVisible();
  expect(screen.getAllByText("1 cancelamento este mês")).toHaveLength(1);
});

it("explains an unavailable cancellation rate", () => {
  render(
    <AdminDashboard
      dashboard={{
        ...dashboardFixture,
        metrics: {
          ...dashboardFixture.metrics,
          cancellationOpeningBase: 0,
          cancellationRateBasisPoints: null,
        },
      }}
    />,
  );

  expect(screen.getByText("Sem base suficiente")).toBeVisible();
  expect(
    screen.getByText(/não havia assinaturas ativas no início do mês/i),
  ).toBeVisible();
});

it("renders an honest empty recent-subscriptions state", () => {
  render(
    <AdminDashboard
      dashboard={{ ...dashboardFixture, recentSubscriptions: [] }}
    />,
  );
  expect(
    screen.getByText("Nenhuma assinatura registrada até agora."),
  ).toBeVisible();
});
```

Also assert `aria-label` or `aria-labelledby` on both chart figures, the textual current-period summaries, Portuguese status labels, the missing-email fallback, and that no `combobox` or `Novo diagnóstico` action exists.

- [ ] **Step 3: Run the component test to verify it fails**

Run:

```bash
pnpm test -- src/modules/admin/dashboard/components/admin-dashboard.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Build the page composition and metric grid**

Make `admin-dashboard.tsx` a client boundary because it composes Recharts. Keep it data-only and free of fetching:

```tsx
"use client";

import type { AdminDashboardViewModel } from "../admin-dashboard.types";
import { AdminAnalytics } from "./admin-analytics";
import { AdminMetricGrid } from "./admin-metric-grid";
import { RecentSubscriptions } from "./recent-subscriptions";

function AdminDashboard({ dashboard }: { dashboard: AdminDashboardViewModel }) {
  return (
    <main className="mx-auto grid w-full max-w-[100rem] gap-6 lg:gap-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-primary text-sm font-semibold">Operação</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Visão geral
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-6">
            Acompanhe aquisição, uso e saúde financeira do Lucrivo.
          </p>
        </div>
        <p className="text-muted-foreground text-sm tabular-nums">
          Atualizado em {dashboard.generatedAtLabel}
        </p>
      </header>

      <AdminMetricGrid metrics={dashboard.metrics} />
      <AdminAnalytics dashboard={dashboard} />
      <RecentSubscriptions subscriptions={dashboard.recentSubscriptions} />
    </main>
  );
}
```

Use one custom `NewUsersCard` built from `Card` for the three segments. Use `MetricCard` for the other five KPIs. Format counts with `Intl.NumberFormat("pt-BR")`, revenue with `formatCurrency`, and provide these help meanings:

- active users: logins in the trailing 30 days;
- free diagnoses: all-time free reports;
- active subscriptions: access valid now, including scheduled cancellation;
- cancellations: confirmed during the current month;
- monthly revenue: confirmed or received payments in the current month.

Use Lucide icons, `tabular-nums`, `min-w-0`, and the responsive grid `md:grid-cols-2 xl:grid-cols-3`. Do not use emoji or three-dot menus.

- [ ] **Step 5: Build accessible revenue and acquisition charts**

In `admin-analytics.tsx`, use Recharts `AreaChart` and `BarChart` through `ChartContainer`:

```tsx
<figure aria-labelledby="revenue-chart-title" className="min-w-0">
  <Card className="h-full rounded-2xl shadow-sm">
    <CardHeader>
      <CardTitle id="revenue-chart-title">
        Receita dos últimos 12 meses
      </CardTitle>
      <CardDescription>
        Pagamentos confirmados e recebidos por mês
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ChartContainer
        config={{ revenue: { label: "Receita", color: "var(--chart-1)" } }}
        className="h-72 w-full"
        role="img"
        aria-label="Evolução mensal da receita nos últimos 12 meses"
      >
        <AreaChart data={dashboard.revenueHistory} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactCurrency}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(Number(value))}
              />
            }
          />
          <Area
            dataKey="valueCents"
            name="Receita"
            type="monotone"
            fill="var(--color-revenue)"
            fillOpacity={0.14}
            stroke="var(--color-revenue)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ChartContainer>
    </CardContent>
  </Card>
</figure>
```

Use the same figure/title/description pattern for a `BarChart` backed by `userGrowth`, with `var(--chart-2)`. When every point is zero, replace the plotting region with the text `Ainda não há dados para este período.` while retaining the figure heading and description.

- [ ] **Step 6: Build the cancellation panel without repeating its count**

Use a semantic card with a CSS conic-gradient ring or Recharts radial bar. The central value is `formatPercentage(rate)` or `—`; its adjacent label is `Taxa no mês`. Supporting text is:

```ts
const cancellationExplanation =
  rate === null
    ? "Não havia assinaturas ativas no início do mês para calcular a taxa."
    : `Base de ${openingBase.toLocaleString("pt-BR")} assinaturas no início do mês.`;
```

The panel must not render `canceledSubscriptions` again. Include a visible formula explanation in a muted footer and an accessible text equivalent for the ring.

- [ ] **Step 7: Build recent subscriptions as desktop table and mobile cards**

Render one shared row-data array into:

- a `hidden md:block` semantic table with columns `Usuário`, `Modalidade`, `Data`, and `Status`;
- a `md:hidden` list where each `li` labels the same fields and does not scroll horizontally.

Map tones to badge variants locally and exhaustively:

```ts
const badgeVariantByTone = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  neutral: "outline",
} as const;
```

Use the first uppercase email letter inside a decorative initial tile, but do not call it an avatar and do not add a fabricated image. Render `E-mail indisponível` directly when present in the view model.

- [ ] **Step 8: Run the focused dashboard component tests**

Run:

```bash
pnpm test -- src/modules/admin/dashboard/components/admin-dashboard.test.tsx
```

Expected: PASS without React key, act, unknown-prop, or zero-size chart warnings.

- [ ] **Step 9: Run typecheck, lint, and formatting for the component slice**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: PASS. If only new files fail formatting, run `pnpm exec prettier --write` on the explicit new dashboard paths, then rerun the checks.

- [ ] **Step 10: Commit the dashboard components**

```bash
git add src/modules/admin/dashboard/components
git commit -m "feat: build admin dashboard interface"
```

---

### Task 5: Route integration, loading, and recovery

**Files:**

- Modify: `src/app/(admin-panel)/admin/page.tsx`
- Create: `src/app/(admin-panel)/admin/page.test.tsx`
- Create: `src/app/(admin-panel)/admin/loading.tsx`
- Create: `src/app/(admin-panel)/admin/error.tsx`
- Create: `src/app/(admin-panel)/admin/route-states.test.tsx`
- Modify: `src/app/(admin-panel)/admin/pages.test.tsx`

**Interfaces:**

- Consumes: `getAdminDashboard()` and `<AdminDashboard dashboard={...} />`.
- Produces: a complete `/admin` route with stable loading and retry states.

- [ ] **Step 1: Remove the obsolete dashboard scaffold assertion**

In `pages.test.tsx`, remove the `AdminDashboardPage` import and its table row. Rename the suite to `remaining admin scaffold pages`, leaving exact assertions for only `Usuários` and `Assinaturas`.

- [ ] **Step 2: Write the failing page integration test**

Mock the service and visual component so this test verifies server composition rather than Recharts:

```tsx
vi.mock("@/modules/admin/dashboard/get-admin-dashboard.service", () => ({
  getAdminDashboard,
}));
vi.mock("@/modules/admin/dashboard/components/admin-dashboard", () => ({
  AdminDashboard: ({
    dashboard,
  }: {
    dashboard: { generatedAtLabel: string };
  }) => <div>dashboard:{dashboard.generatedAtLabel}</div>,
}));

it("loads the protected snapshot and renders the dashboard", async () => {
  getAdminDashboard.mockResolvedValue(dashboardFixture);
  render(await AdminDashboardPage());
  expect(getAdminDashboard).toHaveBeenCalledOnce();
  expect(screen.getByText("dashboard:16/09/2026, 15:30")).toBeVisible();
});
```

- [ ] **Step 3: Run the page test to verify it fails**

Run:

```bash
pnpm test -- src/app/\(admin-panel\)/admin/page.test.tsx src/app/\(admin-panel\)/admin/pages.test.tsx
```

Expected: FAIL until the route loads the service; the remaining scaffold tests continue to pass.

- [ ] **Step 4: Replace the route scaffold**

```tsx
import { AdminDashboard } from "@/modules/admin/dashboard/components/admin-dashboard";
import { getAdminDashboard } from "@/modules/admin/dashboard/get-admin-dashboard.service";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();
  return <AdminDashboard dashboard={dashboard} />;
}
```

- [ ] **Step 5: Write route-state tests before their implementations**

Assert that loading exposes `role="status"`, `aria-busy="true"`, six metric skeletons, two chart skeletons, and one subscription skeleton. Assert that the error page has the heading `Não foi possível carregar o painel`, explanatory copy, and a keyboard-operable `Tentar novamente` button that calls `reset` once.

```tsx
it("offers a safe retry without exposing provider detail", async () => {
  const user = userEvent.setup();
  const reset = vi.fn();
  render(<AdminDashboardError reset={reset} />);

  expect(
    screen.getByRole("heading", {
      name: "Não foi possível carregar o painel",
    }),
  ).toBeVisible();
  expect(screen.queryByText(/postgres|supabase|rpc/i)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(reset).toHaveBeenCalledOnce();
});
```

- [ ] **Step 6: Implement layout-stable loading skeletons**

Use the same top-level max width and gaps as `AdminDashboard`. Include a screen-reader status and reserve chart heights:

```tsx
export default function AdminDashboardLoading() {
  const metricSkeletons = Array.from({ length: 6 }, (_, index) => index);
  const listSkeletons = Array.from({ length: 5 }, (_, index) => index);

  return (
    <main
      className="mx-auto grid w-full max-w-[100rem] gap-6 lg:gap-8"
      aria-busy="true"
      aria-label="Carregando painel administrativo"
    >
      <p className="sr-only" role="status">
        Carregando indicadores do Lucrivo...
      </p>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <section
        aria-label="Carregando indicadores"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {metricSkeletons.map((key) => (
          <Skeleton key={key} className="h-44 rounded-2xl" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.65fr)]">
        <Skeleton className="h-80 rounded-2xl" />
        <div className="grid gap-3 rounded-2xl border p-5">
          {listSkeletons.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Implement the sanitized route error boundary**

```tsx
"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminDashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-warning/30 bg-warning/5 w-full text-center shadow-md">
        <CardHeader className="items-center gap-3">
          <span className="bg-warning/15 text-warning grid size-12 place-items-center rounded-2xl">
            <TriangleAlertIcon aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold">
              Não foi possível carregar o painel
            </h1>
            <p className="text-muted-foreground leading-6">
              Os dados operacionais estão temporariamente indisponíveis. Você
              pode tentar novamente.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={reset}>
            <RotateCcwIcon aria-hidden="true" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 8: Run all route tests**

Run:

```bash
pnpm test -- src/app/\(admin-panel\)/admin/page.test.tsx src/app/\(admin-panel\)/admin/pages.test.tsx src/app/\(admin-panel\)/admin/route-states.test.tsx src/app/\(admin-panel\)/admin/layout.test.tsx
```

Expected: PASS, including existing MFA and strict-layout behavior.

- [ ] **Step 9: Commit the route integration**

```bash
git add src/app/\(admin-panel\)/admin
git commit -m "feat: connect admin dashboard route"
```

---

### Task 6: Accessibility, responsive, and visual quality gate

**Files:**

- Modify only if findings require it: `src/modules/admin/dashboard/components/*.tsx`
- Modify only if findings require it: `src/components/shared/metrics/metric-card.tsx`
- Modify only if findings require it: `src/app/(admin-panel)/admin/loading.tsx`
- Modify only if findings require it: `src/app/(admin-panel)/admin/error.tsx`

**Interfaces:**

- Consumes: the complete `/admin` implementation.
- Produces: reviewed light/dark, responsive, keyboard, and reduced-motion behavior.

- [ ] **Step 1: Read the UI skill delivery checklist**

```bash
cat /home/pereira/projetos/Lucrivo/.agents/skills/ui-ux-pro-max/references/pro-rules.md
```

Apply the web-relevant checks for icon discipline, focus, contrast, touch targets, dark mode, reduced motion, chart labeling, and layout stability. Do not apply native safe-area rules to this desktop web shell.

- [ ] **Step 2: Start the application for visual review**

Run:

```bash
pnpm dev
```

Use an authorized local admin session with `aal2`. Review `/admin` at 390×844, 768×1024, 1280×800, and 1536×960. If the local database is empty, also exercise the successful empty state; use database test fixtures only in local development and never ship demo data.

- [ ] **Step 3: Verify the visual and interaction checklist**

Confirm all of the following:

- no horizontal page or subscription-list scrolling at 390 px;
- values do not clip at 200% browser zoom;
- cards form one, two, and three columns at the intended breakpoints;
- revenue and user charts retain readable axis labels without collisions;
- chart tooltips stay inside the viewport;
- every help trigger is reachable and dismissible by keyboard;
- focus rings remain visible in light and dark themes;
- status meaning is readable without color;
- the cancellation panel shows no repeated cancellation total;
- empty charts explain the absence of data instead of drawing a flat fake trend;
- reduced motion disables nonessential reveal and chart animation;
- no emoji, fictitious customer details, inactive menu, or fake filter is present.

- [ ] **Step 4: Add one regression test for each discovered issue before fixing it**

For semantic or behavioral findings, add a Testing Library assertion reproducing the issue, run it to see the failure, apply the smallest component fix, and rerun the focused test. For purely visual breakpoint findings, capture the exact viewport and observed defect in the commit body and change only the relevant responsive class.

- [ ] **Step 5: Run the focused dashboard suite after polish**

Run:

```bash
pnpm test -- src/modules/admin/dashboard src/components/shared/metrics/metric-card.test.tsx src/app/\(admin-panel\)/admin
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: PASS with no console warnings from Recharts or React.

- [ ] **Step 6: Commit verified polish only if files changed**

```bash
git add src/modules/admin/dashboard/components src/components/shared/metrics/metric-card.tsx src/app/\(admin-panel\)/admin
git commit -m "fix: polish admin dashboard experience"
```

Skip this commit when the review produces no changes.

---

### Task 7: Full verification and handoff

**Files:**

- Modify only for defects exposed by verification.

**Interfaces:**

- Consumes: all prior tasks.
- Produces: a releasable admin dashboard with recorded automated evidence.

- [ ] **Step 1: Confirm the worktree contains only intended changes**

Run:

```bash
git status --short
git diff --check
git log --oneline -8
```

Expected: no accidental environment files, screenshots, generated local data, or unrelated edits; `git diff --check` prints nothing.

- [ ] **Step 2: Run all PostgreSQL tests**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db --local
```

Expected: every pgTAP suite passes from a clean migration replay.

- [ ] **Step 3: Confirm generated database types are current**

Run:

```bash
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

Expected: no diff after regeneration.

- [ ] **Step 4: Run the full application quality gate**

Run:

```bash
pnpm check
pnpm build
```

Expected: Vitest, typecheck, ESLint, Prettier, and the production webpack build all pass.

- [ ] **Step 5: Inspect the final diff against the approved spec**

Run:

```bash
git diff staging...HEAD --stat
git diff staging...HEAD -- docs/superpowers/specs/2026-09-16-admin-dashboard-design.md supabase/migrations src/modules/admin/dashboard src/app/\(admin-panel\)/admin src/components/shared/metrics/metric-card.tsx src/components/ui/chart.tsx package.json
```

Verify every included and excluded scope item in the spec, especially administrator exclusion, truthful empty/error states, no fake filters, and no service-role data query.

- [ ] **Step 6: Commit any verification fixes and report evidence**

If verification required code corrections, stage only those files and commit:

```bash
git add src/modules/admin/dashboard src/app/\(admin-panel\)/admin src/components/shared/metrics/metric-card.tsx src/components/shared/metrics/metric-card.test.tsx
git commit -m "fix: harden admin dashboard verification"
```

In the handoff, report the database-test result, application-check result, build result, viewport/theme/accessibility review, migrations added, dependency added, and any checks that could not run with the exact reason.
