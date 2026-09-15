# Landing Problem Section Redesign

**Date:** 2026-09-15  
**Status:** Approved for implementation planning  
**Surface:** Public landing page (`/`)  
**Mode:** Persuade

## Objective

Replace the current second landing section and the large statement section that
follows it with one cohesive explanation of the factors that shape a viable
price. Preserve the asymmetric bento composition the user approved, but replace
its current financial-result messaging with the new problem-led narrative.

The transition from the hero must also be clarified. The existing business
context strip should no longer read as a footer attached to the hero; it should
become a narrative bridge that identifies the audience and introduces the
pricing problem.

The implementation must preserve the current hero adjustments from commit
`80c069b` and must not change the existing header or navbar.

## Narrative Sequence

The page should move through the following sequence:

1. The hero asks whether the user's current price really leaves a profit.
2. A dark transition bridge identifies the supported business contexts and
   states: **“Antes de mudar seu preço, descubra se a conta fecha.”**
3. The problem section explains that price depends on more than choosing a
   number.
4. Six bento regions identify the factors commonly omitted from the calculation.
5. A concluding region connects complete inputs with greater clarity and with
   the Lucrivo diagnosis.

This sequence should feel like one argument rather than three visually
disconnected sections.

## Product Truth

The section may explain the inputs considered in a price diagnosis, but it must
remain consistent with `PRODUCT.md`:

- Lucrivo calculates financial references from information supplied by the
  user.
- It does not research competitors or claim to determine a universal market
  price.
- The wording must remain clear, direct, and free of accounting jargon.
- The section must not imply guaranteed profit or business growth.
- Visualizations inside the cards are illustrative explanations, not live user
  results or evidence.

The user supplied the copy for this section. Implementation may adjust line
breaks for responsive layout, but must not rewrite the approved wording.

## Hero-to-Section Bridge

Move the current business-context content out of `HeroSection` and place it at
the beginning of the new problem section. Preserve the three contexts:

- Revenda
- Produção própria
- Prestação de serviço

The bridge uses the existing label **“Feito para a realidade de quem
empreende”**, followed by the transition statement **“Antes de mudar seu preço,
descubra se a conta fecha.”**

Visually, the bridge remains in the hero's deep navy world and transitions into
the light problem-section surface through spacing, a restrained divider, and a
controlled change in background. It must read as the opening of the next
chapter, not as legal copy, a site footer, or social proof.

On small screens, the bridge should remain present in a compact form. The three
contexts may wrap or become a concise vertical list, but the transition
statement must not be hidden.

## Approved Content

### Section introduction

- Eyebrow: **“O problema”**
- Heading: **“Preço não é só colocar um número.”**
- Supporting copy: **“O preço precisa fazer sentido para a realidade do seu
  negócio. Estes são os pontos que costumam mudar tudo — e que quase ninguém
  coloca na conta.”**

### Pricing factors

1. **Custos**
   - Description: **“Tudo que sai para o produto ou serviço existir.”**
   - Closing label: **“Na ponta do lápis”**
2. **Impostos**
   - Description: **“A fatia que vai embora em cada venda.”**
   - Closing label: **“Menos surpresas”**
3. **Taxas**
   - Description: **“Cartão, app, marketplace — descontam sem avisar.”**
   - Closing label: **“Fique no controle”**
4. **Tempo**
   - Description: **“Seu trabalho e suas horas também têm valor.”**
   - Closing label: **“Valorize o seu tempo”**
5. **Estrutura**
   - Description: **“Aluguel, luz, sistema: o custo de manter tudo de pé.”**
   - Closing label: **“Conta o ano todo”**
6. **O quanto você quer ganhar**
   - Description: **“O preço tem que caber o seu lucro também.”**
   - Closing label: **“Crescimento de verdade”**

### Conclusion

- Label: **“Preço com inteligência”**
- Primary statement: **“Quando você considera todos os pontos, o preço
  trabalha a seu favor.”**
- Supporting statement: **“Mais margem, mais previsibilidade e um negócio que
  cresce de forma saudável.”**
- Secondary label: **“Do caos ao controle”**
- Secondary statement: **“Preço certo abre caminhos.”**
- Closing statement: **“E a Lucrivo te ajuda a chegar lá.”**

The conclusion should be framed as the benefit of considering the inputs, not
as a guarantee that every diagnosis produces higher profit or growth.

## Approved Composition

Use one continuous asymmetric bento rather than six disconnected cards. The
desktop layout uses a 12-column grid:

```text
┌──────────────────────────┬──────────────────┐
│ Custos                    │ Impostos         │
│ wide dark region         │ blue region      │
├──────────────┬────────────┬──────────────────┤
│ Taxas        │ Tempo      │ Estrutura        │
│ light        │ navy       │ light            │
├──────────────────┬───────────────────────────┤
│ Quanto ganhar    │ Preço com inteligência   │
│ blue/dark        │ split conclusion region  │
└──────────────────┴───────────────────────────┘
```

The bento has one shared outer border and radius with fine internal dividers.
The regions must feel like parts of one pricing model, not a marketplace of
independent feature cards.

