# Billing Refunds and Plan Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pre-launch paid catalog with R$ 39.90 monthly and R$ 179.40 semiannual plans, and let customers request an idempotent full Asaas refund during the first seven days.

**Architecture:** Supabase remains the source of truth for catalog, access, refund workflow state, and webhook convergence. An authenticated Next.js route atomically claims an eligible contract, calls a narrowly typed Asaas refund operation, and records only normalized outcomes; verified webhooks confirm the financial result. The billing overview projects refund eligibility and progress into a focused account UI without exposing provider identifiers.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Supabase JS 2.112.3, PostgreSQL 17, pgTAP, Vitest/Testing Library, Asaas API v3.

**Spec:** `docs/superpowers/specs/2026-10-08-billing-refunds-and-plan-pricing-design.md`

## Global Constraints

- This is a pre-production baseline rewrite: there are no production users or customer records, and non-production databases may be reset.
- Monthly v1 is exactly `3990` BRL cents, has no installment limit, and grants one month.
- Semiannual v1 is exactly `17940` BRL cents, permits at most six credit-card installments, and grants six months; Pix pays R$ 179.40 up front.
- Runtime billing modes are only `monthly` and `semiannual`; remove `annual` compatibility from executable code, schema constraints, fixtures, and current product copy.
- Customer-initiated refunds are full refunds only and are eligible through the exact instant `access_starts_at + interval '7 days'`, inclusive.
- The database clock decides eligibility; never trust a browser timestamp.
- A valid request changes the contract to `refund_pending` immediately, and that status never grants paid access or permits another Checkout.
- Definitive provider rejection restores the exact previous contract status; ambiguous provider outcomes remain blocked and are never retried blindly.
- For a monthly card contract, refund acceptance must be followed by recurring-subscription deletion before the workflow is operationally complete.
- Asaas webhooks remain the source of truth for financial completion. Callback navigation and a successful HTTP mutation response do not independently confirm a refund.
- Persist integer cents, `timestamptz`, normalized states, and allow-listed internal error codes only. Do not persist raw refund responses.
- Never expose Asaas payment, installment, subscription, or customer identifiers to the browser.
- Every public table uses RLS and explicit grants. Refund transition RPCs are `security invoker`, have `search_path = ''`, use schema-qualified objects, and are executable only by `service_role`.
- Keep API keys and the webhook token server-only and out of logs, responses, fixtures, and snapshots.
- Preserve unrelated worktree changes. Use TDD and make one focused commit after each green task.
- Before database changes, recheck the current Supabase changelog plus RLS/function guidance required by the `supabase` skill. Before Tasks 9 and 10, load the available interface-design skills and preserve the established billing visual language.

## File and Responsibility Map

- `supabase/migrations/20260910194335_create_billing_foundation.sql`: pre-launch price/contract baseline, refund table, grants, indexes, and atomic refund transition RPCs.
- `supabase/migrations/20260910212607_apply_asaas_webhook_events.sql`: six-month entitlement and idempotent refund/subscription webhook convergence.
- `supabase/migrations/20260919001238_admin_recent_subscription_filters.sql`: accepted admin billing-mode filter.
- `supabase/tests/billing_schema.test.sql`: catalog, table shape, grants, RLS, and supported purchase combinations.
- `supabase/tests/billing_refunds.test.sql`: seven-day boundary, ownership, idempotency, state restoration, and transition RPC tests.
- `supabase/tests/billing_webhooks.test.sql`: semiannual access plus refund/subscription event ordering.
- `scripts/demo-seed/{model,user-scenarios,render-seed}.ts`: source of truth for deterministic demo billing fixtures.
- `supabase/seed.sql`: generated seed output; never hand-edit it independently from the generator.
- `src/infrastructure/database/supabase/database.types.ts`: generated database/RPC contract.
- `src/infrastructure/payments/asaas/asaas.client.ts`: typed Asaas checkout, cancellation, payment-refund, and installment-refund boundary.
- `src/modules/billing/types.ts`: shared plan, contract, refund, and overview types.
- `src/modules/billing/services/request-billing-refund.service.ts`: refund orchestration and provider-error classification.
- `src/modules/billing/services/get-billing-overview.service.ts`: safe customer projection of plan, eligibility, and refund progress.
- `src/app/api/billing/refund/route.ts`: same-origin authenticated refund endpoint.
- `src/modules/billing/components/refund-button.tsx`: confirmation dialog and mutation feedback.
- `src/modules/billing/components/refund-status-card.tsx`: processing, reconciliation, rejection, and completion copy.
- `src/modules/billing/components/billing-plans.tsx`: monthly/semiannual presentation and Checkout actions.
- `src/app/(private)/billing/page.tsx`: account composition and state precedence.
- `src/modules/admin/**` and `src/modules/admin/users/**`: semiannual labels and refund-pending status validation.
- `docs/asaas-billing-runbook.md`: permissions, sandbox matrix, refund reconciliation, and failure recovery.

---

### Task 1: Rebaseline the catalog and deterministic fixtures

**Files:**

- Modify: `supabase/migrations/20260910194335_create_billing_foundation.sql`
- Modify: `supabase/migrations/20260910212607_apply_asaas_webhook_events.sql`
- Modify: `supabase/migrations/20260919001238_admin_recent_subscription_filters.sql`
- Modify: `supabase/tests/billing_schema.test.sql`
- Modify: `supabase/tests/billing_webhooks.test.sql`
- Modify: `scripts/demo-seed/model.ts`
- Modify: `scripts/demo-seed/user-scenarios.ts`
- Modify: `scripts/demo-seed/render-seed.ts`
- Modify: `scripts/demo-seed/render-seed.test.ts`
- Regenerate: `supabase/seed.sql`
- Modify: `supabase/tests/seed.test.sql`

