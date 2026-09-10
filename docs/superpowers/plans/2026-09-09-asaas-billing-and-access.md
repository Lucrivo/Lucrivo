# Asaas Billing and Quick Diagnosis Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell Lucrivo monthly and annual access through hosted Asaas Checkout, derive free/paid access safely from synchronized billing records, and enforce the one-free-report rule in Postgres.

**Architecture:** Supabase stores immutable prices, local billing contracts, normalized payments, and an idempotent webhook ledger. Authenticated Next.js routes create method-specific Checkout sessions and cancel monthly card subscriptions through a small Asaas gateway; a token-protected webhook applies normalized provider events through one service-role-only transactional RPC. Report creation and visibility remain protected by Postgres functions and RLS, while server-rendered pages expose only access-appropriate states.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Supabase JS 2.112.3, PostgreSQL 17, pgTAP, Vitest/Testing Library, hosted Asaas Checkout API v3.

**Spec:** `docs/superpowers/specs/2026-09-09-asaas-billing-and-access-design.md`

## Global Constraints

- Monthly v1 is `4990` BRL cents: credit card recurs every month until cancellation, while Pix is a detached purchase for one non-renewing month.
- Annual v1 is `47880` BRL cents: Pix is paid up front and credit card is one purchase in up to 12 installments; both grant 12 months without automatic renewal.
- Annual copy is exactly: `R$ 478,80 no Pix à vista ou em até 12x sem juros no cartão — 12x de R$ 39,90. Sem renovação automática.`
- Free is derived: no valid paid access interval means free; do not persist a `free` plan row.
- The first report created by a user is the free report even when that user is paid. A user can own at most one `is_free_report = true` row.
- A free user can read only the free report and cannot create another. A paid user can create and read additional reports. Downgrade hides, but never deletes, paid reports.
- Only verified Asaas webhooks change paid access. Checkout callback URLs never grant access.
- Prices are immutable versions. New purchases use the active version; historical contracts retain their commercial snapshot.
- Use integer cents, `timestamptz`, explicit check constraints, indexes on every foreign key and RLS predicate, and short transactions with no external HTTP call inside a database transaction.
- Every new table in `public` has RLS plus deliberate `GRANT`/`REVOKE` statements; do not rely on Supabase automatic Data API exposure.
- Every privileged database implementation lives in unexposed schema `private`, uses `security definer set search_path = ''`, schema-qualifies every object, and checks the authenticated subject explicitly. Exposed `public` RPC entry points remain `security invoker`.
- `SUPABASE_SECRET_KEY`, `ASAAS_API_KEY`, and `ASAAS_WEBHOOK_TOKEN` stay server-only and are never logged or prefixed with `NEXT_PUBLIC_`.
- Lucrivo never collects card fields in its UI and never persists full card number, CVV, expiration, masked card metadata, or reusable card tokens; webhook redaction removes the complete provider card object first.
- Preserve unrelated worktree changes. In particular, inspect the existing untracked `src/app/api/webhooks/asaas/route.ts` before replacing its commented legacy skeleton.
- Use TDD and make one focused commit after each green task.

## File and Responsibility Map

- `src/config/billing-environment.ts`: validate server billing configuration and provider origins.
- `src/infrastructure/database/supabase/clients/admin.client.ts`: isolated secret-key Supabase client.
- `src/infrastructure/payments/asaas/asaas.client.ts`: typed HTTP boundary for Checkout creation and subscription cancellation.
- `src/infrastructure/payments/asaas/webhook.schema.ts`: forward-compatible webhook parsing and normalization.
- `src/modules/billing/types.ts`: shared billing modes, public prices, access summary, and service results.
- `src/modules/billing/services/*.service.ts`: price reads, overview, Checkout orchestration, webhook application, and cancellation.
- `src/app/api/billing/checkout/route.ts`: authenticated Checkout creation endpoint.
- `src/app/api/billing/cancel/route.ts`: authenticated monthly cancellation endpoint.
- `src/app/api/webhooks/asaas/route.ts`: token validation and webhook delivery response.
- `src/app/(private)/billing/*`: plan management, Checkout actions, and callback status.
- `src/modules/billing/components/*`: reusable plan, access, cancellation, and upgrade UI.
- `supabase/migrations/*_create_billing_foundation.sql`: catalog and billing persistence.
- `supabase/migrations/*_enforce_billing_report_access.sql`: free-report backfill, entitlement helpers, RLS, and report creation gates.
- `supabase/migrations/*_apply_asaas_webhook_events.sql`: transactional provider event reducer.
- `supabase/tests/billing_*.test.sql`: schema, privilege, entitlement, idempotency, and event-state coverage.
- `docs/asaas-billing-runbook.md`: credentials, webhook setup, sandbox validation, reconciliation, replay, and incident procedure.

---

### Task 1: Server-only billing configuration and Asaas gateway

**Files:**

- Modify: `.env.example`
- Create: `src/config/billing-environment.ts`
- Create: `src/config/billing-environment.test.ts`
- Create: `src/infrastructure/database/supabase/clients/admin.client.ts`
- Create: `src/infrastructure/database/supabase/clients/admin.client.test.ts`
- Create: `src/infrastructure/payments/asaas/asaas.client.ts`
- Create: `src/infrastructure/payments/asaas/asaas.client.test.ts`

**Interfaces:**

- Consumes: process environment, generated `Database`, and injected `fetch`.
- Produces: `readBillingEnvironment`, `createAdminClient`, `AsaasGateway`, and `AsaasGatewayError` for all later billing tasks.

```ts
type BillingEnvironment = {
  appUrl: URL;
  supabaseUrl: string;
  supabaseSecretKey: string;
  asaasApiUrl: URL;
  asaasApiKey: string;
  asaasWebhookToken: string;
};

function readBillingEnvironment(env?: NodeJS.ProcessEnv): BillingEnvironment;

function createAdminClient(): SupabaseClient<Database>;

type AsaasCheckoutRequestBase = {
  minutesToExpire: 60;
  externalReference: string;
  callback: { successUrl: string; cancelUrl: string; expiredUrl: string };
  items: Array<{
    externalReference: string;
    name: string;
    description: string;
    imageBase64: string;
    quantity: 1;
    value: number;
  }>;
  customer?: string;
};

type AsaasCheckoutRequest = AsaasCheckoutRequestBase &
  (
    | {
        billingTypes: ["CREDIT_CARD"];
        chargeTypes: ["RECURRENT"];
        subscription: { cycle: "MONTHLY"; nextDueDate: string };
        installment?: never;
      }
    | {
        billingTypes: ["CREDIT_CARD"];
        chargeTypes: ["INSTALLMENT"];
        subscription?: never;
        installment: { maxInstallmentCount: 12 };
      }
    | {
        billingTypes: ["PIX"];
        chargeTypes: ["DETACHED"];
        subscription?: never;
        installment?: never;
      }
  );

type AsaasCheckout = { id: string; link: string; status: "ACTIVE" };

interface AsaasGateway {
  createCheckout(input: AsaasCheckoutRequest): Promise<AsaasCheckout>;
  deleteSubscription(id: string): Promise<{ id: string; deleted: true }>;
}

class AsaasGatewayError extends Error {
  kind: "rejected" | "ambiguous";
  status?: number;
}
```

