# Production Quick Diagnosis Design

**Date:** 2026-09-01

**Status:** Approved for implementation planning

**Related business rules:** `docs/QUICK-DIAGNOSIS.md`

**Depends on:**

- `docs/superpowers/specs/2026-08-27-quick-diagnosis-design.md`
- `docs/superpowers/specs/2026-08-28-quick-diagnosis-reports-design.md`
- `docs/superpowers/specs/2026-08-29-quick-diagnosis-executive-summary-design.md`
- `docs/superpowers/specs/2026-08-31-product-quick-diagnosis-design.md`

## 1. Purpose

Add the complete quick diagnosis for one manufactured unit while preserving
the existing Service and Product diagnosis and report flows.

The Production path accepts either one summarized ready-unit production cost
or an optional fixed-category composition of that cost. It produces a
deterministic financial diagnosis, persists an immutable report atomically,
and redirects the signed-in owner to the existing private report experience.

Production is an independent vertical. It may share neutral technical
primitives with Product, but it does not reuse Product business contracts,
snapshots, persistence, or category conditionals. This separation allows
future Production rules such as recipes, yields, and waste to evolve without
changing Product behavior.

## 2. Approved scope

### 2.1 Included

- Enable Production in the diagnosis-type selector.
- Preserve the implemented Service and Product flows and snapshots.
- A Production modality step with Quick diagnosis enabled and Detailed
  analysis disabled as `Em breve`.
- A dedicated Production wizard, validation schema, command, Server Action,
  calculator, snapshot builder, persistence service, table, and atomic RPC.
- A summarized cost for manufacturing one ready unit.
- An optional fixed-category composition of that unit cost.
- Raw material, unit packaging, direct labor, and other variable unit costs.
- Unit sale price, fixed expenses, optional monthly sales volume, optional
  owner compensation, tax rate, and card fee inputs.
- A fixed 20% Production target margin.
- A fixed six operating days per week, shown as an explicit report premise.
- Complete and partial Production reports in the existing report library.
- Production-specific executive-summary and detailed-section content.
- Discount simulation using the persisted Production calculation base.
- Runtime validation for Service V2, Product V1, and Production V1 snapshots.
- Database, domain, application, component, accessibility, and regression
  tests.

### 2.2 Excluded

- A technical sheet or free-form ingredient list.
- Ingredient quantities, units of measure, suppliers, or inventory.
- Recipe or batch yield.
- Loss and waste calculations.
- Multiple products or catalog management.
- Detailed Production analysis.
- Freight or delivery to the customer as a separate guided input.
- Detailed fixed-cost categories.
- Initial investment and return-on-investment calculations.
- Editing or recalculating a saved report.
- AI-generated interpretation.
- Public reports, sharing, or alternate report identifiers.
- Changing existing Service or Product formulas, copy, versions, tables, or
  RPC behavior.

The excluded inputs may be introduced only through later versioned contracts.
They must not be silently defaulted into the Production V1 snapshot.

## 3. Architectural boundaries

The quick-diagnosis entry remains an orchestrator with three independent
branches:

```text
QuickDiagnosisWizard
├── DiagnosisTypeStep
├── ServiceDiagnosisWizard
├── ProductDiagnosisWizard
└── ProductionDiagnosisWizard
```

Production owns its business-facing artifacts:

```text
Production input vertical            Production report vertical
─────────────────────────            ──────────────────────────
types and command                    calculator
runtime schema                       executive-summary builder
wizard state and steps               snapshot builder and schema
Server Action                        persistence service
                                      presenter-compatible snapshot
```

Production must not reuse Product contracts or add Production branches to
Product calculation and persistence code. Neutral technical primitives may
remain shared:

- integer arithmetic and rounding helpers;
- currency and percentage parsers and formatters;
- accessible field primitives;
- wizard shell, progress, and navigation presentation;
- generic report cards that render persisted content;
- the generic `diagnoses` registry and report library.

The `app` route composes actions and components. Server Actions authenticate
and orchestrate. Domain functions calculate without I/O. Services translate
commands into database calls. Postgres owns constraints, atomic writes,
idempotency, grants, and row authorization.