**Interfaces:**

- Consumes: the existing immutable catalog and deterministic price IDs.
- Produces: `monthly | semiannual` database values, price ID `...0001` at 3990 cents, price ID `...0002` at 17940 cents, and six-month entitlement behavior for later tasks.

- [ ] **Step 1: Change pgTAP expectations first**

Replace annual fixtures with the following catalog and valid contract shape, and assert an `annual` insert raises `23514`:

```sql
select results_eq(
  $$
    select billing_mode, amount_cents, installment_limit, access_months
    from public.billing_prices
    order by billing_mode
  $$,
  $$ values
    ('monthly'::text, 3990::bigint, null::integer, 1),
    ('semiannual'::text, 17940::bigint, 6, 6)
  $$,
  'catalog contains the approved monthly and semiannual offers'
);

select throws_ok(
  $$
    insert into public.billing_prices (
      product_code, billing_mode, version, amount_cents, currency,
      installment_limit, access_months
    ) values ('legacy', 'annual', 1, 47880, 'BRL', 12, 12)
  $$,
  '23514',
  null,
  'annual mode is rejected from the pre-production baseline'
);
```

Update webhook fixtures so the fixed-term contract is `semiannual`, has `17940`, limit/access months `6`, and a confirmed payment grants exactly six months. Update the admin filter test expectation to accept `semiannual` and reject `annual`.

- [ ] **Step 2: Update demo-seed tests and model names**

Rename `ANNUAL_PRICE_ID` to `SEMIANNUAL_PRICE_ID`, change the model union to:

```ts
type DemoBillingMode = "monthly" | "semiannual";
```

Assert generated SQL contains `semiannual`, `17940`, and installment/access value `6`, and does not contain billing mode `'annual'` or amount `47880`.

- [ ] **Step 3: Run focused tests to confirm the old baseline fails**

```bash
pnpm test scripts/demo-seed/render-seed.test.ts
pnpm exec supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql
```

Expected: FAIL on old annual modes/prices and twelve-month access.

- [ ] **Step 4: Rewrite the baseline constraints and entitlement branch**

Use these exact shapes in both prices and contract snapshots:

```sql
constraint billing_prices_billing_mode_check check (
  billing_mode in ('monthly', 'semiannual')
),
constraint billing_prices_catalog_shape_check check (
  (billing_mode = 'monthly' and installment_limit is null and access_months = 1)
  or
  (billing_mode = 'semiannual' and installment_limit = 6
    and access_months = 6 and amount_cents % installment_limit = 0)
)
```

Change the fixed-term webhook branch to `billing_mode = 'semiannual'` and `interval '6 months'`. Keep the deterministic UUIDs, immutability trigger, and price snapshots unchanged in structure. Permit admin filters `('monthly', 'semiannual', 'all')`.

- [ ] **Step 5: Update and regenerate the seed**

Use `3990` for monthly fixtures and `17940`/six installments/six months for semiannual fixtures. Rename external references and assertion messages from annual to semiannual, then regenerate instead of hand-editing the generated SQL:

```bash
pnpm seed:generate
pnpm seed:check
```

Expected: PASS and `supabase/seed.sql` matches the generator.

- [ ] **Step 6: Reset and run the database checks**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/seed.test.sql
```

Expected: reset succeeds from an empty database and all selected pgTAP files pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260910194335_create_billing_foundation.sql supabase/migrations/20260910212607_apply_asaas_webhook_events.sql supabase/migrations/20260919001238_admin_recent_subscription_filters.sql supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/seed.test.sql scripts/demo-seed/model.ts scripts/demo-seed/user-scenarios.ts scripts/demo-seed/render-seed.ts scripts/demo-seed/render-seed.test.ts supabase/seed.sql
git commit -m "feat: replace annual billing with semiannual plans"
```

---

### Task 2: Persist and atomically transition refund requests

**Files:**

- Modify: `supabase/migrations/20260910194335_create_billing_foundation.sql`
- Modify: `supabase/tests/billing_schema.test.sql`
- Create: `supabase/tests/billing_refunds.test.sql`

**Interfaces:**

- Consumes: active/cancel-at-period-end contracts and normalized payments.
- Produces:

```sql
public.begin_billing_refund(p_user_id uuid) returns jsonb

public.record_billing_refund_provider_result(
  p_request_id uuid,
  p_result text,
  p_error_code text default null,
  p_recurrence_canceled boolean default false
) returns text
```

`begin_billing_refund` returns one of:

```json
{"status":"ready","requestId":"uuid","billingMode":"monthly","paymentMethod":"credit_card","paymentId":"pay_x","installmentId":null,"subscriptionId":"sub_x"}
{"status":"already_submitted"}
{"status":"pending_reconciliation"}
{"status":"not_found"}
{"status":"not_eligible"}
{"status":"not_ready"}
{"status":"confirmed"}
```

- [ ] **Step 1: Write the failing refund schema tests**

Assert the exact table columns from the spec, UUID/FK types, unique
`contract_id`, status and timestamp constraints, the `(status, updated_at)`
reconciliation index, RLS, owner-only select policy, authenticated safe-column
grant, and service-role CRUD. Assert `refund_pending` is accepted by the
contract status constraint but excluded from paid-access helpers.

- [ ] **Step 2: Write failing transition tests at fixed database times**

Use `set local timezone = 'UTC'` and derive fixtures from the transaction-stable
database clock. Cover:

```sql
-- Run begin_billing_refund while the transaction clock is represented by
-- access_starts_at values such as statement_timestamp() - interval '7 days'.
-- Exercise just before, exactly at, and just after +7 days.
-- Exact boundary must return ready; after the boundary must return not_eligible.

select is(
  public.begin_billing_refund('...user...'::uuid)->>'status',
  'ready',
  'eligible owner atomically claims a full refund'
);
```

Also assert: another user's contract is never selected; no contract returns
`not_found`; missing payment/installment/subscription ID returns `not_ready`
without changing access; two current contracts return
`pending_reconciliation`; a second click returns `already_submitted`; and a
rejected request may be reclaimed only before its original deadline.

- [ ] **Step 3: Run the new tests and confirm failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_refunds.test.sql
```

Expected: FAIL because the table, status, and RPCs do not exist.

- [ ] **Step 4: Add `billing_refund_requests` and safe grants**

Add the exact fields from the spec. Use one owner read policy:

```sql
create policy billing_refund_requests_select_own
on public.billing_refund_requests
for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.billing_refund_requests
from public, anon, authenticated, service_role;

grant select (
  id, contract_id, user_id, status, eligibility_started_at,
  eligibility_ends_at, requested_at, provider_submitted_at,
  refund_confirmed_at, recurrence_canceled_at, rejected_at,
  last_error_code, created_at, updated_at
) on public.billing_refund_requests to authenticated;

grant select, insert, update, delete
on public.billing_refund_requests to service_role;
```

Do not grant `previous_contract_status` to the browser because it is an
internal restoration detail.

- [ ] **Step 5: Implement atomic claim and provider-result RPCs**

Both functions use `security invoker set search_path = ''`, lock the contract
and request rows before transitions, and are revoked from `public`, `anon`, and
`authenticated`. `begin_billing_refund` must:

1. find exactly one currently paid contract for `p_user_id`;
2. calculate `eligibility_ends_at = access_starts_at + interval '7 days'`;
3. resolve the earliest confirmed/received non-refunded payment for monthly/Pix
   or `asaas_installment_id` for semiannual card;
4. insert or reclaim the single request row;
5. save `previous_contract_status` and change the contract to
   `refund_pending` in the same transaction;
6. return only the provider identifiers needed by the server caller.

`record_billing_refund_provider_result` accepts only `submitted`, `rejected`,
or `pending_reconciliation`. On `rejected`, restore
`previous_contract_status` only if the request is still `processing`; never
overwrite a webhook-confirmed request. Every result transition is monotonic: a
late application response cannot downgrade `confirmed`, and `submitted` plus
`p_recurrence_canceled = true` must finalize a request whose refund webhook
already set `refund_confirmed_at`. Allow only these persisted error codes:

```sql
('provider_rejected', 'provider_ambiguous',
 'subscription_cancellation_failed', 'state_persist_failed')
```

- [ ] **Step 6: Run schema/refund tests and advisors**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_refunds.test.sql
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: PASS with no security or performance errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260910194335_create_billing_foundation.sql supabase/tests/billing_schema.test.sql supabase/tests/billing_refunds.test.sql
git commit -m "feat: add atomic refund request state"
```

---

### Task 3: Converge refund and subscription webhooks

**Files:**

- Modify: `supabase/migrations/20260910212607_apply_asaas_webhook_events.sql`
- Modify: `supabase/tests/billing_webhooks.test.sql`
- Modify: `supabase/tests/billing_refunds.test.sql`

**Interfaces:**

- Consumes: `billing_refund_requests` from Task 2 and the existing
  `apply_asaas_webhook_event(text,text,jsonb)` entry point.
- Produces: order-independent financial confirmation and recurrence
  cancellation without changing the public RPC signature.

- [ ] **Step 1: Add failing webhook matrices**

Create monthly-card refund requests and deliver these orders:

```text
PAYMENT_REFUNDED -> SUBSCRIPTION_DELETED
SUBSCRIPTION_DELETED -> PAYMENT_REFUNDED
duplicate PAYMENT_REFUNDED
duplicate SUBSCRIPTION_DELETED
```

In both orders assert one request row, contract `refunded`, truncated access,
non-null `refund_confirmed_at`, non-null `recurrence_canceled_at`, and request
`confirmed`. For Pix and semiannual card, assert `PAYMENT_REFUNDED` alone
confirms the request. Assert `PAYMENT_PARTIALLY_REFUNDED` leaves the request
unconfirmed and ledger error `manual_review_required`.

- [ ] **Step 2: Run focused pgTAP and confirm failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_webhooks.test.sql supabase/tests/billing_refunds.test.sql
```

Expected: FAIL because webhooks do not update refund requests and subscription
events currently try normal cancellation only.

- [ ] **Step 3: Update subscription-event handling**

When a matching request is `processing`, `submitted`, or
`pending_reconciliation`, record `recurrence_canceled_at`. Set request status
to `confirmed` only when `refund_confirmed_at` is already present; otherwise
preserve/advance it to `submitted`. Do not turn a `refund_pending` or
`refunded` contract into `cancel_at_period_end`.

- [ ] **Step 4: Update full-refund handling**

Keep the existing payment upsert and contract revocation. Additionally update
the matching request:

```sql
update public.billing_refund_requests
set refund_confirmed_at = coalesce(refund_confirmed_at, v_event_at),
    status = case
      when v_contract.billing_mode <> 'monthly'
        or v_contract.payment_method <> 'credit_card'
        or recurrence_canceled_at is not null
      then 'confirmed'
      else 'submitted'
    end,
    last_error_code = null,
    updated_at = statement_timestamp()
