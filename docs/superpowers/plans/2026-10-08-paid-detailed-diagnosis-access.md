# Paid Detailed Diagnosis Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict new detailed diagnoses to paid or courtesy access, preserve exactly one free quick diagnosis per user, show the upgrade decision before the detailed form, resume the chosen category after confirmed payment, and remove the redundant saved-report label.

**Architecture:** PostgreSQL remains the authoritative entitlement boundary: quick RPCs alone may assign the permanent free flag, while the detailed RPC requires current report entitlement and always writes a paid report. The application projects separate quick and detailed capabilities, gates detailed mode in the existing wizard, and stores only a short-lived category intent in `sessionStorage` for the hosted Checkout round trip. Existing detailed free reports remain permanently readable but no longer consume the quick allowance.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Vitest/Testing Library, Supabase/PostgreSQL with pgTAP and RLS, Base UI dialogs, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-08-paid-detailed-diagnosis-access-design.md`

## Global Constraints

- Do not edit an applied migration. Create the new imperative migration with `pnpm exec supabase migration new restrict_detailed_diagnosis_to_paid_access` and use the exact path printed by the CLI.
- Before database implementation, fetch `https://supabase.com/changelog.md`, scan relevant breaking changes, and verify current official RLS/function guidance as required by the project Supabase skill.
- Detailed creation requires `private.has_report_entitlement_for_user(caller_id, statement_timestamp())`; paid and courtesy access both satisfy it.
- New detailed rows always use `is_free_report = false`; only quick reports may consume the free allowance.
- The free allowance is historical and includes soft-deleted quick reports.
- Existing detailed rows with `is_free_report = true` remain readable and do not consume the quick allowance.
- Preserve public RPC signatures, empty `search_path`, current grants/revokes, authenticated ownership checks, advisory locking, idempotency, and atomic writes.
- Checkout callbacks never grant access. Only the billing overview observed after verified webhook processing may resume detailed mode.
- Persist only `{ version, userId, category, createdAt }` for two hours in `sessionStorage`; never persist detailed financial fields.
- Use the exact Portuguese copy approved by the spec and preserve keyboard, focus-return, responsive, and reduced-motion behavior.
- Follow TDD: add a failing focused test, observe the intended failure, implement the smallest coherent change, and rerun the focused test before each commit.
- Keep unrelated worktree changes intact.

---

### Task 1: Enforce quick-only free entitlement in PostgreSQL and the demo seed

**Files:**

- Create via CLI: the exact migration path printed by `pnpm exec supabase migration new restrict_detailed_diagnosis_to_paid_access`
- Modify: `supabase/tests/billing_access.test.sql`
- Modify: `supabase/tests/detailed_diagnosis_reports.test.sql`
- Modify: `supabase/tests/report_lifecycle.test.sql`
- Modify: `supabase/tests/seed.test.sql`
- Modify: `scripts/demo-seed/user-scenarios.ts`
- Modify: `scripts/demo-seed/user-scenarios.test.ts`
- Regenerate: `supabase/seed.sql`

**Interfaces:**

- Consumes: `private.has_report_entitlement_for_user(uuid, timestamptz) returns boolean`; existing public quick and detailed RPC signatures.
- Produces: partial unique index `public.diagnoses_one_free_quick_report_per_user_idx`; detailed RPC error `P0001/paid_access_required`; quick RPC error remains `P0001/free_report_limit_reached`.

- [ ] **Step 1: Add failing pgTAP coverage for the entitlement split**

In `supabase/tests/detailed_diagnosis_reports.test.sql`, replace the assertion that an unpaid user creates one free detailed mix with:

```sql
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000200'
  ) $$,
  'P0001',
  'paid_access_required',
  'an unpaid user cannot create a first detailed mix'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id = '71000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'rejected detailed creation leaves no diagnosis registry row'
);
```

Add paid and courtesy fixtures, prove each may create a detailed report, and assert both rows have `is_free_report = false`. Preserve an idempotency assertion that replays an already-created submission and receives the same ID after current entitlement ends.

