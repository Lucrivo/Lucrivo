# Quick Diagnosis Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver immutable, server-rendered Service diagnosis reports for Hour, Minute, and Appointment, plus an owned report library and interactive discount simulator.

**Architecture:** A pure Service calculator and versioned content builder produce a runtime-validated `ReportSnapshot`. One restricted Postgres function atomically stores a common `diagnoses` registry row and its typed `service_diagnoses` input row; private SSR routes read the snapshot through RLS and shared report components render the approved guided-dashboard layout.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript 5.9, Zod 4, Supabase JS/SSR 2, PostgreSQL/RLS/pgTAP, Vitest, Testing Library, Base UI/shadcn, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-28-quick-diagnosis-reports-design.md`

## Global Constraints

- Read the approved spec and `docs/QUICK-DIAGNOSIS.md` before starting Task 1.
- Use TDD for every behavior change: failing test, observed failure, minimal implementation, passing test.
- Service target margin is exactly `1500` basis points (15%).
- Currency is BRL; money is stored as integer cents, rates as integer basis points, and time as integer minutes.
- Report units are `hour` for Hour pricing and `appointment` for Minute and Appointment pricing.
- Minute requires positive average duration and computes appointment price as minute price times duration.
- Never use binary floating point for authoritative monetary or percentage calculations.
- Saved snapshots are immutable and contain schema, calculation, and content version `1`.
- Preserve the five approved Portuguese report sections and copy templates from the spec.
- `/reports/[id]` and `/reports` are private SSR routes; only the discount simulator is a Client Component.
- Missing and foreign report IDs must both call `notFound()`.
- `/reports` selects summary columns only and paginates by `(created_at, id)`, never with offset.
- Do not add editing, deletion, cloning, sharing, exporting, AI, or persisted discount state.
- Do not use `service_role`, a Route Handler, an Edge Function, Realtime, Storage, or an external API.
- Public tables use explicit grants and RLS. Browser roles get no direct insert, update, or delete privileges.
- The atomic creation function uses `security definer`, `set search_path = ''`, fully qualified objects, an explicit `auth.uid()` check, and restricted EXECUTE grants.
- Do not invent migration timestamps. Create each migration with the installed CLI after reading `supabase migration new --help`, and use the exact emitted path.
- Run database advisors after adding the function and RLS.
- Each task ends in a coherent commit and a reviewer checkpoint before the next task.

---

## File Structure

| Path                                                                  | Responsibility                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/modules/quick-diagnosis/types.ts`                                | Raw and normalized wizard contracts, including Minute duration.       |
| `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`     | Normalize and validate method-specific Service input.                 |
| `src/modules/quick-diagnosis/components/steps/current-price-step.tsx` | Render price and duration fields by method.                           |
| `src/modules/quick-diagnosis/components/steps/review-step.tsx`        | Review normalized user-facing answers.                                |
| `src/modules/reports/types.ts`                                        | Shared report discriminants and public TypeScript contracts.          |
| `src/modules/reports/schemas/report-snapshot.schema.ts`               | Runtime validation and version gate for persisted JSON.               |
| `src/modules/reports/domain/integer-math.ts`                          | BigInt-backed rounded and ceiling integer division.                   |
| `src/modules/reports/domain/calculate-service-report.ts`              | Pure Service formulas, verdicts, priorities, and goals.               |
| `src/modules/reports/domain/build-service-report-snapshot.ts`         | Exact Portuguese section content and versioned snapshot construction. |
| `src/modules/reports/formatters.ts`                                   | Shared BRL, percentage, volume, date, and scenario formatting.        |
| `src/modules/reports/services/create-service-report.service.ts`       | Call the atomic RPC and translate safe creation outcomes.             |
| `src/modules/reports/services/get-report.service.ts`                  | Select and validate one owned report snapshot.                        |
| `src/modules/reports/services/list-reports.service.ts`                | Keyset-select owned report summaries without JSON.                    |
| `src/modules/reports/presenters/to-report-view-model.ts`              | Convert a validated snapshot into formatted display data.             |
| `src/modules/reports/components/report-detail.tsx`                    | Compose the guided-dashboard report.                                  |
| `src/modules/reports/components/report-summary.tsx`                   | Render verdict, priority, metrics, and price references.              |
| `src/modules/reports/components/report-section-card.tsx`              | Render one semantic report section.                                   |
| `src/modules/reports/components/discount-simulator.tsx`               | Client-only temporary discount calculations and slider.               |
| `src/modules/reports/components/report-list-card.tsx`                 | Render one library summary and detail link.                           |
| `src/modules/reports/components/reports-empty-state.tsx`              | Empty library explanation and new-diagnosis CTA.                      |
| `src/app/(private)/reports/page.tsx`                                  | SSR report library.                                                   |
| `src/app/(private)/reports/loading.tsx`                               | Library skeleton.                                                     |
| `src/app/(private)/reports/error.tsx`                                 | Retryable library boundary.                                           |
| `src/app/(private)/reports/[id]/page.tsx`                             | SSR report detail.                                                    |
| `src/app/(private)/reports/[id]/loading.tsx`                          | Guided-dashboard skeleton.                                            |
| `src/app/(private)/reports/[id]/error.tsx`                            | Retryable detail boundary.                                            |
| `supabase/migrations/*_require_minute_service_duration.sql`           | Update Minute pricing-shape constraint.                               |
| `supabase/migrations/*_create_quick_diagnosis_reports.sql`            | Registry, link, function, indexes, grants, and RLS.                   |
| `supabase/tests/service_diagnoses.test.sql`                           | Minute duration and retained Service integrity tests.                 |
| `supabase/tests/diagnosis_reports.test.sql`                           | Registry, atomic function, privilege, RLS, and pagination tests.      |

