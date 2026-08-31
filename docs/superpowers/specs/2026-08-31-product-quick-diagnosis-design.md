# Product Quick Diagnosis Design

**Date:** 2026-08-31

**Status:** Approved for implementation planning

**Related business rules:** `docs/QUICK-DIAGNOSIS.md`

**Depends on:**

- `docs/superpowers/specs/2026-08-27-quick-diagnosis-design.md`
- `docs/superpowers/specs/2026-08-28-quick-diagnosis-reports-design.md`
- `docs/superpowers/specs/2026-08-29-quick-diagnosis-executive-summary-design.md`

## 1. Purpose

Add the complete quick diagnosis for one purchased-and-resold product while
preserving the existing Service diagnosis and report flows.

The new path asks for a small set of unit-economics inputs, produces a
deterministic financial diagnosis, persists an immutable report atomically,
and redirects the signed-in owner to the existing report experience.

Product and Production are intentionally separate verticals. This delivery
implements Product only. Production remains unavailable and will receive its
own specification, implementation plan, persistence contract, calculations,
and release cycle.

## 2. Approved scope

### 2.1 Included

- Enable Product in the diagnosis-type selector.
- Keep Service behavior and persisted Service V2 snapshots unchanged.
- A Product modality step with Quick diagnosis enabled and Detailed analysis
  disabled as `Em breve`.
- A dedicated Product wizard, validation schema, command, Server Action,
  calculator, snapshot builder, persistence service, table, and atomic RPC.
- Purchase cost, sale price, fixed expenses, optional monthly volume, optional
  owner compensation, tax rate, and card fee inputs.
- A fixed 20% Product target margin.
- A fixed six operating days per week, shown as an explicit report premise.
- Complete and partial Product reports in the existing private report library.
- Product-specific executive-summary and detailed-section content.
- Discount simulation using the persisted Product calculation base.
- Runtime validation for Service V2 and Product V1 snapshots.
- Database, domain, application, component, accessibility, and regression
  tests.

### 2.2 Excluded

- Production diagnosis.
- Multiple products or catalog management.
- Detailed Product analysis.
- Product name, SKU, supplier, inventory, or stock movements.
- Freight, packaging, marketplace commission, or other unit additions.
- Detailed fixed-cost categories.
- Initial investment and return-on-investment calculations.
- Digital-product behavior.
- Editing or recalculating a saved report.
- AI-generated interpretation.
- Public reports, sharing, or alternate report identifiers.
- Changing Service formulas, copy, versions, tables, or RPC behavior.

The excluded inputs may be introduced only through later versioned contracts.
They must not be silently defaulted into this Product V1 snapshot.

## 3. Architectural boundaries

The quick-diagnosis entry becomes an orchestrator instead of one reducer that
contains every category:

```text
QuickDiagnosisWizard
├── DiagnosisTypeStep
├── ServiceDiagnosisWizard
└── ProductDiagnosisWizard
```

Production remains a disabled option in `DiagnosisTypeStep`.

Service and Product each own their business-facing artifacts:

```text
Quick-diagnosis input vertical       Report output vertical
──────────────────────────────       ──────────────────────
types and commands                   calculator
runtime schema                       executive-summary builder
wizard state and steps               snapshot builder and schema
Server Action                        persistence service
                                     presenter-compatible snapshot
```

Product must not reuse Service contracts or add category conditionals to
Service calculations. Neutral technical primitives may remain shared:

- integer arithmetic and rounding helpers;
- currency and percentage formatters;
- accessible field primitives;
- wizard shell, progress, and navigation presentation;
- report cards that render already-persisted content;
- the generic `diagnoses` registry and report library.

The `app` route composes actions and components. Server Actions authenticate
and orchestrate. Domain functions calculate without I/O. Services translate
commands into database calls. Postgres owns constraints, atomic writes,
idempotency, grants, and row authorization.

## 4. User journey

The Product path has eight visible steps:

1. **Diagnosis type** — Service, Product, or disabled Production.
2. **Analysis mode** — Quick diagnosis or disabled Detailed analysis.
3. **Product values** — purchase cost per unit and sale price per unit.
4. **Fixed expenses** — total monthly operating expenses.
5. **Monthly volume** — optional average units sold per month.
6. **Owner compensation** — initially disabled; enabling it reveals the
   monthly amount.
