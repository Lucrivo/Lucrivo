# Offer Dialog Moments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the post-diagnosis dialog to the approved reference and make the landing and post-diagnosis dialogs present correct content during launch-with-bonus, launch-price-only, and standard pricing.

**Architecture:** Extract catalog validation and user-facing price projection into a billing-owned `OfferPresentation` resolver. Keep the landing and post-diagnosis components visually independent, but make both consume that presentation. Generalize the first-diagnosis redirect marker so the report page can resolve and show any valid catalog, including `standard`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Base UI Dialog, CSS, Vitest, Testing Library, `next/image`.

**Spec:** `docs/superpowers/specs/2026-10-23-offer-dialog-moments-design.md`

## Global Constraints

- The valid commercial moments are `launch`, `launch_price`, and `standard`; an invalid campaign configuration must fail closed.
- The post-diagnosis dialog contains only brand, conditional launch badge, headline, description, two benefits, notebook, monthly price, conditional bonus, CTA, reassurance, and accessible close control.
- Do not change price amounts, catalog rules, billing cards, the authenticated billing banner, or the generic pre-diagnosis dialog.
- The standard landing dialog remains controlled by the existing feature flag.
- The post-diagnosis dialog opens only after the first free diagnosis, never on an ordinary report visit or for a paid user.
- Preserve the current uncommitted work and never stage unrelated files.

---

### Task 1: Create the shared offer presentation model

**Files:**

- Create: `src/modules/billing/presenters/offer-presentation.ts`
- Create: `src/modules/billing/presenters/offer-presentation.test.ts`
- Modify: `src/components/landing/landing-offer.ts`
- Modify: `src/components/landing/landing-offer.test.ts`
- Modify: `src/modules/billing/components/billing-plans.tsx`

**Interfaces:**

- Consumes: `ActiveBillingPrice` from `src/modules/billing/types.ts`.
- Produces: `OfferMoment`, `OfferPresentation`, `formatBRL(cents)`, and `resolveOfferPresentation(prices)`.
- Preserves: landing helpers `resolveActiveLaunchOffer` and `shouldShowLandingOfferDialog`.

- [x] **Step 1: Write the failing shared-presentation tests**

Create table-driven tests with the approved catalog shapes:

```ts
it.each([
  ["launch", "launch_bonus", "R$ 39,90", 2, 1],
  ["launch_price", "launch_price", "R$ 39,90", 1, 0],
  ["standard", "standard", "R$ 49,90", 1, 0],
] as const)(
  "projects %s as %s",
  (catalogCode, moment, monthlyPriceLabel, accessMonths, bonusMonths) => {
    expect(resolveOfferPresentation(prices(catalogCode))).toMatchObject({
      catalogCode,
      moment,
      monthlyPriceLabel,
      monthlyAccessMonths: accessMonths,
      monthlyBonusMonths: bonusMonths,
    });
  },
);

it("fails closed for missing, mixed, duplicate, or malformed rows", () => {
  const launch = prices("launch");
  expect(resolveOfferPresentation([])).toBeNull();
  expect(resolveOfferPresentation([launch[0]])).toBeNull();
  expect(resolveOfferPresentation([launch[0], launch[0]])).toBeNull();
  expect(
    resolveOfferPresentation([launch[0], prices("standard")[1]]),
  ).toBeNull();
});
```

- [x] **Step 2: Run the tests and verify the missing-module failure**

Run:

```bash
pnpm exec vitest run src/modules/billing/presenters/offer-presentation.test.ts
```

Expected: FAIL because `offer-presentation.ts` does not exist.

- [x] **Step 3: Implement the shared projection**

Use these public types and signature:

```ts
type OfferMoment = "launch_bonus" | "launch_price" | "standard";

type OfferPresentation = {
  moment: OfferMoment;
  catalogCode: "launch" | "launch_price" | "standard";
  promotional: boolean;
  monthlyPriceLabel: string;
  monthlyPriceQualifier: string | null;
  monthlyRenewalPriceLabel: string | null;
  semiannualTotalLabel: string;
  semiannualInstallmentLabel: string;
  monthlyAccessMonths: number;
  monthlyBonusMonths: number;
  semiannualAccessMonths: number;
  semiannualBonusMonths: number;
};

function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function resolveOfferPresentation(
  prices: ActiveBillingPrice[],
): OfferPresentation | null;
```

