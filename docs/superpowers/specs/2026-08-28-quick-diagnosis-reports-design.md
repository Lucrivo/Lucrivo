# Quick Diagnosis Reports Design

**Date:** 2026-08-28

**Status:** Approved for implementation planning

**Related business rules:** `docs/QUICK-DIAGNOSIS.md`

**Related diagnosis design:** `docs/superpowers/specs/2026-08-27-quick-diagnosis-design.md`

## 1. Purpose

Turn a completed quick diagnosis into a durable, server-rendered financial
report that answers:

1. Is this sale or service making money?
2. Does the current price cover the operation and the target margin?
3. Should the owner correct cost, price, margin, or sales volume first?

The first delivery covers the complete Service category for hourly,
per-minute, and per-appointment pricing. Product and Production follow as
separate vertical deliveries that reuse the report contracts and visual
components.

## 2. Decisions

- A successful diagnosis redirects to a dedicated `/reports/[id]` route.
- `/reports/[id]` is server-rendered and reopens an immutable saved report.
- `/reports` is the server-rendered library of the signed-in user's reports.
- Saved reports keep a versioned snapshot so later rule changes do not alter
  their results.
- The report uses the approved guided-dashboard layout: a decision summary
  beside a narrative explanation on desktop and a single ordered flow on
  mobile.
- Existing prototype copy and its five report sections are preserved.
- Only the discount simulator is interactive; its changes are not persisted.
- Saved diagnoses cannot be edited or deleted in this delivery.
- “New diagnosis” links back to `/quick-diagnosis` from list and detail pages.
- AI interpretation is outside this delivery. A future AI feature receives a
  completed snapshot and never performs the authoritative calculations.

## 3. Delivery strategy

The product grows by business category, but the implementation is not copied
category by category. It uses a small common report core plus category
adapters:

```text
Category-specific input
        ↓
Category calculator
        ↓
Versioned ReportSnapshot
        ↓
Common ReportViewModel
        ↓
Shared report detail and library components
```

Only proven common concepts enter the core. The first adapter is Service and
contains all three Service pricing methods. Product and Production later add
their own input persistence, calculator, and content adapter while producing
the same snapshot contract.

This avoids both extremes: duplicating an entire report for each category and
building a speculative universal calculation engine before the later rules
are implemented.

## 4. Scope

### 4.1 Included

- Correct the per-minute wizard path to collect and persist average service
  duration.
- Pure Service calculations for hour, minute, and appointment.
- Margin verdict and correction-priority rules.
- Exact report content generation for all Service result states.
- Versioned report snapshot persistence.
- A common diagnosis registry for cross-category report identity and listing.
- Atomic, idempotent creation of the registry row and Service input row.
- SSR report detail and report library routes.
- Guided-dashboard report UI and responsive mobile flow.
- Client-side discount simulation from immutable snapshot values.
- Loading, empty, unavailable, and not-found states.
- Ownership enforcement through authentication, grants, and RLS.
- Automated database, domain, route, component, and accessibility coverage.

### 4.2 Excluded

- Product and Production calculators or input flows.
- AI interpretation.
- Editing, cloning, deleting, sharing, or exporting a report.
- Persisting discount simulations.
- User-configurable target margin. Service continues to use 15%.
- A pro-labore on/off control. The current desired monthly income is included
  as pro-labore in the Service calculation.
- Detailed fixed-expense entry and the post-result additional fields described
  in the business-rules document.
- Comparison between reports or historical trend charts.

## 5. Routes and navigation

### 5.1 `/quick-diagnosis`

The existing wizard remains the creation entry point. On confirmation:

1. The client submits the raw answers and stable submission ID.
2. The Server Action authenticates and validates the request.
3. The Service calculator and content builder create the snapshot.
4. Persistence returns the common diagnosis ID.
5. The client replaces the success card with navigation to `/reports/[id]`.

While confirmation and navigation are pending, the review button stays locked
and communicates that the report is being prepared. A retry keeps the same
submission ID and cannot create a duplicate report.

