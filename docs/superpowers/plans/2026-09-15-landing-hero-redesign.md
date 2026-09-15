# Landing Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active landing-page hero with the approved responsive composition, use the supplied Lucrivo dashboard asset, and remove the unused legacy landing implementation.

**Architecture:** Extract the hero into a presentational `HeroSection` component while `LandingExperience` keeps the page shell, unchanged navigation, downstream sections, state, and GSAP lifecycle. Replace only the hero-specific CSS inside the landing stylesheet, then delete the disconnected legacy component tree after reference checks prove it is unused.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `next/image`, Phosphor Icons, GSAP 3, Tailwind CSS 4, CSS media queries, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-15-landing-hero-redesign.md`

## Global Constraints

- Preserve the current header/navbar markup, styling, links, and responsive behavior exactly as implemented.
- Do not change the markup, copy, styling, or behavior of any section below the hero.
- Keep all user-facing copy in Brazilian Portuguese and avoid claims not supported by `PRODUCT.md`.
- Use `src/public/lp/hero-image.png` through `next/image` as the single above-the-fold priority image.
- Keep a single page-level `h1`, visible keyboard focus, WCAG AA text contrast, 44-pixel minimum CTA targets, and reduced-motion support.
- Do not add a dependency or rebuild the supplied dashboard illustration as live UI.
- Historical documentation may retain references to prior implementation states.

## File Structure

- Create `src/components/landing/hero-section.tsx`: semantic hero content, CTA links, reassurance list, context list, and dashboard image.
- Modify `src/components/landing/landing-experience.tsx`: import/render `HeroSection`, remove only obsolete hero JSX/imports, and update the existing GSAP hero entrance selectors.
- Modify `src/components/landing/landing-experience.css`: replace only active and responsive hero rules; leave navigation and all later-section rules intact.
- Modify `src/app/page.test.tsx`: express the new hero's semantic, navigation, reassurance, image, and downstream-content contract.
- Delete `src/components/landing/landing-page.tsx`: unused previous landing composition.
- Delete `src/components/landing/hero-diagnosis-visual.tsx`: visual used only by the previous landing.
- Delete `src/components/landing/diagnosis-showcase.tsx`: showcase used only by the previous landing.
- Delete `src/components/landing/diagnosis-showcase.test.tsx`: exclusive test for the removed showcase.
- Delete `src/components/landing/landing-data.ts`: data imported only by removed components.

---

### Task 1: Lock the new hero contract with a failing page test

**Files:**
- Modify: `src/app/page.test.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: asynchronous `Home(): Promise<ReactElement>` and the existing `renderHome()` test helper.
- Produces: a DOM contract for `#top`, the hero `h1`, `/register` primary CTA, `#como-funciona` secondary CTA, reassurance text, dashboard image alternative text, and an unchanged downstream section.

- [ ] **Step 1: Replace the broad introduction assertion with the new hero contract**

Keep the existing pricing-service assertion and add scoped hero assertions so duplicate text elsewhere cannot satisfy the test:

```tsx
it("presents the profitability diagnosis and its next actions", async () => {
  await renderHome();

  const hero = document.querySelector("#top");
  expect(hero).not.toBeNull();

  const view = within(hero as HTMLElement);
  expect(
    view.getByRole("heading", {
      level: 1,
      name: /Você sabe se o preço que cobra realmente dá lucro\?/,
    }),
  ).toBeInTheDocument();
  expect(
    view.getByRole("link", { name: /Fazer diagnóstico gratuito/i }),
  ).toHaveAttribute("href", "/register");
  expect(
    view.getByRole("link", { name: /Conhecer o Lucrivo/i }),
  ).toHaveAttribute("href", "#como-funciona");
  expect(
    view.getByRole("img", {
      name: "Painel ilustrativo do Lucrivo com indicadores financeiros.",
    }),
  ).toBeInTheDocument();
  expect(view.getByText("Em poucos minutos")).toBeInTheDocument();
  expect(view.getByText("Sem cartão de crédito")).toBeInTheDocument();
  expect(view.getByText("Saiba o que revisar primeiro")).toBeInTheDocument();
  expect(listActivePrices).toHaveBeenCalledWith({ supabase });
});
```

- [ ] **Step 2: Add an explicit regression assertion for untouched downstream content**

Add a focused test proving the hero extraction did not replace the rest of the active landing:

