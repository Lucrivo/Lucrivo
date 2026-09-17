# Detailed Product and Production Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persisted, step-by-step detailed diagnosis for multiple resale or manufactured items and correct missing-volume semantics in the existing Product and Production quick diagnoses.

**Architecture:** First version the two quick-report verticals so `null`, `0`, and positive sales volume remain distinct from input through persistence and presentation. Then add an isolated `detailed-diagnosis` module with category-specific validation and cost calculation, one aggregate report snapshot, transactional Supabase persistence, a repeatable item wizard, and dedicated report-list/detail presentation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Tailwind CSS 4, shadcn/Base UI components, Supabase/Postgres with RLS and security-definer RPCs, Vitest, Testing Library, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-17-detailed-diagnosis-design.md`

## Global Constraints

- In this feature, “estoque” means only the financial mix of products; do not add physical inventory, movements, batches, expiry, or replenishment.
- Detailed diagnosis is available only from `Que tipo de resultado você quer ver?`; do not add a post-report invitation.
- Product detailed diagnosis accepts resale items only; Production accepts manufactured items only; never mix both kinds in one report.
- Service diagnosis and every previously persisted report snapshot must remain behaviorally and structurally unchanged.
- Missing volume (`null`), explicit zero, and a positive integer are three distinct states in browser state, commands, calculations, snapshots, SQL, and UI copy.
- Missing volume alone must never create a red loss state; a non-positive unit contribution may still be critical because it is independently knowable.
- Monetary report outputs use integer cents, percentages use integer basis points, ingredient quantities use millionths, and ingredient unit prices use ten-thousandths of BRL.
- Do not use floating-point arithmetic for authoritative financial calculations.
- The browser never supplies trusted totals; Server Actions recalculate every cost, total, verdict, and snapshot before persistence.
- One detailed mix consumes one diagnosis allowance, regardless of item count.
- No AI, dedicated PDF generation, historical comparison, saved-report editing, or digital-product detailed mode.
- Use Portuguese plain-language copy, visible field help where interpretation changes, keyboard-operable controls, visible focus, associated errors, 44×44 px minimum interactive targets, and no color-only meaning.
- Follow TDD: add the focused failing test, observe the expected failure, implement the smallest coherent behavior, rerun focused tests, then commit.

---

### Task 1: Distinguish missing, zero, and positive volume in quick-diagnosis inputs

**Files:**

- Modify: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts`
- Modify: `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts`
- Modify: `src/modules/quick-diagnosis/components/product/steps/monthly-volume-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/monthly-volume-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx`

**Interfaces:**

- Consumes: existing `ProductDiagnosisInput.monthlySalesVolume: string` and `ProductionDiagnosisInput.monthlySalesVolume: string`.
- Produces: both schemas normalize `"" -> null`, `"0" -> 0`, and positive integer strings to their integer value; both volume steps display the approved visible guidance.

- [ ] **Step 1: Add failing schema cases for explicit zero**

Add table cases to both schema test files:

```ts
it.each([
  ["", null],
  ["0", 0],
  ["37", 37],
])("normalizes monthly volume %p to %p", (raw, expected) => {
  const parsed = schema.parse({ ...validInput, monthlySalesVolume: raw });
  expect(parsed.monthlySalesVolume).toBe(expected);
});

it.each(["-1", "1,5", "2147483648"])(
  "rejects invalid monthly volume %p",
  (monthlySalesVolume) => {
    expect(
      schema.safeParse({ ...validInput, monthlySalesVolume }).success,
    ).toBe(false);
  },
);
```

Use `productDiagnosisSchema`/the Product fixture in the Product file and `productionDiagnosisSchema`/the Production fixture in the Production file.

- [ ] **Step 2: Run the focused schema tests and verify the zero cases fail**

Run:

```bash
pnpm vitest run src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts
```

Expected: both `"0"` cases fail because `monthlySalesVolumeSchema` currently requires at least `1`.

- [ ] **Step 3: Permit zero without weakening the integer and upper-bound checks**

In both schema files, change only the lower bound:

```ts
if (volume < 0 || volume > POSTGRES_INTEGER_MAX) {
  throw new Error("out_of_range");
}
```

Keep blank input mapped to `null` and keep `scaledInteger(value, 0)` so fractional values remain invalid.

- [ ] **Step 4: Add failing component assertions for the visible volume guidance**

In both step test files, render `MonthlyVolumeStep` and assert this complete visible guidance:

```ts
expect(
  screen.getByText(
    /Se você já vende este item, informe a média mensal.*Digite 0.*deixe em branco.*resultado será parcial/is,
  ),
).toBeVisible();
expect(screen.getByText("Opcional")).toBeVisible();
```

- [ ] **Step 5: Update both monthly-volume steps with identical approved copy**

Keep the existing `StepField`, change its label to `Quantas unidades você vende por mês?`, and render:

```tsx
<div className="grid gap-2">
  <div className="flex items-center gap-2">
    <span className="text-muted-foreground text-xs font-medium">Opcional</span>
  </div>
  <p className="text-muted-foreground text-sm leading-6">
    Se você já vende este item, informe a média mensal. Digite 0 se não
    vendeu nenhuma unidade. Se ainda não sabe ou quer descobrir quanto
    precisa vender, deixe em branco — o resultado será parcial e a meta
    aparecerá apenas como referência.
  </p>
</div>
```

Do not hide this text in a tooltip.

- [ ] **Step 6: Run the schema and step tests**

Run:

```bash
pnpm vitest run src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the input semantics**

```bash
git add src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/product/steps/monthly-volume-step.tsx src/modules/quick-diagnosis/components/production/steps/monthly-volume-step.tsx src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx
git commit -m "fix: distinguish missing quick diagnosis volume"
```

---

### Task 2: Make quick Product and Production calculations nullable when volume is unknown

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/domain/calculate-product-report.ts`
- Modify: `src/modules/reports/domain/calculate-product-report.test.ts`
- Modify: `src/modules/reports/domain/calculate-production-report.ts`
- Modify: `src/modules/reports/domain/calculate-production-report.test.ts`

**Interfaces:**

- Consumes: normalized quick commands from Task 1 where `monthlySalesVolume` is `number | null` and may be `0`.
- Produces: version-3 quick calculations where monthly results and used volume remain nullable, `null` classifies as `incomplete_volume`, explicit `0` classifies as `no_sales`, and direct loss has precedence.

- [ ] **Step 1: Add focused failing Product calculation tests**

Add assertions covering all three states:

```ts
it("keeps unknown volume partial and neutral", () => {
  const result = calculateProductReport({
    ...validProductCommand,
    monthlySalesVolume: null,
  });

  expect(result).toMatchObject({
    monthlySalesVolumeUsed: null,
    monthlyGrossRevenueCents: null,
    monthlyNetRevenueCents: null,
    monthlyResultCents: null,
    realMarginBasisPoints: null,
    fixedAllocationCents: null,
    totalUnitCostCents: null,
    unitProfitCents: null,
    verdict: "incomplete_volume",
    priority: "data",
    weeklySalesGoal: null,
    dailySalesGoal: null,
  });
  expect(result.monthlySalesGoal).toBeGreaterThan(0);
});

it("treats explicit zero as a known no-sales month", () => {
  const result = calculateProductReport({
    ...validProductCommand,
    monthlySalesVolume: 0,
  });

  expect(result.monthlySalesVolumeUsed).toBe(0);
  expect(result.monthlyResultCents).toBe(-result.effectiveFixedCostCents);
  expect(result.verdict).toBe("no_sales");
});
```

Also add a `monthlySalesVolume: null` case with non-positive unit contribution and expect `direct_loss`, proving the unit-economics warning has precedence.

