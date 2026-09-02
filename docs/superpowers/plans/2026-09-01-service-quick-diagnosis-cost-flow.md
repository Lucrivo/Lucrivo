# Service Quick Diagnosis Cost Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the Service quick diagnosis so billable capacity can be entered per day, week, or month and direct material cost is included in price, margin, contribution, and volume calculations.

**Architecture:** Preserve the Service vertical and add a deterministic capacity normalizer, a direct-unit-cost input, Service V3 snapshots, and additive normalized columns. New reports use calculation V2/content V3 while the reader retains the immutable Service V2 contract.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Zod 4, Supabase JS/SSR 2, PostgreSQL 17/RLS/pgTAP, Vitest, Testing Library, Base UI/shadcn, and Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-01-service-quick-diagnosis-cost-flow-design.md`

## Global Constraints

- Product V1 and Production V1 remain unchanged.
- New Service reports are exactly `schemaVersion: 3`, `calculationVersion: 2`, and `contentVersion: 3`; historical Service V2 remains exactly `2/1/2` and is read without recalculation.
- Service target margin remains 15% (`1_500` basis points), lower tolerance `50` basis points, above-target begins strictly above 18%, weekly divisor is `4.33`, and maximum discount is `50%`.
- Money is safe integer cents, percentages are basis points, time is integer minutes, and authoritative arithmetic uses `BigInt`-backed helpers.
- Work period is `day`, `week`, or `month`, capped at 24, 168, or 744 hours respectively. Monthly capacity is capped at 44,640 minutes.
- Monthly capacity is raw monthly minutes, rounded `raw × 4.33` weekly minutes, or rounded `raw × weekly days × 4.33` daily minutes.
- Billable hours exclude administration, study, travel, and idle time. Weekly days enter cost only to normalize a daily capacity; otherwise they only produce the daily goal.
- Hour pricing uses material cost per billed hour. Minute and appointment pricing use material cost per complete appointment.
- Disabled material cost clears and normalizes to zero. Enabled material cost requires a positive value.
- Structure cost is `(pro-labore + fixed expenses)` allocated by capacity. Material is never allocated by capacity.
- Contribution is net price after tax/card minus material. Monthly goal is fixed monthly cost divided by positive contribution, rounded up.
- Non-positive contribution is `direct_loss`/`cost`; positive contribution with non-positive allocated profit is `operational_loss`/`price`.
- New code parses Service V2 and V3 but creates only V3. Saved reports are immutable.
- The Service RPC requires `auth.uid()`, uses `SECURITY DEFINER`, fixes `search_path = ''`, fully qualifies relations, and grants execution only to `authenticated`.
- Database work uses an imperative migration created by `supabase migration new`; generated database types are never hand-edited.
- Each task follows TDD and ends in one coherent commit. Do not edit environment files, use service-role credentials, or run remote migrations.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/modules/quick-diagnosis/types.ts` | Service raw input, normalized command, work-period contracts. |
| `src/modules/quick-diagnosis/schemas/service-work-capacity.ts` | Parse period hours and normalize monthly capacity. |
| `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts` | Conditional material validation and command normalization. |
| `src/modules/reports/domain/calculate-service-report.ts` | Structure/direct cost, contribution, prices, goal, and verdict. |
| `src/modules/reports/schemas/service-report-snapshot.schema.ts` | Legacy Service V2 and current V3 contracts. |
| `src/modules/reports/schemas/report-snapshot.schema.ts` | Root parser accepting both Service versions. |
| `src/modules/reports/domain/build-service-report-snapshot.ts` | Service V3 content, inputs, results, and simulator base. |
| `supabase/migrations/*_refine_service_diagnosis_cost_flow.sql` | Additive columns, constraints, backfill, and revised RPC. |
| `src/infrastructure/database/supabase/database.types.ts` | Generated table, enum, and RPC types. |
| `src/modules/quick-diagnosis/components/service/**` | Period/material state, steps, review, validation, and progress. |
| `docs/QUICK-DIAGNOSIS.md` | Shipped Service questions and formulas. |

## Shared Contracts

