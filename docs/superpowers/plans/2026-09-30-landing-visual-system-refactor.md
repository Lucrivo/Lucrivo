# Landing Visual System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the public landing from navigation through Pricing into one fixed, light, restrained visual system while preserving all current copy, commercial behavior, accessibility, responsiveness, later sections, and authenticated billing UI.

**Architecture:** Keep the current component boundaries (`HeroSection`, `ProblemSection`, `LandingExperience`, and `BillingPlans`) and replace the conflicting visual rules in place. Establish landing-only light tokens on the page root, simplify markup only where it removes forced presentation or stateful decoration, and scope plan-card refinements to `data-context="public"` so the authenticated account context remains unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS/CSS Modules, GSAP 3 with `@gsap/react`, Vitest, Testing Library, Phosphor Icons, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-30-landing-visual-system-refactor-design.md`

## Global Constraints

- Preserve all current user-facing copy from Hero through Pricing.
- Do not modify the Final CTA (`#diagnostico`) or footer markup, styling, or behavior.
- The public landing must render identically under light, dark, and system application-theme preferences.
- Do not alter billing data, checkout behavior, price loading, registration links, anchors, or authenticated product screens.
- Keep the account-context version of `BillingPlans` visually and behaviorally unchanged.
- Preserve the current uncommitted landing work and `src/public/lp/method-*.webp` assets as the implementation baseline.
- Add no dependencies, fonts, remote images, claims, testimonials, plan features, or new copy.
- Maintain WCAG AA contrast, visible focus, keyboard behavior, meaningful image alternative text, reduced-motion support, and touch targets of at least 44 pixels.
- Verify layouts at 320, 375, 390, 768, 1024, and 1440 pixels with no horizontal overflow.
- Use the existing Geist family; do not introduce a second font family.

## File Map

- `src/components/landing/landing-experience.tsx` — public navigation, included section sequencing, business/method data and markup, testimonial state, and GSAP lifecycle.
- `src/components/landing/hero-section.tsx` — Hero copy, actions, trust items, and product image.
- `src/components/landing/problem-section.tsx` — pricing-factor articles, microvisual markup, and conclusion.
- `src/components/landing/landing-experience.css` — all landing-specific visual tokens and section styles; included-scope selectors are replaced, not layered, while Final CTA/footer selectors remain untouched.
- `src/modules/billing/components/billing-plans.module.css` — public Pricing refinements, explicitly scoped to `[data-context="public"]`; existing account styles remain the default.
- `src/app/page.test.tsx` — public landing semantic, content, anchor, and fixed-theme regression coverage.
- `src/modules/billing/components/billing-plans.test.tsx` — public/account commercial behavior regression coverage; change only if a structural accessibility assertion is needed.
- `src/public/lp/method-inputs.webp`, `method-calculation.webp`, `method-report.webp` — existing method imagery; preserve and commit as part of the method task.

---

### Task 1: Lock the Public Landing Theme Contract

**Files:**
- Modify: `src/app/page.test.tsx`
- Modify: `src/components/landing/landing-experience.tsx`
- Modify: `src/components/landing/landing-experience.css`

**Interfaces:**
- Consumes: `LandingExperience({ prices }: { prices: ActiveBillingPrice[] })`.
- Produces: a `main[data-landing-theme="light"]` root and landing-only visual variables used by Tasks 2–5.

- [ ] **Step 1: Add a failing theme-independence contract test**

Add this test beside the existing root-page rendering tests in `src/app/page.test.tsx`:

```tsx
it("uses a fixed visual theme independent of the application theme", async () => {
  document.documentElement.classList.add("dark");

  await renderHome();

  expect(screen.getByRole("main")).toHaveAttribute(
    "data-landing-theme",
    "light",
  );

  document.documentElement.classList.remove("dark");
});
```

Use a `try/finally` cleanup if the local test setup does not reset the document class between tests:

```tsx
document.documentElement.classList.add("dark");
try {
  await renderHome();
  expect(screen.getByRole("main")).toHaveAttribute(
    "data-landing-theme",
    "light",
  );
} finally {
  document.documentElement.classList.remove("dark");
}
```

- [ ] **Step 2: Run the targeted test and confirm the contract fails**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: FAIL because the landing `main` does not yet have
`data-landing-theme="light"`.