In `supabase/tests/billing_access.test.sql`, add a fixture user whose first report during paid access is detailed and whose next report is quick. Assert the ordered rows are `(detailed, false)` then `(quick, true)`. Use a real UUID declared by the test. End paid access and prove a second quick submission raises `P0001/free_report_limit_reached`.

In `supabase/tests/report_lifecycle.test.sql`, add a legacy detailed row with `is_free_report = true`; prove it remains readable and does not prevent one free quick creation. Update `plan(...)` counts in all changed pgTAP files.

- [ ] **Step 2: Run the focused database tests and verify failure**

```bash
pnpm exec supabase test db \
  supabase/tests/billing_access.test.sql \
  supabase/tests/detailed_diagnosis_reports.test.sql \
  supabase/tests/report_lifecycle.test.sql
```

Expected: the old policy still allows a first detailed report to be free, and the global unique index blocks the legacy compatibility scenario.

- [ ] **Step 3: Create the migration with the CLI**

```bash
pnpm exec supabase migration new restrict_detailed_diagnosis_to_paid_access
```

Use the exact generated path printed by the command for all remaining SQL and staging in this task. Do not rename it or modify `20260918234830_report_lifecycle.sql`.

- [ ] **Step 4: Replace the global free-report index**

```sql
drop index public.diagnoses_one_free_report_per_user_idx;

create unique index diagnoses_one_free_quick_report_per_user_idx
on public.diagnoses (user_id)
where is_free_report and analysis_mode = 'quick';
```

Do not filter `deleted_at`; soft delete must not return the benefit.

- [ ] **Step 5: Recreate the three effective quick implementations**

Copy the complete current function definitions from these migrations into the new migration:

- Service: `20260929140500_accept_direct_report_copy_versions.sql`, `private.create_service_diagnosis_report_v4_impl`.
- Product: `20261005210000_accept_break_even_reference_copy_versions.sql`, `private.create_product_diagnosis_report_v3_impl`.
- Production: `20261005210000_accept_break_even_reference_copy_versions.sql`, `private.create_production_diagnosis_report_v3_impl`.

In each copied function, make only this free-detection change:

```sql
report_is_free := not exists (
  select 1
  from public.diagnoses as diagnosis
  where diagnosis.user_id = caller_id
    and diagnosis.is_free_report
    and diagnosis.analysis_mode = 'quick'
);
```

Keep the user advisory lock before this query, preserve all validation/version branches, and retain the entitlement check when `report_is_free` is false.

- [ ] **Step 6: Recreate the effective detailed implementation**

Copy the complete `private.create_detailed_diagnosis_report_impl` from `20261005210000_accept_break_even_reference_copy_versions.sql`. Keep validation, advisory locking, idempotent lookup, collision handling, normalized inserts, and returned ID.

After the idempotent return and collision check, replace free detection with:

```sql
if not private.has_report_entitlement_for_user(
  caller_id,
  pg_catalog.statement_timestamp()
) then
  raise exception using
    errcode = 'P0001',
    message = 'paid_access_required';
end if;
```

Remove the unused `report_is_free` variable and insert a literal `false` into `is_free_report`. Do not move the access check before the idempotent replay branch.

- [ ] **Step 7: Make every seeded report owner create a quick report first**

In `scripts/demo-seed/user-scenarios.ts`, derive:

```ts
const quickReportTemplates = currentReportTemplates.filter(
  (template) => template.analysisMode === "quick",
);
```

For each client's `reportOrdinal === 0`, choose from `quickReportTemplates` by stable owner ordinal; later reports keep the existing full-catalog rotation. Preserve the admin scenario's existing quick-first ordering. In `user-scenarios.test.ts`, resolve every owner's first assigned template, including the admin, and assert `analysisMode === "quick"`.

- [ ] **Step 8: Update seed invariants and regenerate SQL**

In both free-report assertions in `supabase/tests/seed.test.sql`, count only `is_free_report and analysis_mode = 'quick'`. Add an assertion that the current seed contains zero rows where `is_free_report and analysis_mode = 'detailed'`, then update the pgTAP plan count.

Run:

```bash
pnpm test -- scripts/demo-seed/user-scenarios.test.ts scripts/demo-seed/render-seed.test.ts
pnpm seed:generate
pnpm seed:check
```

