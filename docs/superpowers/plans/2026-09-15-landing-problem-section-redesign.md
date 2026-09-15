# Landing Problem Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current second landing section and statement section with the approved problem-led asymmetric bento, while moving the business-context strip out of the hero and preserving the user's current hero and navbar work.

**Architecture:** Add a presentational `ProblemSection` that owns the audience bridge, six pricing-factor articles, decorative microvisuals, and the conclusion panel. `LandingExperience` keeps page state and GSAP lifecycle, imports the new section, and removes only the two superseded sections; `HeroSection` loses only the context strip that moves into the new component. Styling remains scoped under `.landing-experience` in the existing stylesheet, with obsolete second-section selectors deleted after the replacement is complete.

**Tech Stack:** Next.js 16, React 19, TypeScript, Phosphor Icons, GSAP 3 with ScrollTrigger and `@gsap/react`, CSS Grid, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-15-landing-problem-section-redesign.md`

## Global Constraints

- Treat commit `80c069b` and the current working tree as the source of truth for the hero; do not restore earlier hero copy or styles.
- Do not change header/navbar markup, styling, labels, anchors, or interaction.
- Keep `id="como-funciona"` on the new second-section boundary so existing links continue to resolve.
- Preserve every section from `#recursos` onward without content or behavior changes.
- Use the exact approved Brazilian Portuguese copy from the spec; responsive line breaks may change, wording may not.
- Do not imply competitor research, a universal market price, guaranteed profit, or guaranteed growth.
- The factor regions are semantic articles, never buttons or links; decorative graphics are `aria-hidden`.
- Do not add packages, remote images, stock photography, generated imagery, or live calculations.
- Support keyboard users, WCAG AA contrast, `prefers-reduced-motion`, and zero horizontal overflow at 320, 375, and 414 pixels.
- Before editing UI, read `.agents/skills/impeccable/reference/craft-floor.md` and apply its quality floor.
- Run the Impeccable detector once after UI edits; do not repeatedly rerun it during polish.
- Perform one combined desktop/tablet/mobile visual inspection, one correction batch, and at most one confirmation pass.

## File Map

- Create `src/components/landing/problem-section.tsx`: audience bridge, approved copy, factor data, semantic bento markup, decorative microvisual markup, and conclusion.
- Modify `src/components/landing/hero-section.tsx`: remove only the business-context imports, data, and rendered strip that move to `ProblemSection`.
- Modify `src/components/landing/landing-experience.tsx`: import/render `ProblemSection`, remove the superseded sections, remove the obsolete word-reveal animation, and add the scoped problem-section reveal.
- Modify `src/components/landing/landing-experience.css`: add the bridge/bento/responsive visual system, then remove obsolete second-section and statement styles.
- Modify `src/app/page.test.tsx`: align the hero assertions with the user's current copy and define the new second-section contract.

---

### Task 1: Define the current hero and new problem-section contracts

**Files:**

- Modify: `src/app/page.test.tsx:69-149`

**Interfaces:**

- Consumes: the current `Home` server component and its rendered `LandingExperience`.
- Produces: a DOM contract for `#como-funciona`, the six factor headings/descriptions, the audience bridge, conclusion copy, and unchanged downstream section IDs.

- [ ] **Step 1: Update the stale hero reassurance assertions**

Replace the three assertions at the end of the first test with the copy currently present in `hero-section.tsx`:

```tsx
expect(view.getByText("Sem cartão para começar")).toBeInTheDocument();
expect(view.getByText("Sem planilhas")).toBeInTheDocument();
expect(view.getByText("Sem falar contabilês")).toBeInTheDocument();
expect(listActivePrices).toHaveBeenCalledWith({ supabase });
```

This resolves the known stale test expectation without changing the user's hero.

- [ ] **Step 2: Replace the superseded second-section tests with the approved contract**

Replace the tests named `keeps the existing landing content after the hero`, `explains every part considered when pricing`, and `shows the financial references produced by the diagnosis` with:

```tsx
it("introduces every factor that shapes a viable price", async () => {
  await renderHome();

  const problem = document.querySelector("#como-funciona");
  expect(problem).not.toBeNull();

  const view = within(problem as HTMLElement);
  expect(
    view.getByRole("heading", {
      level: 2,
      name: "Preço não é só colocar um número.",
    }),
  ).toBeInTheDocument();
  expect(view.getByText("O problema")).toBeInTheDocument();
  expect(
    view.getByText(/Estes são os pontos que costumam mudar tudo/),
  ).toBeInTheDocument();

  const factors = [
    ["Custos", "Tudo que sai para o produto ou serviço existir."],
    ["Impostos", "A fatia que vai embora em cada venda."],
    ["Taxas", "Cartão, app, marketplace — descontam sem avisar."],
    ["Tempo", "Seu trabalho e suas horas também têm valor."],
    ["Estrutura", "Aluguel, luz, sistema: o custo de manter tudo de pé."],
    ["O quanto você quer ganhar", "O preço tem que caber o seu lucro também."],
  ] as const;

  for (const [title, description] of factors) {
    expect(
      view.getByRole("heading", { level: 3, name: title }),
    ).toBeInTheDocument();
    expect(view.getByText(description)).toBeInTheDocument();
  }
});

it("uses the business contexts as a bridge into the pricing problem", async () => {
  await renderHome();

  const problem = document.querySelector("#como-funciona");
  const view = within(problem as HTMLElement);

  expect(
    view.getByText("Feito para a realidade de quem empreende"),
  ).toBeInTheDocument();
  expect(
    view.getByText("Antes de mudar seu preço, descubra se a conta fecha."),
  ).toBeInTheDocument();

  for (const context of [
    "Revenda",
    "Produção própria",
    "Prestação de serviço",
  ]) {
    expect(view.getByText(context)).toBeInTheDocument();
  }
});

it("closes the problem section with the approved outcome message", async () => {
  await renderHome();

  const problem = document.querySelector("#como-funciona");
  const view = within(problem as HTMLElement);

  expect(
    view.getByText(
      "Quando você considera todos os pontos, o preço trabalha a seu favor.",
    ),
  ).toBeInTheDocument();
  expect(view.getByText("Preço certo abre caminhos.")).toBeInTheDocument();
  expect(
    view.getByText("E a Lucrivo te ajuda a chegar lá."),
  ).toBeInTheDocument();
});

it("keeps the later landing chapters mounted", async () => {
  await renderHome();

  expect(document.querySelector("#recursos")).not.toBeNull();
  expect(document.querySelector("#planos")).not.toBeNull();
  expect(document.querySelector("#diagnostico")).not.toBeNull();
});
```

Keep the existing `covers all supported business contexts` test because it also guards the later `#recursos` heading.

- [ ] **Step 3: Run the focused test and verify the new contract fails for the right reason**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: FAIL because `#como-funciona` still contains “Seus números viram uma resposta” and does not yet contain “Preço não é só colocar um número.” The revised hero reassurance assertions should pass.

- [ ] **Step 4: Commit the failing contract**

```bash
git add src/app/page.test.tsx
git commit -m "test: define landing problem section contract"
```

---

### Task 2: Build and integrate the semantic problem section

**Files:**

- Create: `src/components/landing/problem-section.tsx`
- Modify: `src/components/landing/hero-section.tsx:3-13,35-39,121-139`
- Modify: `src/components/landing/landing-experience.tsx:16-18,219-288`
- Test: `src/app/page.test.tsx`

**Interfaces:**

- Consumes: existing `.landing-experience` color tokens, Phosphor icon components, `HeroSection`, and the `#como-funciona` anchor contract.
- Produces: named export `ProblemSection(): JSX.Element`; stable selectors `.problem-section`, `.problem-bridge`, `.problem-reveal`, `.problem-card`, `.problem-visual`, and `.problem-conclusion` for Task 3.

- [ ] **Step 1: Read the UI craft floor before editing**

Run:

```bash
sed -n '1,320p' .agents/skills/impeccable/reference/craft-floor.md
```

Apply its bans and accessibility requirements to the implementation below.

- [ ] **Step 2: Create the factor data and decorative visual helper**

Create `src/components/landing/problem-section.tsx` with these imports and constants:

```tsx
import {
  BriefcaseIcon,
  BuildingsIcon,
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  FactoryIcon,
  HandCoinsIcon,
  ReceiptIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";

const businessContexts = [
  { label: "Revenda", icon: StorefrontIcon },
  { label: "Produção própria", icon: FactoryIcon },
  { label: "Prestação de serviço", icon: BriefcaseIcon },
] as const;

const pricingFactors = [
  {
    slug: "costs",
    title: "Custos",
    description: "Tudo que sai para o produto ou serviço existir.",
    closing: "Na ponta do lápis",
    tone: "ink",
    icon: CoinsIcon,
  },
  {
    slug: "taxes",
    title: "Impostos",
    description: "A fatia que vai embora em cada venda.",
    closing: "Menos surpresas",
    tone: "blue",
    icon: ReceiptIcon,
  },
  {
    slug: "fees",
    title: "Taxas",
    description: "Cartão, app, marketplace — descontam sem avisar.",
    closing: "Fique no controle",
    tone: "paper",
    icon: CreditCardIcon,
  },
  {
    slug: "time",
    title: "Tempo",
    description: "Seu trabalho e suas horas também têm valor.",
    closing: "Valorize o seu tempo",
    tone: "navy",
    icon: ClockIcon,
  },
  {
    slug: "structure",
    title: "Estrutura",
    description: "Aluguel, luz, sistema: o custo de manter tudo de pé.",
    closing: "Conta o ano todo",
    tone: "paper",
    icon: BuildingsIcon,
  },
  {
    slug: "earnings",
    title: "O quanto você quer ganhar",
    description: "O preço tem que caber o seu lucro também.",
    closing: "Crescimento de verdade",
    tone: "blue",
    icon: HandCoinsIcon,
  },
] as const;

type FactorSlug = (typeof pricingFactors)[number]["slug"];

function FactorVisual({ slug }: { slug: FactorSlug }) {
  if (slug === "costs") {
    return (
      <div className="problem-visual problem-visual-costs" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (slug === "taxes") {
    return (
      <div className="problem-visual problem-visual-taxes" aria-hidden="true">
        <span />
        <i />
      </div>
    );
  }

  if (slug === "fees") {
    return (
      <div className="problem-visual problem-visual-fees" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (slug === "time") {
    return (
      <div className="problem-visual problem-visual-time" aria-hidden="true">
        <span />
        <i />
      </div>
    );
  }

  if (slug === "structure") {
    return (
      <div
        className="problem-visual problem-visual-structure"
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="problem-visual problem-visual-earnings" aria-hidden="true">
      <span />
      <i />
    </div>
  );
}
```

Use `<i>` only as a styling hook inside `aria-hidden` graphics; do not attach text or behavior to it.

- [ ] **Step 3: Add the bridge, semantic articles, and conclusion markup**

Complete the same file with:

```tsx
function ProblemSection() {
  return (
    <section
      id="como-funciona"
      className="problem-section"
      aria-labelledby="problem-title"
    >
      <div className="problem-bridge problem-reveal">
        <div className="problem-contexts">
          <div className="problem-contexts-label">
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

        <p className="problem-bridge-statement">
          Antes de mudar seu preço, descubra se a conta fecha.
        </p>
      </div>

      <div className="problem-content chapter">
        <header className="problem-heading problem-reveal">
          <p className="eyebrow">O problema</p>
          <h2 id="problem-title">Preço não é só colocar um número.</h2>
          <p>
            O preço precisa fazer sentido para a realidade do seu negócio. Estes
            são os pontos que costumam mudar tudo — e que quase ninguém coloca
            na conta.
          </p>
        </header>

        <div className="problem-bento">
          {pricingFactors.map(
            (
              { slug, title, description, closing, tone, icon: Icon },
              index,
            ) => (
              <article
                className={`problem-card problem-card-${slug} problem-card-${tone}`}
                key={slug}
              >
                <div className="problem-card-meta">
                  <span className="problem-card-icon" aria-hidden="true">
                    <Icon size={30} weight="duotone" />
                  </span>
                  <span className="problem-card-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="problem-card-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>

                <FactorVisual slug={slug} />
                <p className="problem-card-closing">{closing}</p>
              </article>
            ),
          )}

          <div className="problem-conclusion">
            <div className="problem-conclusion-primary">
              <p className="problem-conclusion-label">Preço com inteligência</p>
              <h3>
                Quando você considera todos os pontos, o preço trabalha a seu
                favor.
              </h3>
              <p>
                Mais margem, mais previsibilidade e um negócio que cresce de
                forma saudável.
              </p>
            </div>

            <div className="problem-conclusion-secondary">
              <div className="problem-conclusion-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <p className="problem-conclusion-label">Do caos ao controle</p>
                <h3>Preço certo abre caminhos.</h3>
                <p>E a Lucrivo te ajuda a chegar lá.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { ProblemSection };
```