Move the exact approved-shape checks from `resolveLandingOfferPresentation` into this function. Derive `moment` from the catalog and set `promotional` only for `launch` and `launch_price`.

- [x] **Step 4: Rewire existing consumers without changing behavior**

Import `formatBRL` in `billing-plans.tsx`. In `landing-offer.ts`, import `OfferPresentation` and `resolveOfferPresentation`; use the shared type in `resolveActiveLaunchOffer` and `shouldShowLandingOfferDialog`, and re-export it temporarily as `LandingOfferPresentation` only if required to keep existing callers readable:

```ts
import {
  resolveOfferPresentation,
  type OfferPresentation,
} from "@/modules/billing/presenters/offer-presentation";

type LandingOfferPresentation = OfferPresentation;

export { resolveOfferPresentation as resolveLandingOfferPresentation };
```

- [x] **Step 5: Run resolver and billing tests**

Run:

```bash
pnpm exec vitest run src/modules/billing/presenters/offer-presentation.test.ts src/components/landing/landing-offer.test.ts src/modules/billing/components/billing-plans.test.tsx
```

Expected: PASS.

- [x] **Step 6: Commit the isolated model change**

```bash
git add src/modules/billing/presenters/offer-presentation.ts src/modules/billing/presenters/offer-presentation.test.ts src/components/landing/landing-offer.ts src/components/landing/landing-offer.test.ts src/modules/billing/components/billing-plans.tsx
git commit -m "refactor: centralize offer presentation states"
```

---

### Task 2: Make the landing dialog copy exact for all three moments

**Files:**

- Modify: `src/components/landing/landing-offer-dialog.tsx`
- Modify: `src/components/landing/landing-offer-dialog.test.tsx`
- Modify only if selectors need adjustment: `src/components/landing/landing-offer-dialog.css`

**Interfaces:**

- Consumes: `OfferPresentation` from Task 1.
- Produces: landing dialog markup with mutually exclusive bonus, price-only, and standard content.

- [x] **Step 1: Correct the three component tests before changing markup**

Replace the bonus assertion that currently implies three months of access with the approved meaning:

```ts
expect(dialog).toHaveTextContent("Inclui 1 mês de bônus");
expect(dialog).toHaveTextContent("Você fica 2 meses com tudo liberado.");
```

Retain and strengthen the other state assertions:

```ts
expect(priceOnlyDialog).not.toHaveTextContent(/bônus/i);
expect(priceOnlyDialog).toHaveTextContent("Depois, R$ 49,90/mês");

expect(standardDialog).toHaveTextContent("R$ 49,90");
expect(standardDialog).toHaveTextContent("/mês");
expect(standardDialog).not.toHaveTextContent(
  /oferta de lançamento|bônus|depois/i,
);
```

- [x] **Step 2: Run the landing dialog test and verify the bonus-copy failure**

Run:

```bash
pnpm exec vitest run src/components/landing/landing-offer-dialog.test.tsx
```

Expected: FAIL because the current bonus sentence says “Inclui 2 meses de acesso + 1 mês de bônus”.

- [x] **Step 3: Render state-specific copy from the shared model**

Use `offer.promotional` for the launch badge. For the bonus body, render:

```tsx
<strong>Inclui {offer.monthlyBonusMonths} mês de bônus</strong>
<span>
  Você fica {offer.monthlyAccessMonths} meses com tudo liberado.
</span>
```

Keep the condition area absent for `standard`, and keep the renewal line present for both promotional catalogs but absent for standard.

- [x] **Step 4: Run landing offer tests**

Run:

```bash
pnpm exec vitest run src/components/landing/landing-offer-dialog.test.tsx src/components/landing/landing-offer.test.ts src/app/page.test.tsx
```

Expected: PASS, including the existing feature-flag behavior for standard pricing.

- [x] **Step 5: Commit the landing state copy**

