# Quick Diagnosis Executive Summary Design

**Date:** 2026-08-29

**Status:** Approved in discussion; awaiting written-spec review

**Related business rules:** `docs/QUICK-DIAGNOSIS.md`

**Supersedes:** the summary-rail and snapshot-version decisions in
`docs/superpowers/specs/2026-08-28-quick-diagnosis-reports-design.md`

## 1. Purpose

Add the missing immediate-result layer described by the business rules. A
report must answer, before its detailed explanation:

1. Am I making money?
2. Is my price financially sufficient?
3. What should I correct first?

The approved layout places this executive summary across the full report width
and simplifies the existing summary rail so the same verdict and priority are
not repeated in multiple cards.

This change applies only to reports created with the new snapshot contract.
There are no real user reports to preserve, so the application will not carry
a legacy presentation adapter.

## 2. Decisions

- Keep `diagnoses.id` as `bigint generated always as identity`.
- Keep `/reports/[id]`; no public UUID or alternate route identifier is added.
- RLS and the explicit owner predicate remain the authorization boundary. An
  identifier, sequential or otherwise, is not a security control.
- Keep `calculationVersion: 1` because no formula changes.
- Change to `schemaVersion: 2` because the snapshot shape gains a required
  executive-summary object.
- Change to `contentVersion: 2` because new official text templates are
  persisted.
- Generate the executive summary deterministically before persistence. The
  presenter must not reconstruct business decisions.
- Preserve the existing five detailed sections and discount simulator.
- Remove the current duplicated verdict and priority cards from the summary
  rail.
- Do not mutate or silently recalculate old snapshots.

## 3. Scope

### 3.1 Included

- A version-2 snapshot contract with immutable executive-summary content.
- Service summary content for Hour, Minute, and Appointment.
- All existing verdict and priority states.
- A full-width executive-summary component.
- A compact numbers rail below the summary.
- Updated atomic RPC version validation.
- Runtime validation, database, domain, presenter, component, route,
  responsive, and accessibility tests.

### 3.2 Excluded

- Product and Production calculations or copy.
- AI-generated interpretation.
- Sharing, public report routes, public tokens, or UUID-based URLs.
- Editing or recalculating a saved report.
- Backfilling or adapting version-1 snapshots.
- Automatically deleting old rows in a migration.
- Changing formulas, target margin, verdict boundaries, or priority selection.

## 4. Identity and access model

The report registry keeps its current identity:

```sql
id bigint generated always as identity primary key
```

This is the appropriate primary key for the current architecture because all
writes go to one Postgres database, the key is compact and index-local, and the
library already paginates efficiently by `(created_at, id)`.

A UUID would not improve privacy. A signed-in user can only read rows that
match their `user_id` through both the application predicate and RLS. Missing
and foreign IDs continue to follow the same `notFound()` path.

The following remain `bigint`:

- `diagnoses.id`;
- `service_diagnoses.diagnosis_id`;
- the atomic function return type;
- action and wizard success results;
- report view-model identities;
- the ID portion of the opaque library cursor.

## 5. Version-2 snapshot contract

The snapshot adds one required `executiveSummary` object while retaining the
existing inputs, results, five sections, and simulator base:

```text
ReportSnapshotV2
├── schemaVersion: 2
├── calculationVersion: 1
├── contentVersion: 2
├── category, scenario, currency, unit, policy
├── inputs
├── results
├── executiveSummary
│   ├── headline
│   ├── introduction
│   ├── verdict
│   │   ├── label
│   │   ├── body
│   │   └── tone
│   ├── facts[2]
│   │   ├── margin comparison
│   │   └── price comparison
│   ├── priority
│   │   ├── label
│   │   └── body
│   └── answers[3]
│       ├── profitability
│       ├── price sufficiency
│       └── immediate action
├── sections[5]
└── discountSimulationBase
```

The summary uses fixed discriminants rather than arbitrary arrays:

```ts
type ExecutiveSummaryFact = {
  key: "margin" | "price";
  currentLabel: string;
  currentValue: string;
  referenceLabel: string;
  referenceValue: string;
};

type ExecutiveSummaryAnswer = {
  key: "profitability" | "price_sufficiency" | "immediate_action";
  question: string;
  answer: string;
};
```

Runtime validation requires exactly two facts in the declared order and
exactly three answers in the declared order. Unsupported version-1 snapshots
are rejected rather than coerced.

The persisted headline is `A verdade por trás do preço.` and the introduction
is `O Lucrivo revela o que está escondido nos seus números e mostra exatamente
o que fazer a respeito.`

The facts persist formatted `pt-BR` values so the historical wording and
presentation remain immutable:

1. `Margem atual` compared with `Meta`;
2. `Preço atual` compared with `Preço-alvo`.

Unavailable calculations use `Indisponível`; they are never fabricated as
zero.

## 6. Deterministic content rules

### 6.1 Verdict

The summary maps the existing calculated verdict to fixed content:

| Verdict            | Label           | Tone     | Exact body                                                                                                                                         |
| ------------------ | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing_price`    | Informe o preço | neutral  | `Informe o preço atual para o Lucrivo comparar sua cobrança com os custos e a meta de 15%.`                                                        |
| `operational_loss` | Prejuízo        | critical | `O preço não cobre todos os custos necessários. Do jeito que está, cada {unit} ainda deixa a conta no vermelho — o ajuste é no preço ou no custo.` |
| `tight_margin`     | Margem apertada | warning  | `O preço cobre os custos, mas a margem ainda está abaixo da meta de 15%. Existe lucro, porém com menos espaço do que o planejado.`                 |
| `adequate_margin`  | Margem adequada | positive | `O preço cobre os custos e alcança a meta financeira de 15%. Agora o resultado depende de manter o volume necessário.`                             |
| `above_target`     | Acima da meta   | positive | `O preço cobre os custos e supera a meta financeira de 15%. Há folga na margem; confirme se o mercado aceita esse preço e acompanhe o volume.`     |

`{unit}` is `hora` for Hour and `atendimento` for Minute and Appointment. The
builder reuses the calculated verdict and does not create a second classifier.

### 6.2 First answer: profitability

Question: `Estou ganhando dinheiro?`

Rules and exact templates, in order:

1. Missing price: `Ainda não é possível responder sem o preço atual.`
2. Unavailable unit profit: `Ainda não é possível calcular o lucro por
{unit} com os dados informados.`
3. Negative unit profit: `Não — hoje cada {unit} fecha no vermelho em
{absoluteProfit}.`
4. Zero unit profit: `Não — cada {unit} apenas cobre os custos, sem gerar
lucro.`
5. Positive unit profit: `Sim — cada {unit} deixa {profit} após os custos
considerados.`

Negative profit is displayed as a positive loss amount in `{absoluteProfit}`;
the word “vermelho” carries the direction and avoids a double-negative phrase.

Minute pricing is normalized to the appointment unit, matching the existing
report calculation.

### 6.3 Second answer: price sufficiency

Question: `Estou cobrando o preço certo?`

“Certo” means financially sufficient for the submitted costs and the fixed
15% target. It does not claim to be a market recommendation.

Rules and exact templates, in order:

1. Missing current price: `Ainda não — informe o preço atual para fazer a
comparação.`
2. Missing minimum or target reference: `Ainda não é possível calcular uma
referência financeira segura com os dados informados.`
3. Current price below minimum: `Não — está abaixo do mínimo financeiro de
{minimumPrice}.`
4. Current price from minimum up to, but excluding, target: `Parcialmente —
cobre os custos, mas ainda não alcança a meta de 15%.`
5. Current price at or above target: `Sim — alcança a referência financeira
para a meta de 15%.`

### 6.4 Third answer and principal correction

Question: `O que preciso fazer agora?`

The answer uses the existing calculated priority:

| Priority | Principal-correction body                                                                            | Exact short answer                                   |
| -------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| cost     | `Os custos pressionam cada venda. Reduza ou renegocie os maiores gastos antes de acelerar o volume.` | `Revise os custos antes de acelerar as vendas.`      |
| price    | `Seu preço está abaixo do necessário para cobrir a operação. O ajuste começa no preço.`              | `Ajuste o preço antes de buscar mais volume.`        |
| margin   | `A operação gera lucro, mas ainda não alcança a meta. Combine preço, custo e valor percebido.`       | `Aproxime a operação da meta financeira de 15%.`     |
| volume   | `Seu preço sustenta a operação e a meta. Agora transforme o volume necessário em rotina comercial.`  | `Trabalhe para alcançar a meta de vendas calculada.` |

The principal-correction block stores the complete explanation. The third
answer stores the shorter action sentence; the UI must not repeat the full
paragraph twice.

## 7. Report-page composition

The approved composition is:

```text
Report header and actions
        ↓
Full-width executive summary
        ↓
┌─────────────────────┬────────────────────────────────┐
│ Compact numbers     │ Five detailed report sections  │
│ rail                │ in their existing order        │
└─────────────────────┴────────────────────────────────┘
```

### 7.1 Executive summary

`ReportExecutiveSummary` renders:

1. headline and introduction;
2. the tone-aware verdict panel;
3. margin and price comparisons;
4. the principal point to correct;
5. the three numbered questions and answers.

Tone styling uses the existing semantic palette:

- neutral/info when the price is missing;
- destructive red for operational loss;
- warning amber for tight margin;
- success green for adequate and above-target states.

Color is never the only signal. Every state has a visible label and semantic
icon.

### 7.2 Compact numbers rail

The existing `ReportSummary` becomes a focused `ReportNumbers` component. It
contains only:

- current price;
- real margin;
- profit per report unit;
- minimum price;
- target price.

The blue “Leitura principal” card and separate “Prioridade agora” card are
removed because their content moves into the executive summary. The old
`nextActions` presentation is also removed; its single immediate decision is
captured by the third answer.

The rail may remain sticky on desktop. It must not be sticky on narrow
viewports or create nested scrolling.

### 7.3 Detailed analysis

The narrative column retains these five sections without reordering:

1. `1 · Ponto de equilíbrio`;
2. `2 · A conta que ninguém faz`;
3. `3 · Diagnóstico da margem`;
4. `Meta de vendas`;
5. `Simulador de desconto`.

The new executive summary does not replace these explanations. It gives the
decision first; the existing sections show how the numbers support it.

### 7.4 Responsive order

Desktop uses the full-width summary followed by the two-column analysis.
Mobile and 200% zoom use one semantic sequence:

1. header and actions;
2. executive summary;
3. compact numbers;
4. five detailed sections.

No financial block requires horizontal scrolling.

## 8. Data flow and persistence

```text
Validated ServiceDiagnosisCommand
        ↓
