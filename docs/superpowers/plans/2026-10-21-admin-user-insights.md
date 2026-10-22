# Admin User Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a reliable, insight-rich `/admin/users` detail experience, administrative pagination totals, courtesy presets, and removal of the redundant subscriptions page.

**Architecture:** New MFA-protected Supabase RPC versions expose narrow profile, diagnosis, subscription, timeline, and page-count projections without relying on target-user RLS. Strict Zod contracts and focused React renderers replace the current generic item shape; a shared admin pagination component serves only users and onboarding contacts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Supabase/Postgres, pgTAP, Vitest, Testing Library, Tailwind CSS 4 and existing shadcn/Base UI primitives.

**Spec:** `docs/superpowers/specs/2026-10-21-admin-user-insights-design.md`

## Global Constraints

- All admin reads and mutations require `requireAdmin()` in the application and `private.has_admin_access()` in the database.
- Blocked and soft-deleted clients remain denied from their own account but inspectable by the AAL2 administrator.
- Never expose raw report snapshots, AI prompt/answer content, provider identifiers, checkout URLs, webhook payloads or WhatsApp numbers from the user-detail RPCs.
- Portuguese is mandatory for presented enum values and UI copy; dates use `America/Sao_Paulo`, customer money uses BRL and AI estimates use USD.
- Unknown enum values fail schema validation; unknown AI price models keep token totals but return no partial cost estimate.
- Only `/admin/users` and admin onboarding contacts receive total/page pagination in this branch.
- `/admin/subscriptions` is deleted without a redirect; aggregate dashboard subscription widgets remain.
- Create every migration with `pnpm exec supabase migration new <name>` and edit only the emitted file. Do not run `supabase db reset` against the existing local database.
- pgTAP fixtures run inside `begin; ... rollback;` and must restore/retain trigger behavior.
- Use TDD for each checkpoint and commit only the files listed by that task.

---

## File map and interfaces

- CLI-generated `supabase/migrations/*_admin_user_insights_reads.sql` owns `list_admin_users_v2` and `get_admin_user_v2`.
- CLI-generated `supabase/migrations/*_admin_user_detail_collections.sql` owns `list_admin_user_diagnoses_v2` and `list_admin_user_subscriptions_v2`.
- CLI-generated `supabase/migrations/*_admin_user_timeline.sql` owns `list_admin_user_history_v2` and its bounded source projections.
- CLI-generated `supabase/migrations/*_admin_user_courtesy_presets.sql` owns `change_admin_user_v2`.
- CLI-generated `supabase/migrations/*_admin_onboarding_page_counts.sql` owns `list_admin_onboarding_contacts_v2`.
- `src/modules/admin/admin-page.ts` defines the reusable `AdminPage<T>` contract; `src/components/admin/admin-pagination.tsx` renders it.
- `src/modules/admin/users/admin-users.schema.ts` owns strict wire schemas and inferred admin-user types.
- `src/modules/admin/users/admin-users.formatters.ts` owns translated labels and value formatting.
- `src/modules/admin/users/report-ai-cost.ts` owns the immutable `gpt-6-luna` price catalog and USD estimator.
- `src/modules/admin/users/get-admin-users.service.ts` is the sole server read adapter for the user list/detail tabs.
- Focused components `admin-user-profile.tsx`, `admin-user-diagnoses.tsx`, `admin-user-subscriptions.tsx` and `admin-user-history.tsx` render typed tab models; `admin-user-detail.tsx` owns only the shell and tab routing.
- Existing onboarding filters/services/components switch from cursor to `page` while retaining the same authorized filter set.

### Shared page contract

```ts
type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: 20;
  totalCount: number;
  totalPages: number;
};
```

### Detail collection contract

Detail tabs keep bounded cursor pagination because the total/page requirement is
limited to administrative tables. Each collection returns:

```ts
type AdminCursorPage<T> = {
  items: T[];
  nextCursor: { createdAt: string; id: string } | null;
};
```

---

### Task 1: Add v2 user list and profile projections

**Files:**
- Create via CLI: `supabase/migrations/*_admin_user_insights_reads.sql`
- Modify: `supabase/tests/admin_user_reads.test.sql`

**Interfaces:**
- Produces `public.list_admin_users_v2(text,text,text,integer,integer) -> jsonb`.
- Produces `public.get_admin_user_v2(uuid) -> jsonb`.
- The list JSON is `{items,page,pageSize,totalCount,totalPages}`; detail adds `fullName`, `onboardingCompletedAt`, `segment` and `subcategory` to the existing identity/access fields.

- [ ] **Step 1: Extend pgTAP with failing v2 authorization, pagination and blocked-target assertions**

Add v2 function-existence/grant assertions, onboarding fixtures, and checks equivalent to:

```sql
select has_function(
  'public', 'list_admin_users_v2',
  array['text','text','text','integer','integer'],
  'page-number admin user list exists'
);
select has_function(
  'public', 'get_admin_user_v2', array['uuid'],
  'profile-aware admin user detail exists'
);

select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 1, 1
  ) ->> 'totalCount',
  '3',
  'filtered result exposes an exact total'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 2, 1
  ) #>> '{items,0,email}',
  'newer@admin-read-fixture.test',
  'page two is deterministic'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) ->> 'state',
  'blocked',
  'administrator can inspect a blocked target'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) ->> 'fullName',
  'Cliente Bloqueado',
  'detail includes the onboarding name'
);
```

Also assert ordinary authenticated users, AAL1 admins, `anon`, and
`service_role` cannot bypass the intended entrypoint.

- [ ] **Step 2: Run the focused database test and confirm the v2 functions are missing**

Run:

```bash
pnpm exec supabase test db supabase/tests/admin_user_reads.test.sql --local
```