## 4. User journey

The Production path has eight visible steps:

1. **Diagnosis type** — Service, Product, or Production.
2. **Analysis mode** — Quick diagnosis or disabled Detailed analysis.
3. **Unit values** — production cost and current unit sale price.
4. **Fixed expenses** — total monthly operating expenses.
5. **Monthly volume** — optional average units sold per month.
6. **Owner compensation** — initially disabled; enabling it reveals the
   monthly amount.
7. **Fees** — tax and card percentages.
8. **Review** — grouped values, edit controls, partial-result warning when
   volume is absent, and the only confirmation button.

Detailed analysis remains visible but disabled as `Em breve`. It represents a
future technical-sheet experience and does not link to a placeholder route.

### 4.1 Unit-cost modes

The unit-values step starts in summarized mode with the field **Custo para
fabricar uma unidade pronta**. The user may activate **Compor custo da
unidade**, which reveals four fixed categories:

- ingredients or raw material;
- unit packaging;
- direct labor;
- other variable cost per unit.

In composed mode:

- each component may be zero;
- their sum must be greater than zero;
- the total production cost is derived and read-only;
- the server derives the authoritative total again;
- the UI explains that direct labor is a variable cost per unit and must not
  duplicate monthly owner compensation.

When composition is disabled, its current sum is copied into the summarized
cost. Component values remain in local wizard state so they are restored if
composition is re-enabled. A submission confirmed in summarized mode persists
only its total; the abandoned component values are not part of the command or
snapshot.

The label **Compor custo da unidade** deliberately differs from **Análise
detalhada / ficha técnica**. Composition is a quick fixed-category breakdown;
the future detailed flow owns ingredients, quantities, yields, and waste.

### 4.2 Navigation and partial analysis

Back and Edit preserve exact input strings. Changing diagnosis category
discards the abandoned branch state and creates a fresh branch submission ID.
Retrying the same Production confirmation preserves its submission ID.
Starting a new diagnosis generates a new ID.

Monthly volume means units effectively sold, not merely manufactured. Without
it, the review displays `Não informado` and warns that fixed costs cannot be
allocated per unit, so real profit and real margin remain unavailable.

No definitive calculation or database access occurs while the user fills the
client wizard. Progressive client validation uses the authoritative
Production schema filtered to the current step.

## 5. Input contract and validation

The browser preserves raw strings:

```ts
type ProductionDiagnosisInput = {
  submissionId: string;
  costCompositionEnabled: boolean;
  productionUnitCost: string;
  materialUnitCost: string;
  packagingUnitCost: string;
  directLaborUnitCost: string;
  otherVariableUnitCost: string;
  unitSalePrice: string;
  fixedMonthlyExpenses: string;
  monthlySalesVolume: string;
  proLaboreIncluded: boolean;
  proLabore: string;
  taxRate: string;
  cardFeeRate: string;
};
```

The schema converts valid input into an integer-only validated value. Its
shape contains:

- the submission UUID and both boolean mode discriminators;
- the summarized production unit cost in cents or `null` in composed mode;
- four component values in cents when composition is enabled, otherwise
  `null`;
- sale price, fixed expenses, and owner compensation in cents;
- optional monthly sales volume as an integer;
- tax and card rates in basis points.

After authentication, a pure composer converts this validated value into the
final `ProductionDiagnosisCommand`. It recalculates the authoritative
production unit cost from the four components when composition is enabled and
rechecks that the sum remains a positive safe integer. The calculator,
snapshot builder, and persistence service consume only this final command.

Validation rules are:

- `submissionId` is a UUID.
- Sale price is required, has at most two decimal places, and is greater than
  zero.
- In summarized mode, production unit cost is required, has at most two
  decimal places, and is greater than zero.
- In composed mode, all four components accept at most two decimal places,
  are non-negative, and sum to more than zero.
- The authoritative composed total is recalculated on the server; a browser
  total is never trusted.
- Components are normalized to `null` when summarized mode is confirmed.
- Fixed expenses are required, have at most two decimal places, and may be
  zero.
- Monthly volume is optional. When present, it is a positive safe integer and
  represents sold units.