```tsx
it("keeps the existing landing content after the hero", async () => {
  await renderHome();

  expect(
    screen.getByRole("heading", {
      name: "Seus números viram uma resposta. Você entende o caminho.",
    }),
  ).toBeInTheDocument();
  expect(document.querySelector("#recursos")).not.toBeNull();
  expect(document.querySelector("#planos")).not.toBeNull();
  expect(document.querySelector("#diagnostico")).not.toBeNull();
});
```

- [ ] **Step 3: Run the targeted test and confirm it fails for the new contract**

Run:

```bash
pnpm vitest run src/app/page.test.tsx
```

Expected: FAIL because the current hero has no dashboard image, uses `#diagnostico` for its primary action, and does not contain the new reassurance copy.

- [ ] **Step 4: Commit the red test**

```bash
git add src/app/page.test.tsx
git commit -m "test: define redesigned landing hero contract"
```

---

### Task 2: Build and integrate the responsive hero

**Files:**
- Create: `src/components/landing/hero-section.tsx`
- Modify: `src/components/landing/landing-experience.tsx`
- Modify: `src/components/landing/landing-experience.css`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `src/public/lp/hero-image.png`, `next/image`, and Phosphor icon components.
- Produces: `export function HeroSection(): ReactElement`, rendered by `LandingExperience` directly after the unchanged navigation.

- [ ] **Step 1: Create the presentational hero component**

Create `src/components/landing/hero-section.tsx` with this semantic structure and exact user-facing contract:

```tsx
import Image from "next/image";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChartBarIcon,
  FactoryIcon,
  LightningIcon,
  LockKeyIcon,
  PlayCircleIcon,
  StorefrontIcon,
  TrendUpIcon,
} from "@phosphor-icons/react";

import heroImage from "@/public/lp/hero-image.png";

const trustItems = [
  {
    title: "Rápido e prático",
    description: "Em poucos minutos",
    icon: LightningIcon,
  },
  {
    title: "Sem cartão de crédito",
    description: "Comece sem compromisso",
    icon: LockKeyIcon,
  },
  {
    title: "Orientação objetiva",
    description: "Saiba o que revisar primeiro",
    icon: TrendUpIcon,
  },
] as const;

const businessContexts = [
  { label: "Revenda", icon: StorefrontIcon },
  { label: "Produção própria", icon: FactoryIcon },
  { label: "Prestação de serviço", icon: BriefcaseIcon },
] as const;

function HeroSection() {
  return (
    <section id="top" className="hero-section" aria-labelledby="hero-title">
      <div className="hero-ambient" aria-hidden="true" />

      <div className="hero-layout">
        <div className="hero-copy">
          <p className="hero-kicker hero-copy-reveal">
            <ChartBarIcon aria-hidden="true" size={16} weight="fill" />
            Diagnóstico de preço e rentabilidade
          </p>

          <h1 id="hero-title" className="hero-copy-reveal">
            <span>Você sabe se o preço</span>
            <span>que cobra <em>realmente</em></span>
            <span><em>dá lucro?</em></span>
          </h1>

          <p className="hero-description hero-copy-reveal">
            Seu preço pode parecer certo e ainda estar fazendo você perder
            dinheiro. Descubra se ele faz sentido para a realidade do seu
            negócio com uma análise objetiva e completa.
          </p>

          <div className="hero-actions hero-copy-reveal">
            <a className="button button-primary" href="/register">
              Fazer diagnóstico gratuito
              <ArrowRightIcon aria-hidden="true" size={18} weight="bold" />
            </a>
            <a className="button button-secondary" href="#como-funciona">
              <PlayCircleIcon aria-hidden="true" size={19} weight="bold" />
              Conhecer o Lucrivo
            </a>
          </div>

          <ul className="hero-trust hero-copy-reveal" aria-label="Vantagens do diagnóstico">
            {trustItems.map(({ title, description, icon: Icon }) => (
              <li key={title}>
                <span className="hero-trust-icon" aria-hidden="true">
                  <Icon size={22} weight="fill" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="hero-visual hero-visual-reveal">
          <Image
            src={heroImage}
            alt="Painel ilustrativo do Lucrivo com indicadores financeiros."
            priority
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 86vw, 58vw"
            className="hero-dashboard-image"
          />
        </figure>
      </div>

      <div className="hero-contexts hero-copy-reveal">
        <div className="hero-contexts-label">
          <span aria-hidden="true" />
          <p>Feito para a realidade de quem empreende</p>
          <span aria-hidden="true" />
        </div>
        <ul>
          {businessContexts.map(({ label, icon: Icon }) => (
            <li key={label}>
              <Icon aria-hidden="true" size={24} weight="duotone" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export { HeroSection };
```

