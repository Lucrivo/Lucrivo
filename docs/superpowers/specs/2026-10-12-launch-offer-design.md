# Launch Offer Design

**Date:** 2026-10-12  
**Status:** Awaiting final review  
**Supersedes:** The paid catalog prices, access durations, and pricing copy in
`2026-10-08-billing-refunds-and-plan-pricing-design.md`. Its refund policy,
security boundaries, and non-promotional billing behavior remain in force.

## 1. Objective

Launch Lucrivo with one globally timed, 15-day commercial campaign that:

- charges R$ 39.90 for the monthly plan and grants two months before the second
  charge;
- charges R$ 179.40 for the semiannual plan and grants twelve months of access;
- lets semiannual card customers choose from one through six installments;
- automatically returns to the standard catalog after the campaign;
- communicates the deadline on the landing page and, at the appropriate time,
  inside the authenticated product;
- preserves the exact offer accepted by a customer even when provider events
  arrive after the campaign deadline.

The campaign does not have a launch date at implementation time. Operations
activate it by setting one server-only environment variable after the product
is ready.

## 2. Commercial Rules

### 2.1 Campaign window

- `LAUNCH_OFFER_START_AT` is the only operational campaign setting.
- Its value is an ISO 8601 instant with an explicit offset, for example
  `2026-10-20T09:00:00-03:00`.
- The campaign starts at that instant, inclusively, and ends exactly 15 elapsed
  days later, exclusively.
- A missing variable means the campaign is disabled and the standard catalog
  applies.
- A present but invalid variable is a configuration error. Paid offers and new
  Checkout creation fail closed rather than silently using another catalog.
- Browser time is presentational only. Catalog and Checkout eligibility always
  use server time.

### 2.2 Launch catalog

Monthly:

- R$ 39.90 charged immediately;
- two months of initial access: one paid month plus one bonus month;
- credit card renews monthly only after those first two months;
- Pix grants the same two months without automatic renewal.

Semiannual:

- R$ 179.40 total;
- Pix is paid up front;
- credit card permits any installment count from one through six, selected in
  the Asaas Checkout;
- six installments equal R$ 29.90 each, but six installments are not mandatory;
- twelve months of access: six contracted months plus six bonus months;
- no automatic renewal.

### 2.3 Standard catalog

After the campaign:

- monthly costs R$ 49.90 and grants one month of access per payment;
- semiannual costs R$ 239.40, permits one through six card installments or Pix
  up front, and grants six months of access;
- six standard semiannual installments equal R$ 39.90 each;
- neither plan receives promotional bonus time.

### 2.4 Eligibility snapshot

- The offer is accepted when Lucrivo successfully creates the provider
  Checkout, not when a later webhook arrives.
- A promotional Checkout created before the deadline remains usable for its
  existing one-hour lifetime.
- Reusing that same unexpired Checkout after the campaign ends is allowed.
- Creating a new promotional Checkout at or after the deadline is forbidden.
- Every contract snapshots the selected catalog version, amount, total access
  months, bonus months, and campaign code. Later catalog changes cannot alter
  it.

## 3. Chosen Architecture

Use a hybrid configuration:

1. The environment variable controls only the global start instant.
2. Immutable Supabase catalog rows hold commercial terms for `launch` and
   `standard` variants.
3. A pure server-side campaign resolver accepts a validated configuration and
   injected clock, derives the exclusive end instant, and returns the current
   campaign phase and catalog code.
4. Landing and authenticated routes receive a safe offer projection containing
   only display terms and the end instant.
5. Checkout independently resolves the campaign again and accepts only the
   server-selected price, except for reuse of an already snapshotted,
   unexpired Checkout belonging to the current user.
6. Verified Asaas webhooks remain the authority for payment confirmation and
   access activation.

This is preferred over a campaign table because there is one planned launch
window and no requirement for an administrative campaign manager. It is
preferred over environment-only commercial terms because prices and access
grants need immutable database history and constraints.