---

### Task 1: Make Minute Duration a Valid Service Input

**Files:**

- Modify: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`
- Modify: `src/modules/quick-diagnosis/components/steps/current-price-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/steps/review-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `supabase/tests/service_diagnoses.test.sql`
- Create through CLI: `supabase/migrations/*_require_minute_service_duration.sql`

**Interfaces:**

- Consumes: existing `ServiceDiagnosisInput.appointmentDurationMinutes` and `ServiceDiagnosisCommand.appointmentDurationMinutes`.
- Produces: Minute commands with positive `appointmentDurationMinutes`; no new raw field or database column.

- [ ] **Step 1: Add failing schema tests for Minute duration**

Add tests proving a valid Minute command retains duration and zero/missing duration is attached to `appointmentDurationMinutes`:

```ts
it("requires and preserves duration for minute pricing", () => {
  const parsed = serviceDiagnosisSchema.parse({
    ...validInput,
    pricingMethod: "minute",
    hourlyRate: "",
    minuteRate: "2,50",
    appointmentRate: "",
    appointmentDurationMinutes: "40",
  });

  expect(parsed).toEqual(
    expect.objectContaining({
      pricingMethod: "minute",
      minuteRateCents: 250,
      appointmentDurationMinutes: 40,
    }),
  );
});
```

- [ ] **Step 2: Run the focused schema test and verify red**

Run: `pnpm vitest run src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`

Expected: FAIL because the current transform clears Minute duration.

- [ ] **Step 3: Update normalization and conditional validation**

Change the transform to retain duration for both non-hour methods and change the refinement:

```ts
appointmentDurationMinutes:
  pricingMethod === "minute" || pricingMethod === "appointment"
    ? appointmentDurationMinutes
    : 0,
```

```ts
if (
  (command.pricingMethod === "minute" ||
    command.pricingMethod === "appointment") &&
  command.appointmentDurationMinutes <= 0
) {
  context.addIssue({
    code: "custom",
    path: ["appointmentDurationMinutes"],
    message: "Informe uma duração maior que zero.",
  });
}
```

- [ ] **Step 4: Add failing wizard tests for the Minute field and review**

Extend the existing parameterized method test to expect “Duração média do atendimento” for Minute and Appointment. Add a review assertion for `40 minutos` after completing Minute.

- [ ] **Step 5: Run the wizard test and verify red**

Run: `pnpm vitest run src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

Expected: FAIL because `CurrentPriceStep` only shows duration for Appointment.

- [ ] **Step 6: Render and review duration for both non-hour methods**

Use this condition in `CurrentPriceStep` and `ReviewStep`:

```ts
const requiresDuration = method === "minute" || method === "appointment";
```

Keep the visible label “Duração média do atendimento”. Do not rename the persisted field in this task.

- [ ] **Step 7: Run focused application tests**

Run:

```bash
pnpm vitest run src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Add failing pgTAP cases for the new Minute shape**

Add one valid Minute insert with positive duration and two invalid inserts: zero duration and positive duration on Hour. Keep the existing Appointment cases.

- [ ] **Step 9: Verify the database test is red**

Run:

```bash
pnpm supabase:start
pnpm exec supabase test db supabase/tests/service_diagnoses.test.sql
```

Expected: FAIL because the current constraint requires Minute duration to equal zero.

- [ ] **Step 10: Create and implement the constraint migration**

Run `pnpm exec supabase migration new --help`, then `pnpm exec supabase migration new require_minute_service_duration`. In the emitted file, drop and recreate only `service_diagnoses_pricing_shape_check`; the Minute branch must contain:

```sql
pricing_method = 'minute'
and minute_rate_cents > 0
and appointment_duration_minutes > 0
and hourly_rate_cents = 0
and appointment_rate_cents = 0
```

