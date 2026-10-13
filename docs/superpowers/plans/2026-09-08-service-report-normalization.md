# Service Report Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable every supported Service quick-diagnosis billing method to create a persisted report that foregrounds current price, minimum no-loss price, remaining value, and the largest financial weight in plain language.

**Architecture:** Validate the complete Service flow on the server, normalize time-based prices and material costs into one canonical hourly command, and keep appointment billing canonical per appointment. Feed that command into the existing centralized calculator, persist both source and canonical values through a new additive RPC, and render the new `4/3/5` snapshot through a version-aware presentation profile while preserving all legacy report contracts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Tailwind CSS 4, Base UI Popover, Vitest/Testing Library, Supabase/Postgres, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-08-service-report-normalization-design.md`

## Global Constraints

- New Service reports use schema/calculation/content tuple `4/3/5`; existing `2/1/2`, `3/2/3`, and `3/2/4` reports remain readable and visually unchanged.
- Preserve `calculateServiceReport` as the only financial engine. The new composer may convert units but must not reproduce margin, minimum-price, sales-goal, verdict, or discount formulas.
- Use integer cents and basis points. For unit conversion, calculate `round(amountCents * targetMinutes / sourceMinutes)` with `BigInt` and round only once, half up.
- Normalize `minute`, `hour`, `day`, `week`, and `month` billing to canonical `hour`; keep `appointment` canonical as `appointment`.
- Calculate normalized monthly capacity once as `round(dailyWorkMinutes * weeklyWorkDays * 4.33)` and reuse it for price, material, snapshot, and persistence.
- Preserve the original billing method, current price, material unit/value, daily work minutes, and source appointment duration in the snapshot and `service_diagnoses`.
- Treat 15% only as the internal boundary between `Pouca folga` and `Boa folga`. Never present it as a target or recommendation in `4/3/5` reports.
- New reports do not display target price or the `A conta que ninguém faz` section. Do not remove either from legacy presentation paths.
- Do not change Product or Production calculations, snapshots, report copy, or seed records.
- Use the existing `PlainLanguageHelp` click/touch/keyboard popover; do not add hover-only help.
- Keep Portuguese UI copy direct and non-technical. Main content must not contain `meta de 15%`, `preço-alvo`, `pró-labore`, `alíquota`, `rateio`, or `A conta que ninguém faz`.
- Preserve unrelated worktree changes. Use TDD for every task and commit each green task independently.

---

### Task 1: Server-valid Service flow and deterministic normalization

**Files:**

- Modify: `src/modules/quick-diagnosis/domain/service-flow.ts`
- Modify: `src/modules/quick-diagnosis/schemas/service-flow.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/service-flow.schema.test.ts`
- Create: `src/modules/quick-diagnosis/domain/compose-service-diagnosis-command.ts`
- Create: `src/modules/quick-diagnosis/domain/compose-service-diagnosis-command.test.ts`
- Modify: `src/modules/quick-diagnosis/types.ts`

**Interfaces:**

- Extend the flow contract with the authenticated submission identifier:

```ts
type ServiceFlowSubmissionInput = ServiceFlowInput & {
  submissionId: string;
};

type ServiceDiagnosisSource = {
  pricingMethod: ServiceFlowPricingMethod;
  currentPriceCents: number;
  materialCostUnit: ServiceMaterialCostUnit | null;
  materialCostCents: number;
  dailyWorkMinutes: number;
  appointmentDurationMinutes: number;
};

type NormalizedServiceDiagnosisCommand = ServiceDiagnosisCommand & {
  source: ServiceDiagnosisSource;
};

function composeServiceDiagnosisCommand(
  input: ServiceFlowSubmissionInput,
): NormalizedServiceDiagnosisCommand;
```

- Export `serviceFlowSubmissionSchema`. It parses a UUID `submissionId` plus the complete `serviceFlowSchema` and returns `ServiceFlowSubmissionInput`.
- Require `appointmentDurationMinutes` when `pricingMethod === "appointment"` or when `hasMaterialCost === true && materialCostUnit === "appointment"`.
- Canonical command rules:

```ts
const canonicalUnit =
  input.pricingMethod === "appointment" ? "appointment" : "hour";
