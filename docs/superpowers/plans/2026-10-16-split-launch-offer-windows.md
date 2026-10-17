# Split Launch Offer Windows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the launch price valid for 30 elapsed days, restrict bonus access to the first 15 days, and make the R$ 39.90 monthly price apply only to the first payment.

**Architecture:** A pure server resolver selects one of three immutable billing catalogs: `launch`, `launch_price`, or `standard`. Database price rows snapshot the commercial terms, while the existing idempotent renewal-adjustment flow changes promotional monthly card subscriptions to `MONTHLY` at R$ 49.90 after their purchased access interval. UI projections receive the resolved phase and catalog; browser time only renders the current countdown and refreshes server data at a boundary.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, Supabase/PostgreSQL, pgTAP, Zod, Asaas REST API, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-16-split-launch-offer-windows-design.md`

## Global Constraints

- `LAUNCH_OFFER_START_AT` is the only campaign setting and must contain an ISO 8601 instant with an explicit `Z` or `±HH:MM` offset.
- Windows are exact elapsed intervals: `[start, start + 15 days)` selects `launch`; `[start + 15 days, start + 30 days)` selects `launch_price`; all other valid times select `standard`.
- Preserve existing `launch` and `standard` database rows and historical contract snapshots; add data only through a new imperative migration.
- `launch_price` terms are monthly `3990/1/0/null` and semiannual `17940/6/0/6`, expressed as amount cents/access months/bonus months/installment limit.
- Promotional monthly card subscriptions renew at R$ 49.90 after two months for `launch` and after one month for `launch_price`; Pix and semiannual purchases do not auto-renew.
- A successfully created Checkout keeps its snapshotted terms for its existing 60-minute reservation even if a campaign boundary passes.
- Invalid campaign configuration or malformed catalog data fails paid offers closed; client input never controls commercial terms.
- The permanent Bônus library grant for a confirmed purchase remains independent from bonus access months.
- Do not edit a historical migration or hand-edit `supabase/seed.sql`; create a migration with the Supabase CLI and regenerate the seed.
- Production rollout requires Asaas credit-card subscription tokenization to be confirmed before application deployment.
- No remote database push or live Asaas mutation is part of this implementation plan.

## File Map

- `src/modules/billing/domain/launch-offer.ts`: authoritative phase and catalog resolver plus catalog guards.
- `src/modules/billing/domain/build-checkout-request.ts`: validates each immutable catalog shape and maps it to an Asaas Checkout payload.
- `src/modules/billing/services/list-active-prices.service.ts`: loads and validates exactly one monthly and one semiannual row for the selected catalog.
- `src/modules/billing/services/create-hosted-checkout.service.ts`: enforces catalog eligibility while preserving valid pending Checkout reservations.
- `src/infrastructure/payments/asaas/asaas.client.ts`: validates the renewal amount in both the update request and response.
- `src/modules/billing/services/adjust-launch-renewal.service.ts`: consumes the database claim and performs the idempotent provider adjustment.
- New `supabase/migrations/<CLI timestamp>_split_launch_offer_windows.sql`: adds `launch_price` and generalizes renewal adjustment without rewriting history.
- `src/components/landing/landing-offer.ts`: projects phase-specific commercial copy for landing consumers.
- Billing and landing React components: render phase-specific deadlines and first-payment disclosure.
- App Router pages: resolve the server phase and pass a single consistent catalog/view downstream.
- `scripts/demo-seed/*`: deterministic fixtures for both new `launch_price` modes; generated output remains `supabase/seed.sql`.
- `PRODUCT.md`, `.env.example`, and `docs/asaas-billing-runbook.md`: product and operational contract.

---

### Task 1: Resolve Both Campaign Boundaries on the Server

**Files:**

- Modify: `src/modules/billing/domain/launch-offer.ts`
- Modify: `src/modules/billing/domain/launch-offer.test.ts`
- Modify: `src/config/launch-offer-environment.test.ts`

**Interfaces:**

- Consumes: `{ rawStartAt: string | undefined; now: Date }`.
- Produces: `BillingCatalogCode = "launch" | "launch_price" | "standard"`; `LaunchOfferResolution` with phases `disabled | scheduled | bonus_active | price_active | expired | invalid`; `isPromotionalCatalog(code)` and `isLaunchOfferActive(resolution)` type guards.
- Produces for scheduled/active/expired resolutions: normalized `startsAt`, `bonusEndsAt`, and `promotionEndsAt`; active resolutions also expose phase-specific `endsAt`.

- [x] **Step 1: Replace the one-window tests with boundary-first failing cases**

Use a fixed `start = "2026-10-20T12:00:00.000Z"`, so the exact boundaries are `2026-11-04T12:00:00.000Z` and `2026-11-19T12:00:00.000Z`. Assert all of these cases:

```ts
expect(
  resolveLaunchOffer({
    rawStartAt: start,
    now: new Date("2026-11-04T11:59:59.999Z"),
  }),
).toMatchObject({
  phase: "bonus_active",
  catalogCode: "launch",
  endsAt: "2026-11-04T12:00:00.000Z",
});
expect(
  resolveLaunchOffer({
    rawStartAt: start,
    now: new Date("2026-11-04T12:00:00.000Z"),
  }),
).toMatchObject({
  phase: "price_active",
  catalogCode: "launch_price",
  endsAt: "2026-11-19T12:00:00.000Z",
});
expect(
  resolveLaunchOffer({
    rawStartAt: start,
    now: new Date("2026-11-19T12:00:00.000Z"),
  }),
).toMatchObject({
  phase: "expired",
  catalogCode: "standard",
});
```

Also retain missing, scheduled, malformed, missing-offset, offset-normalization, and invalid-clock cases. Assert `isPromotionalCatalog` is true only for `launch` and `launch_price`, and `isLaunchOfferActive` is true only for the two active phases.

- [x] **Step 2: Run the focused tests and confirm the old union fails**

Run: `pnpm vitest run src/modules/billing/domain/launch-offer.test.ts src/config/launch-offer-environment.test.ts`

Expected: FAIL because `launch_price`, the new phase names, and the second boundary are not implemented.

- [x] **Step 3: Implement the two-window discriminated union**

Use these constants and return shapes:

```ts
type BillingCatalogCode = "launch" | "launch_price" | "standard";
type ActiveLaunchOfferPhase = "bonus_active" | "price_active";

const LAUNCH_BONUS_DURATION_MS = 15 * 24 * 60 * 60 * 1000;
const LAUNCH_PRICE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function isPromotionalCatalog(
  code: BillingCatalogCode,
): code is "launch" | "launch_price" {
  return code === "launch" || code === "launch_price";
}

function isLaunchOfferActive(
  resolution: LaunchOfferResolution,
): resolution is Extract<
  LaunchOfferResolution,
  { phase: ActiveLaunchOfferPhase }
> {
  return (
    resolution.phase === "bonus_active" || resolution.phase === "price_active"
  );
}
```

Compute `bonusEndMs = startMs + LAUNCH_BONUS_DURATION_MS` and `promotionEndMs = startMs + LAUNCH_PRICE_DURATION_MS`. Keep invalid results free of timestamps; keep disabled results with null timestamps; include all three normalized timestamps for scheduled and expired outcomes.

- [x] **Step 4: Re-run the focused tests**

Run: `pnpm vitest run src/modules/billing/domain/launch-offer.test.ts src/config/launch-offer-environment.test.ts`

Expected: PASS with exact start-inclusive/end-exclusive behavior.

- [x] **Step 5: Commit the resolver**

```bash
git add src/modules/billing/domain/launch-offer.ts src/modules/billing/domain/launch-offer.test.ts src/config/launch-offer-environment.test.ts
git commit -m "feat: split launch campaign windows"
```

### Task 2: Add the Immutable `launch_price` Catalog and Generalize the Renewal Claim

**Files:**

- Create: exact path printed by `supabase migration new split_launch_offer_windows`
- Modify: `supabase/tests/billing_schema.test.sql`
- Modify: `supabase/tests/billing_webhooks.test.sql`
- Modify: `supabase/tests/bonus_library.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: the existing `billing_prices`, `billing_contracts`, `billing_webhook_events`, `begin_billing_renewal_adjustment`, and `record_billing_renewal_adjustment_result` contracts.
- Produces: active price UUIDs `00000000-0000-4000-8000-000000000005` (monthly) and `00000000-0000-4000-8000-000000000006` (semiannual), catalog version `3`.
- Produces from `begin_billing_renewal_adjustment`: ready JSON with `contractId`, `subscriptionId`, `nextDueDate`, and `renewalAmountCents: 4990`.

- [ ] **Step 1: Create the migration through the CLI before writing SQL**

Run: `supabase migration new split_launch_offer_windows`

Expected: one new `supabase/migrations/<timestamp>_split_launch_offer_windows.sql` path. Record that exact emitted path in this task's remaining commands; do not rename or invent the timestamp.

- [ ] **Step 2: Add failing pgTAP assertions for all six immutable shapes**

In `billing_schema.test.sql`, assert the two new active rows exactly:

```sql
select results_eq(
  $$select catalog_code, billing_mode, amount_cents, installment_limit,
           access_months, bonus_months, version
    from public.billing_prices
    where id = '00000000-0000-4000-8000-000000000005'::uuid$$,
  $$values ('launch_price', 'monthly', 3990, null::integer, 1, 0, 3)$$,
  'launch_price monthly has the approved immutable shape'
);

select results_eq(
  $$select catalog_code, billing_mode, amount_cents, installment_limit,
           access_months, bonus_months, version
    from public.billing_prices
    where id = '00000000-0000-4000-8000-000000000006'::uuid$$,
  $$values ('launch_price', 'semiannual', 17940, 6, 6, 0, 3)$$,
  'launch_price semiannual has the approved immutable shape'
);
```

Add rejection assertions for mismatched amount/access/bonus combinations and contract snapshot assertions for both payment methods. In `billing_webhooks.test.sql`, add monthly claims for `launch` and `launch_price`, proving due dates are first confirmed due date plus two and one months respectively and both return `renewalAmountCents = 4990`. In `bonus_library.test.sql`, prove a confirmed `launch_price` purchase still receives the permanent library grant while `bonus_months = 0` grants no extra access time.

- [ ] **Step 3: Reset the local database and confirm the new tests fail**

Run: `pnpm supabase:reset`

Expected: local-only database data is destroyed and restored from migrations plus `supabase/seed.sql`.

Run: `supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/bonus_library.test.sql`

Expected: FAIL because the new catalog rows and generalized claim do not exist.

- [ ] **Step 4: Author the additive migration**

In the CLI-created migration:

1. Drop and recreate `billing_prices_catalog_code_check`, `billing_prices_catalog_shape_check`, `billing_contracts_catalog_code_check`, `billing_contracts_snapshot_shape_check`, and `billing_contracts_renewal_adjustment_check`, extending them to `launch_price`, the two exact price tuples, and both promotional monthly renewal states.
2. Insert the two stable UUID rows with `version = 3`, `is_active = true`, and the approved shape.
3. Recreate affected renewal-adjustment checks so promotional adjustment states accept monthly card contracts whose catalog is in `('launch', 'launch_price')`.
4. Replace `begin_billing_renewal_adjustment` without changing its arguments, security mode, search path, ownership, or grants. Its ready branch must derive the next date from the first confirmed payment and snapshot:

```sql
v_next_due_date := (v_first_due_date + make_interval(months => v_contract.access_months))::date;

return jsonb_build_object(
  'status', 'ready',
  'contractId', v_contract.id,
  'subscriptionId', v_contract.asaas_subscription_id,
  'nextDueDate', v_next_due_date,
  'renewalAmountCents', 4990
);
```

Retain row locking, stale-processing recovery, `not_required`, `not_ready`, and `completed` branches exactly; change only catalog eligibility, date derivation, and the new amount field.

- [ ] **Step 5: Reset and run the focused database tests**

Run: `pnpm supabase:reset`

Expected: reset succeeds and applies the new migration and deterministic seed.

Run: `supabase test db supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/bonus_library.test.sql`

Expected: PASS for immutable rows, snapshots, access intervals, claim dates, amount, idempotency, and permanent library access.

- [ ] **Step 6: Regenerate database types and verify the diff**

Run: `pnpm supabase:types`

Expected: `database.types.ts` reflects the unchanged RPC arguments and updated database output behavior without hand edits.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 7: Commit the database contract**

```bash
git add supabase/migrations supabase/tests/billing_schema.test.sql supabase/tests/billing_webhooks.test.sql supabase/tests/bonus_library.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: add launch price billing catalog"
```

### Task 3: Accept Only the Phase-Eligible Catalog in Checkout

**Files:**

- Modify: `src/modules/billing/services/list-active-prices.service.ts`
- Modify: `src/modules/billing/services/list-active-prices.service.test.ts`
- Modify: `src/modules/billing/domain/build-checkout-request.ts`
- Modify: `src/modules/billing/domain/build-checkout-request.test.ts`
- Modify: `src/modules/billing/services/create-hosted-checkout.service.ts`
- Modify: `src/modules/billing/services/create-hosted-checkout.service.test.ts`
- Modify: `src/app/api/billing/checkout/route.ts`
- Modify: `src/app/api/billing/checkout/route.test.ts`

**Interfaces:**

- Consumes: `BillingCatalogCode` and the six database price shapes from Tasks 1–2.
- Produces: `listActivePrices({ supabase, catalogCode })` support for `launch_price` with the same exact-pair validation as existing catalogs.
- Produces: `buildCheckoutRequest(input): AsaasCheckoutRequest` mapping `launch` monthly to `BIMONTHLY` and both `launch_price` and `standard` monthly to `MONTHLY`.
- Preserves: a valid same-price pending Checkout remains reusable until its stored `checkout_expires_at`, regardless of the newly resolved phase.

- [ ] **Step 1: Add failing catalog and payload tests**

Add fixtures for both `launch_price` rows and assert:

```ts
expect(
  buildCheckoutRequest({
    price: launchPriceMonthly,
    paymentMethod: "credit_card",
    contractId,
    appUrl,
    today: "2026-10-16",
  }),
).toMatchObject({
  billingTypes: ["CREDIT_CARD"],
  chargeTypes: ["RECURRENT"],
  items: [{ value: 39.9 }],
  subscription: { cycle: "MONTHLY", nextDueDate: "2026-10-16" },
});
```

Also assert the semiannual row stays detached/installment with a six-installment maximum, Pix remains detached, and any mismatched `launch_price` amount/access/bonus/installment shape throws `Invalid monthly billing price` or `Invalid semiannual billing price`.

For the service and route, assert a day-15 resolution passes `catalogCode: "launch_price"`; a submitted `launch` or `standard` UUID then returns `not_found`; invalid campaign resolution returns the existing sanitized 503 response without calling Asaas.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `pnpm vitest run src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.test.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.test.ts`

Expected: FAIL because the third catalog is rejected or typed out.

- [ ] **Step 3: Extend exact catalog validation and Checkout mapping**

Define the new valid predicates alongside the existing shapes:

```ts
const validMonthlyTerms =
  price.installmentLimit === null &&
  ((price.catalogCode === "launch" &&
    price.accessMonths === 2 &&
    price.bonusMonths === 1) ||
    (price.catalogCode === "launch_price" &&
      price.accessMonths === 1 &&
      price.bonusMonths === 0) ||
    (price.catalogCode === "standard" &&
      price.accessMonths === 1 &&
      price.bonusMonths === 0));

const validSemiannualTerms =
  price.installmentLimit === 6 &&
  ((price.catalogCode === "launch" &&
    price.accessMonths === 12 &&
    price.bonusMonths === 6) ||
    (price.catalogCode === "launch_price" &&
      price.accessMonths === 6 &&
      price.bonusMonths === 0) ||
    (price.catalogCode === "standard" &&
      price.accessMonths === 6 &&
      price.bonusMonths === 0));
```

Keep `subscription.cycle` equal to `BIMONTHLY` only for `launch`; use `MONTHLY` for `launch_price` and `standard`. Update the active-price service's catalog whitelist and exact expected shape table without weakening duplicate/missing-row failures.

- [ ] **Step 4: Preserve the one-hour reservation boundary behavior explicitly**

Add service tests with an existing unexpired pending contract created under `launch` while the current input catalog is `launch_price`, and another created under `launch_price` while the input catalog is `standard`. When `priceId` and payment method match the pending snapshot, expect `{ status: "reused", checkoutUrl }` before loading the current catalog. When the caller requests a different price during that reservation, retain the existing conflict/cancellation behavior; never reinterpret the stored contract's commercial fields.

- [ ] **Step 5: Re-run the focused tests**

Run: `pnpm vitest run src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.test.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.test.ts`

Expected: PASS for all three catalogs, all payment/mode combinations, phase rejection, invalid configuration, and reservation reuse.

- [ ] **Step 6: Commit Checkout eligibility**

```bash
git add src/modules/billing/services/list-active-prices.service.ts src/modules/billing/services/list-active-prices.service.test.ts src/modules/billing/domain/build-checkout-request.ts src/modules/billing/domain/build-checkout-request.test.ts src/modules/billing/services/create-hosted-checkout.service.ts src/modules/billing/services/create-hosted-checkout.service.test.ts src/app/api/billing/checkout/route.ts src/app/api/billing/checkout/route.test.ts
git commit -m "feat: support launch price checkout catalog"
```

### Task 4: Set the Standard Renewal Price Through Asaas

**Files:**

- Modify: `src/infrastructure/payments/asaas/asaas.client.ts`
- Modify: `src/infrastructure/payments/asaas/asaas.client.test.ts`
- Modify: `src/modules/billing/services/adjust-launch-renewal.service.ts`
- Modify: `src/modules/billing/services/adjust-launch-renewal.service.test.ts`

**Interfaces:**

- Consumes: ready renewal claim `{ contractId; subscriptionId; nextDueDate; renewalAmountCents: 4990 }`.
- Produces: `AsaasSubscriptionRenewalInput = { cycle: "MONTHLY"; nextDueDate: string; value: number }`.
- Produces: gateway result `{ id; cycle: "MONTHLY"; nextDueDate; value }`, accepted only when every field equals the request.

- [ ] **Step 1: Add failing gateway request/response tests**

Assert the exact provider call:

```ts
expect(fetchMock).toHaveBeenCalledWith(
  expect.stringContaining(`/v3/subscriptions/${subscriptionId}`),
  expect.objectContaining({
    method: "PUT",
    body: JSON.stringify({
      cycle: "MONTHLY",
      nextDueDate: "2026-12-16",
      value: 49.9,
      updatePendingPayments: true,
    }),
  }),
);
```

Cover malformed/missing `value`, a returned value other than `49.9`, mismatched ID/cycle/date, non-2xx rejection, timeout/network ambiguity, and a valid matching response. Every successful HTTP response that cannot prove the intended mutation must throw `AsaasGatewayError("ambiguous")`.

- [ ] **Step 2: Add failing renewal-service claim tests**

Update ready-claim fixtures to include `renewalAmountCents: 4990`. Assert the service calls:

```ts
expect(asaas.updateSubscriptionRenewal).toHaveBeenCalledWith(subscriptionId, {
  cycle: "MONTHLY",
  nextDueDate: "2026-12-16",
  value: 49.9,
});
```

Assert a claim with 3990, a missing amount, or extra malformed fields returns `retry_later` without a provider call. Retain completed, not-ready, rejected, ambiguous, persistence-failure, and repeated-adjustment cases.

- [ ] **Step 3: Run the focused tests and confirm failure**

Run: `pnpm vitest run src/infrastructure/payments/asaas/asaas.client.test.ts src/modules/billing/services/adjust-launch-renewal.service.test.ts`

Expected: FAIL because renewal value is neither required nor sent.

- [ ] **Step 4: Implement strict amount propagation and verification**

Extend the Zod response schema with `value: z.number().finite().positive()`. Send the provider body with `updatePendingPayments: true`, then compare response ID, cycle, date, and value to the request before returning. Extend the ready claim schema with:

```ts
renewalAmountCents: z.literal(4990),
```

Pass `value: claim.renewalAmountCents / 100` into `updateSubscriptionRenewal`. Preserve the existing sanitized `provider_rejected` versus `provider_ambiguous` result recording and never log the provider body, API key, or customer payment data.

- [ ] **Step 5: Re-run gateway and service tests**

Run: `pnpm vitest run src/infrastructure/payments/asaas/asaas.client.test.ts src/modules/billing/services/adjust-launch-renewal.service.test.ts src/modules/billing/services/process-asaas-webhook.service.test.ts`

Expected: PASS, including webhook retries and idempotent completed/reconciliation states.

- [ ] **Step 6: Commit the renewal amount update**

```bash
git add src/infrastructure/payments/asaas/asaas.client.ts src/infrastructure/payments/asaas/asaas.client.test.ts src/modules/billing/services/adjust-launch-renewal.service.ts src/modules/billing/services/adjust-launch-renewal.service.test.ts
git commit -m "feat: set standard price on promotional renewals"
```

### Task 5: Render Phase-Specific Price, Bonus, and Countdown Copy

**Files:**

- Modify: `src/components/landing/landing-offer.ts`
- Create: `src/components/landing/landing-offer.test.ts`
- Modify: `src/components/landing/landing-experience.tsx`
- Modify: `src/components/landing/launch-offer-bar.tsx`
- Modify: `src/components/landing/hero-section.tsx`
- Modify: `src/components/landing/faq-section.tsx`
- Modify: `src/components/landing/guarantee-section.tsx`
- Modify: `src/components/landing/final-cta-section.tsx`
- Modify: `src/modules/billing/components/billing-plans.tsx`
- Modify: `src/modules/billing/components/billing-plans.test.tsx`
- Modify: `src/modules/billing/components/launch-offer-dialog.tsx`
- Modify: `src/modules/billing/components/launch-offer-dialog.test.tsx`
- Modify: `src/modules/billing/components/offer-countdown.tsx`
- Modify: `src/modules/billing/components/offer-countdown.test.tsx`

**Interfaces:**

- Consumes: an exact two-price catalog plus `LaunchOfferView = { phase: "bonus_active" | "price_active"; endsAt: string }`.
- Produces: `LandingOfferPresentation` with `catalogCode`, phase-aware access/bonus text, `monthlyPriceQualifier: string | null`, and `monthlyRenewalPriceLabel: string | null`; both fields are non-null for promotional catalogs and null for `standard`.
- Produces: `OfferCountdownProps` with `purpose: "bonus" | "launch_price"`, `endsAt`, optional `compact`, and optional `onExpire`.

- [ ] **Step 1: Add failing projection tests for both promotional catalogs**

Create exact monthly/semiannual pairs and assert `resolveLandingOfferPresentation` returns `null` for missing, duplicate, or mixed-catalog data. For `launch`, assert 2/12 months and 1/6 bonus months; for `launch_price`, assert 1/6 months, no bonus claim, monthly first-payment price R$ 39.90, and later R$ 49.90 monthly renewal copy.

- [ ] **Step 2: Add failing component and accessibility tests**

For `bonus_active`, assert visible copy communicates:

```text
R$ 39,90 no primeiro pagamento
Depois, R$ 49,90/mês
1 mês bônus no mensal
6 meses bônus no semestral
Tempo restante para ganhar o bônus
```

For `price_active`, assert the same initial/renewal prices, one/six months of access, no text matching `/bônus de acesso|mês bônus|meses bônus/i`, and countdown label `Tempo restante para aproveitar o preço de lançamento`. For both phases, retain `em até 6x` and the 60-minute reservation explanation. Assert expiry calls `onExpire` once and accessible text is not announced every second.

- [ ] **Step 3: Run the focused component tests and confirm failure**

Run: `pnpm vitest run src/components/landing/landing-offer.test.ts src/modules/billing/components/billing-plans.test.tsx src/modules/billing/components/launch-offer-dialog.test.tsx src/modules/billing/components/offer-countdown.test.tsx`

Expected: FAIL because the existing presentation assumes one active launch phase and recurring R$ 39.90.

- [ ] **Step 4: Implement the phase-aware projection**

Keep commercial values derived from price rows. Add only semantic projection fields needed by consumers:

```ts
type LaunchOfferView = {
  phase: "bonus_active" | "price_active";
  endsAt: string;
};

const monthlyRenewalPriceLabel = "Depois, R$ 49,90/mês";
const monthlyPriceQualifier = "no primeiro pagamento";
```

Make `OfferCountdown` choose stable visual and accessible labels from `purpose`; callers map `bonus_active` to `bonus` and `price_active` to `launch_price`. On zero, invoke the existing refresh callback so the server resolves the next phase.

- [ ] **Step 5: Update every promotional copy consumer**

Pass one `LandingOfferPresentation` through landing sections and billing components. Treat both `launch` and `launch_price` as promotional only when the supplied `LaunchOfferView.phase` matches the catalog (`bonus_active`/`launch`, `price_active`/`launch_price`); otherwise hide campaign urgency. Remove wording that implies R$ 39.90 renews indefinitely. During `price_active`, render no bonus-access claim in the hero, bar, dialog, plans, FAQ, guarantee, or final CTA. Preserve the distinction that the private Bônus library is granted after confirmed purchase.

- [ ] **Step 6: Re-run focused UI tests**

Run: `pnpm vitest run src/components/landing/landing-offer.test.ts src/modules/billing/components/billing-plans.test.tsx src/modules/billing/components/launch-offer-dialog.test.tsx src/modules/billing/components/offer-countdown.test.tsx`

Expected: PASS for both phases, exact copy, countdown semantics, expiry refresh, and standard-catalog absence of promotional content.

- [ ] **Step 7: Commit the phase-specific interface**

```bash
git add src/components/landing src/modules/billing/components/billing-plans.tsx src/modules/billing/components/billing-plans.test.tsx src/modules/billing/components/launch-offer-dialog.tsx src/modules/billing/components/launch-offer-dialog.test.tsx src/modules/billing/components/offer-countdown.tsx src/modules/billing/components/offer-countdown.test.tsx
git commit -m "feat: present launch phases accurately"
```

### Task 6: Wire the Resolver Through Every Server Page

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/(private)/billing/page.test.tsx`
- Modify: `src/app/(private)/billing/return/page.test.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/app/(private)/reports/[id]/page.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`

**Interfaces:**

- Consumes: `resolveLaunchOffer`, `isLaunchOfferActive`, and the selected `catalogCode` from Task 1.
- Produces: page props whose catalog prices and `LaunchOfferView` come from the same server resolution.
- Preserves: paid-user/admin offer suppression, free-user eligibility checks, and sanitized unavailable states.

- [ ] **Step 1: Add failing server-page tests for both active phases**

For landing, billing, billing return, quick diagnosis, and report completion, mock these resolutions separately:

```ts
const bonusActive = {
  phase: "bonus_active",
  catalogCode: "launch",
  startsAt,
  bonusEndsAt,
  promotionEndsAt,
  endsAt: bonusEndsAt,
} as const;

const priceActive = {
  phase: "price_active",
  catalogCode: "launch_price",
  startsAt,
  bonusEndsAt,
  promotionEndsAt,
  endsAt: promotionEndsAt,
} as const;
```

Assert landing, billing, billing return, and report completion query exactly the resolved catalog; consumers with campaign UI receive matching phase/deadline props. Assert quick diagnosis enables its completion-offer flag for either active phase, without querying prices there. Assert scheduled/expired uses `standard`; invalid does not expose paid offers. Retain tests that suppress offers for paid and admin users.

- [ ] **Step 2: Add a report regression proving there is no hardcoded launch catalog**

In `src/app/(private)/reports/[id]/page.test.tsx`, resolve `price_active`, return `launch_price` fixtures, and assert `listActivePrices` receives `{ catalogCode: "launch_price" }`. Assert completion still renders the offer; an incomplete or unauthorized report retains current behavior.

- [ ] **Step 3: Run page tests and confirm failure**

Run: `pnpm vitest run src/app/page.test.tsx 'src/app/(private)/billing/page.test.tsx' 'src/app/(private)/billing/return/page.test.tsx' 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx'`

Expected: FAIL where code checks `phase === "active"`, uses stale `ended` mocks, or requests `launch` directly.

- [ ] **Step 4: Replace phase literals and hardcoded catalogs**

Resolve once per request path, then use:

```ts
const pricesResult = await listActivePrices({
  supabase,
  catalogCode: launchOffer.catalogCode,
});

const launchOfferView = isLaunchOfferActive(launchOffer)
  ? { phase: launchOffer.phase, endsAt: launchOffer.endsAt }
  : null;
```

For `invalid`, keep the free plan/page available but suppress paid price projections. Do not calculate boundaries in components or choose `launch_price` from browser time.

- [ ] **Step 5: Re-run the page suite**

Run: `pnpm vitest run src/app/page.test.tsx 'src/app/(private)/billing/page.test.tsx' 'src/app/(private)/billing/return/page.test.tsx' 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx'`

Expected: PASS for `bonus_active`, `price_active`, standard, invalid, paid-user, admin, and report-state paths.

- [ ] **Step 6: Commit server integration**

```bash
git add src/app/page.tsx src/app/page.test.tsx 'src/app/(private)/billing/page.test.tsx' 'src/app/(private)/billing/return/page.test.tsx' 'src/app/(private)/quick-diagnosis/page.tsx' 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.tsx' 'src/app/(private)/reports/[id]/page.test.tsx'
git commit -m "feat: select offer catalog across server pages"
```

### Task 7: Add Deterministic Demo Coverage and Operational Documentation

**Files:**

- Modify: `scripts/demo-seed/model.ts`
- Modify: `scripts/demo-seed/user-scenarios.ts`
- Modify: `scripts/demo-seed/user-scenarios.test.ts`
- Modify: `scripts/demo-seed/render-seed.test.ts`
- Modify: `supabase/tests/seed.test.sql`
- Regenerate: `supabase/seed.sql`
- Modify: `.env.example`
- Modify: `PRODUCT.md`
- Modify: `docs/asaas-billing-runbook.md`

**Interfaces:**

- Consumes: price UUIDs `...0005` and `...0006`, catalog code `launch_price`, and the generalized renewal state.
- Produces: client 47 as a completed-adjustment monthly card contract and client 48 as a confirmed semiannual Pix contract.
- Produces: generated SQL only through `pnpm seed:generate`.

- [ ] **Step 1: Add failing model and scenario assertions**

Extend the model union to:

```ts
catalogCode: "launch" | "launch_price" | "standard";
```

Add `priceIds.launchPriceMonthly = "00000000-0000-4000-8000-000000000005"` and `priceIds.launchPriceSemiannual = "00000000-0000-4000-8000-000000000006"`. Change client 47 to a confirmed monthly credit-card `launch_price` contract with one month of access, zero bonus months, an Asaas subscription ID, and `renewalAdjustmentStatus: "completed"`. Change client 48 to a confirmed semiannual Pix `launch_price` contract with six months of access, zero bonus months, and no subscription.

Assert both scenarios snapshot catalog, amount, access, bonus, payment method, and renewal state exactly. Update the expected standard-contract count from 83 to 81 and add an expected `launch_price` count of 2.

- [ ] **Step 2: Run seed unit tests and confirm failure**

Run: `pnpm vitest run scripts/demo-seed/user-scenarios.test.ts scripts/demo-seed/render-seed.test.ts`

Expected: FAIL because the model and fixture IDs do not include the new catalog.

- [ ] **Step 3: Implement the deterministic fixtures and renderer expectations**

Update the two clients without changing the total number of demo users. Ensure rendered contracts use the two new price IDs and preserve provider-ID uniqueness. Keep the monthly completed-adjustment fixture consistent with a provider subscription already updated to R$ 49.90; keep Pix detached.

- [ ] **Step 4: Regenerate the SQL and prove it is reproducible**

Run: `pnpm seed:generate`

Expected: `supabase/seed.sql` changes through the generator and includes the two `launch_price` contracts.

Run: `pnpm seed:check`

Expected: PASS with no generated diff.

Run: `pnpm vitest run scripts/demo-seed/user-scenarios.test.ts scripts/demo-seed/render-seed.test.ts`

Expected: PASS.

- [ ] **Step 5: Update product and runbook language**

Document these exact rules in all three documentation files:

- days 0–15: launch price plus bonus access;
- days 15–30: launch price without bonus access;
- monthly R$ 39.90 is the first payment only, then R$ 49.90 monthly;
- first renewal occurs after two months for `launch` and one month for `launch_price`;
- valid Checkouts reserve terms for 60 minutes;
- production tokenization is required before rollout;
- migration first, application second, then sandbox verification and reconciliation monitoring.

Keep `.env.example` limited to the single `LAUNCH_OFFER_START_AT` instant; do not introduce separate end-date settings.

- [ ] **Step 6: Reset and verify the generated seed against PostgreSQL**

Run: `pnpm supabase:reset`

Expected: local reset succeeds with all migrations and the regenerated seed.

Run: `supabase test db supabase/tests/seed.test.sql`

Expected: PASS for total counts, 81 standard contracts, two `launch_price` contracts, and the two new exact scenarios.

- [ ] **Step 7: Commit fixtures and documentation**

```bash
git add scripts/demo-seed/model.ts scripts/demo-seed/user-scenarios.ts scripts/demo-seed/user-scenarios.test.ts scripts/demo-seed/render-seed.test.ts supabase/tests/seed.test.sql supabase/seed.sql .env.example PRODUCT.md docs/asaas-billing-runbook.md
git commit -m "docs: describe split launch offer windows"
```

### Task 8: Run the Complete Release Gate

**Files:**

- Verify: all files changed in Tasks 1–7

**Interfaces:**

- Consumes: the complete three-catalog implementation.
- Produces: a clean local verification record and a deployment handoff; it does not mutate remote Supabase or live Asaas state.

- [ ] **Step 1: Scan for stale phase logic and misleading price copy**

Run:

```bash
rg -n 'phase === "active"|phase: "active"|phase: "ended"|catalogCode: "launch"|R\$ ?39,90' src scripts PRODUCT.md docs .env.example
```

Expected: remaining `catalogCode: "launch"` occurrences are intentional launch fixtures/branches; every R$ 39.90 occurrence either says first payment or clearly describes a detached/semiannual payment; there are no obsolete `active`/`ended` phases or copy implying indefinite R$ 39.90 monthly renewal. Review every match rather than blanket-replacing fixtures.

- [ ] **Step 2: Run the complete local database gate**

Run: `pnpm supabase:reset`

Expected: PASS; this destroys and recreates only the local Supabase database.

Run: `supabase test db`

Expected: every pgTAP suite passes.

Run: `pnpm supabase:lint`

Expected: no database error-level lint findings.

Run: `pnpm supabase:advisors`

Expected: no failing security or performance advisor finding introduced by this change.

Run: `pnpm supabase:types && git diff --exit-code src/infrastructure/database/supabase/database.types.ts`

Expected: generated types are current.

- [ ] **Step 3: Run deterministic seed checks**

Run: `pnpm seed:check`

Expected: PASS.

Run: `pnpm seed:verify-local`

Expected: PASS against the reset local database.

- [ ] **Step 4: Run the complete application gate**

Run: `pnpm check`

Expected: all Vitest tests, TypeScript checks, ESLint, and Prettier checks pass.

Run: `pnpm build`

Expected: production Next.js build succeeds.

- [ ] **Step 5: Verify the final diff and commit any test-only corrections**

Run: `git status --short && git diff --check`

Expected: no uncommitted generated drift or whitespace errors. If a verification-driven source/test correction was required, stage only those named files and commit it with:

```bash
git commit -m "test: complete launch offer release gate"
```

- [ ] **Step 6: Record external rollout prerequisites without executing them**

Handoff must state that operations still need to confirm production tokenization with Asaas and exercise both `launch` and `launch_price` monthly adjustments in the Asaas sandbox. It must also state that no remote migration was pushed and no live subscription was changed during this plan.