```bash
git add src/components/landing/landing-offer-dialog.tsx src/components/landing/landing-offer-dialog.test.tsx src/components/landing/landing-offer-dialog.css
git commit -m "fix: align landing dialog with offer moments"
```

---

### Task 3: Generalize the first-diagnosis offer trigger

**Files:**

- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx`

**Interfaces:**

- Consumes: `LaunchOfferResolution.catalogCode` from the campaign resolver.
- Produces: `offerOnCompletion: boolean` propagated to all quick-diagnosis branches and redirects containing `?offer=1`.

- [x] **Step 1: Update tests to describe a generic offer trigger**

Rename test options and expectations from `launchOfferOnCompletion` to `offerOnCompletion`. Add a standard-period page case:

```ts
it("enables the completion offer during the standard period", async () => {
  readLaunchOfferEnvironment.mockReturnValue({
    phase: "expired",
    catalogCode: "standard",
    startsAt: "2026-09-01T12:00:00.000Z",
    bonusEndsAt: "2026-09-16T12:00:00.000Z",
    promotionEndsAt: "2026-10-01T12:00:00.000Z",
  });

  await renderPage();

  expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
    expect.objectContaining({ offerOnCompletion: true }),
    undefined,
  );
});
```

Add an invalid-configuration case expecting `offerOnCompletion: false`. Update the wizard completion assertion to expect `/reports/42?offer=1`.

- [x] **Step 2: Run the page and wizard tests and verify failures**

Run:

```bash
pnpm exec vitest run 'src/app/(private)/quick-diagnosis/page.test.tsx' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
```

Expected: FAIL because the old prop and URL are launch-specific and standard currently disables the marker.

- [x] **Step 3: Rename and propagate the generic prop**

Use this prop consistently:

```ts
type QuickDiagnosisWizardProps = {
  // existing fields
  offerOnCompletion: boolean;
};
```

Pass it through `QuickDiagnosisWizard` to the service, product, and production wizards. In each successful quick-diagnosis redirect, build:

```ts
`/reports/${result.diagnosisId}${offerOnCompletion ? "?offer=1" : ""}`;
```

- [x] **Step 4: Enable every valid catalog on the page**

Replace the active-launch-only check with a valid-resolution check:

```ts
const offerResolution = readLaunchOfferEnvironment();
const offerOnCompletion =
  offerResolution.catalogCode !== null &&
  result.overview.tier === "free" &&
  !result.overview.freeQuickDiagnosisUsed;
