# Client Report Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Keep entitled reports readable after subscription expiry and let paid clients navigate, edit, replace, copy, and soft delete their reports from the report page.

**Architecture:** Postgres remains the authorization and atomicity boundary. Existing category-specific creation RPCs continue validating calculations; replacement RPCs call those validators inside the same transaction and then move the validated staged data onto the existing diagnosis ID. React editors adapt current snapshots back to existing input contracts and reuse the pure calculation and snapshot modules for local previews.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Supabase/Postgres with RLS and pgTAP, Zod 4, Vitest, Testing Library, Tailwind CSS 4, Base UI dialogs.

**Spec:** `docs/superpowers/specs/2026-09-18-report-management-and-admin-adjustments-design.md`

## Global Constraints

- Interface copy is Brazilian Portuguese; identifiers remain English.
- Reading a historical report never grants editing rights.
- Editing, replacing, and copying require current paid access; administrative courtesy is insufficient.
- Deleting an owned report does not require a paid plan and never physically deletes its rows.
- `Salvar alterações` keeps the diagnosis ID and original `created_at`; `Salvar como novo relatório` creates a new ID.
- Every money value stays integer cents and every rate stays integer basis points after parsing.
- Existing calculation and snapshot builders remain the single source of financial rules.
- Unsupported old snapshots remain readable and cannot be edited.
- Database functions use schema-qualified relations, an empty `search_path`, explicit grants, ownership checks, and optimistic concurrency.
- No new runtime dependency is introduced.

---

## File Structure

| Path                                                        | Responsibility                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Supabase CLI generated migration named `report_lifecycle`   | Add lifecycle columns, historical read authorization, soft delete, and transactional replacement RPCs.                 |
| `supabase/tests/report_lifecycle.test.sql`                  | Prove historical access, ownership, paid edit enforcement, atomic replacement, soft delete, and free-report retention. |
| `src/infrastructure/database/supabase/database.types.ts`    | Regenerated database types after the migration.                                                                        |
| `src/modules/reports/services/list-reports.service.ts`      | Bidirectional cursor navigation inputs and active-row listing.                                                         |
| `src/modules/reports/report-pagination.ts`                  | Validate, encode, and build previous/first/next report URLs.                                                           |
| `src/modules/reports/services/get-report.service.ts`        | Return lifecycle metadata with an owned report.                                                                        |
| `src/modules/reports/editor/report-editor.adapters.ts`      | Convert supported current snapshots into editable input values.                                                        |
| `src/modules/reports/editor/report-editor.types.ts`         | Shared editor discriminated unions and action results.                                                                 |
| `src/modules/reports/editor/use-report-preview.ts`          | Validate draft input and calculate a local preview without persistence.                                                |
| `src/modules/reports/actions/save-report-edit.action.ts`    | Revalidate an edit, calculate its canonical snapshot, and replace or copy it.                                          |
| `src/modules/reports/actions/delete-report.action.ts`       | Soft delete an owned report with optimistic concurrency.                                                               |
| `src/modules/reports/components/report-editor.tsx`          | Responsive edit workspace and save controls.                                                                           |
| `src/modules/reports/components/report-actions.tsx`         | Edit gating, upgrade modal, and delete confirmation.                                                                   |
| `src/modules/reports/components/report-detail.tsx`          | Host actions and the quick report editor.                                                                              |
| `src/modules/reports/components/detailed-report-detail.tsx` | Host actions and the detailed report editor.                                                                           |
| `src/app/(private)/reports/page.tsx`                        | Render first, previous, and next navigation.                                                                           |
| `src/app/(private)/reports/[id]/page.tsx`                   | Load billing state and lifecycle metadata and compose actions/editor.                                                  |
| `PRODUCT.md`                                                | Replace the blanket immutable-report statement with the approved replace/copy/delete behavior.                         |

---

### Task 1: Historical read authorization and report lifecycle metadata

**Files:**

- Create: Supabase CLI generated migration named `report_lifecycle`
- Create: `supabase/tests/report_lifecycle.test.sql`
- Modify: `supabase/tests/billing_access.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `private.account_is_eligible()`, `private.has_paid_access_for_user(uuid,timestamptz)`, `private.can_read_diagnosis(bigint)`.
- Produces: `diagnoses.updated_at`, `diagnoses.deleted_at`, `diagnoses.version`, historical read semantics, `public.soft_delete_owned_diagnosis_v1(bigint,integer)`.

- [x] **Step 1: Verify current Supabase guidance and CLI syntax**

Read `https://supabase.com/changelog.md`, the current RLS guide, and the database-functions guide. Run:

```bash
pnpm exec supabase --version
pnpm exec supabase migration new --help
pnpm exec supabase db --help
```

Record only breaking changes relevant to RLS, security-definer functions, or local migrations in the implementation notes for the commit.

- [x] **Step 2: Create the failing lifecycle SQL tests**

Create `supabase/tests/report_lifecycle.test.sql` with transactions and fixed UUID fixtures. Cover these assertions:

```sql
select plan(12);

-- A paid report remains visible when statement_timestamp() is after access_ends_at.
select results_eq(
  $$ select id from public.diagnoses where id = 81001 $$,
  array[81001::bigint],
  'owner reads a report created inside a paid interval after expiry'
);

-- A report created outside every paid interval stays invisible.
select is_empty(
  $$ select id from public.diagnoses where id = 81002 $$,
  'a later report does not inherit historical entitlement'
);

-- Soft delete works without current paid access and keeps the physical row.
select is(
  public.soft_delete_owned_diagnosis_v1(81001, 0),
  'deleted',
  'owner can soft delete after plan expiry'
);
```

Also assert wrong-owner denial, anonymous denial, version conflict, a deleted row hidden through RLS, service child rows hidden, and deletion of a free report not allowing a second free report.

- [x] **Step 3: Run SQL tests to verify failure**

Run:

```bash
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql
```

Expected: FAIL because lifecycle columns and `soft_delete_owned_diagnosis_v1` do not exist and expired paid reports are hidden.

- [x] **Step 4: Create the migration through the Supabase CLI**

Run:

```bash
pnpm exec supabase migration new report_lifecycle
```

In the generated migration, add and backfill lifecycle columns before enforcing constraints:

```sql
alter table public.diagnoses
  add column updated_at timestamptz,
  add column deleted_at timestamptz,
  add column version integer not null default 0;

update public.diagnoses set updated_at = created_at where updated_at is null;

alter table public.diagnoses
  alter column updated_at set not null,
  alter column updated_at set default statement_timestamp(),
  add constraint diagnoses_version_check check (version >= 0),
  add constraint diagnoses_deleted_after_creation_check check (
    deleted_at is null or deleted_at >= created_at
  );

drop index public.diagnoses_user_created_id_idx;
create index diagnoses_user_active_created_id_idx
on public.diagnoses (user_id, created_at desc, id desc)
where deleted_at is null;
```

Replace the read helper so it requires ownership, eligibility, and `deleted_at is null`, then grants access for a free report or a paid contract covering `diagnosis.created_at`:

```sql
and (
  diagnosis.is_free_report
  or exists (
    select 1
    from public.billing_contracts as contract
    where contract.user_id = caller_id
      and contract.access_starts_at <= diagnosis.created_at
      and contract.access_ends_at > diagnosis.created_at
  )
)
```

Do not require the contract to retain a particular current status. Historical
entitlement comes only from an access interval that contains the creation
instant; both timestamps must be non-null by that comparison.

- [x] **Step 5: Add the soft-delete RPC**

Implement `public.soft_delete_owned_diagnosis_v1(p_diagnosis_id bigint, p_expected_version integer) returns text`. Lock the row, verify `auth.uid()`, call `private.account_is_eligible()`, reject already deleted or stale versions, and update exactly once:

```sql
update public.diagnoses
set deleted_at = statement_timestamp(),
    updated_at = statement_timestamp(),
    version = version + 1
where id = p_diagnosis_id
  and user_id = caller_id
  and deleted_at is null
  and version = p_expected_version;
```

Return `deleted`, `not_found`, or `conflict`; revoke execution from `public`, `anon`, and `service_role`, then grant only to `authenticated`.

- [x] **Step 6: Verify migration security and tests**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql supabase/tests/billing_access.test.sql
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all tests pass and advisors report no new security or performance finding.

- [x] **Step 7: Regenerate types and commit**

Run `pnpm supabase:types`, then:

```bash
git add supabase/migrations supabase/tests src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: preserve and soft delete owned reports"
```

---

### Task 2: Complete report-library pagination

**Files:**