Before committing, format the long `ul` line using Prettier rather than manually preserving it.

- [ ] **Step 2: Replace only the inline hero in `LandingExperience`**

Import the new component:

```tsx
import { HeroSection } from "@/components/landing/hero-section";
```

Remove `ArrowDownIcon` from the existing Phosphor import because the removed
hero is its only consumer. Keep `Image`, `ArrowRightIcon`, and every other
import used by later sections. Replace the complete inline block beginning
with `<section id="top" className="hero-section">` and ending at its matching
`</section>` with:

```tsx
<HeroSection />
```

Do not edit the `<nav className="nav-wrap">` block or the following
`<section id="como-funciona">` block.

- [ ] **Step 3: Update the existing GSAP hero entrance to two purposeful events**

Replace the current `gsap.from(".hero-reveal", ...)` call with one timeline:

```tsx
gsap
  .timeline()
  .from(".hero-copy-reveal", {
    y: 28,
    opacity: 0,
    duration: 0.78,
    stagger: 0.08,
    ease: "power3.out",
  })
  .from(
    ".hero-visual-reveal",
    {
      x: 44,
      y: 18,
      scale: 0.96,
      rotate: 1.5,
      opacity: 0,
      duration: 1.05,
      ease: "power3.out",
    },
    "-=0.52",
  );
```

Keep the existing early return for `prefers-reduced-motion: reduce`, the
word-reveal behavior, and downstream `ScrollTrigger` behavior unchanged.

- [ ] **Step 4: Replace desktop hero styling without touching navigation or later sections**

In `landing-experience.css`, replace the current hero block from
`.landing-experience .hero-section` through `.landing-experience .hero-scroll`
with rules implementing these exact responsibilities:

```css
.landing-experience .hero-section {
  position: relative;
  display: grid;
  min-height: 100svh;
  padding: 132px max(5vw, 24px) 28px;
  overflow: hidden;
  grid-template-rows: minmax(0, 1fr) auto;
  background:
    radial-gradient(circle at 76% 42%, oklch(0.59 0.2 250 / 0.18), transparent 30%),
    radial-gradient(circle at 12% 76%, oklch(0.52 0.2 259 / 0.08), transparent 30%),
    var(--ink);
}

.landing-experience .hero-section::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  opacity: 0.1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.3'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

.landing-experience .hero-ambient {
  position: absolute;
  top: 18%;
  right: -16%;
  width: min(64vw, 980px);
  aspect-ratio: 1;
  border: 1px solid oklch(0.67 0.2 255 / 0.08);
  border-radius: 50%;
  box-shadow: inset 0 0 120px oklch(0.59 0.2 250 / 0.05);
}

.landing-experience .hero-layout {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(100%, 1540px);
  margin: 0 auto;
  align-items: center;
  grid-template-columns: minmax(430px, 0.9fr) minmax(540px, 1.1fr);
  gap: clamp(24px, 3vw, 64px);
}

.landing-experience .hero-copy {
  position: relative;
  z-index: 3;
  width: 100%;
  max-width: 720px;
}

.landing-experience .hero-kicker {
  display: inline-flex;
  min-height: 38px;
  margin: 0 0 26px;
  padding: 0 16px;
  align-items: center;
  gap: 10px;
  border: 1px solid oklch(0.67 0.2 255 / 0.28);
  border-radius: 999px;
  background: oklch(0.17 0.05 255 / 0.72);
  color: var(--landing-info);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.landing-experience .hero-copy h1 {
  margin: 0;
  font-size: clamp(3.25rem, 5.35vw, 6.15rem);
  font-weight: 610;
  line-height: 0.95;
  letter-spacing: -0.065em;
}

.landing-experience .hero-copy h1 span {
  display: block;
}

.landing-experience .hero-copy h1 em {
  color: oklch(0.72 0.2 244);
  font-family: inherit;
  font-style: normal;
  font-weight: inherit;
}

.landing-experience .hero-description {
  max-width: 590px;
  margin: 28px 0 0;
  color: oklch(0.88 0.035 255 / 0.76);
  font-size: clamp(1rem, 1.2vw, 1.18rem);
  line-height: 1.58;
}

.landing-experience .hero-actions {
  display: flex;
  margin-top: 30px;
  gap: 12px;
}

.landing-experience .hero-trust {
  display: grid;
  margin: 30px 0 0;
  padding: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  list-style: none;
}

.landing-experience .hero-trust li {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.landing-experience .hero-trust-icon {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  color: oklch(0.68 0.2 250);
}

.landing-experience .hero-trust strong,
.landing-experience .hero-trust small {
  display: block;
}

.landing-experience .hero-trust strong {
  color: oklch(0.96 0.012 255);
  font-size: 0.76rem;
  line-height: 1.3;
}

.landing-experience .hero-trust small {
  margin-top: 3px;
  color: oklch(0.82 0.035 255 / 0.62);
  font-size: 0.66rem;
  line-height: 1.35;
}

.landing-experience .hero-visual {
  position: relative;
  z-index: 2;
  width: min(61vw, 880px);
  margin: 2vh -9vw 0 -3vw;
}

.landing-experience .hero-dashboard-image {
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 36px 58px oklch(0.03 0.04 258 / 0.48));
}

.landing-experience .hero-contexts {
  position: relative;
  z-index: 3;
  width: min(100%, 1180px);
  margin: 8px auto 0;
}

.landing-experience .hero-contexts-label {
  display: grid;
  align-items: center;
  grid-template-columns: 1fr auto 1fr;
  gap: 18px;
}

.landing-experience .hero-contexts-label span {
  height: 1px;
  background: oklch(0.84 0.03 255 / 0.16);
}

.landing-experience .hero-contexts-label p {
  margin: 0;
  color: oklch(0.82 0.035 255 / 0.56);
  font-size: 0.66rem;
  font-weight: 650;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-experience .hero-contexts ul {
  display: flex;
  margin: 20px 0 0;
  padding: 0;
  justify-content: center;
  gap: clamp(40px, 8vw, 110px);
  list-style: none;
}

.landing-experience .hero-contexts li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: oklch(0.84 0.035 255 / 0.64);
  font-size: 0.76rem;
}

.landing-experience .hero-contexts svg {
  color: oklch(0.76 0.08 255 / 0.78);
}
```