Expected: generator tests pass and `supabase/seed.sql` changes deterministically.

- [ ] **Step 9: Rebuild and verify the database contract**

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm exec supabase test db \
  supabase/tests/billing_access.test.sql \
  supabase/tests/detailed_diagnosis_reports.test.sql \
  supabase/tests/report_lifecycle.test.sql \
  supabase/tests/seed.test.sql
pnpm supabase:advisors
pnpm supabase:lint
```

Expected: reset and targeted tests pass; advisors and lint show no new error. Inspect the migration to confirm public wrappers remain invoker functions, private implementations retain empty search paths, and no new execute grant exists.

- [ ] **Step 10: Commit the database slice**

```bash
git add supabase/migrations/ supabase/tests/billing_access.test.sql \
  supabase/tests/detailed_diagnosis_reports.test.sql \
  supabase/tests/report_lifecycle.test.sql supabase/tests/seed.test.sql \
  scripts/demo-seed/user-scenarios.ts \
  scripts/demo-seed/user-scenarios.test.ts supabase/seed.sql
git commit -m "feat: reserve detailed diagnoses for paid access"
```

---

### Task 2: Split quick and detailed capabilities in the billing overview

**Files:**

- Modify: `src/modules/billing/types.ts`
- Modify: `src/modules/billing/services/get-billing-overview.service.ts`
- Modify: `src/modules/billing/services/get-billing-overview.service.test.ts`
- Modify: `src/modules/billing/components/billing-plans.tsx`
- Modify: `src/modules/billing/components/billing-plans.test.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Update fixtures: `src/app/(private)/billing/page.test.tsx`
- Update fixtures: `src/app/(private)/billing/return/page.test.tsx`
- Update fixtures: `src/app/(private)/reports/[id]/page.test.tsx`
- Update fixtures: `src/app/api/reports/[id]/ai/messages/route.test.ts`
- Update fixtures: `src/modules/reports/actions/save-report-edit.action.test.ts`

**Interfaces:**

- Consumes: contract intervals, `current_courtesy_access_expires_at`, and quick free-report history.
- Produces: `canCreateQuickDiagnosis`, `canCreateDetailedDiagnosis`, and `freeQuickDiagnosisUsed` on `BillingOverview`.

- [ ] **Step 1: Rewrite service tests around explicit capabilities**

Use these expected combinations:

```ts
// Free, allowance unused
canCreateQuickDiagnosis: true,
canCreateDetailedDiagnosis: false,
freeQuickDiagnosisUsed: false,

// Free, allowance used
canCreateQuickDiagnosis: false,
canCreateDetailedDiagnosis: false,
freeQuickDiagnosisUsed: true,

// Paid or courtesy
canCreateQuickDiagnosis: true,
canCreateDetailedDiagnosis: true,
freeQuickDiagnosisUsed: true,
```

Extend the Supabase mock chain to `select -> eq(user_id) -> eq(is_free_report) -> eq(analysis_mode) -> limit -> maybeSingle`, and assert the service calls `.eq("analysis_mode", "quick")`.

- [ ] **Step 2: Run the service test and verify failure**

```bash
pnpm test -- src/modules/billing/services/get-billing-overview.service.test.ts
```

Expected: failures report the old properties and missing mode filter.

- [ ] **Step 3: Replace the ambiguous overview properties**

In `types.ts`, replace the two generic fields with:

```ts
canCreateQuickDiagnosis: boolean;
canCreateDetailedDiagnosis: boolean;
freeQuickDiagnosisUsed: boolean;
```

In the service, filter `analysis_mode = quick` and return:

```ts
const freeQuickDiagnosisUsed =
  freeReportResult.data?.is_free_report === true;
const hasReportAccess = hasPaidAccess || hasCourtesyAccess;

canCreateQuickDiagnosis: hasReportAccess || !freeQuickDiagnosisUsed,
canCreateDetailedDiagnosis: hasReportAccess,
freeQuickDiagnosisUsed,
```

Remove the old properties completely.

- [ ] **Step 4: Migrate consumers and fixtures**