## 4. Configuration Contract

Create one server-only configuration reader. It must never expose the raw
environment to client components.

Its outcomes are:

- `disabled`: the variable is absent; use `standard`;
- `scheduled`: the current instant is before the configured start; use
  `standard` and do not display the launch campaign;
- `active`: the instant is in `[startAt, startAt + 15 days)`; use `launch` and
  expose `endsAt`;
- `expired`: the instant is at or after `endsAt`; use `standard` and do not
  display the campaign;
- `invalid`: the variable is present but cannot be parsed as an ISO instant
  with an explicit offset; suppress paid offers and reject Checkout creation as
  unavailable while logging a sanitized operational error.

The route output must not be cached beyond a campaign boundary. A page open as
the deadline passes refreshes its server data before presenting normal prices.

## 5. Data Model

### 5.1 Immutable prices

Extend `billing_prices` with an allow-listed catalog code that distinguishes
`launch` from `standard`. Both variants can be sellable records at the same
time, so uniqueness applies per product, billing mode, and catalog code rather
than only per product and mode.

The immutable rows are:

| Catalog    | Mode       |      Amount | Installment maximum |    Access |    Bonus |
| ---------- | ---------- | ----------: | ------------------: | --------: | -------: |
| `launch`   | monthly    |  3990 cents |                none |  2 months |  1 month |
| `launch`   | semiannual | 17940 cents |                   6 | 12 months | 6 months |
| `standard` | monthly    |  4990 cents |                none |   1 month | 0 months |
| `standard` | semiannual | 23940 cents |                   6 |  6 months | 0 months |

Checks must encode these supported shapes without treating `access_months` as
the provider installment count. The public catalog policy may expose sellable
rows, but the browser never decides which one is currently eligible.

### 5.2 Contract snapshot

Extend `billing_contracts` with the catalog code and bonus-month snapshot.
Existing amount, installment, and access-month columns continue to snapshot the
rest of the offer. The contract shape permits promotional monthly access of two
months and promotional semiannual access of twelve months only when their
catalog code and bonus agree.

For promotional monthly card contracts, persist a narrowly scoped renewal
adjustment state with enough timestamps and sanitized error state to distinguish
`not_required`, `pending`, `completed`, and `pending_reconciliation`. Provider
identifiers remain server-only.

### 5.3 Access calculation

- Initial `CHECKOUT_PAID` activation uses the snapshotted `access_months`.
- The first confirmed monthly-card payment must not shorten a promotional
  two-month access interval.
- Later monthly-card payments extend access to one month after their due date.
- Monthly Pix activation uses the snapshotted access months and never recurs.
- Semiannual activation uses the snapshotted access months, which can be six or
  twelve.
- Duplicate or out-of-order events never add the bonus twice.

## 6. Asaas Payment Flows

### 6.1 Semiannual

Send the complete purchase amount and `maxInstallmentCount: 6`. Asaas owns the
customer's choice of one, two, three, four, five, or six card installments.
Lucrivo must not send or infer a mandatory installment count. Pix remains a
detached, up-front payment. Both methods activate the same snapshotted access
duration.

### 6.2 Promotional monthly credit card

The first charge occurs immediately. Configure the promotional Checkout so the
provider cannot generate a second charge after only one month. Once the
subscription identifier is received through a verified event, update the
subscription to a monthly cycle with its next charge due two months after the
first due date.

The adjustment is idempotent and uses the snapshotted contract terms. A
successful repeated call produces the same provider configuration. Processing
later events for the same contract may retry a pending adjustment.

If the adjustment is rejected or its outcome is ambiguous:

- the customer retains the promised two months of access;
- the provider remains on the safer non-early-charge schedule;
- the contract records `pending_reconciliation`;
- logs contain only contract-local and sanitized error information;
- operations reconcile the provider state before changing the schedule.