Expected: FAIL on `list_admin_users_v2` / `get_admin_user_v2` existence.

- [ ] **Step 3: Create the migration and implement the projections**

Run:

```bash
pnpm exec supabase migration new admin_user_insights_reads
```

In the emitted migration, use stable security-definer functions with
`set search_path = ''`. Both begin with:

```sql
if not coalesce((select private.has_admin_access()), false) then
  raise exception using errcode = '42501',
    message = 'administrator access required';
end if;
```

For `list_admin_users_v2`, validate `p_page >= 1`, cap `p_page_size` to 50,
materialize the filtered authorized projection once, compute
`count(*)`, and page with:

```sql
order by projected.created_at desc, projected.id desc
limit page_size
offset (p_page - 1) * page_size
```

Return exact integer metadata:

```sql
pg_catalog.jsonb_build_object(
  'items', coalesce(items_json, '[]'::jsonb),
  'page', p_page,
  'pageSize', page_size,
  'totalCount', total_count,
  'totalPages', case
    when total_count = 0 then 0
    else pg_catalog.ceil(total_count::numeric / page_size)::integer
  end
)
```

For `get_admin_user_v2`, left join `public.onboarding_profiles`,
`public.business_segments` and `public.business_subcategories`. Build nullable
objects rather than returning raw columns:

```sql
'fullName', profile.full_name,
'onboardingCompletedAt', profile.completed_at,
'segment', case when segment.id is null then null else
  pg_catalog.jsonb_build_object('id', segment.id, 'name', segment.name)
end,
'subcategory', case when profile.user_id is null then null else
  pg_catalog.jsonb_build_object(
    'id', subcategory.id,
    'name', coalesce(subcategory.name, 'Outro'),
    'customName', case when subcategory.id is null
      then profile.custom_subcategory else null end
  )
end
```

Revoke from `public, anon, authenticated, service_role`, then grant execute only
to `authenticated`. Keep v1 callable during the database-first rollout so the
currently deployed application remains compatible. Its post-deployment cleanup
is recorded in the runbook in Task 9 and happens only after production is known
to call v2.

- [ ] **Step 4: Apply the migration and rerun the database test**

Run:

```bash
pnpm exec supabase migration up --local
pnpm exec supabase test db supabase/tests/admin_user_reads.test.sql --local
```

Expected: PASS, including blocked and soft-deleted detail reads.

- [ ] **Step 5: Commit the database checkpoint**

```bash
git add supabase/migrations supabase/tests/admin_user_reads.test.sql
git commit -m "feat: add admin user insight projections"
```

---

### Task 2: Add diagnosis and subscription detail RPCs

**Files:**
- Create via CLI: `supabase/migrations/*_admin_user_detail_collections.sql`
- Modify: `supabase/tests/admin_user_reads.test.sql`

**Interfaces:**
- Produces `public.list_admin_user_diagnoses_v2(uuid,timestamptz,text,integer) -> jsonb`.
- Produces `public.list_admin_user_subscriptions_v2(uuid,timestamptz,uuid,integer) -> jsonb`.
- Both return `AdminCursorPage<T>` and authorize the admin independently of target eligibility.

- [ ] **Step 1: Add failing diagnosis, AI aggregation and billing-shape tests**

Create active, blocked and deleted fixture targets with quick/detailed diagnoses,
completed/failed AI turns, contracts, payments and a refund request. Assert:

```sql
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) #>> '{items,0,analysisMode}',
  'detailed',
  'blocked target diagnoses remain inspectable'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) #>> '{items,0,aiUsage,completedTurns}',
  '2',
  'completed AI turns are aggregated per report version'
);
select is(
  public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000004', null, null, 20
  ) #>> '{items,0,refund,status}',
  'confirmed',
  'deleted target billing history remains inspectable'
);
```

Assert the diagnosis payload omits `report_snapshot`, `question`, `answer` and
provider IDs by testing `not (payload::text ~ 'reportSnapshot|question|answer|asaas')`.

- [ ] **Step 2: Run the test and confirm missing collection RPCs**

```bash
pnpm exec supabase test db supabase/tests/admin_user_reads.test.sql --local
```

Expected: FAIL on the two new function checks.

- [ ] **Step 3: Implement bounded typed projections**

Run:

```bash
pnpm exec supabase migration new admin_user_detail_collections
```

`list_admin_user_diagnoses_v2` selects only:

```sql
diagnosis.id,
diagnosis.created_at,
diagnosis.updated_at,
diagnosis.deleted_at,
diagnosis.version,
diagnosis.business_category,
diagnosis.scenario,
diagnosis.analysis_mode,
diagnosis.is_free_report,
diagnosis.current_price_cents,
diagnosis.real_margin_basis_points,
diagnosis.unit_profit_cents,
diagnosis.monthly_gross_revenue_cents,
diagnosis.monthly_result_cents,
diagnosis.item_count,
diagnosis.is_partial,
diagnosis.verdict,
diagnosis.priority
```

Aggregate AI per `(diagnosis_id, report_version, model)` using completed turns;
emit totals plus model buckets:

```json
{
  "completedTurns": 2,
  "failedTurns": 1,
  "inputTokens": 1200,
  "cachedInputTokens": 300,
  "outputTokens": 450,
  "lastUsedAt": "2026-10-21T12:00:00+00:00",
  "models": [
    {
      "model": "gpt-6-luna",
      "inputTokens": 1200,
      "cachedInputTokens": 300,
      "outputTokens": 450
    }
  ]
}
```

Return `aiUsage: null` when no turn exists. Count failed turns separately and
never add their nullable token columns.

`list_admin_user_subscriptions_v2` returns contract commercial fields, access
interval, cancellation timestamps, a payment summary (`confirmedCount`,
`receivedCents`, `lastPaymentAt`) and nullable refund summary (`status`,
`requestedAt`, `refundConfirmedAt`). Never return `external_reference` or any
`asaas_*` column.