- [ ] **Step 2: Add the corresponding failing Production calculation tests**

Use `validProductionCommand` and the same expected nullable fields, verdicts, priorities, and hidden weekly/daily targets.

- [ ] **Step 3: Run both calculator suites and observe failures**

Run:

```bash
pnpm vitest run src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.test.ts
```

Expected: failures show `null` being coerced to `0`, an `operational_loss` verdict, and numeric monthly totals.

- [ ] **Step 4: Update current calculation result types**

Change the shared shape of `ProductReportCalculation` and `ProductionReportCalculation`:

```ts
monthlySalesVolumeUsed: number | null;
monthlyGrossRevenueCents: number | null;
monthlyNetRevenueCents: number | null;
monthlyResultCents: number | null;
```

Keep `realMarginBasisPoints`, `fixedAllocationCents`, `totalUnitCostCents`, and `unitProfitCents` nullable.

- [ ] **Step 5: Implement the explicit three-state calculation in both calculators**

Use this shape in each calculator, substituting the category-specific direct cost:

```ts
const monthlySalesVolumeUsed = command.monthlySalesVolume;
const hasKnownVolume = monthlySalesVolumeUsed !== null;
const fixedAllocationCents =
  monthlySalesVolumeUsed === null || monthlySalesVolumeUsed === 0
    ? null
    : ceilDivide(
        BigInt(effectiveFixedCostCents),
        BigInt(monthlySalesVolumeUsed),
      );
const monthlyGrossRevenueCents = hasKnownVolume
  ? roundDivide(
      BigInt(command.unitSalePriceCents) * BigInt(monthlySalesVolumeUsed),
      BigInt(1),
    )
  : null;
const monthlyNetRevenueCents = hasKnownVolume
  ? roundDivide(
      BigInt(netRevenueCents) * BigInt(monthlySalesVolumeUsed),
      BigInt(1),
    )
  : null;
const monthlyResultCents = hasKnownVolume
  ? roundDivide(
      BigInt(unitContributionCents) * BigInt(monthlySalesVolumeUsed) -
        BigInt(effectiveFixedCostCents),
      BigInt(1),
    )
  : null;
```

Classification order must be:

```ts
if (input.unitContributionCents <= 0)
  return { verdict: "direct_loss", priority: "cost" };
if (input.monthlySalesVolumeUsed === null)
  return { verdict: "incomplete_volume", priority: "data" };
if (input.monthlySalesVolumeUsed === 0)
  return { verdict: "no_sales", priority: "volume" };
```

Only derive `realMarginBasisPoints` when monthly gross revenue is non-null and greater than zero. Keep `monthlySalesGoal` available for a positive unit contribution, but force `weeklySalesGoal` and `dailySalesGoal` to `null` when volume is `null`.

- [ ] **Step 6: Run both calculator suites**

Run:

```bash
pnpm vitest run src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.test.ts
```

Expected: PASS, including existing arithmetic and boundary cases.

- [ ] **Step 7: Commit the calculator behavior**

```bash
git add src/modules/reports/types.ts src/modules/reports/domain/calculate-product-report.ts src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.ts src/modules/reports/domain/calculate-production-report.test.ts
git commit -m "fix: keep unknown quick volume partial"
```

---

### Task 3: Version quick snapshots and present unknown volume without loss styling

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/schemas/product-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/production-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.test.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/report-detail.test.tsx`

**Interfaces:**

- Consumes: nullable current calculations from Task 2.
- Produces: Product and Production snapshots `3/3/4`, retaining all older union members, plus neutral partial copy and omitted daily/weekly goals.

- [ ] **Step 1: Add failing current-snapshot parsing fixtures**

Create Product V4 and Production V4 fixture objects with:

```ts
{
  schemaVersion: 3,
  calculationVersion: 3,
  contentVersion: 4,
  inputs: { monthlySalesVolume: null },
  results: {
    monthlySalesVolumeUsed: null,
    monthlyGrossRevenueCents: null,
    monthlyNetRevenueCents: null,
    monthlyResultCents: null,
    realMarginBasisPoints: null,
    fixedAllocationCents: null,
    totalUnitCostCents: null,
    unitProfitCents: null,
    verdict: "incomplete_volume",
    priority: "data",
    weeklySalesGoal: null,
    dailySalesGoal: null,
  },
}
```

Complete every other field by copying the valid V3 fixture values. Assert the category parser accepts the V4 object, the union parser accepts it, and the previous V1–V3 fixtures still parse unchanged.

- [ ] **Step 2: Run the snapshot-schema test and observe the unsupported-version failure**

Run:

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts
```

Expected: V4 fixtures fail because versions and nullable monthly fields are not defined.

- [ ] **Step 3: Add strict V4 schemas without changing legacy schemas**

Add `productReportSnapshotV4Schema` and `productionReportSnapshotV4Schema`. Their current result shapes use nullable monthly fields. In `superRefine`, enforce:

```ts
const unknownVolume = snapshot.inputs.monthlySalesVolume === null;
const nullableMonthlyFields = [
  snapshot.results.monthlySalesVolumeUsed,
  snapshot.results.monthlyGrossRevenueCents,
  snapshot.results.monthlyNetRevenueCents,
  snapshot.results.monthlyResultCents,
  snapshot.results.realMarginBasisPoints,
];

if (unknownVolume && nullableMonthlyFields.some((value) => value !== null)) {
  context.addIssue({
    code: "custom",
    path: ["results", "monthlyResultCents"],
    message: "Resultados mensais devem ser nulos sem volume informado.",
  });
}
```

When volume is `0` or positive, require the four monthly values other than margin to be non-null. Keep margin null for zero gross revenue. Export V4 and make it the `Current*ReportSnapshot` type. Update constants to `3`, `3`, and `4`.

- [ ] **Step 4: Add failing summary and snapshot-builder tests for partial copy**

For both categories assert:

```ts
expect(summary.verdict).toMatchObject({
  label: "Falta informar as vendas",
  tone: "neutral",
});
expect(summary.priority).toContain("informe");
expect(snapshot.sections.find((section) => section.key === "margin_diagnosis")).toMatchObject({
  emphasisLabel: "Resultado mensal",
  emphasisValue: "Ainda não calculado",
  tone: "neutral",
});
expect(snapshot.sections.find((section) => section.key === "sales_goal")?.body).toContain(
  "esta meta é apenas uma referência",
);
expect(snapshot.sections.find((section) => section.key === "sales_goal")?.body).not.toMatch(
  /por semana|por dia/,
);
```

- [ ] **Step 5: Implement explicit partial sections and summaries**

Before formatting numeric monthly values, branch on `monthlySalesVolumeUsed === null`. Use this approved sales-goal copy:

```ts
const unknownVolumeGuidance =
  "Como você ainda não informou quanto vende, esta meta é apenas uma referência. Se ela parecer fora da realidade, revise preço, custos e gastos mensais antes de tomar uma decisão.";
```

Do not pass `null` through `formatCurrency`. Preserve critical tone when `unitContributionCents <= 0`; otherwise use neutral tone for unknown volume.

- [ ] **Step 6: Update the presenter for nullable current numbers**

In `toCurrentProductNumbers` and `toCurrentProductionNumbers`, format nullable monthly values through the existing `optionalCurrency`/`optionalBasisPoints` helpers and display `Ainda não calculado`. Keep legacy presenter branches untouched.

- [ ] **Step 7: Run schema, domain, presenter, and component suites**