- [ ] **Step 1: Write failing environment and admin-client tests**

Assert that missing variables fail closed; production rejects HTTP `APP_URL`; `ASAAS_API_URL` accepts only `https://api-sandbox.asaas.com` and `https://api.asaas.com`; and the admin client receives session-disabled options:

```ts
expect(createClient).toHaveBeenCalledWith(url, secret, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
```

Also inspect `.env.example` in the test and assert it declares `SUPABASE_SECRET_KEY`, `ASAAS_API_KEY`, `ASAAS_API_URL`, and `ASAAS_WEBHOOK_TOKEN` without values.

- [ ] **Step 2: Write failing gateway tests**

Use an injected `fetch` mock. Assert `createCheckout` sends `POST /v3/checkouts`, `access_token`, `Content-Type: application/json`, and the exact input body; it accepts unknown response fields. Assert `deleteSubscription("sub_123")` sends `DELETE /v3/subscriptions/sub_123`. Cover:

Also assert a detached Pix request is sent with `billingTypes: ["PIX"]`, `chargeTypes: ["DETACHED"]`, and no subscription/installment fields. The request union must reject invalid provider combinations at compile time.

```ts
it.each([
  [400, "rejected"],
  [401, "rejected"],
  [408, "ambiguous"],
  [429, "ambiguous"],
  [500, "ambiguous"],
])("classifies HTTP %s as %s", async (status, kind) => {
  fetchMock.mockResolvedValue(new Response("{}", { status }));
  await expect(gateway.createCheckout(request)).rejects.toMatchObject({ kind });
});

it("classifies a network timeout as ambiguous", async () => {
  fetchMock.mockRejectedValue(new TypeError("fetch failed"));
  await expect(gateway.createCheckout(request)).rejects.toMatchObject({
    kind: "ambiguous",
  });
});
```

- [ ] **Step 3: Run focused tests and confirm failure**

```bash
pnpm test src/config/billing-environment.test.ts src/infrastructure/database/supabase/clients/admin.client.test.ts src/infrastructure/payments/asaas/asaas.client.test.ts
```

Expected: FAIL because the billing environment, admin client, and gateway do not exist.

- [ ] **Step 4: Implement the minimal server-only adapters**

Start every implementation with `import "server-only"`. Validate configuration with Zod, never include secret values in thrown messages, and instantiate the admin client only on demand. Parse provider responses with permissive objects so newly added Asaas fields do not break the integration:

```ts
const checkoutResponseSchema = z.looseObject({
  id: z.string().min(1),
  link: z.url(),
  status: z.literal("ACTIVE"),
});

const deleteResponseSchema = z.looseObject({
  id: z.string().min(1),
  deleted: z.literal(true),
});
```

Before returning a Checkout link, require HTTPS and hostname `sandbox.asaas.com`, `www.asaas.com`, or `asaas.com`. Add these safe examples:

```dotenv
SUPABASE_SECRET_KEY=
ASAAS_API_KEY=
ASAAS_API_URL=https://api-sandbox.asaas.com
ASAAS_WEBHOOK_TOKEN=
```

- [ ] **Step 5: Run focused tests and quality checks**

```bash
pnpm test src/config/billing-environment.test.ts src/infrastructure/database/supabase/clients/admin.client.test.ts src/infrastructure/payments/asaas/asaas.client.test.ts
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/config/billing-environment.ts src/config/billing-environment.test.ts src/infrastructure/database/supabase/clients/admin.client.ts src/infrastructure/database/supabase/clients/admin.client.test.ts src/infrastructure/payments/asaas/asaas.client.ts src/infrastructure/payments/asaas/asaas.client.test.ts
git commit -m "feat: add secure Asaas server adapters"
```

---

### Task 2: Billing catalog and persistence schema

**Files:**

- Create with CLI: `supabase/migrations/<generated>_create_billing_foundation.sql`
- Create: `supabase/tests/billing_schema.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: the approved table/price model from the design.
- Produces: five RLS-protected billing tables, v1 catalog rows, constraints/indexes, and generated TypeScript table types.

Create `public.billing_prices`, `public.billing_customers`, `public.billing_contracts`, `public.billing_payments`, and `public.asaas_webhook_events` exactly as specified in the design. Catalog `billing_mode` values are `monthly` and `annual`. Contracts also persist `payment_method` (`credit_card` or `pix`) and `charge_type` (`recurring`, `installment`, or `detached`) with a check that permits only the four approved combinations. The application relies on these additional operational columns:

```sql
-- billing_contracts
asaas_checkout_url text,
checkout_expires_at timestamptz,
cancellation_requested_at timestamptz,
cancellation_confirmed_at timestamptz,
updated_at timestamptz not null default statement_timestamp()
```

Use these exact status sets:

```sql
billing_contracts.status in (
  'pending', 'pending_reconciliation', 'active',
  'cancel_at_period_end', 'expired', 'canceled',
  'refunded', 'chargeback', 'failed'
)

asaas_webhook_events.processing_status in (
  'received', 'processed', 'ignored', 'failed'
)
```

- [ ] **Step 1: Recheck current official Supabase guidance**

Read the current Supabase changelog, RLS, database-functions, and database-testing documentation linked in the spec. Confirm that explicit grants remain required for new Data API tables and that the local project still has `schema_paths = []` before writing an imperative migration.

- [ ] **Step 2: Inspect CLI syntax and create the migration**

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new create_billing_foundation
```

Expected: one empty timestamped migration with the requested suffix. If the CLI cannot write its user telemetry file in the execution sandbox, rerun this command with the environment's approved elevated filesystem permission; do not hand-invent a timestamp.

- [ ] **Step 3: Write failing pgTAP schema and privilege coverage**

Create assertions for columns, types, primary/foreign/unique/check constraints, FK indexes, partial indexes, RLS enablement, and grants. At minimum prove:

```sql
select has_table('public', 'billing_prices');
select has_table('public', 'billing_contracts');
select col_type_is('public', 'billing_prices', 'amount_cents', 'bigint');
select col_type_is('public', 'billing_contracts', 'access_ends_at', 'timestamp with time zone');
select policies_are('public', 'billing_customers', array[]::text[]);
select table_privs_are(
  'public', 'asaas_webhook_events', 'authenticated', array[]::text[]
);
```

As `anon`, assert exactly two active price rows are readable and retired rows are hidden. Assert the contract check rejects every payment/charge combination outside the four approved flows. As authenticated user A, assert only A's safe contract and payment rows are readable. Assert neither user role can insert/update/delete billing data or read `billing_customers`/`asaas_webhook_events`.