- [ ] **Step 4: Apply and verify the collection RPCs**

```bash
pnpm exec supabase migration up --local
pnpm exec supabase test db supabase/tests/admin_user_reads.test.sql --local
```

Expected: PASS with deterministic cursor boundaries and all three target states.

- [ ] **Step 5: Commit the collection checkpoint**

```bash
git add supabase/migrations supabase/tests/admin_user_reads.test.sql
git commit -m "feat: expose admin diagnosis and subscription insights"
```

---

### Task 3: Add the unified user timeline RPC

**Files:**
- Create via CLI: `supabase/migrations/*_admin_user_timeline.sql`
- Create: `supabase/tests/admin_user_timeline.test.sql`

**Interfaces:**
- Produces `public.list_admin_user_history_v2(uuid,timestamptz,text,integer) -> jsonb`.
- Returns `AdminCursorPage<AdminUserHistoryEvent>` ordered by `occurredAt desc, eventKey desc`.
- Normalizes legacy administrative event state into a typed `changes` array.

- [ ] **Step 1: Write failing pgTAP fixtures for every canonical event family**

Build one user timeline containing registration, onboarding/profile update,
consent, quick and detailed diagnoses, first recurring payment, later recurring
payment, semiannual installment, cancellation, expiry, refund, chargeback and an
administrative event whose states are deliberately partial:

```sql
insert into private.admin_user_events (
  user_id, actor_id, action, reason, before_state, after_state, created_at
) values (
  '96400000-0000-4000-8000-000000000002',
  '96400000-0000-4000-8000-000000000001',
  'blocked',
  'fixture with legacy state',
  '{}'::jsonb,
  '{"action":"blocked","sequence":3}'::jsonb,
  '2026-10-20T12:00:00Z'
);
```

Assert the normalized result is valid and no duplicate business transition is
emitted:

```sql
create temporary table admin_timeline_payload (payload jsonb not null)
on commit drop;

insert into admin_timeline_payload (payload)
select public.list_admin_user_history_v2(
  '96400000-0000-4000-8000-000000000002', null, null, 50
);

select is(
  (
    select item ->> 'kind'
    from admin_timeline_payload,
      jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'admin_blocked'
  ),
  'admin_blocked',
  'legacy partial state produces a valid admin event'
);
select is(
  (
    select item #>> '{payload,changes}'
    from admin_timeline_payload,
      jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'admin_blocked'
  ),
  '[]',
  'missing legacy before/after keys normalize to no state changes'
);
select is(
  (
    select count(*)::text
    from admin_timeline_payload,
      jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'subscription_renewed'
  ),
  '1',
  'only later recurring monthly payments are renewals'
);
select is(
  (
    select count(*)::text
    from admin_timeline_payload,
      jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'subscription_expired'
  ),
  '1',
  'only already-ended access emits expiration'
);
```

- [ ] **Step 2: Run the new test and confirm the timeline function is absent**

```bash
pnpm exec supabase test db supabase/tests/admin_user_timeline.test.sql --local
```

Expected: FAIL on `list_admin_user_history_v2` existence.

- [ ] **Step 3: Implement the normalized `union all` event stream**

Run:

```bash
pnpm exec supabase migration new admin_user_timeline
```

Use a bounded `events` CTE with these exact `kind` values:

```text
account_registered
onboarding_completed
profile_updated
whatsapp_consent_granted
whatsapp_consent_declined
whatsapp_consent_revoked
diagnosis_created
subscription_created
subscription_activated
subscription_renewed
cancellation_requested
cancellation_confirmed
subscription_expired
refund_requested
refund_confirmed
payment_failed
payment_refunded
payment_chargeback
admin_courtesy_granted
admin_courtesy_ended
admin_blocked
admin_unblocked
admin_soft_deleted
admin_restored
```

Create deterministic keys such as `diagnosis:<id>`,
`payment:<id>:renewed`, `contract:<id>:expired` and `admin:<id>`. Determine
renewal with `row_number() over (partition by contract.id order by
coalesce(payment.confirmed_at,payment.received_at),payment.id)` and restrict it
to `billing_mode = 'monthly' and charge_type = 'recurring' and position > 1`.

Normalize admin state without assuming seed JSON shape. Build the array with a
lateral `values` relation so absent keys never leave null array elements:

```sql
'changes', (
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'field', change.field,
        'before', change.before_value,
        'after', change.after_value
      ) order by change.field
    ) filter (where change.included),
    '[]'::jsonb
  )
  from (
    values
      ('blockedAt'::text, event.before_state -> 'blockedAt',
       event.after_state -> 'blockedAt',
       event.before_state ? 'blockedAt' or event.after_state ? 'blockedAt'),
      ('deletedAt'::text, event.before_state -> 'deletedAt',
       event.after_state -> 'deletedAt',
       event.before_state ? 'deletedAt' or event.after_state ? 'deletedAt'),
      ('courtesyExpiresAt'::text,
       event.before_state -> 'courtesyExpiresAt',
       event.after_state -> 'courtesyExpiresAt',
       event.before_state ? 'courtesyExpiresAt'
         or event.after_state ? 'courtesyExpiresAt')
  ) as change(field, before_value, after_value, included)
)
```

For diagnosis events, reuse the per-model AI aggregation shape from Task 2. For
expiration, require `access_ends_at <= statement_timestamp()` and a state in
`expired`, `canceled`, `refunded` or `chargeback`. Paginate the final stream with
the existing `{createdAt,id}` cursor shape, mapping `createdAt` to `occurredAt`
and `id` to `eventKey`.

- [ ] **Step 4: Apply, test and inspect the seeded blocked account**

