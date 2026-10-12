# Launch Offer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a server-authoritative 15-day launch offer with timed catalog switching, two/twelve-month promotional access, safe Asaas recurrence handling, and responsive public/private countdown messaging.

**Architecture:** A pure launch-window resolver turns the server-only `LAUNCH_OFFER_START_AT` value into a selected immutable Supabase catalog. Checkout snapshots those terms and permits only the server-selected catalog, while a separate idempotent renewal-adjustment workflow converts the promotional monthly subscription from its safe two-month initial cadence to ordinary monthly renewal. Landing and authenticated UI consume only the safe selected-offer projection and never decide eligibility.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Vitest, Supabase/Postgres with pgTAP and RLS, Asaas Checkout/Webhooks, CSS Modules/Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-10-12-launch-offer-design.md`

## Global Constraints

- `LAUNCH_OFFER_START_AT` is server-only and accepts an ISO 8601 instant with an explicit `Z` or `±HH:MM` offset.
- The launch interval is start-inclusive and end-exclusive, ending exactly `15 * 24 * 60 * 60 * 1000` milliseconds after the configured start.
- Missing configuration selects `standard`; present-but-invalid configuration makes paid offers and Checkout unavailable.
- Launch monthly is 3990 cents, one bonus month, two initial access months, then monthly recurrence; standard monthly is 4990 cents and one access month.
- Launch semiannual is 17940 cents, maximum six card installments, six bonus months, and twelve access months; standard semiannual is 23940 cents, maximum six installments, and six access months.
- Semiannual card payment permits any choice from one through six installments; copy must use “em até 6x”, never imply six installments are mandatory.
- A promotional Checkout created before the deadline remains reusable only for its stored one-hour validity; no new promotional Checkout may be created at or after the deadline.
- The browser controls no amount, access duration, bonus, catalog code, campaign deadline, recurrence cycle, user ID, or provider ID.
- All customer-facing copy remains Brazilian Portuguese; code and technical identifiers remain English.
- Preserve the existing seven-day refund policy, RLS/grant posture, webhook token verification, provider-payload redaction, and event-ledger idempotency.
- Preserve every existing contract snapshot. The migration must abort if `billing_contracts` is nonempty; resolving unexpected pre-launch contracts requires an explicit data-migration decision rather than silently changing purchased terms.
- Do not modify historical migration files. Create this imperative migration with `pnpm exec supabase migration new add_launch_offer_catalog` and use the exact path printed by the CLI.
- Follow the current Supabase guidance verified on 2026-10-12: explicit table grants plus RLS, role-specific policies, `(select auth.uid())` in ownership policies, pgTAP negative cases, and local reset verification.

## File Structure

- `src/modules/billing/domain/launch-offer.ts`: pure campaign parsing and boundary resolution.
- `src/config/launch-offer-environment.ts`: server-only environment adapter.
- CLI-generated `supabase/migrations/*_add_launch_offer_catalog.sql`: immutable catalog, contract snapshots, renewal-adjustment state/RPCs, and access-duration reducer changes.
- `src/modules/billing/services/list-active-prices.service.ts`: catalog-code-filtered public price projection.
- `src/modules/billing/services/create-hosted-checkout.service.ts`: pending-Checkout reuse before current-catalog validation and complete contract snapshots.
- `src/infrastructure/payments/asaas/asaas.client.ts`: typed subscription-update operation.
- `src/modules/billing/services/adjust-launch-renewal.service.ts`: idempotent claim/provider/result orchestration.
- `src/modules/billing/components/offer-countdown.tsx`: accessible deadline display and expiry refresh.
- `src/components/landing/launch-offer-callout.tsx`: first-viewport promotional message.
- `src/modules/billing/components/launch-offer-strip.tsx`: authenticated pre/post-diagnosis strip.
- Existing landing, pricing, layout, seed, runbook, and test files: integration points only; do not redesign unrelated surfaces.

---

### Task 1: Resolve the launch window from server-only configuration

**Files:**
- Create: `src/modules/billing/domain/launch-offer.ts`
- Create: `src/modules/billing/domain/launch-offer.test.ts`
- Create: `src/config/launch-offer-environment.ts`
- Create: `src/config/launch-offer-environment.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `BillingCatalogCode = "launch" | "standard"`.
- Produces: `LaunchOfferResolution`, a discriminated union with `phase`, `catalogCode`, `startsAt`, and `endsAt`.
- Produces: `resolveLaunchOffer({ rawStartAt, now }): LaunchOfferResolution`.
- Produces: `readLaunchOfferEnvironment(env?, now?): LaunchOfferResolution`.
- Consumes: no database or browser state.

- [ ] **Step 1: Write boundary-first domain tests**

Create tests with this exact table and assertions:

```ts
const start = "2026-10-20T09:00:00-03:00";
const cases = [
  [undefined, "2026-10-20T12:00:00.000Z", "disabled", "standard"],
  ["", "2026-10-20T12:00:00.000Z", "invalid", null],
  ["2026-10-20", "2026-10-20T12:00:00.000Z", "invalid", null],
  [start, "2026-10-20T11:59:59.999Z", "scheduled", "standard"],
  [start, "2026-10-20T12:00:00.000Z", "active", "launch"],
  [start, "2026-11-04T11:59:59.999Z", "active", "launch"],
  [start, "2026-11-04T12:00:00.000Z", "expired", "standard"],
] as const;

it.each(cases)("resolves %s at %s as %s", (rawStartAt, now, phase, catalogCode) => {
  expect(resolveLaunchOffer({ rawStartAt, now: new Date(now) })).toMatchObject({
    phase,
    catalogCode,
  });
});
```

Also assert that active resolution returns normalized `startsAt` equal to
`2026-10-20T12:00:00.000Z` and `endsAt` equal to
`2026-11-04T12:00:00.000Z`, and that a non-finite `Date` resolves to `invalid`.

- [ ] **Step 2: Run the new domain test and verify it fails**

Run:

```bash
pnpm test src/modules/billing/domain/launch-offer.test.ts
```

Expected: FAIL because `launch-offer.ts` does not exist.

- [ ] **Step 3: Implement the pure resolver**

Use these public shapes and constants:

```ts
type BillingCatalogCode = "launch" | "standard";
type LaunchOfferResolution =
  | {
      phase: "disabled" | "scheduled" | "expired";
      catalogCode: "standard";
      startsAt: string | null;
      endsAt: string | null;
    }
  | {
      phase: "active";
      catalogCode: "launch";
      startsAt: string;
      endsAt: string;
    }
  | {
      phase: "invalid";
      catalogCode: null;
      startsAt: null;
      endsAt: null;
    };

const LAUNCH_OFFER_DURATION_MS = 15 * 24 * 60 * 60 * 1000;
const explicitOffsetPattern = /(Z|[+-]\d{2}:\d{2})$/;
```

`resolveLaunchOffer` must treat `undefined` as disabled, reject an empty string
and offsets without a colon, compare epoch milliseconds, and return ISO strings.
Do not read `process.env` in this pure module.

- [ ] **Step 4: Test the server-only adapter and example declaration**

In `launch-offer-environment.test.ts`, mock `server-only`, inject a plain object,
and assert:

```ts
expect(
  readLaunchOfferEnvironment(
    { LAUNCH_OFFER_START_AT: start },
    () => new Date("2026-10-20T12:00:00.000Z"),
  ),
).toMatchObject({ phase: "active", catalogCode: "launch" });

expect(readLaunchOfferEnvironment({}, () => new Date())).toMatchObject({
  phase: "disabled",
  catalogCode: "standard",
});
```

Read `.env.example` and assert it contains only the commented example:

```ts
expect(example).toContain(
  "# LAUNCH_OFFER_START_AT=2026-10-20T09:00:00-03:00",
);
expect(example).not.toMatch(/^LAUNCH_OFFER_START_AT=/m);
```

- [ ] **Step 5: Implement the adapter and document the variable**

`launch-offer-environment.ts` must contain:

```ts
import "server-only";

import { resolveLaunchOffer } from "@/modules/billing/domain/launch-offer";

function readLaunchOfferEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  now: () => Date = () => new Date(),
) {
  return resolveLaunchOffer({
    rawStartAt: env.LAUNCH_OFFER_START_AT,
    now: now(),
  });
}

export { readLaunchOfferEnvironment };
```

Add a Portuguese comment and the commented example under the Asaas variables in
`.env.example`. Do not use a `NEXT_PUBLIC_` name.

- [ ] **Step 6: Run focused tests and commit**

Run:

```bash
pnpm test src/modules/billing/domain/launch-offer.test.ts src/config/launch-offer-environment.test.ts
```

Expected: PASS.

Commit:

```bash
git add .env.example src/config/launch-offer-environment.ts src/config/launch-offer-environment.test.ts src/modules/billing/domain/launch-offer.ts src/modules/billing/domain/launch-offer.test.ts
git commit -m "feat: resolve launch offer window"
```

---

### Task 2: Add immutable launch and standard catalog snapshots

**Files:**
- Create: migration emitted by `pnpm exec supabase migration new add_launch_offer_catalog`
- Modify: `supabase/tests/billing_schema.test.sql`
- Modify: `supabase/tests/billing_webhooks.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts` (generated)

**Interfaces:**
- Consumes: `BillingCatalogCode` values `launch` and `standard` from Task 1.
- Produces: `billing_prices.catalog_code`, `billing_prices.bonus_months`.
- Produces: `billing_contracts.catalog_code`, `billing_contracts.bonus_months`, `renewal_adjustment_status`, `renewal_adjustment_attempt_count`, `renewal_adjusted_at`, and `renewal_adjustment_last_error_code`.
- Produces: service-role RPCs `begin_billing_renewal_adjustment(text)` and `record_billing_renewal_adjustment_result(uuid,text,text)`.

- [ ] **Step 1: Verify the imperative migration workflow and create the file**

Run:

```bash
pnpm exec supabase migration new add_launch_offer_catalog
```

Expected: the CLI prints one empty migration path ending in
`_add_launch_offer_catalog.sql`. Use that exact emitted path throughout this
task.

- [ ] **Step 2: Extend pgTAP schema expectations before SQL implementation**

In `billing_schema.test.sql`, increase `plan(...)` for every new assertion and
assert these exact catalog tuples:

```sql
select results_eq(
  $$
    select catalog_code, billing_mode, amount_cents, installment_limit,
           access_months, bonus_months, is_active
    from public.billing_prices
    order by catalog_code, billing_mode
  $$,
  $$ values
    ('launch'::text, 'monthly'::text, 3990::bigint, null::integer, 2, 1, true),
    ('launch'::text, 'semiannual'::text, 17940::bigint, 6, 12, 6, true),
    ('standard'::text, 'monthly'::text, 4990::bigint, null::integer, 1, 0, true),
    ('standard'::text, 'semiannual'::text, 23940::bigint, 6, 6, 0, true)
  $$,
  'both immutable catalogs expose the approved commercial terms'
);
```

Add negative `throws_ok` cases for mismatched amount/access/bonus/catalog,
updates to the new price columns, an invalid renewal status, and a promotional
monthly contract without one bonus month. Assert the active unique index is now
`billing_prices_one_active_catalog_mode_idx`. Assert `anon` and `authenticated`
retain SELECT only, while direct contract mutation remains denied.

In `billing_webhooks.test.sql`, add promotional monthly Pix, monthly card,
semiannual Pix, and semiannual card fixtures. Assert initial access ends at
`event instant + make_interval(months => access_months)` and repeated events do
not extend it again.

- [ ] **Step 3: Run the database tests and verify the new assertions fail**

Run:

```bash
pnpm exec supabase test db --local supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql
```

Expected: FAIL on missing catalog/snapshot/renewal columns and old 1/6-month
activation behavior.

- [ ] **Step 4: Write the catalog and snapshot migration**

In the CLI-generated migration, perform these operations in order:

```sql
do $guard$
begin
  if exists (select 1 from public.billing_contracts) then
    raise exception using
      errcode = '55000',
      message = 'launch catalog migration requires an empty billing_contracts table';
  end if;
end
$guard$;

drop trigger if exists billing_prices_prevent_commercial_update
on public.billing_prices;

alter table public.billing_prices
  add column catalog_code text,
  add column bonus_months integer;

update public.billing_prices
set catalog_code = 'launch',
    access_months = case billing_mode when 'monthly' then 2 else 12 end,
    bonus_months = case billing_mode when 'monthly' then 1 else 6 end;

alter table public.billing_prices
  alter column catalog_code set not null,
  alter column bonus_months set not null,
  alter column bonus_months set default 0;

drop index public.billing_prices_one_active_mode_idx;
alter table public.billing_prices
  drop constraint billing_prices_catalog_shape_check;

alter table public.billing_prices
  add constraint billing_prices_catalog_code_check
    check (catalog_code in ('launch', 'standard')),
  add constraint billing_prices_bonus_months_check
    check (bonus_months >= 0),
  add constraint billing_prices_catalog_shape_check check (
    (
      catalog_code = 'launch'
      and billing_mode = 'monthly'
      and amount_cents = 3990
      and installment_limit is null
      and access_months = 2
      and bonus_months = 1
    )
    or (
      catalog_code = 'launch'
      and billing_mode = 'semiannual'
      and amount_cents = 17940
      and installment_limit = 6
      and access_months = 12
      and bonus_months = 6
    )
    or (
      catalog_code = 'standard'
      and billing_mode = 'monthly'
      and amount_cents = 4990
      and installment_limit is null
      and access_months = 1
      and bonus_months = 0
    )
    or (
      catalog_code = 'standard'
      and billing_mode = 'semiannual'
      and amount_cents = 23940
      and installment_limit = 6
      and access_months = 6
      and bonus_months = 0
    )
  );

create unique index billing_prices_one_active_catalog_mode_idx
on public.billing_prices (product_code, catalog_code, billing_mode)
where is_active;
```

Insert deterministic standard IDs `20000000-0000-4000-8000-000000000003`
(monthly, version 2) and `20000000-0000-4000-8000-000000000004`
(semiannual, version 2).

Replace `private.prevent_billing_price_commercial_update()` so its immutable
comparison also includes `catalog_code` and `bonus_months`, then recreate the
trigger.

Add required contract snapshot columns. The guard above ensures this does not
rewrite any purchased terms:

```sql
alter table public.billing_contracts
  add column catalog_code text not null,
  add column bonus_months integer not null default 0,
  add column renewal_adjustment_status text not null default 'not_required',
  add column renewal_adjustment_attempt_count integer not null default 0,
  add column renewal_adjusted_at timestamptz,
  add column renewal_adjustment_last_error_code text;
```

Drop and recreate `billing_contracts_snapshot_shape_check` with the same four
commercial branches plus the existing installment divisibility rule. Add:

```sql
constraint billing_contracts_renewal_adjustment_check check (
  (
    catalog_code = 'launch'
    and billing_mode = 'monthly'
    and payment_method = 'credit_card'
    and charge_type = 'recurring'
    and renewal_adjustment_status in (
      'pending', 'processing', 'completed', 'pending_reconciliation'
    )
  )
  or (
    not (
      catalog_code = 'launch'
      and billing_mode = 'monthly'
      and payment_method = 'credit_card'
      and charge_type = 'recurring'
    )
    and renewal_adjustment_status = 'not_required'
    and renewal_adjustment_attempt_count = 0
    and renewal_adjusted_at is null
    and renewal_adjustment_last_error_code is null
  )
)
```

Constrain attempts to nonnegative and error codes to null or
`provider_rejected`, `provider_ambiguous`, `state_persist_failed`. Create a
partial operations index on `(updated_at)` where renewal status is `pending`,
`processing`, or `pending_reconciliation`.

- [ ] **Step 5: Add service-role renewal claim/result RPCs**

Create `public.begin_billing_renewal_adjustment(p_event_id text) returns jsonb`
as `security invoker`, `set search_path = ''`, executable only by
`service_role`. It resolves the event ledger's `contract_id`, locks that
contract, and returns one of:

```json
{"status":"not_required"}
{"status":"not_ready","retry":true}
{"status":"completed"}
{"status":"ready","contractId":"uuid","subscriptionId":"sub_x","nextDueDate":"2026-12-20"}
```

`ready` requires launch monthly/card/recurring, a stored subscription ID,
activated access, and the earliest stored confirmed/received payment due date
for that contract. Compute the date from that due date, not from webhook arrival
time:

```sql
(initial_payment.due_date + interval '2 months')::date
```

Return `not_ready` when either prerequisite event has not been reduced yet.
Add pgTAP coverage where `access_starts_at` is a different calendar date from
the initial due date and assert that the due date wins.

Atomically set `renewal_adjustment_status = 'processing'`, increment attempts,
clear the previous error, and update `updated_at` before returning `ready`.
Allow a new claim from `pending` or `pending_reconciliation`. Return
`not_ready` with `retry: true` while `processing` is younger than five minutes.
Treat older `processing` rows as a stale lease and atomically claim them again;
repeating the same provider update is safe because cycle and next due date are
absolute target values.

Create
`public.record_billing_renewal_adjustment_result(p_contract_id uuid,
p_status text, p_error_code text) returns boolean` with the same security
posture. Permit only `completed` and `pending_reconciliation`. Completed sets
`renewal_adjusted_at = transaction_timestamp()` and clears the error;
reconciliation requires an allow-listed error. Match only a contract currently
in `processing`.

Explicitly revoke function execution from `public`, `anon`, and
`authenticated`; grant only to `service_role`.

- [ ] **Step 6: Make webhook access duration snapshot-driven**

Copy the current complete `public.apply_asaas_webhook_event` definition into
the new migration and change only the duration expressions:

```sql
-- Monthly credit-card confirmed payment:
v_new_access_end := (
  v_payment_due_date::text || ' 00:00:00+00'
)::timestamptz + case
  when v_contract.access_starts_at is null then
    make_interval(months => v_contract.access_months)
  else interval '1 month'
end;

-- Monthly Pix initial activation:
access_ends_at = v_event_at + make_interval(months => access_months)

-- Semiannual initial activation:
access_ends_at = v_event_at + make_interval(months => access_months)
```

Keep the existing `CHECKOUT_PAID` snapshot-driven expression, payment ledger,
refund, cancellation, locking, and event-order logic unchanged. Ensure the
first monthly-card payment cannot shorten an interval already set to two months
by `CHECKOUT_PAID`; later payments add only one month from their due date.

- [ ] **Step 7: Reset locally, run pgTAP, lint/advisors, and regenerate types**

Run:

```bash
pnpm exec supabase db reset --local
pnpm exec supabase test db --local supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/billing_access.test.sql supabase/tests/billing_refunds.test.sql
pnpm run supabase:lint
pnpm run supabase:advisors
pnpm run supabase:types
git diff --check
```

Expected: all tests pass; advisors have no error-level finding; generated types
contain the six new columns and both RPC signatures.

- [ ] **Step 8: Commit the schema slice**

Commit the CLI-emitted migration path together with tests and generated types:

```bash
git add supabase/migrations/*_add_launch_offer_catalog.sql supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add immutable launch offer catalog"
```

---

### Task 3: Select the current catalog and snapshot it at Checkout

**Files:**
- Modify: `src/modules/billing/types.ts`
- Modify: `src/modules/billing/services/list-active-prices.service.ts`
- Modify: `src/modules/billing/services/list-active-prices.service.test.ts`
- Modify: `src/modules/billing/services/create-hosted-checkout.service.ts`
- Modify: `src/modules/billing/services/create-hosted-checkout.service.test.ts`
- Modify: `src/app/api/billing/checkout/route.ts`
- Modify: `src/app/api/billing/checkout/route.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/(private)/billing/page.tsx`
- Modify: `src/app/(private)/billing/return/page.tsx`
- Modify: corresponding page tests

**Interfaces:**
- Consumes: `LaunchOfferResolution` and database columns from Tasks 1–2.
- Produces: `ActiveBillingPrice.catalogCode` and `.bonusMonths`.
- Changes: `listActivePrices({ supabase, catalogCode })` requires an explicit catalog.
- Changes: `createHostedCheckout` requires `catalogCode` and snapshots it with `bonus_months`.

- [ ] **Step 1: Write catalog-selection tests**

Update fixtures to include `catalog_code` and `bonus_months`. Assert
`ACTIVE_BILLING_PRICE_COLUMNS` is exactly:

```ts
"id, product_code, catalog_code, billing_mode, amount_cents, currency, installment_limit, access_months, bonus_months"
```

Call `listActivePrices({ supabase, catalogCode: "launch" })` and assert query
filters are `is_active = true`, `product_code = quick_diagnosis_pro`, and
`catalog_code = launch`. Test all approved launch and standard shapes, missing
modes, duplicate modes, and a launch row carrying standard terms.

- [ ] **Step 2: Write Checkout ordering and snapshot tests**

Add cases proving:

1. a same-user, unexpired pending promotional Checkout is reused after the
   selected catalog becomes `standard`, without reading current prices;
2. a promotional price ID with no matching pending contract is rejected after
   expiry;
3. a different pending Checkout is canceled before a standard Checkout is
   created;
4. inserted launch monthly snapshots contain:

```ts
{
  catalog_code: "launch",
  amount_cents: 3990,
  access_months: 2,
  bonus_months: 1,
  renewal_adjustment_status: "pending",
}
```

5. launch semiannual snapshots contain twelve access months, six bonus months,
   and `renewal_adjustment_status: "not_required"`.

- [ ] **Step 3: Run service tests and verify failure**

Run:

```bash
pnpm test src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.test.ts
```

Expected: FAIL on old types, missing catalog filter, old query ordering, and
missing snapshot fields.

- [ ] **Step 4: Implement typed catalog normalization**

Extend `ActiveBillingPrice`:

```ts
type ActiveBillingPrice = {
  id: string;
  productCode: "quick_diagnosis_pro";
  catalogCode: BillingCatalogCode;
  billingMode: BillingMode;
  amountCents: number;
  currency: "BRL";
  installmentLimit: number | null;
  accessMonths: number;
  bonusMonths: number;
};
```

Normalize only the four approved shapes. Filter `catalog_code` in Supabase and
continue requiring exactly one monthly and one semiannual result.

- [ ] **Step 5: Reorder Checkout validation and persist complete snapshots**

In `createHostedCheckout`, after validating method and `now`:

1. read the user's contracts;
2. reject active paid/refund reconciliation states;
3. reuse a valid same-price/same-method pending Checkout before reading the
   current catalog;
4. read only the current `catalogCode`;
5. reject a price ID absent from that catalog;
6. cancel a different usable pending Checkout;
7. expire stale pending rows;
8. insert the complete selected price snapshot.

Set renewal state with:

```ts
const needsLaunchRenewalAdjustment =
  price.catalogCode === "launch" &&
  price.billingMode === "monthly" &&
  paymentMethod === "credit_card";
```

Never accept `catalogCode`, access months, or bonus months from the API body.

- [ ] **Step 6: Resolve the catalog independently in server routes/pages**

The Checkout route must call `readLaunchOfferEnvironment()` after authentication
and body validation. Return 503 `service_unavailable` for `phase: "invalid"`;
otherwise pass only its server-derived `catalogCode` into the service.

Home, billing, and billing-return pages must resolve the same state and call
`listActivePrices` only when `catalogCode` is non-null. Pass an empty price list
for invalid configuration so the free/unavailable UI remains renderable. Do not
add a public environment variable. Emit only the structured event name
`launch_offer_configuration_invalid` when configuration is invalid; never log
the raw value. Assert the log contract in route/page tests.

Export `dynamic = "force-dynamic"` from the public landing page so its server
catalog cannot be statically retained across the start or end boundary. The
countdown refresh in Task 6 must therefore obtain a fresh server decision.

- [ ] **Step 7: Run all affected application tests and commit**

Run:

```bash
pnpm test src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.test.ts src/app/page.test.tsx 'src/app/(private)/billing/page.test.tsx' 'src/app/(private)/billing/return/page.test.tsx'
pnpm typecheck
```

Expected: PASS.

Commit:

```bash
git add src/modules/billing/types.ts src/modules/billing/services/list-active-prices.service.ts src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/services/create-hosted-checkout.service.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.ts src/app/api/billing/checkout/route.test.ts src/app/page.tsx src/app/page.test.tsx 'src/app/(private)/billing/page.tsx' 'src/app/(private)/billing/page.test.tsx' 'src/app/(private)/billing/return/page.tsx' 'src/app/(private)/billing/return/page.test.tsx'
git commit -m "feat: enforce current launch catalog at checkout"
```

---

### Task 4: Model promotional recurrence and flexible semiannual installments in Asaas

**Files:**
- Modify: `src/infrastructure/payments/asaas/asaas.client.ts`
- Modify: `src/infrastructure/payments/asaas/asaas.client.test.ts`
- Modify: `src/modules/billing/domain/build-checkout-request.ts`
- Modify: `src/modules/billing/domain/build-checkout-request.test.ts`

**Interfaces:**
- Consumes: `ActiveBillingPrice.catalogCode`, `.accessMonths`, and `.bonusMonths`.
- Produces: `AsaasGateway.updateSubscriptionRenewal(id, input)`.
- Produces: `AsaasSubscriptionRenewalInput = { cycle: "MONTHLY"; nextDueDate: string }`.
- Produces: promotional monthly Checkout subscription cycle `BIMONTHLY`; all later renewal updates use `MONTHLY`.

- [ ] **Step 1: Write provider-boundary tests**

Assert launch monthly card builds:

```ts
expect(checkout).toMatchObject({
  billingTypes: ["CREDIT_CARD"],
  chargeTypes: ["RECURRENT"],
  subscription: { cycle: "BIMONTHLY", nextDueDate: "2026-10-20" },
  items: [{ value: 39.9, description: "Acesso inicial ao Lucrivo por 2 meses" }],
});
```

Assert standard monthly remains `MONTHLY`, launch semiannual remains
`maxInstallmentCount: 6`, and no payload contains a selected installment count.

Add gateway tests that `updateSubscriptionRenewal("sub/123", input)` sends:

```ts
{
  method: "PUT",
  headers: {
    access_token: "asaas-api-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    cycle: "MONTHLY",
    nextDueDate: "2026-12-20",
    updatePendingPayments: true,
  }),
}
```

to `/v3/subscriptions/sub%2F123` and rejects mismatched ID, cycle, date, malformed
JSON, 408/429/5xx, and definitive 4xx through the existing error classifier.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
pnpm test src/modules/billing/domain/build-checkout-request.test.ts src/infrastructure/payments/asaas/asaas.client.test.ts
```

Expected: FAIL because `BIMONTHLY` and `updateSubscriptionRenewal` are absent.

- [ ] **Step 3: Extend the narrow Asaas types and gateway**

Permit Checkout subscription cycles `MONTHLY | BIMONTHLY`. Add:

```ts
type AsaasSubscriptionRenewalInput = {
  cycle: "MONTHLY";
  nextDueDate: string;
};

interface AsaasGateway {
  createCheckout(input: AsaasCheckoutRequest): Promise<AsaasCheckout>;
  cancelCheckout(id: string): Promise<{ id: string; status: "CANCELED" }>;
  updateSubscriptionRenewal(
    id: string,
    input: AsaasSubscriptionRenewalInput,
  ): Promise<{ id: string; cycle: "MONTHLY"; nextDueDate: string }>;
  deleteSubscription(id: string): Promise<{ id: string; deleted: true }>;
  refundPayment(id: string): Promise<{ id: string }>;
  refundInstallment(id: string): Promise<{ id: string }>;
}
```

Validate the response with a loose Zod object containing matching `id`, literal
`MONTHLY`, and ISO date. Always send `updatePendingPayments: true` so an already
generated future charge cannot remain one month early.

- [ ] **Step 4: Build exact Checkout cadence and copy**

For launch monthly card use `BIMONTHLY`; for standard monthly card use
`MONTHLY`. Both charge immediately with `nextDueDate: today`. Keep Pix detached.
For semiannual card keep `DETACHED` plus `INSTALLMENT` and
`maxInstallmentCount: 6`; this is a maximum, not a chosen count.

Derive item descriptions from snapshotted access months:

```ts
const description =
  price.billingMode === "monthly"
    ? `Acesso inicial ao Lucrivo por ${price.accessMonths} ${price.accessMonths === 1 ? "mês" : "meses"}`
    : `Acesso ao Lucrivo por ${price.accessMonths} meses`;
```

- [ ] **Step 5: Run focused tests, typecheck, and commit**

Run:

```bash
pnpm test src/modules/billing/domain/build-checkout-request.test.ts src/infrastructure/payments/asaas/asaas.client.test.ts
pnpm typecheck
```

Expected: PASS.

Commit:

```bash
git add src/infrastructure/payments/asaas/asaas.client.ts src/infrastructure/payments/asaas/asaas.client.test.ts src/modules/billing/domain/build-checkout-request.ts src/modules/billing/domain/build-checkout-request.test.ts
git commit -m "feat: model launch billing cadence"
```

---

### Task 5: Reconcile promotional monthly renewal through verified webhooks

**Files:**
- Create: `src/modules/billing/services/adjust-launch-renewal.service.ts`
- Create: `src/modules/billing/services/adjust-launch-renewal.service.test.ts`
- Modify: `src/modules/billing/services/process-asaas-webhook.service.ts`
- Modify: `src/modules/billing/services/process-asaas-webhook.service.test.ts`
- Modify: `src/app/api/webhooks/asaas/route.ts`
- Modify: `src/app/api/webhooks/asaas/route.test.ts`

**Interfaces:**
- Consumes: Task 2 RPCs and Task 4 `AsaasGateway.updateSubscriptionRenewal`.
- Produces: `adjustLaunchRenewal({ admin, asaas, eventId }): Promise<"not_required" | "completed" | "retry_later">`.
- Changes: `processAsaasWebhook({ admin, asaas, event })` retries renewal adjustment after both `processed` and `duplicate` reducer outcomes.

- [ ] **Step 1: Write renewal orchestration tests**

Mock the claim RPC with each exact result. For `ready`, assert the gateway call
precedes the result RPC:

```ts
expect(updateSubscriptionRenewal).toHaveBeenCalledWith("sub_123", {
  cycle: "MONTHLY",
  nextDueDate: "2026-12-20",
});
expect(rpc).toHaveBeenLastCalledWith(
  "record_billing_renewal_adjustment_result",
  {
    p_contract_id: "10000000-0000-4000-8000-000000000001",
    p_status: "completed",
    p_error_code: null,
  },
);
```

For `AsaasGatewayError("rejected")`, record `pending_reconciliation` with
`provider_rejected`; for ambiguous errors record `provider_ambiguous`. If the
result RPC fails after provider success, return `retry_later` and emit one
sanitized JSON log containing only event name and contract ID.

Update webhook service tests so a duplicate database event still claims the
adjustment, while ignored/unresolved events do not mutate the provider.

- [ ] **Step 2: Run the new and affected tests and verify failure**

Run:

```bash
pnpm test src/modules/billing/services/adjust-launch-renewal.service.test.ts src/modules/billing/services/process-asaas-webhook.service.test.ts src/app/api/webhooks/asaas/route.test.ts
```

Expected: FAIL on the missing service and gateway dependency.

- [ ] **Step 3: Implement strict claim parsing and provider orchestration**

Use a Zod discriminated union for `not_required`, `not_ready`, `completed`, and
`ready`; `ready` requires UUID contract ID, nonempty subscription ID, and ISO
date. Call:

```ts
admin.rpc("begin_billing_renewal_adjustment", { p_event_id: eventId })
```

Map both `not_required` and `completed` to local `not_required`. Accept
`not_ready` only with literal `retry: true` and map it to `retry_later`. For
non-promotional events, the RPC returns `{"status":"not_required"}`.

After a ready provider call, persist `completed`. After either provider error
kind, persist `pending_reconciliation` and return `retry_later` so Asaas retries
the event. Never log provider IDs or provider response bodies.

- [ ] **Step 4: Integrate the adjustment without weakening webhook idempotency**

Keep `apply_asaas_webhook_event` first. Only if its result is `processed` or
`duplicate`, call `adjustLaunchRenewal`. Return `failed` when the adjustment
returns `retry_later`; preserve existing results for all other paths.

In the route, build one Asaas gateway from the already validated billing
environment and pass it to `processAsaasWebhook`. Continue returning 503 for
`failed` so the provider retries, and continue returning 200 only for processed,
duplicate, or ignored work.

- [ ] **Step 5: Run webhook, refund, and cancellation regression tests**

Run:

```bash
pnpm test src/modules/billing/services/adjust-launch-renewal.service.test.ts src/modules/billing/services/process-asaas-webhook.service.test.ts src/modules/billing/services/request-billing-refund.service.test.ts src/modules/billing/services/cancel-monthly-billing.service.test.ts src/app/api/webhooks/asaas/route.test.ts
pnpm exec supabase test db --local supabase/tests/billing_webhooks.test.sql supabase/tests/billing_refunds.test.sql
```

Expected: PASS, including duplicate webhook retry and unchanged refund behavior.

- [ ] **Step 6: Commit the renewal workflow**

```bash
git add src/modules/billing/services/adjust-launch-renewal.service.ts src/modules/billing/services/adjust-launch-renewal.service.test.ts src/modules/billing/services/process-asaas-webhook.service.ts src/modules/billing/services/process-asaas-webhook.service.test.ts src/app/api/webhooks/asaas/route.ts src/app/api/webhooks/asaas/route.test.ts
git commit -m "feat: reconcile launch renewal schedule"
```

---

### Task 6: Present the active offer and accessible countdown on the landing page

**Files:**
- Create: `src/modules/billing/components/offer-countdown.tsx`
- Create: `src/modules/billing/components/offer-countdown.test.tsx`
- Create: `src/components/landing/launch-offer-callout.tsx`
- Create: `src/components/landing/launch-offer-callout.css`
- Modify: `src/components/landing/landing-offer.ts`
- Modify: `src/components/landing/landing-experience.tsx`
- Modify: `src/components/landing/hero-section.tsx`
- Modify: `src/components/landing/pricing-section.tsx`
- Modify: `src/components/landing/faq-section.tsx`
- Modify: `src/components/landing/guarantee-section.tsx`
- Modify: `src/components/landing/final-cta-section.tsx`
- Modify: `src/modules/billing/components/billing-plans.tsx`
- Modify: `src/modules/billing/components/billing-plans.module.css`
- Modify: `src/modules/billing/components/billing-plans.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: active `LaunchOfferResolution` and selected `ActiveBillingPrice[]`.
- Produces: `LaunchOfferView = { endsAt: string }` passed to client UI only when active.
- Produces: `OfferCountdown({ endsAt, onExpire?, compact? })`.
- Changes: landing price helpers return `null` when catalog data is unavailable; no hard-coded R$ 39.90 fallback remains.

- [ ] **Step 1: Write countdown behavior and accessibility tests**

Use fake timers starting at `2026-10-20T12:00:00.000Z`. Render an end instant
`2026-10-21T14:03:04.000Z` and assert visible values `1 dia`, `02 horas`,
`03 min`, and `04 seg`. Assert:

- the region has accessible name `Tempo restante da oferta de lançamento`;
- the stable accessible text includes the formatted absolute deadline;
- the per-second digits use `aria-hidden="true"` rather than a per-second live region;
- `onExpire` runs exactly once at zero;
- an invalid or already expired `endsAt` renders `Oferta encerrada`.

- [ ] **Step 2: Write landing/pricing tests for both catalogs**

For active launch data, assert:

- hero copy includes `Oferta de lançamento` and `R$ 39,90`;
- monthly card says `2 meses no primeiro pagamento`;
- semiannual says `R$ 179,40 à vista ou em até 6x de R$ 29,90`;
- the plan benefit says `12 meses de acesso`;
- standard later values `R$ 49,90` and `R$ 239,40` are subordinate comparison copy;
- Checkout hint says the condition is held for one hour after starting.

For standard data, assert no countdown, launch badge, bonus, or old R$ 39.90
fallback appears; monthly is R$ 49.90 and semiannual is R$ 239.40/up to six
times R$ 39.90. For an unavailable catalog, hero/final CTA uses `Conhecer os
planos` rather than inventing a price.

- [ ] **Step 3: Run component/page tests and verify failure**

Run:

```bash
pnpm test src/modules/billing/components/offer-countdown.test.tsx src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx
```

Expected: FAIL on missing countdown, launch presentation, and standard catalog
copy.

- [ ] **Step 4: Implement the countdown with one expiry transition**

Use a client component with `useEffect`, a one-second interval, and remaining
milliseconds clamped at zero. Derive integer day/hour/minute/second units. Clear
the interval on unmount and after expiry. Use `useRouter().refresh()` as the
default expiry action, but accept `onExpire` for deterministic tests.

Keep the absolute deadline in visually hidden text with `aria-live="polite"`;
do not put the changing seconds inside `aria-live`.

- [ ] **Step 5: Implement truthful shared offer presentation**

Remove `FALLBACK_MONTHLY_PRICE_LABEL`. Replace it with a helper that returns a
view model only when exactly one valid monthly and semiannual price exist:

```ts
type LandingOfferPresentation = {
  catalogCode: "launch" | "standard";
  monthlyPriceLabel: string;
  semiannualTotalLabel: string;
  semiannualInstallmentLabel: string;
  monthlyAccessMonths: number;
  semiannualAccessMonths: number;
};
```

Update hero, guarantee, FAQ, and final CTA to accept this view model or null.
For launch monthly, FAQ must say the next charge occurs after two months and
then renews monthly; for standard, keep ordinary monthly-renewal meaning. Keep
the seven-day refund statements unchanged.

- [ ] **Step 6: Extend the existing visual world without redesigning it**

Place `LaunchOfferCallout` adjacent to the hero primary action. Reuse the
landing blue/ink/paper tokens, existing typography, corner language, and focus
rings. In plan cards:

- use `Oferta de lançamento` only for launch data;
- render total and `em até 6x`, not `6x de` as a required payment;
- render the bonus as text, never color alone;
- keep the free card and unavailable state unchanged;
- stack callout/countdown/actions below 720px without horizontal scrolling.

When active, pass `{ endsAt }` from the server page. When inactive, pass null.
Do not expose the configured start instant unless needed for static deadline
copy.

- [ ] **Step 7: Run focused UI tests and static checks**

Run:

```bash
pnpm test src/modules/billing/components/offer-countdown.test.tsx src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx
pnpm typecheck
pnpm lint
```

Expected: PASS.

- [ ] **Step 8: Commit the landing experience**

```bash
git add src/modules/billing/components/offer-countdown.tsx src/modules/billing/components/offer-countdown.test.tsx src/modules/billing/components/billing-plans.tsx src/modules/billing/components/billing-plans.module.css src/modules/billing/components/billing-plans.test.tsx src/components/landing/launch-offer-callout.tsx src/components/landing/launch-offer-callout.css src/components/landing/landing-offer.ts src/components/landing/landing-experience.tsx src/components/landing/hero-section.tsx src/components/landing/pricing-section.tsx src/components/landing/faq-section.tsx src/components/landing/guarantee-section.tsx src/components/landing/final-cta-section.tsx src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: present launch offer on landing page"
```

---

### Task 7: Add the authenticated pre/post-diagnosis offer strip

**Files:**
- Create: `src/modules/billing/components/launch-offer-strip.tsx`
- Create: `src/modules/billing/components/launch-offer-strip.test.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/app-shell.test.tsx`
- Modify: `src/app/(private)/layout.tsx`
- Modify: `src/app/(private)/layout.test.tsx`

**Interfaces:**
- Consumes: `getBillingOverview`, active launch `endsAt`, and `isAdminUser`.
- Produces: optional `launchOfferStrip: { endsAt: string; freeQuickDiagnosisUsed: boolean } | null` AppShell prop.
- Reuses: `OfferCountdown` from Task 6.

- [ ] **Step 1: Write strip state tests**

Assert the component renders:

```text
Before free diagnosis:
"Seu primeiro diagnóstico é grátis"
"Fazer diagnóstico grátis" -> /quick-diagnosis
no countdown

After free diagnosis:
"Oferta de lançamento"
"Ver oferta nos planos" -> /billing
countdown region
```

Assert null props render nothing, the strip is not dismissible, both links have
visible focus treatment, and mobile markup has no fixed-width countdown cells.

In private-layout tests, assert paid, courtesy, and admin users receive null;
free users receive the appropriate used/not-used state; invalid campaign or
billing-overview reads do not crash protected content and suppress the strip.

- [ ] **Step 2: Run layout/component tests and verify failure**

Run:

```bash
pnpm test src/modules/billing/components/launch-offer-strip.test.tsx src/components/layout/app-shell.test.tsx 'src/app/(private)/layout.test.tsx'
```

Expected: FAIL because the strip and AppShell prop are absent.

- [ ] **Step 3: Implement the compact strip**

Use semantic `<aside aria-label="Condição especial de lançamento">`. Before the
diagnosis, use plain benefit copy and no timer. After it, render the active
deadline and both monthly/semiannual bonus summary without overwhelming the
current page. Keep it between the sticky header and content container.

Use existing Tailwind tokens (`bg-primary`, `text-primary-foreground`, border,
focus-visible ring) rather than introducing a new palette. Desktop layout is
message / countdown / action; mobile stacks in that order.

- [ ] **Step 4: Resolve eligibility once in the private layout**

After existing auth/onboarding/admin checks:

1. resolve `readLaunchOfferEnvironment()`;
2. only for active, non-admin users call `getBillingOverview({ supabase,
   userId })`;
3. provide strip data only when overview succeeds and `tier === "free"`;
4. suppress it for paid/courtesy/admin and for invalid/inactive campaign state.

Do not redirect or fail the whole private shell solely because promotional UI
cannot be read. Keep existing account/onboarding authorization failures closed.

- [ ] **Step 5: Run targeted tests, typecheck, and commit**

Run:

```bash
pnpm test src/modules/billing/components/launch-offer-strip.test.tsx src/components/layout/app-shell.test.tsx 'src/app/(private)/layout.test.tsx'
pnpm typecheck
```

Expected: PASS.

Commit:

```bash
git add src/modules/billing/components/launch-offer-strip.tsx src/modules/billing/components/launch-offer-strip.test.tsx src/components/layout/app-shell.tsx src/components/layout/app-shell.test.tsx 'src/app/(private)/layout.tsx' 'src/app/(private)/layout.test.tsx'
git commit -m "feat: guide free users through launch offer"
```

---

### Task 8: Update deterministic seed, runbooks, and release evidence

**Files:**
- Modify: `scripts/demo-seed/model.ts`
- Modify: `scripts/demo-seed/user-scenarios.ts`
- Modify: `scripts/demo-seed/render-seed.ts`
- Modify: `scripts/demo-seed/render-seed.test.ts`
- Modify: `supabase/seed.sql` (generated)
- Modify: `supabase/tests/seed.test.sql`
- Modify: `docs/asaas-billing-runbook.md`
- Modify: `docs/operations/deployment-runbook.md`
- Modify: `PRODUCT.md`
- Modify: `.impeccable` documentation only if the Impeccable documenter reports an approved durable visual-system change; otherwise preserve it.

**Interfaces:**
- Consumes: final database/application interfaces from Tasks 1–7.
- Produces: reproducible demo data containing standard and launch snapshots, operational activation/reconciliation steps, and complete verification evidence.

- [ ] **Step 1: Write failing seed-model/render assertions**

Change `SeedContract` to include:

```ts
catalogCode: "launch" | "standard";
bonusMonths: 0 | 1 | 6;
accessMonths: 1 | 2 | 6 | 12;
renewalAdjustmentStatus:
  | "not_required"
  | "pending"
  | "completed"
  | "pending_reconciliation";
renewalAdjustmentAttemptCount: number;
renewalAdjustedAt: SeedRelativeTime | null;
renewalAdjustmentLastErrorCode:
  | "provider_rejected"
  | "provider_ambiguous"
  | "state_persist_failed"
  | null;
```

Assert generated SQL includes both catalog codes, 4990, 23940, one launch
monthly completed adjustment, and one launch monthly reconciliation fixture.
Update `seed.test.sql` to validate snapshot/price agreement and deterministic
counts.

- [ ] **Step 2: Run seed checks and verify failure**

Run:

```bash
pnpm test scripts/demo-seed/render-seed.test.ts
pnpm run seed:check
```

Expected: FAIL until model/render/generated SQL agree.

- [ ] **Step 3: Update the generator, then regenerate rather than hand-edit**

Add the new columns to `contractColumns`, `contractCasts`, initial rows, conflict
updates, and verification queries. Keep standard fixtures as the majority of
active contracts; add explicit launch monthly and semiannual cases covering
2/12-month access. Generate:

```bash
pnpm run seed:generate
pnpm run seed:check
```

Expected: `supabase/seed.sql` changes only through the generator and the check
passes.

- [ ] **Step 4: Document activation and reconciliation exactly**

In the deployment runbook add:

1. deploy with `LAUNCH_OFFER_START_AT` absent;
2. verify standard 4990/23940 prices and rejection of launch IDs;
3. choose a São Paulo instant and store it with explicit `-03:00` offset;
4. deploy the environment value before that instant;
5. verify scheduled, exact-start, exact-end, and invalid-value states;
6. remove the value only for emergency campaign deactivation, never as the
   normal end mechanism.

In the Asaas runbook add sandbox checks for immediate first monthly charge,
`BIMONTHLY` safety cadence, update to monthly with next due date two months
later, retry of duplicate webhooks, all six selectable semiannual installment
counts, Pix, refund, and cancellation. Include SQL queries using contract ID to
inspect renewal status without printing provider IDs in support output.

Update `PRODUCT.md` to record the standard catalog and time-limited launch
campaign as product truth, removing the statement that no plan prices are
confirmed.

- [ ] **Step 5: Run the complete automated verification matrix**

Run:

```bash
pnpm exec supabase db reset --local
pnpm exec supabase test db --local
pnpm run supabase:lint
pnpm run supabase:advisors
pnpm run supabase:types
pnpm run seed:check
pnpm run check
pnpm run build
git diff --check
git status --short
```

Expected: every command passes; generated database types have no unstaged drift;
only intended launch-offer files are modified.

- [ ] **Step 6: Perform one bounded visual verification pass**

Read `.agents/skills/impeccable/reference/craft-floor.md` immediately before UI
inspection. Start the app and capture:

- landing active offer at 1440px and 390px;
- landing standard catalog at 1440px and 390px;
- authenticated pre-diagnosis strip at 1440px and 390px;
- authenticated post-diagnosis countdown strip at 1440px and 390px.

Verify focus order, no horizontal overflow, readable standard-price comparison,
visible `em até 6x`, timer expiry refresh, and reduced-motion behavior. Run:

```bash
.agents/skills/impeccable/scripts/impeccable detect --json
```

Fix only material/mechanical findings in one batch, recapture once, and stop
after the second inspection round as required by the interface skill.

- [ ] **Step 7: Run the required finish review and documentation check**

If the user selected an execution workflow that explicitly authorizes
subagents, pass the original request, approved spec, changed UI paths,
desktop/mobile captures, detector output, and craft-floor path to the
Impeccable finish reviewer. Otherwise perform the same structured comparison
in-thread. Apply one fix batch if the disposition is `fix`, recapture, and
obtain a pass verdict. Run the documentation check the same way and preserve
the incumbent visual system unless it identifies a durable approved system
change.

- [ ] **Step 8: Commit documentation, fixtures, and any reviewed corrections**

```bash
git status --short
git add PRODUCT.md docs/asaas-billing-runbook.md docs/operations/deployment-runbook.md scripts/demo-seed/model.ts scripts/demo-seed/user-scenarios.ts scripts/demo-seed/render-seed.ts scripts/demo-seed/render-seed.test.ts supabase/seed.sql supabase/tests/seed.test.sql
git commit -m "docs: operationalize launch offer rollout"
```

If the bounded review changed a Task 6 or Task 7 UI file, stage that exact path
shown by `git status --short` before committing. Expected: the working tree is
clean after the commit.

---

## Manual Asaas Sandbox Gate

Do not deploy production billing until an operator records evidence for all of
these cases against sandbox provider state and local contract/payment rows:

1. Launch monthly card: R$ 39.90 first charge, two months of access, next due
   date two months later, then monthly cycle.
2. Launch monthly Pix: R$ 39.90 detached charge and two non-renewing months.
3. Launch semiannual card: R$ 179.40 selectable as 1, 2, 3, 4, 5, or 6
   installments and twelve months of access.
4. Launch semiannual Pix: R$ 179.40 detached charge and twelve months.
5. Standard monthly card/Pix: R$ 49.90 and one month.
6. Standard semiannual card/Pix: R$ 239.40, up to six installments, six months.
7. Checkout created one millisecond before expiry and completed inside its
   stored one-hour validity.
8. New promotional Checkout attempted exactly at expiry and rejected.
9. Duplicate/out-of-order Checkout, subscription, and payment webhooks.
10. Renewal update rejection/timeout followed by safe idempotent reconciliation.
11. Seven-day full refund and normal monthly cancellation for launch contracts.