where contract_id = v_contract.id
  and status in ('processing', 'submitted', 'pending_reconciliation', 'rejected');
```

A real refund webhook wins over stale local rejection and must never restore
access afterward. Do not update a request for partial refunds.

- [ ] **Step 5: Run all billing database tests**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_refunds.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/billing_access.test.sql
```

Expected: PASS, including duplicate and out-of-order cases.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260910212607_apply_asaas_webhook_events.sql supabase/tests/billing_webhooks.test.sql supabase/tests/billing_refunds.test.sql
git commit -m "feat: reconcile refund webhooks"
```

---

### Task 4: Regenerate database types and update plan-domain contracts

**Files:**

- Regenerate: `src/infrastructure/database/supabase/database.types.ts`
- Modify: `src/modules/billing/types.ts`
- Modify: `src/modules/billing/services/list-active-prices.service.ts`
- Modify: `src/modules/billing/services/list-active-prices.service.test.ts`
- Modify: `src/modules/billing/domain/build-checkout-request.ts`
- Modify: `src/modules/billing/domain/build-checkout-request.test.ts`
- Modify: `src/modules/billing/services/create-hosted-checkout.service.ts`
- Modify: `src/modules/billing/services/create-hosted-checkout.service.test.ts`
- Modify: `src/modules/billing/services/cancel-monthly-billing.service.test.ts`

**Interfaces:**

- Consumes: final schema from Tasks 1–3.
- Produces:

```ts
type BillingMode = "monthly" | "semiannual";
type BillingContractStatus =
  | "pending" | "pending_reconciliation" | "active"
  | "cancel_at_period_end" | "refund_pending" | "expired"
  | "canceled" | "refunded" | "chargeback" | "failed";

type BillingRefundStatus =
  | "processing" | "submitted" | "confirmed"
  | "rejected" | "pending_reconciliation";
```

- [ ] **Step 1: Regenerate types from the reset local database**

```bash
pnpm supabase:types
```

Expected: generated types contain `billing_refund_requests`, both refund RPCs,
`semiannual`, and `refund_pending`-capable text fields.

- [ ] **Step 2: Rewrite failing catalog and Checkout expectations**

Use these fixtures in all four focused tests:

```ts
const monthlyPrice = {
  billing_mode: "monthly",
  amount_cents: 3990,
  installment_limit: null,
  access_months: 1,
};

const semiannualPrice = {
  billing_mode: "semiannual",
  amount_cents: 17940,
  installment_limit: 6,
  access_months: 6,
};
```

Assert fixed-term card Checkout uses `maxInstallmentCount: 6`, item name
`Diagnóstico Pro Semestral`, description `Acesso ao Lucrivo por 6 meses`, and
value `179.4`. Assert `refund_pending` contracts return
`pending_reconciliation` from `createHostedCheckout` before any insert or
Asaas call. Replace the cancellation service's non-monthly guard fixture from
`annual` to `semiannual` so it still proves fixed-term contracts are rejected.

- [ ] **Step 3: Run focused tests and confirm failure**

```bash
pnpm test src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.test.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/modules/billing/services/cancel-monthly-billing.service.test.ts
```

Expected: FAIL on annual unions, old prices, and twelve installments.

- [ ] **Step 4: Implement semiannual normalization and Checkout payloads**

Require exactly one monthly and one semiannual active price. Change the
fixed-term request union to:

```ts
{
  billingTypes: ["CREDIT_CARD"];
  chargeTypes: ["DETACHED", "INSTALLMENT"];
  installment: { maxInstallmentCount: 6 };
  subscription?: never;
}
```

Treat `refund_pending` like unresolved financial state in Checkout reuse/block
logic. Do not change the monthly recurring or Pix payload shapes.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
pnpm test src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.test.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/modules/billing/services/cancel-monthly-billing.service.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/database/supabase/database.types.ts src/modules/billing/types.ts src/modules/billing/services/list-active-prices.service.ts src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.ts src/modules/billing/domain/build-checkout-request.test.ts src/modules/billing/services/create-hosted-checkout.service.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/modules/billing/services/cancel-monthly-billing.service.test.ts
git commit -m "feat: use semiannual billing domain"
```

---

### Task 5: Add typed Asaas refund operations

**Files:**

- Modify: `src/infrastructure/payments/asaas/asaas.client.ts`
- Modify: `src/infrastructure/payments/asaas/asaas.client.test.ts`

**Interfaces:**

- Consumes: existing shared request/error classification.
- Produces:

```ts
interface AsaasGateway {
  // existing methods remain
  refundPayment(id: string): Promise<{ id: string }>;
  refundInstallment(id: string): Promise<{ id: string }>;
}
```

- [ ] **Step 1: Write failing endpoint and response-validation tests**

Assert safe ID encoding, an empty JSON body, and exact paths:

```ts
expect(fetchMock).toHaveBeenCalledWith(
  "https://api-sandbox.asaas.com/v3/payments/pay%2F123/refund",
  expect.objectContaining({ method: "POST", body: "{}" }),
);

expect(fetchMock).toHaveBeenCalledWith(
  "https://api-sandbox.asaas.com/v3/installments/ins%2F123/refund",
  expect.objectContaining({ method: "POST", body: "{}" }),
);
```

Accept unknown response fields but require a non-empty matching `id`. Assert a
mismatched/malformed 200 response is `AsaasGatewayError { kind: "ambiguous" }`.
Reuse the existing 400/408/429/500 and network-error matrix for both methods.

- [ ] **Step 2: Run the gateway tests and confirm failure**

