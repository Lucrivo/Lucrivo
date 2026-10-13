# Product and Production Report Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit Digital Product flow and ship versioned Product and Production reports that calculate the month from zero sales when volume is omitted, treat zero cost as valid, and explain loss, tight margin, or profit in scenario-specific plain language.

**Architecture:** Keep Product and Production as separate vertical report pipelines, sharing only integer arithmetic, formatting, and existing report UI primitives. Introduce `2/2/3` snapshot contracts beside the immutable `1/1/1` and `1/1/2` contracts, persist Product kind through an additive column and versioned RPCs, and select all new copy and popovers through full-version-aware presenters.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Zod 4, Tailwind CSS 4, Base UI Radio Group/Popover, Vitest/Testing Library, Supabase CLI 2.114.0, Postgres, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-11-product-production-report-refactor-design.md`

## Global Constraints

- New Product and Production reports use schema/calculation/content tuple `2/2/3`; existing `1/1/1` and `1/1/2` reports remain readable and visually unchanged.
- Never recalculate, rewrite, migrate, backfill, or complete an existing report snapshot.
- Preserve the original monthly volume as `null` when omitted and calculate the monthly result with `monthlySalesVolumeUsed = 0`.
- Never divide monthly expenses by zero. Allocation-dependent unit results remain `null` when no sales were supplied.
- Keep 20% only as the internal attention boundary between `Margem apertada` and `Lucro`; never present it as a universal target, ideal margin, or recommended price.
- New reports do not calculate or display a target price. Legacy reports retain target-price fields and presentation.
- Treat Product direct cost and minimum price `0` as valid values, not missing data.
- Product kind is exactly `resale | digital`; Production remains `manufacturing`.
- Revenda copy may mention purchase/supplier, Digital copy may mention per-sale platform/license costs, and Production copy must mention manufacturing and sold units. Do not centralize these strings into a generic category dictionary.
- Main `2/2/3` content must not contain `ponto de equilíbrio`, `pró-labore`, `alíquota`, `rateio`, `receita líquida`, `margem de contribuição`, `preço-alvo`, `custo operacional`, `meta de 20%`, or `margem ideal`.
- Use the existing `PlainLanguageHelp` click/touch/keyboard popover only for minimum-price composition, the R$ 20 attention band, zero-sales monthly expenses, and Digital Product per-sale cost.
- Preserve the existing report layout, keyboard behavior, reduced-motion support, light/dark themes, mobile layout, and 200% zoom usability.
- Preserve authentication, ownership, RLS, idempotency, the one-free-report rule, and paid-access checks in every new database function.
- Follow the imperative migration workflow. Create the migration with Supabase CLI 2.114.0; do not invent a timestamped filename.
- New public functions use `security invoker`; privileged implementations remain in `private`, use `security definer set search_path = ''`, schema-qualify every relation/function, and expose execution only through the authenticated wrapper.
- Preserve unrelated worktree changes. Use TDD for every task and commit each green task independently.

---

### Task 1: Product kind through validation, wizard, and review

**Files:**

- Modify: `src/modules/quick-diagnosis/types.ts`
- Modify: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts`
- Modify: `src/modules/quick-diagnosis/components/product/product-wizard-state.ts`
- Modify: `src/modules/quick-diagnosis/components/product/product-wizard-state.test.ts`
- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-review-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/types.ts`
- Modify: Product command fixtures found by `rg -l "ProductDiagnosis(Command|Input)" src --glob '*.{test.ts,test.tsx}'`

**Interfaces:**

```ts
const productKinds = ["resale", "digital"] as const;
type ProductKind = (typeof productKinds)[number];

type ProductDiagnosisInput = {
  submissionId: string;
  productKind: string;
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
  productKind: ProductKind;
  purchaseUnitCostCents: number;
  unitSalePriceCents: number;
  fixedMonthlyExpensesCents: number;
  monthlySalesVolume: number | null;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};
```

The Product values step owns `productKind`, `purchaseUnitCost`, and
`unitSalePrice`. It renders a semantic radio group with the exact visible
options `Produto para revenda` and `Produto digital` before the money fields.
Selecting either option changes labels but does not change
`purchaseUnitCost`.

- [ ] **Step 1: Write failing schema tests for the Product kind contract**

Add `productKind: "resale"` to the valid fixture. Assert `resale` and `digital`
parse, an empty string produces `Escolha se você vende um produto para revenda
ou um produto digital.`, an unknown value fails, and blank cost still becomes
zero for both kinds:

```ts
it.each(["resale", "digital"] as const)(
  "accepts %s with no direct cost",
  (productKind) => {
    const parsed = productDiagnosisSchema.parse({
      ...validInput,
      productKind,
      purchaseUnitCost: "",
    });

    expect(parsed.productKind).toBe(productKind);
    expect(parsed.purchaseUnitCostCents).toBe(0);
  },
);
```

- [ ] **Step 2: Write failing reducer and component tests**

Assert the initial value is empty, `setField` stores each kind, and changing
kind preserves `purchaseUnitCost`. In `product-steps.test.tsx`, assert the radio
group is keyboard operable and the cost label changes exactly:

```ts
expect(screen.getByLabelText("Produto para revenda")).toBeChecked();
expect(
  screen.getByLabelText("Quanto você paga ao fornecedor por unidade?"),
).toHaveValue("50,00");