- [ ] **Step 4: Move the context strip out of the hero without reverting other hero work**

In `hero-section.tsx`:

- remove `BriefcaseIcon`, `FactoryIcon`, and `StorefrontIcon` from the icon imports;
- remove the `businessContexts` constant;
- remove only the `.hero-contexts` block after `.hero-layout`;
- leave `trustItems`, copy, dashboard motion wrapper, image props, and all other hero markup unchanged.

After the edit, the end of `HeroSection` must be:

```tsx
        </figure>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Replace the two superseded inline sections**

Add the import in `landing-experience.tsx`:

```tsx
import { ProblemSection } from "@/components/landing/problem-section";
```

Replace everything from the opening `<section id="como-funciona" ...>` through the closing `</section>` of `.statement-section` with:

```tsx
<ProblemSection />
```

Do not change the navigation above it or `#recursos` and later markup below it.

- [ ] **Step 6: Run the focused page contract**

Run:

```bash
pnpm test -- src/app/page.test.tsx
```

Expected: PASS for all page tests. Styling is intentionally incomplete at this checkpoint; semantic structure and exact copy are the deliverable.

- [ ] **Step 7: Run type checking before styling**

Run:

```bash
pnpm typecheck
```

Expected: PASS with all Phosphor icon imports and `FactorSlug` inference valid.

- [ ] **Step 8: Commit the semantic component**

```bash
git add src/components/landing/problem-section.tsx src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx
git commit -m "feat: add landing problem section"
```

---

### Task 3: Compose the asymmetric bento and add restrained motion

**Files:**

- Modify: `src/components/landing/landing-experience.css:125-700,1160-1485`
- Modify: `src/components/landing/landing-experience.tsx:85-157`
- Verify: `src/components/landing/problem-section.tsx`

**Interfaces:**

- Consumes: selectors emitted by `ProblemSection` and the existing GSAP scope rooted at `.landing-experience`.
- Produces: desktop 12-column mosaic, two-column tablet layout, one-column mobile layout, and one reduced-motion-safe scroll entrance.

- [ ] **Step 1: Replace the hero-context strip styles with the transition bridge**

Remove the current `.hero-contexts`, `.hero-contexts-label`, and descendant rules. Add these base rules before the existing `.chapter` block:

```css
.landing-experience .problem-section {
  position: relative;
  background: var(--paper);
  color: var(--ink);
}

.landing-experience .problem-bridge {
  position: relative;
  padding: 36px max(5vw, 24px) 72px;
  overflow: hidden;
  background: var(--ink);
  color: oklch(0.955 0.012 255);
}

.landing-experience .problem-bridge::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  content: "";
  background: linear-gradient(
    90deg,
    transparent,
    oklch(0.67 0.2 255 / 0.5),
    transparent
  );
}

.landing-experience .problem-contexts {
  width: min(100%, 1180px);
  margin: 0 auto;
}

.landing-experience .problem-contexts-label {
  display: grid;
  align-items: center;
  grid-template-columns: 1fr auto 1fr;
  gap: 18px;
}

.landing-experience .problem-contexts-label span {
  height: 1px;
  background: oklch(0.84 0.03 255 / 0.16);
}

.landing-experience .problem-contexts-label p {
  margin: 0;
  color: oklch(0.82 0.035 255 / 0.66);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-experience .problem-contexts ul {
  display: flex;
  margin: 22px 0 0;
  padding: 0;
  justify-content: center;
  gap: clamp(40px, 8vw, 110px);
  list-style: none;
}

.landing-experience .problem-contexts li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: oklch(0.84 0.035 255 / 0.76);
  font-size: 0.78rem;
}

.landing-experience .problem-contexts svg {
  color: oklch(0.76 0.08 255 / 0.9);
}

.landing-experience .problem-bridge-statement {
  max-width: 820px;
  margin: 64px auto 0;
  font-size: clamp(2rem, 3.6vw, 4rem);
  font-weight: 540;
  line-height: 1.02;
  letter-spacing: -0.045em;
  text-align: center;
  text-wrap: balance;
}
```

- [ ] **Step 2: Add the centered introduction and continuous 12-column grid**

Add after the bridge rules:

```css
.landing-experience .problem-content {
  padding-top: 150px;
}

.landing-experience .problem-heading {
  width: min(100%, 980px);
  margin: 0 auto 76px;
  text-align: center;
}

.landing-experience .problem-heading .eyebrow {
  margin-bottom: 20px;
  color: var(--landing-primary);
}

.landing-experience .problem-heading h2 {
  margin: 0;
  font-size: clamp(3rem, 6.2vw, 6.6rem);
  font-weight: 570;
  line-height: 0.92;
  letter-spacing: -0.068em;
  text-wrap: balance;
}

.landing-experience .problem-heading > p:last-child {
  max-width: 760px;
  margin: 30px auto 0;
  color: oklch(0.36 0.045 258 / 0.82);
  font-size: clamp(1rem, 1.5vw, 1.28rem);
  line-height: 1.58;
  text-wrap: balance;
}

.landing-experience .problem-bento {
  display: grid;
  width: min(100%, 1360px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 28px;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1px;
  background: oklch(0.3 0.045 258 / 0.18);
  box-shadow: 0 34px 90px oklch(0.12 0.03 258 / 0.09);
}

.landing-experience .problem-card,
.landing-experience .problem-conclusion {
  min-width: 0;
  background: var(--paper-bright);
}

.landing-experience .problem-card {
  position: relative;
  display: flex;
  min-height: 330px;
  padding: clamp(28px, 3.2vw, 48px);
  overflow: hidden;
  flex-direction: column;
}

.landing-experience .problem-card-costs {
  min-height: 390px;
  grid-column: span 7;
}

.landing-experience .problem-card-taxes {
  grid-column: span 5;
}

.landing-experience .problem-card-fees,
.landing-experience .problem-card-time,
.landing-experience .problem-card-structure {
  grid-column: span 4;
}

.landing-experience .problem-card-earnings {
  grid-column: span 5;
}

.landing-experience .problem-conclusion {
  display: grid;
  min-height: 360px;
  grid-column: span 7;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
}

.landing-experience .problem-card-ink,
.landing-experience .problem-card-navy {
  background: var(--ink);
  color: oklch(0.965 0.01 255);
}

.landing-experience .problem-card-navy {
  background: oklch(0.25 0.07 258);
}

.landing-experience .problem-card-blue {
  background: var(--landing-primary);
  color: var(--landing-primary-foreground);
}

.landing-experience .problem-card-paper {
  background: var(--paper-bright);
  color: var(--ink);
}
```

- [ ] **Step 3: Style card hierarchy and purpose-built microvisuals**

Add these selectors. Keep all graphics CSS-only and inside their card bounds:

```css
.landing-experience .problem-card-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.landing-experience .problem-card-icon {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 18px;
  opacity: 0.82;
}

.landing-experience .problem-card-index {
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  opacity: 0.58;
}

.landing-experience .problem-card-copy {
  position: relative;
  z-index: 2;
  max-width: 34rem;
  margin-top: 42px;
}

.landing-experience .problem-card h3,
.landing-experience .problem-conclusion h3 {
  margin: 0;
  font-size: clamp(1.9rem, 3vw, 3.25rem);
  font-weight: 560;
  line-height: 0.98;
  letter-spacing: -0.052em;
  text-wrap: balance;
}

.landing-experience .problem-card-copy p {
  max-width: 30rem;
  margin: 14px 0 0;
  font-size: clamp(1rem, 1.3vw, 1.18rem);
  line-height: 1.48;
  opacity: 0.7;
}

.landing-experience .problem-card-closing,
.landing-experience .problem-conclusion-label {
  position: relative;
  z-index: 2;
  margin: auto 0 0;
  padding-top: 42px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.68;
}

.landing-experience .problem-visual {
  position: absolute;
  right: clamp(24px, 3vw, 46px);
  bottom: clamp(52px, 5vw, 76px);
  pointer-events: none;
}

.landing-experience .problem-visual-costs {
  display: flex;
  width: min(48%, 430px);
  height: 112px;
  align-items: flex-end;
  gap: 8px;
}

.landing-experience .problem-visual-costs span {
  flex: 1;
  border-radius: 5px 5px 1px 1px;
  background: oklch(0.96 0.01 255 / 0.13);
  transform-origin: bottom;
}

.landing-experience .problem-visual-costs span:nth-child(1) {
  height: 34%;
}
.landing-experience .problem-visual-costs span:nth-child(2) {
  height: 52%;
}
.landing-experience .problem-visual-costs span:nth-child(3) {
  height: 72%;
}
.landing-experience .problem-visual-costs span:nth-child(4) {
  height: 92%;
  background: var(--landing-primary-bright);
}

.landing-experience .problem-visual-taxes {
  width: 132px;
  aspect-ratio: 1;
  border: 18px solid oklch(0.98 0.01 255 / 0.2);
  border-radius: 50%;
}

.landing-experience .problem-visual-taxes span {
  position: absolute;
  inset: -18px;
  border: 18px solid transparent;
  border-top-color: oklch(0.98 0.01 255);
  border-radius: 50%;
  transform: rotate(28deg);
}

.landing-experience .problem-visual-fees {
  display: flex;
  width: 42%;
  gap: 8px;
}

.landing-experience .problem-visual-fees span {
  height: 7px;
  flex: 1;
  border-radius: 999px;
  background: oklch(0.25 0.06 258 / 0.16);
}

.landing-experience .problem-visual-fees span:last-child {
  background: var(--landing-primary);
}

.landing-experience .problem-visual-time {
  width: 96px;
  aspect-ratio: 1;
  border: 2px solid oklch(0.96 0.01 255 / 0.38);
  border-radius: 50%;
}

.landing-experience .problem-visual-time span,
.landing-experience .problem-visual-time i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  border-radius: 999px;
  background: var(--landing-primary-bright);
  transform-origin: 50% 100%;
}

.landing-experience .problem-visual-time span {
  height: 28px;
  transform: translate(-50%, -100%) rotate(32deg);
}

.landing-experience .problem-visual-time i {
  height: 20px;
  transform: translate(-50%, -100%) rotate(132deg);
}

.landing-experience .problem-visual-structure {
  display: flex;
  width: 44%;
  height: 88px;
  align-items: flex-end;
  gap: 8px;
}

.landing-experience .problem-visual-structure span {
  flex: 1;
  border: 1px solid oklch(0.25 0.06 258 / 0.18);
  background: oklch(0.25 0.06 258 / 0.08);
}

.landing-experience .problem-visual-structure span:nth-child(1) {
  height: 46%;
}
.landing-experience .problem-visual-structure span:nth-child(2) {
  height: 72%;
}
.landing-experience .problem-visual-structure span:nth-child(3) {
  height: 100%;
}

.landing-experience .problem-visual-earnings {
  width: 44%;
  height: 8px;
  border-radius: 999px;
  background: oklch(0.98 0.01 255 / 0.24);
}

.landing-experience .problem-visual-earnings span {
  display: block;
  width: 72%;
  height: 100%;
  border-radius: inherit;
  background: oklch(0.98 0.01 255);
}

.landing-experience .problem-visual-earnings i {
  position: absolute;
  top: 50%;
  left: 72%;
  width: 22px;
  aspect-ratio: 1;
  border: 4px solid var(--landing-primary);
  border-radius: 50%;
  background: white;
  transform: translate(-50%, -50%);
}
```

Run Prettier after adding one-line nth-child rules; accept its multiline formatting.

- [ ] **Step 4: Style the two-part conclusion without creating another card grid**

```css
.landing-experience .problem-conclusion-primary,
.landing-experience .problem-conclusion-secondary {
  display: flex;
  min-width: 0;
  padding: clamp(28px, 3vw, 46px);
  flex-direction: column;
}

.landing-experience .problem-conclusion-primary {
  background: linear-gradient(
    135deg,
    var(--landing-primary),
    oklch(0.62 0.24 252)
  );
  color: white;
}

.landing-experience .problem-conclusion-secondary {
  justify-content: space-between;
  background: var(--ink);
  color: oklch(0.965 0.01 255);
}

.landing-experience .problem-conclusion-label {
  margin: 0 0 26px;
  padding: 0;
}

.landing-experience .problem-conclusion-primary > p:last-child,
.landing-experience
  .problem-conclusion-secondary
  > div:last-child
  > p:last-child {
  max-width: 30rem;
  margin: 20px 0 0;
  line-height: 1.5;
  opacity: 0.72;
}

.landing-experience .problem-conclusion-bars {
  display: flex;
  height: 92px;
  align-items: flex-end;
  gap: 8px;
}

.landing-experience .problem-conclusion-bars span {
  width: 16%;
  border-radius: 4px 4px 0 0;
  background: oklch(0.95 0.02 255 / 0.12);
  transform-origin: bottom;
}

.landing-experience .problem-conclusion-bars span:nth-child(1) {
  height: 26%;
}
.landing-experience .problem-conclusion-bars span:nth-child(2) {
  height: 44%;
}
.landing-experience .problem-conclusion-bars span:nth-child(3) {
  height: 66%;
}
.landing-experience .problem-conclusion-bars span:nth-child(4) {
  height: 92%;
  background: var(--landing-primary-bright);
}
```