- Create: `src/modules/reports/report-pagination.ts`
- Create: `src/modules/reports/report-pagination.test.ts`
- Modify: `src/modules/reports/services/list-reports.service.ts`
- Modify: `src/modules/reports/services/list-reports.service.test.ts`
- Modify: `src/app/(private)/reports/page.tsx`
- Modify: `src/app/(private)/reports/page.test.tsx`

**Interfaces:**

- Consumes: `encodeReportsCursor`, `decodeReportsCursor`, `ReportsCursor`.
- Produces: `parseReportNavigation({cursor,back})`, `buildReportPageLinks(navigation,nextCursor)` returning `{first,previous,next}`.

- [x] **Step 1: Write failing navigation tests**

Test a three-page journey, invalid base64, more than 100 history entries, and first-page reset:

```ts
const page2 = buildReportPageLinks({ cursor: undefined, stack: [] }, cursor2);
const nav2 = parseReportNavigation(
  new URL(page2.next!, "https://app.test").searchParams,
);
const page3 = buildReportPageLinks(nav2, cursor3);
const nav3 = parseReportNavigation(
  new URL(page3.next!, "https://app.test").searchParams,
);

expect(buildReportPageLinks(nav3, null)).toMatchObject({
  first: "/reports",
  previous: expect.stringContaining("cursor="),
  next: null,
});
```

In the page test, assert links named `Primeira página`, `Anterior`, and `Próxima` appear on later pages.

- [x] **Step 2: Run the focused tests and confirm failure**

```bash
pnpm test -- src/modules/reports/report-pagination.test.ts src/app/'(private)'/reports/page.test.tsx
```

Expected: FAIL because previous and first links do not exist.

- [x] **Step 3: Implement bounded cursor history**

Use a Zod schema for `{ cursor?: string; back: string[] }`; each cursor is at most 500 characters, the stack has at most 100 entries, and encoded history is at most 8,000 characters. Invalid navigation becomes `{cursor: undefined, stack: []}`. Build links with `URLSearchParams`, never concatenate unvalidated query strings.

Update the page search params type to accept `cursor` and `back`, pass only the active cursor to `listOwnedReports`, and render the three links from `buildReportPageLinks`.

- [x] **Step 4: Make active-row filtering explicit**

Add `.is("deleted_at", null)` before cursor filters in `listOwnedReports`. Update `REPORT_SUMMARY_COLUMNS` only if generated types require lifecycle metadata; do not expose deleted rows through a service-role fallback.

- [x] **Step 5: Run report-library tests and commit**

```bash
pnpm test -- src/modules/reports/report-pagination.test.ts src/modules/reports/services/list-reports.service.test.ts src/app/'(private)'/reports/page.test.tsx src/modules/reports/components/report-library.test.tsx
git add src/modules/reports src/app/'(private)'/reports/page.tsx src/app/'(private)'/reports/page.test.tsx
git commit -m "feat: add complete report pagination"
```

---

### Task 3: Snapshot-to-editor adapters

**Files:**

- Create: `src/modules/reports/editor/report-editor.types.ts`
- Create: `src/modules/reports/editor/report-editor.adapters.ts`
- Create: `src/modules/reports/editor/report-editor.adapters.test.ts`
- Modify: `src/modules/reports/types.ts`

**Interfaces:**

- Consumes: current Service V5, Product V4, Production V4, and Detailed V1 snapshots plus existing diagnosis input types.
- Produces: `EditableReportDraft`, `toEditableReportDraft(snapshot, createId): EditableReportDraft | null`, `createDraftSubmissionId(draft)`.

- [x] **Step 1: Define the discriminated editor contract in tests**

Use the existing snapshot fixtures and assert exact input strings:

```ts
expect(toEditableReportDraft(productSnapshot, createId)).toEqual({
  kind: "product",
  values: {
    submissionId: "new-submission-id",
    productKind: "resale",
    purchaseUnitCost: "12.50",
    unitSalePrice: "30.00",
    fixedMonthlyExpenses: "800.00",
    monthlySalesVolume: "40",
    proLaboreIncluded: true,
    proLabore: "1500.00",
    taxRate: "6.00",
    cardFeeRate: "3.50",
  },
});
```

Assert legacy snapshots missing required source inputs return `null`, zero remains `"0"`, unknown volume remains `""`, and detailed item and ingredient UUIDs are retained.

- [x] **Step 2: Run adapter tests and confirm failure**

```bash
pnpm test -- src/modules/reports/editor/report-editor.adapters.test.ts
```