await user.click(screen.getByLabelText("Produto digital"));
expect(screen.getByLabelText("Existe algum gasto a cada venda?")).toHaveValue(
  "50,00",
);
```

Open the Digital help and assert its description is `Um produto digital pode
não ter custo direto. Se houver licença, plataforma, entrega ou outra cobrança
que acontece a cada venda, informe esse valor.`

In the review tests, assert `Produto digital` and `Sem custo por venda` appear
for blank/zero Digital cost, while Revenda retains supplier vocabulary.

- [ ] **Step 3: Run the focused tests and verify failure**

```bash
pnpm test src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/product/product-wizard-state.test.ts src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx
```

Expected: FAIL because `productKind` and its controls do not exist.

- [ ] **Step 4: Implement Product kind without erasing cost**

Export `productKinds` and `ProductKind`, validate the required selection before
the cost fields, add `productKind: ""` to initial state, and put `productKind`
first in `productStepFields.productValues`, `fieldOrder`, and `fieldStep`.

Use the existing `RadioGroup` component with persistent labels. Keep
`purchaseUnitCost` in state during selection changes. Make the review formatter
normalize blank money to zero before calling `Intl.NumberFormat`, so a blank
cost displays `R$ 0,00`, never `R$ NaN`.

- [ ] **Step 5: Update Product fixtures and rerun focused tests**

Add `productKind: "resale"` to existing Product fixtures unless the test is the
new Digital scenario. Run the Step 3 command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/product
git add 'src/app/(private)/reports/[id]/page.test.tsx' src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts src/modules/reports/components/report-detail.test.tsx src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/get-report.service.test.ts
git commit -m "feat: add digital product diagnosis option"
```

---

### Task 2: Monthly-result calculation version 2 for Product and Production

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/domain/calculate-product-report.ts`
- Modify: `src/modules/reports/domain/calculate-product-report.test.ts`
- Modify: `src/modules/reports/domain/calculate-production-report.ts`
- Modify: `src/modules/reports/domain/calculate-production-report.test.ts`

**Interfaces:**

Both category result types retain their scenario-specific direct-cost field and
share this result shape conceptually without introducing a generic calculator:

```ts
type MonthlyUnitResults = {
  effectiveFixedCostCents: number;
  fixedAllocationCents: number | null;
  totalUnitCostCents: number | null;
  currentPriceCents: number;
  feeAmountCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
  unitProfitCents: number | null;
  monthlySalesVolumeUsed: number;
  monthlyGrossRevenueCents: number;
  monthlyNetRevenueCents: number;
  monthlyResultCents: number;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
  priceReferencesPartial: boolean;
  monthlySalesGoal: number | null;
  weeklySalesGoal: number | null;
  dailySalesGoal: number | null;
  breakEvenDiscountPercent: number | null;
  totalFeeBasisPoints: number;
};
```

Do not literally add `MonthlyUnitResults` if it forces Product and Production
into a shared content model. Add the fields to `ProductReportCalculation` and
`ProductionReportCalculation`, and remove `targetPriceCents` from the current
calculation types.

The calculator formulas are exact:

```ts
const monthlySalesVolumeUsed = command.monthlySalesVolume ?? 0;
const feeAmountCents = multiplyDivideRound(
  command.unitSalePriceCents,
  totalFeeBasisPoints,
  10_000,
);
const netRevenueCents = command.unitSalePriceCents - feeAmountCents;
const unitContributionCents = netRevenueCents - directUnitCostCents;
const monthlyGrossRevenueCents =
  command.unitSalePriceCents * monthlySalesVolumeUsed;
const monthlyNetRevenueCents = netRevenueCents * monthlySalesVolumeUsed;
const monthlyResultCents =
  unitContributionCents * monthlySalesVolumeUsed - effectiveFixedCostCents;
const realMarginBasisPoints =
  monthlyGrossRevenueCents === 0
    ? null
    : roundDivide(
        BigInt(monthlyResultCents) * 10_000n,
        BigInt(monthlyGrossRevenueCents),
      );