7. **Fees** — tax and card percentages.
8. **Review** — grouped values, edit controls, partial-result warning when
   volume is absent, and the only confirmation button.

The Detailed analysis option is visible but disabled with `Em breve`. It does
not link to a placeholder route.

Back and Edit preserve the exact input strings. Changing the diagnosis type
discards the abandoned branch state and creates a fresh branch submission ID.
Retrying the same Product confirmation preserves its submission ID. Starting
a new diagnosis generates a new ID.

The review displays `Não informado` for missing monthly volume and warns:

> Sem o volume mensal, os custos fixos não podem ser rateados por unidade. O
> relatório será parcial e não classificará sua margem como adequada.

No definitive calculation or database access occurs while the user fills the
client wizard. Progressive client validation uses the authoritative Product
schema filtered to the current step.

## 5. Input contract and validation

The Product input preserves raw strings in the browser:

```ts
type ProductDiagnosisInput = {
  submissionId: string;
  purchaseUnitCost: string;
  unitSalePrice: string;
  fixedMonthlyExpenses: string;
  monthlySalesVolume: string;
  proLaboreIncluded: boolean;
  proLabore: string;
  taxRate: string;
  cardFeeRate: string;
};
```

The schema converts the input once into an integer-only command:

```ts
type ProductDiagnosisCommand = {
  submissionId: string;
  purchaseUnitCostCents: number;
  unitSalePriceCents: number;
  fixedMonthlyExpensesCents: number;
  monthlySalesVolume: number | null;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};
```

Validation rules are:

- `submissionId` is a UUID.
- Purchase cost and sale price are required, have at most two decimal places,
  and are greater than zero.
- Fixed expenses are required, have at most two decimal places, and may be
  zero.
- Monthly volume is optional. When present, it is a positive safe integer.
- Owner compensation starts disabled.
- Disabled owner compensation is stored as zero regardless of stale client
  input.
- Enabled owner compensation is required and greater than zero.
- Tax and card fields are required, use at most two decimal places, and each
  remains between 0% and 100%.
- The combined rates are allowed to make a target or minimum price
  mathematically unavailable; the calculator returns `null` instead of
  dividing by zero or a negative rate.
- Currency parsing accepts the same `pt-BR` input conventions as Service and
  rejects unsafe integers.

The Product action result is a dedicated union with `success`,
`invalid_input`, `unauthorized`, and `create_failed` outcomes. It does not
reuse the Service input or error-map types.

## 6. Authentication and submission flow

The private layout checks the session to provide route-level navigation
protection. The Server Action remains an independent security boundary.

On confirmation, the Product action executes in this exact order:

```text
untrusted payload
→ Product Zod validation
→ requireUser()
→ deterministic Product calculation
→ deterministic Product V1 snapshot
→ Product persistence service
→ authenticated atomic RPC
```

Zod parsing is the only work before authentication. It is a local, bounded
operation that rejects malformed payloads. No financial calculation, snapshot
construction, external I/O, or database access occurs before `requireUser()`.

The RPC independently reads `auth.uid()`. Authentication in the layout or
Server Action never replaces the database check.

The client locks submission synchronously before awaiting the action. A
successful result keeps the lock while navigation replaces the current route
with `/reports/{id}`. Errors unlock the action and preserve answers.

## 7. Product calculation policy

Product calculation lives in a pure `calculate-product-report` domain module.
It does not call Supabase, format UI text, or inspect browser values.

Constants for Product V1 are:

```text
target margin                 = 20% (2,000 basis points)
adequate lower tolerance      = 0.5 percentage point
above-target threshold        = 3 percentage points over target
weekly divisor                = 4.33
operating days per week       = 6
maximum simulated discount    = 50%
```

For the formulas below:

- `P` is the current unit sale price.
- `C` is the purchase cost per unit.
- `CF` is fixed monthly expenses.
- `PL` is enabled owner compensation, otherwise zero.
- `Q` is optional monthly volume.
- `T` is tax plus card fee.
- `M` is the 20% target margin.

### 7.1 Core formulas

```text
effective fixed cost = CF + PL

net unit revenue = P × (1 - T)

unit contribution = net unit revenue - C
```

When volume is present:

```text
fixed allocation per unit = effective fixed cost ÷ Q

total unit cost = C + fixed allocation per unit

unit profit = net unit revenue - total unit cost

real margin = unit profit ÷ P
```

When volume is absent, fixed allocation, total unit cost, unit profit, and
real margin are `null`. They are never represented as zero.

### 7.2 Price references

The reference cost is the total unit cost when volume is present and the
purchase cost alone when volume is absent:

```text
minimum price = reference cost ÷ (1 - T)

target price = reference cost ÷ (1 - T - M)
```

Without volume, both values are explicitly marked as partial references that
do not include fixed-cost allocation. Minimum price is `null` when `T` is
100% or more. Target price is `null` when `T + M` is 100% or more.

### 7.3 Sales goals

When unit contribution is positive:

```text
monthly units to cover the month = effective fixed cost ÷ unit contribution

weekly units = monthly units ÷ 4.33

daily units = weekly units ÷ 6
```

When contribution is zero or negative, all sales-goal fields are `null`; the
report must not imply that additional volume fixes a losing sale.

### 7.4 Discount simulation

The simulator applies 0% through 50% to the current price and recalculates net
revenue, unit result, and margin from the persisted base. The base stores the
original price, applicable reference cost, total fee rate, target margin,
minimum price, and a `partial` discriminator.

With volume, the applicable reference cost is the total unit cost and the UI
labels the outputs as unit profit and real margin. Without volume, it is the
purchase cost only and the UI labels the outputs as unit contribution and
contribution margin. The partial state explicitly says that fixed expenses and
owner compensation were not allocated; it must not describe either output as
real profit or real margin.

The break-even discount is derived from the applicable minimum price. It is a
zero-profit boundary, not a healthy-margin recommendation. When minimum price
is available, it uses `max(0, 1 - minimum price / current price)`, rounded to
the nearest whole percentage point. Otherwise it is `null`.

### 7.5 Rounding

- Parsed money is stored as integer cents and rates as integer basis points.
- Existing integer helpers perform multiplication and division.
- Net revenue and displayed margins use the existing nearest-unit rounding
  convention.
- Fixed allocation, minimum price, target price, and sales goals round up so
  the result does not understate required cost, price, or volume.
- No binary floating-point value is persisted.

## 8. Verdict and priority

Product V1 adds `direct_loss` and `incomplete_volume` to the generic verdict
union and `data` to the priority union.

Classification follows this order:

| Order | Condition                                     | Verdict             | Priority |
| ----- | --------------------------------------------- | ------------------- | -------- |
| 1     | Unit contribution is zero or negative         | `direct_loss`       | `cost`   |
| 2     | Contribution is positive and volume is absent | `incomplete_volume` | `data`   |
| 3     | Real margin is zero or negative               | `operational_loss`  | `price`  |
| 4     | Real margin is below 19.5%                    | `tight_margin`      | `margin` |
| 5     | Real margin is from 19.5% through 23%         | `adequate_margin`   | `volume` |
| 6     | Real margin is above 23%                      | `above_target`      | `volume` |

The required positive price means Product never normally produces the Service
`missing_price` verdict. The generic union retains that verdict for existing
Service reports.

The `data` priority means “complete the missing volume,” not “increase sales.”
If contribution is already non-positive, `direct_loss` takes precedence over
missing volume because selling more would worsen the result.

## 9. Product V1 snapshot

The report schema becomes a discriminated union:

```text
ReportSnapshot
├── ServiceReportSnapshotV2
└── ProductReportSnapshotV1
```

Service V2 keeps schema version 2, calculation version 1, and content version 2. Product starts independent versions at 1:

```text
ProductReportSnapshotV1
├── schemaVersion: 1
├── calculationVersion: 1
├── contentVersion: 1
├── category: "product"
├── scenario: "resale"
├── currency: "BRL"
├── unit: "unit"
├── policy
│   ├── targetMarginBasisPoints: 2000
│   ├── weeklyDivisorHundredths: 433
│   ├── operatingDaysPerWeek: 6
│   ├── maximumDiscountPercent: 50
│   └── proLaboreIncluded: boolean
├── inputs
├── results
├── executiveSummary
├── sections[5]
└── discountSimulationBase
```

The Product result includes at least:

- effective fixed cost;
- purchase cost;
- fixed allocation or `null`;
- total unit cost or `null`;
- current price;
- net unit revenue;
- unit contribution;
- unit profit or `null`;
- real margin or `null`;
- minimum and target prices or `null`;
- whether price references are partial;
- monthly, weekly, and daily goals or `null`;
- break-even discount or `null`;
- verdict and priority.

The Product snapshot gets its own strict runtime schema. The public parser
first discriminates by category and version, then calls the corresponding
strict parser. Unsupported combinations fail closed. Existing snapshots are
not coerced, mutated, or recalculated.

## 10. Deterministic report content

The Product builder owns all business wording. Generic report components only
render the persisted snapshot.

The executive summary keeps the existing structure:

1. headline and introduction;
2. tone-aware verdict;
3. margin and price facts;
4. principal correction;
5. the three direct questions and answers.

Product verdict labels are:

| Verdict             | Label                  | Tone     | Central message                                                                                           |
| ------------------- | ---------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `direct_loss`       | Prejuízo direto        | critical | The sale does not cover purchase cost and percentage fees; cost or price must change before volume.       |
| `incomplete_volume` | Complete o diagnóstico | neutral  | Contribution is positive, but volume is needed to allocate fixed costs and determine real margin.         |
| `operational_loss`  | Prejuízo operacional   | critical | The sale covers its direct cost but not the allocated operation.                                          |
| `tight_margin`      | Margem apertada        | warning  | The complete unit result is positive but remains below the 20% target.                                    |
| `adequate_margin`   | Margem adequada        | positive | Price covers considered costs and reaches the 20% target range.                                           |
| `above_target`      | Acima da meta          | positive | Margin exceeds the target by more than three percentage points; market acceptance still needs validation. |

For `incomplete_volume`:

- the margin fact displays `Indisponível` against the 20% target;
- the price fact labels minimum and target values as `sem rateio fixo`;
- “Estou ganhando dinheiro?” answers that contribution is positive but real
  profit is not yet known;
- “Estou cobrando o preço certo?” says the reference is partial;
- “O que preciso fazer agora?” asks for average monthly volume.

The five section keys remain:

1. `break_even`;
2. `hidden_cost`;
3. `margin_diagnosis`;
4. `sales_goal`;
5. `discount_simulator`.

Their Product content refers to units, purchase cost, fixed-cost allocation,
20% target margin, and six operating days. It must never use Service terms
such as billable hour or appointment.

## 11. Database model

The migration is additive.

### 11.1 Generic registry

The existing `business_category` enum gains `product`. Production is not added
in this cycle.

The `diagnoses` constraints gain:

- category/scenario pair `product + resale`;
- unit `unit`;
- verdicts `direct_loss` and `incomplete_volume`;
- priority `data`.

The category/scenario constraint rejects invalid pairs such as
`product + hour` or `service + resale`.

### 11.2 Specialized table

```text
public.product_diagnoses
├── diagnosis_id bigint primary key
│   └── references diagnoses(id) on delete restrict
├── submission_id uuid not null
├── user_id uuid not null references auth.users(id) on delete cascade
├── purchase_unit_cost_cents bigint not null
├── unit_sale_price_cents bigint not null
├── fixed_monthly_expenses_cents bigint not null
├── monthly_sales_volume integer null
├── pro_labore_included boolean not null
├── pro_labore_cents bigint not null
├── tax_rate_basis_points integer not null
└── card_fee_rate_basis_points integer not null
```

Constraints enforce:

- unique `(user_id, submission_id)`;
- positive purchase cost and sale price;
- non-negative fixed expenses;
- positive monthly volume when non-null;
- zero owner compensation when disabled and positive owner compensation when
  enabled;
- each percentage between 0 and 10,000 basis points.

The generic `(user_id, created_at desc, id desc)` index remains the report
library access path. The Product uniqueness constraint provides its retry
lookup index; no speculative additional index is added.

### 11.3 Grants and RLS

- `anon` receives no table or function access.
- `authenticated` receives Product SELECT through RLS.
- `authenticated` receives no direct Product INSERT, UPDATE, or DELETE.
- The table has a SELECT-own policy using `(select auth.uid()) = user_id`.
- Writes happen only through the Product RPC.

### 11.4 Atomic RPC