### 5.2 `/reports/[id]`

This private Server Component:

- verifies the user with the existing server-side auth boundary;
- selects one owned diagnosis by common ID;
- validates the JSON snapshot at the application boundary;
- builds the presentation model and renders the report in the initial HTML;
- calls `notFound()` for a missing or non-owned ID, making those cases
  indistinguishable;
- renders a safe unavailable state if a row exists but its snapshot version is
  unsupported or malformed.

`loading.tsx` provides immediate route-transition feedback. It mirrors the
final layout closely enough to avoid a large layout shift.

### 5.3 `/reports`

This private Server Component selects only common summary columns, not the
full JSON snapshots. It shows newest reports first and supports keyset
pagination using `(created_at, id)` as the cursor.

Each card contains:

- category and pricing scenario;
- creation date and time;
- current price;
- real margin;
- short verdict;
- “View report” action.

The page header contains “New diagnosis”. The empty state explains that saved
diagnoses will appear there and provides the same action.

## 6. Service input correction

The business rules require average duration whenever the Service method is not
simply hourly. The current minute path stores a per-minute price but clears the
duration, which prevents correct per-appointment price, profit, capacity, and
sales-target calculations.

The current-price step therefore behaves as follows:

| Pricing method | Required fields                                    |
| -------------- | -------------------------------------------------- |
| Hour           | Hourly price                                       |
| Minute         | Per-minute price and average appointment duration  |
| Appointment    | Appointment price and average appointment duration |

The existing `appointment_duration_minutes` database column is reused as the
average service duration for both Minute and Appointment. The pricing-shape
constraint changes so Minute requires a positive duration instead of forcing
it to zero. Switching methods still clears irrelevant values.

## 7. Calculation architecture

### 7.1 Boundaries

The domain layer has no React, Next.js, Supabase, locale formatting, or browser
dependency.

```text
ServiceDiagnosisCommand
        ↓
calculateServiceDiagnosis(command, policy)
        ↓
ServiceCalculationResult
        ↓
buildServiceReportSnapshot(result, contentPolicy)
        ↓
ReportSnapshot
```

The calculator returns semantic numbers and classifications. The content
builder turns those semantics into the approved Portuguese copy and five
sections. UI components receive a `ReportViewModel` derived from the validated
snapshot and never implement financial rules.

### 7.2 Fixed Service policy

- Target margin: 15%.
- Currency: BRL.
- Weekly divisor: 4.33.
- Discount range: 0% through 50%.
- Desired monthly income is included in monthly Service cost as pro-labore.
- All persisted money remains integer cents.
- All persisted percentages remain integer basis points.
- All persisted time remains integer minutes.
- Intermediate rational calculations avoid binary floating-point drift.
- Display rounding happens after the authoritative calculation, not between
  formula steps.

### 7.3 Common Service calculations

Let:

- `CF` be monthly fixed expenses;
- `PL` be desired monthly income/pro-labore;
- `H` be billable monthly minutes;
- `D` be average appointment duration in minutes;
- `T` be tax plus card fee as a fraction;
- `M` be the 15% target margin.

The common base is:

```text
monthlyCost = CF + PL
costPerMinute = monthlyCost / H
```

If billable capacity is zero, divisions that require capacity are represented
as unavailable instead of infinity or `NaN`. The content builder explains that
billable capacity must be informed before those references are useful.

### 7.4 Hour

```text
unit = hour
unitCost = costPerMinute × 60
currentUnitPrice = hourlyPrice
monthlyCapacity = H / 60
```

### 7.5 Appointment

```text
unit = appointment
unitCost = costPerMinute × D
currentUnitPrice = appointmentPrice
monthlyCapacity = H / D
```

### 7.6 Minute

The user charges a per-minute rate, but the report unit is an appointment as
defined by the business rules:

```text
unit = appointment
unitCost = costPerMinute × D
currentUnitPrice = perMinutePrice × D
monthlyCapacity = H / D
```