- Owner compensation starts disabled.
- Disabled owner compensation is normalized to zero regardless of stale
  client input.
- Enabled owner compensation is required and greater than zero.
- Tax and card fields are required, use at most two decimal places, and each
  remains between 0% and 100%.
- Combined rates may make a minimum or target price mathematically
  unavailable; the calculator returns `null` instead of dividing by zero or a
  negative rate.
- Currency parsing accepts the existing `pt-BR` conventions and rejects
  unsafe integers.

The Production action result is a dedicated union with `success`,
`invalid_input`, `unauthorized`, and `create_failed` outcomes. It does not
reuse Service or Product input and error-map types.

## 6. Authentication and submission flow

The private layout protects route navigation. The Production Server Action
remains an independent security boundary and executes in this order:

```text
untrusted payload
→ Production Zod structural validation
→ requireUser()
→ authoritative unit-cost composition
→ deterministic Production calculation
→ deterministic Production V1 snapshot
→ Production persistence service
→ authenticated atomic RPC
```

Zod parsing is the only work before authentication. It is a local, bounded
operation that rejects malformed input. No financial report calculation,
snapshot construction, external I/O, or database access occurs before
`requireUser()`.

The RPC independently reads `auth.uid()`. Authentication in the layout or
Server Action never replaces the database check.

The client locks submission synchronously before awaiting the action. A
successful result keeps the lock while navigation replaces the current route
with `/reports/{id}`. Errors unlock the action and preserve answers.

## 7. Production calculation policy

Production calculation lives in a pure `calculate-production-report` domain
module. It does not call Supabase, format UI text, or inspect browser values.

Constants for Production V1 are:

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
- `C` is the summarized production cost or authoritative component sum.
- `CF` is fixed monthly expenses.
- `PL` is enabled owner compensation, otherwise zero.
- `Q` is optional monthly sold volume.
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

The reference cost is total unit cost when volume is present and production
unit cost alone when volume is absent:

```text
minimum price = reference cost ÷ (1 - T)

target price = reference cost ÷ (1 - T - M)
```

Without volume, both values are explicitly partial and do not include fixed
cost allocation. Minimum price is `null` when `T` is 100% or more. Target
price is `null` when `T + M` is 100% or more.

### 7.3 Sales goals and discount simulation

When unit contribution is positive:

```text
monthly units to cover the month = effective fixed cost ÷ unit contribution

weekly units = monthly units ÷ 4.33

daily units = weekly units ÷ 6
```

When contribution is zero or negative, all sales-goal fields are `null`; the
report must not imply that additional volume fixes a losing unit.

The simulator accepts discounts from 0% through 50% and recalculates from the
persisted base. Complete reports label outputs as unit profit and real margin.
Partial reports label them as unit contribution and contribution margin and
state that fixed expenses and owner compensation were not allocated.

The break-even discount uses the applicable minimum price and is a zero-profit
boundary, not a healthy-margin recommendation.

### 7.4 Rounding

- Parsed money is stored as integer cents and rates as integer basis points.
- Existing integer helpers perform multiplication and division.
- Net revenue and displayed margins use the existing nearest-unit convention.
- Fixed allocation, minimum price, target price, and sales goals round up so
  required cost, price, or volume is not understated.
- No binary floating-point value is persisted.

## 8. Verdict and priority

Production owns its verdict and priority types, even where their literal
values match Product V1.

Classification follows this order:

| Order | Condition                                     | Verdict             | Priority |
| ----- | --------------------------------------------- | ------------------- | -------- |
| 1     | Unit contribution is zero or negative         | `direct_loss`       | `cost`   |
| 2     | Contribution is positive and volume is absent | `incomplete_volume` | `data`   |
| 3     | Real margin is zero or negative               | `operational_loss`  | `price`  |
| 4     | Real margin is below 19.5%                    | `tight_margin`      | `margin` |
| 5     | Real margin is from 19.5% through 23%         | `adequate_margin`   | `volume` |
| 6     | Real margin is above 23%                      | `above_target`      | `volume` |