Run:

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-detail.test.tsx
```

Expected: PASS, including legacy fixtures.

- [ ] **Step 8: Commit the new quick snapshot versions**

```bash
git add src/modules/reports/types.ts src/modules/reports/schemas/product-report-snapshot.schema.ts src/modules/reports/schemas/production-report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-product-executive-summary.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-production-executive-summary.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-production-report-snapshot.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/presenters/to-report-view-model.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-detail.test.tsx
git commit -m "feat: version partial quick diagnosis reports"
```

---

### Task 4: Persist corrected quick reports with V3 RPCs

**Files:**

- Create: `supabase/migrations/20260917120000_refine_missing_quick_volume.sql`
- Modify: `supabase/tests/product_diagnosis_reports.test.sql`
- Modify: `supabase/tests/production_diagnosis_reports.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts`
- Modify: `src/modules/reports/services/create-product-report.service.ts`
- Modify: `src/modules/reports/services/create-product-report.service.test.ts`
- Modify: `src/modules/reports/services/create-production-report.service.ts`
- Modify: `src/modules/reports/services/create-production-report.service.test.ts`

**Interfaces:**

- Consumes: Product/Production current snapshots `3/3/4` from Task 3.
- Produces: authenticated `create_product_diagnosis_report_v3` and `create_production_diagnosis_report_v3` RPCs accepting nullable monthly result fields and explicit zero volume.

- [ ] **Step 1: Add failing pgTAP cases for zero and null volume**

For each category, add one successful RPC call with `p_monthly_sales_volume = 0`, `no_sales`, and `monthlyResultCents = -effectiveFixedCostCents`; add another with `p_monthly_sales_volume = null`, `incomplete_volume`, and all monthly snapshot/RPC results null. Assert:

```sql
select is(
  (select monthly_sales_volume from public.product_diagnoses where diagnosis_id = :partial_id),
  null::integer,
  'unknown Product volume stays null'
);

select is(
  (select monthly_sales_volume from public.product_diagnoses where diagnosis_id = :zero_id),
  0,
  'explicit Product zero volume is persisted'
);
```

Repeat with `production_diagnoses`. Add invalid calls proving a null volume cannot carry a non-null monthly result.

- [ ] **Step 2: Run the database tests and verify the current constraints/RPCs reject the cases**

Run:

```bash
pnpm supabase:reset
```

Expected: the new pgTAP cases fail because detail-table volume checks require `> 0` and V2 RPCs require `2/2/3` with non-null monthly results.

- [ ] **Step 3: Write the quick-volume migration**

The migration must:

```sql
alter table public.product_diagnoses
drop constraint product_diagnoses_volume_check,
add constraint product_diagnoses_volume_check
check (monthly_sales_volume is null or monthly_sales_volume >= 0);

