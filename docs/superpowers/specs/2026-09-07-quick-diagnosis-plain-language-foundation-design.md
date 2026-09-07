# Quick Diagnosis Plain-Language Foundation Design

**Date:** 2026-09-07

**Status:** Approved for implementation planning

**Related business rules:** `docs/QUICK-DIAGNOSIS.md`

**Related report designs:**

- `docs/superpowers/specs/2026-08-28-quick-diagnosis-reports-design.md`
- `docs/superpowers/specs/2026-08-29-quick-diagnosis-executive-summary-design.md`
- `docs/superpowers/specs/2026-08-31-product-quick-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-01-production-quick-diagnosis-design.md`
- `docs/superpowers/specs/2026-09-01-service-quick-diagnosis-cost-flow-design.md`

## 1. Purpose

Create a small, shared plain-language foundation for all three quick-diagnosis
flows: resale, own production, and service. The change must make the guided
forms, review screens, shared report structure, and executive-summary answers
understandable to micro and small business owners without requiring financial
or accounting vocabulary.

This delivery is intentionally cross-cutting and limited. Later deliveries
will revise each category's detailed report content separately. This foundation
must make those revisions easier without introducing a general-purpose content
engine.

AI conversation is outside this delivery.

## 2. Decisions

- Preserve every existing saved report, including its persisted narrative and
  its version-specific presentation labels.
- Apply the new language only to reports created after this delivery.
- Change content versions but not calculation versions or financial formulas.
- Keep the current snapshot shape. The content-only revision does not justify
  a schema-version increase.
- Add a small version-aware report-language profile for shared presentation
  labels. Do not centralize all category copy in one large dictionary.
- Simplify the guided forms, review screens, shared report chrome, main numbers,
  and executive-summary answers in this delivery.
- Leave the five detailed category-specific report sections for later,
  category-by-category revisions.
- Add clickable progressive disclosure only where a short primary label cannot
  carry enough meaning.
- Build explanations on the existing popover primitive so they work by click,
  touch, and keyboard rather than hover alone.
- Keep technical names in calculation code and schemas. In user-facing copy,
  mention a technical name only after explaining the concept in plain language.

## 3. Scope

### 3.1 Included

- Product, production, and service quick-diagnosis step titles, questions,
  field labels, helper text, validation text, and review labels.
- Shared report header, section introductions, main-number labels, status
  labels, and executive-summary answer templates.
- A reusable clickable help component with short, plain-language explanations.
- Version-aware presentation for old and new reports.
- New content versions for all three categories.
- Runtime snapshot validation for both existing and new content versions.
- Database write validation for the new content-version tuples.
- Automated domain, presenter, component, route, accessibility, and database
  coverage proportional to the change.
- Responsive verification for the affected quick-diagnosis and report surfaces.

### 3.2 Excluded

- Financial formula, verdict, priority, margin target, or discount-rule changes.
- Rewriting the five detailed report sections for each category.
- Recalculating, migrating, backfilling, or editing saved reports.
- AI conversation or AI-generated interpretation.
- A general CMS, translation platform, or arbitrary copy-rule engine.
- Visual redesign of the quick-diagnosis or report surfaces.

## 4. Language model

### 4.1 Principles

Every primary message follows this order:

1. Say what happened or what the user needs to enter.
2. Explain why it matters only when that changes the decision.
3. Give the next action in a direct sentence.
4. Put an optional technical name behind progressive disclosure.

The interface uses one name for each concept throughout entry, review, and
reporting. Headings and helper text do not repeat the same idea. Messages must
remain factual and must not imply that Lucrivo researches competitors or knows
the market's correct price.

### 4.2 Shared terminology

The initial shared vocabulary is:

| Current primary term | New primary language |
| --- | --- |
| Pró-labore | Quanto você quer receber por mês |
| Custos fixos | Gastos que existem todo mês |
| Margem real | Quanto sobra da venda |
| Preço-alvo | Preço para alcançar a meta |
| Rateio dos custos fixos | Parte dos gastos mensais em cada venda |
| Capacidade mensal estimada | Quanto você consegue vender ou atender por mês |
| Referência financeira | Valor calculado com seus gastos e sua meta |

The implementation uses natural Portuguese for each context rather than
mechanically substituting phrases. For example, service may say "atender" and
resale may say "vender".

“Margem” may appear inside a clickable explanation after its plain-language
meaning. Internal identifiers such as `proLaboreCents`,
`realMarginBasisPoints`, and `fixedAllocationCents` remain unchanged.

### 4.3 Executive-summary examples

The three direct questions remain because they match the user's immediate
decision:

- `Estou ganhando dinheiro?`
- `Estou cobrando o preço certo?`
- `O que preciso fazer agora?`

New answers remove unnecessary financial phrasing. Representative patterns
are:

- `Sim — sobram R$ 18,60 por venda depois de pagar os gastos considerados.`
- `Sim — seu preço alcança o valor calculado para a meta de 20%.`
- `Continue vendendo esse volume e acompanhe se seus clientes aceitam o preço.`

Exact templates remain deterministic and category-aware. They preserve the
calculated verdict, amount, unit, target, and priority. They do not claim market
knowledge.

### 4.4 Shared report labels

New reports use these shared directions:

| Current label | New label |
| --- | --- |
| Seu relatório financeiro | Resultado do seu diagnóstico |
| Principal ponto a corrigir | Comece por aqui |
| Entenda seus números | Como chegamos a esse resultado |
| Referências financeiras deste diagnóstico | Valores calculados com o que você informou |