```bash
pnpm exec supabase migration up --local
pnpm exec supabase test db supabase/tests/admin_user_timeline.test.sql --local
```

Then execute the RPC as the AAL2 seed administrator for one seeded blocked user
and verify the response includes its legacy admin event instead of raising a
shape error. Do not log email, WhatsApp or AI content.

- [ ] **Step 5: Commit the timeline checkpoint**

```bash
git add supabase/migrations supabase/tests/admin_user_timeline.test.sql
git commit -m "feat: add unified admin user timeline"
```

---

### Task 4: Build strict application contracts and AI cost estimation

**Files:**
- Create: `src/modules/admin/admin-page.ts`
- Create: `src/modules/admin/admin-page.test.ts`
- Create: `src/modules/admin/users/report-ai-cost.ts`
- Create: `src/modules/admin/users/report-ai-cost.test.ts`
- Modify: `src/modules/admin/users/admin-users.schema.ts`
- Modify: `src/modules/admin/users/admin-users.schema.test.ts`
- Modify: `src/modules/admin/users/admin-users.urls.ts`
- Modify: `src/modules/admin/users/admin-user-filter-cookie.ts`
- Modify: `src/modules/admin/users/admin-user-filter-cookie.test.ts`
- Modify: `src/modules/admin/users/get-admin-users.service.ts`
- Modify: `src/modules/admin/users/get-admin-users.service.test.ts`

**Interfaces:**
- Produces `adminPageSchema<T extends z.ZodTypeAny>(item: T)` and `AdminPage<T>`.
- Produces `estimateAiUsage(models: AiModelUsage[]): AiCostEstimate | null`.
- Produces strict `AdminUserDiagnosis`, `AdminUserSubscription` and `AdminUserHistoryEvent` types.
- `AdminUserFilters` replaces `cursor/back` with one-based `page`.

- [ ] **Step 1: Write failing schema, URL, service and price tests**

Use exact cost expectations based on nano-USD integers:

```ts
expect(
  estimateAiUsage([
    {
      model: "gpt-6-luna",
      inputTokens: 1_000_000,
      cachedInputTokens: 200_000,
      outputTokens: 100_000,
    },
  ]),
).toEqual({
  nanoUsd: 132_000_000,
  priceVersion: "openai-standard-2026-10-21",
});

expect(
  estimateAiUsage([
    { model: "unknown", inputTokens: 10, cachedInputTokens: 0, outputTokens: 5 },
  ]),
).toBeNull();
```

The first result is `800,000 * 100 + 200,000 * 10 + 100,000 * 500`
nano-USD. Also test `cachedInputTokens > inputTokens` clamps uncached input to
zero without producing a negative cost.

For filters, assert:

```ts
expect(parseFilters({ page: "3", q: "ana" })).toMatchObject({ page: 3, q: "ana" });
expect(parseFilters({ page: "0" }).page).toBe(1);
expect(listUrl(parseFilters({ state: "blocked", page: "2" }))).toBe(
  "/admin/users?state=blocked&page=2",
);
```

Service tests must expect calls to `list_admin_users_v2`, `get_admin_user_v2`,
`list_admin_user_diagnoses_v2`, `list_admin_user_subscriptions_v2` and
`list_admin_user_history_v2`. Add a regression fixture with an admin history
event whose `changes` is `[]`; it must parse successfully. Spy on
`console.error` for a failed RPC and assert only `{event, rpc, code}` is logged,
without query data, target identity or database message.

- [ ] **Step 2: Run the focused unit tests and confirm contract failures**

```bash
pnpm vitest run \
  src/modules/admin/admin-page.test.ts \
  src/modules/admin/users/report-ai-cost.test.ts \
  src/modules/admin/users/admin-users.schema.test.ts \
  src/modules/admin/users/admin-user-filter-cookie.test.ts \
  src/modules/admin/users/get-admin-users.service.test.ts
```

Expected: FAIL because the new helpers/types and v2 service calls do not exist.

- [ ] **Step 3: Implement generic page schema and numeric URL state**

`admin-page.ts` exports:

```ts
import { z } from "zod";

const pageNumberSchema = z.number().int().positive();

function adminPageSchema<T extends z.ZodType>(item: T) {
  return z
    .object({
      items: z.array(item),
      page: pageNumberSchema,
      pageSize: z.literal(20),
      totalCount: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    })
    .strict()
    .refine(
      (value) =>
        value.totalPages === Math.ceil(value.totalCount / value.pageSize),
      { message: "Inconsistent administrative page totals" },
    );
}

type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: 20;
  totalCount: number;
  totalPages: number;
};

export { adminPageSchema, pageNumberSchema, type AdminPage };
```

Allow `page: 1` when `totalPages: 0`; page is the requested one-based page, not
the count of available pages. Replace cursor encoders and the `back` stack in
the user-list URL contract with `parsePage`, and ensure every changed filter
sets page back to 1 by omitting it from the URL.

- [ ] **Step 4: Implement strict detail schemas and v2 service dispatch**

Define common bounded schemas and discriminated history event variants. The
admin-action payload is:

```ts
const adminStateChangeSchema = z
  .object({
    field: z.enum(["blockedAt", "deletedAt", "courtesyExpiresAt"]),
    before: isoDateTimeSchema.nullable(),
    after: isoDateTimeSchema.nullable(),
  })
  .strict();

const adminActionEventSchema = historyBaseSchema.extend({
  kind: z.enum([
    "admin_courtesy_granted",
    "admin_courtesy_ended",
    "admin_blocked",
    "admin_unblocked",
    "admin_soft_deleted",
    "admin_restored",
  ]),
  payload: z
    .object({
      actorEmail: z.string().min(1),
      reason: z.string().min(1).max(500),
      changes: z.array(adminStateChangeSchema).max(3),
    })
    .strict(),
});
```