Retain the existing shared `.button`, `.button-primary`, and
`.button-secondary` rules, but add a visible focus rule next to their hover
rules:

```css
.landing-experience .button:focus-visible {
  outline: 3px solid oklch(0.72 0.2 244 / 0.48);
  outline-offset: 3px;
}
```

- [ ] **Step 5: Replace only hero rules inside the existing tablet breakpoint**

Inside `@media (max-width: 980px)`, remove the old `.hero-product` rule and
replace the old hero rule with:

```css
.landing-experience .hero-section {
  min-height: auto;
  padding-top: 144px;
}

.landing-experience .hero-layout {
  grid-template-columns: 1fr;
  gap: 44px;
}

.landing-experience .hero-copy {
  max-width: 760px;
}

.landing-experience .hero-visual {
  width: min(92vw, 820px);
  margin: -24px auto -16px;
}

.landing-experience .hero-contexts {
  margin-top: 24px;
}
```

- [ ] **Step 6: Replace only hero rules inside the existing mobile breakpoint**

Inside `@media (max-width: 720px)`, delete obsolete `.hero-product`,
`.product-focus`, `.product-row`, and `.hero-scroll` rules. Replace the active
hero rules with:

```css
.landing-experience .hero-section {
  display: block;
  min-height: auto;
  padding: 112px 20px 72px;
}

.landing-experience .hero-layout {
  display: flex;
  flex-direction: column;
  gap: 38px;
}

.landing-experience .hero-kicker {
  min-height: 34px;
  margin-bottom: 22px;
  padding: 0 12px;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
}

.landing-experience .hero-copy h1 {
  font-size: clamp(2.65rem, 13.2vw, 4.2rem);
  line-height: 0.97;
}

.landing-experience .hero-copy h1 span {
  display: inline;
}

.landing-experience .hero-copy h1 span::after {
  content: " ";
}

.landing-experience .hero-description {
  margin-top: 24px;
  font-size: 1rem;
}

.landing-experience .hero-actions {
  width: 100%;
  margin-top: 28px;
  align-items: stretch;
  flex-direction: column;
}

.landing-experience .hero-actions .button {
  width: 100%;
  min-height: 52px;
}

.landing-experience .hero-trust {
  margin-top: 28px;
  grid-template-columns: 1fr;
  gap: 10px;
}

.landing-experience .hero-trust-icon {
  width: 34px;
  height: 34px;
}

.landing-experience .hero-visual {
  width: calc(100% + 36px);
  max-width: 660px;
  margin: -12px -18px -18px;
}

.landing-experience .hero-ambient,
.landing-experience .hero-contexts {
  display: none;
}
```