```ts
const serviceWorkPeriods = ["day", "week", "month"] as const;
type ServiceWorkPeriod = (typeof serviceWorkPeriods)[number];

type ServiceDiagnosisInput = {
  submissionId: string;
  pricingMethod: string;
  desiredMonthlyIncome: string;
  fixedMonthlyExpenses: string;
  workHoursPeriod: string;
  workHours: string;
  weeklyWorkDays: string;
  hourlyRate: string;
  minuteRate: string;
  appointmentRate: string;
  appointmentDurationMinutes: string;
  hasMaterialCost: boolean;
  materialUnitCost: string;
  taxRate: string;
  cardFeeRate: string;
};

type ServiceDiagnosisCommand = {
  submissionId: string;
  pricingMethod: ServicePricingMethod;
  desiredMonthlyIncomeCents: number;
  fixedMonthlyExpensesCents: number;
  workHoursPeriod: ServiceWorkPeriod;
  workPeriodMinutes: number;
  monthlyWorkMinutes: number;
  weeklyWorkDays: number;
  hourlyRateCents: number;
  minuteRateCents: number;
  appointmentRateCents: number;
  appointmentDurationMinutes: number;
  materialUnitCostCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};
```

```ts
type ServiceReportCalculation = {
  unit: ServiceReportUnit;
  totalFeeBasisPoints: number;
  monthlyWorkMinutes: number;
  monthlyCostCents: number;
  hourCostCents: number | null;
  structureUnitCostCents: number | null;
  materialUnitCostCents: number;
  unitCostCents: number | null;
  currentPriceCents: number;
  netRevenueCents: number | null;
  unitContributionCents: number | null;
  unitProfitCents: number | null;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  targetPriceCents: number | null;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  verdict: ServiceReportVerdict;
  priority: ServiceReportPriority;
};
```

---

### Task 1: Normalize capacity and validate the expanded Service input

**Files:**

- Create: `src/modules/quick-diagnosis/schemas/service-work-capacity.ts`
- Create: `src/modules/quick-diagnosis/schemas/service-work-capacity.test.ts`
- Modify: `src/modules/quick-diagnosis/types.ts`
- Modify: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`
- Test: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`

**Interfaces:**

- Produces `ServiceWorkPeriod`, `parseServiceWorkPeriodMinutes`, `normalizeMonthlyWorkMinutes`, and the expanded command above.
- Consumes `canonicalDecimal`, `scaledInteger`, existing money/percentage schemas, and pricing rules.

- [ ] **Step 1: Write failing exact conversion tests**

```ts
it.each([
  ["month", "160,5", 5, 9_630, 9_630],
  ["week", "40", 5, 2_400, 10_392],
  ["day", "8", 5, 480, 10_392],
] as const)("normalizes %s capacity", (period, raw, days, source, monthly) => {
  const minutes = parseServiceWorkPeriodMinutes(raw, period);
  expect(minutes).toBe(source);
  expect(normalizeMonthlyWorkMinutes(period, minutes, days)).toBe(monthly);
});

it.each([
  ["day", "24,01"],
  ["week", "168,01"],
  ["month", "744,01"],
] as const)("rejects excessive %s hours", (period, raw) => {
  expect(() => parseServiceWorkPeriodMinutes(raw, period)).toThrow(
    "out_of_range",
  );
});
```

- [ ] **Step 2: Run the new test and observe the missing module**

Run: `pnpm vitest run src/modules/quick-diagnosis/schemas/service-work-capacity.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic parsing and normalization**

```ts
const PERIOD_MAX_MINUTES = {
  day: 1_440,
  week: 10_080,
  month: 44_640,
} satisfies Record<ServiceWorkPeriod, number>;