Define equally strict diagnosis, account/onboarding, consent and billing event
payloads with only the fields emitted in Tasks 2–3. Replace
`Record<string, unknown>` with inferred union types throughout the service.

Use one service method per RPC:

```ts
getAdminUsers(filters)
getAdminUser(userId)
getAdminUserDiagnoses(userId, cursor?)
getAdminUserSubscriptions(userId, cursor?)
getAdminUserHistory(userId, cursor?)
```

Every method calls `requireAdmin()` before its RPC and throws
`AdminUsersUnavailableError` on a Supabase error or failed strict parse. Before
throwing, log only a bounded server-side diagnostic:

```ts
console.error({
  event: "admin_user_read_failed",
  rpc: rpcName,
  code: error?.code ?? "invalid_response",
});
```

For cursors, diagnoses require a decimal ID, subscriptions require a UUID, and
history accepts a bounded non-empty event key; invalid cursors normalize to the
first collection page before the RPC call.

- [ ] **Step 5: Implement the immutable nano-USD estimator**

Use exact per-token rates:

```ts
const AI_PRICE_CATALOG = {
  "gpt-6-luna": {
    version: "openai-standard-2026-10-21",
    source: "https://developers.openai.com/api/docs/pricing",
    inputNanoUsdPerToken: 100,
    cachedInputNanoUsdPerToken: 10,
    outputNanoUsdPerToken: 500,
  },
} as const;
```

Reject non-safe integers and return `null` for any unknown model. Sum each model
bucket only after all buckets are priceable, preventing a misleading partial
aggregate. Export a formatter that produces Portuguese USD copy with up to nine
fraction digits and the label `Estimativa pelos preços de 21/10/2026`.

- [ ] **Step 6: Run tests and regenerate types**

After the application service no longer calls v1 reads, verify that with:

```bash
rg -n "list_admin_users_v1|get_admin_user_v1|list_admin_user_items_v1" src
```

Expected: no matches. Do not revoke v1 in the same database-first release
because the currently deployed application may still call it. Then run:

```bash
pnpm vitest run \
  src/modules/admin/admin-page.test.ts \
  src/modules/admin/users/report-ai-cost.test.ts \
  src/modules/admin/users/admin-users.schema.test.ts \
  src/modules/admin/users/admin-user-filter-cookie.test.ts \
  src/modules/admin/users/get-admin-users.service.test.ts
pnpm supabase:types
pnpm typecheck
```

Expected: all focused tests and typecheck PASS.

- [ ] **Step 7: Commit the application-contract checkpoint**

```bash
git add src/modules/admin src/infrastructure/database/supabase/database.types.ts supabase/migrations
git commit -m "refactor: type admin user insight reads"
```

---

### Task 5: Redesign the user detail tabs

**Files:**
- Create: `src/modules/admin/users/components/admin-user-profile.tsx`
- Create: `src/modules/admin/users/components/admin-user-diagnoses.tsx`
- Create: `src/modules/admin/users/components/admin-user-subscriptions.tsx`
- Create: `src/modules/admin/users/components/admin-user-history.tsx`
- Create matching tests beside each component
- Modify: `src/modules/admin/users/components/admin-user-detail.tsx`
- Modify: `src/modules/admin/users/components/admin-user-detail.test.tsx`
- Modify: `src/modules/admin/users/admin-users.formatters.ts`
- Modify: `src/modules/admin/users/admin-users.formatters.test.ts`
- Modify: `src/app/(admin-panel)/admin/users/[userId]/page.tsx`
- Modify: `src/app/(admin-panel)/admin/users/[userId]/page.test.tsx`

**Interfaces:**
- Consumes all strict types and service methods from Task 4.
- Produces focused, responsive tab renderers with no generic item casting.

- [ ] **Step 1: Write failing component tests for approved content**

Cover at least these observable expectations:

```tsx
expect(screen.getByRole("heading", { name: "Ana Pereira" })).toBeVisible();
expect(screen.getByText("ana@example.com")).toBeVisible();
expect(screen.getByText("Nome ainda não informado")).toBeVisible();

expect(screen.getByText("Diagnóstico de Produto")).toBeVisible();
expect(screen.getByText("Revenda · Detalhado")).toBeVisible();
expect(screen.getByText("Resultado positivo")).toBeVisible();
expect(screen.getByText("Avaliar margem")).toBeVisible();
expect(screen.getByText(/1.650 tokens de entrada/)).toBeVisible();
expect(screen.getByText(/Estimativa pelos preços de 21\/10\/2026/)).toBeVisible();

expect(screen.getByText("Acesso vigente")).toBeVisible();
expect(screen.getByText("Reembolsada")).toBeVisible();
expect(screen.getByText("Cartão de crédito")).toBeVisible();

expect(screen.getByText("Usuário bloqueado")).toBeVisible();
expect(screen.getByText("fixture with legacy state")).toBeVisible();
```

Also assert semantic badges contain text, tabs retain `aria-selected`, long
identity text is not placed in fixed-width containers, and cursor links preserve
`from` plus the current tab.

- [ ] **Step 2: Run the focused component tests and confirm failures**

```bash
pnpm vitest run src/modules/admin/users/components src/app/\(admin-panel\)/admin/users/\[userId\]/page.test.tsx
```

Expected: FAIL because focused components and new content do not exist.

- [ ] **Step 3: Extract shared presentation formatters**

Reuse `presentCategory`, `presentAnalysisMode`, `presentVerdict`,
`presentPriority` and `formatReportScenario` instead of duplicating English-key
maps. Add exhaustive maps for contract/payment/admin event statuses. Use a
`never` exhaustiveness helper so a new validated enum fails compilation until it
receives Portuguese copy.