```

This includes disabled, scheduled, and expired configurations as valid standard pricing while continuing to reject `invalid`.

- [x] **Step 5: Run all quick-diagnosis tests**

Run:

```bash
pnpm exec vitest run 'src/app/(private)/quick-diagnosis/page.test.tsx' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
```

Expected: PASS for all diagnosis categories and all three commercial moments.

- [x] **Step 6: Commit the generic completion trigger**

```bash
git add 'src/app/(private)/quick-diagnosis/page.tsx' 'src/app/(private)/quick-diagnosis/page.test.tsx' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx
git commit -m "feat: show completion offer in every pricing period"
```

---

### Task 4: Resolve all three catalogs on the report page

**Files:**

- Modify: `src/app/(private)/reports/[id]/page.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`

**Interfaces:**

- Consumes: `resolveOfferPresentation(prices)` from Task 1 and the `offer=1` marker from Task 3.
- Produces: `LaunchOfferDialog` invocation with `OfferPresentation` for any valid catalog.

- [x] **Step 1: Add a failing standard-period report test**

Configure `readLaunchOfferEnvironment` as `expired`, return the approved standard monthly and semiannual rows, render with `{ offer: "1" }`, and assert:

```ts
expect(listActivePrices).toHaveBeenCalledWith({
  supabase,
  catalogCode: "standard",
});
expect(LaunchOfferDialog).toHaveBeenCalledWith(
  expect.objectContaining({
    dismissHref: "/reports/42",
    offer: expect.objectContaining({
      moment: "standard",
      catalogCode: "standard",
      monthlyPriceLabel: "R$ 49,90",
      monthlyBonusMonths: 0,
    }),
  }),
  undefined,
);
```

Keep negative tests for paid users, normal report navigation, malformed prices, and invalid campaign configuration.

- [x] **Step 2: Run the report page test and verify failure**

Run:

```bash
pnpm exec vitest run 'src/app/(private)/reports/[id]/page.test.tsx'
```

Expected: FAIL because the page only fetches prices and opens the dialog for an active launch.

- [x] **Step 3: Generalize report resolution**

Read `searchParams.offer`, fetch prices whenever the marker is present and `catalogCode !== null`, resolve them with `resolveOfferPresentation`, and require `presentation.catalogCode === resolution.catalogCode` before rendering. Pass the presentation directly:

```tsx
<LaunchOfferDialog dismissHref={`/reports/${id}`} offer={offerPresentation} />
```

Do not pass campaign phase or countdown timestamps; the simplified dialog does not use them.

- [x] **Step 4: Run report page tests**

Run:

```bash
pnpm exec vitest run 'src/app/(private)/reports/[id]/page.test.tsx'
```

Expected: PASS for bonus, price-only, standard, invalid, paid, and unmarked navigation.

- [x] **Step 5: Commit report resolution**

```bash
git add 'src/app/(private)/reports/[id]/page.tsx' 'src/app/(private)/reports/[id]/page.test.tsx'
git commit -m "feat: resolve post-diagnosis offer for every catalog"
```

---

### Task 5: Simplify and narrow the post-diagnosis dialog

**Files:**

- Modify: `src/modules/billing/components/launch-offer-dialog.tsx`
- Modify: `src/modules/billing/components/launch-offer-dialog.test.tsx`
- Modify: `src/modules/billing/components/post-diagnosis-dialog.css`

**Interfaces:**

- Consumes: `OfferPresentation` from Task 1.
- Produces: a single-purpose post-diagnosis dialog; retain the exported component name `LaunchOfferDialog` to avoid an unrelated rename.

- [x] **Step 1: Replace legacy tests with three post-diagnosis states**

Remove tests for the unused `context="landing"` branch and countdown. Add a table or three explicit tests asserting:

```ts
// launch bonus
expect(dialog).toHaveTextContent("Oferta de lançamento");
expect(dialog).toHaveTextContent("R$ 39,90");
expect(dialog).toHaveTextContent("Inclui 1 mês de bônus");
expect(dialog).toHaveTextContent("Você fica 2 meses com tudo liberado.");

// launch price only
expect(dialog).toHaveTextContent("R$ 39,90");
expect(dialog).toHaveTextContent("Depois, R$ 49,90/mês");
expect(dialog).not.toHaveTextContent(/bônus/i);

// standard
expect(dialog).toHaveTextContent("R$ 49,90");
expect(dialog).toHaveTextContent("/mês");
expect(dialog).not.toHaveTextContent(/oferta de lançamento|bônus|depois/i);
```

For every state, assert the title, two benefits, notebook, `/billing` CTA, reassurance, and `Fechar` button. Assert absence of the removed content:

```ts
expect(dialog).not.toHaveTextContent(
  /plano semestral|e-book|contagem|7 dias de garantia|talvez mais tarde/i,
);
```

Keep the close test and verify `router.replace(dismissHref, { scroll: false })`.

- [x] **Step 2: Run the component test and verify the expected failures**

Run:

```bash
pnpm exec vitest run src/modules/billing/components/launch-offer-dialog.test.tsx
```

Expected: FAIL because the current component has an unused landing branch, extra commercial content, and no standard state.

- [x] **Step 3: Reduce the component to the approved information architecture**

Remove `context`, countdown, semestral, materials, guarantee, and secondary action code. The props become:

```ts
type LaunchOfferDialogProps = {
  offer: OfferPresentation;
  dismissHref?: string;
};
```

Add an icon-only `DialogClose` with visible focus and accessible text:

```tsx
<DialogClose type="button" className="post-diagnosis-close">
  <XIcon aria-hidden="true" size={18} />
  <span className="sr-only">Fechar</span>
