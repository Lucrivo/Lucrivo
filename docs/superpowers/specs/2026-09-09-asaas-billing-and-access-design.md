# Asaas Billing and Quick Diagnosis Access Design

**Date:** 2026-09-09
**Status:** Approved design, amended 2026-09-10 for detached Pix payments

## 1. Objective

Add paid access to Lucrivo through Asaas while preserving a useful free tier and keeping payment state, product access, and historical prices auditable.

The product will offer:

- a monthly plan for **R$ 49.90**, either charged automatically to a credit card every month until cancellation or paid by Pix for one non-renewing month of access;
- an annual plan for **R$ 478.80**, paid either by Pix up front or by credit card in up to 12 installments (12 installments are R$ 39.90 each), with the total card purchase consuming the customer's card limit and no automatic renewal;
- a free tier that lets each authenticated user create exactly one quick-diagnosis report.

The hosted Asaas Checkout collects customer and payment data. Lucrivo does not collect Pix or card fields in its UI; if provider webhooks include masked card metadata or a card token, the webhook boundary discards the complete card object before persistence.

## 2. Product Rules

### 2.1 Free tier

`free` is a derived access state, not a persisted plan or subscription row. A user is free when no paid contract grants access at the current instant.

Every user may have one report designated as their free report:

- the first report created by a user is marked `is_free_report = true`, even if the user has paid access at that moment;
- no user may have more than one report with `is_free_report = true`;
- a free user may not create a second report;
- a paid user may create unlimited additional reports;
- when paid access ends, the free report remains readable and all additional reports remain stored but become inaccessible;
- reactivating paid access makes the additional reports readable again.

The application does not list locked paid reports to a free user and must not return their content, answers, summaries, or derived financial data. A direct attempt to open a previously known locked-report URL shows an upgrade state without report data.

### 2.2 Monthly plan

- Price: R$ 49.90 for one month of access.
- Credit card uses a recurring subscription (`RECURRENT`) with monthly cycle and renews automatically until cancellation.
- Pix uses a detached charge (`DETACHED`), grants one paid month, and never renews automatically. The customer purchases again after access expires.
- Cancellation inside Lucrivo applies only to the recurring credit-card contract.
- Normal card cancellation prevents future renewals but preserves access until the paid period ends.
- A confirmed refund or chargeback may revoke access immediately.

### 2.3 Annual plan

- Total price: R$ 478.80.
- Credit card uses an installment charge (`INSTALLMENT`) and offers between 1 and 12 installments; choosing 12 produces 12 charges of R$ 39.90.
- Pix uses a detached charge (`DETACHED`) for the full R$ 478.80 up front.
- The full R$ 478.80 consumes the customer's card limit at purchase time, regardless of the installment count selected.
- Access duration: 12 months from confirmed payment.
- Renewal: none. At expiry, the customer must purchase a new annual plan or start a monthly plan.
- A confirmed refund or chargeback may revoke access immediately.

Lucrivo must describe this offer as **“R$ 478,80 em até 12x sem juros — 12x de R$ 39,90”**, not as a recurring R$ 39.90 monthly subscription.

### 2.4 Price changes

Prices are versioned and immutable:

- an existing price row is never overwritten;
- changing a price creates a new version and deactivates the previous version;
- new checkouts use only the current active version;
- each contract stores a price snapshot, so later catalog changes cannot alter historical purchases;
- an existing annual card installment remains unchanged;
- existing monthly card subscribers remain on their contracted price unless Lucrivo deliberately performs a migration in Asaas and communicates it to affected customers.

## 3. Chosen Architecture

The integration has four boundaries:

1. **Price catalog:** Supabase stores immutable, versioned product prices and billing terms.
2. **Checkout creation:** an authenticated server endpoint resolves the active price, creates a pending local contract, creates a hosted Asaas Checkout, and redirects the user.
3. **Payment synchronization:** an unauthenticated but token-protected webhook stores each Asaas event idempotently and updates local billing state.
4. **Central access policy:** database functions and RLS determine whether a user can create or read a report. UI checks are present for usability but are never the security boundary.

Asaas remains the source of truth for payment events. Lucrivo's database remains the source of truth for application access derived from those events.