- [ ] **Step 11: Verify Task 1 and commit**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/service_diagnoses.test.sql
pnpm check
```

Expected: all exit `0`.

Commit: `fix: require duration for minute service pricing`

---

### Task 2: Define the Versioned Report Contract

**Files:**

- Create: `src/modules/reports/types.ts`
- Create: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Create: `src/modules/reports/schemas/report-snapshot.schema.test.ts`

**Interfaces:**

- Consumes: `ServicePricingMethod` from `src/modules/quick-diagnosis/types.ts`.
- Produces: `ReportSnapshot`, `ReportSection`, `ReportTone`, `ReportVerdict`, `ReportPriority`, `ReportUnit`, and `parseReportSnapshot(value)`.

- [ ] **Step 1: Write failing schema tests**

Cover a complete version-1 Service snapshot, wrong `schemaVersion`, missing fifth section, wrong category, and noninteger cents. Use a local `validSnapshot` fixture with the exact five keys:

```ts
const sectionKeys = [
  "break_even",
  "hidden_cost",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
] as const;
```

- [ ] **Step 2: Run the schema test and verify red**

Run: `pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement discriminants and the Zod schema**

Use exact constants:

```ts
const REPORT_SCHEMA_VERSION = 1;
const SERVICE_CALCULATION_VERSION = 1;
const SERVICE_CONTENT_VERSION = 1;

const reportTones = ["neutral", "positive", "warning", "critical"] as const;
const reportVerdicts = [
  "missing_price",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;
const reportPriorities = ["cost", "price", "margin", "volume"] as const;
const reportUnits = ["hour", "appointment"] as const;
```

The snapshot must include integer normalized inputs, integer/nullable results, ordered plain-text sections, and simulator base values. Infer the exported TypeScript type from the Zod schema to prevent drift.

Use this exact structural contract; define each nested object as a named Zod
schema and infer the corresponding exported types:

```ts
type ReportSnapshot = {
  schemaVersion: 1;
  calculationVersion: 1;
  contentVersion: 1;
  category: "service";
  scenario: ServicePricingMethod;
  currency: "BRL";
  unit: "hour" | "appointment";
  policy: {
    targetMarginBasisPoints: 1500;
    weeklyDivisorHundredths: 433;
    maximumDiscountPercent: 50;
    proLaboreIncluded: true;
  };
  inputs: {
    desiredMonthlyIncomeCents: number;
    fixedMonthlyExpensesCents: number;
    monthlyWorkMinutes: number;
    weeklyWorkDays: number;
    hourlyRateCents: number;
    minuteRateCents: number;
    appointmentRateCents: number;
    appointmentDurationMinutes: number;
    taxRateBasisPoints: number;
    cardFeeRateBasisPoints: number;
  };
  results: {
    monthlyCostCents: number;
    hourCostCents: number | null;
    unitCostCents: number | null;
    currentPriceCents: number;
    netRevenueCents: number | null;
    unitProfitCents: number | null;
    realMarginBasisPoints: number | null;
    minimumPriceCents: number | null;
    targetPriceCents: number | null;
    monthlySalesGoal: number | null;
    weeklySalesGoal: number | null;
    dailySalesGoal: number | null;
    breakEvenDiscountPercent: number | null;
    verdict: ReportVerdict;
    priority: ReportPriority;
  };
  sections: ReportSection[];
  discountSimulationBase: {
    originalPriceCents: number;
    unitCostCents: number | null;
    totalFeeBasisPoints: number;
    targetMarginBasisPoints: 1500;
    minimumPriceCents: number | null;
  };
};

type ReportSection = {
  key:
    | "break_even"
    | "hidden_cost"
    | "margin_diagnosis"
    | "sales_goal"
    | "discount_simulator";
  title: string;
  body: string;
  emphasisLabel: string | null;
  emphasisValue: string | null;
  tone: ReportTone;
};
```

Require exactly five sections and add a `superRefine` that compares their keys
by index with `sectionKeys`; duplicate or reordered sections are invalid.

- [ ] **Step 4: Implement a strict parser**

```ts
function parseReportSnapshot(value: unknown): ReportSnapshot {
  return reportSnapshotSchema.parse(value);
}
```

Reject unsupported versions rather than coercing or recalculating them.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run:

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts
pnpm typecheck
```

Expected: PASS.

Commit: `feat: define versioned report snapshot contract`

---

### Task 3: Implement Exact Integer Service Calculations

**Files:**

- Create: `src/modules/reports/domain/integer-math.ts`
- Create: `src/modules/reports/domain/integer-math.test.ts`
- Create: `src/modules/reports/domain/calculate-service-report.ts`
- Create: `src/modules/reports/domain/calculate-service-report.test.ts`

**Interfaces:**

- Consumes: `ServiceDiagnosisCommand`.
- Produces: `calculateServiceReport(command): ServiceReportCalculation` and BigInt-backed `roundDivide`, `ceilDivide`, and `multiplyDivideRound` helpers.

- [ ] **Step 1: Write failing integer-math tests**

Test exact half-up rounding, ceiling division, negative profit rounding, and denominators that reject zero:

```ts
expect(roundDivide(5n, 2n)).toBe(3);
expect(ceilDivide(5n, 2n)).toBe(3);
expect(multiplyDivideRound(1001, 9250, 10000)).toBe(926);
expect(() => ceilDivide(1n, 0n)).toThrow("invalid_denominator");
```

- [ ] **Step 2: Run integer-math tests and verify red**

Run: `pnpm vitest run src/modules/reports/domain/integer-math.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement BigInt-backed helpers**