const targetMinutes =
  canonicalUnit === "appointment" ? appointmentDurationMinutes : 60;
```

- Source-duration mapping: minute `1`, hour `60`, day `dailyWorkMinutes`, week `dailyWorkMinutes * weeklyWorkDays`, month `monthlyWorkMinutes`, appointment `appointmentDurationMinutes`.
- Canonical command stores `pricingMethod: "appointment"` only for source appointments and `"hour"` otherwise; `workHoursPeriod: "day"`; `workPeriodMinutes: dailyWorkMinutes`; `minuteRateCents: 0`; source-disabled material/tax/fee values become zero.

- [x] **Step 1: Add failing validation and table-driven normalization tests**

Add schema cases for a valid UUID, invalid submission ID, and conditional duration. In the composer test, use `dailyWorkHours: "6"`, `weeklyWorkDays: "5"`, which yields `dailyWorkMinutes = 360` and `monthlyWorkMinutes = 7_794`, then assert:

```ts
it.each([
  ["minute", "0.51", 3_060],
  ["hour", "30.79", 3_079],
  ["day", "184.75", 3_079],
  ["week", "923.70", 3_079],
  ["month", "4000.00", 3_079],
])(
  "normalizes %s billing once to cents",
  (pricingMethod, currentPrice, expected) => {
    const command = composeServiceDiagnosisCommand(
      makeSubmission({ pricingMethod, currentPrice }),
    );
    expect(command.pricingMethod).toBe("hour");
    expect(command.hourlyRateCents).toBe(expected);
    expect(command.source).toMatchObject({
      pricingMethod,
      currentPriceCents: expect.any(Number),
      dailyWorkMinutes: 360,
    });
  },
);
```

Add an appointment case that retains the entered appointment price. Add material cases for `appointment`, `hour`, `day`, and `month` against both canonical hour and canonical appointment. Include a `.5`-cent boundary to prove half-up rounding and assert that tax/card answers set their basis points to zero when false.

- [x] **Step 2: Run focused tests and confirm they fail**

Run:

```bash
pnpm test src/modules/quick-diagnosis/schemas/service-flow.schema.test.ts src/modules/quick-diagnosis/domain/compose-service-diagnosis-command.test.ts
```

Expected: FAIL because the submission schema/composer/types do not exist and duration is not required for appointment-based material.

- [x] **Step 3: Implement one shared integer conversion path**

Move/export the reusable round helper from `service-flow.ts` or introduce it in the composer and make the preview call the same helper. Implement:

```ts
function convertUnitAmountCents(
  amountCents: number,
  sourceMinutes: number,
  targetMinutes: number,
): number {
  if (sourceMinutes <= 0 || targetMinutes <= 0) {
    throw new Error("Invalid service conversion duration");
  }

  return Number(
    (BigInt(amountCents) * BigInt(targetMinutes) +
      BigInt(Math.floor(sourceMinutes / 2))) /
      BigInt(sourceMinutes),
  );
}
```

Parse all money and percentages through existing decimal helpers. Build the canonical command and source object without accepting any preview-derived number from the browser.

- [x] **Step 4: Run the focused tests**

Run the Step 2 command. Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/modules/quick-diagnosis/domain/service-flow.ts src/modules/quick-diagnosis/domain/compose-service-diagnosis-command.ts src/modules/quick-diagnosis/domain/compose-service-diagnosis-command.test.ts src/modules/quick-diagnosis/schemas/service-flow.schema.ts src/modules/quick-diagnosis/schemas/service-flow.schema.test.ts src/modules/quick-diagnosis/types.ts
git commit -m "feat: normalize service diagnosis inputs"
```

---