- [x] **Step 3: Implement lossless formatting helpers**

Create `centsToInput`, `basisPointsToInput`, `millionthsToInput`, and `tenThousandthsToInput` using integer quotient/remainder operations. Do not use floating-point division followed by rounding. Example:

```ts
function scaledIntegerToInput(value: number, scale: number): string {
  const factor = 10 ** scale;
  const whole = Math.trunc(value / factor);
  const fraction = String(Math.abs(value % factor)).padStart(scale, "0");
  return scale === 0 ? String(whole) : `${whole}.${fraction}`;
}
```

- [x] **Step 4: Implement exhaustive current-version adapters**

Switch on `snapshot.analysisMode` and `snapshot.category`. Check exact current schema versions before adapting. Generate a fresh submission ID for the draft while preserving detailed client item and ingredient IDs. Return `null` for every unrecognized combination.

- [x] **Step 5: Run tests and commit**

```bash
pnpm test -- src/modules/reports/editor/report-editor.adapters.test.ts src/modules/reports/schemas/report-snapshot.schema.test.ts
git add src/modules/reports/editor src/modules/reports/types.ts
git commit -m "feat: adapt reports for safe editing"
```

---

### Task 4: Canonical live preview pipeline

**Files:**

- Create: `src/modules/reports/editor/calculate-report-preview.ts`
- Create: `src/modules/reports/editor/calculate-report-preview.test.ts`
- Create: `src/modules/reports/editor/use-report-preview.ts`
- Test: `src/modules/reports/editor/use-report-preview.test.tsx`

**Interfaces:**

- Consumes: `EditableReportDraft`, existing Zod schemas, command composers, calculators, and snapshot builders.
- Produces: `calculateReportPreview(draft): ReportPreviewResult` where the result is `{status:"valid",snapshot}` or `{status:"invalid",fieldErrors}`.

- [x] **Step 1: Write failing parity tests**

For all four draft kinds, adapt a current snapshot, calculate it again, and assert identity of inputs and results:

```ts
const draft = toEditableReportDraft(productSnapshot, () =>
  crypto.randomUUID(),
)!;
const preview = calculateReportPreview(draft);
expect(preview).toEqual({ status: "valid", snapshot: productSnapshot });
```

Add one invalid-field test per kind and a hook test proving the last valid snapshot remains available while `status` becomes `invalid`.

- [x] **Step 2: Run focused tests and confirm failure**

```bash
pnpm test -- src/modules/reports/editor/calculate-report-preview.test.ts src/modules/reports/editor/use-report-preview.test.tsx
```

- [x] **Step 3: Implement the pure preview dispatcher**

Parse drafts with the existing schemas. Compose normalized commands with existing command composers, run the existing calculators, then call the matching snapshot builder. Map Zod issues to the established quick or detailed field-error shape. Do not copy formulas into the editor module.

- [x] **Step 4: Implement the preview hook**

Use `useMemo` for the calculation and `useRef` for the last valid snapshot. Return:

```ts
type LiveReportPreview = {
  status: "valid" | "invalid";
  snapshot: ReportSnapshot;
  fieldErrors: Record<string, string[]>;
};
```

Do not debounce pure local calculation until profiling demonstrates a problem; detailed calculations are deterministic and bounded by existing input limits.

- [x] **Step 5: Run parity tests and commit**

```bash
pnpm test -- src/modules/reports/editor
git add src/modules/reports/editor
git commit -m "feat: calculate live report previews"
```

---

### Task 5: Transactional report replacement and copy actions

**Files:**

- Modify: Supabase CLI generated migration named `report_lifecycle`
- Modify: `supabase/tests/report_lifecycle.test.sql`
- Create: `src/modules/reports/actions/save-report-edit.action.ts`
- Create: `src/modules/reports/actions/save-report-edit.action.test.ts`
- Create: `src/modules/reports/services/replace-report.service.ts`
- Create: `src/modules/reports/services/replace-report.service.test.ts`
- Modify: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `EditableReportDraft`, `calculateReportPreview`, existing create-report services.
- Produces: `saveReportEdit({diagnosisId,expectedVersion,mode,draft})` and category-specific `replace_*_diagnosis_report_v1` RPCs returning the original diagnosis ID.

- [x] **Step 1: Extend SQL tests for atomic replacement**