- [ ] **Step 3: Add the root attribute and landing-only tokens**

Update the `main` in `LandingExperience`:

```tsx
<main
  ref={root}
  data-landing-theme="light"
  className="landing-experience page-shell w-full max-w-full"
>
```

Keep the legacy variables that Final CTA/footer already consume, and add a
separate token set at the top of `landing-experience.css`:

```css
.landing-experience {
  --ink: oklch(0.145 0.03 258);
  --ink-soft: oklch(0.19 0.035 258);
  --paper: oklch(0.978 0.008 255);
  --paper-bright: oklch(0.998 0.003 255);
  --landing-primary: oklch(0.56 0.23 259);
  --landing-primary-hover: oklch(0.52 0.25 271);
  --landing-primary-bright: oklch(0.67 0.2 255);
  --landing-primary-foreground: oklch(0.99 0.005 255);
  --landing-info: oklch(0.72 0.15 235);
  --line: oklch(0.205 0.045 258 / 0.16);

  --landing-canvas: oklch(0.978 0.008 255);
  --landing-surface: oklch(0.998 0.003 255);
  --landing-surface-soft: oklch(0.95 0.022 255);
  --landing-text: oklch(0.2 0.04 258);
  --landing-text-muted: oklch(0.46 0.035 258);
  --landing-accent: oklch(0.56 0.21 259);
  --landing-accent-hover: oklch(0.51 0.22 261);
  --landing-accent-soft: oklch(0.93 0.045 255);
  --landing-border: oklch(0.87 0.022 255);
  --landing-content: 1240px;
  --landing-gutter: clamp(20px, 5vw, 72px);
  color-scheme: light;
}
```

Do not change `.landing-experience.page-shell` to a light background globally;
the existing dark background remains the safe base for the excluded Final CTA
and footer. Included sections receive their explicit light surfaces in later
tasks.

- [ ] **Step 4: Run the test and verify it passes**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: PASS, including the existing Hero, problem, business, method, later
chapter, and Pricing assertions.

- [ ] **Step 5: Commit the theme contract**

```bash
git add src/app/page.test.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css
git commit -m "refactor: lock landing to a fixed light theme"
```

---

### Task 2: Refine Navigation and Hero Into the Shared Editorial System

**Files:**
- Modify: `src/components/landing/hero-section.tsx`
- Modify: `src/components/landing/landing-experience.css`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: the landing-only tokens and `data-landing-theme="light"` from Task 1.
- Produces: a light fixed navigation and responsive Hero whose semantic heading remains `Você sabe se o preço que cobra realmente dá lucro?`.

- [ ] **Step 1: Record the existing Hero contract before markup changes**

Confirm `src/app/page.test.tsx` includes these assertions; add only the missing
ones:

```tsx
expect(
  screen.getByRole("heading", {
    level: 1,
    name: "Você sabe se o preço que cobra realmente dá lucro?",
  }),
).toBeInTheDocument();

expect(
  screen.getByRole("link", { name: /Fazer diagnóstico gratuito/i }),
).toHaveAttribute("href", "/register");

expect(
  screen.getByRole("img", {
    name: "Painel ilustrativo do Lucrivo com indicadores financeiros.",
  }),
).toBeInTheDocument();
```

- [ ] **Step 2: Run the baseline contract test**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: PASS before visual changes. This establishes that subsequent changes
must preserve semantics and copy.

- [ ] **Step 3: Remove forced presentation-only headline lines**

Replace the three block spans in `hero-section.tsx` with the same copy in normal
flow:

```tsx
<h1 id="hero-title" className="hero-copy-reveal">
  Você sabe se o preço que cobra <em>realmente dá lucro?</em>
</h1>
```

Do not change the kicker, description, CTA labels, trust-item text, or image
alternative text.

- [ ] **Step 4: Replace navigation and Hero visual rules instead of overriding them**

Rewrite the existing selectors from `.nav-wrap` through the Hero image rules
using these exact structural values as the baseline:

```css
.landing-experience .nav-wrap {
  position: fixed;
  z-index: 50;
  top: 16px;
  left: 50%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: min(calc(100% - 40px), var(--landing-content));
  min-height: 62px;
  padding: 8px 10px 8px 22px;
  transform: translateX(-50%);
  border: 1px solid var(--landing-border);
  border-radius: 16px;
  background: oklch(0.998 0.003 255 / 0.94);
  box-shadow: 0 12px 32px oklch(0.2 0.04 258 / 0.07);
  color: var(--landing-text);
  backdrop-filter: blur(14px);
}

.landing-experience .hero-section {
  position: relative;
  display: grid;
  min-height: auto;
  padding: clamp(148px, 14vw, 188px) var(--landing-gutter)
    clamp(88px, 9vw, 124px);
  overflow: hidden;
  background: var(--landing-canvas);
  color: var(--landing-text);
}

.landing-experience .hero-layout {
  display: grid;
  width: min(100%, var(--landing-content));
  margin-inline: auto;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  align-items: center;
  gap: clamp(40px, 6vw, 88px);
}

.landing-experience .hero-copy h1 {
  max-width: 12ch;
  margin: 0;
  font-size: clamp(3rem, 5vw, 4rem);
  font-weight: 620;
  line-height: 0.98;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.landing-experience .hero-copy h1 em {
  color: var(--landing-accent);
  font: inherit;
}

.landing-experience .hero-dashboard-motion {
  overflow: hidden;
  border: 1px solid var(--landing-border);
  border-radius: 18px;
  background: var(--landing-surface);
  box-shadow: 0 24px 70px -48px oklch(0.2 0.08 258 / 0.35);
}
```

Also make the kicker plain metadata, remove `.hero-section` radial backgrounds
and gradient divider, remove `.hero-actions .button-primary` glow, use one blue
primary button plus one neutral outlined button, and reduce trust icons to
approximately 22–24 pixels. Delete obsolete `hero-ambient` decorative rules;
the empty element may remain hidden or be removed from the component.

- [ ] **Step 5: Reduce the Hero motion to one restrained sequence**

In `LandingExperience`, change the Hero animation to:

```tsx
gsap
  .timeline()
  .from(".hero-copy-reveal", {
    y: 16,
    opacity: 0,
    duration: 0.42,
    stagger: 0.06,
    ease: "power2.out",
  })
  .from(
    ".hero-visual-reveal",
    {
      y: 16,
      opacity: 0,
      duration: 0.48,
      ease: "power2.out",
    },
    "-=0.24",
  );
```

Remove the Hero `x`, `scale`, and `rotate` entrance values. Keep the existing
early return for `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Verify semantic and static quality**

Run:

```bash
pnpm test -- src/app/page.test.tsx
pnpm typecheck
```

Expected: both commands PASS; the Hero still has one `h1`, both CTAs, all trust
items, and a reserved Next.js image.

- [ ] **Step 7: Commit navigation and Hero**

```bash
git add src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
git commit -m "refactor: simplify landing navigation and hero"
```

---

### Task 3: Unify the Problem Section Without Changing Its Narrative

**Files:**
- Modify: `src/components/landing/landing-experience.css`
- Verify: `src/components/landing/problem-section.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: existing `ProblemSection` semantic articles and `FactorVisual` decorative markup.
- Produces: one coherent light factor grid and conclusion using the shared landing tokens.

- [ ] **Step 1: Confirm the existing factor-content contract**

Keep the current page test assertions for all six headings and descriptions:

```tsx
const problem = document.querySelector("#como-funciona");
expect(problem).not.toBeNull();
const view = within(problem as HTMLElement);

for (const [title, description] of [
  ["Custos", "Tudo que sai para o produto ou serviço existir."],
  ["Impostos", "A fatia que vai embora em cada venda."],
  ["Taxas", "Cartão, app, marketplace — descontam sem avisar."],
  ["Tempo", "Seu trabalho e suas horas também têm valor."],
  ["Estrutura", "Aluguel, luz, sistema: o custo de manter tudo de pé."],
  ["O quanto você quer ganhar", "O preço tem que caber o seu lucro também."],
] as const) {
  expect(view.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
  expect(view.getByText(description)).toBeInTheDocument();
}
```

- [ ] **Step 2: Run the Problem contract test**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: PASS before the CSS rewrite.

- [ ] **Step 3: Replace the multicolor bento styling with one modular system**

Rewrite the Problem selectors in place. Preserve the 12-column composition on
large screens but normalize every factor to the same surface vocabulary:

```css
.landing-experience .problem-section {
  background: var(--landing-canvas);
  color: var(--landing-text);
}

.landing-experience .problem-bridge {
  display: grid;
  min-height: auto;
  padding: 28px var(--landing-gutter) 0;
  background: var(--landing-canvas);
}

.landing-experience .problem-content {
  width: min(100%, var(--landing-content));
  margin-inline: auto;
  padding: clamp(88px, 9vw, 124px) var(--landing-gutter);
}

.landing-experience .problem-bento {
  display: grid;
  overflow: hidden;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  border: 1px solid var(--landing-border);
  border-radius: 18px;
  background: var(--landing-border);
  gap: 1px;
}

.landing-experience .problem-card {
  min-height: 260px;
  padding: clamp(24px, 3vw, 36px);
  border: 0;
  border-radius: 0;
  background: var(--landing-surface);
  color: var(--landing-text);
  box-shadow: none;
}

.landing-experience .problem-card-blue,
.landing-experience .problem-card-ink,
.landing-experience .problem-card-navy,
.landing-experience .problem-card-paper {
  background: var(--landing-surface);
  color: var(--landing-text);
}

.landing-experience .problem-conclusion-primary {
  background: var(--landing-accent-soft);
  color: var(--landing-text);
}

.landing-experience .problem-conclusion-secondary {
  background: var(--landing-surface-soft);
  color: var(--landing-text);
}
```

Use the existing grid-area widths for narrative rhythm, but remove card glows,
strong overlays, colored full-card backgrounds, large hover translations, and
high-contrast decorative visuals. Set all factor icons and microvisuals to
`var(--landing-accent)` or a low-opacity navy. Ensure card body copy uses
`var(--landing-text-muted)` and remains at least 16 pixels.

- [ ] **Step 4: Reduce Problem motion and hover intensity**

Keep the existing once-only reveal but use these values:

```tsx
.from(".problem-reveal", {
  y: 14,
  opacity: 0,
  duration: 0.38,
  stagger: 0.06,
  ease: "power2.out",
});
```

For card contents, remove scale, large offsets, rotations, and decorative
timeline branches. A card may move no more than `translateY(-2px)` on a fine
pointer, and explanatory articles must not gain pointer cursors.

- [ ] **Step 5: Verify content, type safety, and formatting**

Run:

```bash
pnpm test -- src/app/page.test.tsx
pnpm typecheck
pnpm prettier --check src/components/landing/problem-section.tsx src/components/landing/landing-experience.css
```

Expected: PASS; no copy or semantic article is removed.

- [ ] **Step 6: Commit the Problem section**

```bash
git add src/components/landing/problem-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
git commit -m "refactor: unify landing problem section"
```

---

### Task 4: Simplify Business Contexts and Method Into Calm Content Grids

**Files:**
- Modify: `src/components/landing/landing-experience.tsx`
- Modify: `src/components/landing/landing-experience.css`
- Test: `src/app/page.test.tsx`
- Add existing assets: `src/public/lp/method-inputs.webp`
- Add existing assets: `src/public/lp/method-calculation.webp`
- Add existing assets: `src/public/lp/method-report.webp`

**Interfaces:**
- Consumes: `businessContexts`, `methodPanels`, `BusinessContextVisual`, and the landing tokens.
- Produces: stateless business links and three non-sticky method cards using the existing image imports and accessible text.

- [ ] **Step 1: Preserve the business and method regression assertions**

Keep or add the following public contracts in `src/app/page.test.tsx`:

```tsx
const business = document.querySelector("#recursos");
expect(business).not.toBeNull();
const businessView = within(business as HTMLElement);

for (const name of [
  "Ver planos para quem revende",
  "Ver planos para quem produz",
  "Ver planos para quem presta serviço",
]) {
  expect(businessView.getByRole("link", { name })).toHaveAttribute(
    "href",
    "#planos",
  );
}

const method = document.querySelector(".method-section");
expect(method).not.toBeNull();
const methodView = within(method as HTMLElement);

for (const [title, description] of [
  ["Preço", "O que você cobra hoje."],
  ["Custos", "O que realmente sai da sua conta."],
  ["Quanto sobra", "O que fica pra você depois dos custos."],
  ["Resultado", "Um preço que faz a conta fechar."],
  ["Situação", "Se o seu preço faz sentido."],
] as const) {
  expect(methodView.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
  expect(methodView.getByText(description)).toBeInTheDocument();
}
```