Use `canCreateQuickDiagnosis` in `billing-plans.tsx` and the quick-diagnosis page. Do not alter unrelated `tier === "paid"` checks for AI or report editing. Update every fixture listed in this task with the canonical combinations from Step 1.

Do not pass the detailed capability into the wizard yet; Task 5 adds the prop and its behavior in one testable slice.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
pnpm test -- \
  src/modules/billing/services/get-billing-overview.service.test.ts \
  src/modules/billing/components/billing-plans.test.tsx \
  'src/app/(private)/quick-diagnosis/page.test.tsx' \
  'src/app/(private)/billing/page.test.tsx' \
  'src/app/(private)/billing/return/page.test.tsx' \
  'src/app/(private)/reports/[id]/page.test.tsx' \
  'src/app/api/reports/[id]/ai/messages/route.test.ts' \
  src/modules/reports/actions/save-report-edit.action.test.ts
pnpm typecheck
```

Expected: tests pass and no consumer references the removed names.

- [ ] **Step 6: Commit the capability projection**

```bash
git add src/modules/billing src/app/'(private)'/quick-diagnosis \
  src/app/'(private)'/billing src/app/'(private)'/reports/'[id]' \
  src/app/api/reports/'[id]'/ai/messages \
  src/modules/reports/actions/save-report-edit.action.test.ts
git commit -m "refactor: split diagnosis billing capabilities"
```

---

### Task 3: Remove the redundant saved-report label

**Files:**

- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Modify: `src/modules/reports/presenters/report-language.ts`

**Interfaces:**

- Consumes: `OwnedReportSummary` and the existing report-card layout.
- Produces: uniform quick/detailed card footers containing only `Abrir relatório`.

- [ ] **Step 1: Require the label's absence in component tests**

Replace the positive assertion with:

```ts
expect(screen.queryByText("Diagnóstico salvo")).not.toBeInTheDocument();
expect(screen.getByRole("link", { name: "Abrir relatório" })).toBeVisible();
```

Add the same absence assertion for one detailed card.

- [ ] **Step 2: Run the report test and verify failure**

```bash
pnpm test -- src/modules/reports/components/report-library.test.tsx
```

Expected: the quick card still renders `Diagnóstico salvo`.

- [ ] **Step 3: Remove the label, icon, and language property**

Remove `CircleDollarSignIcon`, remove `savedReportLabel` from the language profile and current profile, and use the detailed card's right-aligned footer structure in the quick card:

```tsx
<div className="flex items-center justify-end">
  <Link
    href={`/reports/${report.id}`}
    className={cn(
      buttonVariants({ variant: "outline", size: "sm" }),
      "group-hover:border-primary/40",
    )}
  >
    Abrir relatório
    <ArrowUpRightIcon aria-hidden="true" />
  </Link>
</div>
```

- [ ] **Step 4: Run the focused checks**

```bash
pnpm test -- src/modules/reports/components/report-library.test.tsx
pnpm exec prettier --check \
  src/modules/reports/components/report-list-card.tsx \
  src/modules/reports/components/report-library.test.tsx \
  src/modules/reports/presenters/report-language.ts
```

Expected: both commands pass.

- [ ] **Step 5: Commit the cleanup**

```bash
git add src/modules/reports/components/report-list-card.tsx \
  src/modules/reports/components/report-library.test.tsx \
  src/modules/reports/presenters/report-language.ts
git commit -m "fix: remove redundant saved diagnosis label"
```

---

### Task 4: Add versioned detailed-diagnosis intent and Checkout return action

**Files:**

- Create: `src/modules/detailed-diagnosis/services/detailed-diagnosis-intent.ts`
- Create: `src/modules/detailed-diagnosis/services/detailed-diagnosis-intent.test.ts`
- Create: `src/modules/detailed-diagnosis/components/resume-detailed-diagnosis-link.tsx`
- Create: `src/modules/detailed-diagnosis/components/resume-detailed-diagnosis-link.test.tsx`
- Modify: `src/app/(private)/billing/return/page.tsx`
- Modify: `src/app/(private)/billing/return/page.test.tsx`

**Interfaces:**

- Consumes: `DetailedDiagnosisCategory`, authenticated user ID, and confirmed billing tier.
- Produces: `saveDetailedDiagnosisIntent`, `readDetailedDiagnosisIntent`, `clearDetailedDiagnosisIntent`, and `ResumeDetailedDiagnosisLink`.

- [ ] **Step 1: Write failing unit tests for version, ownership, category, and TTL**

Use an in-memory `Storage` stub and cover:

```ts
saveDetailedDiagnosisIntent(storage, {
  userId: "user-1",
  category: "product",
  now: 1_000,
});