Use a controlled palette inherited from the hero:

- deep navy for the dominant analytical regions;
- electric brand blue for selected emphasis regions;
- warm off-white for contrast and reading relief;
- muted blue-gray for secondary text and divider lines.

Each factor receives a small, purpose-built explanatory graphic:

- stepped bars or expense blocks for costs;
- a proportion ring for taxes;
- a deduction line or stacked fee marks for rates;
- a clock or calibrated time line for time;
- structural blocks for recurring overhead;
- a target or margin band for desired earnings.

These graphics are decorative and must be hidden from assistive technology.
Do not use stock photography, generated photography, decorative dashboards, or
nonfunctional arrow buttons. The cards are explanatory articles, not controls.

The conclusion occupies a wider region and may split internally between blue
and navy to preserve the approved “Preço com inteligência / Do caos ao
controle” contrast.

## Component Architecture

Create `src/components/landing/problem-section.tsx` as a focused presentational
component. It owns:

- the business-context transition bridge;
- the problem-section heading and supporting copy;
- the six pricing-factor data definitions and semantic article markup;
- the decorative microvisual markup;
- the concluding communication region.

Update `HeroSection` only to remove the business-context constants, icon imports,
and markup that moved into `ProblemSection`. Preserve all other copy, structure,
motion wrappers, imagery, and styling introduced by the user's current hero
revision.

`LandingExperience` should import and render `ProblemSection` immediately after
`HeroSection`. Remove the current `light-section` diagnostic bento and the
following `statement-section`, because the new component replaces both. Keep
all later landing sections, state, navigation markup, and behavior unchanged.

Retain `id="como-funciona"` on the new second-section boundary so the existing
navbar and hero links continue to resolve without changing the header/navbar.

Section-specific styles remain in `landing-experience.css` for this iteration,
but obsolete selectors used only by the removed bento and statement section
should be deleted rather than left dormant.

## Responsive Behavior

### Large screens

- Use the approved 12-column composition.
- Keep the introduction centered with a readable line length above the bento.
- Preserve clear contrast between adjacent regions through color and internal
  divider lines, not large gaps.
- Allow the conclusion to span more horizontal space than the sixth factor.

### Tablets

- Recompose the six factors into two columns without relying on desktop grid
  coordinates.
- Keep related region heights visually balanced, but allow copy to determine
  minimum height.
- Let the conclusion span the full container width.

### Small screens

- Stack every factor in logical reading order from costs through desired
  earnings.
- Stack the conclusion's internal messages rather than compressing them side by
  side.
- Preserve body text at or above 16 pixels and maintain comfortable line
  height.
- Avoid fixed heights that clip longer Portuguese copy.
- Guarantee zero horizontal overflow at 320, 375, and 414 pixel widths.

## Motion and Interaction

Use one scroll-triggered reveal sequence scoped to the problem section:

- fade and translate the introduction by a short distance;
- reveal the bento regions in reading order with a restrained stagger;
- allow decorative bars, rings, or markers to settle into their final states
  as part of the same sequence.

Do not pin the section, hijack scrolling, animate long text character by
character, or give noninteractive cards button-like hover behavior. Any hover
response should be a very small surface or color adjustment and must not be
required to understand the content.

When `prefers-reduced-motion: reduce` is active, render the bridge, content,
cards, and graphics in their final state with no transform-based motion.

## Accessibility and Semantics

- Use one `section` labelled by its visible `h2`.
- Render each pricing factor as an `article` with a visible `h3`.
- Use an ordered or explicitly numbered structure so the visual sequence is
  also available in the document.
- Mark icons and explanatory graphics `aria-hidden="true"`.
- Do not introduce focusable elements without a real action.
- Maintain WCAG AA contrast for all text on navy, blue, and off-white regions.
- Do not communicate card categories through color alone; every region has a
  visible title, description, and closing label.

## Testing and Verification

Update `src/app/page.test.tsx` to verify:

- the new `#como-funciona` section heading and supporting copy;
- all six factor headings and their approved descriptions;
- the bridge's three supported business contexts and transition statement;
- the conclusion's primary and secondary messages;
- the existing hero contract still reflects the user's current copy;
- downstream `#recursos`, `#planos`, and `#diagnostico` sections remain present;
- the removed bento's old financial-reference headings are no longer used as
  the second-section contract.

Implementation verification must include:

- focused page tests followed by the complete test suite;
- type checking, linting, formatting, and `git diff --check`;
- the Impeccable detector after UI edits;
- one bounded visual pass covering desktop, tablet, and mobile together;
- at most one correction and confirmation pass;
- overflow checks at representative desktop and mobile widths;
- reduced-motion confirmation.

## Out of Scope

- Reverting or redesigning the current hero beyond moving its context strip.
- Changing header/navbar markup, styling, labels, or interaction.
- Refactoring the later resources, method, testimonials, pricing, or final CTA
  sections.
- Turning the factor regions into clickable controls or detail pages.
- Adding stock photography, generated imagery, live calculations, or user data
  to this explanatory section.
- Changing global product design tokens or authenticated product screens.