This design deliberately fails in the customer's favor: an adjustment failure
may postpone revenue but cannot charge before the promised bonus month ends.

Asaas references:

- [Checkout with recurring subscription](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente)
- [Update an existing subscription](https://docs.asaas.com/reference/atualizar-assinatura-existente)

### 6.3 Refund and cancellation compatibility

- The existing seven-day full-refund window starts from verified initial access
  activation and applies unchanged to launch contracts.
- Refunding a promotional monthly card contract also removes its recurring
  subscription.
- Canceling it normally prevents future renewal while preserving access through
  the two-month promotional interval already granted.
- Semiannual launch purchases keep the existing non-renewing refund flow.

## 7. Interface Design

This is an extension of the existing Lucrivo visual world. It does not replace
the landing page composition, app shell, type, palette, or component language.

### 7.1 Landing page

Visitor mode is **Persuade**. During an active campaign:

- place a launch callout and countdown near the primary hero action so the
  condition is visible in the first viewport;
- state the monthly entry price, the time bonus, and the deadline without
  implying that Lucrivo knows the visitor's market or guarantees profit;
- mark paid plan cards as launch conditions;
- present monthly as R$ 39.90 with two months before the second charge;
- present semiannual as R$ 179.40 up front or in up to six installments of
  R$ 29.90, with twelve months of access;
- show standard later prices as contextual comparison, visually subordinate to
  the amount charged now;
- explain near Checkout actions that an offer started before the deadline is
  held for the Checkout's one-hour lifetime.

Outside the active window, render no campaign countdown or bonus claim and show
only the standard catalog. Metadata and offer copy must derive from the same
server-selected catalog rather than retaining R$ 39.90 as a hard-coded fallback.

### 7.2 Authenticated offer strip

Visitor mode is **Operate**. Place a compact, responsive strip between the
sticky header and page content for free, non-admin users while the campaign is
active.

Before the free diagnosis is used:

- do not show the countdown;
- invite the user to complete the included diagnosis before choosing a plan;
- use the action `Fazer diagnóstico grátis` linking to the quick diagnosis.

After the free diagnosis is used:

- show the launch offer, time bonuses, and countdown;
- use the action `Ver oferta nos planos` linking to `/billing`.

Do not render the strip for paid users, administrators, or outside the active
campaign. The strip is not dismissible because it changes state based on a real
product milestone and disappears when no longer relevant.

### 7.3 Countdown behavior and accessibility

- Display days, hours, minutes, and seconds using the absolute server-provided
  end instant.
- Keep content visible without animation and honor reduced-motion preferences.
- Do not announce every second to assistive technology. Provide a stable
  accessible deadline and, at most, minute-level live updates.
- When the timer reaches zero, stop promotional actions immediately, announce
  that the offer ended, and refresh server data.
- On mobile, stack message, time, and action without horizontal overflow. On
  desktop, keep the strip compact and scannable.

## 8. Error Handling and Reconciliation

- Missing or malformed catalog rows retain the existing free plan and replace
  paid offers with the unavailable state.
- Invalid campaign configuration produces an observable server error and no
  paid Checkout rather than a fallback charge.
- A client-supplied expired or wrong-catalog price ID returns a stable
  not-found/unavailable result and creates no contract.
- A provider mutation with a definitive 4xx result records a sanitized rejected
  adjustment. Transport failures, rate limits, malformed success responses,
  timeouts, and 5xx responses are ambiguous and require reconciliation.
- Reprocessing webhooks and retrying renewal adjustment are idempotent.
- Customer UI never exposes provider IDs or promises that a pending adjustment
  has completed.
- The billing runbook describes activation, deactivation, boundary checks,
  adjustment reconciliation, and safe recovery.

## 9. Security and Privacy

- `LAUNCH_OFFER_START_AT` is server-only and has no `NEXT_PUBLIC_` equivalent.
- Browser requests never choose an amount, access duration, bonus, catalog code,
  campaign deadline, recurrence cycle, or provider identifier.
- Checkout resolves ownership and eligible catalog terms on the server.
- Contract commercial snapshots remain immutable after creation.
- Existing RLS, grants, service-role provider mutations, origin checks, webhook
  authentication, payload validation, and event ledger idempotency remain
  mandatory.

## 10. Testing

### 10.1 Domain and service tests

Cover:

- absent, malformed, scheduled, start-inclusive, active, end-exclusive, and
  expired campaign configuration;
- launch and standard catalog resolution with an injected clock;
- refusal of expired, forged, and wrong-catalog price IDs;
- reuse of a same-user promotional Checkout that remains within its one-hour
  lifetime after the campaign ends;
- promotional monthly Checkout recurrence and next-charge adjustment;
- semiannual card Checkout with a maximum of six rather than a forced count;
- Pix behavior for both plans;
- definitive and ambiguous provider failures plus idempotent adjustment retry.

### 10.2 Database tests

Use pgTAP to cover:

- all four immutable catalog shapes and rejection of mismatched code, price,
  bonus, installment, or access values;
- public catalog reads, forbidden direct commercial mutation, and service-role
  writes;
- complete launch snapshots on contracts;
- two-month monthly and twelve-month semiannual activation;
- later monthly renewal after the initial bonus interval;
- duplicate and out-of-order Checkout, subscription, and payment events;
- refund and cancellation compatibility.

### 10.3 Interface and route tests

Cover:

- landing active and inactive offer copy;
- explicit one-to-six semiannual installment language;
- pre-diagnosis and post-diagnosis authenticated strip states;
- suppression for paid and admin users;
- countdown boundary, accessible deadline, reduced motion, and server refresh;
- responsive layout at representative desktop and 390-pixel mobile widths;
- paid-offer unavailable state for invalid configuration or catalog data.

### 10.4 Release verification

- Update the deterministic demo model, generated `supabase/seed.sql`, and seed
  assertions instead of hand-editing generated fixture sections.
- Run billing pgTAP suites, database lint/advisors, generated-type verification,
  targeted application tests, full checks, and a production build.
- Exercise both catalogs and all four plan/payment combinations in Asaas
  sandbox.
- Verify monthly promotional first charge, two-month next charge, later monthly
  recurrence, all six permissible semiannual installment choices, Pix,
  deadline crossing, Checkout reuse, refund, cancellation, and webhook replay.
- Capture and inspect the landing page and authenticated strip together at
  desktop and mobile widths in one bounded visual review pass.

## 11. Operational Procedure

Before activation:

1. Deploy code, catalog data, and generated types with
   `LAUNCH_OFFER_START_AT` absent.
2. Verify that standard prices render and promotional price IDs are rejected.
3. Complete the Asaas sandbox matrix and production readiness checks.
4. Choose the launch instant in `America/Sao_Paulo` and convert it to an ISO
   instant with explicit `-03:00` offset.
5. Set `LAUNCH_OFFER_START_AT` and deploy the configuration before the chosen
   instant.
6. Verify the scheduled state before launch, the exact start boundary, the
   calculated end instant, and Checkout snapshots.

Deactivation normally requires no operation: the resolver changes to the
standard catalog at the exclusive end instant. Removing the variable also
disables the campaign, but operations must not do so while intending to honor
new launch Checkouts. Existing promotional contracts and unexpired Checkouts
remain governed by their snapshots.

## 12. Explicit Non-Goals

- Multiple campaigns, coupon codes, referral discounts, or per-user windows.
- An admin interface for campaign scheduling.
- Automatic renewal of the semiannual plan.
- Mandatory six-installment semiannual payment.
- Extending the offer based on registration or diagnosis completion time.
- Trusting browser time or client-provided commercial terms.
- Changing the seven-day refund policy.