`data` means complete the missing monthly sales volume, not increase sales.
Direct loss takes precedence over missing volume because selling more at a
non-positive contribution worsens the result.

## 9. Production V1 snapshot

The public report schema becomes:

```text
ReportSnapshot
├── ServiceReportSnapshotV2
├── ProductReportSnapshotV1
└── ProductionReportSnapshotV1
```

Production versions start independently at 1:

```text
ProductionReportSnapshotV1
├── schemaVersion: 1
├── calculationVersion: 1
├── contentVersion: 1
├── category: "production"
├── scenario: "manufacturing"
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

Inputs preserve whether composition was enabled, the authoritative total,
four components or `null`, and all other confirmed Production fields.

Results include at least:

- effective fixed cost;
- production unit cost;
- fixed allocation or `null`;
- total unit cost or `null`;
- current price and net unit revenue;
- unit contribution;
- unit profit and real margin or `null`;
- minimum and target prices or `null`;
- whether price references are partial;
- monthly, weekly, and daily goals or `null`;
- break-even discount or `null`;
- verdict and priority.

Production gets its own strict runtime schema. The public parser discriminates
by category and version before calling the corresponding strict parser.
Unsupported combinations fail closed. Existing snapshots are not coerced,
mutated, or recalculated.

## 10. Deterministic report content

The Production content builder owns all business wording. Generic report
components only render the persisted snapshot.

The executive summary retains the existing structure and answers:

1. **Estou ganhando dinheiro?**
2. **Estou cobrando o preço certo?**
3. **O que preciso fazer agora?**

The existing five report section keys remain:

1. `break_even`;
2. `hidden_cost`;
3. `margin_diagnosis`;
4. `sales_goal`;
5. `discount_simulator`.

Production content refers to manufactured units, production cost, fixed-cost
allocation, 20% target margin, and six operating days. It distinguishes:

- production cost from fixed expenses;
- direct labor per unit from monthly owner compensation;
- contribution margin from real margin;
- partial price references from definitive results.

It must not use resale terms such as supplier purchase cost or Service terms
such as billable hour and appointment.

## 11. Database model

The migration is additive.

### 11.1 Generic registry

The existing `business_category` enum gains `production`. The generic report
constraints gain:

- category/scenario pair `production + manufacturing`;
- scenario `manufacturing`;
- unit `unit` for Production.

Invalid combinations such as `product + manufacturing`, `production +
resale`, or `service + manufacturing` are rejected.

### 11.2 Specialized table

```text
public.production_diagnoses
├── diagnosis_id bigint primary key
│   └── references diagnoses(id) on delete restrict
├── submission_id uuid not null
├── user_id uuid not null references auth.users(id) on delete cascade
├── cost_composition_enabled boolean not null
├── production_unit_cost_cents bigint not null
├── material_unit_cost_cents bigint null
├── packaging_unit_cost_cents bigint null
├── direct_labor_unit_cost_cents bigint null
├── other_variable_unit_cost_cents bigint null
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
- positive production cost and sale price;
- all component columns `null` in summarized mode;
- all component columns non-null and non-negative in composed mode;
- exact equality between the composed total and its component sum;
- non-negative fixed expenses;
- positive monthly volume when non-null;
- zero owner compensation when disabled and positive owner compensation when
  enabled;
- each percentage between 0 and 10,000 basis points.

The generic report-library index remains the list access path. The Production
uniqueness constraint supplies its retry lookup index; no speculative
additional index is introduced.

### 11.3 Grants and RLS

- `anon` receives no Production table or function access.
- `authenticated` receives Production SELECT through RLS.
- `authenticated` receives no direct Production INSERT, UPDATE, or DELETE.
- The table has a SELECT-own policy using `(select auth.uid()) = user_id`.
- Writes happen only through the Production RPC.

### 11.4 Atomic RPC

`create_production_diagnosis_report` is a `SECURITY DEFINER` function with an
empty search path and fully qualified names. It:

1. reads and requires `auth.uid()`;
2. validates Production V1 versions, `production`, `manufacturing`, `unit`,
   snapshot object shape, and top-level scalar consistency;
