# Split Launch Offer Windows Design

**Date:** 2026-10-16  
**Status:** Approved

**Supersedes:** The single 15-day campaign window, two-catalog model, and
promotional-renewal price behavior in
`2026-10-12-launch-offer-design.md`. The earlier design's security, refund,
Checkout reservation, snapshot, and non-promotional billing rules remain in
force.

## 1. Objective

Separate the launch price eligibility window from the bonus-access window:

- the launch prices are available for exactly 30 elapsed days after the
  configured launch instant;
- bonus access is available only during the first 15 elapsed days;
- the monthly launch price applies only to the first payment, after which card
  subscriptions renew at the standard R$ 49.90 monthly price;
- the server remains the sole authority for phase, catalog, price, access
  duration, recurrence, and deadline decisions;
- purchases and already-created Checkouts preserve the exact terms accepted at
  creation time.

The change must preserve all existing contracts and the meaning of the existing
`launch` and `standard` catalog codes.

## 2. Approved Commercial Rules

`LAUNCH_OFFER_START_AT` remains the only operational campaign setting. It is an
ISO 8601 instant with an explicit offset. Both windows use elapsed time, not
calendar-month arithmetic.

The intervals are start-inclusive and end-exclusive:

| Interval                                     | Catalog        | Monthly                                             | Semiannual                                     |
| -------------------------------------------- | -------------- | --------------------------------------------------- | ---------------------------------------------- |
| `[start, start + 15 days)`                   | `launch`       | R$ 39.90, 2 months of initial access, 1 bonus month | R$ 179.40, 12 months of access, 6 bonus months |
| `[start + 15 days, start + 30 days)`         | `launch_price` | R$ 39.90, 1 month of access, no bonus               | R$ 179.40, 6 months of access, no bonus        |
| Before `start` or at/after `start + 30 days` | `standard`     | R$ 49.90, 1 month of access                         | R$ 239.40, 6 months of access                  |

At exactly `start + 15 days`, bonus eligibility has ended and
`launch_price` applies. At exactly `start + 30 days`, all launch-price
eligibility has ended and `standard` applies.

For monthly credit-card purchases, R$ 39.90 is the first-payment price only.
The next charge is R$ 49.90:

- after two months for a `launch` purchase;
- after one month for a `launch_price` purchase.

Monthly Pix remains a detached purchase and has no automatic renewal. A later
purchase uses whichever catalog is eligible at that later instant.

Semiannual purchases remain detached and non-renewing. Credit-card customers
may choose one through six installments in Asaas; Pix is paid up front.

The private Bônus library is independent of bonus access time. Its current
confirmed-purchase grant and revocation rules do not change.

## 3. Campaign Resolution

The pure server-side resolver calculates two fixed-duration boundaries:

```text
bonusEndsAt     = startAt + 15 * 24 * 60 * 60 * 1000
promotionEndsAt = startAt + 30 * 24 * 60 * 60 * 1000
```

Its discriminated outcomes are:

- `disabled`: the environment variable is absent; select `standard`;
- `scheduled`: the current instant is before `startAt`; select `standard`;
- `bonus_active`: the current instant is in the first interval; select
  `launch` and expose `bonusEndsAt` as the current display deadline;
- `price_active`: the current instant is in the second interval; select
  `launch_price` and expose `promotionEndsAt` as the current display deadline;
- `expired`: the current instant is at or after `promotionEndsAt`; select
  `standard`;
- `invalid`: a present value lacks an explicit offset, cannot be parsed, or the
  injected clock is non-finite; expose no catalog and fail paid offers closed.

Every `scheduled`, active, or `expired` outcome carries normalized `startsAt`,
`bonusEndsAt`, and `promotionEndsAt` timestamps. The `disabled` outcome carries
null timestamps. Active outcomes also carry an `endsAt` alias for the deadline
relevant to their phase so countdown consumers do not choose a deadline
themselves.

Server-rendered pages and the Checkout route resolve the phase independently
using server time. Browser clocks only render the countdown and trigger a
server refresh when the supplied phase deadline is reached.

## 4. Catalog and Contract Model

Keep `launch` and `standard` unchanged and add `launch_price`. This avoids
rewriting historical contracts and makes each price ID represent one immutable
combination of amount, access, and bonus.

The approved catalog shapes are:

| Catalog        | Mode       |      Amount | Installment maximum |    Access |    Bonus |
| -------------- | ---------- | ----------: | ------------------: | --------: | -------: |
| `launch`       | monthly    |  3990 cents |                none |  2 months |  1 month |
| `launch`       | semiannual | 17940 cents |                   6 | 12 months | 6 months |
| `launch_price` | monthly    |  3990 cents |                none |   1 month | 0 months |
| `launch_price` | semiannual | 17940 cents |                   6 |  6 months | 0 months |
| `standard`     | monthly    |  4990 cents |                none |   1 month | 0 months |
| `standard`     | semiannual | 23940 cents |                   6 |  6 months | 0 months |

An imperative Supabase migration must:

1. extend catalog-code checks on `billing_prices` and `billing_contracts`;
2. extend the immutable shape checks with the two `launch_price` tuples;
3. insert exactly one active `launch_price` row for each billing mode with new,
   stable UUIDs and a new version;
4. extend promotional monthly renewal-adjustment checks and claims to both
   `launch` and `launch_price`;
5. preserve all existing rows and snapshots without rewriting their catalog,
   amount, access, or bonus fields;
6. preserve existing RLS, grants, unique active-catalog index, and commercial
   immutability trigger behavior.

Contract creation snapshots the new catalog code exactly like the existing two
catalogs. Initial access activation continues to derive from the snapshotted
`access_months`; duplicate or out-of-order events cannot grant time twice.

## 5. Checkout and Eligibility Snapshot

The browser continues to submit only a server-issued price UUID and payment
method. The Checkout route resolves the current phase, loads only that phase's
catalog, and rejects a price UUID from another catalog.

A Checkout accepts and snapshots the commercial condition when its provider
creation succeeds. An unexpired Checkout belonging to the same user may be
reused for its existing one-hour lifetime after a phase boundary. Therefore:

- a `launch` Checkout created immediately before day 15 may still grant its
  bonus when completed within its reservation lifetime;
- a `launch_price` Checkout created immediately before day 30 may still charge
  the promotional first-payment price within its reservation lifetime;
- a new Checkout created at or after a boundary must use the newly eligible
  catalog.

The reservation rule is intentional and must remain explicit in customer copy.

Monthly card Checkout payloads differ by catalog:

- `launch`: initial value R$ 39.90 and `BIMONTHLY` cycle, preventing an early
  second charge during the two-month access interval;
- `launch_price`: initial value R$ 39.90 and `MONTHLY` cycle;
- `standard`: value R$ 49.90 and `MONTHLY` cycle, with no post-payment
  promotional adjustment.

Pix and semiannual payload behavior otherwise remains unchanged.

## 6. Promotional Monthly Renewal Adjustment

Both promotional monthly card catalogs require one idempotent adjustment after
the verified initial payment. The existing renewal-adjustment state remains the
source of truth; existing completed or reconciliation states are preserved.

The database claim operation must:

- accept `launch` and `launch_price` monthly recurring contracts only;
- locate the first confirmed/received payment due date;
- derive `nextDueDate` by adding the contract's snapshotted `access_months` to
  that first due date;
- return a target cycle of `MONTHLY` and target amount of 4990 cents;
- keep its existing locking, stale-processing recovery, and idempotent status
  transitions.

The Asaas gateway update sends:

```json
{
  "cycle": "MONTHLY",
  "nextDueDate": "<derived ISO date>",
  "value": 49.9,
  "updatePendingPayments": true
}
```

The gateway validates that the successful response identifies the requested
subscription and reports the expected cycle, date, and value. A malformed
success response is ambiguous, not successful.

Asaas requires tokenization to be enabled for changing value or due date on a
credit-card subscription. Sandbox supports it; production enablement must be
confirmed with the account manager before rollout. This is an operational
prerequisite, not a condition to weaken application validation.

If the provider rejects the update or its outcome is ambiguous:

- the customer keeps the purchased access interval;
- the contract moves to `pending_reconciliation` with a sanitized error code;
- logs contain no provider secret or customer payment data;
- webhook processing remains retryable;
- the system never claims that the standard renewal price was installed.

An adjustment failure is customer-favorable: the provider may retain a lower
price or later cadence until operations reconcile it, but the customer is never
charged earlier or more than the accepted terms.