### 7.7 Price, profit, margin, and targets

For the method-specific unit:

```text
netRevenue = currentUnitPrice × (1 - T)
unitProfit = netRevenue - unitCost
realMargin = unitProfit / currentUnitPrice
minimumPrice = unitCost / (1 - T)
targetPrice = unitCost / (1 - T - M)
requiredRevenue = monthlyCost / (1 - T)
monthlySalesGoal = requiredRevenue / currentUnitPrice
weeklySalesGoal = monthlySalesGoal / 4.33
dailySalesGoal = weeklySalesGoal / weeklyWorkDays
breakEvenDiscount = 1 - (minimumPrice / currentUnitPrice)
```

Target volumes shown to users are rounded upward. Invalid denominators produce
an unavailable value and an explanatory section rather than a fabricated
number.

### 7.8 Verdict and priority

The calculator implements the exact tolerance rules in `QUICK-DIAGNOSIS.md`:

- missing price;
- direct or operational loss;
- tight margin;
- adequate margin, including up to 0.5 percentage point below target;
- above target only when more than 3 percentage points over target.

Service loss prioritizes price. Positive margin below target prioritizes
margin. Adequate or above-target Service prioritizes volume. Although direct
cost priority is primarily a Product concept, the common contract reserves
`cost` so Product can use it later.

If the current unit loses money, the sales-goal section does not recommend
selling more. It first instructs the owner to correct price.

## 8. Snapshot and presentation contracts

### 8.1 Snapshot principles

`ReportSnapshot` is a discriminated, runtime-validated JSON contract. It
contains no React nodes or preformatted HTML. It stores:

- `schemaVersion`;
- `calculationVersion`;
- `contentVersion`;
- category and pricing scenario;
- creation policy, currency, unit, and target margin;
- normalized calculation inputs needed to explain the result;
- authoritative numeric results;
- verdict and priority;
- the five ordered content sections with approved plain-text copy, highlighted
  values, and semantic tone;
- immutable base parameters required by the discount simulator.

Persisting the resolved plain-text sections prevents later content changes
from silently rewriting old reports. Persisting the semantic numbers lets the
UI format currency and percentages accessibly and lets the discount simulator
recalculate its temporary state.

### 8.2 Common presentation model

The shared `ReportViewModel` exposes:

```text
identity
summary
priceReferences
nextActions
sections[5]
discountSimulationBase
```

Each section has a stable key, sequence, title, body, optional emphasis, and
tone (`neutral`, `positive`, `warning`, or `critical`). Category components
cannot add arbitrary layout instructions to the snapshot. This keeps the
visual hierarchy coherent while allowing category-specific content.

## 9. Detail-page experience

### 9.1 Desktop

The approved guided dashboard uses two columns:

- a compact summary rail containing the verdict, priority, key metrics, price
  references, and next actions;
- a wider narrative column containing the five ordered prototype sections.

The summary rail may remain visible while the user reads when viewport height
and reduced-motion preferences allow it. It is not a separate navigation
requirement.

### 9.2 Mobile

The layout becomes one semantic sequence:

1. page title and actions;
2. verdict summary;
3. key price references;
4. five report sections;
5. final actions.

No horizontally scrolling financial table is used. Currency values use
tabular numerals and remain readable at 200% zoom.

### 9.3 Preserved prototype sections

The detail page keeps these names and their existing business meaning:

1. `1 · Ponto de equilíbrio`
2. `2 · A conta que ninguém faz`
3. `3 · Diagnóstico da margem`
4. `Meta de vendas`
5. `Simulador de desconto`

The content builder selects the matching approved prototype wording for the
calculated state. Visual components may improve grouping, spacing, color,
icons, and value emphasis but do not rewrite those messages.

The first content version locks these templates:

- Point of equilibrium: `Abaixo de {minimumPrice} por {unit} você vende no
prejuízo.` The follow-up says whether `Seu preço de {currentPrice}` covers
  the cost.
