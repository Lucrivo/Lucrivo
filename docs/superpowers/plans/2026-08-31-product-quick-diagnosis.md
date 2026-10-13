# Product Quick Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete authenticated quick diagnosis for one purchased-and-resold product, including deterministic calculations, immutable reports, atomic persistence, and the existing report-library experience, without changing Service behavior or enabling Production.

**Architecture:** Product is a separate vertical with its own input contract, schema, calculator, snapshot builder, persistence service, Server Action, reducer, steps, and database table/RPC. The existing quick-diagnosis entry only selects and mounts a vertical; reports use a strict category-discriminated snapshot union and share presentation primitives only after business content has been resolved and persisted.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript 5.9, Zod 4, Supabase JS/SSR 2, PostgreSQL 17/RLS/pgTAP, Vitest, Testing Library, Base UI/shadcn, and Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-31-product-quick-diagnosis-design.md`

## Global Constraints

- This plan implements Product only; Production remains disabled with `Em breve` and gets no enum value, table, contract, calculator, or route.
- Service V2 stays `schemaVersion: 2`, `calculationVersion: 1`, and `contentVersion: 2`; existing Service calculations, copy, snapshots, RPC success behavior, and report rendering must remain unchanged.
- Product V1 is exactly `schemaVersion: 1`, `calculationVersion: 1`, `contentVersion: 1`, `category: "product"`, `scenario: "resale"`, `currency: "BRL"`, and `unit: "unit"`.
- Product target margin is exactly 20% (`2_000` basis points), lower tolerance is 0.5 percentage point (`50` basis points), above-target begins strictly above 23%, weekly divisor is `4.33`, and operating days per week is exactly `6`.
- Money is parsed and persisted as safe integer cents; percentages are integer basis points; financial calculations use `BigInt`-backed integer helpers and persist no binary floating-point values.
- Purchase unit cost and unit sale price are required and greater than zero. Fixed monthly expenses, tax, and card fee are required and may be zero.
- Monthly volume is optional; when present it is an integer from `1` through PostgreSQL `integer` maximum `2_147_483_647`.
- Owner compensation starts disabled. Disabled compensation normalizes to zero even when stale browser text exists; enabled compensation is required and greater than zero.
- Missing volume produces `incomplete_volume` with priority `data`; fixed allocation, total unit cost, unit profit, and real margin remain `null`. The UI must not call contribution “real profit” or contribution margin “real margin”.
- Non-positive unit contribution produces `direct_loss` with priority `cost` before the missing-volume rule. Sales goals are unavailable when contribution is non-positive.
- The Product action order is fixed: Zod validation, `requireUser()`, pure calculation, pure snapshot construction, and authenticated RPC persistence.
- The browser never sends `user_id`, never selects persisted category/scenario/version values, and performs no definitive financial calculation or database access while the wizard is being filled.
- The Product RPC is the only write path. `anon` has no Product table/function access; `authenticated` has SELECT-own access to the table and EXECUTE on the RPC, but no direct INSERT, UPDATE, or DELETE.
- The Product RPC uses `SECURITY DEFINER` only to perform the atomic write behind revoked table mutations; it must require `auth.uid()`, set `search_path = ''`, fully qualify every relation, revoke default execution, and validate snapshot/scalar consistency.
- The unique `(user_id, submission_id)` contract is authoritative. Same-category retries return the original report only when the Product detail exists; cross-category UUID reuse fails closed.
- No report is recalculated after persistence. Runtime parsers reject malformed or unsupported category/version combinations, and readers return the existing safe unavailable state.
- Detailed Product analysis remains visible and disabled as `Em breve`; it does not navigate to another route.
- Changing diagnosis category discards the abandoned branch and creates a fresh submission UUID. Back/Edit within the same branch preserves the exact raw input strings; retry preserves the same submission UUID.
- Do not add dependencies, Route Handlers, repositories, mappers, service-role usage, draft persistence, public reports, AI interpretation, inventory fields, or Production abstractions.
- Do not edit `.env.local`, run remote migrations, use the Dashboard for permanent schema changes, or create browser artifacts in the repository.
- Database changes use the imperative migration workflow. Discover CLI syntax with `--help`, create filenames through `supabase migration new`, and keep the enum addition in an earlier migration than SQL that uses the new value.
- Every behavior change follows TDD: focused failing test, observed expected failure, minimal implementation, focused passing test, then relevant regression gates.
- Every task ends with one coherent commit and a reviewer checkpoint before the next task.

---

## File Structure

| Path                                                                          | Responsibility                                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `supabase/migrations/*_add_product_business_category.sql`                     | Add only the `product` enum label so a later migration can safely use it.                       |
| `supabase/migrations/*_create_product_diagnosis_reports.sql`                  | Extend generic constraints and add Product table, RLS, grants, and atomic RPC.                  |
| `supabase/tests/product_diagnosis_reports.test.sql`                           | Verify Product schema, constraints, authorization, RPC consistency, atomicity, and idempotency. |
| `supabase/tests/diagnosis_reports.test.sql`                                   | Preserve the complete existing Service database contract.                                       |
| `src/infrastructure/database/supabase/database.types.ts`                      | Generated representation of Product table, enum, and RPC; never edit manually.                  |
| `src/modules/quick-diagnosis/types.ts`                                        | Keep Service contracts and add independent Product input/command/action contracts.              |
| `src/modules/quick-diagnosis/schemas/decimal-input.ts`                        | Neutral exact decimal-to-integer parsing shared by category schemas.                            |
| `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts`             | Normalize and validate only Product raw input.                                                  |
| `src/modules/reports/domain/calculate-product-report.ts`                      | Pure Product V1 unit-economics policy and verdict classification.                               |
| `src/modules/reports/schemas/report-content.schema.ts`                        | Strict neutral schemas for persisted sections and executive-summary structures.                 |
| `src/modules/reports/schemas/service-report-snapshot.schema.ts`               | Preserve the exact existing Service V2 runtime contract.                                        |
| `src/modules/reports/schemas/product-report-snapshot.schema.ts`               | Own the strict Product V1 runtime contract.                                                     |
| `src/modules/reports/schemas/report-snapshot.schema.ts`                       | Dispatch unknown snapshots by category to the appropriate strict parser.                        |
| `src/modules/reports/domain/build-service-executive-summary.ts`               | Renamed, unchanged Service-only executive-summary builder.                                      |
| `src/modules/reports/domain/build-product-executive-summary.ts`               | Deterministic Product-only executive-summary copy.                                              |
| `src/modules/reports/domain/build-product-report-snapshot.ts`                 | Resolve all Product sections and construct one strict immutable snapshot.                       |
| `src/modules/reports/services/create-product-report.service.ts`               | Map trusted Product command/snapshot values to the typed RPC and sanitize failures.             |
| `src/modules/quick-diagnosis/actions/create-product-diagnosis.action.ts`      | Enforce Product validation/authentication/calculation/snapshot/persistence order.               |
| `src/modules/quick-diagnosis/components/shared/wizard-shell.tsx`              | Neutral progress, heading focus target, card, and Back/Continue framing.                        |
| `src/modules/quick-diagnosis/components/shared/step-field.tsx`                | Generic accessible string field primitive with linked errors.                                   |
| `src/modules/quick-diagnosis/components/service/**`                           | Existing Service reducer, wizard, review, and steps after behavior-preserving extraction.       |
| `src/modules/quick-diagnosis/components/product/product-wizard-state.ts`      | Product-only raw state, navigation, conditional compensation, errors, and retry state.          |
| `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx` | Product step validation, focus, submission locking, and redirect orchestration.                 |
| `src/modules/quick-diagnosis/components/product/steps/**`                     | Seven Product branch screens: modality through review.                                          |
| `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`           | Category selection and branch lifecycle only.                                                   |
| `src/modules/reports/presenters/to-report-view-model.ts`                      | Convert either persisted snapshot variant into category-correct report labels/numbers.          |
| `src/modules/reports/components/discount-simulator.tsx`                       | Simulate complete profit/margin or explicitly partial contribution/contribution margin.         |
| `src/modules/reports/components/report-list-card.tsx`                         | Present Product category/scenario/verdict safely in the report library.                         |
| `src/app/(private)/quick-diagnosis/page.tsx`                                  | Inject both Server Actions into the category orchestrator.                                      |

## Shared Contracts

The following names and shapes are authoritative across tasks:

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

type ProductDiagnosisField = keyof ProductDiagnosisInput;
type ProductDiagnosisFieldErrors = Partial<
  Record<ProductDiagnosisField, string[]>
>;

type CreateProductDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: ProductDiagnosisFieldErrors;
    }
  | { status: "error"; error: "unauthorized" | "create_failed" };
```

```ts
type ProductReportVerdict =
  | "direct_loss"
  | "incomplete_volume"
  | "operational_loss"
  | "tight_margin"
  | "adequate_margin"
  | "above_target";

type ProductReportPriority = "cost" | "data" | "price" | "margin" | "volume";

type ProductReportCalculation = {
  effectiveFixedCostCents: number;
  purchaseUnitCostCents: number;
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
  verdict: ProductReportVerdict;
  priority: ProductReportPriority;
};
```

```ts
type ProductReportDiscountSimulationBase = {
  originalPriceCents: number;
  unitCostCents: number;
  totalFeeBasisPoints: number;
  targetMarginBasisPoints: 2000;
  minimumPriceCents: number | null;
  partial: boolean;
};
```

---

### Task 1: Add the Product database contract and atomic RPC

**Files:**

- Create via CLI: `supabase/migrations/*_add_product_business_category.sql`
- Create via CLI: `supabase/migrations/*_create_product_diagnosis_reports.sql`
- Create: `supabase/tests/product_diagnosis_reports.test.sql`
- Test: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/service_diagnoses.test.sql`

**Interfaces:**

- Consumes: `public.business_category`, `public.diagnoses`, `auth.users`, `auth.uid()`, and the existing Service RPC.
- Produces: enum label `product`; Product pair `product + resale`; unit `unit`; verdicts `direct_loss`/`incomplete_volume`; priority `data`; `public.product_diagnoses`; and `public.create_product_diagnosis_report(...) returns bigint`.

- [ ] **Step 1: Confirm the local imperative-migration and test commands**

```bash
test ! -d supabase/schemas
pnpm exec supabase --version
pnpm exec supabase migration new --help
pnpm exec supabase test db --help
pnpm exec supabase db reset --help
```

Expected: the repository still uses ordered imperative migrations, and all commands exist. Do not invoke linked/remote commands.

- [ ] **Step 2: Write the failing pgTAP contract**

Create `supabase/tests/product_diagnosis_reports.test.sql` as one transaction with two fixed users, `set local role authenticated`, and JWT subject switching. The structural core is:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select enum_has_labels(
  'public',
  'business_category',
  array['service', 'product']
);
select has_table('public', 'product_diagnoses');
select columns_are(
  'public',
  'product_diagnoses',
  array[
    'diagnosis_id', 'submission_id', 'user_id',
    'purchase_unit_cost_cents', 'unit_sale_price_cents',
    'fixed_monthly_expenses_cents', 'monthly_sales_volume',
    'pro_labore_included', 'pro_labore_cents',
    'tax_rate_basis_points', 'card_fee_rate_basis_points'
  ]
);
select col_is_pk('public', 'product_diagnoses', 'diagnosis_id');
select fk_ok(
  'public', 'product_diagnoses', 'diagnosis_id',
  'public', 'diagnoses', 'id'
);
select fk_ok(
  'public', 'product_diagnoses', 'user_id',
  'auth', 'users', 'id'
);
select col_type_is(
  'public', 'product_diagnoses', 'monthly_sales_volume', 'integer'
);
select col_is_null(
  'public', 'product_diagnoses', 'monthly_sales_volume'
);

select ok(not has_table_privilege('anon', 'public.product_diagnoses', 'select'));
select ok(not has_table_privilege('anon', 'public.product_diagnoses', 'insert'));
select ok(has_table_privilege('authenticated', 'public.product_diagnoses', 'select'));
select ok(not has_table_privilege('authenticated', 'public.product_diagnoses', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.product_diagnoses', 'update'));
select ok(not has_table_privilege('authenticated', 'public.product_diagnoses', 'delete'));
select has_function(
  'public',
  'create_product_diagnosis_report',
  array[
    'uuid', 'bigint', 'bigint', 'bigint', 'integer', 'boolean', 'bigint',
    'integer', 'integer', 'smallint', 'smallint', 'smallint', 'text',
    'bigint', 'integer', 'bigint', 'text', 'text', 'text', 'jsonb'
  ]
);
select ok(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.create_product_diagnosis_report(
      uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
  ),
  'Product report RPC is security definer'
);
select ok(
  (
    select proconfig
    from pg_proc
    where oid = 'public.create_product_diagnosis_report(
      uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
  ) = array['search_path=""']::text[],
  'Product report RPC has empty search path'
);
select ok(not has_function_privilege(
  'anon',
  'public.create_product_diagnosis_report(
    uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
    smallint, smallint, smallint, text, bigint, integer, bigint,
    text, text, text, jsonb
  )',
  'execute'
));
select ok(has_function_privilege(
  'authenticated',
  'public.create_product_diagnosis_report(
    uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
    smallint, smallint, smallint, text, bigint, integer, bigint,
    text, text, text, jsonb
  )',
  'execute'
));
```

Use this complete JSON shape for successful and consistency tests; vary exactly one paired argument/property for rejection tests:

```sql
jsonb_build_object(
  'schemaVersion', 1,
  'calculationVersion', 1,
  'contentVersion', 1,
  'category', 'product',
  'scenario', 'resale',
  'currency', 'BRL',
  'unit', 'unit',
  'policy', jsonb_build_object('targetMarginBasisPoints', 2000),
  'inputs', jsonb_build_object(
    'purchaseUnitCostCents', 5000,
    'unitSalePriceCents', 10000,
    'fixedMonthlyExpensesCents', 100000,
    'monthlySalesVolume', 100,
    'proLaboreIncluded', true,
    'proLaboreCents', 200000,
    'taxRateBasisPoints', 600,
    'cardFeeRateBasisPoints', 200
  ),
  'results', jsonb_build_object(
    'purchaseUnitCostCents', 5000,
    'currentPriceCents', 10000,
    'realMarginBasisPoints', 1200,
    'unitProfitCents', 1200,
    'verdict', 'tight_margin',
    'priority', 'margin'
  ),
  'executiveSummary', jsonb_build_object('headline', 'Diagnóstico'),
  'sections', jsonb_build_array(),
  'discountSimulationBase', jsonb_build_object('partial', false)
)
```

Add concrete `lives_ok`, `throws_ok`, `results_eq`, and row-count assertions for all of these cases:

```sql
-- Valid detail shapes
-- 1. volume 100, compensation enabled and positive
-- 2. volume null, compensation disabled and exactly zero

-- SQLSTATE 23514 constraints
-- purchase cost 0; sale price 0; fixed expense -1; volume 0;
-- disabled compensation 1; enabled compensation 0;
-- tax -1/10001; card fee -1/10001

-- Authorization and immutability
-- own SELECT returns one row; foreign SELECT returns zero rows;
-- direct authenticated INSERT/UPDATE/DELETE raise 42501;
-- anonymous RPC call raises 42501

-- RPC behavior
-- authenticated complete and partial Product calls succeed;
-- every version/category/scenario/unit/input/result mismatch raises 22023;
-- first call and exact retry return the same generic ID and one detail row;
-- a Service-owned submission UUID reused for Product raises 23505;
-- a Product generic row without Product detail raises 23505 on retry;
-- a detail constraint failure leaves no generic diagnosis row;
-- the existing Service RPC still creates one linked Service report
```

End with:

```sql
select * from finish();
rollback;
```

- [ ] **Step 3: Run the Product database test and observe the expected failure**

```bash
pnpm supabase:start
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
```

Expected: FAIL because `product` and `product_diagnoses` do not exist.

- [ ] **Step 4: Generate two ordered migration filenames**

```bash
pnpm exec supabase migration new add_product_business_category
pnpm exec supabase migration new create_product_diagnosis_reports
```

Expected: two new files, with the enum-only migration timestamp ordered first. Use the emitted paths verbatim.

- [ ] **Step 5: Add the enum value in the first migration**

```sql
alter type public.business_category add value if not exists 'product';
```

Do not use `product` anywhere else in this first file.

- [ ] **Step 6: Implement the generic extensions, Product table, grants, and RLS in the second migration**

```sql
alter table public.diagnoses
drop constraint diagnoses_scenario_check,
add constraint diagnoses_scenario_check check (
  (
    business_category = 'service'
    and scenario in ('hour', 'minute', 'appointment')
  )
  or (
    business_category = 'product'
    and scenario = 'resale'
  )
),
drop constraint diagnoses_verdict_check,
add constraint diagnoses_verdict_check check (
  verdict in (
    'missing_price', 'direct_loss', 'incomplete_volume',
    'operational_loss', 'tight_margin', 'adequate_margin', 'above_target'
  )
),
drop constraint diagnoses_priority_check,
add constraint diagnoses_priority_check check (
  priority in ('cost', 'data', 'price', 'margin', 'volume')
),
drop constraint diagnoses_unit_check,
add constraint diagnoses_unit_check check (
  unit in ('hour', 'appointment', 'unit')
);

create table public.product_diagnoses (
  diagnosis_id bigint primary key
    references public.diagnoses (id) on delete restrict,
  submission_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  purchase_unit_cost_cents bigint not null,
  unit_sale_price_cents bigint not null,
  fixed_monthly_expenses_cents bigint not null,
  monthly_sales_volume integer,
  pro_labore_included boolean not null,
  pro_labore_cents bigint not null,
  tax_rate_basis_points integer not null,
  card_fee_rate_basis_points integer not null,
  constraint product_diagnoses_user_submission_key
    unique (user_id, submission_id),
  constraint product_diagnoses_prices_check check (
    purchase_unit_cost_cents > 0 and unit_sale_price_cents > 0
  ),
  constraint product_diagnoses_fixed_expenses_check check (
    fixed_monthly_expenses_cents >= 0
  ),
  constraint product_diagnoses_volume_check check (
    monthly_sales_volume is null or monthly_sales_volume > 0
  ),
  constraint product_diagnoses_pro_labore_shape_check check (
    (not pro_labore_included and pro_labore_cents = 0)
    or (pro_labore_included and pro_labore_cents > 0)
  ),
  constraint product_diagnoses_tax_check check (
    tax_rate_basis_points between 0 and 10000
  ),
  constraint product_diagnoses_card_fee_check check (
    card_fee_rate_basis_points between 0 and 10000
  )
);

revoke all on table public.product_diagnoses from anon, authenticated;
grant select on table public.product_diagnoses to authenticated;

alter table public.product_diagnoses enable row level security;

create policy product_diagnoses_select_own
on public.product_diagnoses
for select
to authenticated
using ((select auth.uid()) = user_id);
```

The unique index on `(user_id, submission_id)` has `user_id` as its leading column and therefore covers the SELECT-own RLS predicate; `diagnosis_id` is already indexed by the primary key. Add no speculative index.

- [ ] **Step 7: Implement the authenticated atomic Product RPC**

Use this exact signature and security boundary:

```sql
create function public.create_product_diagnosis_report(
  p_submission_id uuid,
  p_purchase_unit_cost_cents bigint,
  p_unit_sale_price_cents bigint,
  p_fixed_monthly_expenses_cents bigint,
  p_monthly_sales_volume integer,
  p_pro_labore_included boolean,
  p_pro_labore_cents bigint,
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

  if p_schema_version is distinct from 1
    or p_calculation_version is distinct from 1
    or p_content_version is distinct from 1
    or p_scenario is distinct from 'resale'
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'executiveSummary')
      is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_report_snapshot -> 'discountSimulationBase')
      is distinct from 'object'
    or p_report_snapshot ->> 'schemaVersion'
      is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion'
      is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion'
      is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'product'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_report_snapshot ->> 'unit' is distinct from p_unit
    or p_report_snapshot #>> '{inputs,purchaseUnitCostCents}'
      is distinct from p_purchase_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,unitSalePriceCents}'
      is distinct from p_unit_sale_price_cents::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}'
      is distinct from p_fixed_monthly_expenses_cents::text
    or (p_report_snapshot #>> '{inputs,monthlySalesVolume}')
      is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{inputs,proLaboreIncluded}'
      is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{inputs,proLaboreCents}'
      is distinct from p_pro_labore_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}'
      is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}'
      is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{results,purchaseUnitCostCents}'
      is distinct from p_purchase_unit_cost_cents::text
    or p_report_snapshot #>> '{results,currentPriceCents}'
      is distinct from p_current_price_cents::text
    or (p_report_snapshot #>> '{results,realMarginBasisPoints}')
      is distinct from p_real_margin_basis_points::text
    or (p_report_snapshot #>> '{results,unitProfitCents}')
      is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
  then
    raise exception using errcode = '22023', message = 'invalid product report snapshot';
  end if;

  insert into public.diagnoses (
    submission_id, user_id, business_category, scenario,
    schema_version, calculation_version, content_version,
    current_price_cents, real_margin_basis_points, unit_profit_cents,
    verdict, priority, unit, report_snapshot
  ) values (
    p_submission_id, caller_id, 'product', 'resale',
    p_schema_version, p_calculation_version, p_content_version,
    p_current_price_cents, p_real_margin_basis_points, p_unit_profit_cents,
    p_verdict, p_priority, 'unit', p_report_snapshot
  )
  on conflict (user_id, submission_id) do nothing
  returning id into report_id;

  if report_id is null then
    select d.id into report_id
    from public.diagnoses as d
    join public.product_diagnoses as p on p.diagnosis_id = d.id
    where d.user_id = caller_id
      and d.submission_id = p_submission_id
      and d.business_category = 'product'
      and d.scenario = 'resale'
      and p.user_id = caller_id
      and p.submission_id = p_submission_id;

    if report_id is null then
      raise exception using
        errcode = '23505',
        message = 'submission id belongs to another diagnosis';
    end if;

    return report_id;
  end if;

  insert into public.product_diagnoses (
    diagnosis_id, submission_id, user_id,
    purchase_unit_cost_cents, unit_sale_price_cents,
    fixed_monthly_expenses_cents, monthly_sales_volume,
    pro_labore_included, pro_labore_cents,
    tax_rate_basis_points, card_fee_rate_basis_points
  ) values (
    report_id, p_submission_id, caller_id,
    p_purchase_unit_cost_cents, p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents, p_monthly_sales_volume,
    p_pro_labore_included, p_pro_labore_cents,
    p_tax_rate_basis_points, p_card_fee_rate_basis_points
  );

  return report_id;
end;
$$;
```

Revoke and grant using the full signature above:

```sql
revoke execute on function public.create_product_diagnosis_report(
  uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
  smallint, smallint, smallint, text, bigint, integer, bigint,
  text, text, text, jsonb
) from public, anon;

grant execute on function public.create_product_diagnosis_report(
  uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
  smallint, smallint, smallint, text, bigint, integer, bigint,
  text, text, text, jsonb
) to authenticated;
```

- [ ] **Step 8: Rebuild, run all database checks, and commit**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
git add supabase/migrations supabase/tests/product_diagnosis_reports.test.sql supabase/tests/service_diagnoses.test.sql
git commit -m "feat: add product diagnosis database contract"
```

Expected: Product and existing Service pgTAP suites pass; lint/advisors report no unreviewed error. In `service_diagnoses.test.sql`, change only the business-category enum expectation from `array['service']` to `array['service', 'product']` and update its assertion description; all Service table/RLS/behavior assertions remain exact.

**Checkpoint:** Report the two generated migration paths, Product constraint/RLS coverage, same-category retry, cross-category rejection, atomic rollback, and Service RPC regression result. Wait for approval before Task 2.

---

### Task 2: Regenerate the typed Supabase boundary

**Files:**

- Modify by generator only: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: the reset local schema from Task 1 and `scripts/generate-database-types.mjs`.
- Produces: `business_category: "service" | "product"`, table types for `product_diagnoses`, and exact generated args for `create_product_diagnosis_report`.

- [ ] **Step 1: Regenerate from the reset local database**

```bash
pnpm supabase:reset
pnpm supabase:types
```

Expected: only the generated TypeScript file changes. Never hand-edit it.

- [ ] **Step 2: Verify the generated contract explicitly**

```bash
rg -n 'product_diagnoses|create_product_diagnosis_report|business_category: "service" \| "product"' src/infrastructure/database/supabase/database.types.ts
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

Expected: the first command finds all three contracts, and a second generation produces no drift.

- [ ] **Step 3: Verify and commit the generated boundary**

```bash
pnpm typecheck
pnpm exec prettier --check src/infrastructure/database/supabase/database.types.ts
git add src/infrastructure/database/supabase/database.types.ts
git commit -m "chore: regenerate product diagnosis database types"
```

**Checkpoint:** Show the generated Product row/insert/update relationship, nullable RPC arguments, enum union, and no-drift result. Wait for approval before Task 3.

---

### Task 3: Define and validate the Product input contract

**Files:**

- Modify: `src/modules/quick-diagnosis/types.ts`
- Create: `src/modules/quick-diagnosis/schemas/decimal-input.ts`
- Create: `src/modules/quick-diagnosis/schemas/decimal-input.test.ts`
- Modify: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`
- Test: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`
- Create: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts`
- Create: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts`

**Interfaces:**

- Consumes: raw browser strings and the existing Portuguese decimal conventions.
- Produces: the exact `ProductDiagnosisInput`, `ProductDiagnosisCommand`, fields/errors/action result from Shared Contracts; `productDiagnosisSchema`; and `validateProductDiagnosisFields(fields, values)`.

- [ ] **Step 1: Write failing neutral parsing and Service-regression tests**

```ts
expect(scaledInteger("R$ 1.234,56", 2)).toBe(123456);
expect(scaledInteger("1234.56", 2)).toBe(123456);
expect(() => scaledInteger("1,234", 2)).toThrow("invalid_decimal");
expect(() => scaledInteger(String(Number.MAX_SAFE_INTEGER) + "0", 0)).toThrow(
  "unsafe_integer",
);
```

Keep the existing full Service schema suite unchanged and assert it still normalizes a canonical Service fixture after the helper extraction.

- [ ] **Step 2: Write the failing Product schema tests**

Use this canonical raw fixture:

```ts
const validProduct: ProductDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCost: "50,00",
  unitSalePrice: "100",
  fixedMonthlyExpenses: "1.000,00",
  monthlySalesVolume: "100",
  proLaboreIncluded: true,
  proLabore: "2.000,00",
  taxRate: "6",
  cardFeeRate: "2",
};

expect(productDiagnosisSchema.parse(validProduct)).toEqual({
  submissionId: validProduct.submissionId,
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
});
```

Add table-driven assertions for:

```ts
expect(
  productDiagnosisSchema.parse({
    ...validProduct,
    monthlySalesVolume: "",
    proLaboreIncluded: false,
    proLabore: "texto antigo ignorado",
  }),
).toEqual(
  expect.objectContaining({
    monthlySalesVolume: null,
    proLaboreIncluded: false,
    proLaboreCents: 0,
  }),
);

expect(
  validateProductDiagnosisFields(["purchaseUnitCost", "unitSalePrice"], {
    ...validProduct,
    purchaseUnitCost: "0",
    unitSalePrice: "0",
  }),
).toEqual({
  purchaseUnitCost: ["Informe um custo de compra maior que zero."],
  unitSalePrice: ["Informe um preço de venda maior que zero."],
});
```

Reject invalid UUID; negative currency; three decimal places; unsafe cents; volume `0`, `1,5`, and `2147483648`; enabled empty/zero compensation; and rates below zero or above `100,00`. Accept fixed expense `0`, empty volume, volume `1`/`2147483647`, disabled stale compensation, and each rate boundary `0`/`100`.

- [ ] **Step 3: Run the focused tests and observe missing exports**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/decimal-input.test.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
```

Expected: FAIL because Product contracts/schema and neutral helpers do not exist.

- [ ] **Step 4: Extract exact decimal primitives without changing Service behavior**

Move the current implementations into `decimal-input.ts` and export:

```ts
function canonicalDecimal(value: string): string;
function scaledInteger(value: string, scale: number): number;
function convertedNumber(
  convert: (value: string) => number,
  message: string,
): z.ZodType<number, string>;

const moneySchema = convertedNumber(
  (value) => scaledInteger(value, 2),
  "Informe um valor monetário válido com até duas casas decimais.",
);

const percentageSchema = convertedNumber((value) => {
  const basisPoints = scaledInteger(value, 2);
  if (basisPoints > 10_000) throw new Error("out_of_range");
  return basisPoints;
}, "Informe um percentual entre 0 e 100 com até duas casas decimais.");
```

Import these primitives from the Service schema and rerun its tests before adding Product behavior.

- [ ] **Step 5: Implement the strict Product schema and filtered validation**

Build a `z.strictObject` for the exact input keys. Parse direct costs/prices/fixed expenses/rates with the shared helpers; parse volume locally so empty becomes `null` and non-empty must be `1..2_147_483_647`; leave `proLabore` as a string until the object-level refinement knows whether the toggle is enabled.

```ts
const productDiagnosisSchema: z.ZodType<
  ProductDiagnosisCommand,
  ProductDiagnosisInput
> = rawProductDiagnosisSchema
  .superRefine((input, context) => {
    if (input.purchaseUnitCost <= 0) {
      context.addIssue({
        code: "custom",
        path: ["purchaseUnitCost"],
        message: "Informe um custo de compra maior que zero.",
      });
    }
    if (input.unitSalePrice <= 0) {
      context.addIssue({
        code: "custom",
        path: ["unitSalePrice"],
        message: "Informe um preço de venda maior que zero.",
      });
    }
    if (input.proLaboreIncluded) {
      try {
        if (scaledInteger(input.proLabore, 2) <= 0) throw new Error();
      } catch {
        context.addIssue({
          code: "custom",
          path: ["proLabore"],
          message: "Informe um pró-labore maior que zero.",
        });
      }
    }
  })
  .transform((input) => ({
    submissionId: input.submissionId,
    purchaseUnitCostCents: input.purchaseUnitCost,
    unitSalePriceCents: input.unitSalePrice,
    fixedMonthlyExpensesCents: input.fixedMonthlyExpenses,
    monthlySalesVolume: input.monthlySalesVolume,
    proLaboreIncluded: input.proLaboreIncluded,
    proLaboreCents: input.proLaboreIncluded
      ? scaledInteger(input.proLabore, 2)
      : 0,
    taxRateBasisPoints: input.taxRate,
    cardFeeRateBasisPoints: input.cardFeeRate,
  }));
```

Implement `validateProductDiagnosisFields` by collecting only issues whose first path segment is in the requested field list, matching the existing Service behavior.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/decimal-input.test.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas
pnpm exec prettier --check src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas
git add src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas
git commit -m "feat: validate product diagnosis input"
```

**Checkpoint:** Show complete/partial normalized commands, conditional compensation behavior, integer upper bound, field-filtering result, and unchanged Service suite. Wait for approval before Task 4.

---

### Task 4: Calculate the Product report with integer arithmetic

**Files:**

- Modify: `src/modules/reports/types.ts`
- Create: `src/modules/reports/domain/calculate-product-report.ts`
- Create: `src/modules/reports/domain/calculate-product-report.test.ts`

**Interfaces:**

- Consumes: `ProductDiagnosisCommand` and existing `ceilDivide`, `multiplyDivideRound`, `roundDivide`.
- Produces: `ProductReportVerdict`, `ProductReportPriority`; constants `PRODUCT_TARGET_MARGIN_BPS`, `PRODUCT_MARGIN_TOLERANCE_BPS`, `PRODUCT_ABOVE_TARGET_BPS`, `PRODUCT_OPERATING_DAYS_PER_WEEK`; `ProductReportCalculation`; `classifyProductMargin`; and `calculateProductReport`.

- [ ] **Step 1: Write the failing complete-calculation test**

```ts
const completeCommand: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  purchaseUnitCostCents: 5000,
  unitSalePriceCents: 10000,
  fixedMonthlyExpensesCents: 100000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

expect(calculateProductReport(completeCommand)).toEqual({
  effectiveFixedCostCents: 300000,
  purchaseUnitCostCents: 5000,
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

- [ ] **Step 2: Write failing partial, denominator, rounding, and classification tests**

```ts
expect(
  calculateProductReport({ ...completeCommand, monthlySalesVolume: null }),
).toEqual(
  expect.objectContaining({
    fixedAllocationCents: null,
    totalUnitCostCents: null,
    unitProfitCents: null,
    realMarginBasisPoints: null,
    minimumPriceCents: 5435,
    targetPriceCents: 6945,
    priceReferencesPartial: true,
    monthlySalesGoal: 72,
    weeklySalesGoal: 17,
    dailySalesGoal: 3,
    breakEvenDiscountPercent: 46,
    verdict: "incomplete_volume",
    priority: "data",
  }),
);

expect(
  calculateProductReport({
    ...completeCommand,
    monthlySalesVolume: null,
    unitSalePriceCents: 5000,
  }),
).toEqual(
  expect.objectContaining({
    unitContributionCents: -400,
    monthlySalesGoal: null,
    weeklySalesGoal: null,
    dailySalesGoal: null,
    verdict: "direct_loss",
    priority: "cost",
  }),
);
```

Test `classifyProductMargin` at real-margin boundaries `1949`, `1950`, `2300`, and `2301`; direct contribution `0`; and missing volume with positive contribution. Test combined fees `10_000` make minimum `null`, combined fees plus target `>= 10_000` make target `null`, and fixed allocation/price/goals always round upward.

- [ ] **Step 3: Run the focused test and observe the missing calculator**

```bash
pnpm test -- src/modules/reports/domain/calculate-product-report.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 4: Implement the pure calculator**

Add the exact Product-only verdict and priority unions from Shared Contracts to `src/modules/reports/types.ts`; do not widen Service builder maps to accept Product verdicts.

```ts
const RATE_SCALE = 10_000;
const PRODUCT_TARGET_MARGIN_BPS = 2_000;
const PRODUCT_MARGIN_TOLERANCE_BPS = 50;
const PRODUCT_ABOVE_TARGET_BPS = 300;
const WEEKLY_DIVISOR_HUNDREDTHS = 433;
const PRODUCT_OPERATING_DAYS_PER_WEEK = 6;

function classifyProductMargin(input: {
  unitContributionCents: number;
  monthlySalesVolume: number | null;
  realMarginBasisPoints: number | null;
}): { verdict: ProductReportVerdict; priority: ProductReportPriority } {
  if (input.unitContributionCents <= 0) {
    return { verdict: "direct_loss", priority: "cost" };
  }
  if (input.monthlySalesVolume === null) {
    return { verdict: "incomplete_volume", priority: "data" };
  }
  if (
    input.realMarginBasisPoints === null ||
    input.realMarginBasisPoints <= 0
  ) {
    return { verdict: "operational_loss", priority: "price" };
  }
  if (
    input.realMarginBasisPoints <
    PRODUCT_TARGET_MARGIN_BPS - PRODUCT_MARGIN_TOLERANCE_BPS
  ) {
    return { verdict: "tight_margin", priority: "margin" };
  }
  if (
    input.realMarginBasisPoints <=
    PRODUCT_TARGET_MARGIN_BPS + PRODUCT_ABOVE_TARGET_BPS
  ) {
    return { verdict: "adequate_margin", priority: "volume" };
  }
  return { verdict: "above_target", priority: "volume" };
}
```

Use the approved formula order exactly:

```ts
const effectiveFixedCostCents = roundDivide(
  BigInt(command.fixedMonthlyExpensesCents) + BigInt(command.proLaboreCents),
  1n,
);
const totalFeeBasisPoints = roundDivide(
  BigInt(command.taxRateBasisPoints) + BigInt(command.cardFeeRateBasisPoints),
  1n,
);
const netRateBasisPoints = RATE_SCALE - totalFeeBasisPoints;
const targetRateBasisPoints = netRateBasisPoints - PRODUCT_TARGET_MARGIN_BPS;
const netRevenueCents = multiplyDivideRound(
  command.unitSalePriceCents,
  netRateBasisPoints,
  RATE_SCALE,
);
const unitContributionCents = roundDivide(
  BigInt(netRevenueCents) - BigInt(command.purchaseUnitCostCents),
  1n,
);
const fixedAllocationCents =
  command.monthlySalesVolume === null
    ? null
    : ceilDivide(
        BigInt(effectiveFixedCostCents),
        BigInt(command.monthlySalesVolume),
      );
```

Continue with the formulas from spec section 7. Use `totalUnitCostCents ?? purchaseUnitCostCents` as the price-reference cost, but keep `priceReferencesPartial` explicit. Compute goals only from positive contribution, and clamp break-even discount at zero.

- [ ] **Step 5: Verify Product and shared integer regressions, then commit**

```bash
pnpm test -- src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-service-report.test.ts src/modules/reports/domain/integer-math.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/types.ts src/modules/reports/domain/calculate-product-report.ts src/modules/reports/domain/calculate-product-report.test.ts
pnpm exec prettier --check src/modules/reports/types.ts src/modules/reports/domain/calculate-product-report.ts src/modules/reports/domain/calculate-product-report.test.ts
git add src/modules/reports/types.ts src/modules/reports/domain/calculate-product-report.ts src/modules/reports/domain/calculate-product-report.test.ts
git commit -m "feat: calculate product quick diagnosis"
```

**Checkpoint:** Report the canonical complete and partial outputs, all verdict boundaries, invalid denominators, direct-loss precedence, and Service/integer regressions. Wait for approval before Task 5.

---

### Task 5: Introduce strict category-versioned snapshot contracts

**Files:**

- Create: `src/modules/reports/schemas/report-content.schema.ts`
- Create: `src/modules/reports/schemas/service-report-snapshot.schema.ts`
- Create: `src/modules/reports/schemas/product-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/domain/calculate-service-report.ts`
- Modify: `src/modules/reports/domain/build-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Modify: `src/modules/reports/services/create-service-report.service.ts`
- Modify: `src/modules/reports/formatters.ts`
- Modify: `src/modules/reports/formatters.test.ts`

**Interfaces:**

- Consumes: existing Service V2 shape, Product calculation field names, and common persisted content keys.
- Produces: `ServiceReportSnapshotV2`, `ProductReportSnapshotV1`, `ReportSnapshot` union, `parseServiceReportSnapshot`, `parseProductReportSnapshot`, and `parseReportSnapshot` category dispatcher.

- [ ] **Step 1: Expand the type-level discriminants with failing tests**

Define these category-specific constants/unions in the test expectations:

```ts
const SERVICE_REPORT_SCHEMA_VERSION = 2;
const SERVICE_CALCULATION_VERSION = 1;
const SERVICE_CONTENT_VERSION = 2;
const PRODUCT_REPORT_SCHEMA_VERSION = 1;
const PRODUCT_CALCULATION_VERSION = 1;
const PRODUCT_CONTENT_VERSION = 1;

const serviceReportVerdicts = [
  "missing_price",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;
const productReportVerdicts = [
  "direct_loss",
  "incomplete_volume",
  "operational_loss",
  "tight_margin",
  "adequate_margin",
  "above_target",
] as const;
const serviceReportPriorities = ["cost", "price", "margin", "volume"] as const;
const productReportPriorities = [
  "cost",
  "data",
  "price",
  "margin",
  "volume",
] as const;
const serviceReportUnits = ["hour", "appointment"] as const;
const productReportUnits = ["unit"] as const;
const reportScenarios = ["hour", "minute", "appointment", "resale"] as const;
```

Keep the full existing Service fixture test and add a complete Product fixture with the Task 4 canonical result, five ordered sections, two ordered facts, three ordered answers, and:

```ts
discountSimulationBase: {
  originalPriceCents: 10000,
  unitCostCents: 8000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2000,
  minimumPriceCents: 8696,
  partial: false,
},
```

Add a partial Product variant whose nullable complete-result fields are `null`, `priceReferencesPartial` and base `partial` are `true`, and base `unitCostCents` is purchase cost `5000`.

- [ ] **Step 2: Add failing parser dispatch and strictness assertions**

```ts
expect(parseReportSnapshot(validServiceSnapshot).category).toBe("service");
expect(parseReportSnapshot(validProductSnapshot).category).toBe("product");
expect(parseReportSnapshot(partialProductSnapshot)).toEqual(
  partialProductSnapshot,
);

expect(() =>
  parseReportSnapshot({ ...validProductSnapshot, schemaVersion: 2 }),
).toThrow();
expect(() =>
  parseReportSnapshot({ ...validProductSnapshot, scenario: "hour" }),
).toThrow();
expect(() =>
  parseReportSnapshot({ ...validProductSnapshot, unknownField: true }),
).toThrow();
expect(() =>
  parseReportSnapshot({
    ...partialProductSnapshot,
    results: { ...partialProductSnapshot.results, unitProfitCents: 0 },
  }),
).toThrow();
```

Also reject reordered/duplicated Product sections, facts, and answers; unknown category; Product V2; Service V1; noninteger money; mismatched partial flags; and Product-only verdicts inside a Service snapshot.

- [ ] **Step 3: Run the parser and Service domain suites and observe failure**

```bash
pnpm test -- src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/calculate-service-report.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/services/create-service-report.service.test.ts
```

Expected: FAIL because Product types/schemas and category dispatch do not exist.

- [ ] **Step 4: Extract neutral persisted-content schemas and preserve Service V2**

Move only these neutral contracts into `report-content.schema.ts`: `safeIntegerSchema`, `nonNegativeSafeIntegerSchema`, `positiveSafeIntegerSchema`, tone, section, executive-summary fact/answer/summary, and the ordered key arrays. Copy the current Service snapshot shape into `service-report-snapshot.schema.ts` without changing any accepted Service JSON property or literal.

```ts
type ServiceReportSnapshotV2 = z.infer<typeof serviceReportSnapshotV2Schema>;

function parseServiceReportSnapshot(value: unknown): ServiceReportSnapshotV2 {
  return serviceReportSnapshotV2Schema.parse(value);
}
```

Rename the generic `REPORT_SCHEMA_VERSION` constant to `SERVICE_REPORT_SCHEMA_VERSION` and update Service code/tests. Export separate `ServiceReportVerdict`/`ProductReportVerdict`, `ServiceReportPriority`/`ProductReportPriority`, and `ServiceReportUnit`/`ProductReportUnit` types; use their unions only at read/presentation boundaries. Make `calculate-service-report.ts` own its exact `ServiceReportCalculation` shape instead of extending a now-category-specific generic results type, and type every Service content map with Service-only unions.

Update the neutral formatters in this same checkpoint so the new union compiles without miscasting:

```ts
const scenarioLabels: Record<ReportScenario, string> = {
  hour: "Por hora",
  minute: "Por minuto",
  appointment: "Por atendimento",
  resale: "Revenda",
};

const unitLabels: Record<ReportUnit, string> = {
  hour: "hora",
  appointment: "atendimento",
  unit: "unidade",
};
```

Add formatter assertions for `resale` and `unit`; this only makes the read boundary exhaustive and does not enable Product in the wizard.

- [ ] **Step 5: Implement the strict Product V1 schema**

The Product schema must use strict objects and exactly these inputs/results:

```ts
const productInputsSchema = z.strictObject({
  purchaseUnitCostCents: positiveSafeIntegerSchema,
  unitSalePriceCents: positiveSafeIntegerSchema,
  fixedMonthlyExpensesCents: nonNegativeSafeIntegerSchema,
  monthlySalesVolume: z.number().int().positive().max(2_147_483_647).nullable(),
  proLaboreIncluded: z.boolean(),
  proLaboreCents: nonNegativeSafeIntegerSchema,
  taxRateBasisPoints: z.number().int().min(0).max(10_000),
  cardFeeRateBasisPoints: z.number().int().min(0).max(10_000),
});

const productResultsSchema = z.strictObject({
  effectiveFixedCostCents: nonNegativeSafeIntegerSchema,
  purchaseUnitCostCents: positiveSafeIntegerSchema,
  fixedAllocationCents: nonNegativeSafeIntegerSchema.nullable(),
  totalUnitCostCents: nonNegativeSafeIntegerSchema.nullable(),
  currentPriceCents: positiveSafeIntegerSchema,
  netRevenueCents: safeIntegerSchema,
  unitContributionCents: safeIntegerSchema,
  unitProfitCents: safeIntegerSchema.nullable(),
  realMarginBasisPoints: safeIntegerSchema.nullable(),
  minimumPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  targetPriceCents: nonNegativeSafeIntegerSchema.nullable(),
  priceReferencesPartial: z.boolean(),
  monthlySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  weeklySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  dailySalesGoal: nonNegativeSafeIntegerSchema.nullable(),
  breakEvenDiscountPercent: nonNegativeSafeIntegerSchema.nullable(),
  verdict: z.enum(productReportVerdicts),
  priority: z.enum(productReportPriorities),
});
```

Add `superRefine` invariants: compensation flag matches zero/positive amount; policy compensation matches inputs; results purchase cost/current price match inputs; missing volume requires all four complete-result fields `null` and both partial flags `true`; present volume requires non-null complete-result fields and partial flags `false`; discount base original price, applicable unit cost, fees, target, minimum, and partial flag match inputs/results; section/fact/answer keys appear in exact order.

Export the category-specific base and the read-boundary union without adding `partial` to immutable Service V2 JSON:

```ts
type ReportDiscountSimulationBase =
  ServiceReportDiscountSimulationBase | ProductReportDiscountSimulationBase;
```

- [ ] **Step 6: Implement the public category dispatcher and narrow write services**

```ts
const reportSnapshotSchema = z.discriminatedUnion("category", [
  serviceReportSnapshotV2Schema,
  productReportSnapshotV1Schema,
]);

type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;

function parseReportSnapshot(value: unknown): ReportSnapshot {
  return reportSnapshotSchema.parse(value);
}
```

Change `buildServiceReportSnapshot` and `createServiceReport` to consume/return `ServiceReportSnapshotV2`, not the wider union. Do not add Product branches to Service builders.

- [ ] **Step 7: Verify and commit**

```bash
pnpm test -- src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/calculate-service-report.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/services/create-service-report.service.test.ts src/modules/reports/formatters.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/domain/calculate-service-report.ts src/modules/reports/domain/build-executive-summary.ts src/modules/reports/domain/build-service-report-snapshot.ts src/modules/reports/services/create-service-report.service.ts src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts
pnpm exec prettier --check src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/domain/calculate-service-report.ts src/modules/reports/domain/build-executive-summary.ts src/modules/reports/domain/build-service-report-snapshot.ts src/modules/reports/services/create-service-report.service.ts src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts
git add src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/domain/calculate-service-report.ts src/modules/reports/domain/build-executive-summary.ts src/modules/reports/domain/build-service-report-snapshot.ts src/modules/reports/services/create-service-report.service.ts src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts
git commit -m "feat: add product report snapshot contract"
```

**Checkpoint:** Show Service V2 byte-shape regression, Product complete/partial parsing, unsupported-version failures, strict unknown-field failure, and category-narrowed write types. Wait for approval before Task 6.

---

### Task 6: Build deterministic Product report content and snapshots

**Files:**

- Rename: `src/modules/reports/domain/build-executive-summary.ts` → `src/modules/reports/domain/build-service-executive-summary.ts`
- Rename: `src/modules/reports/domain/build-executive-summary.test.ts` → `src/modules/reports/domain/build-service-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Create: `src/modules/reports/domain/build-product-executive-summary.ts`
- Create: `src/modules/reports/domain/build-product-executive-summary.test.ts`
- Create: `src/modules/reports/domain/build-product-report-snapshot.ts`
- Create: `src/modules/reports/domain/build-product-report-snapshot.test.ts`

**Interfaces:**

- Consumes: `ProductDiagnosisCommand`, `ProductReportCalculation`, Product V1 parser, and report formatters.
- Produces: `buildProductExecutiveSummary(calculation)` and `buildProductReportSnapshot(command, calculation): ProductReportSnapshotV1`; keeps renamed Service builder behavior exact.

- [ ] **Step 1: Rename the Service-only summary builder with a green regression first**

Update imports and test descriptions only:

```ts
import { buildServiceExecutiveSummary } from "./build-service-executive-summary";
```

Run:

```bash
pnpm test -- src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
```

Expected: PASS with unchanged Service strings and snapshots.

- [ ] **Step 2: Write failing Product executive-summary tests**

Assert the two facts and three answers are in exact key order. The required Product content matrix is:

| Verdict             | Label                    | Tone       | Required action                                      |
| ------------------- | ------------------------ | ---------- | ---------------------------------------------------- |
| `direct_loss`       | `Prejuízo direto`        | `critical` | Change purchase cost or price before seeking volume. |
| `incomplete_volume` | `Complete o diagnóstico` | `neutral`  | Inform average monthly volume.                       |
| `operational_loss`  | `Prejuízo operacional`   | `critical` | Correct price or allocated operating cost.           |
| `tight_margin`      | `Margem apertada`        | `warning`  | Move price/cost toward the 20% target.               |
| `adequate_margin`   | `Margem adequada`        | `positive` | Maintain required sales volume.                      |
| `above_target`      | `Acima da meta`          | `positive` | Validate market acceptance and maintain volume.      |

The incomplete fixture must assert these exact meanings:

```ts
expect(summary.facts).toEqual([
  {
    key: "margin",
    currentLabel: "Margem atual",
    currentValue: "Indisponível",
    referenceLabel: "Meta",
    referenceValue: "20%",
  },
  {
    key: "price",
    currentLabel: "Preço atual",
    currentValue: "R$ 100,00",
    referenceLabel: "Preço-alvo sem rateio fixo",
    referenceValue: "R$ 69,45",
  },
]);
expect(summary.answers).toEqual([
  expect.objectContaining({
    key: "profitability",
    answer: expect.stringContaining("contribuição por unidade é positiva"),
  }),
  expect.objectContaining({
    key: "price_sufficiency",
    answer: expect.stringContaining("referência ainda é parcial"),
  }),
  expect.objectContaining({
    key: "immediate_action",
    answer: expect.stringContaining("volume médio mensal"),
  }),
]);
```

Assert `direct_loss` never recommends more volume and complete profitable answers use “lucro por unidade”, not Service terminology.

- [ ] **Step 3: Write failing complete and partial snapshot tests**

For the Task 4 canonical commands, assert exact versions, discriminants, policy, inputs, results, five ordered section keys, executive summary, and bases:

```ts
expect(completeSnapshot.discountSimulationBase).toEqual({
  originalPriceCents: 10000,
  unitCostCents: 8000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2000,
  minimumPriceCents: 8696,
  partial: false,
});

expect(partialSnapshot.discountSimulationBase).toEqual({
  originalPriceCents: 10000,
  unitCostCents: 5000,
  totalFeeBasisPoints: 800,
  targetMarginBasisPoints: 2000,
  minimumPriceCents: 5435,
  partial: true,
});
```

Assert every section has non-empty deterministic body, the Product terms `unidade`, `custo de compra`, `20%`, and `6 dias`, and never includes `hora faturável` or `atendimento`.

- [ ] **Step 4: Run the Product builder tests and observe missing modules**

```bash
pnpm test -- src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts
```

Expected: FAIL because Product builders do not exist.

- [ ] **Step 5: Implement the Product executive summary**

Use private helpers `buildProductVerdict`, `buildProductFacts`, `buildProductPriority`, `buildProductProfitabilityAnswer`, `buildProductPriceAnswer`, and `buildProductImmediateActionAnswer`. Export only:

```ts
function buildProductExecutiveSummary(
  calculation: ProductReportCalculation,
): ReportExecutiveSummary {
  return {
    headline: "A verdade por trás do preço do seu produto.",
    introduction:
      "O Lucrivo mostra o que cada venda deixa, como os custos fixos afetam a unidade e qual ajuste merece prioridade.",
    verdict: buildProductVerdict(calculation),
    facts: buildProductFacts(calculation),
    priority: buildProductPriority(calculation),
    answers: [
      buildProductProfitabilityAnswer(calculation),
      buildProductPriceAnswer(calculation),
      buildProductImmediateActionAnswer(calculation),
    ],
  };
}
```

For `incomplete_volume`, explicitly say fixed expenses and enabled owner compensation are not allocated. For `direct_loss`, use `unitContributionCents` and never imply that increased volume fixes the sale.

- [ ] **Step 6: Implement the five Product sections and strict snapshot assembly**

Create one private builder per section. Use these content obligations:

```text
break_even:
  complete -> minimum price includes purchase cost, fees, and fixed allocation
  partial  -> minimum price is explicitly "sem rateio fixo"

hidden_cost:
  complete -> state fixed allocation and total unit cost
  partial  -> request volume; do not fabricate allocation or total cost

margin_diagnosis:
  use the six Product verdict labels/tones and 20% target

sales_goal:
  positive contribution -> monthly/weekly/daily units and the six-day premise
  non-positive contribution -> correct cost/price first; no volume target

discount_simulator:
  complete -> unit profit/real margin language
  partial  -> contribution/contribution-margin language and fixed-cost warning
```

Assemble and validate once:

```ts
function buildProductReportSnapshot(
  command: ProductDiagnosisCommand,
  calculation: ProductReportCalculation,
): ProductReportSnapshotV1 {
  const snapshot = {
    schemaVersion: PRODUCT_REPORT_SCHEMA_VERSION,
    calculationVersion: PRODUCT_CALCULATION_VERSION,
    contentVersion: PRODUCT_CONTENT_VERSION,
    category: "product",
    scenario: "resale",
    currency: "BRL",
    unit: "unit",
    policy: {
      targetMarginBasisPoints: 2000,
      weeklyDivisorHundredths: 433,
      operatingDaysPerWeek: 6,
      maximumDiscountPercent: 50,
      proLaboreIncluded: command.proLaboreIncluded,
    },
    inputs: {
      purchaseUnitCostCents: command.purchaseUnitCostCents,
      unitSalePriceCents: command.unitSalePriceCents,
      fixedMonthlyExpensesCents: command.fixedMonthlyExpensesCents,
      monthlySalesVolume: command.monthlySalesVolume,
      proLaboreIncluded: command.proLaboreIncluded,
      proLaboreCents: command.proLaboreCents,
      taxRateBasisPoints: command.taxRateBasisPoints,
      cardFeeRateBasisPoints: command.cardFeeRateBasisPoints,
    },
    results: {
      effectiveFixedCostCents: calculation.effectiveFixedCostCents,
      purchaseUnitCostCents: calculation.purchaseUnitCostCents,
      fixedAllocationCents: calculation.fixedAllocationCents,
      totalUnitCostCents: calculation.totalUnitCostCents,
      currentPriceCents: calculation.currentPriceCents,
      netRevenueCents: calculation.netRevenueCents,
      unitContributionCents: calculation.unitContributionCents,
      unitProfitCents: calculation.unitProfitCents,
      realMarginBasisPoints: calculation.realMarginBasisPoints,
      minimumPriceCents: calculation.minimumPriceCents,
      targetPriceCents: calculation.targetPriceCents,
      priceReferencesPartial: calculation.priceReferencesPartial,
      monthlySalesGoal: calculation.monthlySalesGoal,
      weeklySalesGoal: calculation.weeklySalesGoal,
      dailySalesGoal: calculation.dailySalesGoal,
      breakEvenDiscountPercent: calculation.breakEvenDiscountPercent,
      verdict: calculation.verdict,
      priority: calculation.priority,
    },
    executiveSummary: buildProductExecutiveSummary(calculation),
    sections: [
      buildProductBreakEvenSection(calculation),
      buildProductHiddenCostSection(calculation),
      buildProductMarginSection(calculation),
      buildProductSalesGoalSection(calculation),
      buildProductDiscountSection(calculation),
    ],
    discountSimulationBase: {
      originalPriceCents: calculation.currentPriceCents,
      unitCostCents:
        calculation.totalUnitCostCents ?? calculation.purchaseUnitCostCents,
      totalFeeBasisPoints: calculation.totalFeeBasisPoints,
      targetMarginBasisPoints: 2000,
      minimumPriceCents: calculation.minimumPriceCents,
      partial: calculation.priceReferencesPartial,
    },
  };

  return parseProductReportSnapshot(snapshot);
}
```

Keep the results object explicit as shown; do not spread the calculation because `totalFeeBasisPoints` is not part of persisted results.

- [ ] **Step 7: Verify both verticals and commit**

```bash
pnpm test -- src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/schemas/report-snapshot.schema.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/domain
pnpm exec prettier --check src/modules/reports/domain
git add src/modules/reports/domain
git commit -m "feat: build product diagnosis reports"
```

**Checkpoint:** Show exact complete/partial bases, all Product verdict copy, five ordered sections, absence of Service terms, strict parser result, and unchanged Service content. Wait for approval before Task 7.

---

### Task 7: Persist Product reports through the typed RPC

**Files:**

- Create: `src/modules/reports/services/create-product-report.service.ts`
- Create: `src/modules/reports/services/create-product-report.service.test.ts`

**Interfaces:**

- Consumes: `SupabaseClient<Database>`, `ProductDiagnosisCommand`, and `ProductReportSnapshotV1`.
- Produces: `createProductReport({ supabase, command, snapshot })` returning success with a positive safe report ID or safe `create_failed`.

- [ ] **Step 1: Write the failing complete and partial RPC mapping tests**

```ts
expect(rpc).toHaveBeenCalledWith("create_product_diagnosis_report", {
  p_submission_id: command.submissionId,
  p_purchase_unit_cost_cents: command.purchaseUnitCostCents,
  p_unit_sale_price_cents: command.unitSalePriceCents,
  p_fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
  p_monthly_sales_volume: command.monthlySalesVolume,
  p_pro_labore_included: command.proLaboreIncluded,
  p_pro_labore_cents: command.proLaboreCents,
  p_tax_rate_basis_points: command.taxRateBasisPoints,
  p_card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
  p_schema_version: 1,
  p_calculation_version: 1,
  p_content_version: 1,
  p_scenario: "resale",
  p_current_price_cents: snapshot.results.currentPriceCents,
  p_real_margin_basis_points: snapshot.results.realMarginBasisPoints,
  p_unit_profit_cents: snapshot.results.unitProfitCents,
  p_verdict: snapshot.results.verdict,
  p_priority: snapshot.results.priority,
  p_unit: "unit",
  p_report_snapshot: snapshot,
});
```

Repeat with missing volume and assert all three nullable RPC arguments are `null`: `p_monthly_sales_volume`, `p_real_margin_basis_points`, and `p_unit_profit_cents`.

- [ ] **Step 2: Write failing safe-result tests**

Assert `{ data: 42, error: null }` returns success. Assert provider error, `null`, zero, negative, fraction, unsafe integer, string, and thrown client failure all return exactly:

```ts
{ status: "error", error: "create_failed" }
```

No test may expect provider messages/codes to escape.

- [ ] **Step 3: Run the focused test and observe the missing service**

```bash
pnpm test -- src/modules/reports/services/create-product-report.service.test.ts
```

Expected: FAIL because the Product service does not exist.

- [ ] **Step 4: Implement the typed mapper and sanitized RPC call**

```ts
import "server-only";

type GeneratedProductRpcArgs =
  Database["public"]["Functions"]["create_product_diagnosis_report"]["Args"];

type ProductRpcArgs = Omit<
  GeneratedProductRpcArgs,
  | "p_monthly_sales_volume"
  | "p_real_margin_basis_points"
  | "p_unit_profit_cents"
> & {
  p_monthly_sales_volume: number | null;
  p_real_margin_basis_points: number | null;
  p_unit_profit_cents: number | null;
};
```

Implement `toProductRpcArgs` with the exact Step 1 map and cast only at the `.rpc` call to accommodate generated nullable-argument limitations. Validate the returned ID with `typeof data === "number"`, `Number.isSafeInteger(data)`, and `data > 0` inside `try/catch`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-service-report.service.test.ts
pnpm typecheck
pnpm exec eslint src/modules/reports/services
pnpm exec prettier --check src/modules/reports/services
git add src/modules/reports/services/create-product-report.service.ts src/modules/reports/services/create-product-report.service.test.ts
git commit -m "feat: persist product diagnosis reports"
```

**Checkpoint:** Show complete/partial RPC payloads, positive-ID validation, sanitized provider/thrown failures, and Service persistence regression. Wait for approval before Task 8.

---

### Task 8: Expose the authenticated Product Server Action

**Files:**

- Create: `src/modules/quick-diagnosis/actions/create-product-diagnosis.action.ts`
- Create: `src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts`

**Interfaces:**

- Consumes: untrusted `ProductDiagnosisInput`, `productDiagnosisSchema`, `requireUser`, `calculateProductReport`, `buildProductReportSnapshot`, and `createProductReport`.
- Produces: `createProductDiagnosis(input): Promise<CreateProductDiagnosisActionResult>`.

- [ ] **Step 1: Write failing invalid-input and unauthenticated ordering tests**

```ts
await expect(createProductDiagnosis(invalidInput)).resolves.toEqual({
  status: "error",
  error: "invalid_input",
  fieldErrors: expect.objectContaining({ purchaseUnitCost: expect.any(Array) }),
});
expect(requireUser).not.toHaveBeenCalled();
expect(calculateProductReport).not.toHaveBeenCalled();
expect(createProductReport).not.toHaveBeenCalled();
```

Then make `requireUser` reject with `new AuthRequiredError()` and assert `unauthorized` plus no calculator, builder, or persistence call.

- [ ] **Step 2: Write failing success-order and safe-failure tests**

```ts
await expect(createProductDiagnosis(validInput)).resolves.toEqual({
  status: "success",
  diagnosisId: 42,
});
expect(calculateProductReport).toHaveBeenCalledWith(command);
expect(buildProductReportSnapshot).toHaveBeenCalledWith(command, calculation);
expect(createProductReport).toHaveBeenCalledWith({
  supabase,
  command,
  snapshot,
});
expect(requireUser.mock.invocationCallOrder[0]).toBeLessThan(
  calculateProductReport.mock.invocationCallOrder[0]!,
);
```

Assert unexpected auth/calculator/builder/service throws and service `create_failed` all become safe `create_failed`. The action must not accept a browser `userId`.

- [ ] **Step 3: Run the focused test and observe the missing action**

```bash
pnpm test -- src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts
```

Expected: FAIL because the action does not exist.

- [ ] **Step 4: Implement the thin ordered action**

```ts
"use server";

async function createProductDiagnosis(
  input: ProductDiagnosisInput,
): Promise<CreateProductDiagnosisActionResult> {
  const parsed = productDiagnosisSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      error: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase } = await requireUser();
    const calculation = calculateProductReport(parsed.data);
    const snapshot = buildProductReportSnapshot(parsed.data, calculation);
    return await createProductReport({
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
}
```

- [ ] **Step 5: Verify both actions and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/actions
pnpm exec prettier --check src/modules/quick-diagnosis/actions
git add src/modules/quick-diagnosis/actions/create-product-diagnosis.action.ts src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts
git commit -m "feat: create product diagnoses securely"
```

**Checkpoint:** Report validation-before-auth, auth-before-calculation, exact success orchestration, safe exceptions, and unchanged Service action tests. Wait for approval before Task 9.

---

### Task 9: Extract the existing Service wizard behind a neutral shell

**Files:**

- Create: `src/modules/quick-diagnosis/components/shared/wizard-shell.tsx`
- Create: `src/modules/quick-diagnosis/components/shared/step-field.tsx`
- Create: `src/modules/quick-diagnosis/components/service/service-wizard-state.ts`
- Create: `src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts`
- Create: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx`
- Create: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx`
- Create: `src/modules/quick-diagnosis/components/service/steps/types.ts`
- Move: `current-price-step.tsx`, `fees-step.tsx`, `fixed-expenses-step.tsx`, `monthly-goal-step.tsx`, `pricing-method-step.tsx`, `review-step.tsx`, and `work-routine-step.tsx` from `src/modules/quick-diagnosis/components/steps/` into `src/modules/quick-diagnosis/components/service/steps/`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Delete after imports move: `src/modules/quick-diagnosis/components/wizard-state.ts`
- Delete after tests move: `src/modules/quick-diagnosis/components/wizard-state.test.ts`
- Delete after neutral extraction: `src/modules/quick-diagnosis/components/steps/step-field.tsx`

**Interfaces:**

- Consumes: the existing Service reducer/wizard/step behavior and action.
- Produces: a neutral `WizardShell`; generic `StepField<Field extends string>`; controlled `ServiceDiagnosisWizard`; and a category wrapper that still exposes Service only and keeps Product/Production disabled.

- [ ] **Step 1: Add failing extraction/regression tests before moving code**

Move every current reducer assertion and every Service-field/navigation/submission wizard assertion into the new Service paths, changing only imports and the controlled wrapper setup. Keep category-selection assertions in `quick-diagnosis-wizard.test.tsx`. Add assertions that:

```ts
expect(screen.getByText("2 de 8")).toBeInTheDocument();
expect(onBackToType).toHaveBeenCalledOnce();
expect(
  screen.getByRole("heading", {
    name: "Quanto você quer tirar por mês pra você?",
  }),
).toHaveFocus();
```

The category wrapper test must still assert Service enabled, Product/Production disabled, one UUID generation, exact Service action injection, and preserved values/UUID after editing category and reselecting Service.

- [ ] **Step 2: Run the new paths and observe missing modules**

```bash
pnpm test -- src/modules/quick-diagnosis/components/service/service-wizard-state.test.ts src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
```

Expected: FAIL because extracted modules do not exist.

- [ ] **Step 3: Create neutral field and shell primitives**

```ts
type StepFieldProps<Field extends string> = {
  field: Field;
  label: string;
  value: string;
  errors: Partial<Record<Field, string[]>>;
  onChange: (field: Field, value: string) => void;
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
};
```

Preserve the current `id`, `name`, `aria-invalid`, conditional `aria-describedby`, `role="alert"`, prefix/suffix, and autocomplete behavior.

```ts
type WizardShellProps = {
  stepNumber: number;
  totalSteps: number;
  title: string;
  backDisabled?: boolean;
  onBack: () => void;
  onContinue?: () => void;
  children: React.ReactNode;
};
```

Move the current progress/card/heading/footer markup into `WizardShell`; keep the focused `h2`, one `data-testid="wizard-step"`, motion-reduce classes, and omit Continue when `onContinue` is absent.

- [ ] **Step 4: Move Service state and steps without business changes**

The Service branch owns these seven steps:

```ts
const serviceWizardSteps = [
  "monthlyGoal",
  "fixedExpenses",
  "workRoutine",
  "pricingMethod",
  "currentPrice",
  "fees",
  "review",
] as const;
```

Remove `diagnosisType` and `diagnosisTypeError` from Service state. Keep all Service input values, method clearing, field ordering, edit navigation, submission lock, error focus, reset, and `/reports/{id}` redirect unchanged. Render global progress as local index plus two, so the branch spans `2 de 8` through `8 de 8`.

Replace the old Service-specific shared `StepProps` with this vertical-local contract:

```ts
type ServiceStepProps = {
  values: ServiceDiagnosisInput;
  errors: ServiceDiagnosisFieldErrors;
  onChange: (field: ServiceDiagnosisField, value: string) => void;
};
```

`ServiceDiagnosisWizard` accepts controlled `state`/`dispatch`, `createDiagnosis`, `createSubmissionId`, and `onBackToType`; Back from the first Service step and “Editar tipo de diagnóstico” call `onBackToType` without clearing the Service draft.

- [ ] **Step 5: Reduce `QuickDiagnosisWizard` to category orchestration**

Keep Product disabled in this task. The wrapper owns the category screen and the Service state instance. Selecting Service and continuing mounts `ServiceDiagnosisWizard`; returning to type retains that controlled state; the wrapper passes the unchanged Service action.

Do not add Product fields, validation, or calculations to any Service file.

- [ ] **Step 6: Verify the behavior-preserving extraction and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/components/service src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components
pnpm exec prettier --check src/modules/quick-diagnosis/components
git add src/modules/quick-diagnosis/components
git commit -m "refactor: separate service diagnosis wizard"
```

**Checkpoint:** Demonstrate all eight global Service steps, Back/Edit preservation, focus/error behavior, one submission lock, Product still disabled, and unchanged Service action payload. Wait for approval before Task 10.

---

### Task 10: Build Product wizard state and field steps

**Files:**

- Create: `src/modules/quick-diagnosis/components/product/product-wizard-state.ts`
- Create: `src/modules/quick-diagnosis/components/product/product-wizard-state.test.ts`
- Create: `src/modules/quick-diagnosis/components/product/steps/analysis-mode-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/steps/product-fixed-expenses-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/steps/monthly-volume-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/steps/owner-compensation-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/steps/product-fees-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/steps/types.ts`
- Create: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`

**Interfaces:**

- Consumes: Product raw input, field errors, generic `StepField`, and `validateProductDiagnosisFields`.
- Produces: `ProductWizardState`, `ProductWizardAction`, `createInitialProductWizardState`, `productWizardReducer`, `productWizardSteps`, and six accessible input/modality screens.

- [ ] **Step 1: Write failing Product reducer tests**

```ts
expect(createInitialProductWizardState(submissionId)).toEqual({
  step: "analysisMode",
  analysisMode: "",
  analysisModeError: null,
  values: {
    submissionId,
    purchaseUnitCost: "",
    unitSalePrice: "",
    fixedMonthlyExpenses: "",
    monthlySalesVolume: "",
    proLaboreIncluded: false,
    proLabore: "",
    taxRate: "",
    cardFeeRate: "",
  },
  fieldErrors: {},
  status: "editing",
  submitError: null,
});
```

Assert exact raw-string preservation; seven local steps; modality error clearing; field-error clearing on edit; compensation enable/disable; disabling clears `proLabore` and its error; next/back clamps; named edits; submitting/error states; and reset with a fresh UUID.

- [ ] **Step 2: Write failing accessible step tests**

Assert Quick analysis is enabled, Detailed analysis is disabled with visible `Em breve`, Product values expose “Custo de compra por unidade” and “Preço de venda por unidade”, fixed expenses may contain `0`, monthly volume visibly says optional, compensation starts unchecked and hides its amount, enabling reveals “Pró-labore mensal”, fees expose tax/card fields, and linked validation errors use `aria-invalid`, `aria-describedby`, and `role="alert"`.

Keyboard assertions must cover modality radio cards and the compensation checkbox/switch.

- [ ] **Step 3: Run focused tests and observe missing modules**

```bash
pnpm test -- src/modules/quick-diagnosis/components/product/product-wizard-state.test.ts src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx
```

Expected: FAIL because Product state/steps do not exist.

- [ ] **Step 4: Implement Product-only state**

```ts
const productWizardSteps = [
  "analysisMode",
  "productValues",
  "fixedExpenses",
  "monthlyVolume",
  "ownerCompensation",
  "fees",
  "review",
] as const;

type ProductWizardStep = (typeof productWizardSteps)[number];
type ProductAnalysisMode = "quick" | "detailed";
```

Actions must include `setAnalysisMode`, `setField`, `setProLaboreIncluded`, `setFieldErrors`, `next`, `back`, `edit`, `submitting`, `submitError`, and `reset`. The reducer never performs financial calculations or I/O.

- [ ] **Step 5: Implement the six Product input/modality screens**

Use only Product contracts. Exact per-step validation fields are:

```ts
type ProductStepProps = {
  values: ProductDiagnosisInput;
  errors: ProductDiagnosisFieldErrors;
  onChange: (field: ProductDiagnosisField, value: string) => void;
};
```

```ts
const productStepFields = {
  productValues: ["purchaseUnitCost", "unitSalePrice"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  monthlyVolume: ["monthlySalesVolume"],
  ownerCompensation: ["proLabore"],
  fees: ["taxRate", "cardFeeRate"],
} as const;
```

The owner-compensation screen must call `setProLaboreIncluded(false)` before hiding the input, ensuring stale text is removed in browser state as well as normalized on the server.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/components/product/product-wizard-state.test.ts src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components/product
pnpm exec prettier --check src/modules/quick-diagnosis/components/product
git add src/modules/quick-diagnosis/components/product
git commit -m "feat: add product diagnosis wizard steps"
```

**Checkpoint:** Show all Product state transitions, disabled detailed mode, optional-volume UI, conditional compensation, accessible errors, and absence of Service fields. Wait for approval before Task 11.

---

### Task 11: Complete Product review, submission, and redirect behavior

**Files:**

- Create: `src/modules/quick-diagnosis/components/product/steps/product-review-step.tsx`
- Create: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx`
- Create: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx`

**Interfaces:**

- Consumes: controlled Product state/dispatch, Product action, schema field validation, `WizardShell`, and `router.replace`.
- Produces: one independently testable Product branch spanning global steps 2–8, with complete review, errors, lock, retry, and report redirect.

- [ ] **Step 1: Write the failing complete-path and review tests**

Fill the canonical Product fixture through all screens and assert global progress `2 de 8` through `8 de 8`, one focused section, and review groups for mode, values, fixed expenses, volume, compensation, and fees.

```ts
expect(screen.getByText("Diagnóstico rápido")).toBeInTheDocument();
expect(screen.getByText("R$ 50,00")).toBeInTheDocument();
expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
expect(screen.getByText("100 unidades por mês")).toBeInTheDocument();
expect(screen.getByText("R$ 2.000,00")).toBeInTheDocument();
```

Click every “Editar …” control, assert the correct source heading, and return to review without losing raw strings.

- [ ] **Step 2: Write failing partial-review, validation-focus, and submission tests**

With empty volume, assert `Não informado` and the exact warning from spec section 4. With compensation disabled, assert `Não incluído` and no amount.

Assert a server `invalid_input` routes to/focuses the earliest Product field. If `submissionId` is invalid, regenerate it and return to `analysisMode`. Assert a synchronous ref blocks double click before awaiting; success locks and calls `router.replace("/reports/42")`; `unauthorized`/`create_failed` preserve review and UUID; unexpected rejection becomes `create_failed`.

Assert the rendered contract keeps one-column mobile layout and `sm:` multi-column enhancement, contains no fixed width wider than the shell, uses semantic theme tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, status tokens), and keeps `motion-reduce:transition-none`/`motion-reduce:transform-none` on interactive transitions. These class assertions protect the approved approximately 375px/1440px, light/dark, and reduced-motion behavior without adding screenshot dependencies.

- [ ] **Step 3: Run the focused test and observe missing review/wizard**

```bash
pnpm test -- src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx
```

Expected: FAIL because Product review/wizard do not exist.

- [ ] **Step 4: Implement the Product review**

The review owns formatting only, never financial formulas. Use the existing `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` convention and show the exact raw percentage strings with `%`.

```tsx
{
  values.monthlySalesVolume.trim() === "" ? (
    <div role="alert">
      Sem o volume mensal, os custos fixos não podem ser rateados por unidade. O
      relatório será parcial e não classificará sua margem como adequada.
    </div>
  ) : null;
}
```

The only confirmation control is `Confirmar diagnóstico`; pending copy is `Preparando relatório...`; unauthorized includes a `/login` link; create failure uses the existing safe retry copy.

- [ ] **Step 5: Implement the controlled Product wizard**

Use titles:

```ts
const productStepTitles: Record<ProductWizardStep, string> = {
  analysisMode: "Qual análise você quer fazer?",
  productValues: "Quais são o custo e o preço do produto?",
  fixedExpenses: "Quais são as despesas fixas mensais?",
  monthlyVolume: "Quantas unidades você vende por mês?",
  ownerCompensation: "Você quer incluir seu pró-labore?",
  fees: "Quais taxas incidem nas vendas?",
  review: "Revise as informações do produto",
};
```

Validate only current-step fields, except modality which requires `quick`. Render global progress as local index plus two. Back from `analysisMode` and Review’s category edit call `onBackToType` without mutating the Product state.

Implement submission with the same synchronous lock/focus algorithm as Service but Product field order:

```ts
const productFieldOrder: ProductDiagnosisField[] = [
  "submissionId",
  "purchaseUnitCost",
  "unitSalePrice",
  "fixedMonthlyExpenses",
  "monthlySalesVolume",
  "proLaboreIncluded",
  "proLabore",
  "taxRate",
  "cardFeeRate",
];
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/components/product src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components/product
pnpm exec prettier --check src/modules/quick-diagnosis/components/product
git add src/modules/quick-diagnosis/components/product
git commit -m "feat: complete product diagnosis wizard"
```

**Checkpoint:** Demonstrate complete and partial reviews, all Edit paths, first-invalid focus, submission-ID recovery, lock/retry/redirect behavior, keyboard controls, and raw-value preservation. Wait for approval before Task 12.

---

### Task 12: Present Product reports and partial discount simulations

**Files:**

- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Modify: `src/modules/reports/services/get-report.service.test.ts`
- Modify: `src/modules/reports/services/list-reports.service.test.ts`
- Test: `src/modules/reports/components/report-detail.test.tsx`
- Test: `src/app/(private)/reports/[id]/page.test.tsx`
- Test: `src/app/(private)/reports/page.test.tsx`

**Interfaces:**

- Consumes: `ReportSnapshot` union, Product persisted wording, Product partial base, and generic report rows.
- Produces: category-correct identity/numbers/list labels and a simulator that distinguishes real profit/margin from partial contribution/contribution margin.

- [ ] **Step 1: Write failing Product presenter tests**

The `resale` and `unit` formatter assertions introduced with the snapshot union in Task 5 remain green. For a complete Product snapshot, assert:

```ts
expect(viewModel.identity).toEqual({
  id: 42,
  title: "Diagnóstico de Produto",
  categoryLabel: "Produto",
  scenarioLabel: "Revenda",
  createdAtLabel: "31/08/2026, 12:00",
  unitLabel: "unidade",
});
expect(viewModel.numbers).toEqual([
  { key: "price", label: "Preço atual", value: "R$ 100,00" },
  { key: "margin", label: "Margem real", value: "12%" },
  { key: "profit", label: "Lucro por unidade", value: "R$ 12,00" },
  { key: "minimum", label: "Preço mínimo", value: "R$ 86,96" },
  { key: "target", label: "Preço-alvo (20%)", value: "R$ 111,12" },
]);
```

For a partial Product snapshot, margin is unavailable, the third number is `Contribuição por unidade` with `R$ 42,00`, and minimum/target labels include `sem rateio fixo`. Keep current Service presenter assertions exact.

- [ ] **Step 2: Write failing complete/partial discount tests**

Complete Product bases at 0%, 10%, 50%, and the break-even boundary return discounted price, unit profit, real margin, and existing status logic. Partial Product bases at the same boundaries use purchase cost and render labels `Contribuição por unidade` and `Margem de contribuição`, plus:

```text
Simulação parcial: despesas fixas e pró-labore não foram rateados por unidade.
```

Assert it never renders “Lucro por unidade” or “Margem real” in partial mode. Service bases have no `partial` property and must retain current copy/behavior.

- [ ] **Step 3: Write failing Product library and reader tests**

Use Product database summary rows and snapshots to assert:

```ts
expect(screen.getByText("Diagnóstico de Produto")).toBeInTheDocument();
expect(screen.getByText("Revenda")).toBeInTheDocument();
expect(screen.getByText("Complete o diagnóstico")).toBeInTheDocument();
```

Add `direct_loss` presentation as destructive and `incomplete_volume` as informational. `getOwnedReport` must accept matching Product category/scenario and still reject mismatches/malformed snapshots. `listOwnedReports` maps Product enum values without reading `report_snapshot`.

- [ ] **Step 4: Run focused report tests and observe Product failures**

```bash
pnpm test -- src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-library.test.tsx src/modules/reports/services/get-report.service.test.ts src/modules/reports/services/list-reports.service.test.ts src/modules/reports/components/report-detail.test.tsx src/app/'(private)'/reports/'[id]'/page.test.tsx src/app/'(private)'/reports/page.test.tsx
```

Expected: FAIL on Product labels/presentation while existing Service cases remain green.

- [ ] **Step 5: Implement category-aware formatters and presenter branches**

Define typed maps for `service`/`product`, Service scenarios plus `resale`, and units plus `unit`. In `toReportViewModel`, discriminate once on `snapshot.category` and delegate the numbers to `toServiceNumbers` or `toProductNumbers`; do not scatter Product checks inside Service builders.

```ts
function toProductNumbers(
  snapshot: ProductReportSnapshotV1,
): ReportNumberViewModel[] {
  const partial = snapshot.results.priceReferencesPartial;
  return [
    {
      key: "price",
      label: "Preço atual",
      value: formatCurrency(snapshot.results.currentPriceCents),
    },
    {
      key: "margin",
      label: "Margem real",
      value: optionalPercentage(snapshot.results.realMarginBasisPoints),
    },
    {
      key: "profit",
      label: partial ? "Contribuição por unidade" : "Lucro por unidade",
      value: optionalCurrency(
        partial
          ? snapshot.results.unitContributionCents
          : snapshot.results.unitProfitCents,
      ),
    },
    {
      key: "minimum",
      label: partial ? "Preço mínimo (sem rateio fixo)" : "Preço mínimo",
      value: optionalCurrency(snapshot.results.minimumPriceCents),
    },
    {
      key: "target",
      label: partial ? "Preço-alvo (sem rateio fixo)" : "Preço-alvo (20%)",
      value: optionalCurrency(snapshot.results.targetPriceCents),
    },
  ];
}
```

- [ ] **Step 6: Adapt the simulator and report-library presentation**

Treat missing `partial` as `false` for immutable Service V2 snapshots:

```ts
const partial = "partial" in base && base.partial;
```

The numerical simulation continues to use `unitCostCents`, total fees, target margin, and minimum price from the persisted base. Only Product partial labels/warning differ.

Add `resale`, `direct_loss`, and `incomplete_volume` to `ReportListCard` presentation maps. Do not use fallback-to-Service copy for valid Product values.

- [ ] **Step 7: Verify all report variants and commit**

```bash
pnpm test -- src/modules/reports src/app/'(private)'/reports
pnpm typecheck
pnpm exec eslint src/modules/reports src/app/'(private)'/reports
pnpm exec prettier --check src/modules/reports src/app/'(private)'/reports
git add src/modules/reports src/app/'(private)'/reports
git commit -m "feat: present product diagnosis reports"
```

**Checkpoint:** Show complete/partial Product numbers, partial simulator wording, both new verdict badges, Product list/detail identity, safe malformed snapshot behavior, and unchanged Service report suites. Wait for approval before Task 13.

---

### Task 13: Enable Product in the category orchestrator and run delivery gates

**Files:**

- Modify: `src/modules/quick-diagnosis/components/steps/diagnosis-type-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`

**Interfaces:**

- Consumes: both controlled verticals and both Server Actions.
- Produces: Product enabled, Production disabled, fresh branch lifecycle, complete Product redirect-to-report flow, and a fully verified release candidate.

- [ ] **Step 1: Write failing category/orchestration tests**

Assert Service and Product are enabled radio cards, Production alone has `aria-disabled="true"` and `Em breve`, and keyboard arrows can select Product.

Test these branch lifecycle cases explicitly:

```text
initial type -> Product creates Product state with UUID A
Product -> edit type -> Product preserves Product raw values and UUID A
Product -> edit type -> Service discards Product and creates Service UUID B
Service -> edit type -> Product creates fresh Product UUID C, not UUID A
retry within Product keeps UUID C
```

Complete one Product path through confirmation, assert only `createProductDiagnosis` receives Product input, resolve ID `42`, and assert `/reports/42`. Complete one Service path and assert only the unchanged Service action receives Service input.

- [ ] **Step 2: Write the failing private-page composition test**

```ts
expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
  {
    createServiceDiagnosis,
    createProductDiagnosis,
  },
  undefined,
);
```

- [ ] **Step 3: Run the integration tests and observe Product still disabled/unwired**

```bash
pnpm test -- src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
```

Expected: FAIL because Product is not yet enabled or injected.

- [ ] **Step 4: Implement category selection and branch replacement**

`DiagnosisTypeStep` accepts Service/Product changes and ignores Production. `QuickDiagnosisWizard` owns only category selection/screen and the active discriminated branch state:

```ts
type ActiveDiagnosisBranch =
  | { type: "service"; state: ServiceWizardState }
  | { type: "product"; state: ProductWizardState };
```

When Continue selects the same branch type, preserve its state. When it selects a different type, construct the new vertical’s initial state with a new `createSubmissionId()` result and replace the old branch. Delegate branch actions to its category reducer and render exactly one branch component.

Update the page to inject:

```tsx
<QuickDiagnosisWizard
  createServiceDiagnosis={createServiceDiagnosis}
  createProductDiagnosis={createProductDiagnosis}
/>
```

- [ ] **Step 5: Run all focused feature and database regression suites**

```bash
pnpm test -- src/modules/quick-diagnosis src/modules/reports src/app/'(private)'/quick-diagnosis src/app/'(private)'/reports
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all Product and Service tests pass, database rebuild is clean, generated types have no drift, and advisors have no unreviewed warning/error.

- [ ] **Step 6: Run full application and production-build gates**

```bash
pnpm check
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
git diff --check
git status --short
```

Expected: Vitest, Next type generation/TypeScript, ESLint, repository-wide Prettier, production build, and whitespace checks pass. The inline non-test Turnstile value avoids mutating environment files.

- [ ] **Step 7: Inspect scope and commit the enabled integration**

```bash
git diff --name-status
git diff -- package.json pnpm-lock.yaml .env.local supabase/seed.sql
git add src/modules/quick-diagnosis/components/steps/diagnosis-type-step.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/app/'(private)'/quick-diagnosis/page.tsx src/app/'(private)'/quick-diagnosis/page.test.tsx
git commit -m "feat: enable product quick diagnosis"
```

Expected: no dependency, environment, seed, Production, browser-artifact, or unrelated refactor drift.

**Checkpoint:** Report Product/Service end-to-end component flows, branch UUID lifecycle, Production disabled state, full app/database/type/advisor/build gates, final file scope, and rollback readiness. Wait for approval before declaring the plan complete.

---

## Rollback Check

If Product must be disabled before release, revert Task 13’s selector/page entrypoints so Product is again unavailable. Leave additive enum/table/function objects and any already-created Product reports intact. Removing database objects or data requires a separate reviewed forward migration; never delete them with an ad hoc rollback command.

## Spec Coverage Map

| Spec requirement                                                 | Implemented by             |
| ---------------------------------------------------------------- | -------------------------- |
| Product-only scope and separate vertical                         | Tasks 3–13                 |
| Eight-step journey and disabled detailed/Production modes        | Tasks 9–13                 |
| Raw input, validation, optional volume, conditional compensation | Tasks 3, 10, 11            |
| Validation → authentication → calculation → snapshot → RPC       | Task 8                     |
| Product formulas, rounding, target, verdict, priority            | Task 4                     |
| Product V1 strict immutable snapshot and Service V2 preservation | Tasks 5–6                  |
| Deterministic executive summary and five Product sections        | Task 6                     |
| Additive Product table, RLS, grants, atomic/idempotent RPC       | Tasks 1–2                  |
| Safe action/service errors and accessible wizard behavior        | Tasks 7–11                 |
| Complete/partial report detail, library, and discount simulator  | Task 12                    |
| Category orchestration, branch reset/retry semantics             | Task 13                    |
| Database/app/build gates and rollback                            | Task 13 and Rollback Check |