- [ ] **Step 4: Run the database tests and confirm failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_schema.test.sql
```

Expected: FAIL because the billing tables do not exist.

- [ ] **Step 5: Implement the schema, constraints, indexes, RLS, and v1 prices**

Use UUID primary keys with `gen_random_uuid()`, `bigint` cents, `text` plus checks, and `timestamptz`. Include:

```sql
create unique index billing_prices_one_active_mode_idx
on public.billing_prices (product_code, billing_mode)
where is_active;

create unique index billing_contracts_one_pending_user_idx
on public.billing_contracts (user_id)
where status in ('pending', 'pending_reconciliation');

create index billing_contracts_user_access_idx
on public.billing_contracts (user_id, access_ends_at desc)
where status in ('active', 'cancel_at_period_end');

create index billing_payments_contract_id_idx
on public.billing_payments (contract_id);

create index billing_contracts_reconciliation_idx
on public.billing_contracts (updated_at)
where status = 'pending_reconciliation';

create index asaas_webhook_events_retry_idx
on public.asaas_webhook_events (received_at)
where processing_status = 'failed';
```

Add a catalog shape check: monthly rows have null `installment_limit` and `access_months = 1`; annual rows have `installment_limit = 12`, `access_months = 12`, and `amount_cents % installment_limit = 0` so the advertised equal card installment is always true. Add a `before update` trigger on `billing_prices` that rejects changes to `product_code`, `billing_mode`, `version`, `amount_cents`, `currency`, `installment_limit`, and `access_months`; only retirement fields may change. Seed production catalog data in the migration:

```sql
insert into public.billing_prices (
  id, product_code, billing_mode, version, amount_cents, currency,
  installment_limit, access_months, is_active
) values
  ('20000000-0000-4000-8000-000000000001', 'quick_diagnosis_pro',
   'monthly', 1, 4990, 'BRL', null, 1, true),
  ('20000000-0000-4000-8000-000000000002', 'quick_diagnosis_pro',
   'annual', 1, 47880, 'BRL', 12, 12, true);
```

Grant `select` on `billing_prices` to `anon, authenticated, service_role`. Use column-level authenticated grants for contracts (`id`, `price_id`, `billing_mode`, `payment_method`, `charge_type`, `amount_cents`, `currency`, `status`, access dates, and cancellation flags/dates) and payments (`id`, `contract_id`, status, value, installment number, and financial dates); do not grant provider IDs, Checkout URLs, `external_reference`, or raw operational errors to client roles. Grant required full CRUD only to `service_role`. Explicitly revoke all client access to customers and webhook events. Enable RLS on all five tables, and assert the column grants through `information_schema.column_privileges` in the pgTAP test.

- [ ] **Step 6: Reset, test, lint, advise, and regenerate types**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_schema.test.sql
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
```

Expected: PASS; generated types contain all five tables and their relationships.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests/billing_schema.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add billing persistence and price catalog"
```

---

### Task 3: Database-enforced free report and paid entitlement policy

**Files:**

- Create with CLI: `supabase/migrations/<generated>_enforce_billing_report_access.sql`
- Create: `supabase/tests/billing_access.test.sql`
- Modify: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/product_diagnosis_reports.test.sql`
- Modify: `supabase/tests/production_diagnosis_reports.test.sql`
- Modify: `supabase/tests/service_diagnoses.test.sql`
- Modify: `supabase/tests/seed.test.sql`
- Modify: `supabase/seed.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: Task 2 billing tables and the three current report creation RPC signatures.
- Produces: `diagnoses.is_free_report`, private entitlement/report implementations, invoker RPC wrappers, and access-aware RLS used by Tasks 4–10.

```sql
private.has_paid_access_for_user(p_user_id uuid, p_at timestamptz)
  returns boolean

private.has_paid_access(p_at timestamptz default statement_timestamp())
  returns boolean

private.can_read_diagnosis(p_diagnosis_id bigint)
  returns boolean
```

`private.has_paid_access` and `private.can_read_diagnosis` are callable by `authenticated` only for RLS evaluation; `private.has_paid_access_for_user` is internal only. All three use `security definer set search_path = ''` and include an explicit caller/owner comparison.

Move each privileged report writer into the unexposed schema while retaining its public API name:

```sql
private.create_service_diagnosis_report_v4_impl(...)
private.create_product_diagnosis_report_impl(...)
private.create_production_diagnosis_report_impl(...)