- The hidden calculation: `Só {billableHours}h/mês são realmente pagas — é
sobre elas que caem seus custos. Por isso a hora custa {hourCost}, não o que
você imagina. É com esse número que a conta fecha.` It highlights current
  profit using the method-specific report unit.
- Margin diagnosis uses the fixed verdict labels `Informe o preço`, `Preço não
cobre a operação`, `Margem apertada`, `Margem adequada`, or `Acima da meta`
  and the corresponding explanation from the business-rule verdict table.
- Sales target begins with `Para cobrir seus custos fixos (pró-labore
incluído)` and shows rounded monthly, weekly, and daily volumes when price is
  sustainable. In a loss state it instructs the user to correct price first.
- Discount simulator keeps `Quanto de desconto eu consigo dar sem destruir
minha margem?` and `Arraste e veja o preço, a margem e o lucro mudarem — e
onde está o seu limite.` Its status copy changes at the target-margin and
  break-even boundaries.

Formatting substitutions never become free-form HTML. Snapshot tests lock the
resolved Portuguese sentences for representative Hour, Minute, and
Appointment results.

### 9.4 Discount simulator

The simulator is a focused Client Component inside the SSR page. It accepts
only the immutable simulation base from the snapshot. It recalculates current
discounted price, unit profit, real margin, and safety message for 0% through
50%.

It provides:

- an associated label and numeric output for the range control;
- keyboard operation;
- immediate status text that does not rely on color alone;
- safe handling when the original price or minimum price is unavailable;
- no network request and no persistence.

## 10. Persistence design

### 10.1 Common registry

Add `public.diagnoses` as the common identity and list projection for all
categories. It uses a `bigint generated always as identity` primary key and
contains:

- `id`;
- `submission_id`;
- `user_id` referencing `auth.users(id)` with cascade on user deletion;
- `business_category`;
- `scenario` as a checked lowercase text value;
- calculation, content, and snapshot schema versions;
- denormalized list fields: current price, real margin, unit profit, verdict,
  priority, and unit;
- `report_snapshot jsonb`;
- `created_at timestamptz`.

The snapshot JSON is not indexed because no list or ownership query filters
inside it. Common summary columns prevent `/reports` from reading or filtering
the JSON payload.

Constraints enforce nonnegative versions, valid common enums/check values,
JSON object shape at the coarse database level, and uniqueness of
`(user_id, submission_id)`.

### 10.2 Category inputs

`public.service_diagnoses` remains the typed Service-input table. It receives a
unique, indexed `diagnosis_id` foreign key to `public.diagnoses(id)`. Existing
money, percentage, duration, method-shape, user ownership, and submission
constraints remain defense in depth.

Pre-report legacy Service rows have no report snapshot and do not appear in
`/reports`; no historical report existed for them to reopen. The migration
retains those input rows rather than fabricating results under a new rules
version. All post-launch Service writes require a common diagnosis row.

### 10.3 Listing index and pagination

The principal access path is:

```text
where user_id = current user
  and (created_at, id) < cursor
order by created_at desc, id desc
limit pageSize + 1
```

Use a composite B-tree index on `(user_id, created_at desc, id desc)`. The
equality/RLS column comes first and the range/order columns follow. Pagination
uses an opaque cursor containing both `created_at` and `id`, never an offset.

### 10.4 Atomic and idempotent creation

Calculation and snapshot validation finish in the application before the
database call, keeping the database transaction short. One Postgres function
then inserts the common diagnosis and Service-input row in the same
transaction and returns the common diagnosis ID.

Direct insert, update, and delete privileges remain unavailable on both
tables. The function is the narrow write API. Because this controlled atomic
write must insert into both protected tables, it uses `security definer` with
all of these safeguards:

- fixed empty `search_path` and fully qualified object names;
- caller identity obtained from `(select auth.uid())`, never accepted as a
  parameter;
- immediate rejection when the caller is unauthenticated;
- no `service_role` usage in the application;
- execution revoked from `public` and `anon` and granted only to
  `authenticated`;