alter table public.production_diagnoses
drop constraint production_diagnoses_volume_check,
add constraint production_diagnoses_volume_check
check (monthly_sales_volume is null or monthly_sales_volume >= 0);
```

Create private V3 implementations and public V3 wrappers by following the existing V2 security structure. Require exact versions `3/3/4`. Validate null coherence with `is distinct from`, including:

```sql
or (p_monthly_sales_volume is null) is distinct from
   ((p_report_snapshot #>> '{results,monthlySalesVolumeUsed}') is null)
or p_report_snapshot #>> '{results,monthlyResultCents}'
   is distinct from p_monthly_result_cents::text
```

Preserve `pg_advisory_xact_lock`, `auth.uid()`, idempotency, the free-report check, `search_path = ''`, grants only to `authenticated`, and revoked execution for `anon`/`public`. Do not replace or drop V1/V2 functions.

- [ ] **Step 4: Reset Supabase and regenerate generated types**

Run:

```bash
pnpm supabase:reset
pnpm supabase:types
```

Expected: all SQL tests pass and `database.types.ts` contains both V3 RPC signatures.

- [ ] **Step 5: Add failing service tests for V3 RPC names and nullable arguments**

Assert each service calls its V3 function and passes:

```ts
expect(rpc).toHaveBeenCalledWith(
  "create_product_diagnosis_report_v3",
  expect.objectContaining({
    p_monthly_sales_volume: null,
    p_monthly_result_cents: null,
    p_real_margin_basis_points: null,
    p_unit_profit_cents: null,
  }),
);
```

Use the Production RPC name in its suite. Retain limit, malformed response, and thrown-error cases.

- [ ] **Step 6: Point both services at generated V3 signatures**

Rename generated argument aliases to `GeneratedProductV3RpcArgs` and `GeneratedProductionV3RpcArgs`, use the V3 function keys, and allow nullable monthly result arguments in the local narrowed types. Do not cast snapshot values to zero.

- [ ] **Step 7: Run service, action, and SQL-facing tests**

Run:

```bash
pnpm vitest run src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-production-report.service.test.ts src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts
pnpm supabase:lint
```

Expected: PASS.

- [ ] **Step 8: Commit the corrected quick persistence**

```bash
git add supabase/migrations/20260917120000_refine_missing_quick_volume.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql src/infrastructure/database/supabase/database.types.ts src/modules/reports/services/create-product-report.service.ts src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-production-report.service.ts src/modules/reports/services/create-production-report.service.test.ts
git commit -m "feat: persist partial quick report versions"
```

---

### Task 5: Define and validate detailed-diagnosis contracts

**Files:**

- Create: `src/modules/detailed-diagnosis/types.ts`
- Create: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts`
- Create: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts`
- Modify: `src/modules/quick-diagnosis/schemas/decimal-input.ts`
- Modify: `src/modules/quick-diagnosis/schemas/decimal-input.test.ts`

**Interfaces:**

- Consumes: existing `scaledInteger`, money parsing conventions, UUID submission IDs, and `product | production` categories.
- Produces: `DetailedDiagnosisInput`, discriminated raw item inputs, normalized `DetailedDiagnosisCommand`, `DetailedDiagnosisFieldErrors`, and `validateDetailedDiagnosisPaths(paths, input)`.

- [ ] **Step 1: Add failing decimal-parser tests for custom scales**

Add tests proving `scaledInteger` handles six-decimal quantities and four-decimal ingredient prices exactly:

```ts
expect(scaledInteger("0,125", 6)).toBe(125_000);
expect(scaledInteger("0,0050", 4)).toBe(50);
expect(() => scaledInteger("0,0000001", 6)).toThrow();
```

If the existing helper already passes, keep the tests as the contract and make no production change.

- [ ] **Step 2: Create raw and normalized types**

Define these public discriminants and shapes in `types.ts`:

```ts
type DetailedDiagnosisCategory = "product" | "production";
type DetailedProductionCostMode = "summarized" | "technical_sheet";

type DetailedIngredientInput = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unitCost: string;
};

type DetailedItemBaseInput = {
  id: string;
  name: string;
  unitSalePrice: string;
  monthlySalesVolume: string;
};

type DetailedProductItemInput = DetailedItemBaseInput & {
  kind: "resale";
  purchaseUnitCost: string;
  packagingUnitCost: string;
};

type DetailedProductionItemInput = DetailedItemBaseInput & {
  kind: "manufacturing";
  costMode: DetailedProductionCostMode;
  productionUnitCost: string;
  recipeYield: string;
  lossRate: string;
  packagingUnitCost: string;
  directLaborUnitCost: string;
  otherVariableUnitCost: string;
  ingredients: DetailedIngredientInput[];
};

type DetailedDiagnosisInput = {
  submissionId: string;
  category: DetailedDiagnosisCategory;
  fixedMonthlyExpenses: string;
  proLaboreIncluded: boolean;
  proLabore: string;
  taxRate: string;
  cardFeeRate: string;
  promotionMarginRate: string;
  items: Array<DetailedProductItemInput | DetailedProductionItemInput>;
};
```

Normalized ingredients use `quantityMillionths` and `unitCostTenThousandths`; normalized money uses cents and rates use basis points. Keep the item `id` UUID and add a derived zero-based `position` during transformation.

- [ ] **Step 3: Add failing validation tests for every discriminated branch**

Cover:

```ts
expect(parse(validProductInput).items[0]).toMatchObject({
  kind: "resale",
  monthlySalesVolume: null,
  purchaseUnitCostCents: 0,
});
expect(parse({ ...validProductInput, items: [{ ...product, monthlySalesVolume: "0" }] }).items[0].monthlySalesVolume).toBe(0);
expect(parse(validTechnicalSheetInput).items[0]).toMatchObject({
  kind: "manufacturing",
  costMode: "technical_sheet",
  recipeYield: 20,
  lossRateBasisPoints: 1000,
  ingredients: [expect.objectContaining({ quantityMillionths: 500_000 })],
});
```

Reject category/item mismatches, blank names, duplicate item UUIDs, duplicate ingredient UUIDs within an item, no items, loss `>= 100%`, zero yield, empty ingredient lists, zero ingredient total, negative costs, summarized cost `<= 0`, and invalid volume.

- [ ] **Step 4: Run the schema test and observe the missing module failure**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/decimal-input.test.ts
```

Expected: the new detailed module imports fail until implemented.

- [ ] **Step 5: Implement strict Zod validation and nested error paths**

Use discriminated unions for item `kind` and Production `costMode`. Normalize empty optional costs to zero only where the contract permits it. Export:

```ts
type DetailedDiagnosisFieldErrors = Record<string, string[]>;

function detailedIssuePath(issue: z.core.$ZodIssue): string {
  return issue.path.map(String).join(".");
}

function validateDetailedDiagnosisPaths(
  paths: readonly string[],
  input: DetailedDiagnosisInput,
): DetailedDiagnosisFieldErrors;
```

`validateDetailedDiagnosisPaths` parses the full object and returns only issues whose dot-path equals or starts with one of the requested paths. This supports step validation without maintaining a second schema.

- [ ] **Step 6: Run the detailed schema tests**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/decimal-input.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the detailed input contract**

```bash
git add src/modules/detailed-diagnosis/types.ts src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/decimal-input.ts src/modules/quick-diagnosis/schemas/decimal-input.test.ts
git commit -m "feat: define detailed diagnosis contract"
```

---

### Task 6: Calculate resale and technical-sheet item economics

**Files:**

- Create: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts`
- Create: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts`
- Modify: `src/modules/detailed-diagnosis/types.ts`

**Interfaces:**

- Consumes: one normalized detailed item plus global tax, card, and promotion-margin basis points from Task 5.
- Produces: `calculateDetailedItem(item, rates): DetailedItemCalculation`, with variable cost, fees, contribution, nullable monthly totals, and both price floors.

- [ ] **Step 1: Define the result interface in tests**

Write Product, summarized Production, and technical-sheet fixtures and assert:

```ts
type DetailedItemCalculation = {
  itemId: string;
  variableUnitCostCents: number;
  feeAmountCents: number;
  netUnitRevenueCents: number;
  unitContributionCents: number;
  contributionMarginBasisPoints: number | null;
  monthlyGrossRevenueCents: number | null;
  monthlyContributionCents: number | null;
  breakEvenUnitPriceCents: number | null;
  promotionFloorCents: number | null;
  directLoss: boolean;
};
```

Use the documented example for a R$120 recipe, yield 30, loss 10%, R$1 packaging, R$15 price, and 200 units; add non-zero labor and other cost cases separately.

- [ ] **Step 2: Add exact fractional-ingredient and boundary tests**

Cover `0.5 kg × R$ 5.0000/kg`, sub-cent unit price, 99.99% loss, tax+card at 100%, tax+card+promotion margin at 100%, zero sale price rejection at schema level, missing volume, zero volume, and negative contribution.

- [ ] **Step 3: Run the item-calculator test and observe the missing implementation failure**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts
```

Expected: FAIL because `calculateDetailedItem` does not exist.

- [ ] **Step 4: Implement integer-only ingredient and unit-cost calculation**

Use `BigInt` and the existing integer helpers. The technical-sheet core is:

```ts
const ingredientTotalTenThousandths = item.ingredients.reduce(
  (sum, ingredient) =>
    sum +
    divideRound(
      BigInt(ingredient.quantityMillionths) *
        BigInt(ingredient.unitCostTenThousandths),
      1_000_000n,
    ),
  0n,
);

const sellableIngredientUnitTenThousandths = divideRound(
  ingredientTotalTenThousandths * 10_000n,
  BigInt(item.recipeYield) * BigInt(10_000 - item.lossRateBasisPoints),
);
const ingredientUnitCents = divideRound(
  sellableIngredientUnitTenThousandths,
  100n,
);
```

If the repository helper is named `roundDivide`, use that exact helper rather than adding a duplicate. Add packaging, direct labor, and other variable cents only in `technical_sheet`; summarized mode uses only `productionUnitCostCents`.

- [ ] **Step 5: Implement fees, contribution, nullable monthly totals, and floors**

Use:

```ts
netUnitRevenue = round(price * (10_000 - tax - card) / 10_000)
unitContribution = netUnitRevenue - variableUnitCost
breakEvenPrice = ceil(variableUnitCost * 10_000 / (10_000 - tax - card))
promotionFloor = ceil(
  variableUnitCost * 10_000 /
    (10_000 - tax - card - promotionMargin)
)
```

Return `null` for non-positive denominators. Monthly gross/contribution values remain `null` for unknown volume and become zero for explicit zero.

- [ ] **Step 6: Run the item-calculator suite**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit item calculations**

```bash
git add src/modules/detailed-diagnosis/types.ts src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts
git commit -m "feat: calculate detailed item economics"
```

---

### Task 7: Aggregate the mix and build deterministic guidance

**Files:**

- Create: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.ts`
- Create: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts`
- Create: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts`
- Create: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts`
- Modify: `src/modules/detailed-diagnosis/types.ts`

**Interfaces:**

- Consumes: `DetailedDiagnosisCommand` and `calculateDetailedItem` from Tasks 5–6.
- Produces: `calculateDetailedDiagnosis(command): DetailedDiagnosisCalculation` and `buildDetailedGuidance(command, calculation): DetailedGuidance[]`.

- [ ] **Step 1: Add failing aggregate tests for complete, partial, and all-zero mixes**

Define the result contract:

```ts
type DetailedDiagnosisCalculation = {
  effectiveFixedCostCents: number;
  isPartial: boolean;
  missingVolumeItemIds: string[];
  items: DetailedItemCalculation[];
  monthlyGrossRevenueCents: number | null;
  monthlyContributionCents: number | null;
  monthlyResultCents: number | null;
  mixContributionMarginBasisPoints: number | null;
  finalMarginBasisPoints: number | null;
  breakEvenRevenueCents: number | null;
  verdict:
    | "direct_loss"
    | "incomplete_volume"
    | "no_sales"
    | "operational_loss"
    | "break_even"
    | "tight_margin"
    | "adequate_margin";
  priority: "cost" | "data" | "price" | "margin" | "volume";
};
```

Assert one missing volume makes every mix-dependent field null and preserves item-level values; all explicit zero volumes produce `no_sales` and `-effectiveFixedCostCents`; complete profitable/loss/break-even mixes receive the matching verdict.

- [ ] **Step 2: Add failing guidance-rule tests**

Define:

```ts
type DetailedGuidance = {
  key:
    | "missing_volume"
    | "direct_loss"
    | "concentration"
    | "best_unit_contribution"
    | "high_volume_low_margin"
    | "business_result";
  tone: "neutral" | "positive" | "warning" | "critical";
  title: string;
  body: string;
  itemIds: string[];
};
```

Test 45% concentration, highest unit contribution, highest-volume/worst-positive-margin, one/multiple direct-loss items, and missing-volume item names. Assert missing-volume guidance is neutral.

- [ ] **Step 3: Run aggregate and guidance tests and observe missing modules**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
```

Expected: FAIL because both modules are absent.

- [ ] **Step 4: Implement aggregate calculations with an all-or-nothing mix boundary**

Use:

```ts
const isPartial = itemCalculations.some(
  (item) => item.monthlyGrossRevenueCents === null,
);
const effectiveFixedCostCents =
  command.fixedMonthlyExpensesCents + command.proLaboreCents;
```

If partial, return `null` for all mix-dependent results and `incomplete_volume`/`data`, unless at least one item has direct loss; retain `direct_loss`/`cost` as the top-level priority while still marking `isPartial: true`. For a complete mix, sum with `BigInt`, calculate both contribution and final margins, and return `null` for break-even revenue when the contribution margin is non-positive.

- [ ] **Step 5: Implement ordered, mutually compatible guidance rules**

Return guidance in this order: missing volume, direct loss, business result, concentration, high-volume low-margin, best unit contribution. Concentration uses a strictly greater than 45% share of positive consolidated contribution. Do not run monthly mix rules for a partial report.

- [ ] **Step 6: Run aggregate and guidance suites**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit aggregate calculation and guidance**

```bash
git add src/modules/detailed-diagnosis/types.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
git commit -m "feat: aggregate detailed diagnosis mix"
```

---

### Task 8: Define the immutable detailed report snapshot

**Files:**

- Create: `src/modules/reports/schemas/detailed-report-snapshot.schema.ts`
- Create: `src/modules/reports/domain/build-detailed-report-snapshot.ts`
- Create: `src/modules/reports/domain/build-detailed-report-snapshot.test.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/types.ts`

**Interfaces:**

- Consumes: detailed command, calculation, and guidance from Tasks 5–7.
- Produces: `DetailedReportSnapshotV1`, `CurrentDetailedReportSnapshot`, `parseDetailedReportSnapshot`, and `buildDetailedReportSnapshot` with exact versions `1/1/1` and `analysisMode: "detailed"`.

- [ ] **Step 1: Add a failing complete and partial snapshot fixture**

The strict top-level shape is:

```ts
{
  schemaVersion: 1,
  calculationVersion: 1,
  contentVersion: 1,
  analysisMode: "detailed",
  category: "product" | "production",
  scenario: "resale" | "manufacturing",
  currency: "BRL",
  unit: "mix",
  policy: {
    promotionMarginBasisPoints: number,
    concentrationThresholdBasisPoints: 4500,
    weeklyDivisorHundredths: 433,
    operatingDaysPerWeek: 6,
    proLaboreIncluded: boolean,
  },
  inputs: DetailedDiagnosisCommand,
  results: DetailedDiagnosisCalculation,
  guidance: DetailedGuidance[],
}
```

Assert a Product complete fixture and Production partial fixture parse, while mismatched category/item kind, unsorted positions, inconsistent partial flags, and incoherent summary totals fail.

- [ ] **Step 2: Run the union schema test and observe failure**

Run:

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts
```

Expected: detailed fixtures are rejected by the existing three-category quick union.

- [ ] **Step 3: Implement the strict detailed schema and coherence checks**

Use the reusable report content tone enum but define dedicated guidance content. Verify:

- category/scenario/item-kind coherence;
- one or more items and unique ordered positions;
- ingredient positions and IDs are unique per item;
- `isPartial` equals presence of null item volumes;
- `missingVolumeItemIds` exactly matches null-volume items in order;
- top-level results equal sums/derived fields represented in item results;
- inputs and results reference identical item IDs and positions.

- [ ] **Step 4: Add the detailed schema to the report union without shadowing quick schemas**

Use a discriminated precheck on `analysisMode` instead of relying on broad union order:

```ts
function parseReportSnapshot(value: unknown): ReportSnapshot {
  if (
    typeof value === "object" &&
    value !== null &&
    "analysisMode" in value &&
    value.analysisMode === "detailed"
  ) {
    return detailedReportSnapshotSchema.parse(value);
  }
  return quickReportSnapshotSchema.parse(value);
}
```

Keep the exported `reportSnapshotSchema` as a union for type inference and tests.

- [ ] **Step 5: Implement the pure snapshot builder**

Build input and result arrays in position order, call `buildDetailedGuidance`, then validate the output with `parseDetailedReportSnapshot` before returning it.

- [ ] **Step 6: Run snapshot builder and parser tests**

Run:

```bash
pnpm vitest run src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/schemas/report-snapshot.schema.test.ts
```

Expected: PASS for legacy quick snapshots, corrected quick snapshots, and detailed V1 snapshots.

- [ ] **Step 7: Commit the detailed snapshot contract**

```bash
git add src/modules/reports/schemas/detailed-report-snapshot.schema.ts src/modules/reports/domain/build-detailed-report-snapshot.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/schemas/report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/types.ts
git commit -m "feat: define detailed report snapshot"
```

---

### Task 9: Add normalized detailed persistence and atomic report creation

**Files:**

- Create: `supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql`
- Create: `supabase/tests/detailed_diagnosis_reports.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts`
- Create: `src/modules/reports/services/create-detailed-report.service.ts`
- Create: `src/modules/reports/services/create-detailed-report.service.test.ts`

**Interfaces:**

- Consumes: `DetailedDiagnosisCommand` and `CurrentDetailedReportSnapshot`.
- Produces: `create_detailed_diagnosis_report(...) -> bigint`, normalized parent/item/ingredient rows, generated TypeScript definitions, and `createDetailedReport`.

- [ ] **Step 1: Write pgTAP tests for schema, RLS, constraints, and atomic RPC behavior**

Cover:

- `diagnoses.analysis_mode` defaults existing/quick writes to `quick`;
- `current_price_cents` permits null only for detailed rows through a check constraint;
- detailed rows use `unit = 'mix'`;
- required summary columns are present for detailed rows;
- parent, item, and ingredient tables reject invalid shapes;
- authenticated users select only their own rows;
- direct inserts are denied;
- one RPC call inserts parent, ordered items, and ingredients;
- malformed snapshot/input JSON inserts nothing;
- repeated equivalent UUID returns the same diagnosis ID;
- reusing the UUID for another diagnosis is rejected;
- free-tier limit counts the whole mix once.

- [ ] **Step 2: Run the new SQL test and observe missing-schema failures**

Run:

```bash
pnpm supabase:reset
```

Expected: new detailed SQL tests fail because tables, columns, and RPC do not exist.

- [ ] **Step 3: Extend the diagnoses registry for explicit analysis mode and mix summaries**

Add:

```sql
alter table public.diagnoses
add column analysis_mode text not null default 'quick',
add column monthly_gross_revenue_cents bigint,
add column monthly_result_cents bigint,
add column item_count integer,
add column is_partial boolean;

alter table public.diagnoses
alter column current_price_cents drop not null;
```

Add checks for `analysis_mode in ('quick', 'detailed')`, `unit in ('hour', 'appointment', 'unit', 'mix')`, non-negative monthly gross revenue/item count, and row shape:

```sql
(analysis_mode = 'quick' and current_price_cents is not null and unit <> 'mix')
or
(analysis_mode = 'detailed' and current_price_cents is null and unit = 'mix'
 and item_count > 0 and is_partial is not null)
```

Do not backfill or rewrite report snapshots.

- [ ] **Step 4: Create normalized detailed tables**

Create `detailed_diagnoses`, `detailed_diagnosis_items`, and `detailed_diagnosis_ingredients`. Include `diagnosis_id`, `user_id`, submission/client UUIDs, ordered `position`, normalized source fields, and persisted calculated fields. Enforce unique `(diagnosis_id, position)` and `(diagnosis_id, client_item_id)`, category/mode checks, null-volume-or-nonnegative checks, and ingredient scales greater than or equal to zero. Use `on delete restrict`, matching existing immutable report data.

Grant `select` only to `authenticated`, enable RLS, and create owner-select policies using `(select auth.uid()) = user_id`. Revoke sequence access and all direct mutations.

- [ ] **Step 5: Implement the security-definer detailed RPC**

Signature:

```sql
public.create_detailed_diagnosis_report(
  p_submission_id uuid,
  p_category public.business_category,
  p_fixed_monthly_expenses_cents bigint,
  p_pro_labore_included boolean,
  p_pro_labore_cents bigint,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
  p_promotion_margin_basis_points integer,
  p_items jsonb,
  p_schema_version smallint,
  p_calculation_version smallint,
  p_content_version smallint,
  p_monthly_gross_revenue_cents bigint,
  p_monthly_result_cents bigint,
  p_real_margin_basis_points integer,
  p_verdict text,
  p_priority text,
  p_item_count integer,
  p_is_partial boolean,
  p_report_snapshot jsonb
) returns bigint
```

Use a private implementation with `security definer`, `set search_path = ''`, explicit `pg_catalog` qualification, `auth.uid()`, advisory locking, existing paid/free access checks, and exact `1/1/1` validation. Parse item/ingredient JSON with explicit `jsonb_to_recordset` column definitions. Check JSON lengths and summary values against the snapshot before inserts. Grant only the public wrapper to `authenticated`.

- [ ] **Step 6: Reset, lint, and regenerate database types**

Run:

```bash
pnpm supabase:reset
pnpm supabase:lint
pnpm supabase:types
```

Expected: all pgTAP tests and lint pass; generated types include new tables, columns, and RPC.

- [ ] **Step 7: Add failing service mapping tests**

Assert `toDetailedRpcArgs(command, snapshot)` passes source-normalized ordered items, nullable aggregate summaries, exact versions, and snapshot JSON. Assert RPC limit error maps to `limit_reached`, malformed IDs map to `create_failed`, and a positive integer ID succeeds.

- [ ] **Step 8: Implement `createDetailedReport`**

Export:

```ts
type CreateDetailedReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" | "limit_reached" };

async function createDetailedReport(input: {
  supabase: SupabaseClient<Database>;
  command: DetailedDiagnosisCommand;
  snapshot: CurrentDetailedReportSnapshot;
}): Promise<CreateDetailedReportResult>;
```

Serialize only normalized command data in `p_items`; never serialize raw browser strings.

- [ ] **Step 9: Run service and SQL tests**

Run:

```bash
pnpm vitest run src/modules/reports/services/create-detailed-report.service.test.ts
pnpm supabase:reset
```

Expected: PASS.

- [ ] **Step 10: Commit detailed persistence**

```bash
git add supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql supabase/tests/detailed_diagnosis_reports.test.sql src/infrastructure/database/supabase/database.types.ts src/modules/reports/services/create-detailed-report.service.ts src/modules/reports/services/create-detailed-report.service.test.ts
git commit -m "feat: persist detailed diagnosis reports"
```

---

### Task 10: Orchestrate authenticated detailed report creation

**Files:**

- Create: `src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.ts`
- Create: `src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts`
- Modify: `src/modules/detailed-diagnosis/types.ts`

**Interfaces:**

- Consumes: schema from Task 5, aggregate calculator from Task 7, snapshot builder from Task 8, report service from Task 9, and existing `requireUser`.
- Produces: `createDetailedDiagnosis(input): Promise<CreateDetailedDiagnosisActionResult>` with `success`, `invalid_input`, `unauthorized`, `limit_reached`, and `create_failed` outcomes.

- [ ] **Step 1: Write failing orchestration-order and result-mapping tests**

Mock each boundary and verify:

```ts
expect(validationOrder).toEqual([
  "validate",
  "authenticate",
  "calculate",
  "snapshot",
  "persist",
]);
```

Malformed nested input must return dot-path field errors without calling `requireUser`. Authentication failure must stop before calculation. Persistence limit and failure results must pass through. Success returns the diagnosis ID.

- [ ] **Step 2: Run the action test and observe the missing module failure**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts
```

Expected: FAIL because the action does not exist.

- [ ] **Step 3: Define action result types**

Add:

```ts
type CreateDetailedDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: DetailedDiagnosisFieldErrors;
    }
  | {
      status: "error";
      error: "unauthorized" | "limit_reached" | "create_failed";
    };
```

- [ ] **Step 4: Implement the Server Action in the required order**

The action body must follow:

```ts
const parsed = detailedDiagnosisSchema.safeParse(input);
if (!parsed.success) return invalidDetailedInput(parsed.error);

try {
  const { supabase } = await requireUser();
  const calculation = calculateDetailedDiagnosis(parsed.data);
  const snapshot = buildDetailedReportSnapshot(parsed.data, calculation);
  return await createDetailedReport({
    supabase,
    command: parsed.data,
    snapshot,
  });
} catch (error) {
  if (error instanceof AuthRequiredError) {
    return { status: "error", error: "unauthorized" };
  }
  return { status: "error", error: "create_failed" };
}
```

- [ ] **Step 5: Run the action suite**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the Server Action**

```bash
git add src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.ts src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts src/modules/detailed-diagnosis/types.ts
git commit -m "feat: create detailed diagnosis action"
```

---

### Task 11: Build the repeatable detailed wizard reducer

**Files:**

- Create: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Create: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`

**Interfaces:**

- Consumes: raw input/item types and nested field errors from Task 5.
- Produces: `createInitialDetailedWizardState`, `detailedWizardReducer`, `DetailedWizardState`, `DetailedWizardAction`, and stable phases `fixedExpenses | ownerCompensation | fees | itemBasics | itemCosts | itemComplete | review`.

- [ ] **Step 1: Write reducer tests for initial Product and Production states**

Assert Product starts with one resale item and Production starts with one manufacturing item whose `costMode` is `technical_sheet`, `recipeYield` is `"1"`, `lossRate` is `"0"`, and one blank ingredient exists. Both start with promotion margin `"15"`.

- [ ] **Step 2: Write reducer tests for repeated item flow**

Cover:

- general and active-item field changes clear only the matching error;
- adding an item completes the current item and activates a new UUID;
- editing an existing item preserves all other items;
- removing a populated item requires a `requestRemoveItem` then `confirmRemoveItem` pair;
- the last item cannot be removed;
- ingredient add/remove preserves stable UUIDs and at least one line;
- switching Production cost mode preserves raw inactive-mode values;
- back/next uses stable phase progress;
- applying server errors opens the first invalid item and phase;
- submitting locks duplicate submit actions;
- reset uses a new submission UUID.

- [ ] **Step 3: Run the reducer test and observe missing implementation**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
```

Expected: FAIL because the reducer is absent.

- [ ] **Step 4: Implement state and action contracts**

Use:

```ts
type DetailedWizardState = {
  phase: DetailedWizardPhase;
  itemSubstep: "basics" | "costs" | "complete";
  activeItemId: string;
  values: DetailedDiagnosisInput;
  fieldErrors: DetailedDiagnosisFieldErrors;
  pendingRemovalItemId: string | null;
  status: "editing" | "submitting";
  submitError: "unauthorized" | "limit_reached" | "create_failed" | null;
};
```

Inject `createId: () => string` into initialization/actions so tests never rely on global randomness. Keep reducer updates immutable.

- [ ] **Step 5: Implement phase resolution for nested server errors**

Parse paths such as `items.1.ingredients.0.quantity`, set the matching item active, and map common fields to `fixedExpenses`, `ownerCompensation`, or `fees`; item base fields to `itemBasics`; all cost/ingredient fields to `itemCosts`.

- [ ] **Step 6: Run the reducer suite**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit wizard state**

```bash
git add src/modules/detailed-diagnosis/components/detailed-wizard-state.ts src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
git commit -m "feat: add repeatable detailed wizard state"
```

---

### Task 12: Implement detailed wizard steps and accessible item editing

**Files:**

- Create: `src/modules/detailed-diagnosis/components/steps/detailed-fixed-expenses-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-owner-compensation-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-fees-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-item-basics-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-product-costs-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-production-costs-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/ingredient-fields.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-item-complete-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-review-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`

**Interfaces:**

- Consumes: state/action types from Task 11 and existing neutral `StepField`, `WizardShell`, Button, Switch, RadioGroup, AlertDialog, and Card components.
- Produces: controlled, category-specific step components with dot-path field IDs and errors.

- [ ] **Step 1: Add failing accessible interaction tests for common steps**

Assert visible labels/help, switch relationships, field error `role="alert"`, focusable inputs, and the exact approved volume copy. Test the three review labels: `Volume ainda não informado`, `Nenhuma venda no mês`, and `37 unidades por mês`.

- [ ] **Step 2: Add failing Product cost-step tests**

Assert only purchase cost and packaging appear, values remain controlled, and category copy says resale rather than manufacturing.

- [ ] **Step 3: Add failing Production mode and ingredient tests**

Assert technical sheet is initially selected; summarized mode exposes one total-cost field; technical mode exposes yield, loss, packaging, labor, other costs, and at least one ingredient; add/remove buttons have accessible names including ingredient position; the last ingredient cannot be removed.

- [ ] **Step 4: Add failing item-complete and review interaction tests**

Assert `Adicionar outro produto`, `Revisar diagnóstico`, `Editar`, and removal confirmation dispatch exact actions. A partial review must show pending item names and keep `Gerar diagnóstico detalhado` enabled without an extra checkbox.

- [ ] **Step 5: Run the step suite and observe missing components**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx
```

Expected: FAIL because the components are absent.

- [ ] **Step 6: Implement common business steps using existing quick-flow language**

Reuse the approved labels:

```tsx
<StepField label="Gastos que existem todo mês" prefix="R$" />
<Label>Você quer incluir o valor que recebe pelo seu trabalho?</Label>
<StepField label="Quanto você quer receber por mês?" prefix="R$" />
```

Fees remain global and explicitly say they apply to every item.

- [ ] **Step 7: Implement basics and Product cost steps**

Basics contains required name, positive sale price, and optional volume with visible help. Product cost contains non-negative purchase and packaging fields. IDs and `aria-describedby` use stable dot paths such as `items.0.monthlySalesVolume`.

- [ ] **Step 8: Implement Production cost modes and ingredients**

Use a semantic RadioGroup for `summarized | technical_sheet`. In technical mode, render ingredients as a fieldset with legend `Ingredientes da receita`, row labels that remain available to screen readers, and no unit conversion claim. Ensure every icon-only remove control has `aria-label="Remover ingrediente N"` and at least 44×44 px target.

- [ ] **Step 9: Implement completion/review cards and destructive confirmation**

Show cost mode, price, volume state, and raw cost summary. Use `AlertDialog` for populated-item removal. Do not use color alone for partial or direct-loss states; pair icon, text, and badge.

- [ ] **Step 10: Run step tests**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx
```

Expected: PASS.

- [ ] **Step 11: Commit detailed step components**

```bash
git add src/modules/detailed-diagnosis/components/steps
git commit -m "feat: build detailed diagnosis steps"
```

---

### Task 13: Connect the detailed wizard to Product and Production mode selection

**Files:**

- Create: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx`
- Create: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/analysis-mode-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/analysis-mode-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`

**Interfaces:**

- Consumes: detailed reducer/steps from Tasks 11–12 and `createDetailedDiagnosis` from Task 10.
- Produces: an enabled Detailed option in Product/Production, root-level detailed branch state, step validation, submission, and `/reports/{id}` navigation.

- [ ] **Step 1: Add failing analysis-mode tests**

Assert both mode screens render an enabled `Diagnóstico detalhado` radio with category-specific descriptions and no `Em breve`/lock. Assert selecting it calls `onChange("detailed")`.

- [ ] **Step 2: Add failing root-orchestration tests**

Cover:

- Product → Detailed initializes category `product` and a resale item;
- Production → Detailed initializes category `production` and technical sheet;
- back from the first detailed phase returns to the matching mode screen with `detailed` selected;
- switching back to Quick initializes a fresh quick state;
- Service never renders Detailed;
- the page supplies the detailed Server Action.

- [ ] **Step 3: Add failing detailed-wizard flow tests**

Drive one Product and one multi-item Production flow with user-event. Assert progressive validation, stable phase progress (`3` through `7`), local headings such as `Produto 2 · custos`, preserved values after edit, only one submission while pending, invalid server paths focus the matching field, error retry preserves state, and success calls `router.replace("/reports/123")`.

- [ ] **Step 4: Run orchestration suites and observe disabled/missing behavior**

Run:

```bash
pnpm vitest run src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
```

Expected: tests fail because Detailed is disabled and the new wizard/action prop do not exist.

- [ ] **Step 5: Enable mode controls and expose `onStartDetailed`**

Remove lock rendering for Detailed. In each quick branch, change mode handling:

```ts
if (state.analysisMode === "detailed") {
  onStartDetailed();
  return;
}
if (state.analysisMode === "quick") {
  dispatch({ type: "next" });
  return;
}
```

Keep the error only when no mode is selected.

- [ ] **Step 6: Add a root detailed branch**

Extend the root union:

```ts
type ActiveDiagnosisBranch =
  | ExistingBranches
  | {
      type: "detailed";
      category: "product" | "production";
      state: DetailedWizardState;
    };
```

Initialize with `createInitialDetailedWizardState(category, submissionId, itemId, ingredientId)`. Returning to mode creates a fresh category quick state and applies `setAnalysisMode: "detailed"` before rendering it.

- [ ] **Step 7: Implement the detailed wizard controller**

Map phase to stable progress:

```ts
const progressByPhase = {
  fixedExpenses: 3,
  ownerCompensation: 4,
  fees: 5,
  itemBasics: 6,
  itemCosts: 6,
  itemComplete: 6,
  review: 7,
} as const;
```

Validate only phase paths before dispatching `next`. On final server errors, dispatch the normalized field map and focus the first invalid element after the phase changes. Use the same submit lock pattern as existing quick wizards.

- [ ] **Step 8: Inject the Server Action from the private page**

Import `createDetailedDiagnosis` and pass `createDetailedDiagnosis={createDetailedDiagnosis}` to `QuickDiagnosisWizard`. Update prop types and page tests.

- [ ] **Step 9: Run all wizard/page tests**

Run:

```bash
pnpm vitest run src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit wizard integration**

```bash
git add src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/product/steps/analysis-mode-step.tsx src/modules/quick-diagnosis/components/production/steps/analysis-mode-step.tsx src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
git commit -m "feat: enable detailed diagnosis wizard"
```

---

### Task 14: Present detailed reports in the library and detail route

**Files:**

- Modify: `src/modules/reports/services/list-reports.service.ts`
- Modify: `src/modules/reports/services/list-reports.service.test.ts`
- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Create: `src/modules/reports/components/detailed-report-detail.tsx`
- Create: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Create: `src/modules/reports/components/detailed-business-summary.tsx`
- Create: `src/modules/reports/components/detailed-item-breakdown.tsx`
- Create: `src/modules/reports/components/detailed-item-card.tsx`
- Create: `src/modules/reports/components/detailed-guidance-list.tsx`
- Modify: `src/modules/reports/services/get-report.service.ts`
- Modify: `src/modules/reports/services/get-report.service.test.ts`
- Modify: `src/app/(private)/reports/[id]/page.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`

**Interfaces:**

- Consumes: detailed registry summaries from Task 9 and parsed detailed snapshots from Task 8.
- Produces: `OwnedReportSummary.analysisMode` plus nullable mix summary fields, a dedicated detailed list-card branch, and `DetailedReportDetail` rendering complete/partial snapshots.

- [ ] **Step 1: Add failing report-list service tests for detailed columns**

Extend selected fields and expected mapping:

```ts
type OwnedReportSummary = {
  // existing identity/version fields
  analysisMode: "quick" | "detailed";
  currentPriceCents: number | null;
  monthlyGrossRevenueCents: number | null;
  monthlyResultCents: number | null;
  itemCount: number | null;
  isPartial: boolean | null;
};
```

Assert pagination order/cursors remain unchanged.

- [ ] **Step 2: Add failing detailed list-card tests**

Assert a detailed card shows `Diagnóstico detalhado`, category, `3 produtos`, `Completo` or `Parcial`, result/margin only when available, and an accessible report link. Assert quick cards retain current price/unit-profit presentation.

- [ ] **Step 3: Add failing detailed detail-view tests**

For a complete Product snapshot assert conclusion, business totals, break-even revenue, item comparison, direct-loss warning, price floors, and guidance. For a partial Production snapshot assert pending item names, neutral tone, unavailable mix sections, technical-sheet details, and no AI control.

- [ ] **Step 4: Add failing route-dispatch tests**

Mock `getOwnedReport` with quick and detailed snapshots. Assert quick uses `ReportDetail`; detailed uses `DetailedReportDetail`; locked, unavailable, not-found, and read-failed states remain unchanged.

- [ ] **Step 5: Run list/detail tests and observe missing detailed branches**

Run:

```bash
pnpm vitest run src/modules/reports/services/list-reports.service.test.ts src/modules/reports/components/report-library.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/services/get-report.service.test.ts src/app/'(private)'/reports/'[id]'/page.test.tsx
```

Expected: failures show missing columns, components, and route dispatch.

- [ ] **Step 6: Extend list mapping and branch the card presentation**

Select the five new registry columns. In `ReportListCard`, render a dedicated detailed card when `analysisMode === "detailed"`; never format nullable `currentPriceCents` in that branch. Keep current quick markup and language lookup unchanged.

- [ ] **Step 7: Implement the detailed report composition**

`DetailedReportDetail` accepts:

```ts
function DetailedReportDetail(props: {
  id: number;
  createdAt: string;
  snapshot: CurrentDetailedReportSnapshot;
}): React.ReactNode;
```

Use semantic headings and definition lists. The item breakdown orders by monthly contribution when complete and by item position when partial. CSS bars include visible labels/values and an `aria-label`; negative/positive meaning is repeated in text. Item cards disclose technical details without hiding the primary conclusion.

- [ ] **Step 8: Dispatch by snapshot analysis mode in the route**

Use a type guard:

```ts
if (result.report.snapshot.analysisMode === "detailed") {
  return <DetailedReportDetail {...result.report} />;
}
return <ReportDetail viewModel={toReportViewModel(result.report)} />;
```

Narrow with an `isDetailedReportSnapshot` helper if TypeScript requires it; do not add detailed conditionals throughout the quick presenter.

- [ ] **Step 9: Run report tests**

Run:

```bash
pnpm vitest run src/modules/reports/services/list-reports.service.test.ts src/modules/reports/components/report-library.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/services/get-report.service.test.ts src/app/'(private)'/reports/'[id]'/page.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit detailed report presentation**

```bash
git add src/modules/reports/services/list-reports.service.ts src/modules/reports/services/list-reports.service.test.ts src/modules/reports/components/report-list-card.tsx src/modules/reports/components/report-library.test.tsx src/modules/reports/components/detailed-report-detail.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/detailed-business-summary.tsx src/modules/reports/components/detailed-item-breakdown.tsx src/modules/reports/components/detailed-item-card.tsx src/modules/reports/components/detailed-guidance-list.tsx src/modules/reports/services/get-report.service.ts src/modules/reports/services/get-report.service.test.ts src/app/'(private)'/reports/'[id]'/page.tsx src/app/'(private)'/reports/'[id]'/page.test.tsx
git commit -m "feat: present detailed diagnosis reports"
```

---

### Task 15: Update business documentation and run the release gate

**Files:**

- Modify: `docs/QUICK-DIAGNOSIS.md`
- Modify: `docs/DETAILED-DIAGNOSIS.md`
- Modify: `PRODUCT.md`
- Test: all project test, type, lint, formatting, Supabase lint/advisor, and production build commands.

**Interfaces:**

- Consumes: final implemented behavior from Tasks 1–14.
- Produces: documentation that describes the implemented contracts rather than the obsolete prototype, plus a clean release verification.

- [ ] **Step 1: Update quick-diagnosis rules for the three volume states**

Replace statements that blank volume is calculated as zero. Document:

```text
vazio → análise parcial, resultado mensal indisponível, meta mensal apenas de referência
0 → mês conhecido sem vendas, resultado mensal igual aos gastos mensais negativos
positivo → análise mensal completa
```

State that daily/weekly targets are hidden only for unknown volume and that old saved reports are not recalculated.

- [ ] **Step 2: Update detailed-diagnosis rules from prototype to implemented behavior**

Revise the document to include step-by-step item flow, separate owner compensation, required validation, Production labor/other costs, no automatic volume mutation, partial reports, atomic persistence, and no AI/PDF/history in this delivery. Preserve the explanation that estoque is a financial mix, not physical inventory.

- [ ] **Step 3: Update the product overview**

In `PRODUCT.md`, mark detailed Product/Production diagnosis as available, summarize multiple-item/ficha-técnica support, and describe partial volume behavior in the same plain language.

- [ ] **Step 4: Run focused feature suites**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis src/modules/reports src/modules/quick-diagnosis
```

Expected: PASS.

- [ ] **Step 5: Run database reset, lint, and advisors**

Run:

```bash
pnpm supabase:reset
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all SQL tests pass and no error/warn gate fails.

- [ ] **Step 6: Run the complete repository quality gate**

Run:

```bash
pnpm check
pnpm build
```

Expected: tests, generated route types, TypeScript, ESLint, Prettier, and production build all pass.

- [ ] **Step 7: Inspect the final diff for accidental scope and generated-type drift**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Confirm no physical inventory, AI, PDF, historical comparison, post-report invitation, or unrelated admin changes entered the diff. Confirm `docs/DETAILED-DIAGNOSIS.md` is intentionally tracked with the implementation documentation.

- [ ] **Step 8: Commit documentation and release verification fixes**

```bash
git add docs/QUICK-DIAGNOSIS.md docs/DETAILED-DIAGNOSIS.md PRODUCT.md
git commit -m "docs: document detailed diagnosis behavior"
```

If verification required code corrections, stage those exact correction files with their nearest owning task instead of hiding them in the documentation commit.

