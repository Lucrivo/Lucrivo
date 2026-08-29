# Quick Diagnosis Executive Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immutable, full-width executive summary that answers the three quick-diagnosis business questions before the existing detailed Service report.

**Architecture:** The unchanged Service calculator feeds a new pure `buildExecutiveSummary` domain function. `buildServiceReportSnapshot` persists that resolved content in a strict version-2 snapshot, the atomic Supabase RPC accepts only versions `2/1/2`, and a thin presenter supplies one full-width summary plus a compact numbers rail to server-rendered components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Vitest and Testing Library, Tailwind CSS 4, Supabase JS/SSR 2, PostgreSQL/RLS/pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-29-quick-diagnosis-executive-summary-design.md`

## Global Constraints

- Read the approved spec and `docs/QUICK-DIAGNOSIS.md` before Task 1.
- Use TDD for every behavior change: observe a focused failure before implementing the minimum passing code.
- Keep `diagnoses.id`, `service_diagnoses.diagnosis_id`, RPC return values, report routes, and pagination cursor IDs as `bigint`/TypeScript `number`.
- Keep `calculationVersion: 1`; set `schemaVersion: 2` and `contentVersion: 2`.
- Keep Service target margin exactly `1500` basis points.
- Do not change calculations, verdict thresholds, priority selection, report units, or the five detailed section templates.
- Persist all executive-summary copy in the snapshot; React and presenter code must not classify verdicts, compare price thresholds, or choose priorities.
- Require exactly two facts in `margin`, `price` order and exactly three answers in `profitability`, `price_sufficiency`, `immediate_action` order.
- Version-1 rows remain untouched and render through the existing unavailable state; do not add a legacy adapter or data-deleting migration.
- Preserve owner filtering, RLS, explicit grants, idempotency, the empty `search_path`, and indistinguishable missing/foreign report behavior.
- Keep `/reports/[id]` server-rendered. Only the existing discount simulator remains a Client Component.
- Do not add UUID routes, sharing, AI, editing, recalculation, or persisted simulator state.
- Create the migration with the installed Supabase CLI; do not invent its timestamp.
- Each task ends in a coherent commit and reviewer checkpoint.

---

## File Structure

| Path                                                          | Responsibility                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/modules/reports/types.ts`                                | Version constants and stable executive-summary discriminants.                   |
| `src/modules/reports/schemas/report-snapshot.schema.ts`       | Strict version-2 snapshot and executive-summary runtime validation.             |
| `src/modules/reports/domain/build-executive-summary.ts`       | Exact deterministic Portuguese summary content.                                 |
| `src/modules/reports/domain/build-service-report-snapshot.ts` | Assemble and validate the complete immutable snapshot.                          |
| `src/modules/reports/presenters/to-report-view-model.ts`      | Add semantic tone labels and format the five-value numbers rail.                |
| `src/modules/reports/components/report-executive-summary.tsx` | Full-width verdict, facts, priority, and ordered answers.                       |
| `src/modules/reports/components/report-numbers.tsx`           | Compact current-value and price-reference rail.                                 |
| `src/modules/reports/components/report-detail.tsx`            | Compose header, executive summary, numbers rail, and five sections.             |
| `src/app/(private)/reports/[id]/loading.tsx`                  | Skeleton matching the new full-width-first hierarchy.                           |
| `supabase/migrations/*_require_report_snapshot_v2.sql`        | Restrict the atomic RPC to snapshot versions `2/1/2`.                           |
| `supabase/tests/diagnosis_reports.test.sql`                   | Verify version validation, exact persistence, bigint identity, grants, and RLS. |

---

### Task 1: Define the Strict Version-2 Snapshot Contract

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`

**Interfaces:**

- Consumes: existing `ReportTone`, `ReportSnapshot` structure, and five-section order.
- Produces: `REPORT_SCHEMA_VERSION = 2`, `SERVICE_CONTENT_VERSION = 2`, `reportExecutiveSummaryFactKeys`, `reportExecutiveSummaryAnswerKeys`, `ReportExecutiveSummary`, `ExecutiveSummaryFact`, and `ExecutiveSummaryAnswer`.

- [ ] **Step 1: Replace the version-1 fixture with a complete failing version-2 fixture**

In `report-snapshot.schema.test.ts`, add this object between `results` and `sections`:

```ts
executiveSummary: {
  headline: "A verdade por trás do preço.",
  introduction:
    "O Lucrivo revela o que está escondido nos seus números e mostra exatamente o que fazer a respeito.",
  verdict: {
    label: "Acima da meta",
    body: "O preço cobre os custos e supera a meta financeira de 15%. Há folga na margem; confirme se o mercado aceita esse preço e acompanhe o volume.",
    tone: "positive",
  },
  facts: [
    {
      key: "margin",
      currentLabel: "Margem atual",
      currentValue: "29,5%",
      referenceLabel: "Meta",
      referenceValue: "15%",
    },
    {
      key: "price",
      currentLabel: "Preço atual",
      currentValue: "R$ 80,00",
      referenceLabel: "Preço-alvo",
      referenceValue: "R$ 64,94",
    },
  ],
  priority: {
    label: "Volume",
    body: "Seu preço sustenta a operação e a meta. Agora transforme o volume necessário em rotina comercial.",
  },
  answers: [
    {
      key: "profitability",
      question: "Estou ganhando dinheiro?",
      answer:
        "Sim — cada atendimento deixa R$ 23,60 após os custos considerados.",
    },
    {
      key: "price_sufficiency",
      question: "Estou cobrando o preço certo?",
      answer:
        "Sim — alcança a referência financeira para a meta de 15%.",
    },
    {
      key: "immediate_action",
      question: "O que preciso fazer agora?",
      answer: "Trabalhe para alcançar a meta de vendas calculada.",
    },
  ],
},
```

Set `schemaVersion: 2` and `contentVersion: 2`. Rename the success test to `parses a complete version 2 Service snapshot`. Add focused rejection cases:

```ts
it("rejects a version 1 snapshot", () => {
  expect(() =>
    parseReportSnapshot({
      ...validSnapshot,
      schemaVersion: 1,
      contentVersion: 1,
    }),
  ).toThrow();
});