### Task 2: Version `4/3/5` snapshot and plain-language report content

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/schemas/service-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/domain/build-service-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-service-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.test.ts`
- Modify: `src/modules/reports/formatters.ts`
- Modify: `src/modules/reports/components/report-list-card.tsx`

**Interfaces:**

- Add constants `SERVICE_REPORT_SCHEMA_VERSION = 4`, `SERVICE_REPORT_CALCULATION_VERSION = 3`, and `SERVICE_REPORT_CONTENT_VERSION = 5`; retain explicit legacy constants/schemas.
- Add `day`, `week`, and `month` to Service report scenarios without widening Product/Production scenarios.
- `ServiceReportSnapshotV5` has tuple `4/3/5`, uses the original source method as `scenario`, keeps canonical `unit: "hour" | "appointment"`, includes all canonical V4 input fields, and adds:

```ts
source: {
  pricingMethod: ServiceFlowPricingMethod;
  currentPriceCents: number;
  materialCostUnit: ServiceMaterialCostUnit | null;
  materialCostCents: number;
  dailyWorkMinutes: number;
  appointmentDurationMinutes: number;
}
```

- V5 executive facts are ordered `["price", "margin"]`. V5 sections are ordered `break_even`, `margin_diagnosis`, `sales_goal`, `discount_simulator`.
- `buildServiceExecutiveSummary` accepts `NormalizedServiceDiagnosisCommand` plus calculation so it can select the largest financial weight.
- Compare these canonical per-unit amounts in fixed tie order: desired monthly income allocation, fixed monthly expense allocation, material cost, combined fees. Labels are `Quanto você quer receber por mês`, `Gastos que existem todo mês`, `Materiais usados`, and `Impostos e taxas`.

- [x] **Step 1: Add failing schema compatibility tests**

Create a valid V5 fixture and assert `parseCurrentServiceReportSnapshot` accepts it, rejects a V5 snapshot containing `hidden_cost`, rejects source/canonical inconsistency, and rejects wrong fact/section order. Keep assertions proving V2, V3, and V4 still parse.

- [x] **Step 2: Add failing builder content tests**

For loss and little-buffer calculations, assert the first price fact shows current/minimum prices and the priority names the largest weight. Add equal-weight input and assert the fixed tie order. For a healthy result, assert the priority remains sales-volume guidance.

Assert the built V5 snapshot:

```ts
expect(snapshot.sections.map(({ key }) => key)).toEqual([
  "break_even",
  "margin_diagnosis",
  "sales_goal",
  "discount_simulator",
]);
expect(snapshot.sections[0].title).toBe("Seu menor preço sem prejuízo");
expect(snapshot.sections[1].title).toBe("Quanto sobra no preço");
expect(snapshot.sections[2].title).toBe("Quanto você precisa vender");
expect(JSON.stringify(snapshot)).not.toMatch(
  /meta de 15%|preço-alvo|pró-labore|alíquota|rateio|A conta que ninguém faz/i,
);
```

- [x] **Step 3: Run focused snapshot tests and verify failure**

```bash
pnpm test src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
```

Expected: FAIL because V5 and the source-aware summary do not exist.

- [x] **Step 4: Implement isolated V5 schemas and builders**

Do not mutate legacy schemas or derive their visible labels from the V5 profile. Build the largest-weight amount with the same canonical unit duration used by the calculator:

```ts
const desiredIncomeWeight = roundRatio(
  command.desiredMonthlyIncomeCents * unitDurationMinutes,
  command.monthlyWorkMinutes,
);
const fixedExpenseWeight = roundRatio(
  command.fixedMonthlyExpensesCents * unitDurationMinutes,
  command.monthlyWorkMinutes,
);
const feeWeight = roundRatio(
  calculation.currentPriceCents *
    (command.taxRateBasisPoints + command.cardFeeRateBasisPoints),
  10_000,
);
```

Derive `unitDurationMinutes` as `60` for `calculation.unit === "hour"` and from the canonical appointment duration otherwise. Use the first maximum in the declared tie order. Make the loss/tight price fact state current price, minimum price, and their difference in the canonical unit. Store the minimum, monthly/weekly/daily quantity, and discount data already produced by the central calculator; do not add new financial formulas.

- [x] **Step 5: Run focused tests**

Run the Step 3 command. Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/modules/reports/types.ts src/modules/reports/schemas/service-report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-service-executive-summary.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
git commit -m "feat: add normalized service report snapshot"
```