```bash
pnpm test src/infrastructure/payments/asaas/asaas.client.test.ts
```

Expected: FAIL because refund methods do not exist.

- [ ] **Step 3: Implement minimal refund adapters**

Use one loose schema and the existing private `request` helper:

```ts
const refundResponseSchema = z.looseObject({ id: z.string().trim().min(1) });

async function refund(path: string, expectedId: string) {
  const result = await request(path, {
    method: "POST",
    body: JSON.stringify({}),
  }, refundResponseSchema);
  if (result.id !== expectedId) throw new AsaasGatewayError("ambiguous", 200);
  return { id: result.id };
}
```

Never return or persist the complete provider response.

- [ ] **Step 4: Run focused tests**

```bash
pnpm test src/infrastructure/payments/asaas/asaas.client.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/payments/asaas/asaas.client.ts src/infrastructure/payments/asaas/asaas.client.test.ts
git commit -m "feat: add Asaas refund operations"
```

---

### Task 6: Orchestrate customer refund requests

**Files:**

- Create: `src/modules/billing/services/request-billing-refund.service.ts`
- Create: `src/modules/billing/services/request-billing-refund.service.test.ts`

**Interfaces:**

- Consumes: `begin_billing_refund`,
  `record_billing_refund_provider_result`, and Task 5 gateway methods.
- Produces:

```ts
type RequestBillingRefundResult =
  | { status: "submitted" | "already_submitted" | "confirmed" }
  | { status: "not_found" | "not_eligible" | "not_ready" | "rejected" }
  | { status: "pending_reconciliation" };

function requestBillingRefund(input: {
  userId: string;
  admin: SupabaseClient<Database>;
  asaas: AsaasGateway;
}): Promise<RequestBillingRefundResult>;
```

- [ ] **Step 1: Write failing claim/result parsing tests**

Mock `admin.rpc`. Reject malformed RPC data safely. Map
`not_found`, `not_eligible`, `not_ready`, `already_submitted`, `confirmed`, and
`pending_reconciliation` without calling Asaas. For `ready`, require UUID
`requestId`, the exact billing/payment combination, and only the provider ID
required for that flow.

- [ ] **Step 2: Write the four provider-flow tests**

Assert:

```text
monthly + pix          -> refundPayment(paymentId)
monthly + credit_card  -> refundPayment(paymentId), then deleteSubscription(subscriptionId)
semiannual + pix       -> refundPayment(paymentId)
semiannual + card      -> refundInstallment(installmentId)
```

Each accepted flow must call:

```ts
admin.rpc("record_billing_refund_provider_result", {
  p_request_id: requestId,
  p_result: "submitted",
  p_error_code: null,
  p_recurrence_canceled: expect.any(Boolean),
});
```

- [ ] **Step 3: Write rejection, ambiguity, and race tests**

For `AsaasGatewayError("rejected", 400)`, record `rejected` plus
`provider_rejected` and return `rejected`. For network/408/429/5xx or malformed
success, record `pending_reconciliation` plus `provider_ambiguous`. If refund
succeeds but subscription deletion fails for either error kind, record
`pending_reconciliation` plus `subscription_cancellation_failed`. If the final
RPC fails after provider acceptance, return `pending_reconciliation`; never
issue the provider mutation twice inside one invocation.

- [ ] **Step 4: Run tests and confirm failure**

```bash
pnpm test src/modules/billing/services/request-billing-refund.service.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 5: Implement the service with strict Zod parsing**

Start with `import "server-only"`. Use a discriminated union for RPC results,
switch exhaustively on billing/payment mode, call refund before subscription
deletion, and persist only the four allow-listed internal error codes. Catch
all unexpected failures and return `pending_reconciliation` without leaking
the thrown message.

- [ ] **Step 6: Run focused tests and typecheck**

```bash
pnpm test src/modules/billing/services/request-billing-refund.service.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/billing/services/request-billing-refund.service.ts src/modules/billing/services/request-billing-refund.service.test.ts
git commit -m "feat: orchestrate billing refunds"
```

---

### Task 7: Expose a same-origin authenticated refund route

**Files:**

- Create: `src/app/api/billing/refund/route.ts`
- Create: `src/app/api/billing/refund/route.test.ts`

**Interfaces:**

- Consumes: `requestBillingRefund`, `requireUser`, billing environment, admin
  client, and Asaas gateway.
- Produces: `POST /api/billing/refund` with no request body and stable,
  no-store JSON outcomes.

- [ ] **Step 1: Write failing auth and origin tests**

Create requests with an `Origin` header. Assert unauthenticated requests return
401 before secret clients are built. Assert missing, malformed, credentialed,
or cross-origin values return 403. Exact `environment.appUrl.origin` is
accepted:

```ts
new Request("https://app.lucrivo.test/api/billing/refund", {
  method: "POST",
  headers: { Origin: "https://app.lucrivo.test" },
});
```

- [ ] **Step 2: Write the result-to-HTTP matrix**

Use these exact mappings:

```text
submitted              202 { status: "submitted" }
already_submitted      200 { status: "already_submitted" }
confirmed              200 { status: "confirmed" }
not_found              404 { error: "refundable_contract_not_found" }
not_eligible           409 { error: "refund_not_eligible" }
not_ready              409 { error: "payment_not_ready" }
rejected               422 { error: "refund_rejected" }
pending_reconciliation 503 { error: "pending_reconciliation" }
```

Every response has `Cache-Control: no-store` and contains no provider IDs,
secrets, or thrown details.

- [ ] **Step 3: Run the route test and confirm failure**

```bash
pnpm test src/app/api/billing/refund/route.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 4: Implement the route**