- [ ] **Step 4: Implement profile and diagnoses renderers**

`AdminUserProfile` renders the four approved groups and always includes `Nome`.
`AdminUserDiagnoses` renders mode-specific financial facts, lifecycle state and
AI usage. Its cost view is:

```tsx
{diagnosis.aiUsage ? (
  <div aria-label="Uso de inteligência artificial">
    <p>{diagnosis.aiUsage.completedTurns} interações concluídas</p>
    <p>{formatInteger(diagnosis.aiUsage.inputTokens)} tokens de entrada</p>
    <p>{formatInteger(diagnosis.aiUsage.cachedInputTokens)} em cache</p>
    <p>{formatInteger(diagnosis.aiUsage.outputTokens)} tokens de saída</p>
    <p>{cost ? formatAiCost(cost) : "Estimativa indisponível"}</p>
  </div>
) : (
  <p>IA não utilizada neste relatório</p>
)}
```

Use semantic badges for verdict and data state; never print raw keys.

- [ ] **Step 5: Implement subscription summary and history timeline**

`AdminUserSubscriptions` leads with current access and maps every contract state
to semantic badge tone plus text. `AdminUserHistory` uses an exhaustive switch
on `event.kind` and renders account, product, billing and admin facts as a
vertical timeline. For `diagnosis_created`, include quick/detailed label and the
same compact AI summary used by the diagnosis renderer.

- [ ] **Step 6: Simplify the shell and page data dispatch**

`AdminUserDetail` keeps header, actions, tab navigation and selected child only.
The page calls exactly one collection service for the active non-profile tab:

```ts
const items =
  tab === "diagnoses"
    ? await getAdminUserDiagnoses(userId, cursor)
    : tab === "subscription"
      ? await getAdminUserSubscriptions(userId, cursor)
      : tab === "history"
        ? await getAdminUserHistory(userId, cursor)
        : null;
```

Use `user.fullName ?? user.email` as the header title and show email beneath it
when a name exists.

- [ ] **Step 7: Run detail tests and commit**

```bash
pnpm vitest run src/modules/admin/users/components src/modules/admin/users/admin-users.formatters.test.ts src/app/\(admin-panel\)/admin/users/\[userId\]/page.test.tsx
pnpm typecheck
git add src/modules/admin/users src/app/\(admin-panel\)/admin/users/\[userId\]
git commit -m "feat: enrich admin user detail tabs"
```

Expected: tests and typecheck PASS.

---

### Task 6: Add server-authoritative courtesy presets

**Files:**
- Create via CLI: `supabase/migrations/*_admin_user_courtesy_presets.sql`
- Modify: `supabase/tests/admin_user_mutations.test.sql`
- Modify: `src/modules/admin/users/admin-users.schema.ts`
- Modify: `src/modules/admin/users/change-admin-user.action.ts`
- Modify: `src/modules/admin/users/change-admin-user.action.test.ts`
- Modify: `src/modules/admin/users/components/admin-user-actions.tsx`
- Modify: `src/modules/admin/users/components/admin-user-actions.test.tsx`

**Interfaces:**
- Produces `public.change_admin_user_v2(uuid,text,text,integer,timestamptz,bigint) -> jsonb`.
- Courtesy grants accept exactly one of `p_courtesy_duration_days in (1,7,30)` or `p_courtesy_expires_at`; other actions accept neither.
- A successful server action returns `{status:"updated",version,courtesyExpiresAt}` using the database-returned state.

- [ ] **Step 1: Add failing database tests for preset authority**

Capture comparisons around the call with `clock_timestamp()` bounds and assert:

```sql
create temporary table courtesy_preset_window (
  before_at timestamptz not null,
  result jsonb not null,
  after_at timestamptz not null
) on commit drop;

insert into courtesy_preset_window (before_at, result, after_at)
select
  pg_catalog.clock_timestamp(),
  public.change_admin_user_v2(
    '96300000-0000-4000-8000-000000000002',
    'courtesy_granted',
    'sete dias',
    7,
    null,
    0
  ),
  pg_catalog.clock_timestamp();

select ok(
  (
    select state.courtesy_expires_at
      between window.before_at + interval '7 days'
          and window.after_at + interval '7 days'
    from private.admin_user_state as state
    cross join courtesy_preset_window as window
    where state.user_id = '96300000-0000-4000-8000-000000000002'
  ),
  'seven-day preset is derived at confirmation time'
);
```

Assert 0, 2 and 31 days fail with SQLSTATE `22023`; passing both duration and
absolute timestamp fails; custom future timestamp succeeds; non-courtesy actions
reject either expiry field; auditing and optimistic concurrency remain atomic.

- [ ] **Step 2: Run pgTAP and confirm v2 is absent**

```bash
pnpm exec supabase test db supabase/tests/admin_user_mutations.test.sql --local
```

Expected: FAIL on `change_admin_user_v2` existence.

- [ ] **Step 3: Implement `change_admin_user_v2`**

Create it from the verified v1 transaction, changing only expiry input
validation and derivation:

```sql
if p_action = 'courtesy_granted' then
  if (p_courtesy_duration_days is null)
       = (p_courtesy_expires_at is null)
    or (
      p_courtesy_duration_days is not null
      and p_courtesy_duration_days not in (1, 7, 30)
    )
  then
    raise exception using errcode = '22023',
      message = 'invalid administrative user change';
  end if;

  next_courtesy_expires_at := coalesce(
    change_at + pg_catalog.make_interval(days => p_courtesy_duration_days),
    p_courtesy_expires_at
  );
else
  if p_courtesy_duration_days is not null
     or p_courtesy_expires_at is not null then
    raise exception using errcode = '22023',
      message = 'invalid administrative user change';
  end if;
end if;
```