The tone labels also use short, actionable language. Their exact wording is
defined once in the new report-language profile and tested as a stable set.

## 5. Progressive disclosure

### 5.1 Component

Add a shared client component named `PlainLanguageHelp`. It composes the
existing Base UI popover primitives and accepts:

- a visible trigger label, normally `Entenda este valor` or a context-specific
  equivalent;
- a short title;
- a one- or two-sentence explanation;
- an optional final sentence naming the technical term.

The trigger is a real button with an accessible name. The popup has a semantic
title and description, supports click, touch, keyboard activation, focus
management, outside dismissal, and `Escape`, and does not depend on hover.

### 5.2 Placement

Help is added only to concepts that remain difficult after the primary label
is simplified. Initial candidates are:

- how much remains from a sale;
- the price required to reach the target;
- how monthly expenses are divided across sales;
- how monthly selling or service capacity is estimated.

The component is not attached to every field or number. Common concepts such
as current price do not receive redundant help.

An example explanation is:

> Mostra quanto sobra de cada venda depois de pagar os gastos usados no
> cálculo. Esse valor também é chamado de margem.

## 6. Versioning and compatibility

### 6.1 New report tuples

Newly created reports use:

| Category | Schema version | Calculation version | Content version |
| --- | ---: | ---: | ---: |
| Service | 3 | 2 | 4 |
| Product/resale | 1 | 1 | 2 |
| Production | 1 | 1 | 2 |

The existing tuples remain readable:

- Service `2/1/2` and `3/2/3`;
- Product `1/1/1`;
- Production `1/1/1`.

### 6.2 Snapshot parsing

Each category parser accepts its existing snapshots and the new content
version with the same structural schema. The combined `ReportSnapshot` union
continues to reject unknown version combinations and malformed content.

The content builders emit only the new tuple. Old tuples are read-only
compatibility contracts.

### 6.3 Presentation profiles

The presenter chooses the shared report labels from category and
`contentVersion`:

```text
Validated report snapshot
        ↓
Category + content version
        ↓
Legacy or plain-language profile
        ↓
Shared report view model
```

This selection applies to labels that are not persisted in the snapshot, such
as the main-number names and tone labels. Persisted narrative continues to come
from the snapshot itself. Therefore opening an old report preserves both its
narrative and its surrounding vocabulary.

### 6.4 Database writes

A migration replaces the three atomic report-creation functions with the same
signatures and authorization behavior. Each function accepts the new current
tuple and continues to verify that the scalar version arguments match the JSON
snapshot.

The migration does not alter tables or existing rows. Idempotency, ownership,
RLS, grants, snapshot integrity checks, and category-specific input/result
checks remain unchanged.

## 7. Components and responsibilities

### 7.1 Guided diagnosis

Category step components own natural, context-specific questions and examples.
Shared field components remain presentation primitives and do not contain a
global dictionary of business terms.

Review components reuse exactly the same primary concept names as their
category's entry steps. Validation messages say what needs attention and how to
fix it without exposing internal field names.

### 7.2 Content builders

The three category builders keep their current deterministic mapping from
calculation states to report content. This delivery revises only the shared
summary patterns and the clearest cross-category jargon. The later individual
report revisions will own their detailed sections and will increase only that
category's content version.

### 7.3 Presenter and report UI

The presenter remains responsible for formatting numbers and choosing
version-specific display labels. React components render the supplied view
model and do not infer financial states.

The report components retain the incumbent layout and visual identity. The
only structural addition is progressive-disclosure help beside selected
labels.

## 8. Errors and edge cases

- Missing or unavailable values keep an explicit plain-language state rather
  than showing zero, `NaN`, or an empty label.
- Partial product and production reports explain that monthly sales volume is
  still needed without using “rateio” as the primary explanation.
- Existing unsupported or malformed snapshots continue to use the safe report
  unavailable state.
- Long currency values, negative results, pluralization, and hour,
  appointment, or unit wording must not break the summary.
- Popover content must fit narrow mobile widths and 200% zoom without clipping
  or horizontal scrolling.
- Color and icons remain supplemental; every status retains a text label.

## 9. Testing and verification

### 9.1 Domain and schema

- Assert exact new content versions and representative plain-language summary
  templates for every category and financial state.
- Preserve calculation expectations unchanged.
- Parse all supported legacy tuples and the new tuples.
- Reject unknown schema, calculation, and content combinations.

### 9.2 Presenter and components

- Verify old fixtures receive legacy labels and new fixtures receive the
  plain-language profile.
- Verify the new main-number and report-chrome labels.
- Exercise `PlainLanguageHelp` by pointer and keyboard, including focus,
  accessible name, semantic popup content, and `Escape` dismissal.
- Verify forms and reviews use consistent concept names.
- Retain automated accessibility checks for report summaries and step flows.

### 9.3 Routes and database

- Verify report detail and list routes still render every supported category
  and legacy version.
- Update pgTAP fixtures and assertions so atomic creation accepts the new
  current tuples, rejects mismatches, and preserves permissions, ownership,
  integrity, and idempotency.

### 9.4 Visual verification

Run one bounded visual review of the affected quick-diagnosis and report
surfaces on desktop and mobile, including open help content. Fix findings in
one batch and confirm once. Also run the Impeccable mechanical detector over
the changed UI targets.

## 10. Delivery boundaries for later work

Later category-specific revisions may change verdict wording, priority advice,
detailed section narratives, category-specific explanations, and information
order. Each revision increments only its own category's content version and
keeps the compatibility mechanism introduced here.

This foundation must not pre-empt those decisions by inventing a universal
category-copy abstraction.