- [ ] **Step 5: Add tablet and mobile recomposition**

Inside the existing `@media (max-width: 1100px)` block, add:

```css
.landing-experience .problem-card-costs,
.landing-experience .problem-card-taxes,
.landing-experience .problem-card-fees,
.landing-experience .problem-card-time,
.landing-experience .problem-card-structure,
.landing-experience .problem-card-earnings {
  grid-column: span 6;
}

.landing-experience .problem-conclusion {
  grid-column: span 12;
}
```

Inside `@media (max-width: 720px)`, add:

```css
.landing-experience .problem-bridge {
  padding: 34px 20px 64px;
}

.landing-experience .problem-contexts-label {
  grid-template-columns: 1fr;
  text-align: center;
}

.landing-experience .problem-contexts-label span {
  display: none;
}

.landing-experience .problem-contexts ul {
  margin-top: 26px;
  align-items: flex-start;
  flex-direction: column;
  gap: 14px;
}

.landing-experience .problem-bridge-statement {
  margin-top: 52px;
  font-size: clamp(2rem, 10vw, 3rem);
  text-align: left;
}

.landing-experience .problem-content {
  padding-top: 104px;
}

.landing-experience .problem-heading {
  margin-bottom: 48px;
  text-align: left;
}

.landing-experience .problem-heading h2 {
  font-size: clamp(2.8rem, 13vw, 4.4rem);
}

.landing-experience .problem-heading > p:last-child {
  margin-top: 24px;
}

.landing-experience .problem-bento {
  grid-template-columns: 1fr;
  border-radius: 22px;
}

.landing-experience .problem-card-costs,
.landing-experience .problem-card-taxes,
.landing-experience .problem-card-fees,
.landing-experience .problem-card-time,
.landing-experience .problem-card-structure,
.landing-experience .problem-card-earnings,
.landing-experience .problem-conclusion {
  min-height: 340px;
  grid-column: span 1;
}

.landing-experience .problem-card {
  padding: 28px;
}

.landing-experience .problem-card-copy {
  margin-top: 34px;
}

.landing-experience .problem-visual {
  right: 28px;
  bottom: 58px;
  max-width: 44%;
}

.landing-experience .problem-conclusion {
  grid-template-columns: 1fr;
}

.landing-experience .problem-conclusion-primary,
.landing-experience .problem-conclusion-secondary {
  min-height: 330px;
  padding: 28px;
}
```

The source order remains costs, taxes, fees, time, structure, earnings, and conclusion; do not use CSS `order` to change it.

- [ ] **Step 6: Replace the obsolete statement reveal with one scoped problem reveal**

In `landing-experience.tsx`, remove the complete `gsap.utils.toArray<HTMLElement>(".word-reveal")` loop. Add this timeline after the hero timeline and before the existing `.scroll-visual` loop:

```tsx
gsap
  .timeline({
    scrollTrigger: {
      trigger: ".problem-section",
      start: "top 76%",
      once: true,
    },
  })
  .from(".problem-reveal", {
    y: 18,
    opacity: 0,
    duration: 0.48,
    stagger: 0.08,
    ease: "power2.out",
  })
  .from(
    ".problem-card, .problem-conclusion",
    {
      y: 22,
      opacity: 0,
      duration: 0.52,
      stagger: 0.06,
      ease: "power2.out",
    },
    "-=0.2",
  )
  .from(
    ".problem-visual > *, .problem-conclusion-bars > *",
    {
      scaleY: 0.3,
      opacity: 0,
      duration: 0.38,
      stagger: 0.025,
      transformOrigin: "bottom",
      ease: "power2.out",
    },
    "-=0.42",
  );
```

The existing early return for `prefers-reduced-motion: reduce` must remain before every timeline so content stays in its final CSS state.

- [ ] **Step 7: Format and run targeted checks**