```

Guard every multiplication with `BigInt` and convert with `roundDivide` so the
returned number must remain a safe integer.

Classification order is `direct_loss`, zero-sales `operational_loss` or
`no_sales`, monthly `operational_loss`, `break_even`, `tight_margin` below
2,000 basis points, then `adequate_margin`. Calculation version 2 never emits
`incomplete_volume` or `above_target`.

- [ ] **Step 1: Replace Product calculation expectations with failing V2 cases**

For the existing R$ 100 price, R$ 50 direct cost, R$ 3,000 monthly cost, 100
sales, and 8% fees, assert:

```ts
expect(calculateProductReport(completeCommand)).toMatchObject({
  feeAmountCents: 800,
  netRevenueCents: 9200,
  unitContributionCents: 4200,
  monthlySalesVolumeUsed: 100,
  monthlyGrossRevenueCents: 1_000_000,
  monthlyNetRevenueCents: 920_000,
  monthlyResultCents: 120_000,
  realMarginBasisPoints: 1200,
  minimumPriceCents: 8696,
  verdict: "tight_margin",
  priority: "margin",
});
```

For omitted volume, assert `monthlySalesVolumeUsed: 0`, all monthly revenue is
zero, `monthlyResultCents: -300000`, allocation/unit profit/margin remain null,
minimum price is `5435`, and verdict/priority are
`operational_loss`/`volume`.

Add cases for zero direct cost plus zero fixed costs (`minimumPriceCents: 0`,
`breakEvenDiscountPercent: 100`, `no_sales`), exact zero monthly result
(`break_even`), 1,999/2,000 basis-point attention boundaries, non-positive
contribution, and total fees at 100%.

- [ ] **Step 2: Add equivalent failing Production cases**

Use the same canonical amounts with `productionUnitCostCents: 5000`. Assert
identical financial values but Production-specific types and priority. Keep the
existing composition inputs untouched.

- [ ] **Step 3: Run calculation tests and verify failure**

```bash
pnpm test src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.test.ts
```

Expected: FAIL on missing monthly fields and old incomplete/target behavior.

- [ ] **Step 4: Implement safe monthly arithmetic and V2 classification**

Remove target-price calculation and the old tolerance/above-target branches.
Use `monthlySalesVolumeUsed > 0` as the only condition for fixed allocation and
per-unit profit. Keep `priceReferencesPartial` equal to
`command.monthlySalesVolume === null`.

Calculate monthly/weekly/daily required sales only when contribution is
positive. Preserve goal `0` when effective monthly costs are zero. Allow a
mathematical discount limit of 100% when minimum price is zero; the UI task will
explain the simulator's 50% display ceiling.

- [ ] **Step 5: Run calculation tests**

Run the Step 3 command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reports/types.ts src/modules/reports/domain/calculate-product-report.ts src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.ts src/modules/reports/domain/calculate-production-report.test.ts
git commit -m "refactor: calculate monthly product results"
```

---