expect(readDetailedDiagnosisIntent(storage, "user-1", 1_001)).toEqual({
  category: "product",
});
expect(
  readDetailedDiagnosisIntent(storage, "user-1", 1_000 + 2 * 60 * 60 * 1000),
).toBeNull();
expect(readDetailedDiagnosisIntent(storage, "user-2", 1_001)).toBeNull();
```

Also cover malformed JSON, unsupported version, invalid category, throwing storage methods, and explicit clearing.

- [ ] **Step 2: Run the utility test and verify the module is absent**

```bash
pnpm test -- src/modules/detailed-diagnosis/services/detailed-diagnosis-intent.test.ts
```

Expected: FAIL because the utility does not exist.

- [ ] **Step 3: Implement the fail-safe storage boundary**

Expose this contract:

```ts
const DETAILED_DIAGNOSIS_INTENT_KEY = "lucrivo:detailed-diagnosis-intent:v1";
const DETAILED_DIAGNOSIS_INTENT_TTL_MS = 2 * 60 * 60 * 1000;

function saveDetailedDiagnosisIntent(
  storage: Pick<Storage, "setItem">,
  input: {
    userId: string;
    category: DetailedDiagnosisCategory;
    now?: number;
  },
): boolean;

function readDetailedDiagnosisIntent(
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string,
  now?: number,
): { category: DetailedDiagnosisCategory } | null;

function clearDetailedDiagnosisIntent(
  storage: Pick<Storage, "removeItem">,
): void;
```

Serialize `{ version: 1, userId, category, createdAt }`. Validate every parsed field, accept only `product|production`, remove expired/malformed/wrong-user entries, and catch storage exceptions.

- [ ] **Step 4: Write failing resume-link and return-page tests**

Cover:

- no valid intent renders `Fazer diagnóstico` at `/quick-diagnosis`;
- valid Product intent renders `Continuar diagnóstico detalhado` at `/quick-diagnosis?resume=detailed&category=product`;
- clicking the resume link clears the intent;
- another user's intent falls back safely;
- the return page uses the component only for `outcome=success` with `tier === "paid"`;
- pending, canceled, and expired states never render a resume action.

- [ ] **Step 5: Implement the resume component and confirmed-success composition**

Create the client component around this logic:

```tsx
const [category, setCategory] = useState<DetailedDiagnosisCategory | null>(
  null,
);

useEffect(() => {
  setCategory(
    readDetailedDiagnosisIntent(window.sessionStorage, userId)?.category ??
      null,
  );
}, [userId]);

const href = category
  ? `/quick-diagnosis?resume=detailed&category=${category}`
  : "/quick-diagnosis";
```

Render a styled `Link`; clear the intent on click only when a category exists. Pass `userId` from `requireUser()` into this component on the paid-confirmed return screen. Never trust `outcome=success` alone.

- [ ] **Step 6: Run intent and return tests**

```bash
pnpm test -- \
  src/modules/detailed-diagnosis/services/detailed-diagnosis-intent.test.ts \
  src/modules/detailed-diagnosis/components/resume-detailed-diagnosis-link.test.tsx \
  'src/app/(private)/billing/return/page.test.tsx'
pnpm typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit the Checkout intent slice**

```bash
git add src/modules/detailed-diagnosis/services/detailed-diagnosis-intent.ts \
  src/modules/detailed-diagnosis/services/detailed-diagnosis-intent.test.ts \
  src/modules/detailed-diagnosis/components/resume-detailed-diagnosis-link.tsx \
  src/modules/detailed-diagnosis/components/resume-detailed-diagnosis-link.test.tsx \
  src/app/'(private)'/billing/return/page.tsx \
  src/app/'(private)'/billing/return/page.test.tsx
git commit -m "feat: preserve detailed diagnosis checkout intent"
```