- [ ] **Step 2: Run the baseline landing tests**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: PASS before removing presentation-only state.

- [ ] **Step 3: Remove business-card presentation state**

Delete this state:

```tsx
const [activeBusiness, setActiveBusiness] =
  useState<BusinessContextSlug | null>(null);
```

Render the wrapper and cards without stateful classes or pointer/focus event
handlers:

```tsx
<div className="business-cards">
  {businessContexts.map(
    ({ slug, title, subtitle, description, actionLabel, icon: Icon }) => (
      <a
        className={`business-card business-card-${slug}`}
        href="#planos"
        aria-label={actionLabel}
        data-business-card={slug}
        key={slug}
      >
        {/* Preserve the existing icon, heading, description, arrow, and visual. */}
      </a>
    ),
  )}
</div>
```

Remove `.has-active`, `.is-active`, `onMouseLeave`, `onMouseEnter`, `onFocus`,
`onBlur`, and presentation-only `onClick` usage. Do not remove the links or
their accessible action labels.

- [ ] **Step 4: Replace Business styling with equal compact cards**

Use the shared content width and a flat three-column grid:

```css
.landing-experience .business-section {
  padding: clamp(88px, 9vw, 124px) var(--landing-gutter);
  background: var(--landing-surface);
  color: var(--landing-text);
}

.landing-experience .business-shell {
  width: min(100%, var(--landing-content));
  margin-inline: auto;
}

.landing-experience .business-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.landing-experience .business-card {
  display: flex;
  min-height: 330px;
  padding: 28px;
  flex-direction: column;
  border: 1px solid var(--landing-border);
  border-radius: 16px;
  background: var(--landing-surface);
  color: var(--landing-text);
  box-shadow: none;
  transition: border-color 200ms ease, transform 200ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .landing-experience .business-card:hover {
    transform: translateY(-2px);
    border-color: oklch(0.7 0.1 255);
  }
}
```

Delete all active/dimmed card selectors. Reduce microvisual saturation and keep
them inside the card without absolute overflow. Use one shared icon container,
type scale, arrow treatment, and description color for all three contexts.

- [ ] **Step 5: Remove scrubbed/sticky Method motion from TypeScript**

Delete the `methodPanelElements` animation loop and `methodStackMotion` media
query that animate clip paths, scale, brightness, and content position. Replace
them with one once-only reveal:

```tsx
gsap.from("[data-method-panel]", {
  y: 16,
  opacity: 0,
  duration: 0.42,
  stagger: 0.08,
  ease: "power2.out",
  scrollTrigger: {
    trigger: ".method-panels",
    start: "top 88%",
    once: true,
  },
});
```

- [ ] **Step 6: Replace sticky panels with a responsive three-card grid**

Rewrite the Method selectors in place:

```css
.landing-experience .method-section {
  padding: clamp(88px, 9vw, 124px) var(--landing-gutter);
  background: var(--landing-canvas);
  color: var(--landing-text);
}

.landing-experience .method-heading,
.landing-experience .method-panels {
  width: min(100%, var(--landing-content));
  margin-inline: auto;
}

.landing-experience .method-panels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.landing-experience .method-panel,
.landing-experience .method-panel:nth-child(2),
.landing-experience .method-panel:nth-child(3) {
  position: relative;
  top: auto;
  display: flex;
  min-height: 0;
  padding: 14px;
  flex-direction: column;
  border: 1px solid var(--landing-border);
  border-radius: 16px;
  background: var(--landing-surface);
  color: var(--landing-text);
  filter: none;
  transform: none;
  box-shadow: none;
}

.landing-experience .method-panel-image-frame {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 12px;
  background: var(--landing-surface-soft);
}
```

Remove `position: sticky`, per-card top offsets, `--method-panel-scale`,
`--method-panel-brightness`, clip paths, large fixed media heights, and report
card exceptions that break the shared proportions. Preserve the report
figcaption and disclaimer.

- [ ] **Step 7: Verify the business/method content and assets**

Run:

```bash
pnpm test -- src/app/page.test.tsx
pnpm typecheck
pnpm prettier --check src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css
```