</DialogClose>
```

Use `offer.promotional` for the badge and renewal, `offer.monthlyBonusMonths > 0` for the bonus panel, and the standard `/mês` suffix when `monthlyPriceQualifier` is null. The reassurance is exactly:

```tsx
<p className="post-diagnosis-reassure">
  <LockKeyholeIcon aria-hidden="true" size={16} />
  Acesso imediato e cancelamento quando quiser.
</p>
```

- [x] **Step 4: Rewrite CSS around a narrower reference composition**

Use a maximum width near `780px`, preserve viewport-relative max height and scrolling, and retain the existing navy/yellow visual language. Desktop uses copy/notebook columns followed by one compact price card. Mobile stacks the hero, hides no required information, keeps 44-pixel controls, and has no horizontal overflow at 360px.

Delete selectors for:

```text
.post-diagnosis-plan-details
.post-diagnosis-countdown
.post-diagnosis-countdown-clock
.post-diagnosis-later
```

Keep selectors scoped under `.post-diagnosis-dialog` and add `.post-diagnosis-close`.

- [x] **Step 5: Run the dialog tests**

Run:

```bash
pnpm exec vitest run src/modules/billing/components/launch-offer-dialog.test.tsx 'src/app/(private)/reports/[id]/page.test.tsx'
```

Expected: PASS for all three moments and URL cleanup.

- [x] **Step 6: Commit the post-diagnosis refactor**

```bash
git add src/modules/billing/components/launch-offer-dialog.tsx src/modules/billing/components/launch-offer-dialog.test.tsx src/modules/billing/components/post-diagnosis-dialog.css
git commit -m "refactor: simplify post-diagnosis offer dialog"
```

---

### Task 6: Validate integration and responsive presentation

**Files:**

- Verify: all files changed in Tasks 1–5
- Do not retain: temporary preview routes or screenshots

**Interfaces:**

- Consumes: completed implementation.
- Produces: verified three-state behavior with no temporary artifacts.

- [x] **Step 1: Run the complete targeted suite**

```bash
pnpm exec vitest run src/modules/billing/presenters/offer-presentation.test.ts src/components/landing/landing-offer.test.ts src/components/landing/landing-offer-dialog.test.tsx src/modules/billing/components/launch-offer-dialog.test.tsx 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/page.test.tsx
```

Expected: PASS.

- [x] **Step 2: Run static checks**

```bash
pnpm typecheck
pnpm exec eslint src/modules/billing/presenters/offer-presentation.ts src/components/landing/landing-offer.ts src/components/landing/landing-offer-dialog.tsx src/modules/billing/components/launch-offer-dialog.tsx 'src/app/(private)/quick-diagnosis/page.tsx' 'src/app/(private)/reports/[id]/page.tsx' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx
git diff --check
```

Expected: all commands exit successfully.

- [x] **Step 3: Run the design detector**

```bash
.agents/skills/impeccable/scripts/impeccable detect --json src/components/landing/landing-offer-dialog.tsx src/components/landing/landing-offer-dialog.css src/modules/billing/components/launch-offer-dialog.tsx src/modules/billing/components/post-diagnosis-dialog.css
```

Expected: `[]`, or only reviewed false positives documented before handoff.

- [x] **Step 4: Perform one bounded browser review**

Use a temporary local preview only if authentication prevents direct access. Capture the post-diagnosis dialog at 1440×900, 390×844, and 360×740 for each commercial moment. In the same pass verify:

- the desktop dialog is visibly narrower than the previous 940px version;
- only reference-approved information is present;
- bonus and promotional badges disappear in the correct moments;
- the standard price uses `/mês` and no launch claim;
- the CTA and close control are keyboard reachable;
- 360px has no horizontal scroll;
- browser console has no errors or warnings introduced by the dialog.

- [x] **Step 5: Apply at most one batched correction and confirm once**

If the review finds issues, fix all observed defects together, rerun the affected component tests, and take one final desktop/mobile confirmation. Remove temporary routes and move temporary screenshots outside the repository.

- [x] **Step 6: Final scoped status review**

```bash
git status --short
git diff --check
rg -n "launchOfferOnCompletion|launchOffer=1|post-diagnosis-(plan-details|countdown|later)" src
```

Expected: no stale launch-only completion identifiers or removed post-diagnosis selectors; unrelated existing files remain untouched.