Run:

```bash
pnpm prettier --write src/components/landing/problem-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
pnpm test -- src/app/page.test.tsx
pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 8: Commit the composed section**

```bash
git add src/components/landing/problem-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
git commit -m "style: compose landing problem bento"
```

---

### Task 4: Remove obsolete styles and perform bounded final verification

**Files:**

- Modify: `src/components/landing/landing-experience.css`
- Verify: `src/components/landing/problem-section.tsx`
- Verify: `src/components/landing/hero-section.tsx`
- Verify: `src/components/landing/landing-experience.tsx`
- Verify: `src/app/page.test.tsx`

**Interfaces:**

- Consumes: the complete replacement section from Tasks 2-3.
- Produces: one active second-section implementation with no dormant old bento/statement CSS, validated at desktop, tablet, and mobile widths.

- [ ] **Step 1: Delete selectors that belonged only to the removed sections**

Remove these complete selector groups from `landing-experience.css`:

```text
.light-section (remove only this member; keep .pricing-section)
.diagnostic-bento
.bento-card and .bento-card:hover
.bento-wide
.bento-narrow
.bento-third
.bento-dark
.bento-lime
.bento-paper
.bento-green
.card-label
.bento-card h3
.margin-graph and descendants
.target-ring and descendants
.balance-line and descendants
.discount-control and descendants
.bento-image and descendants
.statement-section
.statement-copy
```

Also remove their tablet/mobile overrides:

```text
.bento-wide, .bento-narrow, .bento-third grid-column overrides
.diagnostic-bento mobile grid rule
.bento-card mobile sizing
.bento-image-copy mobile padding
.statement-section mobile sizing
.hero-contexts tablet/mobile rules
```

Do not remove `.section-heading`, `.eyebrow`, `.pricing-section`, or other shared selectors used later in the page.

- [ ] **Step 2: Prove that old implementation names are gone**

Run:

```bash
rg -n "diagnostic-bento|bento-(card|wide|narrow|third|dark|lime|paper|green|image)|margin-graph|target-ring|balance-line|discount-control|statement-section|statement-copy|word-reveal|hero-contexts" src/components/landing
```

Expected: no output.

- [ ] **Step 3: Run the Impeccable detector once**

Run:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/components/landing/problem-section.tsx src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
```

Expected: no new high-severity findings. Record any pre-existing findings separately and do not refactor unrelated later sections to silence them.

- [ ] **Step 4: Start the landing page and capture one combined visual review**

Start the app:

```bash
pnpm dev
```

Inspect `/` at all of these widths in one pass:

- 1440×1000: full 12-column composition, hero-to-bridge transition, shared bento outline, readable conclusion split.
- 1024×900: two-column factor layout and full-width conclusion.
- 390×844: visible bridge, logical single-column order, no clipped Portuguese copy, no false controls.
- 320×800: no horizontal overflow and no text below 16 pixels for body copy.

For each viewport, check `document.documentElement.scrollWidth === window.innerWidth`. Confirm that the navbar markup and behavior match the pre-change implementation and that the user's hero copy, trust items, image, and dashboard motion wrapper remain intact.

- [ ] **Step 5: Apply one correction batch and confirm once**

Correct every material issue found in Step 4 together. Permitted corrections are limited to problem-section spacing, type size, grid spans, contrast, graphic containment, and reveal timing. Do not alter the header/navbar, hero message, hero illustration, or later sections.

Recapture the same four viewports once. Stop after this confirmation pass; report any remaining nonmaterial difference rather than entering an open-ended polish loop.

- [ ] **Step 6: Run the complete verification sequence**

Run sequentially:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
git diff --check
git status --short
```

Expected:

- all tests pass;
- TypeScript reports no errors;
- ESLint reports no errors;
- Prettier reports all files formatted;
- `git diff --check` reports no whitespace errors;
- `git status --short` lists only the intended landing files before the final commit.

- [ ] **Step 7: Commit cleanup and verified corrections**

```bash
git add src/components/landing/problem-section.tsx src/components/landing/hero-section.tsx src/components/landing/landing-experience.tsx src/components/landing/landing-experience.css src/app/page.test.tsx
git commit -m "refactor: replace legacy landing problem content"
```

- [ ] **Step 8: Confirm the branch is clean**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: clean status and the three implementation commits visible after the approved spec and plan commits.