Test service, product, production, and detailed replacements. For each, assert ID and `created_at` stay unchanged, `version` increments, summary and normalized child rows match the new snapshot, and the transient validated row does not remain. Force a child-table constraint failure and assert the original snapshot and children remain untouched.

Also assert current paid access is required and courtesy-only access receives SQLSTATE `42501` with message `paid access required`.

- [x] **Step 2: Add a private validated-row swap helper**

Implement `private.replace_owned_diagnosis_from_staged_v1(target_id, staged_id, expected_version)`. It must lock both diagnosis rows in ID order, verify both belong to `auth.uid()`, verify current paid access with `private.has_paid_access_for_user(caller_id, statement_timestamp())`, require equal category and analysis mode, and reject deleted or stale targets.

Capture the staged diagnosis row before deleting it. For quick reports, copy the
staged category row onto `target_id`. For detailed reports, copy the staged
detail, items, and ingredients onto `target_id` in foreign-key-safe order.
Delete staged children and the staged diagnosis, then update every mutable
diagnosis projection from the captured row while preserving target `id`,
`created_at`, and `is_free_report`:

```sql
update public.diagnoses as target
set submission_id = staged.submission_id,
    schema_version = staged.schema_version,
    calculation_version = staged.calculation_version,
    content_version = staged.content_version,
    current_price_cents = staged.current_price_cents,
    real_margin_basis_points = staged.real_margin_basis_points,
    unit_profit_cents = staged.unit_profit_cents,
    verdict = staged.verdict,
    priority = staged.priority,
    unit = staged.unit,
    report_snapshot = staged.report_snapshot,
    monthly_gross_revenue_cents = staged.monthly_gross_revenue_cents,
    monthly_result_cents = staged.monthly_result_cents,
    item_count = staged.item_count,
    is_partial = staged.is_partial,
    updated_at = statement_timestamp(),
    version = target.version + 1
where target.id = target_id;
```

Delete the staged diagnosis before assigning its unique submission ID to the target. The entire wrapper call runs in one transaction, so any exception rolls back creation and replacement.

- [x] **Step 3: Add four public replacement wrappers**

Create `replace_service_diagnosis_report_v1`, `replace_product_diagnosis_report_v1`, `replace_production_diagnosis_report_v1`, and `replace_detailed_diagnosis_report_v1`. Each accepts `p_diagnosis_id`, `p_expected_version`, followed by the exact arguments of the current creation RPC. Each wrapper:

```sql
staged_id := public.create_product_diagnosis_report_v2(
  p_submission_id,
  p_purchase_unit_cost_cents,
  p_unit_sale_price_cents,
  p_fixed_monthly_expenses_cents,
  p_monthly_sales_volume,
  p_pro_labore_included,
  p_pro_labore_cents,
  p_tax_rate_basis_points,
  p_card_fee_rate_basis_points,
  p_schema_version,
  p_calculation_version,
  p_content_version,
  p_scenario,
  p_current_price_cents,
  p_real_margin_basis_points,
  p_unit_profit_cents,
  p_verdict,
  p_priority,
  p_unit,
  p_report_snapshot
);
return private.replace_owned_diagnosis_from_staged_v1(
  p_diagnosis_id,
  staged_id,
  p_expected_version
);
```

Use the actual current RPC names and generated argument order discovered from `database.types.ts`; do not call superseded versions. Revoke default execution and grant only to `authenticated`.

- [x] **Step 4: Write failing action and service tests**

Cover all modes and closed failure mappings:

```ts
expect(
  await saveReportEdit({
    diagnosisId: 41,
    expectedVersion: 2,
    mode: "replace",
    draft,
  }),
).toEqual({ status: "success", diagnosisId: 41 });

expect(
  await saveReportEdit({
    diagnosisId: 41,
    expectedVersion: 2,
    mode: "copy",
    draft,
  }),
).toEqual({ status: "success", diagnosisId: 99 });
```

Assert invalid input, plan required, conflict, missing report, and unexpected failure. Verify the action ignores client-supplied calculation output and rebuilds the snapshot.

- [x] **Step 5: Implement the server action and replacement service**

The action schema is a discriminated union over `{mode:"replace"|"copy", diagnosisId, expectedVersion, draft}`. Call `requireUser`, calculate the canonical preview, and dispatch by draft kind. `copy` invokes existing create services; `replace` invokes the new wrapper matching the existing service argument mappers. Map database codes/messages to:

```ts
type SaveReportEditResult =
  | { status: "success"; diagnosisId: number }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "plan_required" | "conflict" | "not_found" | "error" };
```

- [x] **Step 6: Verify SQL and application tests, regenerate types, and commit**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
pnpm test -- src/modules/reports/actions/save-report-edit.action.test.ts src/modules/reports/services/replace-report.service.test.ts
git add supabase src/modules/reports/actions src/modules/reports/services src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: replace or copy edited reports"
```

---

### Task 6: Soft-delete application action and report metadata

**Files:**

- Create: `src/modules/reports/actions/delete-report.action.ts`
- Create: `src/modules/reports/actions/delete-report.action.test.ts`
- Modify: `src/modules/reports/services/get-report.service.ts`
- Modify: `src/modules/reports/services/get-report.service.test.ts`
- Modify: `src/app/(private)/reports/[id]/page.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`

**Interfaces:**

- Consumes: `soft_delete_owned_diagnosis_v1`, lifecycle columns, `getBillingOverview`.
- Produces: `deleteReport({diagnosisId,expectedVersion})`, detail-page props `version`, `canEdit`, `editableDraft`.

- [x] **Step 1: Write failing service and action tests**

Assert `getOwnedReport` selects `version` and `updated_at`, returns no deleted row, and no longer classifies an expired but historically entitled report as locked. Assert delete maps RPC results and calls `revalidatePath("/reports")` only on success.

- [x] **Step 2: Implement the delete action**

Validate positive safe integer ID and nonnegative version, call `requireUser`, then the RPC. Return:

```ts
type DeleteReportResult =
  { status: "deleted" } | { status: "conflict" | "not_found" | "error" };
```

Never use the admin client for deletion. In the detail page, load billing overview alongside the report and set `canEdit` only when `overview.tier === "paid"` and an adapter returns a draft.

- [x] **Step 3: Remove obsolete locked-report branching**

Keep `not_found`, `unavailable`, and read failure states. A historically entitled row now comes through the user-scoped Supabase client. If an owned row is not readable under the new rules, expose no ownership detail and use `notFound()`.

- [x] **Step 4: Run tests and commit**

```bash
pnpm test -- src/modules/reports/actions/delete-report.action.test.ts src/modules/reports/services/get-report.service.test.ts src/app/'(private)'/reports/'[id]'/page.test.tsx
git add src/modules/reports/actions/delete-report.action* src/modules/reports/services/get-report.service* src/app/'(private)'/reports/'[id]'
git commit -m "feat: expose report lifecycle actions"
```

---

### Task 7: Report actions, upgrade modal, and deletion confirmation

**Files:**

- Create: `src/modules/reports/components/report-actions.tsx`
- Create: `src/modules/reports/components/report-actions.test.tsx`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`

**Interfaces:**

- Consumes: `deleteReport`, `canEdit`, `editableDraft`, report ID/version.
- Produces: accessible edit entry, upgrade dialog, delete confirmation, and `onEdit` callback.

- [x] **Step 1: Write interaction tests**

Cover paid edit, unpaid upgrade, unsupported snapshot explanation, delete cancel, delete success, delete conflict, focus return, and pending button state:

```tsx
await user.click(screen.getByRole("button", { name: "Editar diagnóstico" }));
expect(
  screen.getByRole("dialog", { name: "Plano necessário para editar" }),
).toBeVisible();
expect(screen.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
  "href",
  "/billing",
);
```

- [x] **Step 2: Implement `ReportActions`**

Use existing `Dialog`/`AlertDialog` primitives and `Button`. Keep Edit visible for compatible reports; when `canEdit` is false, open the upgrade dialog. Put Delete in a secondary actions menu or visually secondary group. After successful delete, call `router.replace("/reports?deleted=1")` and `router.refresh()`.

- [x] **Step 3: Integrate both detail variants**

Add actions to the existing header without changing report content. Pass a callback to enter editor mode for quick and detailed components. Ensure controls have 44px touch targets and wrap on narrow screens.

- [x] **Step 4: Run component tests and commit**

```bash
pnpm test -- src/modules/reports/components/report-actions.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx
git add src/modules/reports/components
git commit -m "feat: add report edit and delete actions"
```

---

### Task 8: Inline quick and detailed editors

**Files:**