## 4. Checkout Flows

### 4.1 Common flow

1. The authenticated user selects an active price identifier and an allow-listed payment method, never an arbitrary amount.
2. The server reads the price from `billing_prices` and validates that it is active.
3. The server rejects duplicate purchasing when the user already has an active contract or a still-valid pending Checkout for this product. Plan switching during an active term is out of scope.
4. In one local transaction, the server creates a pending `billing_contracts` row with a generated internal reference and a snapshot of the selected offer.
5. If a verified `billing_customers` mapping already exists, the server sends that customer ID to Asaas. Otherwise, customer data is omitted and collected by Asaas.
6. The server calls `POST /v3/checkouts` using the internal contract reference as `externalReference`.
7. The checkout ID and URL are attached to the pending contract.
8. The browser is redirected to the Asaas-hosted page.
9. On a first purchase, the user supplies customer and payment data directly to Asaas. The resulting customer ID is later stored from provider data; subsequent purchases reuse it.
10. Callback URLs return the browser to Lucrivo, but never grant access.
11. Webhooks determine the financial outcome and access window.

The browser may choose only `credit_card` or `pix`. It must not send or control price, amount, currency, number of allowed installments, cycle, access duration, charge type, or callback origin.

### 4.2 Monthly Checkout payloads

The server creates a separate Checkout for the selected method. Credit card uses:

- `billingTypes: ["CREDIT_CARD"]`;
- `chargeTypes: ["RECURRENT"]`;
- one item worth R$ 49.90;
- `subscription.cycle: "MONTHLY"`;
- controlled success, cancellation, and expiration URLs;
- a short expiration period;
- the local contract ID in `externalReference`.

Pix uses:

- `billingTypes: ["PIX"]`;
- `chargeTypes: ["DETACHED"]`;
- one item worth R$ 49.90;
- no `subscription` or `installment` object;
- the same controlled callbacks, expiration, and local contract reference.

### 4.3 Annual Checkout payloads

The server creates a separate Checkout for the selected method. Credit card uses:

- `billingTypes: ["CREDIT_CARD"]`;
- `chargeTypes: ["INSTALLMENT"]`;
- one item worth R$ 478.80;
- `installment.maxInstallmentCount: 12`;
- controlled callback URLs and expiration;
- the local contract ID in `externalReference`.

The hosted Checkout may let the customer choose fewer than 12 installments. This does not change the product price or access duration.

Pix uses:

- `billingTypes: ["PIX"]`;
- `chargeTypes: ["DETACHED"]`;
- one item worth R$ 478.80;
- no `subscription` or `installment` object;
- the same controlled callbacks, expiration, and local contract reference.

### 4.4 Monthly cancellation flow

1. An authenticated server endpoint resolves the caller's own active monthly credit-card contract.
2. It marks a cancellation request locally and asks Asaas to stop future subscription renewals.
3. A successful provider response sets `cancel_at_period_end`; access remains valid through `access_ends_at`.
4. An ambiguous response remains pending reconciliation rather than claiming cancellation succeeded.
5. Subscription webhooks reconcile the final provider state idempotently.

The UI must show cancellation as complete only after the server has a confirmed provider outcome.

## 5. Data Model

All monetary values use integer cents (`bigint`), all instants use `timestamptz`, provider identifiers are unique, and foreign-key lookup columns are indexed.

### 5.1 `billing_prices`

Immutable product catalog.

Key fields:

- `id uuid primary key`;
- `product_code text` (for example `quick_diagnosis_pro`);
- `billing_mode text` constrained to `monthly` or `annual`;
- `version integer`;
- `amount_cents bigint` with a positive check;
- `currency text` constrained to `BRL` for this release;
- `installment_limit integer nullable`;
- `access_months integer nullable`;
- `is_active boolean`;
- `created_at timestamptz`;
- `retired_at timestamptz nullable`.

Constraints ensure unique `(product_code, billing_mode, version)` and at most one active price for each `(product_code, billing_mode)`.

Seed rows:

- monthly v1: `4990` cents, one month of access;
- annual v1: `47880` cents, maximum 12 card installments, 12 months of access.

### 5.2 `billing_customers`