- arguments contain normalized inputs and validated snapshot data but no
  owner ID;
- ownership is written from the verified caller inside the function;
- duplicate `(user_id, submission_id)` returns the already-owned report ID
  without updating its immutable snapshot;
- database tests cover direct calls, privilege boundaries, cross-user access,
  idempotency, and rollback when either insert fails;
- database advisors run after the migration.

The function lives in the exposed schema only because it is called through the
Supabase Data API. Restrictive execution grants and the explicit identity check
are therefore mandatory.

### 10.5 RLS and grants

RLS is enabled on every new or changed public table. Select policies target
`authenticated` and use `((select auth.uid()) = user_id)`. The indexed
`user_id` column supports the ownership predicate.

`authenticated` receives only the SELECT access required for report detail
and listing plus EXECUTE on the controlled creation function. `anon` receives
no table, sequence, or function access. No update or delete policy is added.

The migration uses explicit grants because current Supabase Data API settings
may not expose new public tables automatically.

## 11. Application data flow

```text
Browser review
  → createServiceDiagnosis Server Action
  → require verified user
  → validate and normalize raw input
  → calculate Service result
  → build and runtime-validate ReportSnapshot
  → call atomic creation function
  → return common report ID
  → router.replace(/reports/[id])

/reports/[id] Server Component
  → require verified user
  → select owned common diagnosis
  → validate snapshot version and shape
  → create ReportViewModel
  → SSR shared report components
  → hydrate only DiscountSimulator

/reports Server Component
  → require verified user
  → select owned summary columns with keyset cursor
  → SSR report cards or empty state
```

## 12. Error handling

### 12.1 Creation

- Invalid input returns field errors mapped to the earliest wizard step.
- Calculation or snapshot construction failure remains on Review and shows a
  generic retryable message.
- Database failure rolls back both rows, keeps all answers, and keeps the same
  submission ID.
- A duplicate retry returns the original owned report ID and redirects to it.
- Technical Postgres or Supabase details never reach the browser.

### 12.2 Detail route

- Missing or non-owned ID: `notFound()`.
- Malformed path ID: `notFound()`.
- Unsupported or malformed owned snapshot: stable unavailable panel with
  navigation back to `/reports` and “New diagnosis”. It is not silently
  recalculated.
- Transient read failure: route error boundary with retry and safe navigation.

### 12.3 Library route

- No results: purpose-built empty state.
- Malformed cursor: ignore it and render the first page rather than exposing a
  parsing error.
- Transient read failure: page error boundary with retry.

## 13. Accessibility and interaction

- The report has one page-level heading and ordered section headings.
- The initial redirected report heading receives a sensible browser focus
  target without unexpected scrolling.
- Verdict and simulator states use text and iconography, not color alone.
- All monetary values have readable labels and locale-formatted visible text.
- The slider exposes its label, current percentage, minimum, maximum, and
  keyboard controls.
- Focus indicators use the existing design system.
- Loading placeholders are not announced as completed values.
- Motion honors `prefers-reduced-motion`.
- Desktop, tablet, narrow mobile, 200% zoom, and keyboard-only navigation are
  acceptance targets.

## 14. Testing strategy

### 14.1 Domain tests

- Golden examples from `QUICK-DIAGNOSIS.md`.
- Hour, minute, and appointment calculations.
- Exact cent and basis-point rounding.
- Zero capacity, zero work days, excessive combined rates, and invalid target
  denominators.
- Loss, tight, adequate, and above-target tolerance boundaries.
- Priority selection and the rule that loss never recommends more volume.
- Exact approved content for every Service state.
- Snapshot schema/version compatibility.
- Discount results at 0%, 50%, and the break-even boundary.

### 14.2 Database tests