function normalizeMonthlyWorkMinutes(
  period: ServiceWorkPeriod,
  periodMinutes: number,
  weeklyWorkDays: number,
): number {
  if (period === "month") return periodMinutes;
  const days = period === "day" ? BigInt(weeklyWorkDays) : BigInt(1);
  return Number(
    (BigInt(periodMinutes) * days * BigInt(433) + BigInt(50)) /
      BigInt(100),
  );
}
```

Move the current decimal-to-minute algorithm into `parseServiceWorkPeriodMinutes`, then enforce the period-specific maximum.

- [ ] **Step 4: Write failing schema behavior tests**

Update `validHour` with `workHoursPeriod: "month"`, `workHours: "160,5"`, `hasMaterialCost: false`, and `materialUnitCost: ""`. Add:

```ts
expect(
  serviceDiagnosisSchema.parse({
    ...validHour,
    workHoursPeriod: "day",
    workHours: "8",
    weeklyWorkDays: "5",
    hasMaterialCost: true,
    materialUnitCost: "30,50",
  }),
).toEqual(
  expect.objectContaining({
    workHoursPeriod: "day",
    workPeriodMinutes: 480,
    monthlyWorkMinutes: 10_392,
    materialUnitCostCents: 3_050,
  }),
);
expect(
  issuePaths({ ...validHour, hasMaterialCost: true, materialUnitCost: "0" }),
).toContain("materialUnitCost");
expect(
  serviceDiagnosisSchema.parse({
    ...validHour,
    hasMaterialCost: false,
    materialUnitCost: "999",
  }).materialUnitCostCents,
).toBe(0);
```

- [ ] **Step 5: Expand types and transform the command**

Parse `workHours` for the selected period, normalize monthly minutes, zero material when disabled, and retain existing method-specific price/duration zeroing. Attach period errors to `workHours`; require positive material only when enabled.

- [ ] **Step 6: Run focused tests and commit**

```bash
pnpm vitest run src/modules/quick-diagnosis/schemas/service-work-capacity.test.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
git add src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas/service-work-capacity.ts src/modules/quick-diagnosis/schemas/service-work-capacity.test.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
git commit -m "feat: normalize service billable capacity"
```

---

### Task 2: Calculate material, contribution, and Service margin

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/domain/calculate-service-report.ts`
- Test: `src/modules/reports/domain/calculate-service-report.test.ts`

**Interfaces:** Produces the expanded `ServiceReportCalculation` and `direct_loss` Service verdict.

- [ ] **Step 1: Write failing appointment and direct-loss assertions**

With base fixed cost `600_000`, 6,000 monthly minutes, 50-minute appointment, price `8_000`, fees `800`, and material `1_000`, assert:

```ts
expect(calculateServiceReport(baseCommand)).toEqual(
  expect.objectContaining({
    hourCostCents: 6_000,
    structureUnitCostCents: 5_000,
    materialUnitCostCents: 1_000,
    unitCostCents: 6_000,
    netRevenueCents: 7_360,
    unitContributionCents: 6_360,
    unitProfitCents: 1_360,
    realMarginBasisPoints: 1_700,
    minimumPriceCents: 6_522,
    targetPriceCents: 7_793,
    monthlySalesGoal: 95,
    weeklySalesGoal: 22,
    dailySalesGoal: 5,
  }),
);
expect(
  calculateServiceReport({
    ...baseCommand,
    appointmentRateCents: 1_000,
    materialUnitCostCents: 1_000,
  }),
).toEqual(
  expect.objectContaining({
    unitContributionCents: -80,
    monthlySalesGoal: null,
    verdict: "direct_loss",
    priority: "cost",
  }),
);
```

- [ ] **Step 2: Run the calculator test and observe failures**

Run: `pnpm vitest run src/modules/reports/domain/calculate-service-report.test.ts`

Expected: FAIL because the calculator has no material/contribution distinction.

- [ ] **Step 3: Implement the formula split**

```ts
const structureUnitCostCents =
  command.monthlyWorkMinutes > 0 && unitDurationMinutes > 0
    ? multiplyDivideRound(
        monthlyCostCents,
        unitDurationMinutes,
        command.monthlyWorkMinutes,
      )
    : null;
const unitCostCents =
  structureUnitCostCents === null
    ? null
    : structureUnitCostCents + command.materialUnitCostCents;
const unitContributionCents =
  netRevenueCents === null
    ? null
    : netRevenueCents - command.materialUnitCostCents;
const unitProfitCents =
  unitContributionCents === null || structureUnitCostCents === null
    ? null
    : unitContributionCents - structureUnitCostCents;
const monthlySalesGoal =
  unitContributionCents !== null && unitContributionCents > 0
    ? ceilDivide(BigInt(monthlyCostCents), BigInt(unitContributionCents))
    : null;
```