Private mapping between an authenticated Lucrivo user and the customer generated by Asaas Checkout.

Key fields:

- `user_id uuid primary key references auth.users`;
- `asaas_customer_id text unique`;
- timestamps.

This table does not need to duplicate CPF/CNPJ or card data. It is populated or reconciled from provider resources received after Checkout payment.

### 5.3 `billing_contracts`

Represents a user's purchase or recurring agreement.

Key fields:

- `id uuid primary key`;
- `user_id uuid references auth.users`;
- `price_id uuid references billing_prices`;
- `external_reference text unique`;
- `billing_mode text`;
- `payment_method text` constrained to `credit_card` or `pix`;
- `charge_type text` constrained to `recurring`, `installment`, or `detached`, with checks allowing only monthly/card/recurring, monthly/Pix/detached, annual/card/installment, and annual/Pix/detached combinations;
- immutable snapshot fields: `amount_cents`, `currency`, `installment_limit`, `access_months`;
- provider IDs, each unique when present: `asaas_checkout_id`, `asaas_subscription_id`, `asaas_installment_id`;
- `status text` including `pending`, `pending_reconciliation`, `active`, `cancel_at_period_end`, `expired`, `canceled`, `refunded`, `chargeback`, and `failed`;
- `access_starts_at timestamptz nullable`;
- `access_ends_at timestamptz nullable`;
- `cancel_at_period_end boolean`;
- `canceled_at timestamptz nullable`;
- timestamps.

Multiple historical contracts are allowed. Access is granted if at least one contract has a valid paid access interval and a non-revoked status.

### 5.4 `billing_payments`

Stores the normalized state of each Asaas payment associated with a contract.

Key fields:

- `id uuid primary key`;
- `contract_id uuid references billing_contracts`;
- `asaas_payment_id text unique`;
- provider status;
- `installment_number integer nullable`;
- `value_cents bigint`;
- due, confirmed, received, refunded, and chargeback timestamps as applicable;
- timestamps.

### 5.5 `asaas_webhook_events`

Idempotency, audit, and retry ledger.

Key fields:

- Asaas event ID as a unique key;
- event type;
- received timestamp;
- processing status (`received`, `processed`, `ignored`, `failed`);
- attempt count and last error;
- provider JSON payload after removal of card/token fields, visible only to trusted server roles;
- processed timestamp.

Webhook payloads can contain personal data and, for payment events, a reusable card token. Lucrivo removes the complete `payment.creditCard` object before persistence. The remaining payload must never be exposed through public APIs or user RLS policies. Processed/ignored payloads are retained for 180 days; failed events remain until reconciled.

### 5.6 `diagnoses`

Add:

- `is_free_report boolean not null default false`.

A partial unique index on `user_id where is_free_report` guarantees at most one free report per user under concurrent requests.

For existing data, the migration marks each user's earliest diagnosis as the free report before creating the partial unique index. Any later existing diagnoses remain stored and become subject to paid-access rules.

## 6. Entitlement and Report Enforcement

Access decisions use centralized database helpers rather than duplicated frontend conditions.

Conceptually:

- `has_paid_access(user_id, at_time)` returns true when a non-revoked contract covers `at_time`;
- `can_read_diagnosis(user_id, diagnosis_id)` requires ownership and either `is_free_report` or current paid access;
- `can_create_diagnosis(user_id)` returns true when the user has paid access or does not yet own a free report.

Report creation must be atomic:

1. authenticate the caller inside the database operation;
2. acquire an appropriate user-scoped lock or rely on the partial unique constraint plus controlled retry;
3. determine whether a free report already exists;
4. reject creation when the caller is free and already used the allowance;
5. mark the new report as free when it is the user's first report, regardless of current paid status;
6. create the report and related rows in the same transaction.

RLS must enforce the same read rule on `diagnoses` and every related table that contains report answers, results, recommendations, summaries, or other sensitive content. Blocking only the parent row is insufficient if child tables remain directly queryable.

## 7. Webhook Processing

The webhook route is public at the network layer and protected by the configured Asaas access token.

Processing sequence:

1. Read the raw request and compare the `asaas-access-token` header with `ASAAS_WEBHOOK_TOKEN` using a timing-safe comparison.
2. Reject missing or invalid tokens without logging their values.
3. Parse a small required envelope (`id`, `event`) while tolerating additional fields, then remove card/token fields from the persisted copy.
4. Insert the event ID and redacted payload into `asaas_webhook_events` before applying business effects.
5. If the unique ID already exists, return HTTP 200 without repeating effects.
6. In a transaction, resolve the contract by `externalReference` or known provider ID, upsert normalized payment data, and update the contract/access interval.
7. Mark the event processed and return HTTP 200.
8. On a retryable internal failure, retain the error state and return a non-2xx response so Asaas retries it.

Event policy:

- `CHECKOUT_PAID`: associate the Checkout/customer and grant the initial paid interval idempotently; this verified event is not equivalent to the browser callback.
- `PAYMENT_CONFIRMED`: reconcile the initial interval and extend later monthly credit-card cycles idempotently.
- `PAYMENT_RECEIVED`: update settlement information but do not grant duplicate access.
- failed, overdue, or declined future monthly card payments: do not extend access; preserve only the interval already paid.
- full refund or chargeback: revoke the affected contract immediately after confirmed provider notification.
- subscription inactivation or deletion: stop future renewal while preserving access already paid through `access_ends_at`, unless a refund or chargeback requires immediate revocation.
- unknown events: store and mark ignored; do not fail merely because Asaas added a new event type or payload field.

For either annual payment method, the first verified paid event grants one 12-month interval. Later payment or per-installment settlement events never add another 12 months.

For monthly credit card, each newly confirmed billing cycle sets the end to the later of the existing end or that payment's due date plus one month, preventing duplicate or out-of-order events from shortening or multiplying access. Monthly Pix grants exactly one month on the first verified paid event and later events for the same contract never extend it.

## 8. Failure and Reconciliation Strategy

Checkout creation is a distributed operation. The local pending contract is created before calling Asaas so every provider operation carries a stable idempotency reference.

- Validation errors from Asaas mark the attempt failed and return a safe user-facing error.
- Network timeouts or ambiguous provider responses set `pending_reconciliation`; the server must not blindly create another Checkout.
- Reconciliation searches or receives provider data using `externalReference` and attaches it to the existing contract.
- Repeated clicks reuse a still-valid pending Checkout when possible.
- A paid event with no resolvable contract is stored for investigation and retry rather than discarded.
- Webhook processing must be replayable from the persisted event ledger.

## 9. Security and Privacy

- `ASAAS_API_KEY` and `ASAAS_WEBHOOK_TOKEN` exist only in server environment variables.
- The API key and webhook token must be different secrets.
- No secret may use the `NEXT_PUBLIC_` prefix or be returned to the browser.
- Lucrivo never stores card number, CVV, expiration, or card token for this flow.
- Hosted Checkout avoids expanding the application's card-data compliance surface.
- Checkout URLs originate from the server; callback URLs use an allow-listed application origin.
- `billing_prices`: anonymous/authenticated read access is limited to active public offer fields, preferably through a restricted view or server endpoint.
- `billing_contracts` and `billing_payments`: authenticated users may read only their own safe fields.
- `billing_customers` and `asaas_webhook_events`: no direct client access.
- All billing writes occur through trusted server code or narrowly scoped database functions.
- Service-role use is isolated to server-only modules and never imported into client bundles.
- Logs contain internal/provider IDs and error categories, not tokens, card data, or unnecessary personal data.

## 10. User Experience

- The pricing interface reads the active catalog instead of embedding amounts in components.
- Monthly card copy: **“R$ 49,90/mês no cartão, com renovação automática. Cancele quando quiser; acesso até o fim do período pago.”**
- Monthly Pix copy: **“R$ 49,90 no Pix por 1 mês de acesso. Sem renovação automática.”**
- Annual copy: **“R$ 478,80 no Pix à vista ou em até 12x sem juros no cartão — 12x de R$ 39,90. Sem renovação automática.”**
- The annual CTA must not describe the offer as a monthly subscription.
- Checkout return pages show `processing`, `active`, `canceled`, or `expired` based on server state. A success callback initially shows processing until webhook confirmation exists.
- When a free user attempts a second diagnosis or opens a locked paid report, show the relevant plan choices without leaking report content.
- Cancellation requires confirmation and clearly states the last day of access.