it.each([
  [
    "facts",
    [
      validSnapshot.executiveSummary.facts[1],
      validSnapshot.executiveSummary.facts[0],
    ],
  ],
  [
    "answers",
    [
      validSnapshot.executiveSummary.answers[1],
      validSnapshot.executiveSummary.answers[0],
      validSnapshot.executiveSummary.answers[2],
    ],
  ],
] as const)("rejects reordered executive-summary %s", (field, value) => {
  expect(() =>
    parseReportSnapshot({
      ...validSnapshot,
      executiveSummary: {
        ...validSnapshot.executiveSummary,
        [field]: value,
      },
    }),
  ).toThrow();
});

it("rejects a missing executive summary", () => {
  const { executiveSummary: _removed, ...withoutSummary } = validSnapshot;
  expect(() => parseReportSnapshot(withoutSummary)).toThrow();
});
```

- [ ] **Step 2: Run the schema test and verify red**

Run:

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts
```

Expected: FAIL because the constants still accept version 1 and `executiveSummary` is not part of the strict schema.

- [ ] **Step 3: Add version constants and stable keys**

In `types.ts`, use:

```ts
const REPORT_SCHEMA_VERSION = 2;
const SERVICE_CALCULATION_VERSION = 1;
const SERVICE_CONTENT_VERSION = 2;

const reportExecutiveSummaryFactKeys = ["margin", "price"] as const;
const reportExecutiveSummaryAnswerKeys = [
  "profitability",
  "price_sufficiency",
  "immediate_action",
] as const;
```

Export both arrays and re-export the new inferred schema types.

- [ ] **Step 4: Implement strict executive-summary schemas**

In `report-snapshot.schema.ts`, add:

```ts
const executiveSummaryFactSchema = z.strictObject({
  key: z.enum(reportExecutiveSummaryFactKeys),
  currentLabel: z.string().min(1),
  currentValue: z.string().min(1),
  referenceLabel: z.string().min(1),
  referenceValue: z.string().min(1),
});

const executiveSummaryAnswerSchema = z.strictObject({
  key: z.enum(reportExecutiveSummaryAnswerKeys),
  question: z.string().min(1),
  answer: z.string().min(1),
});

const reportExecutiveSummarySchema = z.strictObject({
  headline: z.string().min(1),
  introduction: z.string().min(1),
  verdict: z.strictObject({
    label: z.string().min(1),
    body: z.string().min(1),
    tone: z.enum(reportTones),
  }),
  facts: z
    .array(executiveSummaryFactSchema)
    .length(reportExecutiveSummaryFactKeys.length),
  priority: z.strictObject({
    label: z.string().min(1),
    body: z.string().min(1),
  }),
  answers: z
    .array(executiveSummaryAnswerSchema)
    .length(reportExecutiveSummaryAnswerKeys.length),
});
```

Add `executiveSummary: reportExecutiveSummarySchema` to the snapshot. Extend the existing `superRefine` with fixed-order loops:

```ts
for (const [index, expectedKey] of reportExecutiveSummaryFactKeys.entries()) {
  if (snapshot.executiveSummary.facts[index]?.key === expectedKey) continue;
  context.addIssue({
    code: "custom",
    path: ["executiveSummary", "facts", index, "key"],
    message: `O fato ${index + 1} deve usar a chave ${expectedKey}.`,
  });
}

for (const [index, expectedKey] of reportExecutiveSummaryAnswerKeys.entries()) {
  if (snapshot.executiveSummary.answers[index]?.key === expectedKey) continue;
  context.addIssue({
    code: "custom",
    path: ["executiveSummary", "answers", index, "key"],
    message: `A resposta ${index + 1} deve usar a chave ${expectedKey}.`,
  });
}
```

Infer and export:

```ts
type ExecutiveSummaryFact = z.infer<typeof executiveSummaryFactSchema>;
type ExecutiveSummaryAnswer = z.infer<typeof executiveSummaryAnswerSchema>;
type ReportExecutiveSummary = z.infer<typeof reportExecutiveSummarySchema>;
```