---

### Task 3: Additive database contract and authenticated transactional RPC

**Files:**

- Create with CLI: `supabase/migrations/<timestamp>_create_normalized_service_report.sql`
- Modify: `supabase/tests/service_diagnoses.test.sql`
- Modify: `supabase/tests/diagnosis_reports.test.sql`
- Regenerate: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Add nullable legacy-safe columns:

```sql
source_pricing_method text,
source_current_price_cents bigint,
source_material_cost_unit text,
source_material_cost_cents bigint,
daily_work_minutes integer,
source_appointment_duration_minutes integer
```

- Extend `diagnoses_scenario_check` to include `minute`, `hour`, `appointment`, `day`, `week`, and `month` alongside existing category scenarios.
- Add checks for allowed source methods/units, non-negative source money, daily minutes `1..1440`, source appointment duration `1..1440` when either source billing or source material uses appointment, and null source columns only for legacy rows.
- Create `public.create_service_diagnosis_report_v4(...) returns bigint` with all existing canonical arguments plus six source arguments. It accepts only `4/3/5`, validates snapshot/source/canonical equivalence, uses `security definer set search_path = ''`, requires `auth.uid()`, and retains `(user_id, submission_id)` idempotency.
- Keep `public.create_service_diagnosis_report` unchanged and executable for old application versions. Revoke V4 execution from `public, anon`; grant only `authenticated`.

- [x] **Step 1: Read current Supabase guidance before writing SQL**

Fetch `https://supabase.com/changelog.md`, scan changes since the project CLI/database versions, and read current official documentation relevant to database functions, RLS, privileges, and local testing. Record only implementation-impacting findings in the commit message body or plan progress notes.

- [x] **Step 2: Inspect CLI syntax and create the migration through the CLI**

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new create_normalized_service_report
```

Expected: a timestamped empty migration file created by Supabase CLI.

- [x] **Step 3: Write failing pgTAP coverage first**

Extend schema tests for all columns and checks. Extend report tests to assert:

- unauthenticated and anonymous calls fail;
- authenticated user can write `4/3/5` only;
- repeated `submissionId` returns the same diagnosis ID and creates one row;
- day/month source values persist while canonical values match snapshot;
- argument/snapshot mismatch fails atomically;
- old RPC remains present and keeps its grants;
- direct insert/update/delete stays unavailable to authenticated users.

Update `plan(...)` counts exactly, then run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/service_diagnoses.test.sql supabase/tests/diagnosis_reports.test.sql
```

Expected: FAIL because the columns and V4 RPC are missing.

- [x] **Step 4: Implement the additive migration**

Validate JSON fields with `jsonb_typeof` and explicit comparisons before insert. Insert the registry and detail rows in the same function transaction. On idempotent conflict, return the owned existing diagnosis only after confirming it belongs to the caller. Do not dynamically interpolate SQL or trust client-provided `user_id`.