`create_product_diagnosis_report` is a `SECURITY DEFINER` function with an
empty search path and fully qualified names. It:

1. reads and requires `auth.uid()`;
2. validates Product V1 versions, `product`, `resale`, `unit`, snapshot object
   shape, and top-level scalar consistency;
3. inserts the generic diagnosis and Product detail in one transaction;
4. returns the generic report ID;
5. recovers a retry by `(user_id, submission_id)`;
6. verifies an existing retry row is Product/Resale and has its corresponding
   Product detail before returning it;
7. rejects cross-category UUID reuse;
8. is revoked from `PUBLIC` and `anon` and granted only to `authenticated`.

Any detail-insert failure rolls back the generic insert. The client never
receives a report ID for a partial write.

## 12. Error handling and accessibility

- Step validation stays on the current step and links every message with
  `aria-describedby` and `aria-invalid`.
- A server `invalid_input` result routes to and focuses the earliest invalid
  Product field.
- An invalid uneditable submission ID is regenerated before returning to the
  branch start.
- `unauthorized` preserves answers and links to `/login`.
- `create_failed` preserves answers and the submission ID for a safe retry.
- Unexpected provider and RPC details are never exposed to the browser.
- Concurrent confirmation is blocked synchronously and visually.
- Step headings receive focus after navigation.
- Radio cards, the owner-compensation control, Back, Edit, and Confirm work by
  keyboard.
- Errors use `role="alert"`; color is not the only status signal.
- Layouts remain usable at approximately 375px and 1440px.
- Interactive transitions honor reduced-motion preferences.
- Light and dark themes use the existing semantic palette.

## 13. Testing and delivery strategy

Implementation follows `docs/WORKFLOW.md`, backend first and test first.

### 13.1 Database

pgTAP must cover:

- enum and generic constraint extensions;
- all Product columns, types, nullability, defaults, and checks;
- grants and absence of direct mutation privileges;
- SELECT-own RLS with two users;
- anonymous denial;
- authenticated RPC success;
- foreign-owner denial;
- same-user idempotency and cross-category UUID rejection;
- atomic rollback when Product detail constraints fail;
- immutable UPDATE and DELETE denial;
- unchanged Service RPC behavior.

### 13.2 Domain and contracts

Tests cover:

- canonical parsing and every validation boundary;
- owner compensation on and off;
- volume present and absent;
- every formula and rounding direction;
- fees that make minimum or target prices unavailable;
- every verdict and priority boundary;
- direct loss taking precedence over missing volume;
- partial price references and sales goals;
- discount simulation from complete and partial bases;
- exact Product snapshot versions, discriminants, ordering, and content;
- Service V2 and Product V1 parser dispatch;
- rejection of unsupported and malformed snapshots.

### 13.3 Application and UI

Tests cover:

- Zod validation before authentication;
- authentication before calculation and persistence;
- safe action errors;
- RPC argument mapping and response validation;
- Product selection without enabling Production;
- modality choice and disabled Detailed analysis;
- full valid path, progressive errors, Back, and all Review edits;
- absent-volume warning;
- submission lock, retry, reset, and report redirect;
- Product report and report-library presentation;
- keyboard focus, semantic errors, responsive layout, themes, and reduced
  motion;
- complete regression of the existing Service wizard and reports.

### 13.4 Required delivery gates

- Rebuild the local database from zero.
- Run all pgTAP tests.
- Regenerate database types and require no unexplained drift.
- Run database lint and security/performance advisors.
- Run the full application test, typecheck, ESLint, and Prettier gates.
- Produce a production build with a non-test production-like Turnstile key.
- Inspect final scope for environment files, seeds, browser artifacts,
  unrelated refactors, and dependency additions.

## 14. Rollout and rollback

Product is an additive authenticated feature. No existing report is rewritten.

Before release, application rollback disables Product in the selector and
reverts Product entrypoints while leaving unused additive database objects in
place. Database object or data removal requires a separate reviewed forward
migration; destructive rollback SQL is not bundled with this feature.

## 15. Production follow-up

After Product is implemented, reviewed, and merged, Production receives a new
brainstorming/specification/plan cycle. It may copy the proven technical
shape, but it must own separate contracts, schema, calculator, snapshot,
table, RPC, copy, and tests. Product business modules must not become a shared
Production rule engine.