calculateServiceReport (unchanged formulas)
        ↓
buildServiceReportSnapshot
  ├── buildExecutiveSummary
  ├── build existing five sections
  └── validate complete v2 snapshot
        ↓
create_service_diagnosis_report RPC
  ├── require schemaVersion = 2
  ├── require calculationVersion = 1
  ├── require contentVersion = 2
  └── atomically persist input + immutable snapshot
        ↓
SSR report route validates v2 and renders initial HTML
```

`buildExecutiveSummary` is one exported pure domain function supported by
private builders for verdict, facts, priority, and answers. React components
receive presentation data and do not classify margin, compare prices, or
choose priority.

The RPC continues returning `bigint`. Its ownership check, restricted grants,
`security definer`, empty search path, idempotency behavior, and transaction
boundary remain unchanged.

## 9. Compatibility and rollout

Version-1 report rows are development-only and need not remain readable. The
version-2 parser rejects them, causing the existing safe “Relatório
indisponível” state.

The migration must not delete data. Local development uses a clean Supabase
reset. If a shared staging environment contains disposable report rows, their
cleanup is a separate explicit operation with exact targets and approval.

The atomic RPC rejects version-1 creation after the migration. This prevents a
mixed population from being created accidentally.

## 10. Error handling

- Missing and foreign IDs remain indistinguishable and call `notFound()`.
- Database read errors use the existing route error boundary.
- A malformed or unsupported snapshot renders the safe unavailable state and
  never partially renders calculated content.
- A malformed executive summary fails validation for the entire snapshot.
- Missing numeric references produce explicit unavailable content at creation
  time; the presenter does not invent fallback calculations.

## 11. Accessibility requirements

- The page keeps one `h1`; the executive-summary headline is the next logical
  heading level.
- The verdict is announced with text in addition to color and icon.
- The three answers are an ordered list with visible numbering.
- Margin and price comparisons use semantic descriptions that remain
  understandable outside the visual layout.
- Currency and percentage values use tabular numerals and explicit labels.
- Focus behavior for report links and the discount slider remains visible.
- Existing slider label, `aria-valuetext`, keyboard behavior, and polite live
  status remain intact.
- The layout must pass 320px, 768px, desktop, 200% zoom, reduced motion, and
  light/dark theme checks without horizontal overflow.

## 12. Verification strategy

### 12.1 Domain and schema

- Accept one complete version-2 Service snapshot.
- Reject version 1, missing summary fields, duplicate/reordered facts, and
  duplicate/reordered answers.
- Cover all five verdicts and all four priorities.
- Cover missing, negative, zero, and positive unit profit.
- Cover price below minimum, between minimum and target, exactly at target,
  and above target.
- Cover Hour, Minute, and Appointment wording and units.
- Assert exact persisted Portuguese copy for representative golden cases.

### 12.2 Database and services

- Assert the registry and Service foreign key remain `bigint`.
- Assert the RPC still returns `bigint`.
- Accept versions `2/1/2` and reject obsolete or mismatched versions.
- Persist the executive summary exactly as supplied in the validated snapshot.
- Preserve idempotent retry behavior, explicit privileges, and owner-only RLS.
- Regenerate database types twice and require a clean second result.

### 12.3 Presentation and routes

- Render the full-width summary before the two-column analysis.
- Render the three questions in fixed order.
- Render the compact five-value numbers rail.
- Assert the old “Leitura principal” and “Prioridade agora” cards are absent.
- Preserve exact order of the five detailed sections.
- Preserve SSR, refresh persistence, unavailable, error, and not-found states.
- Run component accessibility assertions plus authenticated browser checks at
  the required viewport, zoom, keyboard, motion, and theme settings.

### 12.4 Release checks

Run the complete application suite, database reset and pgTAP suite, generated
type idempotency check, schema lint, database advisors, production build, and
authenticated functional/security smoke tests before declaring the change
ready.

## 13. Success criteria

- A newly created Service report answers the three business questions before
  the detailed explanation.
- The user sees one clear verdict and one principal correction, not repeated
  conclusions in multiple cards.
- The saved snapshot contains the exact summary text shown by SSR.
- The five detailed sections and simulator continue to work unchanged.
- Report IDs, routes, pagination, ownership, and RLS continue using the current
  `bigint` model without regression.