- [x] **Step 5: Reset, run pgTAP, lint, and regenerate types**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/service_diagnoses.test.sql supabase/tests/diagnosis_reports.test.sql
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
```

Expected: all commands PASS and generated types contain the six columns plus `create_service_diagnosis_report_v4`.

- [x] **Step 6: Commit**

```bash
git add supabase/migrations supabase/tests/service_diagnoses.test.sql supabase/tests/diagnosis_reports.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: persist normalized service reports"
```

---

### Task 4: Persist the normalized command through the application service and action

**Files:**

- Modify: `src/modules/reports/services/create-service-report.service.ts`
- Modify: `src/modules/reports/services/create-service-report.service.test.ts`
- Modify: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts`
- Modify: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts`

**Interfaces:**

- `CreateServiceReportInput.command` becomes `NormalizedServiceDiagnosisCommand` and calls `create_service_diagnosis_report_v4`.
- `createServiceDiagnosisAction(input: ServiceFlowSubmissionInput)` returns the existing discriminated action result shape so all wizard categories keep one error protocol.
- Action order is: `serviceFlowSubmissionSchema.safeParse` → authenticated client/user → `composeServiceDiagnosisCommand` → `calculateServiceReport` → `buildServiceReportSnapshot` → `createServiceReport`.

- [x] **Step 1: Write failing service mapping tests**

Assert the V4 RPC receives both canonical and source values:

```ts
expect(rpc).toHaveBeenCalledWith(
  "create_service_diagnosis_report_v4",
  expect.objectContaining({
    p_pricing_method: "hour",
    p_source_pricing_method: "month",
    p_source_current_price_cents: 400_000,
    p_daily_work_minutes: 360,
    p_schema_version: 4,
    p_calculation_version: 3,
    p_content_version: 5,
    p_scenario: "month",
  }),
);
```

Keep tests for invalid RPC data, thrown RPC errors, and `create_failed`.

- [x] **Step 2: Write failing action orchestration tests**

Mock the submission schema and composer. Assert invalid input never authenticates, signed-out input returns `unauthenticated`, a valid input passes the composed command to calculator/builder/service, and domain/persistence exceptions return the established generic failure without leaking technical messages.

- [x] **Step 3: Run focused tests and confirm failure**

```bash
pnpm test src/modules/reports/services/create-service-report.service.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
```

Expected: FAIL because the old schema/RPC and old command are still used.

- [x] **Step 4: Implement the service and action wiring**

Type the RPC args directly from generated `Database["public"]["Functions"]["create_service_diagnosis_report_v4"]["Args"]`. Keep null result fields handled exactly as required by generated types. Do not cast through `unknown` or bypass the snapshot parser.

- [x] **Step 5: Run focused tests**

Run the Step 3 command. Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/modules/reports/services/create-service-report.service.ts src/modules/reports/services/create-service-report.service.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
git commit -m "feat: create service reports from the new flow"
```

---

### Task 5: Enable confirmation in the Service wizard

**Files:**

- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/service-wizard-state.ts`
- Modify: `src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts`
- Modify: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/review-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/material-cost-step.tsx`
- Create: `src/modules/quick-diagnosis/components/service/steps/material-cost-step.test.tsx`

**Interfaces:**

- Add `createServiceDiagnosis` to page/wizard props using an exported `CreateServiceDiagnosisAction` type.
- Initialize Service with `createSubmissionId()` exactly as Product and Production do.
- Service state adds `submissionId`, `submissionStatus: "idle" | "submitting" | "error"`, and `submissionError: string | null` plus reducer events to start, fail, retry, and replace an invalid ID.
- Review receives `isPending`, `error`, and `onSubmit`; visible labels are `Confirmar diagnóstico` and `Preparando relatório...`.
- Material step shows `appointmentDurationMinutes` when material is per appointment and billing is not, with help text explaining that duration only distributes the material expense into the hourly view.

- [x] **Step 1: Replace disabled-button tests with failing submission behavior**

Test successful submission and `/reports/{id}` navigation; double-click invokes the action once; pending state disables the button; transient error keeps values and enables retry with the same ID; `unauthenticated` shows an entry link; invalid submission ID creates a fresh ID without clearing answers; field errors return to and focus the first invalid field.

- [x] **Step 2: Add failing conditional material-duration tests**

For hourly billing plus appointment material, assert the duration field and clickable plain-language help appear. Assert it is absent for hourly material and not duplicated for appointment billing where the pricing step already collected it.

- [x] **Step 3: Run focused wizard tests and confirm failure**