Expected: PASS; there are no unused `activeBusiness` references, and all three
method images compile through `next/image`.

- [ ] **Step 8: Commit Business and Method together**

```bash
git add src/app/page.test.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/public/lp/method-inputs.webp src/public/lp/method-calculation.webp src/public/lp/method-report.webp
git commit -m "refactor: simplify landing business and method sections"
```

---

### Task 5: Quiet Testimonials and Public Pricing Without Affecting Account Billing

**Files:**
- Modify: `src/components/landing/landing-experience.css`
- Modify: `src/modules/billing/components/billing-plans.module.css`
- Test: `src/app/page.test.tsx`
- Test: `src/modules/billing/components/billing-plans.test.tsx`
- Verify: `src/app/(private)/billing/page.test.tsx`

**Interfaces:**
- Consumes: testimonial state in `LandingExperience` and `BillingPlans` root `data-context`.
- Produces: a subdued testimonial carousel and public-only plan styling; `context="account"` keeps its current rules.

- [ ] **Step 1: Establish public and account BillingPlans behavior baselines**

Confirm `billing-plans.test.tsx` continues to render both contexts:

```tsx
it("marks the public pricing region without changing its offers", () => {
  render(<BillingPlans prices={prices} context="public" />);

  expect(screen.getByRole("article", { name: "Plano Anual" })).toBeInTheDocument();
  expect(screen.getByText("Mais vantajoso")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Opções de plano" })).toHaveAttribute(
    "data-context",
    "public",
  );
});

it("keeps account pricing actions in the account context", () => {
  render(<BillingPlans prices={prices} context="account" />);

  expect(screen.getByRole("article", { name: "Plano Anual" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Opções de plano" })).toHaveAttribute(
    "data-context",
    "account",
  );
});
```

Do not change pricing copy or checkout assertions.

- [ ] **Step 2: Run the relevant baseline tests**

Run:

```bash
pnpm test -- src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx src/app/\(private\)/billing/page.test.tsx
```

Expected: PASS before CSS changes.

- [ ] **Step 3: Simplify the testimonial composition with CSS only**

Keep the existing carousel state, accessible live region, names, roles, remote
images, and labelled controls. Replace the oversized layout with:

```css
.landing-experience .testimonial-section {
  padding: clamp(88px, 9vw, 124px) var(--landing-gutter);
  background: var(--landing-surface);
  color: var(--landing-text);
}

.landing-experience .testimonial-shell {
  display: grid;
  width: min(100%, var(--landing-content));
  margin-inline: auto;
  padding: clamp(28px, 5vw, 64px);
  grid-template-columns: minmax(180px, 0.55fr) minmax(0, 1.45fr);
  align-items: center;
  gap: clamp(32px, 6vw, 80px);
  border: 1px solid var(--landing-border);
  border-radius: 18px;
  background: var(--landing-accent-soft);
}

.landing-experience .testimonial-copy blockquote {
  max-width: 24ch;
  font-size: clamp(1.65rem, 3vw, 2.5rem);
  font-weight: 520;
  line-height: 1.14;
  letter-spacing: -0.035em;
}
```

Replace the offset portrait stack with one contained square/circle region no
larger than 260 pixels. Inactive portraits may remain absolutely overlaid with
opacity zero, but remove large rotations, offsets, and shadows. Keep controls
at least 44 by 44 pixels and visibly focused.

- [ ] **Step 4: Scope dark billing selectors to the account context**

Change each current module selector from the public-and-account form:

```css
:global(.dark) .root { /* ... */ }
:global(.dark) .featuredCard { /* ... */ }
```

to the account-only form:

```css
:global(.dark) .root[data-context="account"] { /* existing declarations */ }
:global(.dark) .root[data-context="account"] .featuredCard { /* existing declarations */ }
```

Apply the same `[data-context="account"]` scoping to every dark selector for
icons, descriptions, saving labels, actions, and unavailable cards. Do not
change the declarations inside those account rules.

- [ ] **Step 5: Add public-only Pricing refinements after account theme rules**

Use public selectors for every visual change:

```css
.root[data-context="public"] {
  --plans-ink: var(--landing-text, oklch(0.2 0.04 258));
  --plans-muted: var(--landing-text-muted, oklch(0.46 0.035 258));
  --plans-line: var(--landing-border, oklch(0.87 0.022 255));
  --plans-surface: var(--landing-surface, oklch(0.998 0.003 255));
  --plans-brand: var(--landing-accent, oklch(0.56 0.21 259));
  --plans-brand-deep: oklch(0.49 0.21 261);
}

.root[data-context="public"] .card {
  min-height: 600px;
  padding: 30px;
  border-radius: 16px;
  box-shadow: none;
}

.root[data-context="public"] .featuredCard {
  border-color: var(--plans-brand);
  background: var(--plans-brand-soft);
  box-shadow: none;
}

.root[data-context="public"] .popularBadge,
.root[data-context="public"] .primaryAction {
  background: var(--plans-brand);
  box-shadow: none;
}

.root[data-context="public"] .planIcon {
  width: 50px;
  height: 50px;
  flex-basis: 50px;
  border-radius: 12px;
}
```

Reduce public price-card hover to at most two pixels, remove gradients and glow,
keep the annual badge text, and maintain all visible focus styles. Adjust the
public trust rail only through `.root[data-context="public"] .trustRail`.

- [ ] **Step 6: Align the Pricing section heading with the page system**

Replace only `.pricing-section` and `.pricing-heading` included-scope rules:

```css
.landing-experience .pricing-section {
  scroll-margin-top: 104px;
  padding: clamp(88px, 9vw, 124px) var(--landing-gutter);
  background: var(--landing-canvas);
  color: var(--landing-text);
}

.landing-experience .pricing-heading {
  display: grid;
  width: min(100%, var(--landing-content));
  margin: 0 auto clamp(48px, 6vw, 72px);
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.42fr);
  align-items: end;
  gap: 32px;
}
```

Keep all heading and note copy unchanged.

- [ ] **Step 7: Verify public and account behavior**

Run:

```bash
pnpm test -- src/modules/billing/components/billing-plans.test.tsx src/app/page.test.tsx src/app/\(private\)/billing/page.test.tsx
pnpm typecheck
pnpm prettier --check src/components/landing/landing-experience.css src/modules/billing/components/billing-plans.module.css
```

Expected: PASS. Public and account plan markup/behavior are unchanged; only the
public visual selectors differ.

- [ ] **Step 8: Commit Testimonials and Pricing**

```bash
git add src/components/landing/landing-experience.css src/modules/billing/components/billing-plans.module.css src/app/page.test.tsx src/modules/billing/components/billing-plans.test.tsx
git commit -m "refactor: refine landing testimonials and pricing"
```

---

### Task 6: Consolidate Responsive Rules and Perform Bounded Visual QA

