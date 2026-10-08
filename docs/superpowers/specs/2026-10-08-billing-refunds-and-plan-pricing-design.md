# Billing Refunds and Plan Pricing Design

**Date:** 2026-10-08
**Status:** Approved
**Supersedes:** The monthly and annual commercial terms, checkout payloads,
catalog shapes, and "refunds are not initiated by Lucrivo" limitation in
`2026-09-09-asaas-billing-and-access-design.md`. The free tier, entitlement,
webhook security, and general billing boundaries from that design remain in
force unless changed here.

## 1. Objective

Allow an authenticated customer to request a full refund automatically during
the first seven calendar days after the initial payment confirmation, while
keeping access, provider state, retries, and audit data consistent.

Replace the pre-launch paid catalog with:

- monthly: R$ 39.90 for one month of access;
- semiannual: R$ 179.40 for six months of access, payable by Pix up front or by
  credit card in up to six installments (6x R$ 29.90).

Lucrivo has not entered production and has no customer data. The existing
billing migration baseline may therefore be rewritten and every non-production
database reset. No annual compatibility path or price migration is required.

## 2. Product Rules

### 2.1 Monthly plan

- Price: R$ 39.90.
- Credit card uses an Asaas recurring monthly subscription.
- Pix uses a detached charge and grants one non-renewing month of access.
- Normal cancellation of a credit-card subscription prevents future renewals
  and preserves access through the paid period.

### 2.2 Semiannual plan

- Total price: R$ 179.40.
- Credit card uses a non-renewing installment purchase with a maximum of six
  installments. Six installments are R$ 29.90 each.
- Pix uses a detached charge for R$ 179.40 up front.
- Access lasts six months from payment confirmation.
- The plan does not renew automatically.
- Copy must not present R$ 29.90 as a recurring monthly subscription.

### 2.3 Refund policy

- The customer may request one full refund for the current paid contract until
  and including the instant seven calendar days after its initial payment was
  confirmed.
- The eligibility clock starts at `billing_contracts.access_starts_at`, which
  is populated only from a verified Asaas payment/Checkout event. The server
  compares the deadline with the database clock; browser time is never trusted.
- The rule applies to both plans and both supported payment methods.
- Partial customer-initiated refunds are not supported.
- A valid request blocks paid access immediately.
- A rejected provider request restores the access state that existed before
  the refund attempt. A timeout or ambiguous provider outcome keeps access
  blocked until reconciliation so Lucrivo cannot grant access after a refund
  that may already have succeeded.
- A monthly credit-card refund also ends the recurring subscription. Refund
  completion must not leave a source capable of creating future charges.
- A confirmed refund ends paid access. Existing reports remain stored and the
  existing free-report access rules continue to apply.
- A rejected attempt may be retried through the same local request while the
  seven-day window remains open. Submitted, ambiguous, or confirmed attempts
  cannot be duplicated by the customer.
- A partial refund originating outside Lucrivo remains a manual-reconciliation
  case and does not silently apply the full-refund policy.

## 3. Chosen Architecture

Use an authenticated route backed by a durable, idempotent refund record and
the existing Asaas webhook ledger:

1. The account page derives whether the current contract appears eligible and
   offers a refund confirmation action.
2. `POST /api/billing/refund` authenticates the caller, validates the request
   origin, and accepts no amount, provider ID, or contract ownership claim from
   the browser.
3. A service resolves exactly one current contract for the authenticated user.
   Multiple current contracts are treated as a reconciliation error rather
   than selecting one arbitrarily.
4. A service-role-only database operation atomically validates ownership,
   deadline, provider identifiers, contract state, and request idempotency. It
   records the attempt and moves the contract to `refund_pending`, which is not
   an access-granting status.
5. The server calls the appropriate Asaas refund endpoint.
6. Provider acceptance records `submitted`. Verified webhooks remain the source
   of truth for financial completion and move the request to `confirmed`.
7. Definitive provider rejection records `rejected` and atomically restores the
   prior access state. Ambiguous outcomes record `pending_reconciliation` and
   are never retried blindly.

This approach is preferred over a separate queue because it fits the current
application volume and boundaries while retaining the durable state required
to recover from network failures. Direct provider calls without a local record
are explicitly out of scope because they cannot provide safe idempotency or an
audit trail.

## 4. Provider Operations

The Asaas gateway gains narrowly typed operations and parses only the response
fields needed to classify the result:

- monthly credit card, monthly Pix, and semiannual Pix:
  `POST /v3/payments/{paymentId}/refund` with an empty object so the refund is
  integral;
- semiannual credit card:
  `POST /v3/installments/{installmentId}/refund` with an empty object so the
  complete installment purchase is refunded;
- monthly credit card, after the refund request is accepted:
  `DELETE /v3/subscriptions/{subscriptionId}` to prevent future renewals.