Keep the same target lock, paid-conflict rule, version check, state update and
audit insert. Revoke v1 authenticated execution only after the server action is
switched.

- [ ] **Step 4: Write failing action/component tests**

Assert the RPC payload includes `p_courtesy_duration_days: 7` and
`p_courtesy_expires_at: null`, that the menu label is `Gerenciar cortesia`, that
buttons `1 dia`, `7 dias`, `30 dias`, `Personalizar` and `Encerrar cortesia`
appear in the appropriate states, that preset confirmation says `7 dias a
partir da confirmação`, and that successful feedback formats the exact
database-returned expiry in São Paulo. Custom mode shows its exact absolute
expiry before submission.

- [ ] **Step 5: Update schema, server action and dialog**

Use this discriminated input shape:

```ts
type CourtesyChoice =
  | { mode: "preset"; durationDays: 1 | 7 | 30; expiresAt: null }
  | { mode: "custom"; durationDays: null; expiresAt: string };
```

For non-grant actions both fields are null. The server action calls
`change_admin_user_v2`; the dialog starts with the 7-day preset selected, shows
the three presets as a single-choice group, reveals `datetime-local` only for
custom mode, and keeps the mandatory reason adjacent to the confirmation.

- [ ] **Step 6: Apply and run mutation/UI tests**

```bash
pnpm exec supabase migration up --local
pnpm exec supabase test db supabase/tests/admin_user_mutations.test.sql --local
pnpm vitest run \
  src/modules/admin/users/change-admin-user.action.test.ts \
  src/modules/admin/users/components/admin-user-actions.test.tsx
pnpm supabase:types
pnpm typecheck
```

Expected: all checks PASS.

- [ ] **Step 7: Commit the courtesy checkpoint**

```bash
git add supabase/migrations supabase/tests/admin_user_mutations.test.sql src/modules/admin/users src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add admin courtesy presets"
```

---

### Task 7: Add shared administrative pagination and onboarding totals

**Files:**
- Create: `src/components/admin/admin-pagination.tsx`
- Create: `src/components/admin/admin-pagination.test.tsx`
- Create via CLI: `supabase/migrations/*_admin_onboarding_page_counts.sql`
- Modify: `supabase/tests/admin_onboarding.test.sql`
- Modify: `src/modules/admin/users/components/admin-user-list.tsx`
- Modify: `src/modules/admin/users/components/admin-user-list.test.tsx`
- Modify: `src/modules/admin/onboarding/admin-onboarding.schema.ts`
- Modify: `src/modules/admin/onboarding/admin-onboarding.schema.test.ts`
- Modify: `src/modules/admin/onboarding/admin-onboarding.filters.ts`
- Modify: `src/modules/admin/onboarding/admin-onboarding.filters.test.ts`
- Modify: `src/modules/admin/onboarding/get-admin-onboarding.service.ts`
- Modify: `src/modules/admin/onboarding/get-admin-onboarding.service.test.ts`
- Modify: `src/modules/admin/onboarding/components/admin-onboarding-contacts.tsx`
- Modify: `src/modules/admin/onboarding/components/admin-onboarding-contacts.test.tsx`
- Modify: `src/modules/admin/onboarding/components/admin-onboarding-filters.test.tsx`

**Interfaces:**
- Produces `AdminPagination({page,pageSize,totalCount,totalPages,itemLabel,buildHref})`.
- Produces `public.list_admin_onboarding_contacts_v2(text,bigint,bigint,text,date,date,integer,integer) -> jsonb`.
- Onboarding navigation replaces `cursor` with one-based `page`.

- [ ] **Step 1: Write failing pagination component tests**

Assert the reusable output and links:

```tsx
render(
  <AdminPagination
    page={3}
    pageSize={20}
    totalCount={96}
    totalPages={5}
    itemLabel={{ singular: "usuário", plural: "usuários" }}
    buildHref={(page) => `/admin/users?page=${page}`}
  />,
);
expect(screen.getByText("41–60 de 96 usuários · Página 3 de 5")).toBeVisible();
expect(screen.getByRole("link", { name: "Página anterior" })).toHaveAttribute(
  "href",
  "/admin/users?page=2",
);
expect(screen.getByRole("link", { name: "Próxima página" })).toHaveAttribute(
  "href",
  "/admin/users?page=4",
);
```

Test page 1, last page, ellipses, current `aria-current="page"`, and zero result
copy `0 usuários · Página 0 de 0` with no links.

- [ ] **Step 2: Write failing onboarding v2 page-count tests**

Add function/grant assertions and verify filtered totals, page 2 ordering, empty
filters and out-of-range page behavior. The expected response keys are exactly
`items`, `page`, `pageSize`, `totalCount`, `totalPages`.

- [ ] **Step 3: Run the focused tests and confirm failures**

```bash
pnpm vitest run \
  src/components/admin/admin-pagination.test.tsx \
  src/modules/admin/users/components/admin-user-list.test.tsx \
  src/modules/admin/onboarding
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql --local
```

Expected: FAIL because the component and onboarding v2 function are absent.

- [ ] **Step 4: Implement `AdminPagination` using existing UI primitives**

Compose `Pagination`, `PaginationContent`, `PaginationItem`,
`PaginationPrevious`, `PaginationNext`, `PaginationLink` and
`PaginationEllipsis` from `src/components/ui/pagination.tsx`. Generate the
deduplicated sorted set `{1, page - 1, page, page + 1, totalPages}` bounded to
valid pages, inserting ellipses across gaps. Use Portuguese accessible labels
and 44px-minimum targets.

- [ ] **Step 5: Implement `list_admin_onboarding_contacts_v2`**

Run:

```bash
pnpm exec supabase migration new admin_onboarding_page_counts
```