Authenticate first, read the environment, compare `new URL(origin).origin`
with `environment.appUrl.origin`, build secret clients only afterward, and
delegate to the service. Accept no JSON fields, amount, contract ID, or
provider ID from the request.

- [ ] **Step 5: Run route tests and typecheck**

```bash
pnpm test src/app/api/billing/refund/route.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/billing/refund/route.ts src/app/api/billing/refund/route.test.ts
git commit -m "feat: expose secure refund endpoint"
```

---

### Task 8: Project eligibility and refund state into the billing overview

**Files:**

- Modify: `src/modules/billing/types.ts`
- Modify: `src/modules/billing/services/get-billing-overview.service.ts`
- Modify: `src/modules/billing/services/get-billing-overview.service.test.ts`

**Interfaces:**

- Consumes: owner-readable contract and refund columns.
- Produces:

```ts
type BillingRefundSummary = {
  status: BillingRefundStatus;
  eligibilityEndsAt: string;
  requestedAt: string;
  refundConfirmedAt: string | null;
  lastErrorCode: string | null;
};

type BillingOverview = {
  // existing fields
  contract: null | {
    billingMode: BillingMode;
    paymentMethod: BillingPaymentMethod;
    status: BillingContractStatus;
    accessEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    canRequestRefund: boolean;
    refundEligibilityEndsAt: string | null;
  };
  refund: BillingRefundSummary | null;
};
```

- [ ] **Step 1: Extend failing overview tests**

Assert eligibility before and exactly at seven days, ineligibility after seven
days, and no eligibility for expired/refunded/refund-pending contracts. Add a
refund query mock and cover processing, submitted, pending reconciliation,
rejected, and confirmed projections. A malformed timestamp/status or either
query failure must return `read_failed`.

- [ ] **Step 2: Run overview tests and confirm failure**

```bash
pnpm test src/modules/billing/services/get-billing-overview.service.test.ts
```

Expected: FAIL because contract start/refund data are not queried or projected.

- [ ] **Step 3: Implement the safe projection**

Add `id` and `access_starts_at` to the contract select. After selecting the
contract that will be projected, fetch the refund row whose `contract_id`
matches that exact contract; do not attach an older contract's latest refund to
a newer purchase. Select only safe columns. Compute:

```ts
const eligibilityEndsAt = accessStartsAt + 7 * 24 * 60 * 60 * 1000;
const canRequestRefund =
  (status === "active" || status === "cancel_at_period_end") &&
  instant <= eligibilityEndsAt &&
  (refund === null || refund.status === "rejected");
```

Use the injected `now` consistently. Preserve the existing half-open paid
access interval and courtesy precedence.

- [ ] **Step 4: Run focused tests and typecheck**

```bash
pnpm test src/modules/billing/services/get-billing-overview.service.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/billing/types.ts src/modules/billing/services/get-billing-overview.service.ts src/modules/billing/services/get-billing-overview.service.test.ts
git commit -m "feat: expose refund eligibility and status"
```

---

### Task 9: Add the refund confirmation and status interface

**Files:**

- Create: `src/modules/billing/components/refund-button.tsx`
- Create: `src/modules/billing/components/refund-button.test.tsx`
- Create: `src/modules/billing/components/refund-status-card.tsx`
- Create: `src/modules/billing/components/refund-status-card.test.tsx`
- Modify: `src/app/(private)/billing/page.tsx`
- Modify: `src/app/(private)/billing/page.test.tsx`

**Interfaces:**

- Consumes: Task 8 `BillingOverview`, `POST /api/billing/refund`, existing
  AlertDialog/Button/Card components, and `router.refresh()`.
- Produces: accessible confirmation, pending/error feedback, and state-first
  account composition.

- [ ] **Step 1: Write failing refund-button interaction tests**

Assert the first click only opens an alert dialog. The dialog must say the
refund is integral, access ends immediately, and card credit can take up to ten
business days. Only `Confirmar reembolso` performs:

```ts
expect(fetchMock).toHaveBeenCalledWith("/api/billing/refund", {
  method: "POST",
});
```

Assert both actions are disabled while pending, success closes and refreshes,
and 409/422/503 show stable Portuguese messages without raw response details.

- [ ] **Step 2: Write failing status-card and page precedence tests**

Cover visible copy for `processing`, `submitted`, `pending_reconciliation`,
`rejected`, and `confirmed`. Assert unresolved states hide Checkout plan cards;
rejected state shows the active plan plus retry only when
`canRequestRefund=true`; confirmed state shows completion without claiming the
credit is already on the statement. Assert a monthly card plan can show both
normal renewal cancellation and refund actions when eligible.

- [ ] **Step 3: Run UI tests and confirm failure**

```bash
pnpm test src/modules/billing/components/refund-button.test.tsx src/modules/billing/components/refund-status-card.test.tsx 'src/app/(private)/billing/page.test.tsx'
```

Expected: FAIL because the components and page states do not exist.

- [ ] **Step 4: Implement focused client components**

`RefundButton` owns only dialog/mutation state. `RefundStatusCard` is a pure
presentational component keyed by `BillingRefundStatus`. Use `role="alert"`
for mutation errors and a semantic region label `Situação do reembolso` for
status. Do not render internal `lastErrorCode` directly; map `rejected` to a
safe retry message and reconciliation to a support/wait message.

- [ ] **Step 5: Compose states in the billing page**

Render unresolved/confirmed refund status before the existing paid/courtesy/free
branches. Add `RefundButton` to the current-plan action area only when
`contract.canRequestRefund` and `refundEligibilityEndsAt` are present. Name
plans through an exhaustive mapping:

```ts
const planLabel: Record<BillingMode, string> = {
  monthly: "mensal",
  semiannual: "semestral",
};
```

- [ ] **Step 6: Run UI tests and accessibility-focused assertions**

```bash
pnpm test src/modules/billing/components/refund-button.test.tsx src/modules/billing/components/refund-status-card.test.tsx 'src/app/(private)/billing/page.test.tsx'
pnpm typecheck
```

Expected: PASS with buttons/dialogs discoverable by accessible name.

- [ ] **Step 7: Commit**

```bash
git add src/modules/billing/components/refund-button.tsx src/modules/billing/components/refund-button.test.tsx src/modules/billing/components/refund-status-card.tsx src/modules/billing/components/refund-status-card.test.tsx 'src/app/(private)/billing/page.tsx' 'src/app/(private)/billing/page.test.tsx'
git commit -m "feat: add customer refund experience"
```

---

### Task 10: Replace annual pricing across public and account interfaces

**Files:**

- Modify: `src/modules/billing/components/billing-plans.tsx`
- Modify: `src/modules/billing/components/billing-plans.module.css`
- Modify: `src/modules/billing/components/billing-plans.test.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/(private)/billing/return/page.test.tsx`

**Interfaces:**

- Consumes: Task 4 active monthly/semiannual catalog.
- Produces: consistent pricing copy and Checkout actions on landing, billing,
  and return pages.

- [ ] **Step 1: Rewrite failing pricing assertions**

Use monthly `3990` and semiannual `17940`. Assert the featured article has
accessible name `Plano Semestral`, `6x de`, `R$ 29,90`,
`ou R$ 179,40 à vista`, `Economize R$ 60,00 em seis meses`, and
`6 meses de acesso`. Assert the monthly card says `R$ 39,90/mês`. Account
actions are `Assinar semestral`; public links are `Escolher semestral`.

Add a non-divisible/malformed catalog test that fails closed rather than
displaying rounded installment copy.

- [ ] **Step 2: Run pricing/page tests and confirm failure**

```bash
pnpm test src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx 'src/app/(private)/billing/return/page.test.tsx'
```

Expected: FAIL on old annual labels and prices.

- [ ] **Step 3: Implement semiannual presentation**

Rename local annual variables and CSS hooks to semiannual/fixed-term names.
Calculate savings against six monthly payments:

```ts
const comparisonMonths = semiannual.accessMonths;
const savingsCents = monthly.amountCents * comparisonMonths - semiannual.amountCents;
```

Render savings only when positive. Derive the installment amount only after
validating the catalog already guarantees exact division; do not silently
round a malformed commercial value.

- [ ] **Step 4: Run focused interface tests**

```bash
pnpm test src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx 'src/app/(private)/billing/return/page.test.tsx'
pnpm typecheck
```

Expected: PASS and no current user-facing annual copy remains.

- [ ] **Step 5: Commit**

```bash
git add src/modules/billing/components/billing-plans.tsx src/modules/billing/components/billing-plans.module.css src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx 'src/app/(private)/billing/return/page.test.tsx'
git commit -m "feat: present monthly and semiannual offers"
```

---

### Task 11: Update admin schemas, labels, and billing fixtures

**Files:**

- Modify: `src/modules/admin/dashboard/admin-dashboard.schema.ts`
- Modify: `src/modules/admin/dashboard/admin-dashboard.types.ts`
- Modify: `src/modules/admin/dashboard/get-admin-dashboard.service.ts`
- Modify: `src/modules/admin/dashboard/get-admin-dashboard.service.test.ts`
- Modify: `src/modules/admin/dashboard/get-recent-subscriptions.service.ts`
- Modify: `src/modules/admin/dashboard/get-recent-subscriptions.service.test.ts`
- Modify: `src/modules/admin/dashboard/components/admin-dashboard.test.tsx`
- Modify: `src/modules/admin/users/admin-users.schema.ts`
- Modify: `src/modules/admin/users/components/admin-user-detail.tsx`
- Modify: `src/modules/admin/users/components/admin-user-list.tsx`
- Modify: billing-access fixtures in `supabase/tests/report_ai_assistant.test.sql`
- Modify: billing-access fixtures in `supabase/tests/billing_access.test.sql`
- Modify: billing-access fixtures in `supabase/tests/client_dashboard.test.sql`
- Modify: billing-access fixtures in `supabase/tests/detailed_diagnosis_reports.test.sql`
- Modify: billing-access fixtures in `supabase/tests/product_diagnosis_reports.test.sql`
- Modify: billing-access fixtures in `supabase/tests/production_diagnosis_reports.test.sql`
- Modify: billing-access fixtures in `supabase/tests/report_lifecycle.test.sql`

**Interfaces:**

- Consumes: `monthly | semiannual` and `refund_pending` database values.
- Produces: strict admin parsing and `Mensal | Semestral` presentation.

- [ ] **Step 1: Change admin and fixture tests first**

Replace schema fixtures with `billingMode: "semiannual"`, expected label
`Semestral`, and include `refund_pending` in the contract status schema. Assert
the parser rejects `annual`. Update access-only SQL fixtures from 4990 to 3990
where they model the active monthly catalog.

- [ ] **Step 2: Run focused tests and confirm failure**