For monthly and Pix flows, the server resolves the first confirmed or received,
non-refunded payment associated with the contract. For semiannual card flows it
uses the installment ID stored on the contract. If the required resource has
not arrived through a webhook yet, the request is reported as not ready and no
refund state is created.

Refund is requested before recurring-subscription deletion. Therefore a
definitively rejected refund can restore access without having first canceled
the customer's renewal. After refund acceptance, failure or ambiguity while
deleting the subscription becomes a reconciliation case and access stays
blocked.

Asaas may reject a Pix refund when the receiving account lacks enough available
balance because provider fees are not returned. This is a definitive rejection
for the current attempt: Lucrivo restores access, preserves a sanitized failure
code, and permits another attempt inside the eligibility window after the
operational issue is corrected.

Asaas documentation:

- [Refund payment](https://docs.asaas.com/reference/estornar-cobranca)
- [Refund installment](https://docs.asaas.com/reference/estornar-parcelamento)
- [Checkout](https://docs.asaas.com/docs/checkout-asaas)

## 5. Data Model

### 5.1 Billing catalog baseline

Rewrite the initial billing migration rather than adding legacy compatibility:

- `billing_mode` permits only `monthly` and `semiannual`;
- monthly catalog shape requires `amount_cents = 3990`, no installment limit,
  and one access month for the initial row;
- semiannual catalog shape requires `amount_cents = 17940`, installment limit
  six, and six access months for the initial row;
- contract purchase combinations permit monthly/card/recurring,
  monthly/Pix/detached, semiannual/card/installment, and
  semiannual/Pix/detached;
- price and contract snapshots remain immutable at runtime.

The first catalog version uses the existing deterministic IDs where practical
so unrelated fixtures do not churn, but their commercial contents become the
new pre-launch baseline.

### 5.2 Contract state

Add `refund_pending` to the allowed `billing_contracts.status` values.
`refund_pending` never grants paid access and prevents a new Checkout until the
attempt becomes rejected or confirmed/reconciled.

The cancellation invariant must allow a previously `cancel_at_period_end`
contract to enter `refund_pending` without losing the facts that its recurrence
was already canceled. Restoring a rejected refund returns the exact prior
access status and cancellation flags.

### 5.3 `billing_refund_requests`

Create a private-by-default table in `public` with:

- `id uuid primary key`;
- `contract_id uuid not null unique references billing_contracts`;
- `user_id uuid not null references auth.users`;
- `status text not null` constrained to `processing`, `submitted`,
  `confirmed`, `rejected`, or `pending_reconciliation`;
- `previous_contract_status text not null` constrained to `active` or
  `cancel_at_period_end`;
- `eligibility_started_at timestamptz not null`;
- `eligibility_ends_at timestamptz not null`;
- `requested_at`, `last_attempt_at`, `provider_submitted_at`,
  `refund_confirmed_at`, `recurrence_canceled_at`, `rejected_at`,
  `created_at`, and `updated_at` timestamps as applicable;
- `attempt_count integer not null` with a positive check;
- `last_error_code text nullable`, containing only an internal allow-listed,
  sanitized code.

The unique contract key is the idempotency boundary. Retrying a rejected
request updates the same row and increments `attempt_count`. An index on status
and `updated_at` supports reconciliation work.

Enable RLS. Revoke default table privileges, grant authenticated users read
access only to their own row, and reserve inserts/updates/deletes for the
service role. Database functions used for atomic state transitions remain
`security invoker`, are executable only by `service_role`, use a pinned empty
search path, and schema-qualify all objects.

## 6. State Transitions and Webhooks

### 6.1 Request transitions

```text
eligible active contract
  -> processing + refund_pending contract
  -> submitted                      provider accepted refund
  -> confirmed + refunded contract  refund webhook received

processing
  -> rejected + restored contract   definitive provider rejection
  -> pending_reconciliation         timeout or ambiguous outcome

rejected
  -> processing                     retry inside the original deadline
```

For recurring card contracts, provider acceptance of subscription deletion or
a matching subscription webhook records `recurrence_canceled_at`. The request
is operationally complete only when refund confirmation is present and no
future recurrence remains. Arrival order must not matter.

### 6.2 Existing webhook reducer

Extend the existing idempotent reducer so:

- `PAYMENT_REFUNDED` continues to mark the payment and contract as refunded and
  truncate access immediately;
- when a matching refund request exists, it also records financial confirmation
  and advances the request when recurrence requirements are satisfied;
- `SUBSCRIPTION_INACTIVATED` and `SUBSCRIPTION_DELETED` record recurrence
  cancellation for a refund in progress instead of incorrectly replacing its
  contract state with normal end-of-period cancellation;
- `PAYMENT_PARTIALLY_REFUNDED` remains processed with
  `manual_review_required` and never confirms a full-refund request;
- external refunds without a customer request retain the current behavior and
  revoke access;
- duplicate and out-of-order events converge without extending access or
  issuing another provider request.

## 7. API and User Experience

### 7.1 API results

The refund route returns stable application outcomes rather than provider
payloads:

- accepted/already accepted;
- not eligible or eligibility expired;
- payment information not ready;
- provider rejected with a safe customer message;
- pending reconciliation;
- service unavailable.

The route uses `Cache-Control: no-store`. It validates the request `Origin`
against the configured application origin and relies on the authenticated
server session. Logs must not contain the API key, raw provider response,
payment IDs, or customer financial data.

### 7.2 Billing page

For an eligible active contract, show:

- the final eligibility date;
- a `Pedir reembolso` action;
- a confirmation dialog explaining that the refund is integral, access ends
  immediately, and card statement processing can take up to ten business days.

After submission, replace plan-purchase actions with a status card while the
request is processing, submitted, or awaiting reconciliation. A rejected
request shows a safe explanation and permits retry only while eligible. A
confirmed request shows completion and does not claim that a card issuer has
already displayed the credit.

The pricing interface replaces the annual card with a featured semiannual card:

- `6x de R$ 29,90`;
- `ou R$ 179,40 à vista`;
- `Economize R$ 60,00 em seis meses` compared with six monthly payments;
- `R$ 39,90/mês` for monthly;
- plan names, accessible labels, Checkout item copy, account summaries, and
  admin summaries consistently use `Semestral`.

## 8. Error Handling and Reconciliation

- HTTP 4xx provider errors other than timeout/rate-limit classes are treated as
  definitive rejection and mapped to internal allow-listed codes.
- Transport errors, timeouts, malformed success responses, rate limits, and
  server errors are ambiguous. They move the request to
  `pending_reconciliation` and are not retried automatically.
- Reconciliation must query the relevant payment, installment, and subscription
  before any operator retries a provider mutation.
- A refund that succeeded while subscription deletion did not remains blocked
  and visible to operations until recurrence cancellation is confirmed.
- A received refund webhook always wins over a prior local rejection or stale
  access state and revokes paid access.
- The runbook documents balance-related Pix rejection, permissions required by
  the API key, webhook events, lookup steps, and safe recovery.

## 9. Security and Privacy

- The browser controls no amount, refund target, provider identifier, deadline,
  or user ID.
- The authenticated user can read only their own contract and refund summary.
- Provider mutations use the server-only Asaas API key. The key must have the
  provider permission required to write refunds.
- All exposed tables use RLS plus explicit grants. Tests cover both ownership
  and denial cases.
- Webhook token validation, payload redaction, and ledger idempotency remain
  mandatory.
- Only normalized states, timestamps, and sanitized internal error codes are
  persisted for the customer-initiated operation.

## 10. Testing

### 10.1 Database tests

Add pgTAP coverage for:

- the new monthly and semiannual catalog shapes and rejection of annual data;
- access duration and Checkout snapshot constraints;
- eligibility immediately before, exactly at, and immediately after the
  seven-day deadline;
- ownership, RLS, grants, and forbidden direct mutations;
- one request per contract and safe rejected-attempt retry;
- immediate access revocation, exact state restoration on rejection, and
  Checkout blocking during unresolved refunds;
- full, partial, duplicate, and out-of-order webhook events;
- recurring cancellation and refund events arriving in either order.

### 10.2 Application tests

Cover:

- gateway paths and response validation for payment and installment refunds;
- monthly card, monthly Pix, semiannual card, and semiannual Pix service flows;
- definitive rejection, insufficient Pix balance, ambiguous responses,
  duplicate submission, missing identifiers, and multiple active contracts;
- authenticated route behavior, origin validation, cache headers, and safe
  errors;
- eligible, confirmation, loading, submitted, rejected, reconciliation, and
  confirmed UI states;
- new prices, installment math, savings copy, and removal of annual copy.

### 10.3 Release verification

Because this is a pre-production baseline rewrite, verification starts from a
destructive local Supabase reset, then runs database tests and advisors, type
generation with a clean diff, application checks, and the production build.

The Asaas sandbox matrix must exercise all four plan/payment combinations, the
seven-day boundary, duplicate clicks, a full refund, recurring cancellation,
Pix insufficient balance, ambiguous response recovery, webhook re-delivery,
and event order reversal. No production deployment proceeds until the sandbox
ledger, contract, payment, request, access, and user-visible states agree.

## 11. Documentation Impact

Update:

- the Asaas billing runbook with refund operations and reconciliation;
- product and billing copy that refers to the annual plan or old prices;
- environment/credential guidance with the required Asaas refund permission;
- the previous billing design with a supersession note pointing here.

The implementation does not add a queue, partial-refund UI, admin refund
approval workflow, prorated refunds, plan switching, or production data
migration.