Convert safe input integers to BigInt before multiplication. Convert back only after checking `Number.MIN_SAFE_INTEGER` through `Number.MAX_SAFE_INTEGER`. Keep rounding behavior documented beside each helper.

- [ ] **Step 4: Write failing calculator golden tests**

Add table-driven cases for:

- the documented Appointment example (`CF=200000`, `PL=400000`, `H=6000`, `D=50`, price `8000`, fees `800`) expecting unit cost `5000`, net revenue `7360`, profit `2360`, margin `2950`, minimum price `5435`, and target price `6494`;
- Hour with the same monthly cost/capacity;
- Minute with `250` cents × `40` minutes producing current appointment price `10000`;
- zero monthly capacity producing nullable cost/price-reference values;
- combined fees at or above 100% producing unavailable minimum and targets;
- verdict tolerance boundaries at target minus 50 basis points and target plus 300 basis points;
- a loss prioritizing price and suppressing sales goals;
- adequate/above-target prioritizing volume.

- [ ] **Step 5: Run calculator tests and verify red**

Run: `pnpm vitest run src/modules/reports/domain/calculate-service-report.test.ts`

Expected: FAIL because `calculateServiceReport` does not exist.

- [ ] **Step 6: Implement method normalization and core formulas**

Use these authoritative denominators:

```ts
const RATE_SCALE = 10_000;
const SERVICE_TARGET_MARGIN_BPS = 1_500;
const netRateBps = RATE_SCALE - taxRateBasisPoints - cardFeeRateBasisPoints;
const targetRateBps = netRateBps - SERVICE_TARGET_MARGIN_BPS;
```

Use ceiling division for minimum/target price and displayed monthly/weekly/daily volume. Use rounded division for unit cost, net revenue, and real margin. Return `null` for results with a nonpositive denominator.

- [ ] **Step 7: Implement verdict and priority as pure functions**

Keep `classifyServiceMargin` and `selectServicePriority` exported for direct boundary tests. Above target means strictly more than `1800` basis points; adequate includes `1450` through `1800`; positive below `1450` is tight.

- [ ] **Step 8: Run all domain tests and commit**

Run:

```bash
pnpm vitest run src/modules/reports/domain
pnpm typecheck
```

Expected: PASS with no `NaN`, `Infinity`, or floating monetary arithmetic.

Commit: `feat: calculate service diagnosis reports`

---

### Task 4: Build Exact Service Report Content

**Files:**

- Create: `src/modules/reports/formatters.ts`
- Create: `src/modules/reports/formatters.test.ts`
- Create: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Create: `src/modules/reports/domain/build-service-report-snapshot.test.ts`

**Interfaces:**

- Consumes: `ServiceDiagnosisCommand` and `ServiceReportCalculation`.
- Produces: `buildServiceReportSnapshot(command, calculation): ReportSnapshot`.

- [ ] **Step 1: Write failing formatter tests**

Lock BRL, percentage, integer volume, scenario, unit, and São Paulo date formatting. Currency examples must include negative and zero values.

- [ ] **Step 2: Implement explicit `pt-BR` formatters**

Create module-level `Intl.NumberFormat` instances. Accept integer cents/basis points; do not accept raw floating money.

- [ ] **Step 3: Write failing snapshot-content tests**

For Hour, Minute, and Appointment fixtures, assert:

- schema/calculation/content version `1`;
- all five section keys in exact order;
- exact Portuguese resolved sentences from Spec section 9.3;
- loss uses `critical`, tight margin uses `warning`, and sustainable pricing uses `positive` where specified;
- sales goal tells a loss-making user to fix price and never recommends more volume;
- simulator section keeps the exact approved title and instruction.

- [ ] **Step 4: Run content tests and verify red**

Run: `pnpm vitest run src/modules/reports/domain/build-service-report-snapshot.test.ts`

Expected: FAIL because the builder does not exist.

- [ ] **Step 5: Implement five focused section builders**

Keep each builder private and deterministic:

```ts
buildBreakEvenSection(calculation);
buildHiddenCostSection(calculation);
buildMarginDiagnosisSection(calculation);
buildSalesGoalSection(calculation);
buildDiscountSimulatorSection(calculation);
```

Assemble them in the fixed order and validate the final object with `parseReportSnapshot` before returning it.

- [ ] **Step 6: Run report-domain tests and commit**

Run:

```bash
pnpm vitest run src/modules/reports
pnpm typecheck
```

Expected: PASS.

Commit: `feat: build service report snapshots`

---

### Task 5: Add Common Report Persistence and Atomic Creation