### Task 3: Product `2/2/3` snapshot and scenario-specific content

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/schemas/product-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.test.ts`

**Interfaces:**

Keep V1/V2 schemas frozen with literal tuple `1/1/1` and `1/1/2`. Add
`ProductReportSnapshotV3` with literal tuple `2/2/3`, scenario
`resale | digital`, and:

```ts
policy: {
  attentionBandBasisPoints: 2000;
  weeklyDivisorHundredths: 433;
  operatingDaysPerWeek: 6;
  maximumDiscountPercent: 50;
  proLaboreIncluded: boolean;
}
inputs: {
  productKind: "resale" | "digital";
  purchaseUnitCostCents: number;
  unitSalePriceCents: number;
  fixedMonthlyExpensesCents: number;
  monthlySalesVolume: number | null;
  proLaboreIncluded: boolean;
  proLaboreCents: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
}
discountSimulationBase: {
  originalPriceCents: number;
  unitCostCents: number;
  totalFeeBasisPoints: number;
  attentionBandBasisPoints: 2000;
  minimumPriceCents: number | null;
  partial: boolean;
}
```

V3 results mirror Task 2 and include `purchaseUnitCostCents`; they do not
contain `targetPriceCents`. Require `scenario === inputs.productKind`,
`monthlySalesVolumeUsed === (inputs.monthlySalesVolume ?? 0)`, null allocation
fields exactly when the used volume is zero, and exact agreement between the
discount base and result fields.

- [ ] **Step 1: Add failing compatibility and V3 schema tests**

Assert V1 and V2 fixtures still parse unchanged. Add valid Resale and Digital
V3 fixtures. Reject mismatched kind/scenario, wrong tuple, target-price fields,
wrong interpreted volume, zero represented as null, and a V3 verdict of
`incomplete_volume` or `above_target`.

- [ ] **Step 2: Write failing Product content tests for every state**

Table-test `direct_loss`, zero-sales loss, `no_sales`, monthly loss,
`break_even`, `tight_margin`, and `adequate_margin`. Exact visible labels are:

```ts
const labels = {
  direct_loss: "Prejuízo por venda",
  operational_loss: "Prejuízo no mês",
  no_sales: "Sem vendas no mês",
  break_even: "No limite",
  tight_margin: "Margem apertada",
  adequate_margin: "Lucro",
} as const;
```

Assert headline `Seu produto para revenda dá lucro?` or `Seu produto digital
dá lucro?`. Assert five ordered section keys stay compatible while titles are:

```ts
[
  "Seu menor preço sem prejuízo",
  "O que sai de cada venda",
  "Quanto sobra no mês",
  "Quanto você precisa vender",
  "Como um desconto muda o resultado",
];
```

For Digital, require `custo por venda` and reject `fornecedor`, `custo de
compra`, and `fabricação`. For Revenda, require `custo de compra` and reject
Digital/fabrication vocabulary. Run this content guard over summary and
sections:

```ts
expect(
  JSON.stringify({
    executiveSummary: snapshot.executiveSummary,
    sections: snapshot.sections,
  }),
).not.toMatch(
  /ponto de equilíbrio|pró-labore|alíquota|rateio|receita líquida|margem de contribuição|preço-alvo|custo operacional|meta de 20%|margem ideal/i,
);
```

- [ ] **Step 3: Run Product snapshot/content tests and verify failure**

```bash
pnpm test src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts
```

Expected: FAIL because V3 and the new copy do not exist.

- [ ] **Step 4: Implement isolated Product V3 schemas**

Set Product current constants to `2/2/3`, but make legacy schemas use explicit
literal values rather than current constants. Export V1, V2, V3, their union,
and `CurrentProductReportSnapshot = ProductReportSnapshotV3`.

Add `digital`, `no_sales`, and `break_even` to overall report unions while
keeping legacy Product schemas restricted to legacy verdicts. Do not widen a
V1/V2 schema merely because the application-wide union now knows V3 values.

- [ ] **Step 5: Implement Product summary and sections with exact hierarchy**

Persist the Task 2 results. Facts compare monthly result/status and current
price/minimum price. Answers remain the three familiar questions but become:

- `Estou ganhando dinheiro?` — answer from `monthlyResultCents`, explicitly
  distinguishing no sales from a profitable future unit.
- `Meu preço paga tudo?` — use full minimum when volume exists; otherwise say
  it only avoids a direct loss and point to required sales.
- `O que preciso fazer agora?` — use the deterministic priority table in the
  spec.

When volume is omitted, use `Menor preço antes dos gastos mensais` and say
`Este valor evita prejuízo direto na venda. Os gastos mensais dependem da
quantidade mostrada abaixo.` Do not call `unitContributionCents` profit.

- [ ] **Step 6: Run Product snapshot/content tests**

Run the Step 3 command. Expected: PASS with legacy parsing assertions green.

- [ ] **Step 7: Commit**

```bash
git add src/modules/reports/types.ts src/modules/reports/schemas/product-report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-product-executive-summary.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.ts src/modules/reports/domain/build-product-report-snapshot.test.ts
git commit -m "feat: add versioned product report content"
```

---

### Task 4: Production `2/2/3` snapshot and manufacturing content

**Files:**

- Modify: `src/modules/reports/types.ts`
- Modify: `src/modules/reports/schemas/production-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.test.ts`

**Interfaces:**

Add `ProductionReportSnapshotV3` with literal tuple `2/2/3`, scenario
`manufacturing`, the same V3 policy/result/discount concepts as Product, and all
existing production composition inputs. V3 `productionUnitCostCents` remains
positive and must equal the four non-negative components when composition is
enabled.

V1/V2 remain literal `1/1/1` and `1/1/2`. V3 does not contain
`targetPriceCents` and cannot emit `incomplete_volume` or `above_target`.

- [ ] **Step 1: Add failing Production V3 schema tests**

Keep legacy fixture assertions. Accept summarized and composed V3 snapshots;
reject wrong component sums, wrong interpreted volume, target-price fields,
new fields missing, and disallowed V3 verdicts.

- [ ] **Step 2: Add failing Production content tests**

Use the same seven financial states from Task 3. Require headline `Sua produção
dá lucro?`, `custo de fabricação`, and `unidades vendidas`. Reject `custo de
compra`, `fornecedor`, `produto digital`, `unidades produzidas por mês`, and the
complete prohibited-term regex.

For composed cost, `O que sai de cada venda` may name `materiais`, `embalagem`,
`seu trabalho por unidade`, and `outros gastos por unidade`; it must not expose
`mão de obra direta` or explain monthly owner compensation as part of direct
labor.

- [ ] **Step 3: Run Production snapshot/content tests and verify failure**

```bash
pnpm test src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts
```

Expected: FAIL because Production V3 and the new content do not exist.

- [ ] **Step 4: Implement isolated Production V3 schema and builders**

Set Production current constants to `2/2/3`, keep explicit legacy literals,
export V1/V2/V3 plus the union, and make V3 current. Reuse only formatter and
integer helpers from Product. Write Production-specific summary/section
branches rather than passing nouns into the Product builder.

When volume is zero, keep monthly expenses as a monthly total and show
`unitContributionCents` only as what a future sold unit leaves. With volume,
show cost of fabrication, fee amount, monthly-expense allocation, and unit
result.

- [ ] **Step 5: Run Production snapshot/content tests**

Run the Step 3 command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/reports/types.ts src/modules/reports/schemas/production-report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-production-executive-summary.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-production-report-snapshot.ts src/modules/reports/domain/build-production-report-snapshot.test.ts
git commit -m "feat: add versioned production report content"
```