- Create: `src/modules/reports/components/report-editor.tsx`
- Create: `src/modules/reports/components/report-editor.test.tsx`
- Create: `src/modules/reports/components/quick-report-editor-fields.tsx`
- Create: `src/modules/reports/components/detailed-report-editor-fields.tsx`
- Create: `src/modules/reports/components/report-preview.tsx`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.tsx`

**Interfaces:**

- Consumes: `EditableReportDraft`, `useReportPreview`, `saveReportEdit`, report ID/version.
- Produces: responsive on-page editor with cancel, replace, and copy actions.

- [x] **Step 1: Write failing editor behavior tests**

For each of service, product, production, and detailed drafts, test at least one field change and preview result. Test invalid field feedback, last-valid preview, cancel, submission lock, replace navigation, copy navigation, plan loss, and conflict:

```tsx
await user.clear(screen.getByLabelText("Preço de venda"));
await user.type(screen.getByLabelText("Preço de venda"), "45,00");
expect(screen.getByText("R$ 45,00")).toBeVisible();

await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
expect(saveReportEdit).toHaveBeenCalledWith(
  expect.objectContaining({
    mode: "replace",
    diagnosisId: 41,
    expectedVersion: 2,
  }),
);
```

- [x] **Step 2: Implement focused field groups**

Build quick fields from existing labels and input semantics. Build detailed fields with stable keys from client item/ingredient IDs and explicit add/remove buttons. Reuse schema error paths such as `items.0.unitSalePrice`; associate each error with its field using `aria-describedby`.

- [x] **Step 3: Implement the responsive workspace**

`ReportEditor` owns draft state and calls `useReportPreview`. Use a two-column layout at `lg`, with a sticky preview column that stops being sticky on smaller screens. Render the last valid preview plus `Revise os campos destacados para atualizar esta simulação` when invalid.

The footer actions are exactly:

```tsx
<Button variant="ghost" onClick={onCancel}>Cancelar</Button>
<Button variant="outline" onClick={() => submit("copy")}>Salvar como novo relatório</Button>
<Button onClick={() => submit("replace")}>Salvar alterações</Button>
```

On replace success, exit edit mode and call `router.refresh()`. On copy success, call `router.push(`/reports/${result.diagnosisId}`)`. Keep the draft for plan-required, conflict, invalid, and error results.

- [x] **Step 4: Run editor and report suites**

```bash
pnpm test -- src/modules/reports/components/report-editor.test.tsx src/modules/reports/components/report-actions.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/app/'(private)'/reports/'[id]'/page.test.tsx
```

- [x] **Step 5: Run Impeccable mechanical detection once and fix findings**

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json \
  src/modules/reports/components/report-actions.tsx \
  src/modules/reports/components/report-editor.tsx \
  src/modules/reports/components/quick-report-editor-fields.tsx \
  src/modules/reports/components/detailed-report-editor-fields.tsx \
  src/modules/reports/components/report-preview.tsx
```

Fix all applicable accessibility, responsive, token, and interaction findings in one pass, then rerun the focused editor tests.

- [x] **Step 6: Commit the editor**

```bash
git add src/modules/reports/components
git commit -m "feat: edit reports with live previews"
```

---

### Task 9: Product documentation and integrated verification

**Files:**

- Modify: `PRODUCT.md`
- Modify: `docs/QUICK-DIAGNOSIS.md`
- Modify: `docs/DETAILED-DIAGNOSIS.md`

**Interfaces:**

- Consumes: completed report lifecycle behavior.
- Produces: documentation consistent with replace, copy, historical read, and soft delete.

- [x] **Step 1: Update product truth**

Replace statements that all saved reports are immutable. State that calculations remain deterministic and versioned; clients with paid access may replace the current report or save a copy; original creation time and ID survive replacement; deletion is recoverable at the data layer.

- [x] **Step 2: Run all report, diagnosis, and billing tests**

```bash
pnpm test -- src/modules/reports src/modules/quick-diagnosis src/modules/detailed-diagnosis src/modules/billing src/app/'(private)'/reports src/app/'(private)'/quick-diagnosis
pnpm exec supabase test db
```

Expected: all suites pass.

- [x] **Step 3: Run repository quality gates**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Expected: all commands exit zero. Fix only failures caused by this work; document unrelated pre-existing failures with command output.

- [x] **Step 4: Commit documentation and final fixes**

```bash
git add PRODUCT.md docs/QUICK-DIAGNOSIS.md docs/DETAILED-DIAGNOSIS.md src supabase
git commit -m "docs: document editable report lifecycle"
```
