# Landing Hero Redesign

**Date:** 2026-09-15
**Status:** Approved for implementation planning
**Surface:** Public landing page (`/`)
**Mode:** Persuade

## Objective

Replace the current landing-page hero with a professional, high-confidence
composition based on the approved visual reference. The hero must explain the
Lucrivo value proposition clearly to Brazilian micro and small business owners,
use the provided product illustration, and establish the visual direction for
the landing-page refactor without changing the existing header or any section
below the hero.

The implementation must also remove the unused previous landing-page component
tree and its exclusive tests.

## Product Message

The hero should answer one immediate question: does the price charged actually
leave a profit after the business costs are considered?

The copy must remain consistent with `PRODUCT.md`:

- Lucrivo provides a deterministic financial diagnosis based on data supplied
  by the user.
- It helps the user understand whether the price covers the operation and what
  should be reviewed first.
- It does not research competitors or claim to know the correct market price.
- The primary action is starting the free diagnosis.

Avoid unsupported claims such as customer counts, testimonials, market
leadership, or universal profit guarantees. Replace the reference image's
social-proof language with factual coverage of the business contexts served.

## Approved Visual Direction

The direction is **nighttime financial precision**: a deep navy environment,
high-contrast white typography, and electric blue reserved for action,
emphasis, and the product visual.

The first viewport should feel composed and credible rather than decorative:

- Preserve the existing floating glass navigation exactly as implemented.
- Use a two-column hero beneath it, with the message on the left and the
  supplied dashboard illustration on the right.
- Give the headline dominant visual weight, with the central profit question
  highlighted in blue.
- Use restrained atmospheric depth through radial light, faint grid or grain,
  and the glow already present in the transparent dashboard asset.
- Avoid additional floating cards, excessive glass panels, generic gradients,
  or decorative elements that compete with the product image.

The provided asset at `src/public/lp/hero-image.png` is the visual authority for
the right-hand composition. It must be rendered through `next/image`, retain its
intrinsic aspect ratio, and be treated as the hero's LCP image.

## Content Structure

The hero content is ordered as follows:

1. Compact label identifying the free price and profitability diagnosis.
2. Headline asking whether the user's current price actually generates profit.
3. Supporting paragraph explaining that an apparently acceptable price may
   still lose money and that Lucrivo evaluates it against the business reality.
4. Primary CTA to `/register` for the free diagnosis.
5. Secondary CTA to `#como-funciona` for product understanding.
6. Three concise reassurance items: completion in a few minutes, no card to
   begin, and practical guidance from the result.
7. A low-emphasis context strip identifying that the experience serves people
   who resell, produce, or provide services. This is product coverage, not
   social proof.

CTA text and supporting copy may be tightened during implementation, but they
must not introduce capabilities or evidence absent from `PRODUCT.md`.

## Component Architecture

Create `src/components/landing/hero-section.tsx` as a focused presentational
component. It owns:

- hero semantic structure and accessible heading;
- hero copy and links;
- reassurance and business-context lists;
- rendering and accessibility metadata for `hero-image.png`.

`LandingExperience` continues to own the page shell, navigation, remaining
sections, interactive state, and GSAP lifecycle. It imports and renders
`HeroSection` immediately after the existing navigation.

Hero-specific styling remains in `landing-experience.css` for this iteration so
that the current landing visual scope and responsive selectors remain intact.
The old hero selectors should be replaced rather than layered with conflicting
rules. Sections after the hero must not be restyled.

## Responsive Behavior

### Large screens

- Present the hero as an asymmetric two-column composition.
- Keep the copy within a readable measure while allowing the product image to
  extend toward the right viewport edge.
- Keep the complete reassurance row and context strip visible.
- Prevent the illustration from overlapping the navigation or obscuring copy.

### Tablets

- Shift to a stacked composition when two columns would compress the headline
  or CTAs.
- Place the illustration after the actions and retain enough scale for its
  dashboard details to remain legible.
- Allow reassurance items to wrap naturally.

### Small screens

- Use a single-column layout with compact, fluid type and full-width primary
  action where appropriate.
- Keep both actions reachable with at least a 44-pixel target height.
- Show a reduced illustration without horizontal overflow.
- Hide the low-priority context strip or nonessential atmospheric decorations
  when vertical space or legibility would suffer.
- Do not remove core copy, the primary CTA, or the reassurance content.

## Motion and Interaction

Use one restrained entrance sequence:

- reveal the copy group with a short upward fade and light stagger;
- reveal the product illustration with a slightly delayed fade, scale, and
  rotation settling into its final position;
- apply small translate and color changes to interactive CTA hover/focus states.

Do not use perpetual motion, scroll-jacking, or attention-seeking loops. Limit
the first viewport to the copy and product reveal as its two key motion events.
When `prefers-reduced-motion: reduce` is active, render every element in its
final state and remove transform-based interaction motion.

## Accessibility and Performance

- Maintain one page-level `h1` with the existing Portuguese value proposition.
- Give the dashboard image concise alternative text identifying it as an
  illustrative Lucrivo financial panel.
- Mark purely atmospheric elements as hidden from assistive technology.
- Preserve visible keyboard focus and logical source order.
- Maintain WCAG AA contrast for body text and controls against the navy surface.
- Reserve image space to avoid layout shift and use responsive `sizes`.
- Use `priority` for the single above-the-fold hero image only.
- Ensure the hero never creates horizontal scrolling at supported breakpoints.

## Legacy Removal

Delete the unused previous landing implementation and its exclusive test:

- `src/components/landing/landing-page.tsx`
- `src/components/landing/hero-diagnosis-visual.tsx`
- `src/components/landing/diagnosis-showcase.tsx`
- `src/components/landing/diagnosis-showcase.test.tsx`
- `src/components/landing/landing-data.ts`

Before deletion, verify that no active source imports these files. Historical
documentation references do not need to be rewritten because they describe
past implementation states.

## Verification

Implementation is complete when:

- the existing header markup and behavior are unchanged;
- all sections below the hero render with their existing content and behavior;
- the hero closely matches the approved reference at desktop width;
- tablet and mobile layouts are readable, actionable, and free of overflow;
- keyboard focus and reduced-motion behavior work as specified;
- obsolete landing files have no remaining active references;
- page tests cover the hero heading, primary CTA, product image, and continued
  presence of downstream landing content;
- targeted tests, type checking, linting, and the Impeccable detector pass;
- one bounded visual review covers desktop and mobile together, followed by at
  most one correction-and-confirmation round.

## Out of Scope

- Any markup, copy, styling, or behavior change to the current header/navbar.
- Refactoring or visually redesigning sections below the hero.
- Rebuilding the supplied dashboard illustration as live UI.
- Adding new commercial evidence, testimonials, plans, or product capabilities.
- Changing authenticated product screens or global design tokens.