---

### Task 5: Version-aware presentation, popovers, list cards, and discount zero

**Files:**

- Modify: `src/modules/reports/formatters.ts`
- Modify: `src/modules/reports/formatters.test.ts`
- Modify: `src/modules/reports/presenters/report-language.ts`
- Modify: `src/modules/reports/presenters/report-language.test.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/report-numbers.tsx`
- Modify: `src/modules/reports/components/report-numbers.test.tsx`
- Modify: `src/modules/reports/components/report-executive-summary.test.tsx`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Modify: `src/modules/reports/services/list-reports.service.ts`
- Modify: `src/modules/reports/services/list-reports.service.test.ts`

**Interfaces:**

Make language selection accept the full tuple:

```ts
type ReportVersionIdentity = Pick<
  ReportSnapshot,
  "category" | "schemaVersion" | "calculationVersion" | "contentVersion"
>;

function getReportLanguageProfile(
  snapshot: ReportVersionIdentity,
): ReportLanguageProfile;
```

Add `schema_version` and `calculation_version` to
`REPORT_SUMMARY_COLUMNS`/`OwnedReportSummary` so list cards can select V3
without guessing from content version alone. `formatReportScenario("digital")`
returns `Produto digital`.

Replace boolean discount context with an explicit mode:

```ts
type DiscountSimulationContext = {
  category: "service" | "product" | "production";
  mode: "legacy_target" | "service_attention" | "unit_attention";
};
```

`simulateDiscount` accepts `minimumPriceCents === 0`. For V3 bases, read
`attentionBandBasisPoints`; for legacy/service bases, retain
`targetMarginBasisPoints`.

- [ ] **Step 1: Read the UI craft floor immediately before editing**

Read `.agents/skills/impeccable/reference/craft-floor.md` completely. Apply it
only to the report/form surfaces in this plan; do not redesign unrelated UI.

- [ ] **Step 2: Add failing presenter and language-profile tests**

Assert only Product/Production `2/2/3` receive the new profile, while all old
tuples remain unchanged. Assert Digital identity and these five current
numbers:

```ts
[
  "Preço atual",
  "Menor preço sem prejuízo",
  "Quanto sobra a cada R$ 100",
  "Resultado do mês",
  "Vendas necessárias no mês",
];
```

For omitted volume, expect `Menor preço antes dos gastos mensais`, `Sem vendas
para calcular` for the percentage, a negative/zero monthly result formatted as
currency, and the calculated required-sales count.

Attach exact help objects:

```ts
const attentionBandHelp = {
  triggerLabel: "Entenda esta faixa",
  title: "Quanto sobra a cada R$ 100",
  description:
    "Abaixo de R$ 20 a cada R$ 100 é uma faixa de atenção do Lucrivo. Ela não é uma recomendação igual para todos os negócios.",
};

const zeroSalesHelp = {
  triggerLabel: "Como tratamos este mês?",
  title: "Resultado com zero vendas",
  description:
    "Como nenhuma quantidade foi informada, calculamos o mês com zero vendas. Os gastos mensais continuam inteiros e não são divididos por unidade.",
};
```

Minimum-price help must branch between full and direct-only calculation and
name `custo de compra`, `custo por venda`, or `custo de fabricação`.

- [ ] **Step 3: Add failing discount and component tests**

Assert a base with `originalPriceCents: 10000`, `unitCostCents: 0`, zero fees,
`minimumPriceCents: 0`, and `attentionBandBasisPoints: 2000` remains available
at 0%, 10%, and 50% discounts. At 50%, it still reports `Lucro` and never says
the limit is 50%.