**Files:**
- Modify: `src/components/landing/landing-experience.css`
- Modify: `src/modules/billing/components/billing-plans.module.css`
- Modify if required by a discovered defect: `src/components/landing/landing-experience.tsx`
- Modify if required by a discovered defect: `src/components/landing/hero-section.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: all completed included-scope sections from Tasks 1–5.
- Produces: the final responsive landing implementation and verification evidence.

- [ ] **Step 1: Replace stale media-query branches with the final grid behavior**

Keep no responsive selector that references removed active card states, sticky
method offsets, dark included sections, old Hero spans, or obsolete glows. Use
these layout breakpoints as the baseline:

```css
@media (max-width: 1100px) {
  .landing-experience .hero-layout {
    grid-template-columns: 1fr;
  }

  .landing-experience .hero-copy {
    max-width: 760px;
  }

  .landing-experience .problem-bento,
  .landing-experience .business-cards,
  .landing-experience .method-panels {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-experience .method-panel:last-child,
  .landing-experience .problem-conclusion {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .landing-experience {
    --landing-gutter: 20px;
  }

  .landing-experience .problem-bento,
  .landing-experience .business-cards,
  .landing-experience .method-panels,
  .landing-experience .testimonial-shell,
  .landing-experience .pricing-heading {
    grid-template-columns: 1fr;
  }

  .landing-experience .hero-actions {
    flex-direction: column;
  }

  .landing-experience .hero-actions .button {
    width: 100%;
  }
}
```

For the Problem grid, reset all desktop `grid-column` coordinates at tablet and
mobile widths so no card creates an implicit column. Preserve content-defined
heights. Keep the existing mobile navigation overlay behavior.

- [ ] **Step 2: Confirm reduced-motion CSS matches the simplified GSAP lifecycle**

The final reduced-motion block must disable only real remaining transitions and
must not leave hidden content:

```css
@media (prefers-reduced-motion: reduce) {
  .landing-experience *,
  .landing-experience *::before,
  .landing-experience *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not set `opacity: 0` or transform initial states in CSS; GSAP applies those
only while animations run.

- [ ] **Step 3: Run the complete automated verification set**

Run:

```bash
pnpm test -- src/app/page.test.tsx src/modules/billing/components/billing-plans.test.tsx src/app/\(private\)/billing/page.test.tsx
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: every command PASS. If full formatting reports unrelated pre-existing
files, run Prettier only on changed files and report the unrelated failure
without editing out-of-scope files.

- [ ] **Step 4: Run the Impeccable detector exactly once over changed UI files**

Run:

```bash
node /home/pereira/projetos/Lucrivo/.agents/skills/impeccable/scripts/detect.mjs --json src/components/landing/landing-experience.tsx src/components/landing/hero-section.tsx src/components/landing/problem-section.tsx src/components/landing/landing-experience.css src/modules/billing/components/billing-plans.module.css
```

Expected: no unaddressed errors. Fix applicable findings in one consolidated
pass; document any false positive rather than suppressing it globally.

- [ ] **Step 5: Capture one desktop/mobile visual-review batch**

Start the existing app without changing configuration:

```bash
pnpm dev
```

Capture the landing at 1440×900 and 390×844 in both normal and forced
`prefers-reduced-motion: reduce` states. Also inspect scroll positions for the
Problem, Business, Method, Testimonial, and Pricing sections. Compare all views
in one batch for:

```text
- shared left/right alignment and content width
- consistent heading scale, radii, borders, and muted text
- no gradients/glows in the included scope
- no dark-mode response when the root html element has class="dark"
- no clipped Portuguese copy or unexpected fixed heights
- no horizontal overflow at 320, 375, 390, 768, 1024, and 1440 pixels
- visible focus on nav, CTAs, business links, carousel controls, and plan actions
- unchanged Final CTA and footer immediately after Pricing
```

- [ ] **Step 6: Apply at most one consolidated visual correction pass**

Fix all defects found in Step 5 together. Restrict changes to the files listed
in this task. Do not add decorative effects to fill perceived empty space; use
alignment, measure, spacing, and type hierarchy.

- [ ] **Step 7: Confirm the correction with one final desktop/mobile batch**

Repeat only the affected captures from Step 5. Stop after this confirmation
round unless there is a functional blocker such as unreadable content,
horizontal overflow, or a broken control.

- [ ] **Step 8: Run final diff and scope checks**

Run:

```bash
git diff --check
git status --short
git diff -- src/components/landing/landing-experience.tsx src/components/landing/hero-section.tsx src/components/landing/problem-section.tsx src/components/landing/landing-experience.css src/modules/billing/components/billing-plans.module.css src/app/page.test.tsx
```

Expected: no whitespace errors; only the approved landing, public Pricing,
tests, and method assets are changed. Confirm the Final CTA/footer selectors and
account-context billing declarations are untouched except for account-only dark
selector scoping.

- [ ] **Step 9: Commit responsive cleanup and QA corrections**

```bash
git add src/app/page.test.tsx src/components/landing/landing-experience.tsx src/components/landing/hero-section.tsx src/components/landing/problem-section.tsx src/components/landing/landing-experience.css src/modules/billing/components/billing-plans.module.css
git commit -m "refactor: finish responsive landing visual system"
```

---

## Completion Checklist

- [ ] Fixed landing theme verified with and without `.dark` on the document root.
- [ ] Navigation through Pricing uses one light token system and shared grid.
- [ ] All original copy and anchors remain present.
- [ ] Business links remain accessible and no longer dim sibling cards.
- [ ] Method images and disclaimer remain present without sticky/scrub motion.
- [ ] Testimonial carousel remains operable and visually secondary.
- [ ] Public Pricing is flatter and more compact; account Pricing is unchanged.
- [ ] Final CTA and footer are unchanged.
- [ ] Targeted tests, type checking, linting, formatting, detector, and visual QA pass.