Keep the existing global landing `prefers-reduced-motion` media query. Add
`transform: none !important` for `.button` in that query only if the browser
still applies a hover transform during manual reduced-motion verification.

- [ ] **Step 7: Format the changed source files**

Run:

```bash
pnpm prettier --write src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
```

Expected: four files formatted without errors.

- [ ] **Step 8: Run the focused page test**

Run:

```bash
pnpm vitest run src/app/page.test.tsx
```

Expected: PASS for the new hero contract and all existing landing behavior.

- [ ] **Step 9: Run type checking and linting on the implementation**

Run:

```bash
pnpm typecheck
pnpm eslint src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/app/page.test.tsx
```

Expected: both commands exit successfully with no missing icon export, JSX,
image, or accessibility lint errors.

- [ ] **Step 10: Commit the integrated hero**

```bash
git add src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx src/public/lp/hero-image.png
git commit -m "feat: redesign landing hero"
```

---

### Task 3: Remove the legacy landing tree and perform bounded final verification

**Files:**
- Delete: `src/components/landing/landing-page.tsx`
- Delete: `src/components/landing/hero-diagnosis-visual.tsx`
- Delete: `src/components/landing/diagnosis-showcase.tsx`
- Delete: `src/components/landing/diagnosis-showcase.test.tsx`
- Delete: `src/components/landing/landing-data.ts`
- Verify: `src/components/landing/hero-section.tsx`
- Verify: `src/components/landing/landing-experience.tsx`
- Verify: `src/components/landing/landing-experience.css`
- Verify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: active imports discovered with `rg` and the completed `HeroSection` integration.
- Produces: one active landing implementation with no source reference to the deleted legacy tree.

- [ ] **Step 1: Verify the legacy files are disconnected before deletion**

Run:

```bash
rg -n "LandingPage|landing-page|HeroDiagnosisVisual|hero-diagnosis-visual|DiagnosisShowcase|diagnosis-showcase|landing-data" src
```

Expected: matches are confined to the five files scheduled for deletion and
the showcase's exclusive test. Stop if an active app route or another feature
imports one of them.

- [ ] **Step 2: Delete the unused legacy files with an explicit patch**

Delete exactly these files and no documentation:

```text
src/components/landing/landing-page.tsx
src/components/landing/hero-diagnosis-visual.tsx
src/components/landing/diagnosis-showcase.tsx
src/components/landing/diagnosis-showcase.test.tsx
src/components/landing/landing-data.ts
```

- [ ] **Step 3: Prove source references are gone**

Run:

```bash
rg -n "LandingPage|landing-page|HeroDiagnosisVisual|hero-diagnosis-visual|DiagnosisShowcase|diagnosis-showcase|landing-data" src
```

Expected: exit code 1 with no matches.

- [ ] **Step 4: Run the complete automated validation**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: all commands exit successfully.

- [ ] **Step 5: Run the required Impeccable detector once**

Run after all UI edits are complete:

```bash
node /home/pereira/projetos/Lucrivo/.agents/skills/impeccable/scripts/detect.mjs --json src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
```

Expected: no unresolved high-severity findings. Address findings in one batch
without altering the header or downstream sections.

- [ ] **Step 6: Perform the first and only planned visual inspection pass**

Start the app with `pnpm dev`, then capture the landing page together at:

```text
Desktop: 1440 x 900
Mobile: 390 x 844
```

Compare both captures in one review against the approved reference and verify:

- header markup and visual behavior remain unchanged;
- desktop keeps copy left and the transparent dashboard artwork right;
- mobile has no horizontal scroll and maintains readable CTA and image sizing;
- the hero transitions cleanly into the unchanged `#como-funciona` section;
- focus-visible states remain legible;
- reduced motion presents final content without entrance animation.

If defects are visible, fix all discovered hero defects in one batch, rerun the
focused test and detector only where changed, then perform at most one combined
desktop/mobile confirmation pass.

- [ ] **Step 7: Commit legacy removal and final corrections**

```bash
git add src/components/landing src/app/page.test.tsx
git commit -m "refactor: remove legacy landing components"
```