---

### Task 5: Gate detailed mode with an accessible upgrade dialog

**Files:**

- Create: `src/modules/detailed-diagnosis/components/detailed-diagnosis-upgrade-dialog.tsx`
- Create: `src/modules/detailed-diagnosis/components/detailed-diagnosis-upgrade-dialog.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/analysis-mode-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/analysis-mode-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-review-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`
- Modify: `src/modules/detailed-diagnosis/types.ts`
- Modify: `src/modules/reports/services/create-detailed-report.service.ts`
- Modify: `src/modules/reports/services/create-detailed-report.service.test.ts`
- Modify: `src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts`
- Modify: `src/app/(private)/quick-diagnosis/page.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/modules/billing/components/diagnosis-limit-card.tsx`
- Modify: `src/modules/billing/components/access-cards.test.tsx`

**Interfaces:**

- Consumes: `canCreateDetailedDiagnosis`, authenticated `userId`, an optional server-validated resume category, and Task 4 intent utilities.
- Produces: `DetailedDiagnosisUpgradeDialog`; detailed result `plan_required`; wizard props `userId`, `canCreateDetailedDiagnosis`, and `initialDetailedCategory`.

- [ ] **Step 1: Load the UI craft floor before interface edits**

Read completely:

```bash
sed -n '1,420p' .agents/skills/impeccable/reference/craft-floor.md
```

Apply it only to this narrow extension; do not redesign the wizard or pricing page.

- [ ] **Step 2: Write failing tests for the exact paid-access error**

Change the detailed service test to require:

```ts
rpc.mockResolvedValue({
  data: null,
  error: { code: "P0001", message: "paid_access_required" },
});

await expect(
  create(productCommand).then(({ result }) => result),
).resolves.toEqual({ status: "error", error: "plan_required" });
```

Assert `XX001/paid_access_required` and `P0001/free_report_limit_reached` both become `create_failed`. Update action tests so `plan_required` passes through.

- [ ] **Step 3: Run the focused service tests and verify failure**

```bash
pnpm test -- \
  src/modules/reports/services/create-detailed-report.service.test.ts \
  src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts
```

Expected: the service still exposes `limit_reached` and lacks `plan_required`.

- [ ] **Step 4: Implement the semantic result**

Use these unions:

```ts
type CreateDetailedReportResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" | "plan_required" };

type CreateDetailedDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: DetailedDiagnosisFieldErrors;
    }
  | {
      status: "error";
      error: "unauthorized" | "plan_required" | "create_failed";
    };
```

Map only `P0001/paid_access_required`. Remove `limit_reached` from detailed-only state and review copy; quick result types remain unchanged.

- [ ] **Step 5: Write failing dialog and orchestration tests**

Cover all of these behaviors:

1. The dialog shows `Diagnóstico detalhado faz parte dos planos`, explains multi-item access, and offers `Continuar no diagnóstico rápido` plus `Conhecer os planos`.
2. The plans action calls `saveDetailedDiagnosisIntent` with the current user and pending category before navigating to `/billing`.
3. A free user who selects detailed remains in the mode step and sees the dialog; no detailed state is created.
4. A paid/courtesy-capable user starts detailed mode without the dialog.
5. `initialDetailedCategory="product"` starts detailed mode only when the server-provided capability is true.
6. A final submission returning `plan_required` opens the same dialog and keeps detailed values.
7. `Continuar no diagnóstico rápido` closes the dialog and selects quick mode for the current category.

Mock the dialog in orchestration tests that do not inspect its own rendering.

- [ ] **Step 6: Add explicit plan copy to both mode cards**

Use these detailed descriptions:

```ts
// Product
"Recurso dos planos para analisar produtos de revenda ou digitais, seus custos e o resultado geral.";

// Production
"Recurso dos planos para analisar uma ou mais produções, com ficha técnica e resultado geral.";
```

Assert `Recurso dos planos` is visible text in both step test files. Do not disable the radio option; selecting and continuing is what opens the explanatory dialog.

- [ ] **Step 7: Implement the controlled upgrade dialog**

