# Production Quick Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete authenticated quick diagnosis for one manufactured unit, with summarized or composed unit cost, deterministic calculations, immutable reports, atomic persistence, and the existing report-library experience, without changing Service or Product behavior.

**Architecture:** Production is a separate vertical with its own input contract, post-authentication cost composer, calculator, snapshot builder, persistence service, Server Action, reducer, steps, table, and RPC. The quick-diagnosis entry only selects and mounts the vertical; reports use the strict category-discriminated snapshot union and share presentation primitives only after Production business content has been resolved and persisted.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript 5.9, Zod 4, Supabase JS/SSR 2, PostgreSQL 17/RLS/pgTAP, Vitest, Testing Library, Base UI/shadcn, and Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-01-production-quick-diagnosis-design.md`

## Global Constraints

- Service V2 remains exactly `schemaVersion: 2`, `calculationVersion: 1`, and `contentVersion: 2`; Product V1 remains exactly version `1` for all three fields.
- Production V1 is exactly `schemaVersion: 1`, `calculationVersion: 1`, `contentVersion: 1`, `category: "production"`, `scenario: "manufacturing"`, `currency: "BRL"`, and `unit: "unit"`.
- Production target margin is exactly 20% (`2_000` basis points), lower tolerance is `50` basis points, above-target begins strictly above 23%, weekly divisor is `4.33`, operating days per week is `6`, and maximum simulated discount is `50%`.
- Money is parsed and persisted as safe integer cents; percentages are integer basis points; calculations use the existing `BigInt`-backed integer helpers and persist no binary floating-point values.
- Summarized mode requires one positive ready-unit production cost and persists all four component columns as `null`.
- Composed mode accepts non-negative material, packaging, direct-labor, and other-variable costs; their sum must be a positive safe integer and is the authoritative production unit cost.
- The Zod boundary parses and validates before authentication. The final authoritative component sum and `ProductionDiagnosisCommand` are built only after `requireUser()`.
- Direct labor means variable labor per unit. UI and report copy must warn against duplicating monthly owner compensation.
- Unit sale price is positive. Fixed expenses, tax, and card fee are required and may be zero.
- Monthly volume is optional; when present it is sold units and an integer from `1` through `2_147_483_647`.
- Owner compensation starts disabled. Disabled compensation normalizes to zero; enabled compensation is positive.
- Missing volume produces `incomplete_volume`/`data`; fixed allocation, total unit cost, unit profit, and real margin remain `null`.
- Non-positive contribution produces `direct_loss`/`cost` before missing-volume classification. Sales goals are unavailable in that state.
- The Action order is fixed: Zod validation, `requireUser()`, authoritative command composition, pure calculation, pure snapshot construction, and authenticated RPC persistence.
- The browser never sends `user_id`, performs no definitive report calculation, and cannot select persisted category, scenario, unit, or version values.
- The Production RPC is the only write path. `anon` has no table/function access; `authenticated` has SELECT-own and RPC execute only, with no direct mutations.
- The RPC requires `auth.uid()`, uses `SECURITY DEFINER`, `search_path = ''`, fully qualified relations, revoked default execution, scalar/snapshot consistency checks, and atomic generic/detail insertion.
- Same-user/same-submission retries return the original complete Production report. Cross-category UUID reuse and generic rows missing Production detail fail closed.
- Saved reports are immutable and never recalculated. Unsupported category/version combinations return the existing unavailable state.
- Detailed analysis remains visible and disabled as `Em breve`; no technical-sheet, ingredients list, yield, waste, inventory, freight, public report, AI interpretation, or new dependency is added.
- Changing category discards the abandoned branch and creates a new UUID. Back/Edit within Production preserves raw strings; failed retry preserves the same UUID.
- Do not edit `.env.local`, run remote migrations, use service-role credentials, or create browser artifacts in the repository.
- Database changes use ordered imperative migrations created with `supabase migration new`; the enum label migration must precede SQL that uses `production`.
- Every behavior change follows TDD: focused failing test, observed expected failure, minimal implementation, focused passing test, then relevant regressions.
- Every task ends with one coherent commit and a reviewer checkpoint before the next task.

---

## File Structure

| Path                                                                                | Responsibility                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `supabase/migrations/*_add_production_business_category.sql`                        | Add only the `production` enum label.                                               |
| `supabase/migrations/*_create_production_diagnosis_reports.sql`                     | Extend registry constraints and add Production table, RLS, grants, and RPC.         |
| `supabase/tests/production_diagnosis_reports.test.sql`                              | Verify schema, cost shapes, authorization, atomicity, consistency, and idempotency. |
| `src/infrastructure/database/supabase/database.types.ts`                            | Generated Production table/enum/RPC boundary; never hand-edit.                      |
| `src/modules/quick-diagnosis/types.ts`                                              | Independent Production raw, validated, command, field-error, and Action contracts.  |
| `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts`                | Parse and conditionally normalize raw Production input.                             |
| `src/modules/quick-diagnosis/domain/compose-production-diagnosis-command.ts`        | Recalculate the authoritative composed cost after authentication.                   |
| `src/modules/reports/domain/calculate-production-report.ts`                         | Pure Production V1 unit-economics and verdict policy.                               |
| `src/modules/reports/schemas/production-report-snapshot.schema.ts`                  | Strict Production V1 persisted runtime contract.                                    |
| `src/modules/reports/schemas/report-snapshot.schema.ts`                             | Dispatch Service, Product, and Production snapshots.                                |
| `src/modules/reports/domain/build-production-executive-summary.ts`                  | Deterministic Production summary wording.                                           |
| `src/modules/reports/domain/build-production-report-snapshot.ts`                    | Build five Production sections and strict immutable snapshot.                       |
| `src/modules/reports/services/create-production-report.service.ts`                  | Map trusted command/snapshot to the typed RPC.                                      |
| `src/modules/quick-diagnosis/actions/create-production-diagnosis.action.ts`         | Enforce validation/auth/composition/calculation/persistence order.                  |
| `src/modules/quick-diagnosis/components/production/production-wizard-state.ts`      | Production-only raw state, composition behavior, navigation, and retry state.       |
| `src/modules/quick-diagnosis/components/production/steps/**`                        | Production modality, values/composition, operating inputs, fees, and review.        |
| `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx` | Step validation, focus, lock, Action invocation, and redirect.                      |
| `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`                 | Category selection and lifecycle for all three independent branches.                |
| `src/modules/reports/presenters/to-report-view-model.ts`                            | Produce Production report identity and number labels.                               |
| `src/modules/reports/components/discount-simulator.tsx`                             | Render partial/complete unit simulation for Product or Production.                  |
| `src/modules/reports/components/report-list-card.tsx`                               | Render Production cards in the private report library.                              |
| `src/modules/reports/formatters.ts`                                                 | Add the exhaustive `manufacturing` label.                                           |
| `src/app/(private)/quick-diagnosis/page.tsx`                                        | Inject the Production Action into the orchestrator.                                 |

## Shared Contracts

These names and shapes are authoritative across tasks:

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

type ProductionDiagnosisValidatedInput = {
  submissionId: string;
  costCompositionEnabled: boolean;
  productionUnitCostCents: number | null;
  materialUnitCostCents: number | null;
  packagingUnitCostCents: number | null;
  directLaborUnitCostCents: number | null;
  otherVariableUnitCostCents: number | null;
  unitSalePriceCents: number;
  fixedMonthlyExpensesCents: number;
  monthlySalesVolume: number | null;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};

type ProductionDiagnosisCommand = Omit<
  ProductionDiagnosisValidatedInput,
  "productionUnitCostCents"
> & {
  productionUnitCostCents: number;
};

type ProductionDiagnosisField = keyof ProductionDiagnosisInput;
type ProductionDiagnosisFieldErrors = Partial<
  Record<ProductionDiagnosisField, string[]>
>;

type CreateProductionDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: ProductionDiagnosisFieldErrors;
    }
  | { status: "error"; error: "unauthorized" | "create_failed" };
```

```ts
type ProductionReportVerdict =
  | "direct_loss"
  | "incomplete_volume"
  | "operational_loss"
  | "tight_margin"
  | "adequate_margin"
  | "above_target";

type ProductionReportPriority = "cost" | "data" | "price" | "margin" | "volume";

type ProductionReportCalculation = {
  effectiveFixedCostCents: number;
  productionUnitCostCents: number;
  fixedAllocationCents: number | null;
  totalUnitCostCents: number | null;
  currentPriceCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
  unitProfitCents: number | null;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  targetPriceCents: number | null;
  priceReferencesPartial: boolean;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  totalFeeBasisPoints: number;
  verdict: ProductionReportVerdict;
  priority: ProductionReportPriority;
};
```

---

### Task 1: Add the Production database contract and atomic RPC

**Files:**

- Create via CLI: `supabase/migrations/*_add_production_business_category.sql`
- Create via CLI: `supabase/migrations/*_create_production_diagnosis_reports.sql`
- Create: `supabase/tests/production_diagnosis_reports.test.sql`
- Modify: `supabase/tests/service_diagnoses.test.sql`
- Test: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/product_diagnosis_reports.test.sql`

**Interfaces:**

- Consumes: `public.business_category`, `public.diagnoses`, `auth.users`, existing Service/Product RPCs.
- Produces: enum label `production`, pair `production + manufacturing`, `public.production_diagnoses`, and `public.create_production_diagnosis_report(...) returns bigint`.

- [ ] **Step 1: Confirm local migration and database-test commands**

```bash
test ! -d supabase/schemas
pnpm exec supabase migration new --help
pnpm exec supabase test db --help
pnpm exec supabase db reset --help
```

Expected: imperative migrations and every local command are available. Do not run linked/remote commands.

- [ ] **Step 2: Write the failing pgTAP structure and authorization contract**

Create one transaction using `extensions.pgtap`, two fixed Auth users, `set local role authenticated`, and JWT subject switching. Assert:

```sql
select enum_has_labels(
  'public', 'business_category', array['service', 'product', 'production']
);
select has_table('public', 'production_diagnoses');
select columns_are(
  'public', 'production_diagnoses',
  array[
    'diagnosis_id', 'submission_id', 'user_id',
    'cost_composition_enabled', 'production_unit_cost_cents',
    'material_unit_cost_cents', 'packaging_unit_cost_cents',
    'direct_labor_unit_cost_cents', 'other_variable_unit_cost_cents',
    'unit_sale_price_cents', 'fixed_monthly_expenses_cents',
    'monthly_sales_volume', 'pro_labore_included', 'pro_labore_cents',
    'tax_rate_basis_points', 'card_fee_rate_basis_points'
  ]
);
select col_is_pk('public', 'production_diagnoses', 'diagnosis_id');
select ok(has_table_privilege('authenticated', 'public.production_diagnoses', 'select'));
select ok(not has_table_privilege('authenticated', 'public.production_diagnoses', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.production_diagnoses', 'update'));
select ok(not has_table_privilege('authenticated', 'public.production_diagnoses', 'delete'));
select ok(not has_table_privilege('anon', 'public.production_diagnoses', 'select'));
```

Assert the RPC signature in this exact parameter order:

```text
uuid, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
integer, boolean, bigint, integer, integer, smallint, smallint,
smallint, text, bigint, integer, bigint, text, text, text, jsonb
```

Verify `prosecdef`, `proconfig = array['search_path=""']`, no `PUBLIC`/`anon` execute, and authenticated execute.

- [ ] **Step 3: Add failing cost-shape, RLS, consistency, and atomicity cases**

Use a complete composed fixture with total `5000 = 3000 + 500 + 1000 + 500`, price `10000`, fixed expenses `100000`, volume `100`, compensation `200000`, tax `600`, card `200`, and a Production V1 snapshot carrying the same scalars.

Use a summarized fixture with total `5000`, all four components `null`, volume `null`, compensation disabled/zero, and partial report results.

Add concrete `lives_ok`, `throws_ok`, `results_eq`, and row-count assertions for:

```text
valid: summarized shape; composed shape; own SELECT; exact retry
23514: total 0; sale price 0; fixed expense -1; volume 0
23514: summarized with any component non-null
23514: composed with any component null or negative
23514: composed total different from component sum
23514: disabled compensation nonzero; enabled compensation zero
23514: tax/card below 0 or above 10000
42501: anonymous RPC; direct authenticated INSERT/UPDATE/DELETE
22023: wrong version/category/scenario/unit
22023: every input/result scalar differing from snapshot
23505: Product or Service submission UUID reused for Production
23505: Production generic row without Production detail on retry
atomicity: detail constraint failure leaves no generic diagnosis row
RLS: own row visible; other user's row invisible
```

- [ ] **Step 4: Run the new test and observe the absent contract**

```bash
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
```

Expected: FAIL because the enum label, table, constraint pair, and RPC do not exist.

- [ ] **Step 5: Create the ordered migrations through the CLI**

```bash
pnpm exec supabase migration new add_production_business_category
pnpm exec supabase migration new create_production_diagnosis_reports
```

The first migration contains only:

```sql
alter type public.business_category add value if not exists 'production';
```

The second migration extends `diagnoses_scenario_check` with:

```sql
or (
  business_category = 'production'
  and scenario = 'manufacturing'
)
```

Keep the existing verdict, priority, and unit accepted sets unchanged because Production reuses their already-supported literal values.

- [ ] **Step 6: Implement the table, constraints, grants, and RLS**

```sql
create table public.production_diagnoses (
  diagnosis_id bigint primary key references public.diagnoses (id) on delete restrict,
  submission_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  cost_composition_enabled boolean not null,
  production_unit_cost_cents bigint not null,
  material_unit_cost_cents bigint,
  packaging_unit_cost_cents bigint,
  direct_labor_unit_cost_cents bigint,
  other_variable_unit_cost_cents bigint,
  unit_sale_price_cents bigint not null,
  fixed_monthly_expenses_cents bigint not null,
  monthly_sales_volume integer,
  pro_labore_included boolean not null,
  pro_labore_cents bigint not null,
  tax_rate_basis_points integer not null,
  card_fee_rate_basis_points integer not null,
  constraint production_diagnoses_user_submission_key unique (user_id, submission_id),
  constraint production_diagnoses_prices_check check (
    production_unit_cost_cents > 0 and unit_sale_price_cents > 0
  ),
  constraint production_diagnoses_cost_shape_check check (
    (
      not cost_composition_enabled
      and material_unit_cost_cents is null
      and packaging_unit_cost_cents is null
      and direct_labor_unit_cost_cents is null
      and other_variable_unit_cost_cents is null
    ) or (
      cost_composition_enabled
      and material_unit_cost_cents is not null
      and packaging_unit_cost_cents is not null
      and direct_labor_unit_cost_cents is not null
      and other_variable_unit_cost_cents is not null
      and material_unit_cost_cents >= 0
      and packaging_unit_cost_cents >= 0
      and direct_labor_unit_cost_cents >= 0
      and other_variable_unit_cost_cents >= 0
      and production_unit_cost_cents = material_unit_cost_cents
        + packaging_unit_cost_cents
        + direct_labor_unit_cost_cents
        + other_variable_unit_cost_cents
    )
  )
);
```

Add named checks for fixed expenses, volume, compensation, tax, and card equivalent to the approved bounds. Revoke all table privileges from `anon, authenticated`, grant SELECT to authenticated, enable RLS, and add only `production_diagnoses_select_own` using `(select auth.uid()) = user_id`.

- [ ] **Step 7: Implement the atomic RPC**

Create `public.create_production_diagnosis_report` with the Step 2 signature, `SECURITY DEFINER`, and `set search_path = ''`. It must:

```text
require auth.uid()
require versions 1/1/1, scenario manufacturing, unit unit
require snapshot object plus inputs/results/summary/sections/base shapes
require snapshot category production
compare every command scalar, nullable component, and generic result scalar
insert diagnoses as production/manufacturing/unit
on conflict, join production_diagnoses and validate same-category ownership
insert production_diagnoses in the same transaction
return the generic diagnosis id
```

Use `is distinct from` for every nullable comparison, including four components, volume, margin, and profit. Revoke the full signature from `PUBLIC, anon` and grant it only to `authenticated`.

- [ ] **Step 8: Rebuild, run all database gates, and commit**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
git add supabase/migrations supabase/tests/production_diagnosis_reports.test.sql supabase/tests/service_diagnoses.test.sql supabase/tests/product_diagnosis_reports.test.sql
git commit -m "feat: add production diagnosis database contract"
```

Update only the enum-label expectations in `service_diagnoses.test.sql` and `product_diagnosis_reports.test.sql` to include `production`. Expected: all Service, Product, and Production pgTAP suites pass with no unreviewed lint/advisor error.

**Checkpoint:** Report generated migration paths, both cost shapes, exact-sum enforcement, RLS/grants, idempotency, cross-category rejection, rollback, and existing RPC regressions. Wait for approval.

---

### Task 2: Regenerate the typed Supabase boundary

**Files:**

- Modify by generator only: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: reset local schema and `scripts/generate-database-types.mjs`.
- Produces: enum union including `production`, `production_diagnoses` types, and exact Production RPC args.

- [ ] **Step 1: Regenerate from a clean local database**

```bash
pnpm supabase:reset
pnpm supabase:types
```

Expected: only the generated types file changes. Never hand-edit it.

- [ ] **Step 2: Verify all generated contracts and no drift**

```bash
rg -n 'production_diagnoses|create_production_diagnosis_report|"production"|manufacturing' src/infrastructure/database/supabase/database.types.ts
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

Expected: all four searches match and the second generation has no diff.

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
pnpm exec prettier --check src/infrastructure/database/supabase/database.types.ts
git add src/infrastructure/database/supabase/database.types.ts
git commit -m "chore: regenerate production diagnosis database types"
```

**Checkpoint:** Show generated row/insert/update relationships, nullable component/RPC args, enum union, and no-drift result. Wait for approval.

---

### Task 3: Validate Production input and compose the authoritative command

**Files:**

- Modify: `src/modules/quick-diagnosis/types.ts`
- Create: `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts`
- Create: `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts`
- Create: `src/modules/quick-diagnosis/domain/compose-production-diagnosis-command.ts`
- Create: `src/modules/quick-diagnosis/domain/compose-production-diagnosis-command.test.ts`
- Test: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts`
- Test: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`

**Interfaces:**

- Consumes: raw browser strings and existing `moneySchema`, `percentageSchema`, `scaledInteger`.
- Produces: Shared Contracts, `productionDiagnosisSchema`, `validateProductionDiagnosisFields`, and `composeProductionDiagnosisCommand(validated)`.

- [ ] **Step 1: Write failing summarized and composed schema tests**

Use this composed fixture:

```ts
const validProduction: ProductionDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  costCompositionEnabled: true,
  productionUnitCost: "texto ignorado",
  materialUnitCost: "30,00",
  packagingUnitCost: "5",
  directLaborUnitCost: "10,00",
  otherVariableUnitCost: "5,00",
  unitSalePrice: "100,00",
  fixedMonthlyExpenses: "1.000,00",
  monthlySalesVolume: "100",
  proLaboreIncluded: true,
  proLabore: "2.000,00",
  taxRate: "6",
  cardFeeRate: "2",
};
```

Assert the schema returns `productionUnitCostCents: null`, components `3000/500/1000/500`, and the remaining normalized integer fields. Assert summarized mode accepts `productionUnitCost: "50,00"`, ignores stale component text, and returns all component cents `null`.

Add table-driven rejects for invalid UUID, summarized cost zero, composed aggregate zero, negative/three-decimal/unsafe active cost, unsafe component aggregate, sale price zero, empty or negative fixed expenses, volume `0`/`1,5`/`2147483648`, enabled empty/zero compensation, empty tax/card fields, and rates outside `0..100`. Accept blank component fields as zero, fixed expense string `"0"`, blank volume, volume bounds, disabled stale compensation, and rate boundary strings `"0"`/`"100"`.

- [ ] **Step 2: Write failing filtered-field and composer tests**

```ts
expect(
  validateProductionDiagnosisFields(["productionUnitCost", "unitSalePrice"], {
    ...validProduction,
    costCompositionEnabled: false,
    productionUnitCost: "0",
    unitSalePrice: "0",
  }),
).toEqual({
  productionUnitCost: ["Informe um custo de produção maior que zero."],
  unitSalePrice: ["Informe um preço de venda maior que zero."],
});
```

```ts
expect(composeProductionDiagnosisCommand(validatedComposed)).toEqual({
  ...validatedComposed,
  productionUnitCostCents: 5000,
});
expect(composeProductionDiagnosisCommand(validatedSummarized)).toEqual({
  ...validatedSummarized,
  productionUnitCostCents: 5000,
});
```

Assert the composer re-sums components instead of accepting a total and rejects impossible nullable shape, non-positive aggregate, and unsafe aggregate.

- [ ] **Step 3: Run focused tests and observe missing exports**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts src/modules/quick-diagnosis/domain/compose-production-diagnosis-command.test.ts
```

Expected: FAIL because Production contracts, schema, and composer do not exist.

- [ ] **Step 4: Implement the strict conditional schema**

Build a `z.strictObject` for exactly the raw keys. Parse only active cost fields: summarized mode parses `productionUnitCost` and normalizes components to `null`; composed mode parses four components, treats blank as zero through `moneySchema`, validates positive/safe aggregate, and normalizes summarized cost to `null`.

```ts
const productionDiagnosisSchema: z.ZodType<
  ProductionDiagnosisValidatedInput,
  ProductionDiagnosisInput
> = rawProductionDiagnosisSchema
  .superRefine(validateConditionalCostsAndCompensation)
  .transform(normalizeProductionInput);
```

Implement `validateProductionDiagnosisFields(fields, values)` with the same first-path filtering behavior as Product. Attach aggregate errors to `materialUnitCost` so the first visible composed field receives focus.

- [ ] **Step 5: Implement post-authentication authoritative composition**

```ts
function composeProductionDiagnosisCommand(
  input: ProductionDiagnosisValidatedInput,
): ProductionDiagnosisCommand {
  if (!input.costCompositionEnabled) {
    if (input.productionUnitCostCents === null)
      throw new Error("invalid_cost_shape");
    return { ...input, productionUnitCostCents: input.productionUnitCostCents };
  }

  const components = [
    input.materialUnitCostCents,
    input.packagingUnitCostCents,
    input.directLaborUnitCostCents,
    input.otherVariableUnitCostCents,
  ];
  if (components.some((value) => value === null))
    throw new Error("invalid_cost_shape");
  const total = components.reduce((sum, value) => sum + BigInt(value!), 0n);
  if (total <= 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("invalid_cost_total");
  }
  return { ...input, productionUnitCostCents: Number(total) };
}
```

- [ ] **Step 6: Verify regressions and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts src/modules/quick-diagnosis/domain/compose-production-diagnosis-command.test.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas src/modules/quick-diagnosis/domain
pnpm exec prettier --check src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas src/modules/quick-diagnosis/domain
git add src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts src/modules/quick-diagnosis/domain
git commit -m "feat: validate production diagnosis input"
```

**Checkpoint:** Show both normalized modes, inactive-field normalization, aggregate safety, post-auth composer output, filtered errors, and Service/Product schema regressions. Wait for approval.

---

### Task 4: Calculate the Production report with integer arithmetic

**Files:**

- Modify: `src/modules/reports/types.ts`
- Create: `src/modules/reports/domain/calculate-production-report.ts`
- Create: `src/modules/reports/domain/calculate-production-report.test.ts`

**Interfaces:**

- Consumes: `ProductionDiagnosisCommand` and existing integer helpers.
- Produces: Production verdict/priority/calculation types, constants, `classifyProductionMargin`, and `calculateProductionReport`.

- [ ] **Step 1: Write the failing canonical complete test**

Use composed command total `5000`, sale price `10000`, fixed `100000`, volume `100`, compensation `200000`, and fees `600 + 200`. Assert:

```ts
expect(calculateProductionReport(command)).toEqual({
  effectiveFixedCostCents: 300000,
  productionUnitCostCents: 5000,
  fixedAllocationCents: 3000,
  totalUnitCostCents: 8000,
  currentPriceCents: 10000,
  netRevenueCents: 9200,
  unitContributionCents: 4200,
  unitProfitCents: 1200,
  realMarginBasisPoints: 1200,
  minimumPriceCents: 8696,
  targetPriceCents: 11112,
  priceReferencesPartial: false,
  monthlySalesGoal: 72,
  weeklySalesGoal: 17,
  dailySalesGoal: 3,
  breakEvenDiscountPercent: 13,
  totalFeeBasisPoints: 800,
  verdict: "tight_margin",
  priority: "margin",
});
```

- [ ] **Step 2: Write failing partial, denominator, rounding, and verdict tests**

With `monthlySalesVolume: null`, assert nullable complete fields, minimum `5435`, target `6945`, partial flag, goals `72/17/3`, discount `46`, and `incomplete_volume/data`. At sale price `5000`, assert contribution `-400`, all goals `null`, and `direct_loss/cost` before missing volume.

Test margin boundaries `1949`, `1950`, `2300`, `2301`; contribution zero; fees `10000` make minimum `null`; fees plus target `>=10000` make target `null`; fixed allocation, price references, and goals round upward.

- [ ] **Step 3: Run and observe the missing calculator**

```bash
pnpm test -- src/modules/reports/domain/calculate-production-report.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 4: Implement the independent pure calculator**

Use constants named `PRODUCTION_TARGET_MARGIN_BPS`, `PRODUCTION_MARGIN_TOLERANCE_BPS`, `PRODUCTION_ABOVE_TARGET_BPS`, and `PRODUCTION_OPERATING_DAYS_PER_WEEK`. Implement the exact classification order from the spec and the same approved integer rounding policy as Product, replacing purchase cost with `command.productionUnitCostCents`.

```ts
const referenceCostCents =
  totalUnitCostCents ?? command.productionUnitCostCents;
const priceReferencesPartial = command.monthlySalesVolume === null;
```

Do not call Product calculation functions or widen Product command types.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- src/modules/reports/domain/calculate-production-report.test.ts src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-service-report.test.ts src/modules/reports/domain/integer-math.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/types.ts src/modules/reports/domain/calculate-production-report.ts src/modules/reports/domain/calculate-production-report.test.ts
pnpm exec prettier --check src/modules/reports/types.ts src/modules/reports/domain/calculate-production-report.ts src/modules/reports/domain/calculate-production-report.test.ts
git add src/modules/reports/types.ts src/modules/reports/domain/calculate-production-report.ts src/modules/reports/domain/calculate-production-report.test.ts
git commit -m "feat: calculate production quick diagnosis"
```

**Checkpoint:** Report canonical complete/partial outputs, all classification boundaries, invalid denominators, rounding, direct-loss precedence, and existing calculator regressions. Wait for approval.

---

### Task 5: Add the strict Production V1 snapshot contract

**Files:**

- Modify: `src/modules/reports/types.ts`
- Create: `src/modules/reports/schemas/production-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/formatters.ts`
- Modify: `src/modules/reports/formatters.test.ts`

**Interfaces:**

- Consumes: Production command/calculation shapes and neutral content schemas.
- Produces: `ProductionReportSnapshotV1`, Production discount base, parser, three-category `ReportSnapshot`, and scenario `manufacturing`.

- [ ] **Step 1: Write failing complete/composed and summarized/partial fixtures**

Add Production constants all equal to `1`, verdict/priority aliases, unit `unit`, and `manufacturing` to `reportScenarios`. Build one strict composed fixture with four numeric components and one summarized partial fixture with four `null` components.

Assert:

```ts
expect(parseReportSnapshot(validProductionSnapshot).category).toBe(
  "production",
);
expect(parseReportSnapshot(partialProductionSnapshot)).toEqual(
  partialProductionSnapshot,
);
expect(formatReportScenario("manufacturing")).toBe("Fabricação própria");
```

- [ ] **Step 2: Write failing invariant and dispatch cases**

Reject Production V2, wrong scenario/category/unit, unknown fields, noninteger money, summarized mode with any component, composed mode with a null/negative component, mismatched component sum, compensation mismatch, result cost/price mismatch, incomplete fields with volume, complete fields without volume, mismatched discount base, and reordered/duplicated sections/facts/answers. Retain successful Service V2 and Product V1 parsing and reject Product snapshots relabeled as Production.

- [ ] **Step 3: Run focused parser/formatter tests**

```bash
pnpm test -- src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/formatters.test.ts
```

Expected: FAIL because Production schema and scenario formatting do not exist.

- [ ] **Step 4: Implement the strict Production schema**

Create strict policy, inputs, results, and discount-base schemas. Inputs contain the exact command fields; `productionUnitCostCents` is positive, component cents are non-negative nullable, and cost-mode shape is checked in `superRefine`.

```ts
const productionReportSnapshotV1Schema = z.strictObject({
  schemaVersion: z.literal(PRODUCTION_REPORT_SCHEMA_VERSION),
  calculationVersion: z.literal(PRODUCTION_CALCULATION_VERSION),
  contentVersion: z.literal(PRODUCTION_CONTENT_VERSION),
  category: z.literal("production"),
  scenario: z.literal("manufacturing"),
  currency: z.literal("BRL"),
  unit: z.literal("unit"),
  policy: productionReportPolicySchema,
  inputs: productionReportInputsSchema,
  results: productionReportResultsSchema,
  executiveSummary: reportExecutiveSummarySchema,
  sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
  discountSimulationBase: productionReportDiscountSimulationBaseSchema,
});
```

Add the same complete/partial, compensation, ordered-content, and discount-base invariants as required by the fixture tests, plus exact component-sum checks.

- [ ] **Step 5: Extend only the public read union and formatters**

```ts
const reportSnapshotSchema = z.discriminatedUnion("category", [
  serviceReportSnapshotV2Schema,
  productReportSnapshotV1Schema,
  productionReportSnapshotV1Schema,
]);
```

Extend `ReportDiscountSimulationBase` with the Production base and add `manufacturing: "Fabricação própria"` to the exhaustive formatter map. Do not change existing snapshot schemas.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/formatters.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts
pnpm exec prettier --check src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts
git add src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts
git commit -m "feat: add production report snapshot contract"
```

**Checkpoint:** Show both cost modes, partial/complete invariants, strict version dispatch, exact-sum rejection, formatter output, and Service/Product parser regressions. Wait for approval.

---

### Task 6: Build deterministic Production report content and snapshots

**Files:**

- Create: `src/modules/reports/domain/build-production-executive-summary.ts`
- Create: `src/modules/reports/domain/build-production-executive-summary.test.ts`
- Create: `src/modules/reports/domain/build-production-report-snapshot.ts`
- Create: `src/modules/reports/domain/build-production-report-snapshot.test.ts`

**Interfaces:**

- Consumes: Production command, calculation, strict parser, and formatters.
- Produces: `buildProductionExecutiveSummary` and `buildProductionReportSnapshot`.

- [ ] **Step 1: Write failing executive-summary content tests**

Assert exact fact order `margin, price`, answer order `profitability, price_sufficiency, immediate_action`, and this matrix:

```text
direct_loss       -> Prejuízo direto / critical / correct production cost or price
incomplete_volume -> Complete o diagnóstico / neutral / provide monthly sold volume
operational_loss  -> Prejuízo operacional / critical / correct price or allocated operation
tight_margin      -> Margem apertada / warning / move toward 20%
adequate_margin   -> Margem adequada / positive / maintain required volume
above_target      -> Acima da meta / positive / validate market acceptance
```

The partial fixture must show margin `Indisponível`, price reference `sem rateio fixo`, positive contribution without claiming real profit, and a request for monthly sales volume. Direct loss must never recommend more volume.

- [ ] **Step 2: Write failing snapshot/section tests**

Assert exact versions/discriminants/policy/inputs/results and bases:

```ts
expect(complete.discountSimulationBase).toEqual({
  originalPriceCents: 10000,
  unitCostCents: 8000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2000,
  minimumPriceCents: 8696,
  partial: false,
});
expect(partial.discountSimulationBase).toEqual({
  originalPriceCents: 10000,
  unitCostCents: 5000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2000,
  minimumPriceCents: 5435,
  partial: true,
});
```

Assert five ordered keys, non-empty deterministic bodies, Production terms `fabricação`, `unidade`, `20%`, `6 dias`, the direct-labor/pro-labore distinction when composition is enabled, and absence of `custo de compra`, `fornecedor`, `hora faturável`, and `atendimento`.

- [ ] **Step 3: Run and observe missing builders**

```bash
pnpm test -- src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts
```

Expected: FAIL because Production builders do not exist.

- [ ] **Step 4: Implement the Production executive summary**

Use private Production-only verdict, priority, fact, and answer helpers. Export:

```ts
function buildProductionExecutiveSummary(
  calculation: ProductionReportCalculation,
): ReportExecutiveSummary;
```

Headline: `A verdade por trás do preço da sua produção.` Introduction must explain what each manufactured sale leaves and how fixed costs affect the unit. Use `custo de fabricação` rather than Product purchase terminology.

- [ ] **Step 5: Implement five sections and assemble the strict snapshot**

Implement one private builder for each existing key. Required meanings:

```text
break_even: production cost + fees + fixed allocation, or explicit partial reference
hidden_cost: production cost, fixed allocation, total unit cost; mention composition premise
margin_diagnosis: six Production verdicts and 20% target
sales_goal: positive contribution yields month/week/day at 6 days; loss yields no volume advice
discount_simulator: complete uses profit/real margin; partial uses contribution language
```

Build `ProductionReportSnapshotV1` with command cost-mode fields and validate once through `parseProductionReportSnapshot(snapshot)` before returning.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/domain/build-production-executive-summary.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.ts src/modules/reports/domain/build-production-report-snapshot.test.ts
pnpm exec prettier --check src/modules/reports/domain/build-production-executive-summary.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.ts src/modules/reports/domain/build-production-report-snapshot.test.ts
git add src/modules/reports/domain/build-production-executive-summary.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.ts src/modules/reports/domain/build-production-report-snapshot.test.ts
git commit -m "feat: build production diagnosis reports"
```

**Checkpoint:** Show all verdict/priority messages, ordered content, both cost modes, complete/partial bases, direct-labor warning, and Service/Product content regressions. Wait for approval.

---

### Task 7: Persist Production reports through the typed RPC

**Files:**

- Create: `src/modules/reports/services/create-production-report.service.ts`
- Create: `src/modules/reports/services/create-production-report.service.test.ts`

**Interfaces:**

- Consumes: typed Supabase client, `ProductionDiagnosisCommand`, `ProductionReportSnapshotV1`.
- Produces: `toProductionRpcArgs` and `createProductionReport` with safe result union.

- [ ] **Step 1: Write failing exact-mapping and nullable-mode tests**

Mock `supabase.rpc` and assert name `create_production_diagnosis_report` plus all 26 arguments. The composed call carries four component cents; summarized call carries four `null`s. Both map versions, scenario, price, nullable margin/profit, verdict, priority, unit, and full JSON snapshot.

```ts
expect(supabase.rpc).toHaveBeenCalledWith(
  "create_production_diagnosis_report",
  expect.objectContaining({
    p_cost_composition_enabled: true,
    p_production_unit_cost_cents: 5000,
    p_material_unit_cost_cents: 3000,
    p_packaging_unit_cost_cents: 500,
    p_direct_labor_unit_cost_cents: 1000,
    p_other_variable_unit_cost_cents: 500,
    p_scenario: "manufacturing",
    p_report_snapshot: snapshot,
  }),
);
```

- [ ] **Step 2: Write failing response-sanitization tests**

Assert positive safe integer data returns success. Provider error, thrown RPC, `null`, strings, zero, negative, fraction, and unsafe integer all return `{ status: "error", error: "create_failed" }`; no provider message escapes.

- [ ] **Step 3: Run and observe the missing service**

```bash
pnpm test -- src/modules/reports/services/create-production-report.service.test.ts
```

- [ ] **Step 4: Implement the typed service**

Mirror the generated nullable-argument narrowing pattern already used by Product, but define Production-local `GeneratedProductionRpcArgs` and `ProductionRpcArgs`. Export only the create service and its input/result types; keep `toProductionRpcArgs` module-private unless tests require a named export.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- src/modules/reports/services/create-production-report.service.test.ts src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-service-report.service.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/services/create-production-report.service.ts src/modules/reports/services/create-production-report.service.test.ts
pnpm exec prettier --check src/modules/reports/services/create-production-report.service.ts src/modules/reports/services/create-production-report.service.test.ts
git add src/modules/reports/services/create-production-report.service.ts src/modules/reports/services/create-production-report.service.test.ts
git commit -m "feat: persist production diagnosis reports"
```

**Checkpoint:** Show composed/summarized argument mapping, nullable fields, response validation, safe errors, and existing persistence regressions. Wait for approval.

---

### Task 8: Expose the authenticated Production Server Action

**Files:**

- Create: `src/modules/quick-diagnosis/actions/create-production-diagnosis.action.ts`
- Create: `src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts`

**Interfaces:**

- Consumes: raw Production input, schema, `requireUser`, command composer, calculator, snapshot builder, persistence service.
- Produces: `createProductionDiagnosis(input): Promise<CreateProductionDiagnosisActionResult>`.

- [ ] **Step 1: Write failing invalid-input and unauthorized ordering tests**

Assert invalid input returns field errors and calls none of `requireUser`, composer, calculator, builder, or service. When `requireUser` throws `AuthRequiredError`, return `unauthorized` and call no post-auth function.

- [ ] **Step 2: Write failing exact success-order and safe-failure tests**

```ts
await expect(createProductionDiagnosis(validInput)).resolves.toEqual({
  status: "success",
  diagnosisId: 42,
});
expect(composeProductionDiagnosisCommand).toHaveBeenCalledWith(validated);
expect(calculateProductionReport).toHaveBeenCalledWith(command);
expect(buildProductionReportSnapshot).toHaveBeenCalledWith(
  command,
  calculation,
);
expect(createProductionReport).toHaveBeenCalledWith({
  supabase,
  command,
  snapshot,
});
```

Use `mock.invocationCallOrder` to prove auth precedes composer and composer precedes calculator. Assert unexpected composer/calculator/builder/service exceptions and service failure become safe `create_failed`.

- [ ] **Step 3: Run and observe the missing Action**

```bash
pnpm test -- src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts
```

- [ ] **Step 4: Implement the ordered thin Action**

```ts
const parsed = productionDiagnosisSchema.safeParse(input);
if (!parsed.success) {
  return {
    status: "error",
    error: "invalid_input",
    fieldErrors: parsed.error.flatten().fieldErrors,
  };
}
try {
  const { supabase } = await requireUser();
  const command = composeProductionDiagnosisCommand(parsed.data);
  const calculation = calculateProductionReport(command);
  const snapshot = buildProductionReportSnapshot(command, calculation);
  return await createProductionReport({ supabase, command, snapshot });
} catch (error) {
  if (error instanceof AuthRequiredError)
    return { status: "error", error: "unauthorized" };
  return { status: "error", error: "create_failed" };
}
```

- [ ] **Step 5: Verify all category Actions and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/actions
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/actions
pnpm exec prettier --check src/modules/quick-diagnosis/actions
git add src/modules/quick-diagnosis/actions/create-production-diagnosis.action.ts src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts
git commit -m "feat: create production diagnoses securely"
```

**Checkpoint:** Report validation-before-auth, auth-before-composition, exact orchestration, safe exceptions, and Service/Product Action regressions. Wait for approval.

---

### Task 9: Build Production wizard state and input steps

**Files:**

- Create: `src/modules/quick-diagnosis/components/production/production-wizard-state.ts`
- Create: `src/modules/quick-diagnosis/components/production/production-wizard-state.test.ts`
- Create: `src/modules/quick-diagnosis/components/production/steps/types.ts`
- Create: `src/modules/quick-diagnosis/components/production/steps/analysis-mode-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/steps/production-values-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/steps/production-fixed-expenses-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/steps/monthly-volume-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/steps/owner-compensation-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/steps/production-fees-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx`

**Interfaces:**

- Consumes: Production raw fields/errors and neutral `StepField`.
- Produces: Production reducer/state/steps, `deriveProductionUnitCostDisplay(values)`, and six accessible input/modality screens.

- [ ] **Step 1: Write failing reducer initialization and navigation tests**

```ts
expect(createInitialProductionWizardState(submissionId).values).toEqual({
  submissionId,
  costCompositionEnabled: false,
  productionUnitCost: "",
  materialUnitCost: "",
  packagingUnitCost: "",
  directLaborUnitCost: "",
  otherVariableUnitCost: "",
  unitSalePrice: "",
  fixedMonthlyExpenses: "",
  monthlySalesVolume: "",
  proLaboreIncluded: false,
  proLabore: "",
  taxRate: "",
  cardFeeRate: "",
});
```

Assert seven local steps, raw-string preservation, field-error clearing, next/back clamping, named edits, compensation clearing, submitting/error/reset states, and modality error clearing.

- [ ] **Step 2: Write failing composition state tests**

Set summarized cost `40,00`, enable composition, enter `30/5/10/5`, and assert derived display `50,00`. Disable composition and assert `productionUnitCost` becomes `50,00` while four raw components remain in state. Re-enable and assert restoration. Clear/alter a component and assert only its error clears.

The exported selector `deriveProductionUnitCostDisplay(values)` derives display text only; it must not produce domain cents, margin, price references, or persisted report values.

- [ ] **Step 3: Write failing accessible step tests**

Assert Quick is enabled, Detailed disabled with `Em breve`; summarized cost and sale price fields exist; composition switch is keyboard accessible; composed fields and read-only total appear only when enabled; direct-labor help explicitly distinguishes pró-labore; fixed expense accepts `0`; volume says optional and sold units; compensation starts off; tax/card exist; all errors link through `aria-invalid`, `aria-describedby`, and `role="alert"`.

- [ ] **Step 4: Run and observe missing Production components**

```bash
pnpm test -- src/modules/quick-diagnosis/components/production/production-wizard-state.test.ts src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx
```

- [ ] **Step 5: Implement Production state and composition behavior**

```ts
const productionWizardSteps = [
  "analysisMode",
  "productionValues",
  "fixedExpenses",
  "monthlyVolume",
  "ownerCompensation",
  "fees",
  "review",
] as const;
```

Actions include Product-equivalent navigation/submission actions plus `setCostCompositionEnabled`. When disabling, calculate the UI-only summed decimal with exact string parsing and format two decimal places without floating point; if current components are not parseable, keep the last valid summarized value and let schema errors remain on the values step. Do not erase component strings.

```ts
function deriveProductionUnitCostDisplay(
  values: ProductionDiagnosisInput,
): string | null;
```

It returns a `pt-BR` two-decimal string such as `"50,00"` only when all four component strings parse safely; otherwise it returns `null`. The reducer uses this selector when disabling composition and the values step uses the same selector for the read-only output.

- [ ] **Step 6: Implement the six input/modality screens**

```ts
const productionStepFields = {
  productionValues: [
    "costCompositionEnabled",
    "productionUnitCost",
    "materialUnitCost",
    "packagingUnitCost",
    "directLaborUnitCost",
    "otherVariableUnitCost",
    "unitSalePrice",
  ],
  fixedExpenses: ["fixedMonthlyExpenses"],
  monthlyVolume: ["monthlySalesVolume"],
  ownerCompensation: ["proLabore"],
  fees: ["taxRate", "cardFeeRate"],
} as const;
```

Use Production-local copies for business-facing labels, existing neutral fields/shell only, and semantic responsive/theme/motion classes. The read-only total uses an `<output>` associated with the composition control and a polite status announcement only when its value changes.

- [ ] **Step 7: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/components/production/production-wizard-state.test.ts src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components/production
pnpm exec prettier --check src/modules/quick-diagnosis/components/production
git add src/modules/quick-diagnosis/components/production
git commit -m "feat: add production diagnosis wizard steps"
```

**Checkpoint:** Show both cost-mode transitions, component preservation, copied summary, direct-labor guidance, accessible controls/errors, optional volume, and absence of Product/Service business fields. Wait for approval.

---

### Task 10: Complete Production review, validation, submission, and redirect

**Files:**

- Create: `src/modules/quick-diagnosis/components/production/steps/production-review-step.tsx`
- Create: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx`
- Create: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx`

**Interfaces:**

- Consumes: controlled Production state/dispatch, schema field validation, Action, shell, and router.
- Produces: independent Production branch spanning global steps 2–8.

- [ ] **Step 1: Write failing complete summarized/composed path tests**

Complete both paths through all seven branch screens and assert global progress `2 de 8` through `8 de 8`, focused headings, and review groups. Summarized review shows total cost only. Composed review shows total plus all four components and label `Custo composto`. Both show sale price, fixed expenses, sold volume, compensation, and fees.

- [ ] **Step 2: Write failing Edit, partial, and normalization tests**

Click every Edit control, assert correct source heading, return without losing raw strings or mode. Empty volume shows `Não informado` and the exact partial warning. Disabled compensation shows `Não incluído`. After composing then disabling, submitted raw input has copied summary while server schema later normalizes stale components away.

- [ ] **Step 3: Write failing focus, lock, error, and redirect tests**

Assert current-step progressive validation. Server `invalid_input` routes/focuses earliest field in this order:

```ts
const productionFieldOrder: ProductionDiagnosisField[] = [
  "submissionId",
  "costCompositionEnabled",
  "productionUnitCost",
  "materialUnitCost",
  "packagingUnitCost",
  "directLaborUnitCost",
  "otherVariableUnitCost",
  "unitSalePrice",
  "fixedMonthlyExpenses",
  "monthlySalesVolume",
  "proLaboreIncluded",
  "proLabore",
  "taxRate",
  "cardFeeRate",
];
```

Invalid submission UUID regenerates and returns to modality. Synchronous ref blocks double click. Success keeps lock and calls `router.replace('/reports/42')`. Unauthorized/create failure/rejection preserve answers and UUID and expose only safe copy.

- [ ] **Step 4: Run and observe missing review/wizard**

```bash
pnpm test -- src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx
```

- [ ] **Step 5: Implement review and controlled wizard**

Use titles:

```ts
const stepTitles: Record<ProductionWizardStep, string> = {
  analysisMode: "Qual análise você quer fazer?",
  productionValues: "Quanto custa fabricar e por quanto você vende?",
  fixedExpenses: "Quais são as despesas fixas mensais?",
  monthlyVolume: "Quantas unidades você vende por mês?",
  ownerCompensation: "Você quer incluir seu pró-labore?",
  fees: "Quais taxas incidem nas vendas?",
  review: "Revise as informações da produção",
};
```

Review formatting is presentation-only. Pending copy is `Preparando relatório...`; unauthorized links to `/login`; create failure offers safe retry. Use the same current-step validation, first-invalid focus, synchronous lock, and reset algorithms already established by Product, with only Production contracts.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/components/production src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components/production
pnpm exec prettier --check src/modules/quick-diagnosis/components/production
git add src/modules/quick-diagnosis/components/production
git commit -m "feat: complete production diagnosis wizard"
```

**Checkpoint:** Demonstrate both reviews, all Edit paths, partial warning, normalization, first-invalid focus, UUID recovery, lock/retry/redirect, responsive semantic classes, and raw-value preservation. Wait for approval.

---

### Task 11: Present Production reports and discount simulations

**Files:**

- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Test: `src/modules/reports/services/get-report.service.test.ts`
- Test: `src/modules/reports/services/list-reports.service.test.ts`

**Interfaces:**

- Consumes: three-category snapshot union and generic diagnosis summaries.
- Produces: Production identity/numbers/cards and category-aware discount wording without changing existing Product copy.

- [ ] **Step 1: Write failing presenter and library tests**

For complete Production assert title/category/scenario `Diagnóstico de Produção`, `Produção`, `Fabricação própria`; number labels `Preço atual`, `Margem real`, `Lucro por unidade`, `Preço mínimo`, `Preço-alvo (20%)`. For partial assert contribution label and both prices `sem rateio fixo`.

Add a report-library row with `businessCategory: 'production'`, `scenario: 'manufacturing'`; assert accessible article label, badges, title, `/reports/{id}`, and `Lucro por unidade`. Existing Service/Product cards remain unchanged.

- [ ] **Step 2: Write failing complete/partial simulator copy tests**

Assert Production bases use the same math as Product unit bases without category casting. With context `production`, partial copy says `custo de fabricação`; with context `product`, the existing `custo de compra` copy remains exact; with context `service`, the existing sale wording remains exact. Complete Production uses unit profit/real margin. Assert 0/10/50 clamps, target/below-target/break-even/loss/unavailable statuses, and no cross-category terminology.

- [ ] **Step 3: Run focused read/presentation suites**

```bash
pnpm test -- src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/report-library.test.tsx src/modules/reports/services/get-report.service.test.ts src/modules/reports/services/list-reports.service.test.ts
```

Expected: FAIL on non-exhaustive Production branches and labels.

- [ ] **Step 4: Implement exhaustive three-category presentation**

Replace `isProduct` binary logic with a category switch:

```ts
switch (snapshot.category) {
  case "service":
    return toServiceNumbers(snapshot);
  case "product":
    return toProductNumbers(snapshot);
  case "production":
    return toProductionNumbers(snapshot);
}
```

Add exhaustive category/scenario labels. Production number semantics equal Product unit semantics but use a separate typed function. Add `discountSimulationContext: snapshot.category` to `ReportViewModel`; `ReportDetail` passes it to the simulator. In the list card, both Product and Production use `Lucro por unidade`.

- [ ] **Step 5: Make simulator wording category-aware without changing snapshots**

The persisted base does not need a category field because the math is identical. Add an explicit component prop:

```ts
type DiscountSimulationContext = "service" | "product" | "production";

function DiscountSimulator({
  base,
  context,
}: {
  base: ReportDiscountSimulationBase;
  context: DiscountSimulationContext;
}) {
  // Existing calculation remains unchanged; context selects labels and copy.
}
```

Keep Product's purchase-cost copy exact, use production-cost copy for Production, and preserve existing Service copy. `ReportDetail` is the only application caller and receives the context from the presenter.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/reports
pnpm typecheck
pnpm exec eslint src/modules/reports
pnpm exec prettier --check src/modules/reports
git add src/modules/reports/presenters src/modules/reports/components/discount-simulator.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-detail.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/report-list-card.tsx src/modules/reports/components/report-library.test.tsx
git commit -m "feat: present production diagnosis reports"
```

**Checkpoint:** Show complete/partial Production views, report-library card, unit discount semantics, safe malformed-snapshot behavior, and unchanged Service/Product report suites. Wait for approval.

---

### Task 12: Enable Production in the orchestrator and run delivery gates

**Files:**

- Modify: `src/modules/quick-diagnosis/components/steps/diagnosis-type-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `docs/QUICK-DIAGNOSIS.md`

**Interfaces:**

- Consumes: three Actions and three controlled branch reducers/wizards.
- Produces: enabled Production selection, fresh branch lifecycle, private page injection, and aligned business documentation.

- [ ] **Step 1: Write failing category-orchestrator tests**

Assert all three radio cards are enabled and Production has no `Em breve` badge. Selecting Production creates exactly one UUID, mounts global step 2, and invokes only the Production Action. Back to type then selecting the same branch preserves its raw state and UUID. Switching Product → Production or Service → Production creates a fresh UUID and discards the abandoned branch. Existing Service/Product paths still mount their respective Actions.

- [ ] **Step 2: Write failing page composition test**

Mock all three Action modules and assert the private page passes:

```tsx
<QuickDiagnosisWizard
  createServiceDiagnosis={createServiceDiagnosis}
  createProductDiagnosis={createProductDiagnosis}
  createProductionDiagnosis={createProductionDiagnosis}
/>
```

- [ ] **Step 3: Run focused integration tests and observe Production disabled**

```bash
pnpm test -- src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
```

- [ ] **Step 4: Add the independent Production branch**

Extend `ActiveDiagnosisBranch` with `{ type: 'production'; state: ProductionWizardState }`, add a Production dispatch adapter, accept `production` in category continuation, construct fresh state with the shared UUID factory, and render `ProductionDiagnosisWizard`. Remove only Production's disabled state from `DiagnosisTypeStep`; Detailed analysis inside Production remains disabled.

- [ ] **Step 5: Align business documentation**

Update `docs/QUICK-DIAGNOSIS.md` to state that quick Production accepts either one summarized ready-unit cost or the fixed four-category composition. Clarify that the fixed composition is not a technical sheet, detailed yield/waste remains future scope, monthly volume means sold units, and direct labor must not duplicate pró-labore. Do not rewrite unrelated Service/Product rules.

- [ ] **Step 6: Run database and generated-type gates**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: reset, all pgTAP, no type drift, lint, and advisors pass.

- [ ] **Step 7: Run application delivery gates**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Expected: all tests and static/production checks pass. If a gate exposes a defect introduced by an earlier task, add a focused failing regression test before the minimal fix and rerun the affected gate.

- [ ] **Step 8: Review the final diff and commit integration**

```bash
git status --short
git diff --check
git diff --stat
git diff -- src/modules/quick-diagnosis/components/steps/diagnosis-type-step.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/app/'(private)'/quick-diagnosis/page.tsx docs/QUICK-DIAGNOSIS.md
git add src/modules/quick-diagnosis/components/steps/diagnosis-type-step.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx docs/QUICK-DIAGNOSIS.md
git commit -m "feat: enable production quick diagnosis"
```

Expected: no unrelated changes and a clean worktree after commit.

**Checkpoint:** Report all three category paths, branch UUID behavior, Production detailed mode disabled, documentation update, database gates, full test count, typecheck, lint, format, and production build. This completes the plan.