Reuse the v1 authorized filter projection but remove cursor predicates. Count
the materialized filtered set, then apply deterministic
`order by completed_at desc, user_id desc limit page_size offset ...`. Return the
shared page metadata and preserve the current exclusion of soft-deleted profiles.
Grant only `authenticated`. Preserve v1 for database-first deployment
compatibility and record its conditional cleanup in the operations runbook.

- [ ] **Step 6: Switch both administrative tables to numeric pages**

Replace the hand-written user-list `<nav>` and onboarding-contact `<nav>` with
`AdminPagination`. `listUrl` and `adminOnboardingUrl` omit `page` when it equals
1 and preserve all non-pagination filters. Any filter patch sets `page: 1`.
Update services to pass `p_page` and `p_page_size: 20`.

- [ ] **Step 7: Apply, test and commit**

```bash
pnpm exec supabase migration up --local
pnpm exec supabase test db supabase/tests/admin_onboarding.test.sql --local
pnpm vitest run \
  src/components/admin/admin-pagination.test.tsx \
  src/modules/admin/users/components/admin-user-list.test.tsx \
  src/modules/admin/onboarding
pnpm supabase:types
pnpm typecheck
git add supabase/migrations supabase/tests/admin_onboarding.test.sql src/components/admin src/modules/admin src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add administrative page totals"
```

Expected: database and UI suites PASS.

---

### Task 8: Remove the subscriptions route and navigation noise

**Files:**
- Delete: `src/app/(admin-panel)/admin/subscriptions/page.tsx`
- Modify or delete when empty: `src/app/(admin-panel)/admin/pages.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`

**Interfaces:**
- Admin navigation contains Dashboard, Usuários, Onboarding and Área financeira; no subscriptions destination or redirect remains.

- [ ] **Step 1: Change tests to require route/navigation absence**

Remove the placeholder page render test. In the sidebar test assert:

```ts
render(<AppSidebar variant="admin" />);
expect(
  screen.queryByRole("link", { name: "Assinaturas" }),
).not.toBeInTheDocument();
```

Keep positive assertions for Dashboard, Usuários, Onboarding and Área
financeira.

- [ ] **Step 2: Run sidebar/admin page tests and confirm the old link still fails the new expectation**

```bash
pnpm vitest run src/components/layout/app-sidebar.test.tsx src/app/\(admin-panel\)/admin/pages.test.tsx
```

Expected: FAIL because `Assinaturas` remains in the navigation.

- [ ] **Step 3: Delete the route and remove the navigation item**

Delete the placeholder page, remove its icon import and nav entry, and remove the
now-obsolete scaffold test/import. Do not add `redirect()`, rewrite, alias or
`next.config` rule.

- [ ] **Step 4: Rerun tests and commit**

```bash
pnpm vitest run src/components/layout/app-sidebar.test.tsx
git add -A src/app/\(admin-panel\)/admin/subscriptions src/app/\(admin-panel\)/admin/pages.test.tsx src/components/layout/app-sidebar.tsx src/components/layout/app-sidebar.test.tsx
git commit -m "refactor: remove admin subscriptions page"
```

Expected: tests PASS and `rg -n "admin/subscriptions|Assinaturas" src/app src/components/layout` returns no obsolete route/navigation match.

---

### Task 9: Run security, accessibility and release verification

**Files:**
- Modify only if a check finds a defect: files introduced or changed in Tasks 1–8
- Modify when operational behavior changed: `docs/operations/admin-access-runbook.md`

**Interfaces:**
- No new interface; this task proves the integrated feature and documents only verified operator behavior.

- [ ] **Step 1: Run all targeted application suites**

```bash
pnpm vitest run \
  src/modules/admin/users \
  src/modules/admin/onboarding \
  src/components/admin \
  src/components/layout/app-sidebar.test.tsx \
  src/app/\(admin-panel\)/admin
```

Expected: PASS with no unhandled React warnings.

- [ ] **Step 2: Run all affected pgTAP suites**

```bash
pnpm exec supabase test db --local
```

Expected: PASS. Confirm the ordinary-user, AAL1, blocked-target and deleted-target
assertions execute rather than being skipped.

- [ ] **Step 3: Verify generated types are stable**

```bash
pnpm supabase:types
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
```

Expected: the second type generation produces no diff.

- [ ] **Step 4: Run full static and application checks**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm supabase:lint
pnpm supabase:advisors
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
```

Expected: every command exits zero. Review advisors for the new count, timeline
and AI aggregate paths rather than suppressing warnings without evidence.

- [ ] **Step 5: Perform seeded manual verification**

Using the documented local admin credentials, verify in light and dark themes
and at desktop/mobile widths:

1. a completed profile displays its name;
2. a missing profile shows the neutral fallback;
3. active, blocked and excluded users open every tab;
4. the formerly failing seeded blocked-history event renders with no crash;
5. diagnoses use Portuguese labels and correct quick/detailed values;
6. AI tokens and USD estimate/unsupported fallback are legible;
7. subscription colors always have text labels;
8. 1/7/30-day courtesy presets show and persist server-derived expiry;
9. both admin tables show exact item/page counts and preserve filters; and
10. `/admin/subscriptions` returns the normal 404.

- [ ] **Step 6: Update the runbook only with verified behavior and commit fixes**

If the admin-access runbook describes the old action label, cursor navigation or
history limitation, replace it with the verified behavior. Record that v1 read
RPC execute grants may be revoked in a later migration only after deployed
application telemetry/source confirms no remaining v1 caller; do not revoke
them in this database-first release. Then run
`git diff --check` and commit only final fixes/documentation:

```bash
git add docs/operations/admin-access-runbook.md src supabase
git commit -m "docs: update admin user operations"
```

If no file changed in this task, do not create an empty commit.