Create this interface:

```ts
type DetailedDiagnosisUpgradeDialogProps = {
  open: boolean;
  userId: string;
  category: DetailedDiagnosisCategory | null;
  onOpenChange(open: boolean): void;
  onContinueQuick(): void;
};
```

Use the existing `Dialog` primitives. The primary `Link` targets `/billing` and calls:

```ts
saveDetailedDiagnosisIntent(window.sessionStorage, {
  userId,
  category,
});
```

only when category is non-null. Storage failure must not prevent navigation. The secondary button calls `onContinueQuick`; dismissal relies on the dialog primitive's focus restoration.

- [ ] **Step 8: Add a non-error reducer transition for stale access**

Add the action:

```ts
| { type: "submissionSettled" }
```

and reducer branch:

```ts
case "submissionSettled":
  return { ...state, status: "editing", submitError: null };
```

Keep `DetailedSubmitError` as `unauthorized | create_failed`. Add `onPlanRequired()` to `DetailedDiagnosisWizard`; when persistence returns `plan_required`, dispatch `submissionSettled`, call the callback, and never reset `state.values`.

Remove the detailed-review message `Seu diagnóstico gratuito já foi usado`; the upgrade dialog owns this state.

- [ ] **Step 9: Integrate preflight gating into the root wizard**

Extend props:

```ts
type QuickDiagnosisWizardProps = {
  userId: string;
  canCreateDetailedDiagnosis: boolean;
  initialDetailedCategory?: DetailedDiagnosisCategory;
  createServiceDiagnosis: CreateServiceDiagnosisAction;
  createProductDiagnosis: CreateProductDiagnosisAction;
  createProductionDiagnosis: CreateProductionDiagnosisAction;
  createDetailedDiagnosis: CreateDetailedDiagnosisAction;
  createSubmissionId?: () => string;
};
```

Track `upgradeCategory`. Use separate preflight and stale-access functions:

```ts
function requestDetailed(category: DetailedDiagnosisCategory) {
  if (canCreateDetailedDiagnosis) {
    startDetailed(category);
    return;
  }
  setUpgradeCategory(category);
}

function requireUpgrade(category: DetailedDiagnosisCategory) {
  setUpgradeCategory(category);
}
```

Product/Production call `requestDetailed`; the active detailed wizard calls `requireUpgrade`. Generalize `returnToMode` to accept `quick | detailed`: dialog fallback creates a fresh quick branch, while the normal Back action returns to detailed selected.

Initialize a detailed branch from `initialDetailedCategory` only when the prop exists. Render one controlled dialog at the root so Product, Production, resume, and stale server access share it.

- [ ] **Step 10: Validate resume parameters on the server page**

Add page props:

```ts
type QuickDiagnosisPageProps = {
  searchParams: Promise<{
    resume?: string | string[];
    category?: string | string[];
  }>;
};
```

Set `initialDetailedCategory` only when `canCreateDetailedDiagnosis` is true, `resume` equals `detailed`, and category is exactly `product` or `production`. Ignore all other values. Continue using `canCreateQuickDiagnosis` for the wizard/limit decision and pass `userId` plus detailed capability to the wizard.

- [ ] **Step 11: Clarify the exhausted-free state**

Use this exact body:

```text
Seu diagnóstico rápido gratuito já foi usado. Para criar novos diagnósticos rápidos ou usar o diagnóstico detalhado, escolha um plano.
```

Update `access-cards.test.tsx` accordingly.

- [ ] **Step 12: Run the focused UI and service suite**

```bash
pnpm test -- \
  src/modules/reports/services/create-detailed-report.service.test.ts \
  src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts \
  src/modules/detailed-diagnosis/components/detailed-diagnosis-upgrade-dialog.test.tsx \
  src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx \
  src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts \
  src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx \
  src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx \
  src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx \
  src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx \
  'src/app/(private)/quick-diagnosis/page.test.tsx' \
  src/modules/billing/components/access-cards.test.tsx
pnpm typecheck
```

Expected: all tests and typecheck pass.

- [ ] **Step 13: Inspect the changed interface once**

Run the detector after implementation:

```bash
.agents/skills/impeccable/scripts/impeccable detect --json \
  --target src/modules/detailed-diagnosis/components/detailed-diagnosis-upgrade-dialog.tsx
```

Fix mechanical findings without redesigning. Verify the dialog in the local app at 1440px and 390px, including keyboard focus, Escape dismissal, focus return, and reduced-motion behavior.

- [ ] **Step 14: Commit the paid-mode gate**

```bash
git add src/modules/quick-diagnosis src/modules/detailed-diagnosis \
  src/modules/reports/services/create-detailed-report.service.ts \
  src/modules/reports/services/create-detailed-report.service.test.ts \
  src/app/'(private)'/quick-diagnosis \
  src/modules/billing/components/diagnosis-limit-card.tsx \
  src/modules/billing/components/access-cards.test.tsx
git commit -m "feat: gate detailed diagnosis behind plan access"
```

---

### Task 6: Align documentation and run the full quality gate

**Files:**

- Modify: `PRODUCT.md`
- Modify: `docs/DETAILED-DIAGNOSIS.md`
- Modify: `docs/QUICK-DIAGNOSIS.md`
- Modify: `docs/superpowers/specs/2026-09-09-asaas-billing-and-access-design.md`
- Modify: `docs/superpowers/specs/2026-10-08-paid-detailed-diagnosis-access-design.md`

**Interfaces:**

- Consumes: implemented behavior and test evidence from Tasks 1–5.
- Produces: current product truth, an explicit supersession note, and a verified release candidate.

- [ ] **Step 1: Update durable product truth**

In `PRODUCT.md`, add this rule to the operating context/capabilities sections:

```text
O plano gratuito permite um diagnóstico rápido. Diagnósticos detalhados exigem acesso pago ou cortesia vigente e não consomem o benefício rápido gratuito. A necessidade de plano é informada antes do formulário detalhado.
```

Preserve the statement that reports created during a paid interval remain readable after access ends.

In `docs/DETAILED-DIAGNOSIS.md`, document paid/courtesy creation, early upgrade dialog, `paid_access_required`, and legacy-free compatibility. In `docs/QUICK-DIAGNOSIS.md`, define the one-free-quick rule and state that deletion does not restore it.

- [ ] **Step 2: Mark the old billing rule as superseded**

Near the top of `2026-09-09-asaas-billing-and-access-design.md`, add a dated note linking to the new spec and state that “the first report of any mode is free” is replaced by “one quick diagnosis is free; detailed requires entitlement.” Preserve the historical body.

Change the new spec status from `Aguardando revisão` to `Implementado` only after every check below passes.

- [ ] **Step 3: Run the full application and database gate**

```bash
pnpm seed:check
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm exec supabase test db
pnpm supabase:advisors
pnpm supabase:lint
```

Expected: every command passes. For a failure, fix the implementation or test, rerun the directly affected focused suite, then rerun this full gate.

- [ ] **Step 4: Verify generated database types remain clean**

```bash
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

Expected: no generated diff because public table/function signatures did not change. If generation produces a legitimate diff, inspect it, update consumers, and commit the generated result instead of editing it manually.

- [ ] **Step 5: Review the final diff against acceptance criteria**

```bash
git diff --check
git status --short
git diff --stat
rg -n "Diagnóstico salvo|canCreateDiagnosis|freeReportUsed" \
  src PRODUCT.md docs/DETAILED-DIAGNOSIS.md docs/QUICK-DIAGNOSIS.md
```

Expected:

- `Diagnóstico salvo` is absent from production UI code;
- old ambiguous billing properties are absent;
- no applied migration was edited;
- new migration, seed, tests, UI, and documentation are the only intended changes;
- all seven acceptance criteria in the spec have implementation and test evidence.

- [ ] **Step 6: Commit documentation and final verification fixes**

```bash
git add PRODUCT.md docs/DETAILED-DIAGNOSIS.md docs/QUICK-DIAGNOSIS.md \
  docs/superpowers/specs/2026-09-09-asaas-billing-and-access-design.md \
  docs/superpowers/specs/2026-10-08-paid-detailed-diagnosis-access-design.md
git commit -m "docs: align diagnosis access rules"
```