For V3 partial reports, require `Esta simulação ainda não inclui os gastos
mensais, porque nenhuma venda foi informada.` and prohibit `despesas fixas`,
`pró-labore`, `rateados`, and `margem de contribuição`.

Render popovers and assert click, Enter, Escape, accessible names, and returned
focus. Keep existing Service popover tests green.

- [ ] **Step 4: Run focused presentation tests and verify failure**

```bash
pnpm test src/modules/reports/formatters.test.ts src/modules/reports/presenters/report-language.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/report-library.test.tsx src/modules/reports/services/list-reports.service.test.ts
```

Expected: FAIL on missing Digital/V3 presentation and zero-minimum simulation.

- [ ] **Step 5: Implement full-version presentation and scoped help**

Add `no_sales` and `break_even` presentation icons/labels. Build separate
`toCurrentProductNumbers` and `toCurrentProductionNumbers` functions; retain
legacy functions untouched. Format 20% as currency (`R$ 20`) only in the
attention explanation, not as a target percentage in primary content.

Use `PlainLanguageHelp` through existing `help` fields. Add no hover-only title
attributes. Keep visible label and screen-reader name aligned.

In the simulator, classify V3 status labels as `Prejuízo`, `No limite`,
`Margem apertada`, or `Lucro`. Preserve the old target language only for legacy
Product/Production and pre-normalized Service reports.

- [ ] **Step 6: Run focused presentation tests**

Run the Step 4 command. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/reports/formatters.ts src/modules/reports/formatters.test.ts src/modules/reports/presenters src/modules/reports/components src/modules/reports/services/list-reports.service.ts src/modules/reports/services/list-reports.service.test.ts
git commit -m "refactor: present unit reports in plain language"
```

---

### Task 6: Additive database contracts for Product and Production V2

**Files:**

- Create via CLI: the file generated by `pnpm exec supabase migration new refactor_product_production_reports`
- Modify: `supabase/tests/product_diagnosis_reports.test.sql`
- Modify: `supabase/tests/production_diagnosis_reports.test.sql`
- Modify: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/billing_access.test.sql`

**Interfaces:**

The generated migration must:

```sql
alter table public.product_diagnoses
add column product_kind text,
add constraint product_diagnoses_product_kind_check
check (product_kind is null or product_kind in ('resale', 'digital'));
```

Replace `diagnoses_scenario_check` with the existing Service and Production
branches plus `business_category = 'product' and scenario in ('resale',
'digital')`. Extend `diagnoses_verdict_check` with `no_sales` and `break_even`
without removing legacy verdicts.

Add these public wrappers and matching private implementations:

```sql
public.create_product_diagnosis_report_v2(
  p_submission_id uuid,
  p_product_kind text,
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
  p_monthly_result_cents bigint,
  p_verdict text,
  p_priority text,
  p_unit text,
  p_report_snapshot jsonb
) returns bigint;

public.create_production_diagnosis_report_v2(
  p_submission_id uuid,
  p_cost_composition_enabled boolean,
  p_production_unit_cost_cents bigint,
  p_material_unit_cost_cents bigint,
  p_packaging_unit_cost_cents bigint,
  p_direct_labor_unit_cost_cents bigint,
  p_other_variable_unit_cost_cents bigint,
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
  p_monthly_result_cents bigint,
  p_verdict text,
  p_priority text,
  p_unit text,
  p_report_snapshot jsonb
) returns bigint;
```

For Product, require `p_product_kind in ('resale', 'digital')`,
`p_scenario = p_product_kind`, and exact tuple `2/2/3`. For Production, require
scenario `manufacturing` and exact tuple `2/2/3`. Both functions validate these
snapshot paths against arguments:

```text
schemaVersion, calculationVersion, contentVersion, category, scenario, unit
inputs.* for every command field
results.currentPriceCents
results.monthlySalesVolumeUsed = coalesce(p_monthly_sales_volume, 0)
results.realMarginBasisPoints
results.unitProfitCents
results.monthlyResultCents
results.verdict
results.priority
```

Product also validates `inputs.productKind = p_product_kind` and writes
`product_diagnoses.product_kind`. Both insert the summary's existing
`unit_profit_cents`/`real_margin_basis_points` fields and leave monthly result
inside the immutable snapshot.

Copy the advisory lock, idempotency collision handling, free-report selection,
`private.has_paid_access_for_user`, and transactional inserts from the latest
private implementations in
`20260910195935_enforce_billing_report_access.sql`. Do not copy the older
pre-billing implementations.

- [ ] **Step 1: Add failing pgTAP tests before creating SQL**