3. validates the summarized or composed cost shape and exact component sum;
4. inserts the generic diagnosis and Production detail in one transaction;
5. returns the generic report ID;
6. recovers a retry by `(user_id, submission_id)`;
7. verifies an existing retry row is Production/Manufacturing and has its
   Production detail before returning it;
8. rejects cross-category UUID reuse;
9. is revoked from `PUBLIC` and `anon` and granted only to `authenticated`.

Any detail-insert failure rolls back the generic insert. The client never
receives a report ID for a partial write.

## 12. Error handling and accessibility

- Step validation remains on the current step and connects each message with
  `aria-describedby` and `aria-invalid`.
- A server `invalid_input` result routes to and focuses the earliest invalid
  Production field.
- An invalid uneditable submission ID is regenerated before returning to the
  branch start.
- `unauthorized` preserves answers and links to `/login`.
- `create_failed` preserves answers and the submission ID for a safe retry.
- Unexpected provider and RPC details are never exposed to the browser.
- Concurrent confirmation is blocked synchronously and visually.
- Step headings receive focus after navigation.
- Cost-composition controls, radio cards, owner compensation, Back, Edit, and
  Confirm work by keyboard.
- Derived total changes are announced accessibly without excessive live-region
  noise.
- Errors use `role="alert"`; color is not the only status signal.
- Layouts remain usable at approximately 375px and 1440px.
- Interactive transitions honor reduced-motion preferences.
- Light and dark themes use the existing semantic palette.

## 13. Testing and delivery strategy

Implementation follows `docs/WORKFLOW.md`, backend first and test first.

### 13.1 Database

pgTAP covers:

- enum and generic constraint extensions;
- Production columns, types, nullability, defaults, and checks;
- summarized and composed cost shape constraints;
- exact component-sum enforcement;
- grants and absence of direct mutation privileges;
- SELECT-own RLS with two users and anonymous denial;
- authenticated RPC success for both cost modes;
- same-user idempotency and cross-category UUID rejection;
- atomic rollback when Production detail constraints fail;
- immutable UPDATE and DELETE denial;
- unchanged Service and Product RPC behavior.

### 13.2 Domain and contracts

Tests cover:

- canonical parsing and every validation boundary;
- summarized and composed costs;
- zero components, positive sum, and authoritative server summation;
- component normalization when summarized mode is confirmed;
- owner compensation on and off;
- volume present and absent;
- every formula and rounding direction;
- unavailable minimum and target prices;
- every verdict and priority boundary;
- direct loss taking precedence over missing volume;
- partial price references and sales goals;
- discount simulation from complete and partial bases;
- exact Production snapshot versions, discriminants, ordering, and content;
- parser dispatch for Service V2, Product V1, and Production V1;
- rejection of unsupported and malformed snapshots.

### 13.3 Application and UI

Tests cover:

- Zod validation before authentication;
- authentication before report calculation and persistence;
- safe Action errors;
- RPC argument mapping and response validation;
- Production selection and modality choice;
- disabled Detailed analysis;
- summarized and composed unit-cost paths;
- derived read-only total and composition toggling;
- local component restoration and summarized submission normalization;
- full valid path, progressive errors, Back, and every Review edit;
- absent-volume warning;
- submission lock, retry, reset, and report redirect;
- Production report and report-library presentation;
- keyboard focus, semantic errors, responsive layout, themes, and reduced
  motion;
- complete regression of existing Service and Product wizards and reports.

### 13.4 Required delivery gates

```text
local database reset
→ all pgTAP tests
→ regenerated database types with no unexplained drift
→ database lint and security/performance advisors
→ unit and component tests
→ typecheck
→ application lint
→ production build
```

## 14. Success criteria

The design is complete when a signed-in owner can:

- select Production without changing Service or Product;
- diagnose one manufactured unit using a summarized or composed cost;
- understand which costs were included and avoid direct-labor/pro-labore
  duplication;
- receive a deterministic complete or explicitly partial report;
- safely retry without duplicate reports;
- reopen the immutable Production V1 report from the private library;
- simulate discounts using the persisted calculation base;
- remain protected by Postgres constraints, atomicity, grants, and RLS.