## 11. Testing Strategy

### Database and RLS

- first report is atomically marked free;
- concurrent first-report requests cannot create two free reports;
- free user cannot create a second report;
- paid user can create additional reports;
- downgraded user can read only the free report;
- resubscribed user regains access to stored paid reports;
- direct queries to all report child tables cannot bypass the parent access rule;
- users cannot read another user's billing or diagnosis data;
- active-price uniqueness and price immutability rules hold.

### Checkout endpoint

- requires authentication;
- rejects inactive/unknown prices and client-supplied monetary overrides;
- generates the four exact period/payment-method payloads without mixing detached, installment, and recurring fields;
- stores price snapshots and `externalReference`;
- reuses or reconciles ambiguous pending attempts;
- never exposes Asaas secrets.

### Webhook

- rejects an invalid or missing token;
- accepts valid current payloads and additional unknown fields;
- handles duplicate and out-of-order delivery idempotently;
- processes confirmation, receipt, failure, cancellation, refund, and chargeback correctly;
- records unknown events without applying access;
- never grants access from callback URLs;
- annual card/Pix events grant exactly one 12-month interval;
- monthly card confirmations extend access exactly once;
- monthly Pix grants exactly one month and does not renew.

### Integration and UI

- Asaas sandbox monthly card recurring, monthly Pix, annual Pix, and annual card 1x/12x paths;
- success, cancellation, expiration, and delayed-webhook return states;
- pricing values render from the active catalog;
- free-limit, locked-report, cancellation, expiry, and resubscription journeys;
- production smoke test with a controlled low-value price version before enabling public CTAs.

## 12. Operations

- Configure separate sandbox and production credentials and webhook endpoints.
- Add structured logs and alerts for webhook authentication failures, processing failures, unresolved contracts, and reconciliation backlog.
- Provide an internal replay/reconciliation procedure that is idempotent and auditable.
- Monitor webhook queue health and the age of `pending_reconciliation` contracts.
- Confirm the effective card and anticipation fees in the Asaas account before launch; public rates can differ from contracted rates.
- Define retention for raw webhook payloads and document support procedures for refunds, chargebacks, and customer disputes.

## 13. Out of Scope for This Release

- Pix Automático and boleto plan payments;
- coupon codes, trials, prorating, plan upgrades/downgrades during an active term;
- automatic annual renewal;
- automatic migration of existing monthly subscribers to a new price;
- storing or tokenizing cards in Lucrivo;
- automatic receivables anticipation;
- an internal billing administration dashboard;
- multiple paid product tiers beyond the monthly and annual offers defined here.

## 14. Success Criteria

The feature is complete when:

- an authenticated customer can purchase either offer by Pix or credit card through hosted Asaas Checkout;
- only verified, idempotently processed Asaas events change paid access;
- the annual card purchase commits the full card limit, while annual Pix is received up front; both grant exactly 12 months without renewal;
- monthly card renews and can be canceled while preserving the paid period, while monthly Pix grants one non-renewing month;
- every user who has created reports retains exactly one readable free report after paid access ends;
- additional reports are protected by database-level authorization;
- price changes affect new purchases without rewriting historical contracts;
- retries, duplicate webhooks, and ambiguous timeouts do not create duplicate access or duplicate contracts.

## 15. Asaas References

- [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas)
- [Checkout for credit cards](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito)
- [Checkout for Pix](https://docs.asaas.com/docs/checkout-para-pix)
- [Checkout with recurring subscription](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente)
- [Customer data in Checkout](https://docs.asaas.com/docs/como-informar-os-dados-do-cliente)
- [Installment charges](https://docs.asaas.com/docs/criar-uma-cobranca-parcelada)
- [Payment webhooks](https://docs.asaas.com/docs/webhook-para-cobrancas)
- [Checkout webhooks](https://docs.asaas.com/docs/eventos-para-checkout)
- [Subscription webhooks](https://docs.asaas.com/docs/webhook-para-assinaturas)
- [Prices and fees](https://www.asaas.com/precos-e-taxas)
