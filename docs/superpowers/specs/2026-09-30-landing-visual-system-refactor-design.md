# Landing Visual System Refactor

**Date:** 2026-09-30

**Status:** Approved visual direction; pending specification review

**Surface:** Public landing page (`/`)

**Mode:** Persuade

**Scope:** Navigation and every landing section from Hero through Pricing,
inclusive

## Objective

Refactor the public landing page from the first viewport through the Pricing
section into one restrained, professional, and recognizable visual system.
Preserve the current Portuguese communication, product truth, navigation,
calls to action, commercial plan behavior, and responsive experience while
reducing decorative intensity, component scale, visual fragmentation, and
theme-dependent rendering.

The approved direction is a **fixed light editorial system**: warm off-white
page surfaces, white content surfaces, deep navy typography, and Lucrivo blue
used deliberately for actions, small indicators, and selected emphasis. The
dark product dashboard image may remain as product imagery, but it must not
turn the surrounding page into a dark-theme chapter.

The visual reference is [Multiplica Digital](https://multiplicadigital.com.br/).
It is a source of design rules rather than a composition to copy: disciplined
grid, controlled section spacing, strong typography, balanced proportions,
and one strong accent color used selectively.

## Current-State Diagnosis

The current landing combines several individually expressive systems before
Pricing:

- a dark hero with radial light, glow, glass navigation, and a bright product
  illustration;
- a multicolor asymmetric bento with dark, blue, and paper cards;
- interactive business cards that enlarge one option and dim its siblings;
- oversized method panels with sticky stacking, clip paths, brightness changes,
  and scroll-scrubbed motion;
- a large photographic testimonial carousel;
- pricing cards with gradients, layered shadows, multiple icon tones, and a
  global dark-theme variant.

The result is visually fragmented: each section resets the palette, scale, and
interaction grammar. The refactor should retain the strongest information and
product imagery while replacing the competing visual worlds with one shared
system.

## Product and Content Constraints

- Preserve all current user-facing copy from Hero through Pricing.
- Preserve the current plan names, prices, benefits, payment options, trust
  messages, and registration links.
- Do not introduce customer counts, guarantees, market-price claims, or other
  commercial evidence absent from `PRODUCT.md`.
- Keep the current testimonial content unchanged even though it is provisional;
  the refactor may reduce its visual prominence but must not rewrite it.
- Preserve the three business contexts and their links to `#planos`.
- Preserve the method assets currently present in
  `src/public/lp/method-*.webp` and their meaningful alternative text.
- Preserve navigation anchors: `#top`, `#como-funciona`, `#recursos`,
  `#planos`, and `#diagnostico`.
- Do not change authenticated product screens or global application tokens.

## Scope Boundary

### Included

1. Fixed public navigation above the Hero.
2. Hero.
3. Problem section and its bridge/conclusion.
4. Business-context section.
5. Method section.
6. Testimonial section.
7. Pricing heading, public plan cards, and public trust rail.

### Excluded

- Final CTA (`#diagnostico`).
- Footer.
- Authenticated pages and the account-context version of `BillingPlans`.
- Changes to billing data, checkout behavior, price loading, or product logic.
- New copy, claims, testimonials, plan features, or imagery.
- A full global design-system migration.

Selectors and components shared with excluded surfaces must be scoped so the
refactor cannot alter them indirectly.

## Approved Visual Direction

### Theme

The landing is always rendered in its own light visual theme regardless of the
theme stored for the rest of the application. The landing root establishes its
own color variables and `color-scheme: light`. No selector under the public
landing may depend on the global `.dark` class.

The account-context plan component may continue supporting the application
theme. Public plan overrides must be isolated with `data-context="public"`, and
dark-theme module selectors must target `data-context="account"` where needed.

### Color Roles

- **Canvas:** warm/cool off-white with very low chroma.
- **Surface:** white or a near-white blue tint.
- **Primary text:** deep navy rather than pure black.
- **Secondary text:** muted blue-gray with WCAG AA contrast.
- **Brand action:** one Lucrivo blue for primary CTAs, focus rings, and the
  featured plan.
- **Soft emphasis:** a pale blue tint for selected labels or backgrounds.
- **Lines:** low-contrast cool gray-blue borders.

Gradients are removed from section backgrounds, cards, badges, and buttons in
the included scope. A gradient contained inside an existing product image is
part of the asset and is not treated as page decoration.

### Typography

Keep Geist to preserve the incumbent product identity and avoid another font
dependency. Use type size, weight, measure, and whitespace before color to
create hierarchy.

- Page headline: strong but not viewport-filling; maximum desktop size should
  remain close to 64 pixels.
- Section headings: one shared fluid scale and line height.
- Body text: at least 16 pixels with a comfortable 1.5–1.7 line height.
- Labels: restrained uppercase only where the content is genuinely metadata.
- Avoid excess bold text, letter spacing, colored words, and decorative serif
  substitutions.

### Layout and Rhythm

- Use one shared maximum content width around 1200–1240 pixels.
- Use consistent responsive side gutters across all included sections.
- Use a repeated vertical section rhythm, approximately 88–128 pixels on large
  screens and 64–88 pixels on small screens.
- Prefer 12–18 pixel radii and one-pixel borders.
- Use shadows sparingly and only to distinguish a foreground interactive
  element from the canvas.
- Maintain generous negative space without using oversized minimum heights.

## Section Design

### Navigation

Retain the same links, CTA, mobile menu, and fixed behavior. Replace the dark
glass treatment with a quiet light surface, fine border, modest radius, and
minimal shadow or backdrop blur. The logo and labels use navy; the CTA uses
the brand blue or a high-contrast navy treatment.

The navigation must remain readable over the light Hero, expose visible focus
states, and keep touch targets at least 44 pixels high.

### Hero

Keep the two-column desktop composition and the current content order. Move the
surrounding visual world to the light system:

- remove radial glows, bright divider gradients, and the primary-button glow;
- reduce the headline scale and use blue on only the key profit phrase;
- simplify the kicker from a prominent pill to compact metadata;
- keep the dashboard asset as the single dominant image, contained within a
  clean frame or controlled crop rather than floating in a glow field;
- reduce trust-item icon size and visual weight;
- keep one blue primary CTA and one neutral secondary CTA.

The Hero should fit comfortably at common laptop heights without forcing every
supporting element into the first viewport. It must reserve the dashboard image
space and preserve the image as the LCP candidate.

### Problem Section

Keep the approved factor content and reading order. Replace the multicolor
bento with a coherent modular composition:

- one shared light section surface;
- six related factor regions using the same card vocabulary;
- fine borders and subtle tonal differences rather than full navy and electric
  blue fills;
- low-contrast microvisuals that support each concept without competing with
  the text;
- a conclusion region that is wider or softly tinted, but not a separate dark
  visual universe.

The bridge remains a concise narrative transition rather than an oversized
chapter. No explanatory article should behave visually like a button.

### Business Contexts

Retain the three linked contexts and their current content. Use three equal,
compact cards with consistent icon, heading, description, and decorative
microvisual placement.

Remove the hover/focus behavior that enlarges one card and dims the others.
Interaction feedback is limited to a small border, color, or elevation change.
Every card remains independently legible without hover.

### Method

Replace the sticky stacked-panel sequence with a compact three-step editorial
composition. On large screens, use a three-column card grid or three balanced
columns within one shared container; on small screens, stack in document order.

Each step retains its image, phase, index, fact headings, descriptions, and
diagnosis disclaimer. Images use a consistent aspect ratio and modest radius.
Remove scroll-scrubbed clip paths, brightness reduction, panel scaling, and
sticky offsets.

### Testimonials

Preserve all testimonial copy, names, roles, carousel controls, and accessible
live-region behavior. Reduce the section to a supporting proof point:

- one contained light or pale-blue surface;
- a readable quote at a smaller scale;
- a simplified portrait treatment without an oversized offset stack;
- compact, clearly labelled carousel controls.

The section should not compete with the Hero or Pricing for primary attention.

### Pricing

Retain the existing `BillingPlans` component and commercial behavior. Refine
only the public context:

- reduce card padding, icon blocks, minimum height, and shadow depth;
- use flat surfaces and one-pixel borders;
- highlight the annual plan using a stronger border, restrained pale-blue
  surface, and compact badge instead of gradients and glow;
- keep a single strong blue primary action;
- simplify success and brand icon backgrounds;
- align price, benefits, and actions consistently across cards;
- keep the trust rail lightweight and clearly separated from the plans.

The account-context version must remain visually and behaviorally unchanged.

## Motion and Interaction

Motion is supporting feedback, not a separate layer of expression.

- Keep one restrained Hero entrance and one small reveal per section.
- Use 12–18 pixel translation distances and approximately 300–450 millisecond
  durations.
- Remove scroll scrubbing, sticky-stack transformations, clip-path reveals,
  sibling dimming, decorative chart animation, and large entrance rotation.
- Hover feedback uses small color, border, or 1–2 pixel translation changes.
- With `prefers-reduced-motion: reduce`, all content renders immediately in its
  final state and no interaction relies on transform animation.

## Responsive Behavior

### Large screens (1200 pixels and above)

- Two-column Hero.
- Structured multicolumn Problem and Business layouts.
- Three balanced Method and Pricing columns where content fits.
- Shared alignment edges across all section headings and content grids.

### Tablets (768–1199 pixels)

- Stack the Hero when the image or headline becomes compressed.
- Use two-column grids for factor and context cards where appropriate.
- Allow Method and Pricing to stack without fixed heights.
- Preserve navigation clarity and avoid overlap with wrapped content.

### Small screens (320–767 pixels)

- Single-column document flow.
- Full-width primary CTA where useful; all targets at least 44 pixels.
- Headings use fluid sizes without forced line breaks that create orphans.
- Cards use reduced padding and content-defined height.
- Images retain reserved aspect ratios and never create horizontal overflow.
- The mobile menu remains the only overlay introduced by the included scope.

The implementation must be checked at 320, 375, 390, 768, 1024, and 1440
pixel widths.

## Component and Styling Boundaries

- `HeroSection` remains the focused Hero component.
- `ProblemSection` remains the focused problem-content component.
- `LandingExperience` continues to own navigation, section sequencing, mobile
  menu, testimonial state, and GSAP lifecycle.
- Existing business and method data may remain in `LandingExperience`; extract
  a new component only if it materially reduces complexity without changing
  behavior.
- Landing styles remain in `landing-experience.css` for this iteration, but
  obsolete selectors must be removed instead of overridden by another layer.
- `billing-plans.module.css` changes must be scoped to the public context when
  they differ from the authenticated product.
- `page.test.tsx` should continue validating semantic content and critical
  links. Add theme-independence or structural assertions only when they protect
  a meaningful regression and do not test implementation details.

## Accessibility and Performance

- Preserve one page-level `h1` and logical heading order.
- Keep visible keyboard focus on all links and controls.
- Maintain WCAG AA contrast for body copy, buttons, muted text, and focus rings.
- Do not rely on color alone for the featured plan or business-card action.
- Preserve meaningful image alternative text and hide decorative graphics from
  assistive technology.
- Keep carousel controls labelled and keyboard operable.
- Reserve image space to prevent layout shift and keep responsive `sizes`
  accurate.
- Avoid adding dependencies, fonts, large scripts, or additional remote images.
- Guarantee no horizontal overflow at supported viewport widths.

## Verification

Implementation is complete when:

1. The public landing has the same appearance under light, dark, and system
   application-theme preferences.
2. Every included section visibly shares the same palette, grid, typography,
   radii, border, and motion grammar.
3. Gradients, glows, deep shadows, scrubbed motion, and oversized cards are
   removed from the included UI except where they are baked into an image.
4. All current copy, anchors, plan behavior, prices, and registration paths are
   preserved.
5. The final CTA and footer remain unchanged.
6. The account-context plan component remains unchanged.
7. Keyboard, focus, reduced-motion, and mobile-menu behavior work as before.
8. Targeted page tests, type checking, linting, and formatting pass.
9. The Impeccable detector reports no unaddressed findings in changed UI files.
10. One bounded visual review covers desktop and mobile together, followed by
    at most one consolidated correction pass and one confirmation capture.

## Risks and Mitigations

- **Shared pricing styles affect authenticated pages.** Scope public changes to
  `data-context="public"` and verify account selectors remain intact.
- **Removing GSAP sequences leaves hidden initial states.** Delete associated
  animation-only CSS and ensure final states are the CSS default.
- **The dark dashboard asset feels detached on a light canvas.** Use a neutral
  frame, controlled crop, and surrounding whitespace rather than adding glow.
- **Simplification makes the brand generic.** Retain the distinctive dashboard
  imagery, deep navy/blue palette, direct Portuguese voice, and purpose-built
  factor microvisuals.
- **Existing uncommitted work is overwritten.** Treat current landing changes
  and method assets as the implementation baseline, edit them in place, and
  stage only intentional files.