**Files:**

- Create through CLI: `supabase/migrations/*_create_quick_diagnosis_reports.sql`
- Create: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/service_diagnoses.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: normalized Service values, version-1 JSON snapshot, and denormalized snapshot summary.
- Produces: RPC `create_service_diagnosis_report(...) returns bigint`, table `public.diagnoses`, and `service_diagnoses.diagnosis_id`.

- [ ] **Step 1: Write the failing pgTAP contract**

Test exact registry columns and types, constraints, unique `(user_id, submission_id)`, nullable legacy `service_diagnoses.diagnosis_id`, indexed foreign key, and the composite list index `(user_id, created_at desc, id desc)`.

- [ ] **Step 2: Add privilege, RLS, and function tests**

Assert:

- `anon` cannot select or execute the function;
- `authenticated` can select only owned reports;
- authenticated has no direct insert/update/delete on either table;
- function rejects missing JWT subject;
- function always writes `auth.uid()` as owner;
- valid function call inserts exactly one registry row and one linked Service row;
- invalid Service input rolls back the registry insert;
- repeated `(user_id, submission_id)` returns the first ID and preserves the first snapshot;
- a second user cannot read the first user's report.

- [ ] **Step 3: Run pgTAP and verify red**

Run: `pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql`

Expected: FAIL because the registry and function do not exist.

- [ ] **Step 4: Create the migration with the installed CLI**

Run:

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new create_quick_diagnosis_reports
```

Use the exact emitted filename.

- [ ] **Step 5: Create `public.diagnoses` and indexes**

Implement the spec's common columns with `bigint identity`, `timestamptz`, checked lowercase text, integer summary units, and `jsonb`. Add:

```sql
constraint diagnoses_user_submission_key unique (user_id, submission_id),
constraint diagnoses_snapshot_object_check
  check (jsonb_typeof(report_snapshot) = 'object')