```bash
pnpm test src/modules/admin/dashboard/get-admin-dashboard.service.test.ts src/modules/admin/dashboard/get-recent-subscriptions.service.test.ts src/modules/admin/dashboard/components/admin-dashboard.test.tsx
pnpm exec supabase test db supabase/tests/billing_access.test.sql supabase/tests/client_dashboard.test.sql supabase/tests/detailed_diagnosis_reports.test.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql supabase/tests/report_ai_assistant.test.sql supabase/tests/report_lifecycle.test.sql
```

Expected: FAIL on annual-only schemas/labels or stale fixture values.

- [ ] **Step 3: Implement exhaustive admin labels**

Change Zod unions to `z.enum(["monthly", "semiannual"])`, add
`refund_pending` to status parsing, and replace binary fallbacks with an exact
mapping so an unknown value cannot be mislabeled:

```ts
const billingModeLabel = {
  monthly: "Mensal",
  semiannual: "Semestral",
} as const;
```

Use the same mapping in dashboard and user detail/list rendering.

- [ ] **Step 4: Run focused tests and typecheck**

```bash
pnpm test src/modules/admin/dashboard/get-admin-dashboard.service.test.ts src/modules/admin/dashboard/get-recent-subscriptions.service.test.ts src/modules/admin/dashboard/components/admin-dashboard.test.tsx
pnpm exec supabase test db supabase/tests/billing_access.test.sql supabase/tests/client_dashboard.test.sql supabase/tests/detailed_diagnosis_reports.test.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql supabase/tests/report_ai_assistant.test.sql supabase/tests/report_lifecycle.test.sql
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/admin/dashboard/admin-dashboard.schema.ts src/modules/admin/dashboard/admin-dashboard.types.ts src/modules/admin/dashboard/get-admin-dashboard.service.ts src/modules/admin/dashboard/get-admin-dashboard.service.test.ts src/modules/admin/dashboard/get-recent-subscriptions.service.ts src/modules/admin/dashboard/get-recent-subscriptions.service.test.ts src/modules/admin/dashboard/components/admin-dashboard.test.tsx src/modules/admin/users/admin-users.schema.ts src/modules/admin/users/components/admin-user-detail.tsx src/modules/admin/users/components/admin-user-list.tsx supabase/tests/billing_access.test.sql supabase/tests/client_dashboard.test.sql supabase/tests/detailed_diagnosis_reports.test.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql supabase/tests/report_ai_assistant.test.sql supabase/tests/report_lifecycle.test.sql
git commit -m "refactor: align admin billing with semiannual plans"
```

---

### Task 12: Update operations documentation and run the release gate

**Files:**

- Modify: `docs/asaas-billing-runbook.md`
- Modify if current product wording requires it: `PRODUCT.md`
- Verify only: all application, database, seed, and generated-type files

**Interfaces:**

- Consumes: the completed implementation.
- Produces: an operator-ready refund procedure and a clean release candidate.

- [ ] **Step 1: Rewrite the sandbox matrix and operational procedure**

Document monthly R$ 39.90 and semiannual R$ 179.40/6x R$ 29.90. Add the API
key's refund-write permission, payment versus installment refund endpoints,
the fact that card statement credit can take ten business days, and the Pix
available-balance failure. Replace the old statement that Lucrivo cannot start
refunds.

Include this recovery sequence for `pending_reconciliation`:

```text
1. Identify the local request and contract without copying payloads or secrets.
2. Query the Asaas payment or installment before retrying any mutation.
3. For monthly card, also verify the subscription is inactive/deleted.
4. Re-deliver the original webhook or apply an audited reconciliation.
5. Confirm request, contract, payment, access, and customer-visible state agree.
```

Update the sandbox matrix for all four flows, exact seven-day boundary,
duplicate clicks, refund/subscription event order reversal, partial external
refund, and insufficient Pix balance.

- [ ] **Step 2: Scan executable code and current docs for stale commerce terms**

```bash
rg -n -i "annual|anual|47880|R\$ 478,80|12x de R\$ 39,90|12 meses de acesso|amountCents: 4990|amount_cents = 4990" src supabase scripts docs/asaas-billing-runbook.md PRODUCT.md
```

Expected: no current runtime/schema/fixture references. Historical committed
specs and plans may retain old terms only where clearly marked as superseded.

- [ ] **Step 3: Run the destructive clean-database gate**

The user explicitly approved resetting the non-production database:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm seed:check
pnpm seed:verify-local
```

Expected: all migrations, generated seed, pgTAP tests, lint, advisors, and seed
verification pass from an empty database.

- [ ] **Step 4: Verify generated types are reproducible**

```bash
pnpm supabase:types
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
```

Expected: no generated-type diff.

- [ ] **Step 5: Run the application release gate**

```bash
pnpm check
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
```

Expected: Vitest, typecheck, ESLint, Prettier, and the optimized Next.js build
all pass. The dummy Turnstile key is for local build validation only and must
not be used in a deployed artifact.

- [ ] **Step 6: Perform and record the Asaas sandbox matrix**

Exercise monthly card, monthly Pix, semiannual card in 1x and 6x, and
semiannual Pix. For each, capture only safe internal contract/request/event IDs
in the runbook's results table. Verify full refund, immediate access block,
eventual confirmation, monthly recurrence deletion, webhook re-delivery,
out-of-order events, and safe rejection/retry. Do not record API keys, webhook
tokens, raw payloads, or card/customer data.

- [ ] **Step 7: Commit documentation and any final test-only corrections**

```bash
git add docs/asaas-billing-runbook.md PRODUCT.md
git commit -m "docs: document refund operations and new plans"
```

- [ ] **Step 8: Inspect final repository state**

```bash
git status --short
git log --oneline -12
```

Expected: only intentional pre-existing user changes remain, and every task
above has a focused commit.