- [ ] **Step 5: Run focused verification and commit**

Run:

```bash
pnpm vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts
pnpm typecheck
```

Expected: PASS.

Commit:

```bash
git add src/modules/reports/types.ts src/modules/reports/schemas/report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts
git commit -m "feat: define executive report snapshot contract"
```

---

### Task 2: Build Exact Executive-Summary Content

**Files:**

- Create: `src/modules/reports/domain/build-executive-summary.ts`
- Create: `src/modules/reports/domain/build-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.test.ts`

**Interfaces:**

- Consumes: `ServiceReportCalculation`, existing `formatCurrency`, `formatBasisPoints`, `formatReportUnit`, and `ReportExecutiveSummary`.
- Produces: `buildExecutiveSummary(calculation: ServiceReportCalculation): ReportExecutiveSummary`; `buildServiceReportSnapshot` returns a fully valid v2 snapshot containing that result.

- [ ] **Step 1: Write failing golden tests for verdict, facts, and units**

Build a base calculation with `calculateServiceReport(baseCommand)`, then test representative immutable copy:

```ts
it("builds the approved above-target appointment summary", () => {
  expect(buildExecutiveSummary(baseCalculation)).toEqual({
    headline: "A verdade por trás do preço.",
    introduction:
      "O Lucrivo revela o que está escondido nos seus números e mostra exatamente o que fazer a respeito.",
    verdict: {
      label: "Acima da meta",
      body: "O preço cobre os custos e supera a meta financeira de 15%. Há folga na margem; confirme se o mercado aceita esse preço e acompanhe o volume.",
      tone: "positive",
    },
    facts: [
      {
        key: "margin",
        currentLabel: "Margem atual",
        currentValue: "29,5%",
        referenceLabel: "Meta",
        referenceValue: "15%",
      },
      {
        key: "price",
        currentLabel: "Preço atual",
        currentValue: "R$ 80,00",
        referenceLabel: "Preço-alvo",
        referenceValue: "R$ 64,94",
      },
    ],
    priority: {
      label: "Volume",
      body: "Seu preço sustenta a operação e a meta. Agora transforme o volume necessário em rotina comercial.",
    },
    answers: [
      {
        key: "profitability",
        question: "Estou ganhando dinheiro?",
        answer:
          "Sim — cada atendimento deixa R$ 23,60 após os custos considerados.",
      },
      {
        key: "price_sufficiency",
        question: "Estou cobrando o preço certo?",
        answer: "Sim — alcança a referência financeira para a meta de 15%.",
      },
      {
        key: "immediate_action",
        question: "O que preciso fazer agora?",
        answer: "Trabalhe para alcançar a meta de vendas calculada.",
      },
    ],
  });
});

it("uses hour wording and an absolute loss amount", () => {
  const calculation = {
    ...baseCalculation,
    unit: "hour" as const,
    verdict: "operational_loss" as const,
    priority: "price" as const,
    currentPriceCents: 4000,
    unitProfitCents: -1320,
    realMarginBasisPoints: -3300,
    minimumPriceCents: 6522,
    targetPriceCents: 7793,
  };

  const summary = buildExecutiveSummary(calculation);
  expect(summary.verdict.label).toBe("Prejuízo");
  expect(summary.verdict.body).toContain("cada hora");
  expect(summary.answers[0].answer).toBe(
    "Não — hoje cada hora fecha no vermelho em R$ 13,20.",
  );
  expect(summary.answers[1].answer).toBe(
    "Não — está abaixo do mínimo financeiro de R$ 65,22.",
  );
});
```

- [ ] **Step 2: Add failing boundary tables for every verdict, priority, profit, and price state**

Use calculation overrides so this test targets content selection rather than formulas:

```ts
it.each([
  ["missing_price", "Informe o preço", "neutral"],
  ["operational_loss", "Prejuízo", "critical"],
  ["tight_margin", "Margem apertada", "warning"],
  ["adequate_margin", "Margem adequada", "positive"],
  ["above_target", "Acima da meta", "positive"],
] as const)("maps %s to persisted verdict content", (verdict, label, tone) => {
  expect(
    buildExecutiveSummary({ ...baseCalculation, verdict }).verdict,
  ).toEqual(expect.objectContaining({ label, tone }));
});

it.each([
  ["cost", "Custo", "Revise os custos antes de acelerar as vendas."],
  ["price", "Preço", "Ajuste o preço antes de buscar mais volume."],
  ["margin", "Margem", "Aproxime a operação da meta financeira de 15%."],
  ["volume", "Volume", "Trabalhe para alcançar a meta de vendas calculada."],
] as const)("maps %s to one correction", (priority, label, answer) => {
  const summary = buildExecutiveSummary({ ...baseCalculation, priority });
  expect(summary.priority.label).toBe(label);
  expect(summary.answers[2].answer).toBe(answer);
});
```

Add explicit boundary tables for profitability and price sufficiency:

```ts
it.each([
  [
    { verdict: "missing_price" as const, currentPriceCents: 0 },
    "Ainda não é possível responder sem o preço atual.",
  ],
  [
    { unitProfitCents: null },
    "Ainda não é possível calcular o lucro por atendimento com os dados informados.",
  ],
  [
    { unitProfitCents: -1320 },
    "Não — hoje cada atendimento fecha no vermelho em R$ 13,20.",
  ],
  [
    { unitProfitCents: 0 },
    "Não — cada atendimento apenas cobre os custos, sem gerar lucro.",
  ],
  [
    { unitProfitCents: 2360 },
    "Sim — cada atendimento deixa R$ 23,60 após os custos considerados.",
  ],
] as const)("builds profitability answer %#", (override, answer) => {
  expect(
    buildExecutiveSummary({ ...baseCalculation, ...override }).answers[0]
      .answer,
  ).toBe(answer);
});

it.each([
  [
    { verdict: "missing_price" as const, currentPriceCents: 0 },
    "Ainda não — informe o preço atual para fazer a comparação.",
  ],
  [
    { minimumPriceCents: null, targetPriceCents: null },
    "Ainda não é possível calcular uma referência financeira segura com os dados informados.",
  ],
  [
    {
      currentPriceCents: 4000,
      minimumPriceCents: 5435,
      targetPriceCents: 6494,
    },
    "Não — está abaixo do mínimo financeiro de R$ 54,35.",
  ],
  [
    {
      currentPriceCents: 6000,
      minimumPriceCents: 5435,
      targetPriceCents: 6494,
    },
    "Parcialmente — cobre os custos, mas ainda não alcança a meta de 15%.",
  ],
  [
    {
      currentPriceCents: 6494,
      minimumPriceCents: 5435,
      targetPriceCents: 6494,
    },
    "Sim — alcança a referência financeira para a meta de 15%.",
  ],
  [
    {
      currentPriceCents: 8000,
      minimumPriceCents: 5435,
      targetPriceCents: 6494,
    },
    "Sim — alcança a referência financeira para a meta de 15%.",
  ],
] as const)("builds price answer %#", (override, answer) => {
  expect(
    buildExecutiveSummary({ ...baseCalculation, ...override }).answers[1]
      .answer,
  ).toBe(answer);
});
```

- [ ] **Step 3: Run the new domain test and verify red**

Run:

```bash
pnpm vitest run src/modules/reports/domain/build-executive-summary.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 4: Implement the pure builder**

Create `build-executive-summary.ts` with one exported function and private helpers:

```ts
function buildExecutiveSummary(
  calculation: ServiceReportCalculation,
): ReportExecutiveSummary {
  return {
    headline: "A verdade por trás do preço.",
    introduction:
      "O Lucrivo revela o que está escondido nos seus números e mostra exatamente o que fazer a respeito.",
    verdict: buildVerdict(calculation),
    facts: buildFacts(calculation),
    priority: buildPriority(calculation.priority),
    answers: [
      buildProfitabilityAnswer(calculation),
      buildPriceSufficiencyAnswer(calculation),
      buildImmediateActionAnswer(calculation.priority),
    ],
  };
}
```

Use `formatReportUnit(calculation.unit)`, `formatCurrency`, `formatBasisPoints`, and `Math.abs` only for display. Select in this order:

```ts
if (calculation.verdict === "missing_price") return missingPriceAnswer;
if (calculation.unitProfitCents === null) return unavailableProfitAnswer;
if (calculation.unitProfitCents < 0) return lossAnswer;
if (calculation.unitProfitCents === 0) return breakEvenAnswer;
return positiveProfitAnswer;
```

For price sufficiency, check missing price, null references, below minimum, below target, then target reached. Store `Indisponível` in fact values when a nullable result is absent.

- [ ] **Step 5: Integrate the summary into snapshot construction**

Import `buildExecutiveSummary` in `build-service-report-snapshot.ts` and place:

```ts
executiveSummary: buildExecutiveSummary(calculation),
```

between `results` and `sections`. Update the existing golden test to expect versions `2/1/2`, retain the exact five-section assertions, and add:

```ts
expect(snapshot.executiveSummary.answers.map(({ key }) => key)).toEqual([
  "profitability",
  "price_sufficiency",
  "immediate_action",
]);
```

- [ ] **Step 6: Run domain verification and commit**

Run:

```bash
pnpm vitest run src/modules/reports/domain/build-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/domain/calculate-service-report.test.ts
pnpm typecheck
```

Expected: PASS with unchanged calculator golden values.

Commit:

```bash
git add src/modules/reports/domain/build-executive-summary.ts src/modules/reports/domain/build-executive-summary.test.ts src/modules/reports/domain/build-service-report-snapshot.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
git commit -m "feat: build report executive summaries"
```

---

### Task 3: Require Version-2 Snapshots in Atomic Persistence

**Files:**

- Modify: `supabase/tests/diagnosis_reports.test.sql`
- Create through CLI: `supabase/migrations/*_require_report_snapshot_v2.sql`
- Modify: `src/modules/reports/services/create-service-report.service.test.ts`
- Regenerate if changed: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: complete `ReportSnapshot` versions `2/1/2` from Task 2.
- Produces: unchanged RPC signature `create_service_diagnosis_report(...) returns bigint`, accepting only internally consistent version-2 snapshots.

- [ ] **Step 1: Update the failing pgTAP fixture to version 2**

Change `pg_temp.create_hour_report` to accept version controls:

```sql
create function pg_temp.create_hour_report(
  p_submission_id uuid,
  p_hourly_rate_cents bigint default 10000,
  p_schema_version smallint default 2,
  p_content_version smallint default 2,
  p_report_snapshot jsonb default '{
    "schemaVersion": 2,
    "calculationVersion": 1,
    "contentVersion": 2,
    "category": "service",
    "scenario": "hour",
    "executiveSummary": {"headline": "A verdade por trás do preço."},
    "marker": "first"
  }'::jsonb
)
returns bigint
language sql
as $$
  select public.create_service_diagnosis_report(
    p_submission_id,
    'hour'::public.service_pricing_method,
    400000,
    200000,
    6000,
    5::smallint,
    p_hourly_rate_cents,
    0,
    0,
    0,
    600,
    200,
    p_schema_version,
    1::smallint,
    p_content_version,
    'hour',
    p_hourly_rate_cents,
    1700,
    1360,
    'adequate_margin',
    'volume',
    'hour',
    p_report_snapshot
  );
$$;
```

Add these assertions after authentication is configured:

```sql
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000010',
    10000,
    1::smallint,
    1::smallint,
    '{
      "schemaVersion": 1,
      "calculationVersion": 1,
      "contentVersion": 1,
      "category": "service",
      "scenario": "hour"
    }'::jsonb
  ) $$,
  '22023',
  'invalid report snapshot',
  'atomic function rejects obsolete version 1 snapshots'
);

select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000011',
    10000,
    2::smallint,
    2::smallint,
    '{
      "schemaVersion": 2,
      "calculationVersion": 1,
      "contentVersion": 2,
      "category": "service",
      "scenario": "hour"
    }'::jsonb
  ) $$,
  '22023',
  'invalid report snapshot',
  'atomic function rejects version 2 without an executive summary object'
);

select results_eq(
  $$
    select report_snapshot -> 'executiveSummary' ->> 'headline'
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000003'
  $$,
  array['A verdade por trás do preço.'],
  'atomic function preserves resolved executive-summary content'
);
```

Retain the existing `int8` column/FK and `returns bigint` assertions unchanged.

- [ ] **Step 2: Run the focused database test and verify red**

Run:

```bash
pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql
```

Expected: FAIL because the installed function still requires versions `1/1/1`.

- [ ] **Step 3: Create the migration with the installed CLI**

Run:

```bash
pnpm exec supabase migration new --help
pnpm exec supabase migration new require_report_snapshot_v2
```

Use the exact emitted path. Do not rename its generated timestamp.

- [ ] **Step 4: Redefine only the atomic function's version gate**

Copy the complete `public.create_service_diagnosis_report` definition from
`supabase/migrations/20260828231256_create_quick_diagnosis_reports.sql` into the
new migration, change `create function` to `create or replace function`, and
apply exactly this version diff inside its existing validation block:

```diff
-  if p_schema_version <> 1
+  if p_schema_version <> 2
     or p_calculation_version <> 1
-    or p_content_version <> 1
+    or p_content_version <> 2
+    or coalesce(
+      jsonb_typeof(p_report_snapshot -> 'executiveSummary'),
+      ''
+    ) <> 'object'
```

Keep the signature, `returns bigint`, `language plpgsql`, `security definer`,
`set search_path = ''`, `auth.uid()` check, fully qualified objects,
idempotency branch, and insert statements byte-for-byte equivalent to the
existing definition. Do not alter tables, sequences, grants, policies, or
existing rows.

- [ ] **Step 5: Update the service contract test**

In `create-service-report.service.test.ts`, change only the expected versions:

```ts
p_schema_version: 2,
p_calculation_version: 1,
p_content_version: 2,
```

Retain the assertions that the RPC returns a safe positive numeric ID and that
no caller-supplied user ID is sent.

- [ ] **Step 6: Reset and verify database, types, and service**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
pnpm vitest run src/modules/reports/services/create-service-report.service.test.ts src/modules/reports/services/get-report.service.test.ts
```

Expected: all commands exit `0`; types remain stable because the RPC signature
and bigint identity do not change; no new advisor warning appears.

- [ ] **Step 7: Commit the persistence milestone**

Use the actual migration filename emitted in Step 3:

```bash
git add supabase/migrations/*_require_report_snapshot_v2.sql supabase/tests/diagnosis_reports.test.sql src/modules/reports/services/create-service-report.service.test.ts src/infrastructure/database/supabase/database.types.ts
git commit -m "feat: require versioned executive report snapshots"
```

---

### Task 4: Present Persisted Summary Content and Five Compact Numbers

**Files:**

- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`

**Interfaces:**

- Consumes: validated `snapshot.executiveSummary`, `snapshot.results`, and existing identity/section data.
- Produces: `ReportViewModel.executiveSummary`, `ReportViewModel.numbers`, five `sections`, and `discountSimulationBase`; removes `summary`, `priceReferences`, and `nextActions`.

- [ ] **Step 1: Rewrite presenter expectations first**

Replace the old summary/next-action assertions with:

```ts
expect(viewModel.executiveSummary).toEqual({
  ...snapshot.executiveSummary,
  verdict: {
    ...snapshot.executiveSummary.verdict,
    toneLabel: "Situação positiva",
  },
});

expect(viewModel.numbers).toEqual([
  { key: "price", label: "Preço atual", value: "R$ 80,00" },
  { key: "margin", label: "Margem real", value: "17%" },
  { key: "profit", label: "Lucro por hora", value: "R$ 13,60" },
  { key: "minimum", label: "Preço mínimo", value: "R$ 65,22" },
  { key: "target", label: "Preço-alvo (15%)", value: "R$ 77,93" },
]);

expect(viewModel).not.toHaveProperty("summary");
expect(viewModel).not.toHaveProperty("nextActions");
```

Update the nullable test to expect `Indisponível` for margin, profit, minimum,
and target inside `numbers`. Delete the old test that mutates priority after
snapshot creation; persisted executive content must not be reconstructed by
the presenter.

- [ ] **Step 2: Run the presenter test and verify red**

Run:

```bash
pnpm vitest run src/modules/reports/presenters/to-report-view-model.test.ts
```

Expected: FAIL because the presenter still exposes the old duplicated summary
shape.

- [ ] **Step 3: Implement the thin view model**

Define:

```ts
type ReportNumberViewModel = {
  key: "price" | "margin" | "profit" | "minimum" | "target";
  label: string;
  value: string;
};

type ReportExecutiveSummaryViewModel = Omit<
  ReportSnapshot["executiveSummary"],
  "verdict"
> & {
  verdict: ReportSnapshot["executiveSummary"]["verdict"] & {
    toneLabel: string;
  };
};
```

Set the new fields as follows:

```ts
executiveSummary: {
  ...snapshot.executiveSummary,
  verdict: {
    ...snapshot.executiveSummary.verdict,
    toneLabel: toneLabels[snapshot.executiveSummary.verdict.tone],
  },
},
numbers: [
  { key: "price", label: "Preço atual", value: formatCurrency(snapshot.results.currentPriceCents) },
  { key: "margin", label: "Margem real", value: optionalPercentage(snapshot.results.realMarginBasisPoints) },
  { key: "profit", label: `Lucro por ${unitLabel}`, value: optionalCurrency(snapshot.results.unitProfitCents) },
  { key: "minimum", label: "Preço mínimo", value: optionalCurrency(snapshot.results.minimumPriceCents) },
  { key: "target", label: "Preço-alvo (15%)", value: optionalCurrency(snapshot.results.targetPriceCents) },
],
```

Remove `priorityContent`, the margin-section lookup, `summary`,
`priceReferences`, and `nextActions`. Keep identity, persisted sections with
tone labels, and simulator data unchanged. Export `ReportViewModel`,
`ReportNumberViewModel`, and `ReportExecutiveSummaryViewModel` for component
props and tests.

- [ ] **Step 4: Run focused verification and commit**

Run:

```bash
pnpm vitest run src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/services/get-report.service.test.ts
pnpm typecheck
```

Expected: PASS.

Commit:

```bash
git add src/modules/reports/presenters/to-report-view-model.ts src/modules/reports/presenters/to-report-view-model.test.ts
git commit -m "refactor: present executive report summaries"
```

---

### Task 5: Render the Approved Full-Width Summary Layout

**Files:**

- Create: `src/modules/reports/components/report-executive-summary.tsx`
- Create: `src/modules/reports/components/report-executive-summary.test.tsx`
- Create: `src/modules/reports/components/report-numbers.tsx`
- Create: `src/modules/reports/components/report-numbers.test.tsx`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Delete: `src/modules/reports/components/report-summary.tsx`
- Modify: `src/app/(private)/reports/[id]/loading.tsx`

**Interfaces:**

- Consumes: `ReportViewModel.executiveSummary`, `ReportViewModel.numbers`, five persisted sections, and simulator base.
- Produces: full-width `ReportExecutiveSummary`, compact `ReportNumbers`, and the approved SSR semantic order.

- [ ] **Step 1: Write failing executive-summary component tests**

Render the component with `viewModel.executiveSummary` and assert:

```tsx
const summary = screen.getByRole("region", {
  name: "A verdade por trás do preço.",
});

expect(
  within(summary).getByRole("heading", {
    level: 2,
    name: "A verdade por trás do preço.",
  }),
).toBeInTheDocument();
expect(within(summary).getByText("Margem adequada")).toBeInTheDocument();
expect(within(summary).getByText("Situação positiva")).toBeInTheDocument();
expect(
  within(summary).getByText("Principal ponto a corrigir"),
).toBeInTheDocument();
expect(within(summary).getByText("Volume")).toBeInTheDocument();

const answers = within(summary).getAllByRole("listitem");
expect(answers).toHaveLength(3);
expect(answers.map((answer) => answer.textContent)).toEqual(
  viewModel.executiveSummary.answers.map(({ question, answer }) =>
    expect.stringContaining(`${question}${answer}`),
  ),
);
```

Add an `it.each` over neutral, warning, critical, and positive summaries to
assert the visible tone label remains present independently of color.

- [ ] **Step 2: Write failing numbers-rail and composition tests**

For `ReportNumbers`, assert a complementary region named `Seus números` and
the exact five `<dt>/<dd>` pairs. In `report-detail.test.tsx`, assert:

```ts
const executiveSummary = screen.getByRole("region", {
  name: "A verdade por trás do preço.",
});
const numbers = screen.getByRole("complementary", { name: "Seus números" });
const analysis = screen.getByRole("region", { name: "Análise detalhada" });

expect(
  executiveSummary.compareDocumentPosition(numbers) &
    Node.DOCUMENT_POSITION_FOLLOWING,
).toBeTruthy();
expect(
  executiveSummary.compareDocumentPosition(analysis) &
    Node.DOCUMENT_POSITION_FOLLOWING,
).toBeTruthy();
expect(screen.queryByText("Leitura principal")).not.toBeInTheDocument();
expect(screen.queryByText("Prioridade agora")).not.toBeInTheDocument();
```

Retain the exact five-section order test and navigation assertions.

- [ ] **Step 3: Run component tests and verify red**

Run:

```bash
pnpm vitest run src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.test.tsx
```

Expected: FAIL because the new components do not exist and the old rail still
renders duplicated decisions.

- [ ] **Step 4: Implement the tone-aware executive summary**

Create a Server Component with this semantic skeleton:

```tsx
function ReportExecutiveSummary({
  summary,
}: {
  summary: ReportExecutiveSummaryViewModel;
}) {
  const presentation = tonePresentation[summary.verdict.tone];
  const VerdictIcon = presentation.icon;

  return (
    <section
      aria-labelledby="executive-summary-title"
      className={cn(
        "overflow-hidden rounded-3xl border border-l-4 shadow-sm",
        presentation.border,
        presentation.surface,
      )}
    >
      <header className="grid gap-2 px-5 pt-6 sm:px-8 sm:pt-8">
        <h2 id="executive-summary-title" className="text-2xl sm:text-3xl">
          {summary.headline}
        </h2>
        <p className="text-muted-foreground max-w-3xl leading-6">
          {summary.introduction}
        </p>
      </header>

      <div className="grid gap-4 p-5 sm:p-8">
        <div
          aria-label={`Veredito: ${summary.verdict.label}`}
          className="border-border/70 bg-background/75 grid gap-4 rounded-2xl border p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <h3 className="text-xl font-semibold">{summary.verdict.label}</h3>
              <p className="max-w-3xl leading-6">{summary.verdict.body}</p>
            </div>
            <Badge variant={presentation.badge}>
              <VerdictIcon aria-hidden="true" />
              {summary.verdict.toneLabel}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.facts.map((fact) => (
              <dl
                key={fact.key}
                className="border-border/70 rounded-xl border p-3"
              >
                <div className="flex items-end justify-between gap-3">
                  <dt className="text-muted-foreground text-xs">
                    {fact.currentLabel}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {fact.currentValue}
                  </dd>
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <dt className="text-muted-foreground text-xs">
                    {fact.referenceLabel}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {fact.referenceValue}
                  </dd>
                </div>
              </dl>
            ))}
          </div>
        </div>

        <div className="border-l-primary bg-primary/7 grid gap-2 rounded-2xl border-l-4 p-4 sm:p-5">
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Principal ponto a corrigir
          </p>
          <h3 className="text-lg font-semibold">{summary.priority.label}</h3>
          <p className="leading-6">{summary.priority.body}</p>
        </div>

        <ol className="border-border/70 bg-background/75 divide-border divide-y rounded-2xl border px-4 sm:px-5">
          {summary.answers.map((answer, index) => (
            <li
              key={answer.key}
              className="grid grid-cols-[2rem_1fr] gap-3 py-4"
            >
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary grid size-8 place-items-center rounded-lg font-semibold"
              >
                {index + 1}
              </span>
              <div className="grid gap-1">
                <h3 className="text-sm font-medium">{answer.question}</h3>
                <p className="font-semibold">{answer.answer}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

Use a module-level presentation map from `ReportTone` to existing Badge
variants, Lucide icons, border colors, and semantic surfaces. Render both fact
comparisons as `<dl>` groups. Use the persisted headline for the accessible
label and visible words; styling may wrap only the persisted word `verdade`
without changing text content.

- [ ] **Step 5: Implement the compact numbers rail**

Create:

```tsx
<aside aria-label="Seus números" className="lg:sticky lg:top-24">
  <Card className="border-border/70 shadow-xs">
    <CardHeader className="border-b pb-4">
      <CardTitle>Seus números</CardTitle>
    </CardHeader>
    <CardContent>
      <dl className="grid gap-4">
        {numbers.map((number) => (
          <div
            key={number.key}
            className="flex items-end justify-between gap-4"
          >
            <dt className="text-muted-foreground text-xs font-medium">
              {number.label}
            </dt>
            <dd className="font-semibold tabular-nums">{number.value}</dd>
          </div>
        ))}
      </dl>
    </CardContent>
  </Card>
</aside>
```

Do not render verdict, priority, actions, or the executive fact-comparison
blocks here. The intended overlap is limited to current price and margin inside
this five-number reference list.

- [ ] **Step 6: Compose the approved layout and remove the old component**

In `ReportDetail`, render `<ReportExecutiveSummary>` immediately after the
page header. In the existing two-column grid, replace `<ReportSummary>` with
`<ReportNumbers numbers={viewModel.numbers} />`. Keep the narrative heading,
five-section map, and simulator integration unchanged. Delete
`report-summary.tsx` after all imports are removed.

Update `loading.tsx` to render one full-width executive-summary skeleton after
the header, then a single compact rail skeleton beside the five detailed
section skeletons:

```tsx
<Skeleton className="h-[34rem] rounded-3xl sm:h-[28rem]" />
<div className="grid items-start gap-6 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
  <Skeleton className="h-72 rounded-xl" />
  <section aria-label="Carregando análise" className="grid gap-4">
    <Skeleton className="mb-2 h-16 w-2/3" />
    {Array.from({ length: 5 }, (_, index) => (
      <Card key={index} className="h-48">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-12 w-44" />
        </CardContent>
      </Card>
    ))}
  </section>
</div>
```

- [ ] **Step 7: Run UI verification and commit**

Run:

```bash
pnpm vitest run src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/discount-simulator.test.tsx src/app/\(private\)/reports/\[id\]/page.test.tsx
pnpm typecheck
pnpm lint
```

Expected: PASS; exactly one `h1`, one executive-summary `h2`, three ordered
answers, five report sections, and no old duplicated summary labels.

Commit:

```bash
git add src/modules/reports/components/report-executive-summary.tsx src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/report-numbers.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/report-summary.tsx 'src/app/(private)/reports/[id]/loading.tsx'
git commit -m "feat: render report executive summary"
```

---

### Task 6: Full Verification and Release Readiness

**Files:**

- Modify only when a check identifies an in-scope defect: files changed in Tasks 1–5.
- Update: `docs/superpowers/plans/2026-08-29-quick-diagnosis-executive-summary.md` checkbox state and verification notes.

**Interfaces:**

- Consumes: the complete version-2 executive-summary vertical slice.
- Produces: verified database reset, generated types, application build, authenticated smoke, responsive evidence, and release notes.

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

Expected: all exit `0`, the second type generation is clean, bigint assertions
remain green, and no introduced advisor warning remains.

- [ ] **Step 2: Run complete application verification**

Run:

```bash
pnpm check
pnpm build
```

Expected: all tests, typecheck, ESLint, Prettier, and the production build pass.
Use the CI Turnstile placeholder environment if the repository's protected
local test key is rejected by the production build, matching the existing CI
workflow rather than changing application code.

- [ ] **Step 3: Perform authenticated functional smoke checks**

Using temporary local users and the local stack, create Hour, Minute, and
Appointment diagnoses. For each report verify:

- redirect to the numeric `/reports/[id]` URL;
- immediate SSR executive-summary content;
- exact order of the three answers and five detailed sections;
- matching values after refresh;
- card appearance in `/reports`;
- back-to-library and new-diagnosis links.

Delete the temporary users after the smoke run.

- [ ] **Step 4: Perform security and compatibility smoke checks**

Verify:

- user A cannot read user B's numeric ID and no foreign snapshot text appears;
- anonymous RPC execution fails;
- direct authenticated inserts, updates, and deletes remain denied;
- an idempotent retry returns the original bigint ID;
- a seeded version-1 row follows the safe unavailable-report path;
- the RPC rejects a new version-1 snapshot.

- [ ] **Step 5: Perform responsive and accessibility checks**

In a hydrated browser, inspect `/reports/[id]` at 320px, 768px, desktop, and
200% zoom in light and dark themes. Verify no horizontal overflow, executive
summary before numbers and analysis, keyboard-visible focus, reduced motion,
one `h1`, the executive `h2`, three ordered answers, text labels for every
tone, and unchanged slider Arrow/Home/End plus polite status behavior.

- [ ] **Step 6: Record evidence and commit only in-scope results**

Add concise dated verification notes under this task. If any check required a
code fix, rerun its focused failing test plus Steps 1 and 2 before committing.
Then mark every genuinely completed checkbox and commit the plan evidence:

```bash
git add docs/superpowers/plans/2026-08-29-quick-diagnosis-executive-summary.md
git commit -m "docs: verify quick diagnosis executive summary"
```

---

## Phase Checkpoints

- **Checkpoint A — after Task 1:** the application accepts only a structurally complete version-2 snapshot.
- **Checkpoint B — after Task 2:** every Service result state produces exact immutable executive-summary copy without React or database dependencies.
- **Checkpoint C — after Task 3:** atomic persistence requires `2/1/2` while identity, security, RLS, and idempotency remain unchanged.
- **Checkpoint D — after Task 4:** presentation consumes persisted decisions and exposes only the five formatted rail values.
- **Checkpoint E — after Task 5:** the approved full-width-first SSR layout replaces duplicated verdict and priority cards.
- **Checkpoint F — after Task 6:** the version-2 executive-summary feature is release-ready.