```

Create:

```sql
create index diagnoses_user_created_id_idx
on public.diagnoses (user_id, created_at desc, id desc);
```

- [ ] **Step 6: Link Service inputs without fabricating legacy reports**

Add nullable `diagnosis_id bigint`, a unique constraint, and an indexed foreign key with `on delete restrict`. Existing rows remain null and do not appear in `/reports`; new function writes always set it.

- [ ] **Step 7: Implement the narrow atomic function**

The function accepts no user ID. Start with:

```sql
create function public.create_service_diagnosis_report(
  p_submission_id uuid,
  p_pricing_method public.service_pricing_method,
  p_desired_monthly_income_cents bigint,
  p_fixed_monthly_expenses_cents bigint,
  p_monthly_work_minutes integer,
  p_weekly_work_days smallint,
  p_hourly_rate_cents bigint,
  p_minute_rate_cents bigint,
  p_appointment_rate_cents bigint,
  p_appointment_duration_minutes integer,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
  p_schema_version smallint,
  p_calculation_version smallint,
  p_content_version smallint,
  p_scenario text,
  p_current_price_cents bigint,
  p_real_margin_basis_points integer,
  p_unit_profit_cents bigint,
  p_verdict text,
  p_priority text,
  p_unit text,
  p_report_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_schema_version <> 1
    or p_calculation_version <> 1
    or p_content_version <> 1
    or jsonb_typeof(p_report_snapshot) <> 'object'
    or p_report_snapshot ->> 'category' <> 'service'
  then
    raise exception using errcode = '22023', message = 'invalid report snapshot';
  end if;

  insert into public.diagnoses (
    submission_id, user_id, business_category, scenario,
    schema_version, calculation_version, content_version,
    current_price_cents, real_margin_basis_points, unit_profit_cents,
    verdict, priority, unit, report_snapshot
  ) values (
    p_submission_id, caller_id, 'service', p_scenario,
    p_schema_version, p_calculation_version, p_content_version,
    p_current_price_cents, p_real_margin_basis_points, p_unit_profit_cents,
    p_verdict, p_priority, p_unit, p_report_snapshot
  )
  on conflict (user_id, submission_id) do nothing
  returning id into report_id;

  if report_id is null then
    select id into report_id
    from public.diagnoses
    where user_id = caller_id and submission_id = p_submission_id;
    return report_id;
  end if;

  insert into public.service_diagnoses (
    diagnosis_id, submission_id, user_id, pricing_method,
    desired_monthly_income_cents, fixed_monthly_expenses_cents,
    monthly_work_minutes, weekly_work_days, hourly_rate_cents,
    minute_rate_cents, appointment_rate_cents,
    appointment_duration_minutes, tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id, p_submission_id, caller_id, p_pricing_method,
    p_desired_monthly_income_cents, p_fixed_monthly_expenses_cents,
    p_monthly_work_minutes, p_weekly_work_days, p_hourly_rate_cents,
    p_minute_rate_cents, p_appointment_rate_cents,
    p_appointment_duration_minutes, p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$$;
```

Write every relation as `public.<name>` and every parameter with a `p_` prefix. Validate category/version/JSON consistency before inserting.

- [ ] **Step 8: Apply least privilege and RLS**

Revoke direct writes and sequence use from `anon` and `authenticated`; grant only owned SELECT and authenticated function execution. Revoke function execution from `public` and `anon`. Add `diagnoses_select_own` using `((select auth.uid()) = user_id)`. Retain Service select ownership and remove its direct insert grant/policy because all new writes use the function.

- [ ] **Step 9: Reset, test, lint, and run advisors**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all tests pass and no introduced security/performance warning remains.

- [ ] **Step 10: Regenerate and verify types**

Run `pnpm supabase:types` twice and verify the second run produces no diff.

- [ ] **Step 11: Commit the database milestone**

Commit: `feat: persist versioned diagnosis reports`

---

### Task 6: Integrate Calculation and Persistence into Creation

**Files:**

- Create: `src/modules/reports/services/create-service-report.service.ts`
- Create: `src/modules/reports/services/create-service-report.service.test.ts`
- Modify: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts`
- Modify: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts`
- Remove after callers migrate: `src/modules/quick-diagnosis/services/create-service-diagnosis.service.ts`
- Remove after callers migrate: `src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts`

**Interfaces:**

- Consumes: authenticated typed Supabase client, normalized command, and `ReportSnapshot`.
- Produces: `{ status: "success"; diagnosisId: number } | { status: "error"; error: "create_failed" }`.

- [ ] **Step 1: Write failing RPC service tests**

Mock `.rpc("create_service_diagnosis_report", expectedArgs)` and cover success ID, PostgREST error, null/invalid returned ID, and thrown exception. Assert the RPC args contain normalized inputs, snapshot versions, and denormalized summary but no `user_id`.

- [ ] **Step 2: Implement the RPC service**

Call the generated typed RPC once. Translate every technical failure to `create_failed`; never inspect or expose Postgres messages in UI output.

- [ ] **Step 3: Write failing Server Action orchestration tests**

Assert this exact order by mocks: schema parse → `requireUser` → calculator → snapshot builder → persistence. Cover invalid input short-circuit, unauthenticated, domain construction failure, persistence failure, and success ID.

- [ ] **Step 4: Update the action orchestration**

Keep the raw action result contract stable. Do not redirect inside the Server Action; returning the common ID keeps navigation testable in the wizard.

- [ ] **Step 5: Remove the obsolete direct-insert service**

Delete it only after `rg "createServiceDiagnosisService" src` shows the action tests are the final old references. Confirm no browser role needs direct insert after Task 5.

- [ ] **Step 6: Run focused and full application tests**

Run:

```bash
pnpm vitest run src/modules/reports/services/create-service-report.service.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
pnpm check
```

Expected: PASS.

- [ ] **Step 7: Commit**

Commit: `feat: create calculated service reports`

---

### Task 7: Build the Owned SSR Report Detail

**Files:**

- Create: `src/modules/reports/services/get-report.service.ts`
- Create: `src/modules/reports/services/get-report.service.test.ts`
- Create: `src/modules/reports/presenters/to-report-view-model.ts`
- Create: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Create: `src/modules/reports/components/report-detail.tsx`
- Create: `src/modules/reports/components/report-summary.tsx`
- Create: `src/modules/reports/components/report-section-card.tsx`
- Create: `src/modules/reports/components/report-detail.test.tsx`
- Create: `src/app/(private)/reports/[id]/page.tsx`
- Create: `src/app/(private)/reports/[id]/page.test.tsx`
- Create: `src/app/(private)/reports/[id]/loading.tsx`
- Create: `src/app/(private)/reports/[id]/error.tsx`

**Interfaces:**

- Consumes: owned common report row and `parseReportSnapshot`.
- Produces: `getOwnedReport({ supabase, userId, diagnosisId })` with `found`, `not_found`, `unavailable`, and `read_failed` outcomes; `toReportViewModel({ id, createdAt, snapshot })`; SSR guided dashboard.

- [ ] **Step 1: Write failing detail-service tests**

Assert the query selects `id, business_category, scenario, created_at, report_snapshot`, filters both `id` and `user_id`, and calls `.maybeSingle()`. Cover missing, foreign-as-missing, technical failure, valid snapshot, and malformed snapshot.

- [ ] **Step 2: Implement safe owned detail loading**

Parse path IDs as positive safe integers before querying. Return `unavailable` only when an owned row exists but snapshot validation fails; do not recalculate.

- [ ] **Step 3: Write failing component tests for layout B**

First write presenter tests that lock category/scenario labels, creation date,
summary metrics, nullable-value display as `Indisponível`, price references,
next-action copy from priority, and the five already-resolved sections. Then
write component tests against the returned `ReportViewModel`.

Assert:

- one report heading;
- summary rail contains verdict, priority, price, margin, profit, minimum, and target;
- exactly five report sections in snapshot order;
- “Voltar aos relatórios” links to `/reports`;
- “Novo diagnóstico” links to `/quick-diagnosis`;
- tone is exposed by text/icon and not color alone.

- [ ] **Step 4: Implement focused server components**

Implement `toReportViewModel` as the only formatter between persisted snapshot
and UI. Its return shape contains `identity`, `summary`, `priceReferences`,
`nextActions`, `sections`, and `discountSimulationBase`, matching Spec section
8.2. `ReportDetail` composes the smaller components and receives only this
view model. Use existing Card, Badge, Separator, and Button primitives. Keep
desktop two-column ordering and mobile semantic ordering in the DOM; CSS
changes layout without duplicating content.

- [ ] **Step 5: Write failing page composition tests**

Mock `requireUser`, `getOwnedReport`, `notFound`, and `ReportDetail`. Assert valid composition, `notFound()` for malformed/missing/foreign IDs, unavailable panel for invalid owned snapshot, and thrown read error reaching the route boundary.

- [ ] **Step 6: Implement the SSR route and boundaries**

Make `params` asynchronous per Next.js 16 route typing. `error.tsx` is a Client Component with retry, `/reports`, and `/quick-diagnosis` actions. `loading.tsx` mirrors summary rail plus five cards and uses accessible loading copy.

- [ ] **Step 7: Run detail tests and commit**

Run:

```bash
pnpm vitest run src/modules/reports/services/get-report.service.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-detail.test.tsx 'src/app/(private)/reports/[id]/page.test.tsx'
pnpm typecheck
```

Expected: PASS.

Commit: `feat: render owned diagnosis report details`

---

### Task 8: Add the Accessible Discount Simulator

**Files:**

- Create: `src/modules/reports/components/discount-simulator.tsx`
- Create: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`

**Interfaces:**

- Consumes: immutable `discountSimulationBase` from `ReportSnapshot`.
- Produces: client-only 0–50% simulation with no request or persistence callback.

- [ ] **Step 1: Write failing interaction tests**

Use `fireEvent.change` or keyboard events to assert 0%, 10%, 50%, exact break-even, below-target warning, and loss warning. Assert range label, `aria-valuetext`, live status, and formatted price/profit/margin.

- [ ] **Step 2: Implement a pure simulation helper**

Keep authoritative temporary calculations in integer cents/basis points using Task 3 helpers:

```ts
simulateDiscount(base, discountPercent): DiscountSimulation
```

Clamp input to integers 0 through 50. Return an unavailable state when original or minimum price is null/nonpositive.

- [ ] **Step 3: Implement the Client Component**

Add `"use client"` only to this file. Render the approved title and instruction, native range input, visible percent, current/discounted price, new margin/profit, and an `aria-live="polite"` safety message.

- [ ] **Step 4: Integrate without converting the report to a Client Component**

Pass the serializable simulator base from `ReportDetail`. Verify no parent report component gains `"use client"`.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm vitest run src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-detail.test.tsx
pnpm typecheck
```

Expected: PASS.

Commit: `feat: add report discount simulator`

---

### Task 9: Redirect the Wizard to the Prepared Report

**Files:**

- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Remove: `src/modules/quick-diagnosis/components/diagnosis-success.tsx`

**Interfaces:**

- Consumes: successful common `diagnosisId` from the existing action result.
- Produces: `router.replace(`/reports/${diagnosisId}`)` after one successful submission.

- [ ] **Step 1: Write failing navigation tests**

Mock `next/navigation` and assert:

- success calls `replace("/reports/42")` once;
- double submission still calls creation once;
- pending button reads “Preparando relatório...” and stays disabled;
- invalid/input/retryable failures do not navigate and preserve answers;
- a successful idempotent retry navigates to the original ID.

- [ ] **Step 2: Run the wizard test and verify red**

Run: `pnpm vitest run src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

Expected: FAIL because the wizard renders `DiagnosisSuccess`.

- [ ] **Step 3: Replace success state with navigation**

Use `useRouter`. On action success, keep the submission lock active and call `router.replace`. Do not reset state before navigation and do not call `router.refresh()`.

- [ ] **Step 4: Remove the obsolete success component**

Delete its file and tests/references only after `rg "DiagnosisSuccess" src` shows no remaining consumer.

- [ ] **Step 5: Run focused/full tests and commit**

Run:

```bash
pnpm vitest run src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
pnpm check
```

Expected: PASS.

Commit: `feat: redirect completed diagnoses to reports`

---

### Task 10: Build the SSR Report Library and Navigation

**Files:**

- Create: `src/modules/reports/services/list-reports.service.ts`
- Create: `src/modules/reports/services/list-reports.service.test.ts`
- Create: `src/modules/reports/components/report-list-card.tsx`
- Create: `src/modules/reports/components/reports-empty-state.tsx`
- Create: `src/modules/reports/components/report-library.test.tsx`
- Create: `src/app/(private)/reports/page.tsx`
- Create: `src/app/(private)/reports/page.test.tsx`
- Create: `src/app/(private)/reports/loading.tsx`
- Create: `src/app/(private)/reports/error.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`

**Interfaces:**

- Consumes: common diagnosis summary columns and optional opaque cursor.
- Produces: `listOwnedReports({ supabase, userId, cursor, pageSize })`, encoded next cursor, SSR cards, empty state, and `/reports` sidebar entry.

- [ ] **Step 1: Write failing cursor and list-service tests**

Use page size `12`. Assert selection excludes `report_snapshot`, filters `user_id`, orders `created_at` then `id` descending, fetches `13`, and applies tuple-equivalent keyset filters. Test stable cursor round-trip, malformed cursor falling back to first page, and `nextCursor` only when 13 rows arrive.

- [ ] **Step 2: Implement opaque cursor helpers**

Encode a JSON tuple `{ createdAt: string, id: number }` with base64url and validate it with Zod before use. Do not accept arbitrary query fragments.

- [ ] **Step 3: Implement summary-only selection**

Select exactly:

```text
id, business_category, scenario, created_at, current_price_cents,
real_margin_basis_points, unit_profit_cents, verdict, priority, unit
```

Return safe `read_failed` without exposing PostgREST details.

- [ ] **Step 4: Write failing library component tests**

Assert category/scenario/date, price/margin/verdict, `/reports/{id}`, empty state, new-diagnosis CTA, and next-page link preserving the opaque cursor.

- [ ] **Step 5: Implement cards and empty state**

Use semantic list markup, existing design primitives, and visible verdict text. Do not add delete or AI buttons.

- [ ] **Step 6: Write failing page and sidebar tests**

Mock auth/list service and cover populated, empty, next cursor, malformed cursor, and read failure. Add sidebar expectations for label “Relatórios”, href `/reports`, and active state for both `/reports` and `/reports/42`.

- [ ] **Step 7: Implement SSR page, boundaries, and sidebar entry**

Use `searchParams` asynchronously. Add a `FileChartColumnIcon` sidebar item. Keep “Diagnóstico rápido” unchanged and use `pathname.startsWith("/reports")` for active report routes.

- [ ] **Step 8: Run focused tests and commit**

Run:

```bash
pnpm vitest run src/modules/reports/services/list-reports.service.test.ts src/modules/reports/components/report-library.test.tsx 'src/app/(private)/reports/page.test.tsx' src/components/layout/app-sidebar.test.tsx
pnpm check
```

Expected: PASS.

Commit: `feat: add saved diagnosis report library`

---

### Task 11: Full Verification, Accessibility, and Release Readiness

**Files:**

- Modify only when a check finds an in-scope defect: files created or modified in Tasks 1–10.
- Update: `docs/superpowers/plans/2026-08-28-quick-diagnosis-reports.md` checkbox state and verification notes.

**Interfaces:**

- Consumes: the complete Service report vertical slice.
- Produces: verified migration, database types, production build, and manual smoke evidence.

- [ ] **Step 1: Run complete database verification**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all exit `0`, the second type generation is clean, and no introduced advisor warning remains.

- [ ] **Step 2: Run complete application verification**

Run:

```bash
pnpm check
pnpm build
```

Expected: 100% pass and production build exit `0`.

- [ ] **Step 3: Perform authenticated functional smoke checks**

Using the local stack and app, complete Hour, Minute, and Appointment diagnoses. For each, verify redirect, immediate SSR content, refresh persistence, exact section order, back-to-library navigation, and card appearance.

- [ ] **Step 4: Perform security smoke checks**

Verify user A cannot open user B's ID, direct authenticated inserts/updates/deletes fail, anonymous function execution fails, and an idempotent retry returns the original ID.

- [ ] **Step 5: Perform responsive and accessibility checks**

Check 320px, 768px, and desktop widths; 200% browser zoom; keyboard-only flow; visible focus; slider arrows/Home/End; reduced motion; dark and light themes; and screen-reader headings/status announcements.

- [ ] **Step 6: Record evidence and commit only in-scope fixes**

Add concise verification notes beneath this task. If checks required code fixes, rerun the failed focused test and both full verification sequences before committing.

Final commit when needed: `fix: harden quick diagnosis reports`

---

## Phase Checkpoints

- **Checkpoint A — after Task 1:** Minute input is correct end to end; no report behavior exists yet.
- **Checkpoint B — after Task 4:** all three Service scenarios produce deterministic, versioned snapshots without database or UI dependencies.
- **Checkpoint C — after Task 6:** creation atomically persists inputs and report snapshots and returns common IDs.
- **Checkpoint D — after Task 9:** an end user completes a diagnosis and lands on the full SSR report.
- **Checkpoint E — after Task 10:** users can reopen their reports from the owned library.
- **Checkpoint F — after Task 11:** the complete Service report feature is release-ready.