Use total unit cost for minimum price, target price, margin, and discount break-even.

- [ ] **Step 4: Classify direct loss before operational loss**

Make the classifier consume contribution. Return `direct_loss` when it is non-positive; map it to `cost`. Preserve all current margin thresholds and mappings.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm vitest run src/modules/reports/domain/calculate-service-report.test.ts src/modules/reports/domain/integer-math.test.ts
git add src/modules/reports/types.ts src/modules/reports/domain/calculate-service-report.ts src/modules/reports/domain/calculate-service-report.test.ts
git commit -m "feat: calculate service direct material cost"
```

---

### Task 3: Add Service V3 while preserving Service V2 reads

**Files:**

- Modify: `src/modules/reports/schemas/service-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/types.ts`
- Modify/Test: `src/modules/reports/domain/build-service-executive-summary.ts`
- Modify/Test: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Test: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify/Test: `src/modules/reports/presenters/to-report-view-model.ts`

**Interfaces:** Produces `ServiceReportSnapshotV2`, `ServiceReportSnapshotV3`, and `ServiceReportSnapshot = V2 | V3`.

- [ ] **Step 1: Write failing dual-version parser tests**

Keep the existing V2 fixture intact. Add a V3 fixture with versions `3/2/3`, period/source minutes/material input, structure/material/contribution results, and assert both parse. Assert V3 missing `materialUnitCostCents` and schema version 4 fail.

- [ ] **Step 2: Run the schema test**

Run: `pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts`

Expected: FAIL because V3 is unsupported.

- [ ] **Step 3: Add strict V3 schemas and root union**

Keep the V2 schema literals and fields unchanged. V3 inputs add `workHoursPeriod`, `workPeriodMinutes`, and `materialUnitCostCents`; V3 results add `structureUnitCostCents`, `materialUnitCostCents`, and `unitContributionCents`. Change the root to:

```ts
const reportSnapshotSchema = z.union([
  serviceReportSnapshotV2Schema,
  serviceReportSnapshotV3Schema,
  productReportSnapshotV1Schema,
  productionReportSnapshotV1Schema,
]);
```

- [ ] **Step 4: Write failing builder/content assertions**

Assert a built snapshot has versions `3/2/3`, stores period/source/monthly/material inputs, exposes the three new results, and puts total cost in `discountSimulationBase.unitCostCents`. Assert `direct_loss` says material plus fees are not covered and selects priority `Custo`.

- [ ] **Step 5: Build V3 content**

Set current Service constants to `3/2/3`. Build only V3. Add `direct_loss` content. For material, explain structure cost, direct material, and total separately; with zero material, retain natural structure-only copy. Suppress sales-goal recommendations for direct or operational loss.

- [ ] **Step 6: Generalize the presenter**

```ts
function toServiceNumbers(
  snapshot: ServiceReportSnapshot,
): ReportNumberViewModel[] {
```

Both versions expose the five shared displayed result fields, so labels do not change.

- [ ] **Step 7: Run regressions and commit**

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/report-executive-summary.test.tsx
git add src/modules/reports
git commit -m "feat: version service material cost reports"
```

---

### Task 4: Migrate the Service database and RPC

**Files:**

- Create via CLI: `supabase/migrations/*_refine_service_diagnosis_cost_flow.sql`
- Modify: `supabase/tests/service_diagnoses.test.sql`
- Modify: `supabase/tests/diagnosis_reports.test.sql`

**Interfaces:** Produces `public.service_work_hours_period`, new normalized columns, capacity constraints, and the revised report RPC.

- [ ] **Step 1: Verify local commands**

```bash
test ! -d supabase/schemas
pnpm exec supabase --version
pnpm exec supabase migration new --help
pnpm exec supabase test db --help
```

- [ ] **Step 2: Write failing pgTAP assertions**

Assert enum labels `day/week/month`; columns `work_hours_period`, `work_period_minutes`, and `material_unit_cost_cents`; authenticated SELECT-only table grants; authenticated-only RPC execution; and rejection of 25 daily, 169 weekly, 745 monthly hours, mismatched monthly normalization, and negative material.

- [ ] **Step 3: Observe database test failure and create the migration**

```bash
pnpm exec supabase test db supabase/tests/service_diagnoses.test.sql
pnpm exec supabase migration new refine_service_diagnosis_cost_flow
```

Expected: the first command fails on missing schema; the second creates one timestamped migration.

- [ ] **Step 4: Add columns, backfill, and constraints**

```sql
create type public.service_work_hours_period as enum ('day', 'week', 'month');

alter table public.service_diagnoses
add column work_hours_period public.service_work_hours_period
  not null default 'month',
add column work_period_minutes integer not null default 0,
add column material_unit_cost_cents bigint not null default 0;

update public.service_diagnoses
set work_period_minutes = monthly_work_minutes;

alter table public.service_diagnoses
drop constraint service_diagnoses_money_check,
add constraint service_diagnoses_money_check check (
  desired_monthly_income_cents >= 0
  and fixed_monthly_expenses_cents >= 0
  and hourly_rate_cents >= 0
  and minute_rate_cents >= 0
  and appointment_rate_cents >= 0
  and material_unit_cost_cents >= 0
),
add constraint service_diagnoses_work_period_check check (
  (work_hours_period = 'month' and work_period_minutes between 0 and 44640
    and monthly_work_minutes = work_period_minutes)
  or (work_hours_period = 'week' and work_period_minutes between 0 and 10080
    and monthly_work_minutes =
      ((work_period_minutes::bigint * 433 + 50) / 100)::integer)
  or (work_hours_period = 'day' and work_period_minutes between 0 and 1440
    and monthly_work_minutes =
      ((work_period_minutes::bigint * weekly_work_days * 433 + 50) / 100)::integer)
);
```

- [ ] **Step 5: Replace the RPC overload**

Drop the exact old signature, then recreate it with `p_work_hours_period`, `p_work_period_minutes`, and `p_material_unit_cost_cents`. Require versions `3/2/3`; compare these scalars with snapshot input paths; insert them into `service_diagnoses`; preserve authenticated caller check, idempotency, empty search path, and atomic generic/detail inserts. Revoke `public, anon`; grant the exact signature to `authenticated`.

- [ ] **Step 6: Run all local database gates and commit**

```bash
pnpm run supabase:reset
pnpm exec supabase test db
pnpm run supabase:lint
pnpm run supabase:advisors
git add supabase/migrations supabase/tests/service_diagnoses.test.sql supabase/tests/diagnosis_reports.test.sql
git commit -m "feat: persist service capacity and material cost"
```

---

### Task 5: Regenerate types and map persistence

**Files:**

- Generate: `src/infrastructure/database/supabase/database.types.ts`
- Modify/Test: `src/modules/reports/services/create-service-report.service.ts`
- Modify/Test: `src/modules/quick-diagnosis/services/create-service-diagnosis.service.ts`
- Test: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts`

**Interfaces:** Consumes the migrated schema, command, and `ServiceReportSnapshotV3`; produces complete RPC/table mappings.

- [ ] **Step 1: Generate and inspect types**

```bash
pnpm run supabase:types
rg -n 'service_work_hours_period|work_hours_period|work_period_minutes|material_unit_cost_cents|p_material_unit_cost_cents' src/infrastructure/database/supabase/database.types.ts
```

- [ ] **Step 2: Write failing mapping assertions**

Expect `p_work_hours_period: "day"`, `p_work_period_minutes: 480`, `p_monthly_work_minutes: 10_392`, `p_material_unit_cost_cents: 3_050`, and versions `3/2/3` in the RPC call. Add the same normalized fields to retained direct-insert expectations.

- [ ] **Step 3: Run focused failures**

```bash
pnpm vitest run src/modules/reports/services/create-service-report.service.test.ts src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
```

- [ ] **Step 4: Implement the mappings**

Use `ServiceReportSnapshotV3` for new writes. Map command period/source/monthly/material into RPC args and `toInsert`. Update raw/command fixtures while retaining Action order `parse -> auth -> calculate -> snapshot -> persist` and sanitized errors.

- [ ] **Step 5: Verify generated stability and commit**

```bash
pnpm vitest run src/modules/reports/services/create-service-report.service.test.ts src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
pnpm typecheck
pnpm run supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
git add src/infrastructure/database/supabase/database.types.ts src/modules/reports/services/create-service-report.service.ts src/modules/reports/services/create-service-report.service.test.ts src/modules/quick-diagnosis/services/create-service-diagnosis.service.ts src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
git commit -m "feat: persist service report v3 inputs"
```

---

### Task 6: Extend Service wizard state

**Files:**

- Modify/Test: `src/modules/quick-diagnosis/components/service/service-wizard-state.ts`
- Modify: `src/modules/quick-diagnosis/components/service/steps/types.ts`

**Interfaces:** Produces `setWorkHoursPeriod`, `setHasMaterialCost`, default month, and `materialCost` between price and fees.

- [ ] **Step 1: Write failing reducer assertions**

Assert default `workHoursPeriod: "month"`, empty `workHours`, material false/empty, and exact steps:

```ts
expect(serviceWizardSteps).toEqual([
  "monthlyGoal",
  "fixedExpenses",
  "workRoutine",
  "pricingMethod",
  "currentPrice",
  "materialCost",
  "fees",
  "review",
]);
```

Assert disabling material clears value/error and changing pricing method clears prices, duration, and both material fields.

- [ ] **Step 2: Run reducer tests**

Run: `pnpm vitest run src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts`

Expected: FAIL on missing fields/actions/step.

- [ ] **Step 3: Implement actions**

Add `setWorkHoursPeriod` and `setHasMaterialCost`. Period change preserves the typed hours but clears its error. Material false clears `materialUnitCost`. Pricing-method change resets material because its unit changes.

- [ ] **Step 4: Run regressions and commit**

```bash
pnpm vitest run src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
git add src/modules/quick-diagnosis/components/service/service-wizard-state.ts src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts src/modules/quick-diagnosis/components/service/steps/types.ts src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
git commit -m "feat: track service capacity period and material"
```

---

### Task 7: Build period, price, and material steps

**Files:**

- Modify: `src/modules/quick-diagnosis/components/service/steps/work-routine-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/current-price-step.tsx`
- Create: `src/modules/quick-diagnosis/components/service/steps/material-cost-step.tsx`
- Create: `src/modules/quick-diagnosis/components/service/steps/service-steps.test.tsx`

**Interfaces:** Produces an accessible Select, billable guidance, duration-before-price order, and unit-aware material Switch/value.

- [ ] **Step 1: Write failing accessible UI tests**

Assert `Horas faturáveis por` defaults to Mês, selecting Dia emits `day`, the hours label adapts, guidance excludes administration/study/travel, duration appears before appointment price, and enabling material displays `Custo de material por hora` or `Custo de material por atendimento`.

- [ ] **Step 2: Run the new step test**

Run: `pnpm vitest run src/modules/quick-diagnosis/components/service/steps/service-steps.test.tsx`

Expected: FAIL on missing component/props/copy.

- [ ] **Step 3: Implement the period selector**

Use existing Select primitives with options Dia/Semana/Mês, `id="workHoursPeriod"`, a full-width trigger, and guarded `serviceWorkPeriods` conversion. Derive `Quantas horas faturáveis por dia/semana/mês?`. Keep weekly days in the grouped step.

- [ ] **Step 4: Reorder duration and price**

For minute/appointment render `Quanto dura cada atendimento?` before `Quanto você cobra por minuto/atendimento?`. For hour render only `Quanto você cobra por hora?`.

- [ ] **Step 5: Implement material input**

Follow the existing compensation Switch pattern. Use the approved dynamic question and show a prefixed money field only when enabled.

- [ ] **Step 6: Run step regressions and commit**

```bash
pnpm vitest run src/modules/quick-diagnosis/components/service/steps/service-steps.test.tsx src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx
git add src/modules/quick-diagnosis/components/service/steps
git commit -m "feat: collect service capacity and material cost"
```

---

### Task 8: Integrate the nine-step global flow and review

**Files:**

- Modify/Test: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/review-step.tsx`
- Modify/Test: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

**Interfaces:** Produces approved titles, global progress `2 de 9` through `9 de 9`, material error routing, and original/monthly capacity review.

- [ ] **Step 1: Write a failing complete journey**

Enter pro-labore 5000, fixed 1200, 6 hours/day, 5 days/week, appointment, 60 minutes, price 125,90, material enabled at 20, tax 6,25, card 3,50. Assert review is `9 de 9` and submitted input preserves period/raw/material.

- [ ] **Step 2: Write failing review/error assertions**

Assert `6 horas faturáveis por dia`, `129,9 horas faturáveis por mês`, and `R$ 20,00 por atendimento`. Return a server material error and assert navigation/focus on `materialUnitCost`.

- [ ] **Step 3: Run the wizard test**

Run: `pnpm vitest run src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx`

Expected: FAIL on progress, titles, missing step, and review.

- [ ] **Step 4: Integrate exact titles and fields**

Use `Quanto você quer tirar por mês pra você?`, `Quanto são suas contas fixas do mês?`, `Qual é sua capacidade de atendimento?`, `Como você vende seu tempo?`, `Quanto você cobra?`, dynamic material question, `Você paga imposto e taxa de cartão?`, and `Revise suas respostas`. Map period/hours to routine, material value to material step, and set `totalSteps={9}`.

- [ ] **Step 5: Render normalized review values**

Reuse the capacity helper, format the monthly equivalent, show `Sem custo de material` when disabled, and unit-aware currency when enabled.

- [ ] **Step 6: Run wizard regressions and commit**

```bash
pnpm vitest run src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
git add src/modules/quick-diagnosis/components/service src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
git commit -m "feat: complete refined service diagnosis flow"
```

---

### Task 9: Update documentation and run delivery gates

**Files:**

- Modify: `docs/QUICK-DIAGNOSIS.md`
- Verify: all files changed by Tasks 1–8

**Interfaces:** Documents the shipped inputs, normalization, two cost origins, contribution, and compatibility policy.

- [ ] **Step 1: Replace Service formulas in documentation**

Document exactly:

```text
custoBase = pró-labore + contas fixas
custoHora = custoBase ÷ horas faturáveis mensais normalizadas
custoEstruturaUnit = custoHora × duração da unidade
custoUnit = custoEstruturaUnit + materialUnit
receitaLiquidaUnit = preço × (1 − imposto − cartão)
contribUnit = receitaLiquidaUnit − materialUnit
lucroUnit = contribUnit − custoEstruturaUnit
preço mínimo = custoUnit ÷ (1 − imposto − cartão)
preço-alvo = custoUnit ÷ (1 − imposto − cartão − margem-alvo)
meta mensal = teto(custoBase ÷ contribUnit)
```

Document daily/weekly/monthly conversion and the material unit for each pricing method.

- [ ] **Step 2: Run focused Service suites**

```bash
pnpm vitest run src/modules/quick-diagnosis/schemas/service-work-capacity.test.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts src/modules/quick-diagnosis/components/service/steps/service-steps.test.tsx src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts src/modules/reports/domain/calculate-service-report.test.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/services/create-service-report.service.test.ts src/modules/reports/presenters/to-report-view-model.test.ts
```

- [ ] **Step 3: Run full application gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

- [ ] **Step 4: Run full local database gates**

```bash
pnpm run supabase:reset
pnpm exec supabase test db
pnpm run supabase:lint
pnpm run supabase:advisors
pnpm run supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

- [ ] **Step 5: Inspect scope and commit documentation**

```bash
git diff --check
git status --short
git add docs/QUICK-DIAGNOSIS.md
git commit -m "docs: explain refined service diagnosis formulas"
```

## Completion Criteria

- Billable hours work per day, week, or month and review shows the monthly equivalent.
- Material is per hour for hour pricing and per appointment for minute/appointment pricing.
- Structure and direct material remain separate until total unit cost.
- Contribution determines fixed-cost volume; all price/margin/simulator references include material.
- New reports persist atomically as Service V3; Service V2 reports still open unchanged.
- Product and Production are unchanged.
- Vitest, TypeScript, ESLint, Prettier, Supabase reset, pgTAP, database lint/advisors, and generated-type stability pass.
