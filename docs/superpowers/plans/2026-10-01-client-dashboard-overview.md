# Client Dashboard Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static client dashboard with a filtered, data-backed overview of owned reports plus one financially truthful report-in-focus panel.

**Architecture:** A versioned, RLS-respecting Supabase RPC aggregates only comparable report metadata and returns a strict JSON snapshot. The Next.js server page validates URL filters, loads that snapshot, fetches only the selected report's full snapshot, and maps both into focused view models; React components render counts and persisted report facts without introducing financial calculations.

**Tech Stack:** PostgreSQL 15/Supabase RLS and pgTAP, Supabase JS, Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Tailwind CSS 4, Base UI/shadcn components, Vitest and Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-01-client-dashboard-overview-design.md`

## Global Constraints

- `/dashboard` is the decision-oriented overview; `/reports` remains the complete paginated library.
- Global metrics are counts only. Never average or sum report price, margin, result, revenue, or sales goals.
- Financial values come from exactly one validated report snapshot and reuse existing report presenters/calculations.
- Unknown values remain `Ainda não calculado` or `Indisponível`; never coerce `null` to zero.
- `no_sales` means a known month with zero sales and is not pending data.
- Do not use `Na meta`, universal margin quality labels, market claims, or financial trend comparisons.
- The RPC receives no user id; caller identity comes from `(select auth.uid())`, and RLS continues to enforce historical report access.
- RPC execution is granted only to `authenticated`, with explicit revocation from `public`, `anon`, and `service_role`.
- URL and UI copy are Portuguese (Brazil); code identifiers remain English.
- Date boundaries use `America/Sao_Paulo`; `from` is inclusive and `to` is an exclusive calendar date.
- Desktop and mobile must expose the same data and actions, work by keyboard, and never communicate state by color alone.
- Do not add a dependency; reuse existing components, Lucide icons, formatters, and report presenters.

---

## File Structure

### Database boundary

- Create through the Supabase CLI: `supabase/migrations/*_client_dashboard_overview.sql` — versioned aggregate RPC, argument validation, privileges.
- Create: `supabase/tests/client_dashboard.test.sql` — pgTAP authorization, filtering, grouping, focus, and payload tests.
- Regenerate: `src/infrastructure/database/supabase/database.types.ts` — typed `get_client_dashboard_v1` signature.

### Dashboard domain and service

- Create: `src/modules/client-dashboard/client-dashboard.filters.ts` — parse, normalize, serialize, patch, and map URL filters to RPC arguments.
- Create: `src/modules/client-dashboard/client-dashboard.filters.test.ts` — filter boundary and canonical URL tests.
- Create: `src/modules/client-dashboard/client-dashboard.schema.ts` — strict Zod contract for the RPC payload.
- Create: `src/modules/client-dashboard/client-dashboard.schema.test.ts` — payload acceptance and rejection tests.
- Create: `src/modules/client-dashboard/client-dashboard.types.ts` — display-oriented overview and focus types shared by components.
- Create: `src/modules/client-dashboard/client-dashboard.formatters.ts` — labels, tones, counts, and update-date presentation only.
- Create: `src/modules/client-dashboard/client-dashboard.formatters.test.ts` — exhaustive verdict/priority/category presentation tests.
- Create: `src/modules/client-dashboard/to-dashboard-report-focus.ts` — select existing report metrics and persisted complementary facts.
- Create: `src/modules/client-dashboard/to-dashboard-report-focus.test.ts` — quick, detailed, partial, and discount-limit focus tests.
- Create: `src/modules/client-dashboard/get-client-dashboard.service.ts` — RPC validation, view-model mapping, focus loading, and isolated focus failure.
- Create: `src/modules/client-dashboard/get-client-dashboard.service.test.ts` — authorization, RPC arguments, mapping, fallback, and stable error tests.

### Dashboard components and route

- Create: `src/modules/client-dashboard/components/dashboard-filters.tsx` — responsive filter form, active chips, clear action.
- Create: `src/modules/client-dashboard/components/dashboard-filters.test.tsx` — keyboard, URL, dependent option, and clear tests.
- Create: `src/modules/client-dashboard/components/client-dashboard-metric-grid.tsx` — four global count cards and filter shortcuts.
- Create: `src/modules/client-dashboard/components/dashboard-distributions.tsx` — accessible status and priority bars.
- Create: `src/modules/client-dashboard/components/dashboard-overview.test.tsx` — metrics and distribution semantics.
- Create: `src/modules/client-dashboard/components/dashboard-recent-reports.tsx` — six recent summaries and focus/open actions.
- Create: `src/modules/client-dashboard/components/dashboard-report-focus.tsx` — four report metrics, complementary facts, and isolated unavailable state.
- Create: `src/modules/client-dashboard/components/dashboard-report-focus.test.tsx` — available, partial, and unavailable rendering.
- Create: `src/modules/client-dashboard/components/client-dashboard-empty-state.tsx` — first-report and filtered-empty variants.
- Create: `src/modules/client-dashboard/components/client-dashboard.tsx` — full page composition and hierarchy.
- Create: `src/modules/client-dashboard/components/client-dashboard.test.tsx` — complete composition and responsive-class contract.
- Replace: `src/app/(private)/dashboard/page.tsx` — protected server loader and route composition.
- Create: `src/app/(private)/dashboard/page.test.tsx` — SSR orchestration and error behavior.
- Create: `src/app/(private)/dashboard/loading.tsx` — layout-stable accessible skeleton.
- Create: `src/app/(private)/dashboard/error.tsx` — retry and new-diagnosis recovery.

---

### Task 1: Add the protected aggregate dashboard RPC

**Files:**

- Create via CLI: `supabase/migrations/*_client_dashboard_overview.sql`
- Create: `supabase/tests/client_dashboard.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `public.diagnoses`, its `diagnoses_select_own` RLS policy, and `diagnoses_user_active_created_id_idx`.
- Produces: `public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint) returns jsonb` and its generated Supabase JS signature.

- [ ] **Step 1: Let the Supabase CLI create the migration file**

Run:

```bash
pnpm exec supabase migration new client_dashboard_overview
```

Expected: one empty migration file whose name ends in `_client_dashboard_overview.sql`. Use the exact path printed by the CLI in every remaining step of this task; do not rename it or invent a timestamp.

- [ ] **Step 2: Write the failing pgTAP contract and authorization tests**

Create `supabase/tests/client_dashboard.test.sql` with a transaction, `pgtap`, `no_plan()`, and these exact contract assertions before adding fixtures:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'get_client_dashboard_v1',
  array[
    'date', 'date', 'text[]', 'text[]', 'text[]',
    'text[]', 'text[]', 'text', 'bigint'
  ],
  'versioned client dashboard RPC exists'
);

select ok(
  (
    select not prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = to_regprocedure(
      'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)'
    )
  ),
  'client dashboard RPC is stable security invoker with empty search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)',
    'execute'
  ),
  'anonymous callers cannot execute the client dashboard RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)',
    'execute'
  ),
  'authenticated callers can execute the client dashboard RPC'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)',
    'execute'
  ),
  'service role cannot bypass caller-scoped dashboard access'
);
```

Follow the existing Auth, billing-contract, and JWT fixture patterns in `supabase/tests/report_lifecycle.test.sql`. Create two eligible users, a paid interval covering the primary user's non-free reports, and mixed `diagnoses` rows covering all seven current verdicts, all five priorities, quick/detailed modes, all categories, a soft-deleted row, and one row owned by the second user.

Add assertions that prove:

```sql
-- Shape and zero-filled groups.
select is(
  jsonb_array_length(public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) -> 'verdictCounts'),
  7,
  'every verdict bucket is returned'
);

select is(
  jsonb_array_length(public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) -> 'priorityCounts'),
  5,
  'every priority bucket is returned'
);

-- Payload minimization.
select ok(
  not (
    public.get_client_dashboard_v1(
      null, null, null, null, null, null, null, 'all', null
    )::text like '%reportSnapshot%'
  ),
  'dashboard payload never exposes report snapshots'
);

-- Stable recent limit and caller-only ownership.
select is(
  jsonb_array_length(public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) -> 'recentReports'),
  6,
  'recent reports are capped at six'
);
```

Also assert each filter individually, the combined loss and pending counts, `no_sales` as complete, deleted-row exclusion, other-user exclusion, requested focus selection, invalid focus fallback to newest, `hasAnyReports=true` with an empty filtered set, and `hasAnyReports=false` for a user with no readable reports. Finish with `select * from finish(); rollback;`.

- [ ] **Step 3: Run the new SQL test and verify the expected failure**

Run:

```bash
pnpm exec supabase test db supabase/tests/client_dashboard.test.sql
```

Expected: FAIL because `public.get_client_dashboard_v1(...)` does not exist.

- [ ] **Step 4: Implement the RPC with static, validated predicates**

In the CLI-generated migration, use this signature and privilege model:

```sql
create function public.get_client_dashboard_v1(
  p_from_date date default null,
  p_to_date date default null,
  p_categories text[] default null,
  p_modes text[] default null,
  p_scenarios text[] default null,
  p_verdicts text[] default null,
  p_priorities text[] default null,
  p_data_state text default 'all',
  p_focus_id bigint default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  snapshot_at timestamptz := pg_catalog.statement_timestamp();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_from_date is not null
    and p_to_date is not null
    and p_from_date >= p_to_date
  then
    raise exception using errcode = '22023', message = 'invalid dashboard date range';
  end if;

  if p_data_state is null
    or p_data_state not in ('all', 'complete', 'pending')
    or (p_categories is not null and (
      pg_catalog.cardinality(p_categories) not between 1 and 3
      or not p_categories <@ array['service', 'product', 'production']::text[]
    ))
    or (p_modes is not null and (
      pg_catalog.cardinality(p_modes) not between 1 and 2
      or not p_modes <@ array['quick', 'detailed']::text[]
    ))
    or (p_scenarios is not null and (
      pg_catalog.cardinality(p_scenarios) not between 1 and 9
      or not p_scenarios <@ array[
        'hour', 'minute', 'appointment', 'day', 'week', 'month',
        'resale', 'digital', 'manufacturing'
      ]::text[]
    ))
    or (p_verdicts is not null and (
      pg_catalog.cardinality(p_verdicts) not between 1 and 7
      or not p_verdicts <@ array[
        'missing_price', 'direct_loss', 'incomplete_volume',
        'operational_loss', 'no_sales', 'break_even', 'positive_result'
      ]::text[]
    ))
    or (p_priorities is not null and (
      pg_catalog.cardinality(p_priorities) not between 1 and 5
      or not p_priorities <@ array[
        'cost', 'data', 'price', 'margin', 'volume'
      ]::text[]
    ))
  then
    raise exception using errcode = '22023', message = 'invalid dashboard filters';
  end if;

  return (
    with readable as materialized (
      select
        diagnosis.*,
        (
          pg_catalog.coalesce(diagnosis.is_partial, false)
          or diagnosis.verdict in ('incomplete_volume', 'missing_price')
        ) as has_pending_data
      from public.diagnoses as diagnosis
      where diagnosis.user_id = caller_id
        and diagnosis.deleted_at is null
    ),
    filtered as materialized (
      select *
      from readable
      where (p_from_date is null or created_at >= (
          p_from_date::timestamp at time zone 'America/Sao_Paulo'
        ))
        and (p_to_date is null or created_at < (
          p_to_date::timestamp at time zone 'America/Sao_Paulo'
        ))
        and (p_categories is null or business_category::text = any(p_categories))
        and (p_modes is null or analysis_mode = any(p_modes))
        and (p_scenarios is null or scenario = any(p_scenarios))
        and (p_verdicts is null or verdict = any(p_verdicts))
        and (p_priorities is null or priority = any(p_priorities))
        and (
          p_data_state = 'all'
          or (p_data_state = 'pending' and has_pending_data)
          or (p_data_state = 'complete' and not has_pending_data)
        )
    ),
    selected_focus as (
      select id
      from filtered
      order by (id = p_focus_id) desc, created_at desc, id desc
      limit 1
    )
    select pg_catalog.jsonb_build_object(
      'generatedAt', snapshot_at,
      'filters', pg_catalog.jsonb_build_object(
        'from', p_from_date,
        'to', p_to_date,
        'categories', pg_catalog.coalesce(to_jsonb(p_categories), '[]'::jsonb),
        'modes', pg_catalog.coalesce(to_jsonb(p_modes), '[]'::jsonb),
        'scenarios', pg_catalog.coalesce(to_jsonb(p_scenarios), '[]'::jsonb),
        'verdicts', pg_catalog.coalesce(to_jsonb(p_verdicts), '[]'::jsonb),
        'priorities', pg_catalog.coalesce(to_jsonb(p_priorities), '[]'::jsonb),
        'dataState', p_data_state
      ),
      'hasAnyReports', exists(select 1 from readable),
      'focusReportId', (select id from selected_focus),
      'metrics', pg_catalog.jsonb_build_object(
        'totalReports', (select count(*) from filtered),
        'positiveResultReports', (
          select count(*) from filtered where verdict = 'positive_result'
        ),
        'lossReports', (
          select count(*) from filtered
          where verdict in ('direct_loss', 'operational_loss')
        ),
        'pendingDataReports', (
          select count(*) from filtered where has_pending_data
        )
      ),
      'verdictCounts', (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'verdict', bucket.verdict,
            'count', (select count(*) from filtered where verdict = bucket.verdict)
          ) order by bucket.position
        )
        from (values
          (1, 'direct_loss'),
          (2, 'missing_price'),
          (3, 'incomplete_volume'),
          (4, 'operational_loss'),
          (5, 'no_sales'),
          (6, 'break_even'),
          (7, 'positive_result')
        ) as bucket(position, verdict)
      ),
      'priorityCounts', (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'priority', bucket.priority,
            'count', (select count(*) from filtered where priority = bucket.priority)
          ) order by bucket.position
        )
        from (values
          (1, 'cost'), (2, 'data'), (3, 'price'),
          (4, 'margin'), (5, 'volume')
        ) as bucket(position, priority)
      ),
      'recentReports', pg_catalog.coalesce((
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', recent.id,
            'businessCategory', recent.business_category,
            'scenario', recent.scenario,
            'analysisMode', recent.analysis_mode,
            'createdAt', recent.created_at,
            'updatedAt', recent.updated_at,
            'verdict', recent.verdict,
            'priority', recent.priority,
            'hasPendingData', recent.has_pending_data,
            'itemCount', recent.item_count,
            'realMarginBasisPoints', recent.real_margin_basis_points,
            'monthlyResultCents', recent.monthly_result_cents,
            'schemaVersion', recent.schema_version,
            'calculationVersion', recent.calculation_version,
            'contentVersion', recent.content_version
          ) order by recent.created_at desc, recent.id desc
        )
        from (
          select * from filtered
          order by created_at desc, id desc
          limit 6
        ) as recent
      ), '[]'::jsonb)
    )
  );
end;
$function$;

revoke execute on function public.get_client_dashboard_v1(
  date, date, text[], text[], text[], text[], text[], text, bigint
) from public, anon, authenticated, service_role;

grant execute on function public.get_client_dashboard_v1(
  date, date, text[], text[], text[], text[], text[], text, bigint
) to authenticated;
```

Keep schema qualification and `search_path = ''` exactly as shown. Do not add an index in this migration: the existing active-owner/date index is the initial access path.

- [ ] **Step 5: Reset the local database and run the dashboard SQL tests**

Run:

```bash
pnpm run supabase:reset
pnpm exec supabase test db supabase/tests/client_dashboard.test.sql
```

Expected: reset succeeds and every pgTAP assertion passes.

- [ ] **Step 6: Run adjacent report/RLS regression tests**

Run:

```bash
pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql supabase/tests/report_lifecycle.test.sql
```

Expected: PASS; the new invoker RPC does not weaken existing ownership or historical-access behavior.

- [ ] **Step 7: Inspect representative query plans before adding indexes**

Using local `psql`, authenticate as the primary fixture user and run `explain (analyze, buffers)` for the unfiltered RPC's `readable/filtered/recent` query, a query with category plus date range, and a query filtered by verdict. Confirm the plan begins from `diagnoses_user_active_created_id_idx` or produces acceptably small fixture scans. Record the plan summary in the commit message body if no index is added; add an index only if the measured plan demonstrates a material regression.

- [ ] **Step 8: Run database advisors and regenerate generated types**

Run:

```bash
pnpm run supabase:advisors
pnpm run supabase:types
```

Expected: no error-level advisor finding and `Database["public"]["Functions"]["get_client_dashboard_v1"]` exposes the nine RPC arguments and `Json` return type.

- [ ] **Step 9: Commit the database boundary**

```bash
git add supabase/migrations supabase/tests/client_dashboard.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add client dashboard snapshot"
```

---

### Task 2: Define and canonicalize dashboard filters

**Files:**

- Create: `src/modules/client-dashboard/client-dashboard.filters.ts`
- Create: `src/modules/client-dashboard/client-dashboard.filters.test.ts`

**Interfaces:**

- Consumes: generated `Database["public"]["Functions"]["get_client_dashboard_v1"]["Args"]`.
- Produces: `DashboardSearchParams`, `ClientDashboardFilters`, `parseClientDashboardFilters`, `toClientDashboardRpcArgs`, `buildClientDashboardHref`, `previousCalendarDate`, and `nextCalendarDate`.

- [ ] **Step 1: Write failing filter parsing and canonicalization tests**

Cover scalar-only dates/report ids, comma-separated enum values, duplicate removal, canonical enum order, unknown-value removal, scenario/category compatibility, inverted range removal, maximum list sizes, `dataState`, and filter patching. Use concrete expectations:

```ts
expect(
  parseClientDashboardFilters({
    category: "production,product,product,unknown",
    mode: "detailed",
    scenario: "hour,resale,manufacturing",
    verdict: "operational_loss,direct_loss",
    priority: "price",
    dataState: "pending",
    from: "2026-09-01",
    to: "2026-10-01",
    report: "42",
  }),
).toEqual({
  from: "2026-09-01",
  to: "2026-10-01",
  categories: ["product", "production"],
  modes: ["detailed"],
  scenarios: ["resale", "manufacturing"],
  verdicts: ["direct_loss", "operational_loss"],
  priorities: ["price"],
  dataState: "pending",
  reportId: 42,
});

expect(toClientDashboardRpcArgs(parseClientDashboardFilters({}))).toEqual({
  p_from_date: null,
  p_to_date: null,
  p_categories: null,
  p_modes: null,
  p_scenarios: null,
  p_verdicts: null,
  p_priorities: null,
  p_data_state: "all",
  p_focus_id: null,
});

expect(
  buildClientDashboardHref(parseClientDashboardFilters({}), {
    verdicts: ["direct_loss", "operational_loss"],
  }),
).toBe("/dashboard?verdict=direct_loss%2Coperational_loss");

expect(nextCalendarDate("2026-09-30")).toBe("2026-10-01");
expect(previousCalendarDate("2026-10-01")).toBe("2026-09-30");
```

- [ ] **Step 2: Run the filter test and verify it fails**

Run:

```bash
pnpm test -- src/modules/client-dashboard/client-dashboard.filters.test.ts
```

Expected: FAIL because the filter module does not exist.

- [ ] **Step 3: Implement the pure filter module**

Define exact filter types:

```ts
type DashboardSearchParams = Record<string, string | string[] | undefined>;

type ClientDashboardFilters = {
  from: string | null;
  to: string | null;
  categories: Array<"service" | "product" | "production">;
  modes: Array<"quick" | "detailed">;
  scenarios: ReportScenario[];
  verdicts: ReportVerdict[];
  priorities: ReportPriority[];
  dataState: "all" | "complete" | "pending";
  reportId: number | null;
};
```

Use explicit ordered constant arrays, a strict `YYYY-MM-DD` calendar-date parser, safe-positive-integer parsing for `report`, and UTC calendar arithmetic for `nextCalendarDate`/`previousCalendarDate` so calendar math never depends on the runtime timezone. `to` remains exclusive internally; the UI converts the inclusive `Até` control with `nextCalendarDate` before navigation.

`buildClientDashboardHref` must sort keys in this order: `from`, `to`, `category`, `mode`, `scenario`, `verdict`, `priority`, `dataState`, `report`. Omit empty arrays, `dataState=all`, and `report=null`. Any patch that changes a filter other than `reportId` must clear `reportId` so the RPC selects a valid fallback.

- [ ] **Step 4: Run the filter tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/client-dashboard.filters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the filter boundary**

```bash
git add src/modules/client-dashboard/client-dashboard.filters.ts src/modules/client-dashboard/client-dashboard.filters.test.ts
git commit -m "feat: add client dashboard filters"
```

---

### Task 3: Validate and present the aggregate snapshot

**Files:**

- Create: `src/modules/client-dashboard/client-dashboard.schema.ts`
- Create: `src/modules/client-dashboard/client-dashboard.schema.test.ts`
- Create: `src/modules/client-dashboard/client-dashboard.types.ts`
- Create: `src/modules/client-dashboard/client-dashboard.formatters.ts`
- Create: `src/modules/client-dashboard/client-dashboard.formatters.test.ts`

**Interfaces:**

- Consumes: verdict, priority, scenario, and report version constants from `src/modules/reports/types.ts`.
- Produces: `clientDashboardSnapshotSchema`, `ClientDashboardSnapshot`, `ClientDashboardViewModel`, `DashboardRecentReportViewModel`, `DashboardReportFocusViewModel`, `DashboardFocusLoad`, `toClientDashboardViewModel`, `presentVerdict`, `presentPriority`, `presentCategory`, and `presentAnalysisMode`.

- [ ] **Step 1: Write the failing strict-schema tests**

Build one valid payload containing exactly seven verdict counts, five priority counts, six or fewer recent reports, nullable focus id, nullable money/margin/item fields, and echoed filters. Assert acceptance, then reject one case for each of these boundaries:

```ts
expect(clientDashboardSnapshotSchema.safeParse(validSnapshot).success).toBe(
  true,
);

for (const invalid of [
  { ...validSnapshot, generatedAt: "not-a-date" },
  { ...validSnapshot, focusReportId: 0 },
  { ...validSnapshot, verdictCounts: validSnapshot.verdictCounts.slice(1) },
  { ...validSnapshot, priorityCounts: [] },
  { ...validSnapshot, recentReports: Array(7).fill(validRecentReport) },
  { ...validSnapshot, metrics: { ...validSnapshot.metrics, totalReports: -1 } },
  { ...validSnapshot, reportSnapshot: {} },
]) {
  expect(clientDashboardSnapshotSchema.safeParse(invalid).success).toBe(false);
}
```

Assert the verdict and priority arrays are not only the right lengths but are in the exact persisted order, preventing duplicate buckets from satisfying length checks.

- [ ] **Step 2: Run the schema test and verify it fails**

Run:

```bash
pnpm test -- src/modules/client-dashboard/client-dashboard.schema.test.ts
```

Expected: FAIL because the schema module does not exist.

- [ ] **Step 3: Implement the strict Zod contract**

Use `z.strictObject` at every object boundary, `z.iso.datetime({ offset: true })` for timestamps, `z.number().int().positive().max(Number.MAX_SAFE_INTEGER)` for ids, and a reusable nonnegative safe count schema. The recent-report schema must include only the fields approved in the spec and must use `.max(6)`.

Add `superRefine` checks that compare `verdictCounts.map(entry => entry.verdict)` and `priorityCounts.map(entry => entry.priority)` to the exact ordered constants. Export the inferred `ClientDashboardSnapshot` type.

- [ ] **Step 4: Write failing exhaustive formatter tests**

Assert all seven verdicts, five priorities, three categories, and two modes map to stable Portuguese labels and semantic tones. The exact verdict labels are:

```ts
expect(reportVerdicts.map((verdict) => presentVerdict(verdict).label)).toEqual([
  "Preço não informado",
  "Perda por venda",
  "Volume não informado",
  "Prejuízo no cenário informado",
  "Mês sem vendas",
  "Zero a zero",
  "Resultado positivo",
]);
```

Use `danger` for direct/operational loss, `warning` for break-even, `success` for positive result, and `info` for missing/no-sales states. Priorities remain neutral/action labels rather than severity.

- [ ] **Step 5: Implement shared dashboard types and formatters**

Define:

```ts
type DashboardTone = "success" | "warning" | "danger" | "info" | "neutral";

type DashboardRecentReportViewModel = {
  id: number;
  title: string;
  categoryLabel: string;
  scenarioLabel: string;
  modeLabel: string;
  createdAtLabel: string;
  verdict: { label: string; tone: DashboardTone };
  priorityLabel: string;
  dataStateLabel: "Completo" | "Dados pendentes";
  itemCountLabel: string | null;
  monthlyResultLabel: string | null;
  realMarginLabel: string | null;
  openHref: string;
};

type DashboardComplementaryFact = {
  key:
    | "direct_loss_items"
    | "missing_volume_items"
    | "analyzed_items"
    | "updated_at"
    | "discount_limit";
  label: string;
  value: string;
  supportingText?: string;
};

type DashboardReportFocusViewModel = {
  id: number;
  title: string;
  categoryLabel: string;
  scenarioLabel: string;
  modeLabel: string;
  createdAtLabel: string;
  updatedAtLabel: string | null;
  verdict: { label: string; tone: DashboardTone };
  priorityLabel: string;
  metrics: ReportNumberViewModel[];
  complementaryFacts: DashboardComplementaryFact[];
  openHref: string;
};

type ClientDashboardViewModel = {
  generatedAtLabel: string;
  hasAnyReports: boolean;
  focusReportId: number | null;
  metrics: ClientDashboardSnapshot["metrics"];
  verdictCounts: Array<{
    verdict: ReportVerdict;
    count: number;
    label: string;
    tone: DashboardTone;
  }>;
  priorityCounts: Array<{
    priority: ReportPriority;
    count: number;
    label: string;
  }>;
  recentReports: DashboardRecentReportViewModel[];
};

type DashboardFocusLoad =
  | { status: "ready"; report: DashboardReportFocusViewModel }
  | { status: "none" }
  | { status: "unavailable"; reportId: number };
```

Import `ReportNumberViewModel` from the existing quick-report presenter. Implement `toClientDashboardViewModel(snapshot: ClientDashboardSnapshot, filters: ClientDashboardFilters): ClientDashboardViewModel` in the formatter module. Use the existing `formatCurrency`, `formatBasisPoints`, `formatReportDate`, and `formatReportScenario` functions; do not duplicate financial formatting. The mapper omits nullable recent-report result, margin, and item values instead of formatting them as zero.

- [ ] **Step 6: Run schema and formatter tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/client-dashboard.schema.test.ts src/modules/client-dashboard/client-dashboard.formatters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the aggregate contract**

```bash
git add src/modules/client-dashboard/client-dashboard.schema.ts src/modules/client-dashboard/client-dashboard.schema.test.ts src/modules/client-dashboard/client-dashboard.types.ts src/modules/client-dashboard/client-dashboard.formatters.ts src/modules/client-dashboard/client-dashboard.formatters.test.ts
git commit -m "feat: validate client dashboard data"
```

---

### Task 4: Build the report-in-focus presenter

**Files:**

- Create: `src/modules/client-dashboard/to-dashboard-report-focus.ts`
- Create: `src/modules/client-dashboard/to-dashboard-report-focus.test.ts`

**Interfaces:**

- Consumes: `OwnedReport`, `toReportViewModel`, `toDetailedReportViewModel`, `isDetailedReportSnapshot`, and existing formatters.
- Produces: `toDashboardReportFocus(report: OwnedReport): DashboardReportFocusViewModel`.

- [ ] **Step 1: Write failing quick-report focus tests**

Build valid service, product, and production snapshots with the existing domain builders and calculators. Assert all quick modes select the same semantic keys while preserving category labels:

```ts
expect(
  toDashboardReportFocus(productReport).metrics.map((item) => item.key),
).toEqual(["profit", "margin", "minimum", "sales"]);

expect(toDashboardReportFocus(serviceReport)).toMatchObject({
  modeLabel: "Rápido",
  complementaryFacts: expect.arrayContaining([
    {
      key: "analyzed_items",
      label: "Ofertas analisadas",
      value: "1 serviço analisado",
    },
  ]),
  openHref: "/reports/42",
});
```

For a null-volume Product snapshot, assert margin/result/minimum remain exactly `Ainda não calculado` and no selected value is `R$ 0,00`.

- [ ] **Step 2: Write failing detailed-report focus tests**

Build a two-item detailed snapshot with one `directLoss=true` item and one null volume. Assert:

```ts
expect(focus.metrics.map((item) => item.key)).toEqual([
  "result",
  "margin",
  "break_even",
  "sales",
]);
expect(focus.complementaryFacts).toEqual(
  expect.arrayContaining([
    {
      key: "direct_loss_items",
      label: "Itens com perda por venda",
      value: "1",
    },
    {
      key: "missing_volume_items",
      label: "Itens sem volume informado",
      value: "1",
    },
    { key: "analyzed_items", label: "Itens analisados", value: "2" },
  ]),
);
```

Assert the detailed sales-goal supporting text is reused unchanged, including the current-mix limitation.

- [ ] **Step 3: Run the presenter test and verify it fails**

Run:

```bash
pnpm test -- src/modules/client-dashboard/to-dashboard-report-focus.test.ts
```

Expected: FAIL because the presenter does not exist.

- [ ] **Step 4: Implement the focus presenter by selecting existing report numbers**

Use this selection table and never recompute values:

```ts
const quickFocusKeys = ["profit", "margin", "minimum", "sales"] as const;
const detailedFocusKeys = ["result", "margin", "break_even", "sales"] as const;
```

For quick reports call `toReportViewModel`; for detailed reports call `toDetailedReportViewModel`. Preserve each selected `ReportNumberViewModel`'s label, value, supporting text, and help. Read complementary counts directly from persisted snapshot arrays/booleans. Format `breakEvenDiscountPercent` as `${value}%` only when the quick snapshot result is non-null; label it `Limite antes do prejuízo` and supporting text `É um limite calculado, não uma recomendação de desconto.`

Set `updatedAtLabel` only when `updatedAt !== createdAt`. Derive verdict presentation from the persisted verdict, priority presentation from the persisted priority, and `openHref` from the report id.

- [ ] **Step 5: Run the presenter tests and adjacent report presenter tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/to-dashboard-report-focus.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts
```

Expected: PASS; no existing report copy or unavailable-value behavior changes.

- [ ] **Step 6: Commit the focus presenter**

```bash
git add src/modules/client-dashboard/to-dashboard-report-focus.ts src/modules/client-dashboard/to-dashboard-report-focus.test.ts
git commit -m "feat: present dashboard report focus"
```

---

### Task 5: Load and compose the client dashboard on the server

**Files:**

- Create: `src/modules/client-dashboard/get-client-dashboard.service.ts`
- Create: `src/modules/client-dashboard/get-client-dashboard.service.test.ts`

**Interfaces:**

- Consumes: `ClientDashboardFilters`, `toClientDashboardRpcArgs`, `clientDashboardSnapshotSchema`, `getOwnedReport`, and `toDashboardReportFocus`.
- Produces: `getClientDashboard({ supabase, userId, filters }): Promise<{ dashboard: ClientDashboardViewModel; focus: DashboardFocusLoad }>` and `ClientDashboardUnavailableError`.

- [ ] **Step 1: Write failing RPC and mapping tests**

Mock one request-scoped Supabase client and `getOwnedReport`. Verify exact RPC arguments, strict parsing, labels, recent values, and focus loading:

```ts
expect(rpc).toHaveBeenCalledWith(
  "get_client_dashboard_v1",
  toClientDashboardRpcArgs(filters),
);
expect(getOwnedReport).toHaveBeenCalledWith({
  supabase,
  userId: "trusted-user",
  diagnosisId: "42",
});
expect(result.dashboard.metrics).toEqual(validSnapshot.metrics);
expect(result.focus.status).toBe("ready");
```

Add cases for `focusReportId=null` without a focus read, `getOwnedReport` returning `unavailable`, `not_found`, or `read_failed`, malformed RPC JSON, and raw RPC errors.

- [ ] **Step 2: Run the service test and verify it fails**

Run:

```bash
pnpm test -- src/modules/client-dashboard/get-client-dashboard.service.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement one aggregate read plus one optional focus read**

Use this control flow:

```ts
const { data, error } = await supabase.rpc(
  "get_client_dashboard_v1",
  toClientDashboardRpcArgs(filters),
);
if (error) throw new ClientDashboardUnavailableError();

const parsed = clientDashboardSnapshotSchema.safeParse(data);
if (!parsed.success) throw new ClientDashboardUnavailableError();

const dashboard = toClientDashboardViewModel(parsed.data, filters);
if (parsed.data.focusReportId === null) {
  return { dashboard, focus: { status: "none" } };
}

const reportResult = await getOwnedReport({
  supabase,
  userId,
  diagnosisId: String(parsed.data.focusReportId),
});
```

Map `found` to `ready`. Map `unavailable`, `not_found`, and `read_failed` to the isolated `{ status: "unavailable", reportId }` result; do not throw away the aggregate snapshot. Only the aggregate RPC/query/schema failure becomes `ClientDashboardUnavailableError("client_dashboard_unavailable")`.

Recent-report mapping must use persisted summary fields and existing formatters. It must not parse or infer from a report snapshot.

- [ ] **Step 4: Run service, schema, filter, and report-read tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/get-client-dashboard.service.test.ts src/modules/client-dashboard/client-dashboard.schema.test.ts src/modules/client-dashboard/client-dashboard.filters.test.ts src/modules/reports/services/get-report.service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the server composition**

```bash
git add src/modules/client-dashboard/get-client-dashboard.service.ts src/modules/client-dashboard/get-client-dashboard.service.test.ts
git commit -m "feat: load client dashboard overview"
```

---

### Task 6: Add responsive URL-driven filters

**Files:**

- Create: `src/modules/client-dashboard/components/dashboard-filters.tsx`
- Create: `src/modules/client-dashboard/components/dashboard-filters.test.tsx`

**Interfaces:**

- Consumes: `ClientDashboardFilters`, `buildClientDashboardHref`, `nextCalendarDate`, `previousCalendarDate`, existing `Button`, `Checkbox`, `Input`, `Label`, `Popover`, `Sheet`, and `Select` components.
- Produces: `DashboardFilters({ filters }: { filters: ClientDashboardFilters })`.

- [ ] **Step 1: Write failing desktop and mobile filter tests**

Use `userEvent` with mocked `useRouter`. Verify visible labels, 44px control classes, submit navigation, `report` clearing on filter changes, active-chip removal, `Limpar filtros`, category-dependent scenarios, Service-only mode behavior, and that the `Dados incompletos` situation navigates with `dataState=pending` so explicitly partial reports are not lost.

Concrete navigation assertion:

```ts
await user.selectOptions(screen.getByLabelText("Categoria"), "product");
await user.selectOptions(screen.getByLabelText("Situação"), "loss");
await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));

expect(replace).toHaveBeenCalledWith(
  "/dashboard?category=product&verdict=direct_loss%2Coperational_loss",
  { scroll: false },
);
```

For dates, enter inclusive `Até = 30/09/2026` and assert the URL carries exclusive `to=2026-10-01`. Verify the active chip displays `Até 30/09/2026`, not the internal exclusive date.

- [ ] **Step 2: Run the filter component test and verify it fails**

Run:

```bash
pnpm test -- src/modules/client-dashboard/components/dashboard-filters.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement one field set rendered in desktop and mobile shells**

Create an internal `DashboardFilterFields` component used by the desktop filter card and mobile `Sheet`; do not duplicate option definitions. Present:

- `De` and `Até` date inputs;
- Category: Todos, Serviço, Produto, Produção;
- Modality: Todas, Rápido, Detalhado;
- Situation: Todas, Resultado positivo, Zero a zero, Com perda ou prejuízo, Mês sem vendas, Dados incompletos;
- Data state: Todos, Completos, Com dados pendentes;
- More filters: Scenario and Priority.

Map `Com perda ou prejuízo` to both loss verdicts. Map `Dados incompletos` to `dataState=pending`, not to a verdict-only conjunction, so reports with explicit `is_partial=true` remain included; keep the dedicated data-state control synchronized with that same query value. Never combine the two missing-data verdicts with `dataState=pending` as an `AND` filter. When Category is Service, remove `detailed` from local mode state and show only service scenarios. Disable submit while `router.replace` is pending and expose failures in `role="alert"`.

Active chips use `buildClientDashboardHref` patches and are ordinary links where possible. `Limpar filtros` navigates to `/dashboard`. The mobile trigger text is `Filtros` and its accessible name includes the active count when nonzero.

- [ ] **Step 4: Run the filter component and pure-filter tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/components/dashboard-filters.test.tsx src/modules/client-dashboard/client-dashboard.filters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the filters UI**

```bash
git add src/modules/client-dashboard/components/dashboard-filters.tsx src/modules/client-dashboard/components/dashboard-filters.test.tsx
git commit -m "feat: add dashboard report filters"
```

---

### Task 7: Render global metrics and accessible distributions

**Files:**

- Create: `src/modules/client-dashboard/components/client-dashboard-metric-grid.tsx`
- Create: `src/modules/client-dashboard/components/dashboard-distributions.tsx`
- Create: `src/modules/client-dashboard/components/dashboard-overview.test.tsx`

**Interfaces:**

- Consumes: `ClientDashboardViewModel`, current filters, `MetricCard`, `Card`, `Badge`, and `buildClientDashboardHref`.
- Produces: `ClientDashboardMetricGrid` and `DashboardDistributions`.

- [ ] **Step 1: Write failing metric-grid tests**

Assert the exact four labels and counts, without margin/status quality text:

```ts
expect(screen.getByText("Relatórios no recorte")).toBeVisible();
expect(screen.getByText("Com resultado positivo")).toBeVisible();
expect(screen.getByText("Com perda ou prejuízo")).toBeVisible();
expect(screen.getByText("Com dados pendentes")).toBeVisible();
expect(
  screen.queryByText(/na meta|margem boa|saudável/i),
).not.toBeInTheDocument();
```

Verify the three subset cards include named links that apply the exact verdict/data-state filters while preserving unrelated active filters.

- [ ] **Step 2: Write failing distribution tests**

Render nonzero and all-zero fixtures. Assert both regions have headings, every visible row has its label and formatted count, `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax` equal to the largest bucket, and a screen-reader summary that names all zero-filled states. Verify no value is available only through a tooltip.

- [ ] **Step 3: Run the overview tests and verify they fail**

Run:

```bash
pnpm test -- src/modules/client-dashboard/components/dashboard-overview.test.tsx
```

Expected: FAIL because the overview components do not exist.

- [ ] **Step 4: Implement the metric grid with existing MetricCard**

Use `Intl.NumberFormat("pt-BR")`, tabular numerals, four semantic icons, and `details` links instead of wrapping an interactive `MetricCard`. Grid classes must be `grid gap-4 md:grid-cols-2 xl:grid-cols-4`. Use descriptions that define the count, not quality:

- total: `Diagnósticos encontrados pelos filtros`;
- positive: `Relatórios cujo veredito foi resultado positivo`;
- loss: `Perda por venda ou prejuízo no cenário informado`;
- pending: `Preço, volume ou preenchimento pendente`.

- [ ] **Step 5: Implement distributions as text-first horizontal bars**

Render each distribution as a `<section>` containing a `<Card>`, `<ul>`, direct labels, counts, and a decorative width bar. Width is `0%` when the largest count is zero; otherwise `count / max * 100`. The list remains the accessible data representation, so do not add `role="img"` or hide labels.

Show only nonzero rows visually when the total is nonzero, but include one `.sr-only` sentence listing every verdict/priority and count. For an all-zero distribution, show `Nenhum diagnóstico neste recorte.` and keep the complete screen-reader summary.

- [ ] **Step 6: Run the overview component tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/components/dashboard-overview.test.tsx src/components/shared/metrics/metric-card.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the global overview UI**

```bash
git add src/modules/client-dashboard/components/client-dashboard-metric-grid.tsx src/modules/client-dashboard/components/dashboard-distributions.tsx src/modules/client-dashboard/components/dashboard-overview.test.tsx
git commit -m "feat: render dashboard report overview"
```

---

### Task 8: Render recent reports and the selected report facts

**Files:**

- Create: `src/modules/client-dashboard/components/dashboard-recent-reports.tsx`
- Create: `src/modules/client-dashboard/components/dashboard-report-focus.tsx`
- Create: `src/modules/client-dashboard/components/dashboard-report-focus.test.tsx`

**Interfaces:**

- Consumes: `ClientDashboardViewModel["recentReports"]`, `DashboardFocusLoad`, active filters, `buildClientDashboardHref`, `MetricCard`, report badges, and existing button/card primitives.
- Produces: `DashboardRecentReports` and `DashboardReportFocus`.

- [ ] **Step 1: Write failing recent-report tests**

Assert at most six list entries, newest-first fixture order, visible category/scenario/mode/date/verdict/priority/state, conditional result and margin, conditional item count, focus link preserving filters, and direct report link:

```ts
expect(
  screen.getByRole("link", { name: /Ver neste dashboard.*Produto/i }),
).toHaveAttribute("href", "/dashboard?category=product&report=42");
expect(
  screen.getByRole("link", { name: /Abrir relatório.*Produto/i }),
).toHaveAttribute("href", "/reports/42");
```

When result or margin is null, assert the row omits that financial field rather than showing zero.

- [ ] **Step 2: Write failing focus-panel tests**

For `ready`, assert explicit report identity, four financial metrics, supporting unavailable reasons, complementary facts, created/updated dates, verdict/priority, and `Abrir relatório completo`. For `none`, render nothing. For `unavailable`, assert an isolated explanatory card with `/reports/{id}` while overview headings outside this component remain unaffected in the integration fixture.

- [ ] **Step 3: Run the focus/recent tests and verify they fail**

Run:

```bash
pnpm test -- src/modules/client-dashboard/components/dashboard-report-focus.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 4: Implement compact recent-report articles**

Use a semantic `<ol aria-label="Relatórios recentes">`. Each `<li>` contains one article with badges, title, metadata, optional `<dl>` for result/margin, and the two actions. Use the selected report id to add visible text `Em foco`; do not rely only on border color.

The section heading is `Relatórios recentes`, with `Ver biblioteca completa` linking to `/reports`. Do not claim the dashboard filters carry into the library.

- [ ] **Step 5: Implement the focus panel from its prepared view model**

The component performs no snapshot inspection. Render:

1. eyebrow `Relatório em foco`;
2. report identity and persisted verdict/priority;
3. four `MetricCard` entries in `md:grid-cols-2 xl:grid-cols-4`;
4. complementary facts in a compact `<dl>` only when present;
5. limitation/supporting text next to the relevant value;
6. `Abrir relatório completo`.

Use neutral card styling for unavailable values. The discount limit must always display its warning that it is not a recommendation.

- [ ] **Step 6: Run focus, presenter, and recent-list tests**

Run:

```bash
pnpm test -- src/modules/client-dashboard/components/dashboard-report-focus.test.tsx src/modules/client-dashboard/to-dashboard-report-focus.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit report navigation and focus UI**

```bash
git add src/modules/client-dashboard/components/dashboard-recent-reports.tsx src/modules/client-dashboard/components/dashboard-report-focus.tsx src/modules/client-dashboard/components/dashboard-report-focus.test.tsx
git commit -m "feat: show dashboard report focus"
```

---

### Task 9: Compose the route, empty states, loading, error, and finish verification

**Files:**

- Create: `src/modules/client-dashboard/components/client-dashboard-empty-state.tsx`
- Create: `src/modules/client-dashboard/components/client-dashboard.tsx`
- Create: `src/modules/client-dashboard/components/client-dashboard.test.tsx`
- Replace: `src/app/(private)/dashboard/page.tsx`
- Create: `src/app/(private)/dashboard/page.test.tsx`
- Create: `src/app/(private)/dashboard/loading.tsx`
- Create: `src/app/(private)/dashboard/error.tsx`
- Modify only if implementation behavior changed: `PRODUCT.md`

**Interfaces:**

- Consumes: every earlier dashboard interface, `requireUser`, route `searchParams`, and existing app-shell behavior.
- Produces: complete `/dashboard` MVP with truthful empty/error/loading states.

- [ ] **Step 1: Write failing page orchestration tests**

Mock `requireUser`, `parseClientDashboardFilters`, and `getClientDashboard`. Assert:

```ts
expect(requireUser).toHaveBeenCalledOnce();
expect(getClientDashboard).toHaveBeenCalledWith({
  supabase,
  userId: "trusted-user",
  filters,
});
```

Add cases for valid search params, malformed params normalized by the parser, aggregate service failure rethrowing `client_dashboard_unavailable`, account with no reports, filtered-empty recorte, and ready focus composition.

- [ ] **Step 2: Write failing composition and state tests**

Assert the semantic order `header → filters → indicators → distributions → recent reports → report focus` using `compareDocumentPosition`. Assert:

- no-history state says `Crie seu primeiro diagnóstico` and omits filters/cards;
- filtered-empty state keeps filters, says `Nenhum relatório corresponde aos filtros selecionados`, and offers both `Limpar filtros` and `Novo diagnóstico`;
- populated state includes `Novo diagnóstico` and `Ver biblioteca completa`;
- the main grid uses `grid-cols-[minmax(0,1fr)]` to prevent tablet overflow;
- no static prototype values `28,4%`, `R$ 15,80`, `420`, or `R$ 6,20` remain.

- [ ] **Step 3: Run route and composition tests and verify they fail**

Run:

```bash
pnpm test -- src/app/'(private)'/dashboard/page.test.tsx src/modules/client-dashboard/components/client-dashboard.test.tsx
```

Expected: FAIL because the route is still the static four-card prototype and supporting components do not exist.

- [ ] **Step 4: Implement the empty states**

`ClientDashboardEmptyState` receives `kind: "no_history" | "no_results"` and renders distinct copy/actions:

```ts
const content = {
  no_history: {
    title: "Crie seu primeiro diagnóstico",
    body: "Salve um diagnóstico para acompanhar conclusões, prioridades e valores calculados pelo Lucrivo.",
    action: { label: "Criar primeiro diagnóstico", href: "/quick-diagnosis" },
  },
  no_results: {
    title: "Nenhum relatório corresponde aos filtros selecionados",
    body: "Altere ou limpe os filtros para voltar a ver seus diagnósticos.",
    action: { label: "Limpar filtros", href: "/dashboard" },
    secondaryAction: { label: "Novo diagnóstico", href: "/quick-diagnosis" },
  },
} as const;
```

- [ ] **Step 5: Implement the page composition component**

Use the established private-app visual language: max-width container, rounded bordered header, short plain-language description, and restrained background accent. The header copy is:

```text
Visão geral dos seus diagnósticos
Entenda as situações e prioridades dos relatórios que você salvou.
```

If `hasAnyReports=false`, render only header plus no-history state. If `hasAnyReports=true` and `metrics.totalReports=0`, render header, filters, and no-results state. Otherwise render every populated section in the approved order.

- [ ] **Step 6: Replace the route loader**

Implement:

```tsx
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const filters = parseClientDashboardFilters(await searchParams);
  const { userId, supabase } = await requireUser();
  const result = await getClientDashboard({ supabase, userId, filters });

  return (
    <ClientDashboard
      dashboard={result.dashboard}
      focus={result.focus}
      filters={filters}
    />
  );
}
```

Do not create another Supabase client or call `requireUser` inside the service.

- [ ] **Step 7: Implement accessible loading and error boundaries**

`loading.tsx` reserves the header, filter row, four-card grid, two distribution cards, recent list, and focus grid; add `aria-busy="true"`, `aria-label="Carregando visão geral dos diagnósticos"`, and a screen-reader status.

`error.tsx` is a client component with heading `Não foi possível carregar sua visão geral`, body that confirms reports remain saved, `Tentar novamente` calling `reset`, and `Novo diagnóstico` linking to `/quick-diagnosis`.

- [ ] **Step 8: Run the complete client-dashboard test set**

Run:

```bash
pnpm test -- src/modules/client-dashboard src/app/'(private)'/dashboard
```

Expected: PASS.

- [ ] **Step 9: Run report and shared-component regressions**

Run:

```bash
pnpm test -- src/modules/reports src/components/shared/metrics/metric-card.test.tsx src/app/'(private)'/reports
```

Expected: PASS.

- [ ] **Step 10: Run repository-wide static verification**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
git diff --check
```

Expected: every command exits zero.

- [ ] **Step 11: Run the Impeccable mechanical detector once**

Run after all UI edits are complete, not earlier:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/app/'(private)'/dashboard src/modules/client-dashboard
```

Fix mechanical findings in one batch, then rerun only the affected tests and static checks. Do not run the detector a second time.

- [ ] **Step 12: Inspect desktop and mobile in one bounded visual pass**

Start the app with `pnpm dev`, capture screenshots at 1440px and 390px, and inspect four seeded states: no history, mixed history, filtered empty, and partial report focus. Verify no horizontal overflow, filter sheet keyboard behavior, visible focus, 44px targets, direct count labels, unavailable reasons, and that color is never the sole state signal. Apply one batched correction and perform one confirmation pass only; keep the screenshots as review artifacts outside the application source tree.

- [ ] **Step 13: Update durable product documentation only if shipped behavior differs**

Compare the completed page with `PRODUCT.md`. The current product already states that the dashboard KPI redesign is pending; remove or update only statements contradicted by the shipped implementation. Do not add aspirational chart, AI, or comparison capabilities.

- [ ] **Step 14: Run the full project check**

Run:

```bash
pnpm check
```

Expected: tests, typecheck, lint, and format checks all pass.

- [ ] **Step 15: Commit the integrated dashboard**

```bash
git add src/app/'(private)'/dashboard src/modules/client-dashboard PRODUCT.md
git commit -m "feat: replace client dashboard prototype"
```

If `PRODUCT.md` did not require a change, omit it from `git add`.

---

## Completion Checklist

- [ ] The database RPC and generated types are versioned and tested.
- [ ] RLS and function privileges prevent cross-user and service-role reads.
- [ ] Every filter changes metrics, distributions, focus selection, and recent reports consistently.
- [ ] `hasAnyReports` distinguishes first-run from filtered-empty state without another query.
- [ ] All global values are counts; no mixed-report financial aggregation exists.
- [ ] The focus panel uses exactly one validated snapshot and existing report presenters.
- [ ] Partial and legacy reports do not become zero or crash the overview.
- [ ] The static prototype metrics and margin-evolution implication are gone.
- [ ] Desktop/mobile accessibility and overflow checks pass.
- [ ] SQL, unit, component, route, report-regression, and full project checks pass.