- Registry shape, types, constraints, and indexes.
- Indexed foreign key from Service inputs.
- Existing Service constraints, including duration required for Minute.
- Explicit privileges and absence of update/delete/direct insert.
- Anonymous denial.
- Authenticated ownership isolation for list and detail reads.
- Creation-function identity handling and restricted execution.
- Atomic rollback when the second insert is invalid.
- Idempotent retry returns the original report without mutation.
- Keyset list query shape and deterministic ordering.

### 14.3 Application tests

- Action authentication, input validation, calculator invocation, safe errors,
  and returned report ID.
- Wizard Minute duration, review display, pending copy, retry, and redirect.
- Detail page SSR composition, owned report, missing report, foreign report,
  malformed snapshot, and unsupported version.
- Library cards, ordering, cursor pagination, empty state, and new-diagnosis
  actions.
- Shared report component rendering for all tones and optional values.
- Discount simulator keyboard and live-status behavior.
- Responsive structure and accessible names.

## 15. Delivery phases and checkpoints

### Phase 0 — Service input readiness

Add Minute duration across wizard, schema, persistence constraint, review, and
tests. No report route ships in this phase.

### Phase 1 — Deterministic Service domain

Implement pure calculations, verdict/priority logic, content builder, snapshot
schema, and exhaustive tests for all three Service methods.

### Phase 2 — Versioned persistence

Add the common registry, Service link, indexes, grants, RLS, atomic creation
function, generated types, and database tests. Update the Server Action to save
the validated snapshot and return the common ID.

### Phase 3 — Report detail vertical slice

Implement `/reports/[id]`, loading/error/not-found states, guided-dashboard
components, discount simulator, and post-confirmation redirect. This is the
first end-user-complete report milestone.

### Phase 4 — Report library

Implement `/reports`, summary cards, cursor pagination, empty state, sidebar
navigation for “Relatórios”, and CTAs.

### Phase 5 — Hardening and release

Run the full database and application verification matrix, responsive and
keyboard checks, build verification, migration/advisor checks, and staging
smoke tests for each Service method.

### Later category phases

Product comes next, followed by Production. Each category gets its own focused
specification and plan covering its wizard inputs, typed persistence,
calculator, snapshot adapter, exact content, and test fixtures. Shared report
components change only when a genuinely new cross-category presentation need
is proven.

## 16. Verification sequence

Implementation plans must use the repository's installed CLI and discover
commands with `--help` before migrations. The final local verification includes:

```text
Supabase database reset
All pgTAP database tests
Generated database types with a clean second generation
Database lint and advisors
Application tests, typecheck, lint, and formatting
Production build
Manual responsive, keyboard, and redirect smoke checks
```

The April 2026 Supabase Data API exposure change is addressed with explicit
grants. No current changelog breaking change requires another design change
for this feature.

## 17. Rollout and rollback

The schema change is additive and reaches staging first. Report navigation
stays hidden until all phases through Report Detail are ready. Legacy
pre-report Service rows remain untouched and invisible in `/reports`.

Application rollback removes the redirect and report navigation while leaving
additive registry and snapshot rows unused. Data or database-object deletion
requires a separate forward migration and explicit authorization.

## 18. Acceptance criteria

- A valid saved Service diagnosis produces exactly one immutable, versioned
  report.
- Hour, minute, and appointment reports match the documented formulas and
  approved texts.
- Minute requires and uses average appointment duration.
- Successful confirmation redirects to a server-rendered `/reports/[id]`.
- The detail page uses the guided-dashboard hierarchy and the five preserved
  prototype sections.
- The report remains viewable after refresh and is unchanged by later rule or
  copy versions.
- The discount simulator works without mutating or requesting the server.
- `/reports` lists only the current user's reports newest first without loading
  full snapshots.
- Missing and foreign report IDs are indistinguishable to the requester.
- Direct insert, update, and delete remain unavailable to browser roles.
- Creation is atomic, owner-bound, and idempotent.
- Both list and detail offer “New diagnosis”.
- No delete, edit, AI, export, or sharing capability appears.
- Automated checks and the manual accessibility/responsive matrix pass before
  release.