```bash
pnpm test src/app/\(private\)/quick-diagnosis/page.test.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/service/steps/material-cost-step.test.tsx
```

Expected: FAIL because the Service action is not injected and the review remains disabled.

- [x] **Step 4: Implement submission using the established wizard pattern**

Use `useRouter`, a synchronous `submittingRef`, reducer status, and the existing invalid-field routing/focus conventions from Product. Submit the original `ServiceFlowInput` plus `submissionId`; do not submit preview normalization values. Replace the maintenance notice with the real action/error region.

- [x] **Step 5: Run focused tests**

Run the Step 3 command. Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add 'src/app/(private)/quick-diagnosis/page.tsx' 'src/app/(private)/quick-diagnosis/page.test.tsx' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/service
git commit -m "feat: enable service diagnosis confirmation"
```

---

### Task 6: Present V5 reports with minimum-price and attention-band help

**Files:**

- Modify: `src/modules/reports/presentation/report-language.ts`
- Create: `src/modules/reports/presentation/report-language.test.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/ReportExecutiveSummary.tsx`
- Modify: `src/modules/reports/components/report-executive-summary.test.tsx`
- Modify: `src/modules/reports/components/ReportNumbers.tsx`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`
- Modify: `src/modules/reports/services/get-report.service.test.ts`

**Interfaces:**

- Extend executive fact view models with optional `help: PlainLanguageHelpContent`.
- Replace the string discount context with:

```ts
type DiscountSimulationContext = {
  category: ReportCategory;
  usesAttentionBand: boolean;
};
```

- Set `usesAttentionBand` only for Service `4/3/5`; all legacy Service and Product/Production reports retain target-based simulator language.
- V5 main numbers include current price, minimum price, amount left per R$100, monthly sales quantity, and no target price.
- Add help:
  - minimum price: includes monthly expenses, desired take-home amount, material, and informed fees;
  - amount left: less than R$15 per R$100 is an attention range, not a universal recommendation;
  - normalization: only for original minute/day/week/month, states the original price and its hourly equivalent.

- [x] **Step 1: Add failing version-aware presenter tests**

Assert V5 omits target number/copy, provides the three help contracts when applicable, labels margin states `Prejuízo`, `Pouca folga`, or `Boa folga`, and preserves current V4 labels/target price exactly.

- [x] **Step 2: Add failing component interaction tests**

Render the summary and numbers, activate help with click and keyboard, assert semantic title/body, close with `Escape`, and verify focus returns to the trigger. Render narrow containers and assert long currency/quantity content wraps rather than overflowing.

For discounts, test loss, under-15% positive margin, and at-least-15% margin using V5 context; assert no `meta` or `preço-alvo`. Re-run an existing Product context to prove its target copy is unchanged.

- [x] **Step 3: Run focused presentation tests and confirm failure**

```bash
pnpm test src/modules/reports/presentation/report-language.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-detail.test.tsx
```

Expected: FAIL because facts have no help and the simulator only supports target language.

- [x] **Step 4: Read the UI craft floor immediately before UI edits**

Read `.agents/skills/impeccable/reference/craft-floor.md` completely. Apply its accessibility, responsive, typography, and interaction constraints while preserving this repository's current card system.

- [x] **Step 5: Implement the V5 presentation profile**

Branch on category plus exact tuple, not content version alone. Render `PlainLanguageHelp` adjacent to the fact/number it explains. Keep the monthly sales quantity as the visual emphasis and place weekly/daily equivalents in one short supporting sentence. Avoid adding decorative containers or animation.

- [x] **Step 6: Run focused tests**