public.create_service_diagnosis_report_v4(...) -- security invoker wrapper
public.create_product_diagnosis_report(...)    -- security invoker wrapper
public.create_production_diagnosis_report(...) -- security invoker wrapper
```

- [ ] **Step 1: Create the migration through the CLI**

```bash
pnpm exec supabase migration new enforce_billing_report_access
```

- [ ] **Step 2: Write failing pgTAP access and backfill tests**

Cover these concrete cases:

- the seeded user's earliest `(created_at, id)` report becomes the sole free report;
- the partial unique index rejects a second `is_free_report = true` row;
- a new free user creates one report and the second distinct submission raises `free_report_limit_reached`;
- the obsolete `public.create_service_diagnosis_report` RPC is no longer executable by authenticated clients and cannot bypass the allowance;
- retrying the first submission returns the existing ID instead of consuming another allowance;
- a paid user's first report is free and subsequent reports are paid;
- after `access_ends_at`, only the free parent and matching service/product/production detail row are visible;
- reactivation makes all owned rows visible again;
- another user never sees billing, parent, detail, or snapshot data;
- refunded/chargeback/failed contracts never grant access, even with future timestamps.

Use fixed instants rather than `now()` in fixtures:

```sql
insert into public.billing_contracts (..., status, access_starts_at, access_ends_at)
values (..., 'active', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');

select is(
  private.has_paid_access('2026-09-15T00:00:00Z'),
  true,
  'paid interval grants access inside its half-open range'
);
```

- [ ] **Step 3: Run focused SQL tests and confirm failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_access.test.sql supabase/tests/diagnosis_reports.test.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql supabase/tests/service_diagnoses.test.sql supabase/tests/seed.test.sql
```

Expected: FAIL because `is_free_report` and entitlement functions are absent.

- [ ] **Step 4: Implement backfill, helpers, indexes, and RLS**

Backfill deterministically before adding the unique index:

```sql
alter table public.diagnoses
add column is_free_report boolean not null default false;

with ranked as (
  select id, row_number() over (
    partition by user_id order by created_at, id
  ) as position
  from public.diagnoses
)
update public.diagnoses as d
set is_free_report = true
from ranked
where ranked.id = d.id and ranked.position = 1;

create unique index diagnoses_one_free_report_per_user_idx
on public.diagnoses (user_id)
where is_free_report;
```

Create `private` if absent, revoke all default access, and grant only schema `usage` plus execute on the caller-scoped policy/report implementations to `authenticated`; the schema is not added to `api.schemas`. Revoke `private.has_paid_access_for_user` from `public, anon, authenticated, service_role` because it is called only inside owner functions. Define paid access as a half-open interval with status `active` or `cancel_at_period_end`, `access_starts_at <= p_at`, and `access_ends_at > p_at`. Replace parent and all three child select policies with owner plus free/paid checks. Use `(select auth.uid())` and indexed predicates.

- [ ] **Step 5: Gate all three report-creation RPCs atomically**

Copy the latest bodies of `create_service_diagnosis_report_v4`, `create_product_diagnosis_report`, and `create_production_diagnosis_report` into the three `private.*_impl` functions. Keep their snapshot validation unchanged, but apply this sequence before a new insert:

```sql
perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

-- First return an already-owned idempotent submission after validating its
-- category/detail identity. This check must precede the allowance check.

report_is_free := not exists (
  select 1 from public.diagnoses
  where user_id = caller_id and is_free_report
);

if not report_is_free
  and not private.has_paid_access_for_user(
    caller_id,
    statement_timestamp()
  )
then
  raise exception using
    errcode = 'P0001',
    message = 'free_report_limit_reached';
end if;
```

Add `is_free_report` to each registry insert with `report_is_free`. Preserve `security definer set search_path = ''`, explicit `auth.uid()` validation, and current submission collision behavior in the private implementations. Replace each existing public function body with a same-signature `security invoker set search_path = ''` SQL wrapper that delegates every argument to its private implementation. Keep public wrappers executable only by `authenticated`; assert `prosecdef = false` for public wrappers and `prosecdef = true` plus an empty search path for private implementations. Revoke authenticated execution from the superseded `public.create_service_diagnosis_report` signature because the application now uses V4 and the legacy writer would otherwise bypass the limit.

- [ ] **Step 6: Update seed expectations and verify the complete database**

The seed is applied after migrations, so its nine fixture reports do not exist during the migration backfill. Before the first seeded report RPC, insert a local-only active contract for the seeded user and annual v1 price; after all nine report RPCs, set that contract to `expired` with an end instant in the past. This lets the first RPC claim the free slot and the remaining RPCs create paid fixtures without weakening the production gate.

Change the final authenticated seed assertion from nine readable reports to one readable free report; keep the underlying nine-row persistence assertions as the privileged test role. Then run:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
```

Expected: all database tests PASS and generated `diagnoses` types include `is_free_report`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests supabase/seed.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: enforce free and paid report access"
```

---

### Task 4: Application-level entitlement states and upgrade-safe report UX

**Files:**

- Create: `src/modules/billing/types.ts`
- Create: `src/modules/billing/services/get-billing-overview.service.ts`
- Create: `src/modules/billing/services/get-billing-overview.service.test.ts`
- Create: `src/modules/billing/components/diagnosis-limit-card.tsx`
- Create: `src/modules/billing/components/locked-report-card.tsx`
- Create: `src/modules/billing/components/access-cards.test.tsx`
- Modify: `src/modules/quick-diagnosis/types.ts`
- Modify: all three `src/modules/reports/services/create-*-report.service.ts` and tests
- Modify: all three `src/modules/quick-diagnosis/actions/create-*-diagnosis.action.ts` and tests
- Modify: all three wizard state/review components and focused tests
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/modules/reports/services/get-report.service.ts`
- Modify: `src/modules/reports/services/get-report.service.test.ts`
- Modify: `src/app/(private)/reports/[id]/page.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`

**Interfaces:**

- Consumes: Task 1 admin client plus Task 3 contract/report RLS and generated types.
- Produces: `BillingOverview`, `getBillingOverview`, `limit_reached` action results, page preflight, and safe `locked` report state.

```ts
type BillingContractStatus =
  | "pending"
  | "pending_reconciliation"
  | "active"
  | "cancel_at_period_end"
  | "expired"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "failed";

type BillingOverview = {
  tier: "free" | "paid";
  canCreateDiagnosis: boolean;
  freeReportUsed: boolean;
  contract: null | {
    billingMode: "monthly" | "annual";
    paymentMethod: "credit_card" | "pix";
    status: BillingContractStatus;
    accessEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
  };
};

type GetBillingOverviewResult =
  | { status: "success"; overview: BillingOverview }
  | { status: "read_failed" };

type Create*DiagnosisActionResult =
  | existing variants
  | { status: "error"; error: "limit_reached" };

type GetOwnedReportResult =
  | existing variants
  | { status: "locked" };
```

- [ ] **Step 1: Write failing overview, service, and page tests**

Assert the overview service returns free/unused with no contract/report, free/used with one free report, paid inside a valid interval, and free after expiry. Update each creation service test so a Supabase error `{ code: "P0001", message: "free_report_limit_reached" }` maps to `limit_reached`, while unrelated provider details remain `create_failed`.

Assert `/quick-diagnosis` renders `DiagnosisLimitCard` instead of the wizard when `canCreateDiagnosis` is false. Assert a known owned-but-locked report renders `LockedReportCard`, while a foreign/missing ID remains `notFound()`.

- [ ] **Step 2: Run focused tests and confirm failure**

```bash
pnpm test src/modules/billing/services/get-billing-overview.service.test.ts src/modules/billing/components/access-cards.test.tsx src/modules/reports/services/create-service-report.service.test.ts src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-production-report.service.test.ts 'src/app/(private)/quick-diagnosis/page.test.tsx' src/modules/reports/services/get-report.service.test.ts 'src/app/(private)/reports/[id]/page.test.tsx'
```

Expected: FAIL because billing overview and access UI do not exist.

- [ ] **Step 3: Implement overview and creation error propagation**

Query only the caller's `billing_contracts` plus `diagnoses.is_free_report`; compute time against an injected `now` in tests. Do not infer authorization from JWT metadata. Extend the three action/service result unions and preserve `limit_reached` through the server action instead of collapsing it to `create_failed`.

In every wizard review step, render the same actionable message for `limit_reached`:

```tsx
<p>Seu diagnóstico gratuito já foi usado.</p>
<Link href="/billing">Conhecer os planos</Link>
```

- [ ] **Step 4: Implement page preflight and safe locked-report detection**

Make `QuickDiagnosisPage` async, call `requireUser()` and `getBillingOverview()`, and show a failure boundary on read failure. For a report hidden by RLS, make `getOwnedReport` accept an injected admin client and run a second metadata-only query selecting only `id`, filtered by both `id` and trusted `userId`. Return `locked` only for that owned row; never select `report_snapshot` through the admin client.

```ts
const { data: ownedLockedRow } = await admin
  .from("diagnoses")
  .select("id")
  .eq("id", parsedId)
  .eq("user_id", userId)
  .maybeSingle();
```

Render an upgrade card for `locked`; preserve 404 behavior for foreign/missing rows.

- [ ] **Step 5: Run focused and regression tests**

```bash
pnpm test src/modules/billing src/modules/quick-diagnosis src/modules/reports 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx'
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/billing src/modules/quick-diagnosis src/modules/reports 'src/app/(private)/quick-diagnosis' 'src/app/(private)/reports/[id]'
git commit -m "feat: surface billing access in reports"
```

---

### Task 5: Active prices and deterministic Checkout payloads

**Files:**

- Create: `src/modules/billing/services/list-active-prices.service.ts`
- Create: `src/modules/billing/services/list-active-prices.service.test.ts`
- Create: `src/modules/billing/domain/build-checkout-request.ts`
- Create: `src/modules/billing/domain/build-checkout-request.test.ts`
- Modify: `src/modules/billing/types.ts`

**Interfaces:**

- Consumes: Task 1 Asaas request type and Task 2 public catalog.
- Produces: `ActiveBillingPrice`, `listActivePrices`, and `buildCheckoutRequest` for Checkout and UI tasks.

```ts
type ActiveBillingPrice = {
  id: string;
  productCode: "quick_diagnosis_pro";
  billingMode: "monthly" | "annual";
  amountCents: number;
  currency: "BRL";
  installmentLimit: number | null;
  accessMonths: number;
};

function listActivePrices(input: {
  supabase: SupabaseClient<Database>;
}): Promise<
  | { status: "success"; prices: ActiveBillingPrice[] }
  | { status: "read_failed" }
>;

function buildCheckoutRequest(input: {
  price: ActiveBillingPrice;
  paymentMethod: "credit_card" | "pix";
  contractId: string;
  appUrl: URL;
  customerId?: string;
  today: string;
}): AsaasCheckoutRequest;
```

- [ ] **Step 1: Write failing price and payload tests**

Assert the catalog service selects only active fields, rejects duplicate/missing modes, and sorts monthly before annual. Assert exact payload snapshots for all four supported combinations:

```ts
expect(monthly).toMatchObject({
  billingTypes: ["CREDIT_CARD"],
  chargeTypes: ["RECURRENT"],
  subscription: { cycle: "MONTHLY", nextDueDate: "2026-09-09" },
  externalReference: contractId,
  items: [{ quantity: 1, value: 49.9 }],
});

expect(annual).toMatchObject({
  billingTypes: ["CREDIT_CARD"],
  chargeTypes: ["INSTALLMENT"],
  installment: { maxInstallmentCount: 12 },
  items: [{ quantity: 1, value: 478.8 }],
});

expect(monthlyPix).toMatchObject({
  billingTypes: ["PIX"],
  chargeTypes: ["DETACHED"],
  items: [{ quantity: 1, value: 49.9 }],
});

expect(annualPix).toMatchObject({
  billingTypes: ["PIX"],
  chargeTypes: ["DETACHED"],
  items: [{ quantity: 1, value: 478.8 }],
});
```

Assert Pix payloads have neither `subscription` nor `installment`, all callback URLs use the supplied `APP_URL`, a known customer ID is included, absent customer data stays absent, and every item has a nonempty valid PNG `imageBase64`.

- [ ] **Step 2: Run tests and confirm failure**

```bash
pnpm test src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.test.ts
```

Expected: FAIL because the services do not exist.

- [ ] **Step 3: Implement catalog normalization and payload builder**

Use a tiny valid PNG constant required by the current Asaas OpenAPI:

```ts
const CHECKOUT_ITEM_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
```

Set `minutesToExpire: 60`, item names below 30 characters, and callback paths:

```ts
successUrl: new URL("/billing/return?outcome=success", appUrl).toString();
cancelUrl: new URL("/billing/return?outcome=canceled", appUrl).toString();
expiredUrl: new URL("/billing/return?outcome=expired", appUrl).toString();
```

Never accept amount, currency, installment count, access duration, or callback URL from a browser request.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm test src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.test.ts
git add src/modules/billing
git commit -m "feat: build versioned Asaas checkout offers"
```

---

### Task 6: Authenticated hosted Checkout creation

**Files:**

- Create: `src/modules/billing/services/create-hosted-checkout.service.ts`
- Create: `src/modules/billing/services/create-hosted-checkout.service.test.ts`
- Create: `src/app/api/billing/checkout/route.ts`
- Create: `src/app/api/billing/checkout/route.test.ts`

**Interfaces:**

- Consumes: Task 1 gateway/admin configuration and Task 5 catalog/payload builder.
- Produces: `createHostedCheckout` and `POST /api/billing/checkout` for the account billing UI.

```ts
type CreateHostedCheckoutResult =
  | { status: "created" | "reused"; checkoutUrl: string }
  | { status: "not_found" | "already_subscribed" | "rejected" }
  | { status: "pending_reconciliation" };

async function createHostedCheckout(input: {
  userId: string;
  priceId: string;
  paymentMethod: "credit_card" | "pix";
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
  appUrl: URL;
  now?: Date;
}): Promise<CreateHostedCheckoutResult>;

// POST JSON input
{
  priceId: string;
  paymentMethod: "credit_card" | "pix";
}

// 201/200 JSON output
{
  checkoutUrl: string;
}
```

- [ ] **Step 1: Write failing orchestration tests**

Test unknown/inactive price, invalid payment method, existing valid paid contract, reuse of a non-expired pending Checkout URL for the same method, expiry of a stale pending row before creating its replacement, and the first-purchase sequence. Assert the local pending contract uses `crypto.randomUUID()` for both `id` and `external_reference`, copies every commercial field from the database price, persists the selected `payment_method` and derived `charge_type`, and is inserted before `asaas.createCheckout`.

Assert provider outcomes:

- success stores checkout ID, URL, and expiration;
- rejected 4xx marks the contract `failed`;
- timeout/5xx marks `pending_reconciliation` and never performs an automatic second provider call;
- a unique pending-contract conflict reloads/reuses the winning request rather than creating another Checkout;
- an existing `billing_customers` mapping is passed to the payload.

- [ ] **Step 2: Write failing route tests**

Mock `requireUser`, the environment, admin client, gateway, and service. Assert 401 unauthenticated, 400 invalid UUID or payment method, 409 already subscribed, 422 provider rejection, 503 reconciliation, and 201 created. Verify responses use `Cache-Control: no-store` and never include internal error text or secrets.

- [ ] **Step 3: Run focused tests and confirm failure**

```bash
pnpm test src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.test.ts
```

Expected: FAIL because Checkout orchestration and route do not exist.

- [ ] **Step 4: Implement Checkout creation with short local writes**

Perform the Asaas HTTP call outside database transactions. Use conditional updates so a stale response cannot overwrite a contract already changed by webhook:

```ts
await admin
  .from("billing_contracts")
  .update({
    asaas_checkout_id: checkout.id,
    asaas_checkout_url: checkout.link,
    checkout_expires_at: expiresAt,
    updated_at: now.toISOString(),
  })
  .eq("id", contractId)
  .eq("status", "pending");
```

The API route accepts only `priceId` and the enumerated `paymentMethod`. It authenticates with `requireUser()` before creating the secret clients. Amounts and provider charge types remain server-derived.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm test src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.test.ts
pnpm typecheck
pnpm lint
git add src/modules/billing/services/create-hosted-checkout.service.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout
git commit -m "feat: create authenticated Asaas checkouts"
```

---

### Task 7: Transactional, idempotent Asaas event reducer

**Files:**

- Create with CLI: `supabase/migrations/<generated>_apply_asaas_webhook_events.sql`
- Create: `supabase/tests/billing_webhooks.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: Task 2 billing tables and Task 3 entitlement status semantics.
- Produces: service-role-only `apply_asaas_webhook_event`, event transitions, and generated RPC types for Task 8.

```sql
public.apply_asaas_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
) returns text
```

Return values are `processed`, `duplicate`, `ignored`, or `unresolved`. The function is `security invoker`, executable only by `service_role`, and performs the event-ledger write, contract lock, customer/payment upsert, and contract transition in one transaction.

- [ ] **Step 1: Create the migration and write failing reducer tests**

```bash
pnpm exec supabase migration new apply_asaas_webhook_events
```

Create fixtures for monthly card, monthly Pix, annual card, and annual Pix pending contracts. Test:

- `CHECKOUT_CREATED` attaches checkout/customer IDs without granting access;
- `CHECKOUT_PAID` grants the initial interval once, using the verified event creation instant;
- `CHECKOUT_CANCELED` and `CHECKOUT_EXPIRED` close only pending contracts;
- `SUBSCRIPTION_CREATED` attaches subscription/customer IDs without granting access;
- the first monthly card `PAYMENT_CONFIRMED` reconciles the initial interval without duplicating the `CHECKOUT_PAID` grant;
- a second monthly card confirmation advances access only to that payment's due date plus one month;
- monthly Pix grants exactly one month on its first verified paid event and later events never extend that contract;
- duplicate and out-of-order events never double-extend or shorten access;
- `PAYMENT_RECEIVED` records settlement without granting a new interval;
- the first annual card or Pix verified paid event grants exactly 12 months and later payment/installment events do not extend it;
- capture-refused and overdue events update payment state but never extend access;
- partial refund is recorded for manual review without silently applying the full-refund policy;
- `PAYMENT_REFUNDED` and chargeback events revoke immediately;
- `SUBSCRIPTION_INACTIVATED`/`DELETED` set `cancel_at_period_end` while preserving `access_ends_at`;
- an unknown event is stored as ignored;
- an unresolved known event is stored as failed and may be retried after its contract mapping becomes available;
- `anon` and `authenticated` cannot execute the RPC.

- [ ] **Step 2: Run the reducer tests and confirm failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_webhooks.test.sql
```

Expected: FAIL because the reducer is absent.

- [ ] **Step 3: Implement durable retry and contract resolution**

At function start, lock an existing event row or insert it. Treat only `processed`/`ignored` as final duplicates; increment `attempt_count` and retry `failed` rows. Resolve a contract in this order:

1. `externalReference` from checkout, payment, or subscription;
2. `checkout.id`;
3. `payment.subscription` or `subscription.id`;
4. `payment.installment`;
5. known `payment.id`.

If those identifiers are not mapped yet, resolve through `checkout.customer`, `payment.customer`, or `subscription.customer` only when `billing_customers` points to exactly one non-final contract for that user. Any ambiguous customer match remains `unresolved`.

Lock the chosen contract `for update`. Upsert `billing_customers` by `user_id` and `billing_payments` by `asaas_payment_id` with `on conflict`. Never overwrite a non-null provider mapping with null.

Read Asaas monetary JSON through `numeric`, multiply by 100, round once, and cast to `bigint`; never cast through PostgreSQL `real`/`double precision`. Accept the documented event datetime form `YYYY-MM-DD HH24:MI:SS`, ISO timestamps, and date-only payment fields, normalizing all access instants to UTC.

For monthly recurring card confirmation, set the end deterministically from the payment due date rather than adding blindly:

```sql
new_access_end := p_due_date::timestamptz + interval '1 month';
access_ends_at := greatest(
  coalesce(access_ends_at, new_access_end),
  new_access_end
);
```

Apply payment-based extension only when a monthly card payment transitions from unconfirmed to confirmed. `CHECKOUT_PAID` establishes the initial interval from its event instant; a same-cycle card confirmation uses `greatest` against its due-date boundary and therefore cannot double it. For monthly Pix, write the one-month interval only when `access_starts_at is null`. For either annual method, write the 12-month interval only when `access_starts_at is null`. Full refunds/chargebacks set the corresponding revoked status and `access_ends_at = least(access_ends_at, statement_timestamp())`. `PAYMENT_PARTIALLY_REFUNDED` marks the event/payment for operational review but leaves contract access unchanged.

- [ ] **Step 4: Add explicit privilege and function-security assertions**

Assert `prosecdef = false`, `service_role` has execute, and `public`, `anon`, and `authenticated` do not. Confirm event payloads are unreadable to both client roles.

- [ ] **Step 5: Verify database and regenerate types**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
```

Expected: PASS and generated functions include `apply_asaas_webhook_event`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations supabase/tests/billing_webhooks.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: reduce Asaas webhooks transactionally"
```

---

### Task 8: Forward-compatible webhook endpoint

**Files:**

- Create: `src/infrastructure/payments/asaas/webhook.schema.ts`
- Create: `src/infrastructure/payments/asaas/webhook.schema.test.ts`
- Create: `src/modules/billing/services/process-asaas-webhook.service.ts`
- Create: `src/modules/billing/services/process-asaas-webhook.service.test.ts`
- Replace commented skeleton: `src/app/api/webhooks/asaas/route.ts`
- Create: `src/app/api/webhooks/asaas/route.test.ts`

**Interfaces:**

- Consumes: Task 1 environment/admin client and Task 7 transactional RPC.
- Produces: redacted `AsaasWebhookEnvelope`, `processAsaasWebhook`, and the live `POST /api/webhooks/asaas` endpoint.

```ts
type AsaasWebhookEnvelope = {
  id: string;
  event: string;
  redactedPayload: Json;
};

function parseAsaasWebhook(
  value: unknown,
): { success: true; event: AsaasWebhookEnvelope } | { success: false };

function hasValidWebhookToken(
  received: string | null,
  expected: string,
): boolean;

async function processAsaasWebhook(input: {
  admin: SupabaseClient<Database>;
  event: AsaasWebhookEnvelope;
}): Promise<"processed" | "duplicate" | "ignored" | "unresolved" | "failed">;
```

- [ ] **Step 1: Inspect and preserve unrelated route work**

Before editing, run:

```bash
git status --short src/app/api/webhooks/asaas/route.ts
sed -n '1,260p' src/app/api/webhooks/asaas/route.ts
```

Expected at planning time: an untracked, entirely commented Prisma/course example. Replace only that known skeleton; stop and review if substantive user code has appeared.

- [ ] **Step 2: Write failing parser and processor tests**

Use real-shaped checkout, payment, and subscription fixtures. Require only nonempty `id`, nonempty `event`, and an object body; use loose nested schemas. Assert extra top-level/nested fields are accepted. Reject arrays, null, missing IDs, and unsafe monetary/date types used by known events. Include a payment fixture with `creditCardNumber`, `creditCardBrand`, and `creditCardToken`, then assert the complete `payment.creditCard` object is absent from `redactedPayload` while payment ID/status/date/value remain.

Mock `admin.rpc` and assert exact forwarding:

```ts
expect(admin.rpc).toHaveBeenCalledWith("apply_asaas_webhook_event", {
  p_event_id: "evt_123",
  p_event_type: "PAYMENT_CONFIRMED",
  p_payload: redactedFixture,
});
```

- [ ] **Step 3: Write failing route security and response tests**

Assert timing-safe token behavior for equal, unequal, missing, and different-length strings. Assert invalid token 401 before JSON parsing; malformed body 400; processed/duplicate/ignored 200; unresolved/failed 503 so Asaas retries. Assert `Cache-Control: no-store`, sanitized bodies, and no token logging.

- [ ] **Step 4: Run focused tests and confirm failure**

```bash
pnpm test src/infrastructure/payments/asaas/webhook.schema.test.ts src/modules/billing/services/process-asaas-webhook.service.test.ts src/app/api/webhooks/asaas/route.test.ts
```

Expected: FAIL because the parser, service, and live route do not exist.

- [ ] **Step 5: Implement parser, processor, and route**

Use `z.looseObject` for forward compatibility. Hash both present tokens to fixed-length buffers before the timing-safe comparison, avoiding length-dependent comparison behavior:

```ts
if (received === null) return false;
const receivedDigest = createHash("sha256").update(received, "utf8").digest();
const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
return timingSafeEqual(receivedDigest, expectedDigest);
```

The route validates the token before calling `request.json()`, constructs the admin client only afterward, and never trusts browser cookies or callback query strings.

- [ ] **Step 6: Run tests and commit**

```bash
pnpm test src/infrastructure/payments/asaas/webhook.schema.test.ts src/modules/billing/services/process-asaas-webhook.service.test.ts src/app/api/webhooks/asaas/route.test.ts
pnpm typecheck
pnpm lint
git add src/infrastructure/payments/asaas/webhook.schema.ts src/infrastructure/payments/asaas/webhook.schema.test.ts src/modules/billing/services/process-asaas-webhook.service.ts src/modules/billing/services/process-asaas-webhook.service.test.ts src/app/api/webhooks/asaas
git commit -m "feat: receive authenticated Asaas webhooks"
```

---

### Task 9: Monthly cancellation service and endpoint

**Files:**

- Create: `src/modules/billing/services/cancel-monthly-billing.service.ts`
- Create: `src/modules/billing/services/cancel-monthly-billing.service.test.ts`
- Create: `src/app/api/billing/cancel/route.ts`
- Create: `src/app/api/billing/cancel/route.test.ts`

**Interfaces:**

- Consumes: Task 1 gateway/admin client and Task 2 monthly credit-card contract persistence.
- Produces: `cancelMonthlyBilling` and `POST /api/billing/cancel` for Task 10.

```ts
type CancelMonthlyBillingResult =
  | { status: "canceled"; accessEndsAt: string }
  | { status: "not_found" | "already_canceled" | "rejected" }
  | { status: "pending_reconciliation" };

async function cancelMonthlyBilling(input: {
  userId: string;
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
  now?: Date;
}): Promise<CancelMonthlyBillingResult>;
```

- [ ] **Step 1: Write failing cancellation tests**

Assert the service selects a monthly credit-card recurring contract using trusted `user_id`, payment/charge type, and active/cancelable status; Pix and annual contracts are never deleted as subscriptions. Assert it writes `cancellation_requested_at`, calls `deleteSubscription` with the stored provider ID, and on success sets:

```ts
{
  status: "cancel_at_period_end",
  cancel_at_period_end: true,
  cancellation_confirmed_at: now.toISOString(),
}
```

Assert `access_ends_at` is unchanged. A timeout leaves access/status intact and returns `pending_reconciliation`; an already canceled contract is idempotent.

- [ ] **Step 2: Write failing endpoint tests**

Assert 401 unauthenticated, 404 no monthly card contract, 200 canceled/already canceled, 422 rejected, and 503 pending reconciliation. The body may include the safe end date but no subscription/customer/provider ID.

- [ ] **Step 3: Run tests and confirm failure**

```bash
pnpm test src/modules/billing/services/cancel-monthly-billing.service.test.ts src/app/api/billing/cancel/route.test.ts
```

Expected: FAIL because cancellation does not exist.

- [ ] **Step 4: Implement cancellation without shortening paid access**

Authenticate first, update only the caller's monthly/card/recurring row, keep the Asaas call outside database transactions, and let later subscription webhooks converge the final state. Do not treat a browser response as a refund or revoke access.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm test src/modules/billing/services/cancel-monthly-billing.service.test.ts src/app/api/billing/cancel/route.test.ts
pnpm typecheck
pnpm lint
git add src/modules/billing/services/cancel-monthly-billing.service.ts src/modules/billing/services/cancel-monthly-billing.service.test.ts src/app/api/billing/cancel
git commit -m "feat: cancel monthly billing safely"
```

---

### Task 10: Billing management, callback, and database-backed pricing UI

**Files:**

- Create: `src/app/(private)/billing/page.tsx`
- Create: `src/app/(private)/billing/page.test.tsx`
- Create: `src/app/(private)/billing/return/page.tsx`
- Create: `src/app/(private)/billing/return/page.test.tsx`
- Create: `src/modules/billing/components/billing-plans.tsx`
- Create: `src/modules/billing/components/billing-plans.test.tsx`
- Create: `src/modules/billing/components/checkout-button.tsx`
- Create: `src/modules/billing/components/checkout-button.test.tsx`
- Create: `src/modules/billing/components/cancel-subscription-button.tsx`
- Create: `src/modules/billing/components/cancel-subscription-button.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/components/landing/landing-experience.tsx`
- Modify: `src/components/landing/landing-experience.css`

**Interfaces:**

- Consumes: Tasks 4–6 overview/prices/Checkout and Task 9 cancellation endpoint.
- Produces: public catalog-backed plans, authenticated `/billing`, provider-return states, plan navigation, and upgrade/cancellation interactions.

```ts
type BillingPlansProps = {
  prices: ActiveBillingPrice[];
  overview?: BillingOverview;
  context: "public" | "account";
};
```

- [ ] **Step 1: Write failing component interaction tests**

Assert the monthly card derives `R$ 49,90/mês` from `amountCents` and includes automatic-renewal/cancellation copy; monthly Pix says one month without renewal. Assert the annual offer derives the exact Global Constraints sentence from `47880 / 12` and distinguishes Pix up front from card installments. Repeat with alternate catalog fixtures (`5990` monthly and `59880` annual) and assert the rendered values change without editing component constants. Assert public CTAs link to `/register`; account CTAs call `POST /api/billing/checkout` with only `{ priceId, paymentMethod }` and assign the returned trusted Checkout URL to `window.location`.

Assert the cancellation button opens the existing accessible `AlertDialog`, describes the exact access end date, disables while pending, and calls `POST /api/billing/cancel` only after confirmation.

- [ ] **Step 2: Write failing server-page and callback tests**

Make `Home` a server component that loads active prices and passes them to `LandingExperience`; update its test to `render(await Home())` with a mocked catalog service. Assert a catalog failure keeps the free plan visible and shows paid pricing as temporarily unavailable rather than falling back to hardcoded amounts.

For `/billing`, assert active customers see their plan, payment method, access end, and cancellation control only for monthly card recurrence; free customers see both paid offers and their method-specific actions. For callback outcomes `success`, `canceled`, and `expired`, assert the page reads server billing state and:

- success + pending contract says `Confirmando pagamento`;
- success + active contract says `Pagamento confirmado`;
- callback success without active server state never claims paid access;
- canceled/expired outcomes return to plan selection.

- [ ] **Step 3: Run focused UI tests and confirm failure**

```bash
pnpm test src/modules/billing/components 'src/app/(private)/billing/page.test.tsx' 'src/app/(private)/billing/return/page.test.tsx' src/components/layout/app-sidebar.test.tsx src/app/page.test.tsx
```

Expected: FAIL because billing UI and dynamic prices are absent.

- [ ] **Step 4: Implement account billing and provider-return states**

Compose both pages from `requireUser`, `listActivePrices`, and `getBillingOverview`. Add a `Plano` navigation item pointing to `/billing`. The Checkout client handles only safe public IDs/URLs; access state always comes from a new server render after webhook processing.

- [ ] **Step 5: Replace the three static landing cards with free/monthly/annual offers**

Change `LandingExperience` to accept active prices as props. Preserve its current visual language and responsive layout, but render:

- Free: one quick diagnosis and one readable report;
- Monthly: unlimited diagnoses, R$ 49.90; card renews automatically and can be canceled, while Pix grants one non-renewing month;
- Annual: unlimited diagnoses, total R$ 478.80; Pix up front or card in up to 12 installments, with no automatic renewal.

Do not advertise AI-generated interpretation unless that feature is actually available to the paid tier in this release.

- [ ] **Step 6: Run UI, accessibility, and regression checks**

```bash
pnpm test src/modules/billing/components 'src/app/(private)/billing' src/components/layout/app-sidebar.test.tsx src/app/page.test.tsx 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx'
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: PASS with no duplicate heading, inaccessible dialog, or hardcoded paid price in `landing-experience.tsx`.

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(private)/billing' src/modules/billing/components src/components/layout src/app/page.tsx src/app/page.test.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css
git commit -m "feat: add billing and upgrade journeys"
```

---

### Task 11: Operational runbook and end-to-end release verification

**Files:**

- Create: `docs/asaas-billing-runbook.md`
- Modify: `README.md` if it contains local setup/environment instructions; otherwise leave it unchanged
- Modify: `src/app/api/health/route.test.ts`

**Interfaces:**

- Consumes: every database, route, service, and UI deliverable from Tasks 1–10.
- Produces: the production/sandbox runbook, complete automated gate, recorded sandbox matrix, and release decision.

The runbook records no secret values. It names the required Asaas events:

```text
CHECKOUT_CREATED
CHECKOUT_PAID
CHECKOUT_CANCELED
CHECKOUT_EXPIRED
PAYMENT_CREATED
PAYMENT_CONFIRMED
PAYMENT_RECEIVED
PAYMENT_CREDIT_CARD_CAPTURE_REFUSED
PAYMENT_OVERDUE
PAYMENT_REFUNDED
PAYMENT_PARTIALLY_REFUNDED
PAYMENT_CHARGEBACK_REQUESTED
PAYMENT_CHARGEBACK_DISPUTE
SUBSCRIPTION_CREATED
SUBSCRIPTION_UPDATED
SUBSCRIPTION_INACTIVATED
SUBSCRIPTION_DELETED
```

- [ ] **Step 1: Extend the secret-leak health test**

Stub all three billing secrets and assert none appears in the health response:

```ts
vi.stubEnv("SUPABASE_SECRET_KEY", "supabase-secret");
vi.stubEnv("ASAAS_API_KEY", "asaas-api-secret");
vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "asaas-webhook-secret");
expect(JSON.stringify(body)).not.toMatch(
  /supabase-secret|asaas-api-secret|asaas-webhook-secret/,
);
```

- [ ] **Step 2: Write the operational runbook**

Document separate sandbox/production variables, webhook URL `/api/webhooks/asaas`, a webhook token of at least 32 random characters distinct from the API key, sequential delivery, the exact event list, secret rotation, queue-paused recovery within Asaas's 14-day retention, and log fields limited to event/contract/provider IDs plus safe error category. Set the local redacted-payload retention to 180 days: purge only `processed`/`ignored` rows older than the cutoff, retain `failed` rows until reconciled, and record each maintenance execution.

Include these release exercises with recorded event IDs and local contract IDs:

1. monthly card Checkout paid, renewal confirmation, cancellation, and paid-period expiry;
2. monthly Pix Checkout paid once, granting exactly one month with no renewal;
3. annual Pix paid up front plus annual card paid once in 1x and once in 12x, each granting exactly 12 months;
4. duplicate delivery, out-of-order `PAYMENT_RECEIVED`, full refund, and chargeback;
5. success callback arriving before webhook;
6. forced provider timeout followed by webhook/manual reconciliation;
7. free first report, blocked second report, paid unlock, expiry lock, and resubscription unlock.

Document replay as calling the same `apply_asaas_webhook_event` RPC with the original stored ID/payload after correcting the mapping; never edit access dates manually without an auditable incident record.

- [ ] **Step 3: Run the complete automated gate**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
pnpm check
pnpm build
```

Expected: every command PASS and database type generation produces no diff.

- [ ] **Step 4: Execute the sandbox release matrix**

Follow the seven runbook exercises against Asaas sandbox. For each, verify the browser state, `billing_contracts`, `billing_payments`, `asaas_webhook_events`, and report visibility. Do not enable production CTAs until all seven are recorded as successful.

- [ ] **Step 5: Review the final diff for security and scope**

```bash
git diff --check HEAD~10..HEAD
rg -n "ASAAS_API_KEY|ASAAS_WEBHOOK_TOKEN|SUPABASE_SECRET_KEY" src --glob '!*.test.ts' --glob '!*.test.tsx'
rg -n "49,90|478,80|39,90" src/components/landing src/modules/billing
git status --short
```

Expected: no whitespace errors; secrets are read only from server-only configuration; paid amounts originate from catalog-backed props/services; only known user work remains uncommitted.

- [ ] **Step 6: Commit documentation and final test adjustment**

```bash
git add docs/asaas-billing-runbook.md src/app/api/health/route.test.ts README.md
git commit -m "docs: add Asaas billing operations runbook"
```

If `README.md` was not changed, omit it from `git add`.