Reference: [Asaas — Atualizar assinatura existente](https://docs.asaas.com/reference/atualizar-assinatura-existente).

## 7. Interface Behavior

All public and authenticated paid-plan projections derive from the selected
server catalog. No component infers eligibility from its own clock.

During `bonus_active`:

- show R$ 39.90 monthly and R$ 179.40 semiannual;
- state two initial months for monthly and twelve months for semiannual;
- show one/six bonus months explicitly;
- label the countdown as the remaining time to receive bonus access;
- keep the one-hour Checkout reservation explanation.

During `price_active`:

- keep R$ 39.90 monthly and R$ 179.40 semiannual;
- state one month for monthly and six months for semiannual;
- remove every bonus-time claim;
- state that the monthly promotional amount applies to the first payment and
  later renews at R$ 49.90;
- label the countdown as the remaining time for the launch price;
- keep the one-hour Checkout reservation explanation.

After expiry or before launch, show only the standard catalog and no campaign
countdown. For both active phases, semiannual copy continues to say “em até 6x”
and never implies that six installments are mandatory.

The launch dialog, landing callout/bar, billing plans, post-diagnosis offer, and
metadata use phase-specific projections. The countdown's accessible text
describes the relevant deadline and does not announce every second. Reaching
zero refreshes server data so a day-15 transition reveals `launch_price` rather
than incorrectly jumping to `standard`.

## 8. Failure Handling and Security

- Invalid campaign configuration suppresses paid offers and returns a sanitized
  service-unavailable response from Checkout.
- Missing, duplicate, or malformed catalog rows retain the free plan but make
  paid offers unavailable.
- A forged, stale, or wrong-catalog price ID cannot create a new contract.
- Browser input never controls amount, bonus, access duration, catalog code,
  campaign deadline, recurrence cycle, renewal value, user ID, or provider ID.
- Contract commercial snapshots remain immutable.
- Existing RLS, explicit grants, webhook authentication, event-ledger
  idempotency, and provider payload redaction remain mandatory.
- Renewal-adjustment retries use the existing claim/result state machine and do
  not issue uncontrolled repeated mutations.

## 9. Documentation and Operational Rollout

Update `PRODUCT.md`, environment comments where necessary, billing runbook
content, generated database types, deterministic demo data, and seed assertions
to describe the two windows and first-payment-only monthly discount.

Rollout order:

1. confirm Asaas credit-card subscription tokenization in production;
2. apply the additive database migration, which remains compatible with the
   currently deployed two-catalog resolver;
3. deploy the application that can select `launch_price`;
4. verify phase resolution and all three catalog pairs against server time;
5. exercise both promotional monthly card adjustments in Asaas sandbox and
   inspect webhook reconciliation state;
6. monitor sanitized renewal-adjustment failures through the day-15 boundary.

No historical migration is edited. The project uses imperative migrations, so
the new migration file is created with the Supabase CLI before SQL is authored.

## 10. Verification

### 10.1 Domain boundaries

Test the exact instants immediately before and at:

- `startAt`;
- `startAt + 15 days`;
- `startAt + 30 days`.

Also cover missing configuration, malformed configuration, explicit timezone
offset normalization, and a non-finite injected clock.

### 10.2 Database and service behavior

Test:

- all six approved immutable price shapes and rejection of every mismatched
  amount/access/bonus/catalog combination;
- preservation of existing `launch` and `standard` contracts;
- `launch_price` contract snapshots for both payment methods and modes;
- initial access activation for 2/12-month bonus terms and 1/6-month
  price-only terms;
- monthly claim dates derived from one versus two access months;
- target renewal amount of 4990 cents;
- duplicate and out-of-order payment/webhook events;
- rejected, ambiguous, malformed-success, stale-processing, and repeated
  renewal adjustments.

### 10.3 Gateway and interface behavior

Test:

- the Asaas update request and response validation for cycle, date, and value;
- monthly/semiannual and card/Pix Checkout payloads in all three catalogs;
- landing, billing, post-diagnosis, and dialog presentation in both active
  phases;
- absence of bonus claims in `price_active`;
- countdown labels and server refresh at each phase boundary;
- unavailable paid offers for invalid configuration or catalog data;
- existing paid/admin suppression and responsive/accessibility behavior.

### 10.4 Release checks

Run targeted Vitest and pgTAP suites first, followed by generated-type and seed
verification, database lint/advisors, the full application check, and a
production build. Exercise first-payment adjustment in Asaas sandbox for both
promotional monthly catalogs before production deployment.