Add assertions for column existence/type/nullability/check constraint, Digital
scenario acceptance, V2 function signatures, exact permissions, and absence
of execution for `anon`, `public`, and `service_role`.

Add authenticated calls for Resale, Digital, and Production `2/2/3`; assert
the diagnosis row, detail row, snapshot, product kind, null original volume,
zero interpreted volume, monthly result, free/paid flag, and idempotent ID.

Tamper one field at a time: product kind, scenario, each version, interpreted
volume, monthly result, category, unit, verdict, priority, and snapshot input.
Assert SQLSTATE `22023`. Reuse a submission ID across category/scenario and
assert `23505`. Assert unauthenticated `42501` and the second-free-report
`P0001/free_report_limit_reached` behavior.

- [ ] **Step 2: Run database tests and verify failure**

```bash
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/billing_access.test.sql
```

Expected: FAIL because the column and V2 functions do not exist.

- [ ] **Step 3: Generate the imperative migration with the installed CLI**

```bash
pnpm exec supabase migration new refactor_product_production_reports
```

Expected: one new timestamped file ending in
`_refactor_product_production_reports.sql`. Put all SQL from this task in that
single CLI-generated file.

- [ ] **Step 4: Implement constraints, private implementations, and wrappers**

Use `create function` for new names. Public wrappers are `language sql security
invoker set search_path = ''`. Private implementations are `language plpgsql
security definer set search_path = ''` and schema-qualify `auth.uid`, advisory
lock functions, tables, and `private.has_paid_access_for_user`.

Apply function-specific privileges after creation:

```sql
revoke execute on function public.create_product_diagnosis_report_v2(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function public.create_product_diagnosis_report_v2(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function public.create_production_diagnosis_report_v2(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function public.create_production_diagnosis_report_v2(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_product_diagnosis_report_v2_impl(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function private.create_product_diagnosis_report_v2_impl(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_production_diagnosis_report_v2_impl(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function private.create_production_diagnosis_report_v2_impl(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;
```

Spell out the real types in SQL; do not leave signature comments or wildcard
signatures in the migration.

- [ ] **Step 5: Rebuild the local database and run all pgTAP tests**