Run the Step 3 command. Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add src/modules/reports/presentation src/modules/reports/presenters src/modules/reports/components
git commit -m "refactor: simplify normalized service reports"
```

---

### Task 7: Seed three current Service scenarios and update documentation

**Files:**

- Modify: `supabase/seed.sql`
- Modify: `supabase/tests/seed.test.sql`
- Modify: `docs/QUICK-DIAGNOSIS.md`

**Interfaces:**

- Preserve the existing test user and all Product/Production fixtures.
- Replace only the three Service fixtures with V5 reports covering:
  1. monthly billing with loss and fixed monthly expenses as largest weight;
  2. daily or weekly billing with little buffer and fees as largest weight;
  3. appointment billing with healthy buffer and stable sales-volume priority.
- Each fixture calls `create_service_diagnosis_report_v4`, persists original and canonical values, and contains a snapshot produced by the TypeScript builder rather than hand-edited divergent arithmetic.
- Documentation describes `4.33`, normalization formulas, the attention band, original/canonical persistence, and supported legacy/current tuples without calling 15% a target.

- [x] **Step 1: Update seed assertions first**

Assert exactly three Service rows for the test user, all tuple `4/3/5`, all six source fields coherent, scenarios cover loss/tight/healthy, and no Service snapshot contains the forbidden main-copy terms.

- [x] **Step 2: Reset and observe the expected seed-test failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/seed.test.sql
```

Expected: FAIL because the seed still creates Service `3/2/4` snapshots.

- [x] **Step 3: Generate and insert the three V5 fixtures**

Use the production composer/calculator/builder in a temporary checked script or a focused test output to obtain exact JSON and RPC numbers. Delete the temporary generator after copying the verified fixture data. Do not alter the seeded credentials or unrelated report fixtures.

- [x] **Step 4: Update the quick-diagnosis documentation**

Document the exact formulas and examples from the approved spec, including the conditional appointment duration. Clearly distinguish source data, canonical calculation unit, attention band, and minimum no-loss price.

- [x] **Step 5: Reset and run all pgTAP tests**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: PASS, including cross-category tests that still invoke the legacy Service RPC.

- [x] **Step 6: Commit**

```bash
git add supabase/seed.sql supabase/tests/seed.test.sql docs/QUICK-DIAGNOSIS.md
git commit -m "test: seed normalized service report scenarios"
```

---

### Task 8: Full verification and grouped visual review

**Files:**

- Modify only files required by failures found in this task.

- [x] **Step 1: Run all application quality gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: PASS with no skipped new tests and no TypeScript casts that weaken the V4 RPC or V5 snapshot contracts.

- [x] **Step 2: Run all local database quality gates from a clean reset**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
git diff --exit-code src/infrastructure/database/supabase/database.types.ts
```

Expected: PASS and generated database types are committed.

- [x] **Step 3: Run the Impeccable mechanical detector**

```bash
node /home/pereira/projetos/Lucrivo/.agents/skills/impeccable/scripts/detect.mjs --json src/modules/quick-diagnosis/components/service src/modules/reports/components src/modules/reports/presenters/to-report-view-model.ts src/modules/reports/presentation/report-language.ts
```

Review every finding. Fix applicable accessibility, overflow, typography, or interaction issues; document why any false positive is safe.

- [x] **Step 4: Perform one grouped visual pass**

With the local app and seeded database, inspect in one pass:

- Service form at `375px` mobile and desktop, including conditional duration, loading, and error states;
- loss, little-buffer, and healthy seeded reports at mobile and desktop;
- light and dark themes;
- keyboard-only popovers and confirmation;
- browser zoom at 200%;
- one legacy Service report to confirm unchanged presentation.

Check that current/minimum price is readable first, the largest weight is visible without opening help, monthly sales quantity dominates its card, supporting text does not overflow, and no technical wording leaks into the primary copy. Apply one correction round if necessary, then repeat only the affected views once.

- [x] **Step 5: Re-run affected tests and the complete check**

```bash
pnpm check
pnpm supabase:reset
pnpm exec supabase test db
```

Expected: PASS.

- [x] **Step 6: Commit verification fixes if any**

```bash
git add src supabase docs
git commit -m "fix: complete service report verification"
```

If no files changed during verification, do not create an empty commit.