`pnpm supabase:reset` destroys only the local Supabase data and reconstructs it
from migrations and seed.

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: reset succeeds; all pgTAP tests pass; lint/advisors report no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/*_refactor_product_production_reports.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql supabase/tests/diagnosis_reports.test.sql supabase/tests/billing_access.test.sql
git commit -m "feat: persist versioned unit reports"
```

---

### Task 7: Generated database types and application persistence

**Files:**

- Modify: `src/infrastructure/database/supabase/database.types.ts` via generator
- Modify: `src/modules/reports/services/create-product-report.service.ts`
- Modify: `src/modules/reports/services/create-product-report.service.test.ts`
- Modify: `src/modules/reports/services/create-production-report.service.ts`
- Modify: `src/modules/reports/services/create-production-report.service.test.ts`
- Modify: `src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts`
- Modify: `src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts`
- Modify: `src/modules/reports/services/get-report.service.test.ts`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`

**Interfaces:**

Use generated RPC types directly:

```ts
type GeneratedProductV2RpcArgs =
  Database["public"]["Functions"]["create_product_diagnosis_report_v2"]["Args"];
type GeneratedProductionV2RpcArgs =
  Database["public"]["Functions"]["create_production_diagnosis_report_v2"]["Args"];
```

Retain narrow overrides only for nullable generated arguments if the generator
still represents them too broadly. Product maps `command.productKind` to
`p_product_kind`; both map `snapshot.results.monthlyResultCents` to
`p_monthly_result_cents`. RPC names must be the V2 names.

- [ ] **Step 1: Add failing service mapping tests**

Assert Product calls `create_product_diagnosis_report_v2` with tuple `2/2/3`,
the matching kind/scenario, nullable original volume, nullable per-unit result,
and non-null monthly result. Assert Production calls its V2 RPC with the same
version/result rules.

Keep provider failures sanitized and map only exact
`P0001/free_report_limit_reached` to `limit_reached`.

- [ ] **Step 2: Run focused service/action tests and verify failure**

```bash
pnpm test src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-production-report.service.test.ts src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts src/modules/reports/services/get-report.service.test.ts 'src/app/(private)/reports/[id]/page.test.tsx'
```

Expected: FAIL because generated V2 RPC types and mappings are absent.

- [ ] **Step 3: Generate database types twice and prove stability**

```bash
pnpm supabase:types
git diff -- src/infrastructure/database/supabase/database.types.ts
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

The second `git diff --exit-code` is expected to remain non-zero while the
first generated change is uncommitted, so capture the first diff, copy the file
to `/tmp/lucrivo-database.types.ts`, generate again, and verify:

```bash
cmp /tmp/lucrivo-database.types.ts src/infrastructure/database/supabase/database.types.ts
```

Expected: `cmp` exits 0.

- [ ] **Step 4: Implement V2 RPC mappings**

Change only the RPC name and arguments required by the new contracts. Keep
safe-ID validation, exception sanitization, and limit mapping unchanged. Update
action fixtures with `productKind`; orchestration order stays validation,
authentication, calculation, snapshot, persistence.

- [ ] **Step 5: Run focused service/action tests**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/database/supabase/database.types.ts src/modules/reports/services src/modules/quick-diagnosis/actions 'src/app/(private)/reports/[id]/page.test.tsx'
git commit -m "feat: connect current unit report persistence"
```

---

### Task 8: Seeds, product documentation, regression suite, and visual verification

**Files:**

- Modify: `supabase/seed.sql`
- Modify: `supabase/tests/seed.test.sql`
- Modify: `docs/QUICK-DIAGNOSIS.md`
- Modify: `PRODUCT.md`
- Modify: any stale Product/Production test fixture reported by the full suite

**Interfaces:**

Seed at least one current `2/2/3` report for each scenario:

- Resale with positive cost and positive monthly volume;
- Digital Product with zero direct cost and omitted monthly volume;
- Production with composed manufacturing cost and positive monthly volume.

Keep at least one legacy Product and Production snapshot in schema tests even
if seed examples move to current versions. Seed calls use the V2 RPCs and exact
static snapshots produced from the same canonical fixtures used in builder
tests.

Update `PRODUCT.md` to list Resale and Digital Product under Product and replace
the old universal `20% target` statement with an internal R$ 20-per-R$ 100
attention band. Update `docs/QUICK-DIAGNOSIS.md` formulas, zero-sales behavior,
new verdict tree, target-price removal, and examples without rewriting Service.

- [ ] **Step 1: Add failing seed assertions**

In `seed.test.sql`, assert one owned row for each current scenario and tuple,
Digital `product_kind = 'digital'`, Digital direct cost zero, original volume
null, interpreted volume zero in JSON, and no mismatch between diagnosis row,
detail row, and snapshot.

- [ ] **Step 2: Run the seed test and verify failure**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/seed.test.sql
```

Expected: FAIL until current seed examples exist.

- [ ] **Step 3: Replace/add deterministic current seed examples**

Generate each expected snapshot in a temporary Vitest assertion or Node module
that imports the compiled builders, then paste the exact JSON into the existing
seed transaction style. Do not hand-adjust calculated cents after generation.
Keep seed idempotency and billing access setup intact.

- [ ] **Step 4: Update product and business-rule documentation**

Document these exact formulas:

```text
quantidade usada = quantidade informada ou 0
valor deixado por venda = preço após impostos/cartão - custo direto
resultado do mês = valor deixado por venda × quantidade usada - gastos mensais
```

State that 20% is only an attention band, target price is not shown in new
reports, omitted volume means zero sales for the monthly result, and monthly
expenses are never divided by zero.

- [ ] **Step 5: Run the complete automated verification**

```bash
pnpm check
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
pnpm supabase:types
NEXT_PUBLIC_TURNSTILE_SITE_KEY=ci-turnstile-site-key pnpm build
```

Expected: every command exits 0. After type generation, verify the generated
file matches the committed version with `git diff --exit-code --
src/infrastructure/database/supabase/database.types.ts`.

- [ ] **Step 6: Run the one allowed Impeccable detector pass**

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/modules/quick-diagnosis/components/product src/modules/reports/components src/modules/reports/presenters
```

Fix every in-scope error in one batch. Do not run the detector repeatedly.

- [ ] **Step 7: Perform grouped visual verification**

Start the application with `pnpm dev`. In one browser round, inspect current
Resale, Digital, and Production reports plus the Product values/review steps at
1440×900 and 390×844, in light and dark themes, then repeat the narrow view at
200% zoom. Verify no clipping, horizontal overflow, inaccessible popover,
generic cross-category wording, hidden zero, or result conveyed only by color.

Apply all observed corrections in one batch, rerun only affected automated
tests, and perform at most one confirmation round.

- [ ] **Step 8: Commit**

```bash
git add PRODUCT.md docs/QUICK-DIAGNOSIS.md supabase/seed.sql supabase/tests/seed.test.sql
git commit -m "docs: align unit diagnosis rules and examples"
```

- [ ] **Step 9: Confirm a clean handoff**

```bash
git status --short
git log --oneline -8
```

Expected: no uncommitted changes and one focused commit per task.
