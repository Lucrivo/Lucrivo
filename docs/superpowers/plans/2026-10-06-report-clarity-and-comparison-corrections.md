# Report Clarity and Comparison Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Entenda o resultado` balanced, concise, accessible in both themes, and factually correct for tied or partially informed item mixes, while propagating the same clarity to the client dashboard.

**Architecture:** Keep every financial calculation and persisted snapshot shape unchanged. Derive presentation-only availability and per-item reference details in the report presenters, render those through the shared indicator component, preserve legacy snapshot narrative exactly once, and make comparison guidance require strict factual differences instead of array order.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Tailwind CSS 4, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-report-clarity-and-comparison-corrections-design.md`

## Global Constraints

- Do not change database tables, RPCs, migrations, seed data, persisted snapshot schemas, `calculationVersion`, or `contentVersion`.
- Keep the current total sales-goal formula and its known-mix semantics unchanged.
- Do not invent integer goals per item for a complete multi-item mix.
- A partial multi-item reference must always say that the item is being considered alone.
- Preserve legacy detailed-report narrative once, outside the indicators.
- Keep all user-facing copy in Brazilian Portuguese and identifiers in English.
- Communicate every state with text or an icon in addition to color.
- Before the first UI edit, read `.agents/skills/impeccable/reference/craft-floor.md` completely.
- Use semantic theme tokens; do not add raw color values to report or dashboard components.

---

## File Structure

### Domain behavior

- Modify `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts` to select strict comparison groups and handle ties.
- Modify `src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts` to cover equal values, tied leaders, and strict winners.

### Report presentation

- Modify `src/modules/reports/presenters/to-report-view-model.ts` to extend the indicator contract and strengthen discount help copy.
- Modify `src/modules/reports/presenters/to-detailed-report-view-model.ts` to derive concise partial-state copy and structured per-item references.
- Modify `src/modules/reports/presenters/to-detailed-report-view-model.test.ts` to verify complete, partial, and legacy presentation.
- Modify `src/modules/reports/components/report-indicators.tsx` to render structured details and balanced layouts.
- Modify `src/modules/reports/components/report-indicators.test.tsx` to verify four-card and five-card composition plus unavailable hierarchy.
- Modify `src/modules/reports/components/detailed-report-detail.tsx` to show persisted section cards only for legacy content versions.
- Modify `src/modules/reports/components/detailed-report-detail.test.tsx` to verify current-version de-duplication and legacy preservation.

### Theme and contrast

- Modify `src/components/ui/badge.tsx` so semantic badges use readable foreground text.
- Modify `src/modules/reports/components/report-tone.ts` so warning values use a light warning color in dark mode.
- Modify `src/modules/reports/components/discount-simulator.tsx` and its test for dark warning presentation.
- Modify `src/modules/reports/components/report-preview.tsx` for dark warning presentation.
- Modify `src/modules/reports/components/detailed-item-card.tsx` so informational body text uses normal foreground and the icon retains the semantic color.
- Modify `src/app/(private)/reports/[id]/page.tsx` so the unavailable-report warning icon remains visible in dark mode.
- Modify `src/modules/reports/components/report-library.test.tsx` to keep semantic badge assertions aligned with the readable label color.

### Dashboard

- Modify `src/modules/client-dashboard/to-dashboard-report-focus.ts` to remove the duplicated discount fact.
- Modify `src/modules/client-dashboard/client-dashboard.types.ts` to remove `discount_limit` from the complementary-fact key union.
- Modify `src/modules/client-dashboard/to-dashboard-report-focus.test.ts` to verify the non-duplicated focus model.
- Modify `src/modules/client-dashboard/components/dashboard-report-focus.tsx` to forward indicator help into `MetricCard`.
- Modify `src/modules/client-dashboard/components/dashboard-report-focus.test.tsx` to verify help and the absence of repeated discount output.

### Visual verification

- Modify `src/app/visual-review/page.tsx` so the partial-report fixture exercises more than one missing item reference.

---

### Task 1: Make item comparisons strict and tie-aware

**Files:**

- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts`

**Interfaces:**

- Consumes: `DetailedDiagnosisCommand`, `DetailedDiagnosisCalculation`, and the existing `DetailedGuidance` shape.
- Produces: the same `buildDetailedGuidance(command, calculation): DetailedGuidance[]` signature with deterministic `itemIds`, titles, and bodies.

- [ ] **Step 1: Add failing tests for all-equal items and meaningful tied winners**

Add these cases inside the existing `describe("buildDetailedGuidance", ...)` block:

```ts
it("does not single out the first item when every comparison is tied", () => {
  const equalItems: DetailedDiagnosisCommand = {
    ...command,
    items: [
      command.items[0]!,
      {
        ...command.items[0]!,
        id: "22222222-2222-4222-8222-222222222222",
        position: 1,
        name: "Caderno",
      },
    ],
  };

  const keys = buildDetailedGuidance(
    equalItems,
    calculateDetailedDiagnosis(equalItems),
  ).map(({ key }) => key);

  expect(keys).not.toContain("high_volume_low_margin");
  expect(keys).not.toContain("best_unit_contribution");
  expect(keys).not.toContain("concentration");
});

it("lists every highest-volume item with a strictly lower margin", () => {
  const tiedHighestVolume: DetailedDiagnosisCommand = {
    ...command,
    items: [
      command.items[0]!,
      {
        ...command.items[0]!,
        id: "22222222-2222-4222-8222-222222222222",
        position: 1,
        name: "Caderno",
      },
      {
        ...command.items[0]!,
        id: "33333333-3333-4333-8333-333333333333",
        position: 2,
        name: "Garrafa",
        unitSalePriceCents: 8_000,
        monthlySalesVolume: 50,
      },
    ],
  };

  const guidance = buildDetailedGuidance(
    tiedHighestVolume,
    calculateDetailedDiagnosis(tiedHighestVolume),
  ).find(({ key }) => key === "high_volume_low_margin");

  expect(guidance).toMatchObject({
    title: "Os itens mais vendidos deixam menos proporcionalmente",
    itemIds: [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ],
  });
});

it("lists tied best unit results only when another item is strictly lower", () => {
  const tiedBest: DetailedDiagnosisCommand = {
    ...command,
    items: [
      command.items[0]!,
      {
        ...command.items[0]!,
        id: "22222222-2222-4222-8222-222222222222",
        position: 1,
        name: "Caderno",
      },
      {
        ...command.items[0]!,
        id: "33333333-3333-4333-8333-333333333333",
        position: 2,
        name: "Garrafa",
        unitSalePriceCents: 4_500,
      },
    ],
  };

  const guidance = buildDetailedGuidance(
    tiedBest,
    calculateDetailedDiagnosis(tiedBest),
  ).find(({ key }) => key === "best_unit_contribution");

  expect(guidance).toMatchObject({
    title: "Estes itens deixam mais depois dos valores considerados",
    itemIds: [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ],
  });
});
```

- [ ] **Step 2: Run the domain tests and confirm the current first-item behavior fails**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
```

Expected: FAIL because equal values currently emit three comparison guidance entries and tied winners only retain the first item.

- [ ] **Step 3: Replace first-item reductions with explicit comparison groups**

In `concentrationGuidance`, collect all leaders and require exactly one:

```ts
const highestContribution = Math.max(
  ...positiveItems.map((item) => item.monthlyContributionCents ?? 0),
);
const leaders = positiveItems.filter(
  (item) => item.monthlyContributionCents === highestContribution,
);
if (leaders.length !== 1) return null;
const [leading] = leaders;
if (
  !leading ||
  BigInt(leading.monthlyContributionCents ?? 0) * BigInt(10_000) <=
    total * BigInt(CONCENTRATION_THRESHOLD_BASIS_POINTS)
) {
  return null;
}
```

In `highVolumeLowerResultGuidance`, select the complete tied group and require a strict margin difference:

```ts
const highestVolume = Math.max(
  ...comparable.map((item) => volumeById.get(item.itemId) ?? 0),
);
const lowestMargin = Math.min(
  ...comparable.map((item) => item.realMarginBasisPoints ?? 0),
);
const hasHigherMargin = comparable.some(
  (item) => (item.realMarginBasisPoints ?? 0) > lowestMargin,
);
const lowerMarginLeaders = comparable.filter(
  (item) =>
    (volumeById.get(item.itemId) ?? 0) === highestVolume &&
    item.realMarginBasisPoints === lowestMargin,
);
if (!hasHigherMargin || lowerMarginLeaders.length === 0) return null;

const itemIds = lowerMarginLeaders.map((item) => item.itemId);
const plural = itemIds.length > 1;
return {
  key: "high_volume_low_margin",
  tone: "neutral",
  title: plural
    ? "Os itens mais vendidos deixam menos proporcionalmente"
    : "O item mais vendido deixa menos proporcionalmente",
  body: plural
    ? `${namesFor(command, itemIds)} têm a maior quantidade e deixam menos por venda do que os outros itens informados.`
    : `${namesFor(command, itemIds)} tem a maior quantidade e deixa menos por venda do que os outros itens informados.`,
  itemIds,
};
```

In `bestUnitResultGuidance`, require at least one strictly lower result and return the whole best group:

```ts
const bestResult = Math.max(
  ...candidates.map((item) => item.unitProfitCents ?? Number.MIN_SAFE_INTEGER),
);
const hasLowerResult = candidates.some(
  (item) => (item.unitProfitCents ?? Number.MIN_SAFE_INTEGER) < bestResult,
);
if (!hasLowerResult) return null;

const bestItems = candidates.filter(
  (item) => item.unitProfitCents === bestResult,
);
const itemIds = bestItems.map((item) => item.itemId);
const plural = itemIds.length > 1;
return {
  key: "best_unit_contribution",
  tone: "positive",
  title: plural
    ? "Estes itens deixam mais depois dos valores considerados"
    : "Este item deixa mais depois dos valores considerados",
  body: plural
    ? `${namesFor(command, itemIds)} deixam o maior valor por venda entre os itens com custo completo calculado.`
    : `${namesFor(command, itemIds)} deixa o maior valor por venda entre os itens com custo completo calculado.`,
  itemIds,
};
```

- [ ] **Step 4: Run the domain tests**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the strict comparison behavior**

```bash
git add src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
git commit -m "fix: make detailed guidance tie aware"
```

---

### Task 2: Derive concise indicator states and structured item references

**Files:**

- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`

**Interfaces:**

- Produces: `ReportIndicatorDetail`, `ReportIndicatorViewModel.unavailable`, and `ReportIndicatorViewModel.details`.
- Preserves: `toDetailedReportViewModel(...)` and `toReportViewModel(...)` call signatures.
- Consumed later by: `ReportIndicators` and `DashboardReportFocus`.

- [ ] **Step 1: Update presenter tests for the approved partial-state contract**

Replace the current multi-item unavailable assertion and add distinct-reason assertions:

```ts
it("shows every isolated reference without inventing one mix goal", () => {
  const model = present({
    ...baseCommand,
    items: [
      { ...baseCommand.items[0]!, monthlySalesVolume: null },
      {
        ...baseCommand.items[0]!,
        id: "22222222-2222-4222-8222-222222222222",
        position: 1,
        name: "Copo",
        monthlySalesVolume: null,
      },
    ],
  });
  const sales = model.indicators.find(({ key }) => key === "sales");

  expect(sales).toMatchObject({
    value: "Sem meta única",
    unavailable: true,
    supportingText: "Faltam quantidades para definir a proporção do conjunto.",
    details: [
      {
        id: baseCommand.items[0]!.id,
        label: "Caneca",
        value: "4 unidades se vendido sozinho",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        label: "Copo",
        value: "4 unidades se vendido sozinho",
      },
    ],
  });
  expect(model.items.every((item) => item.breakEvenReferenceLabel)).toBe(true);
});

it("uses a specific explanation for each unavailable consolidated value", () => {
  const model = present({
    ...baseCommand,
    items: [
      { ...baseCommand.items[0]!, monthlySalesVolume: null },
      {
        ...baseCommand.items[0]!,
        id: "22222222-2222-4222-8222-222222222222",
        position: 1,
        name: "Copo",
        monthlySalesVolume: 10,
      },
    ],
  });
  const byKey = new Map(
    model.indicators.map((indicator) => [indicator.key, indicator]),
  );

  expect(byKey.get("break_even")?.supportingText).toBe(
    "O faturamento de equilíbrio do conjunto depende da proporção entre os itens.",
  );
  expect(byKey.get("margin")?.supportingText).toBe(
    "Informe todas as quantidades para calcular quanto sobra no conjunto.",
  );
  expect(byKey.get("revenue")?.supportingText).toBe(
    "Informe todas as quantidades para somar quanto entra no mês.",
  );
  expect(
    model.indicators.every(({ description }) => description === undefined),
  ).toBe(true);
});
```

Extend the existing legacy test:

```ts
expect(historical.sections.map(({ key }) => key)).toEqual([
  "break_even",
  "margin_diagnosis",
  "sales_goal",
]);
expect(
  historical.indicators.every(({ description }) => description === undefined),
).toBe(true);
```

Also extend the existing single-item unknown-volume test so the consolidated
reference is not repeated as a detail list:

```ts
expect(sales?.details).toBeUndefined();
```

- [ ] **Step 2: Run the presenter test and confirm it fails**

Run:

```bash
pnpm vitest run src/modules/reports/presenters/to-detailed-report-view-model.test.ts
```

Expected: FAIL because the indicator contract has no structured details or availability state and still copies section bodies.

- [ ] **Step 3: Extend the shared indicator view-model contract**

In `to-report-view-model.ts`, add and export the detail type:

```ts
type ReportIndicatorDetail = {
  id: string;
  label: string;
  value: string;
};

type ReportIndicatorViewModel = {
  key: ReportIndicatorKey;
  label: string;
  value: string;
  tone: ReportTone;
  toneLabel: string;
  description?: string;
  supportingText?: string;
  help?: PlainLanguageHelpContent;
  featured?: boolean;
  unavailable?: boolean;
  details?: ReportIndicatorDetail[];
};
```

Add `ReportIndicatorDetail` to the export block. Mark quick-report indicators
unavailable from their actual null result instead of matching display strings.
Add these properties directly to the objects with the matching `key` in the
existing returned arrays:

```ts
// Object with key: "minimum" in toServiceIndicators
unavailable: results.minimumPriceCents === null,
// Object with key: "sales" in toServiceIndicators
unavailable: results.monthlySalesGoal === null,
// Object with key: "margin" in toServiceIndicators
unavailable: results.realMarginBasisPoints === null,
// Object with key: "discount" in toServiceIndicators
unavailable: results.breakEvenDiscountPercent === null,

// Object with key: "minimum" in toUnitIndicators
unavailable: minimumPriceCents === null,
// Object with key: "sales" in toUnitIndicators
unavailable: goal === null,
// Object with key: "margin" in toUnitIndicators
unavailable: results.realMarginBasisPoints === null && scenario === null,
// Object with key: "discount" in toUnitIndicators
unavailable: discountPercent === null,
```

Calculated `price` remains available and does not need the optional property.

- [ ] **Step 4: Derive current-version isolated references and distinct reasons**

In `toDetailedIndicators`, compute the current-version references before building drafts:

```ts
// Add ReportIndicatorDetail to the type-only import from to-report-view-model.
const currentContent =
  snapshot.contentVersion === DETAILED_REPORT_CONTENT_VERSION;
const isolatedReferences: ReportIndicatorDetail[] = currentContent
  ? snapshot.inputs.items.flatMap((item) => {
      const reference = scenario.byItem.get(item.id);
      return reference
        ? [
            {
              id: item.id,
              label: item.name,
              value: `${formatIntegerVolume(reference.referenceVolume)} unidades se vendido sozinho`,
            },
          ]
        : [];
    })
  : [];
const partialMix = results.isPartial && snapshot.inputs.items.length > 1;
```

Extract these supporting values before the draft array:

```ts
const breakEvenSupporting =
  breakEvenRevenueCents === null
    ? reason
    : results.monthlyGrossRevenueCents === null
      ? consolidated
        ? "Referência de equilíbrio no preço atual."
        : undefined
      : results.monthlyGrossRevenueCents >= breakEvenRevenueCents
        ? `Você fatura ${formatCurrency(results.monthlyGrossRevenueCents - breakEvenRevenueCents)} acima desse ponto.`
        : `Faltam ${formatCurrency(breakEvenRevenueCents - results.monthlyGrossRevenueCents)} para chegar a esse ponto.`;
const revenueSupporting =
  results.monthlyGrossRevenueCents === null
    ? reason
    : `Custos do mês: ${optionalCurrency(results.monthlyCostCents)}.`;
```

Build the four detailed drafts without `description`. Replace the current draft
array with these exact fields:

```ts
{
  key: "sales",
  label: "Unidades necessárias no mês",
  value: salesGoal.available
    ? `${formatIntegerVolume(salesGoal.monthly)} unidades`
    : partialMix && currentContent
      ? "Sem meta única"
      : "Indisponível",
  tone: salesTone,
  supportingText:
    !salesGoal.available && partialMix && currentContent
      ? "Faltam quantidades para definir a proporção do conjunto."
      : salesSupporting,
  help: salesHelp,
  featured: true,
  unavailable: !salesGoal.available,
  ...(partialMix && isolatedReferences.length > 0
    ? { details: isolatedReferences }
    : {}),
},
{
  key: "break_even",
  label: "Faturamento para cobrir os gastos",
  value: optionalCurrency(breakEvenRevenueCents),
  tone: breakEvenTone,
  supportingText:
    breakEvenRevenueCents === null && partialMix && currentContent
      ? "O faturamento de equilíbrio do conjunto depende da proporção entre os itens."
      : breakEvenSupporting,
  help: breakEvenHelp,
  unavailable: breakEvenRevenueCents === null,
},
{
  key: "margin",
  label: "Margem de lucro",
  value: marginValue,
  tone: consolidated ? "neutral" : resultTone(results.monthlyResultCents),
  supportingText:
    results.monthlyResultCents === null && !consolidated && currentContent
      ? "Informe todas as quantidades para calcular quanto sobra no conjunto."
      : marginSupporting,
  help: marginHelp,
  unavailable:
    results.finalMarginBasisPoints === null && consolidated === null,
},
{
  key: "revenue",
  label: "Quanto entraria neste cenário",
  value: optionalCurrency(results.monthlyGrossRevenueCents),
  tone: "neutral",
  supportingText:
    results.monthlyGrossRevenueCents === null && currentContent
      ? partialMix
        ? "Informe todas as quantidades para somar quanto entra no mês."
        : "Informe a quantidade mensal para calcular quanto entra no mês."
      : revenueSupporting,
  unavailable: results.monthlyGrossRevenueCents === null,
},
```

- [ ] **Step 5: Put the dashboard discount warning in the indicator help**

Change `discountHelp.description` in `to-report-view-model.ts` to:

```ts
description:
  "É o maior desconto que ainda deixa o preço acima do preço de equilíbrio. É um limite calculado, não uma recomendação de desconto. Use o simulador para testar outros valores.",
```

- [ ] **Step 6: Run presenter suites**

Run:

```bash
pnpm vitest run src/modules/reports/presenters/to-detailed-report-view-model.test.ts src/modules/reports/presenters/to-report-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the presenter contract**

```bash
git add src/modules/reports/presenters/to-report-view-model.ts src/modules/reports/presenters/to-detailed-report-view-model.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts
git commit -m "refactor: clarify report indicator states"
```

---

### Task 3: Balance the indicator grid and remove current-version repetition

**Files:**

- Modify: `src/modules/reports/components/report-indicators.test.tsx`
- Modify: `src/modules/reports/components/report-indicators.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.tsx`

**Interfaces:**

- Consumes: `ReportIndicatorViewModel.unavailable` and `.details` from Task 2.
- Produces: balanced four- and five-indicator layouts without changing callers.
- Preserves: `ReportSectionCard` for legacy detailed snapshots only.

- [ ] **Step 1: Read the required UI craft floor**

Read the entire file before editing JSX or Tailwind classes:

```bash
sed -n '1,420p' .agents/skills/impeccable/reference/craft-floor.md
```

Expected: no files changed.

- [ ] **Step 2: Add failing component tests for both grid shapes and structured details**

In `report-indicators.test.tsx`, add a four-indicator fixture by removing `price` from the existing five-item fixture. Add these assertions:

```ts
it("balances a featured indicator with three regular indicators", () => {
  render(
    <ReportIndicators
      indicators={indicators.filter(({ key }) => key !== "price")}
    />,
  );

  const cards = screen.getAllByTestId("report-indicator");
  expect(screen.getByTestId("report-indicators")).toHaveAttribute(
    "data-layout",
    "featured-with-three",
  );
  expect(cards[0]).toHaveClass("xl:col-span-8");
  expect(cards[1]).toHaveClass("xl:col-span-4");
  expect(cards[2]).toHaveClass("xl:col-span-6");
  expect(cards[3]).toHaveClass("xl:col-span-6");
});

it("renders unavailable values below calculated values in the hierarchy", () => {
  render(
    <ReportIndicators
      indicators={[
        {
          key: "sales",
          label: "Unidades necessárias no mês",
          value: "Sem meta única",
          tone: "neutral",
          toneLabel: "Informação",
          unavailable: true,
          details: [
            {
              id: "caneca",
              label: "Caneca",
              value: "4 unidades se vendido sozinho",
            },
          ],
        },
      ]}
    />,
  );

  expect(screen.getByText("Sem meta única")).toHaveAttribute(
    "data-value-state",
    "unavailable",
  );
  expect(screen.getByText("Caneca")).toBeVisible();
  expect(screen.getByText("4 unidades se vendido sozinho")).toBeVisible();
});
```

Also extend the existing five-indicator test:

```ts
expect(grid).toHaveAttribute("data-layout", "featured-with-four");
expect(
  Array.from(grid.querySelectorAll("[data-testid=report-indicator]"))
    .slice(1)
    .every((card) => card.classList.contains("xl:col-span-4")),
).toBe(true);
```

- [ ] **Step 3: Add failing detailed-page tests for current and legacy section rendering**

In `detailed-report-detail.test.tsx`, add:

```tsx
it("does not repeat persisted calculation sections for current reports", () => {
  render(
    <DetailedReportDetail
      id={168}
      createdAt="2026-09-17T15:00:00.000Z"
      snapshot={snapshotFor(productCommand)}
    />,
  );

  expect(screen.queryByTestId("report-section")).not.toBeInTheDocument();
});

it("preserves legacy narrative once outside the indicators", () => {
  const snapshot = snapshotFor(productCommand);
  render(
    <DetailedReportDetail
      id={168}
      createdAt="2026-09-17T15:00:00.000Z"
      snapshot={{ ...snapshot, contentVersion: 2 }}
    />,
  );

  expect(
    screen.getByRole("heading", {
      name: "Detalhes preservados deste relatório",
    }),
  ).toBeVisible();
  expect(screen.getAllByTestId("report-section")).toHaveLength(3);
});
```

- [ ] **Step 4: Run component tests and confirm failure**

Run:

```bash
pnpm vitest run src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx
```

Expected: FAIL because the grid has no layout contract, details are not rendered, and current reports still render two repeated section cards.

- [ ] **Step 5: Implement the count-aware indicator layout**

Extend the existing `ReportIndicatorCard` props with `className?: string` and
destructure it beside `indicator`. Keep the current tone lookup and icon
selection intact.

Add `className` as the final argument of the current `Card` class merge. Replace
the current value paragraph with:

```tsx
<p
  data-value-state={indicator.unavailable ? "unavailable" : "available"}
  className={cn(
    "leading-tight font-semibold wrap-break-word tabular-nums",
    indicator.unavailable
      ? "text-foreground/80 text-xl sm:text-2xl"
      : cn("text-2xl sm:text-3xl", presentation.value),
  )}
>
  {indicator.value}
</p>
```

Before the component return, derive the structured list:

```tsx
const details = indicator.details?.length ? (
  <dl className="border-border/70 divide-border bg-background/70 grid divide-y rounded-xl border px-4">
    {indicator.details.map((detail) => (
      <div
        key={detail.id}
        className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4"
      >
        <dt className="font-medium break-words">{detail.label}</dt>
        <dd className="text-muted-foreground break-words sm:text-right">
          {detail.value}
        </dd>
      </div>
    ))}
  </dl>
) : null;
```

Render `{details}` immediately after the current description block.

Use this layout selection in `ReportIndicators`:

```tsx
const layout =
  featured.length === 1 && regular.length === 3
    ? "featured-with-three"
    : featured.length === 1 && regular.length === 4
      ? "featured-with-four"
      : "default";

return (
  <div
    data-testid="report-indicators"
    data-layout={layout}
    className={cn(
      "grid gap-4 sm:grid-cols-2",
      layout !== "default" && "xl:grid-cols-12",
    )}
  >
    {featured.map((indicator) => (
      <ReportIndicatorCard
        key={indicator.key}
        indicator={indicator}
        className={cn("sm:col-span-2", layout !== "default" && "xl:col-span-8")}
      />
    ))}
    {regular.map((indicator, index) => (
      <ReportIndicatorCard
        key={indicator.key}
        indicator={indicator}
        className={cn(
          layout === "featured-with-four" && "xl:col-span-4",
          layout === "featured-with-three" &&
            (index === 0
              ? "xl:col-span-4"
              : index === 1
                ? "xl:col-span-6"
                : "sm:col-span-2 xl:col-span-6"),
        )}
      />
    ))}
  </div>
);
```

Raise the indicator label from `text-sm` to `text-[0.9375rem]` and keep explanation text at `text-sm leading-6`; do not enlarge badge text.

- [ ] **Step 6: Render persisted calculation cards only for legacy versions**

Import `DETAILED_REPORT_CONTENT_VERSION` in `detailed-report-detail.tsx`, derive:

```ts
const legacySections =
  snapshot.contentVersion === DETAILED_REPORT_CONTENT_VERSION
    ? []
    : viewModel.sections;
```

Delete `detailedSectionKeys` and remove the current section-card loop from
`Entenda o resultado`. Before the component return, derive the legacy content:

```tsx
const legacyDetails =
  legacySections.length > 0 ? (
    <section aria-labelledby="legacy-calculation-title" className="grid gap-4">
      <div className="grid gap-2 px-1">
        <h2 id="legacy-calculation-title" className="text-2xl">
          Detalhes preservados deste relatório
        </h2>
        <p className="text-muted-foreground max-w-3xl text-sm leading-6">
          Estes textos foram gravados com as regras vigentes quando o relatório
          foi criado.
        </p>
      </div>
      {legacySections.map((section) => (
        <ReportSectionCard key={section.key} section={section} />
      ))}
    </section>
  ) : null;
```

Render `{legacyDetails}` immediately after the current `Entenda o resultado`
section.

- [ ] **Step 7: Run report component tests**

Run:

```bash
pnpm vitest run src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/report-detail.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit the report hierarchy**

```bash
git add src/modules/reports/components/report-indicators.tsx src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/detailed-report-detail.tsx src/modules/reports/components/detailed-report-detail.test.tsx
git commit -m "refactor: clarify detailed report hierarchy"
```

---

### Task 4: Correct semantic contrast in report states

**Files:**

- Modify: `src/components/ui/badge.tsx`
- Modify: `src/modules/reports/components/report-tone.ts`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/report-preview.tsx`
- Modify: `src/modules/reports/components/detailed-item-card.tsx`
- Modify: `src/app/(private)/reports/[id]/page.tsx`
- Modify: `src/modules/reports/components/report-indicators.test.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`

**Interfaces:**

- Preserves: all component props and all semantic tone names.
- Produces: WCAG-readable small text while retaining semantic icon, label, border, and surface cues.

- [ ] **Step 1: Add class-level regression assertions**

Add a warning indicator regression case in `report-indicators.test.tsx`:

```tsx
it("keeps warning values readable in dark mode", () => {
  render(
    <ReportIndicators
      indicators={[
        {
          key: "discount",
          label: "Desconto máximo sem prejuízo",
          value: "0%",
          tone: "warning",
          toneLabel: "Atenção",
        },
      ]}
    />,
  );

  expect(screen.getByText("0%")).toHaveClass("dark:text-warning");
});
```

In `discount-simulator.test.tsx`, locate the test that moves the simulator to its break-even state and add:

```ts
expect(screen.getByText(/sem lucro nem prejuízo/i).closest("div")).toHaveClass(
  "dark:text-warning",
);
```

If the status text is not unique, add `data-simulation-status={simulation.status}` to the existing status container and assert against `[data-simulation-status="break_even"]`.

In `report-library.test.tsx`, update both semantic badge expectations to
`text-foreground`; the information and destructive meaning remains available
through their visible labels, tinted surfaces, and rings.

- [ ] **Step 2: Run the focused tests and confirm the dark-mode class assertions fail**

Run:

```bash
pnpm vitest run src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/discount-simulator.test.tsx
```

Expected: FAIL because warning text currently remains `text-warning-foreground` in dark mode.

- [ ] **Step 3: Fix badge and report tone classes**

In `badge.tsx`, keep the existing tinted backgrounds and rings but use normal foreground for semantic badge labels:

```ts
destructive:
  "bg-destructive/18 text-foreground ring-1 ring-destructive/30 focus-visible:ring-destructive/20 dark:bg-destructive/28 dark:ring-destructive/40 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/25",
success:
  "bg-success/18 text-foreground ring-1 ring-success/35 [a]:hover:bg-success/25",
warning:
  "bg-warning/22 text-foreground ring-1 ring-warning/40 [a]:hover:bg-warning/30",
info:
  "bg-info/18 text-foreground ring-1 ring-info/35 [a]:hover:bg-info/25",
```

In `report-tone.ts`, change only the warning value class:

```ts
value: "text-warning-foreground dark:text-warning",
```

- [ ] **Step 4: Fix report warning and information messages**

Apply these exact class changes:

```ts
// discount-simulator.tsx
className: ("border-warning/35 bg-warning/12 text-warning-foreground dark:text-warning",
  // report-preview.tsx
  (className =
    "text-warning-foreground dark:text-warning flex gap-2 text-sm leading-5"));

// reports/[id]/page.tsx
className =
  "bg-warning/15 text-warning-foreground dark:text-warning flex size-12 items-center justify-center rounded-2xl";
```

In both informational messages in `detailed-item-card.tsx`, change the paragraph to `text-foreground` and color only the icon:

```tsx
<p className="border-info/25 bg-info/8 text-foreground flex items-start gap-2 rounded-xl border p-3 text-sm leading-5">
  <InfoIcon aria-hidden="true" className="text-info mt-0.5 size-4 shrink-0" />
  {item.breakEvenReferenceLabel}
</p>
```

Apply the same paragraph and icon classes to the
`item.completeCostUnavailableReason` message, retaining that expression as its
body.

- [ ] **Step 5: Run report and shared-component tests**

Run:

```bash
pnpm vitest run src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/detailed-item-card.test.tsx src/modules/reports/components/report-library.test.tsx src/modules/reports/components/report-editor.test.tsx src/app/\(private\)/reports/\[id\]/page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the Impeccable detector once over the changed UI files**

Run:

```bash
.agents/skills/impeccable/scripts/impeccable detect --json src/components/ui/badge.tsx src/modules/reports/components/report-indicators.tsx src/modules/reports/components/detailed-report-detail.tsx src/modules/reports/components/detailed-item-card.tsx src/modules/reports/components/discount-simulator.tsx src/modules/reports/components/report-preview.tsx 'src/app/(private)/reports/[id]/page.tsx'
```

Expected: `[]`. If it reports a deterministic contrast or overflow issue, fix that issue and rerun the focused tests; do not run a second detector pass because this plan budgets one mechanical scan.

- [ ] **Step 7: Commit the contrast corrections**

```bash
git add src/components/ui/badge.tsx src/modules/reports/components/report-tone.ts src/modules/reports/components/discount-simulator.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-preview.tsx src/modules/reports/components/detailed-item-card.tsx 'src/app/(private)/reports/[id]/page.tsx' src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/report-library.test.tsx
git commit -m "fix: improve report contrast across themes"
```

---

### Task 5: De-duplicate dashboard facts and expose indicator help

**Files:**

- Modify: `src/modules/client-dashboard/to-dashboard-report-focus.test.ts`
- Modify: `src/modules/client-dashboard/to-dashboard-report-focus.ts`
- Modify: `src/modules/client-dashboard/client-dashboard.types.ts`
- Modify: `src/modules/client-dashboard/components/dashboard-report-focus.test.tsx`
- Modify: `src/modules/client-dashboard/components/dashboard-report-focus.tsx`

**Interfaces:**

- Consumes: `ReportIndicatorViewModel.help.description` from Task 2.
- Produces: unchanged four-metric dashboard focus model without the repeated `discount_limit` complementary fact.

- [ ] **Step 1: Change dashboard model tests to reject duplicated discount output**

Replace the existing discount complementary-fact test in `to-dashboard-report-focus.test.ts` with:

```ts
it("keeps the discount warning in metric help without duplicating the value", () => {
  const focus = toDashboardReportFocus(productReport());
  const discount = focus.metrics.find(({ key }) => key === "discount");

  expect(discount?.help?.description).toContain(
    "não uma recomendação de desconto",
  );
  expect(focus.complementaryFacts.map(({ key }) => key)).not.toContain(
    "discount_limit",
  );
});
```

Remove the `discount_limit` fixture from `focusedReport` in `dashboard-report-focus.test.tsx`. Add this help to its discount metric:

```ts
help: {
  title: "Desconto máximo sem prejuízo",
  description:
    "É um limite calculado, não uma recomendação de desconto.",
},
```

Replace the existing assertion for the duplicated discount supporting text with:

```ts
expect(
  screen.getByRole("button", {
    name: "Entenda Desconto máximo sem prejuízo",
  }),
).toBeVisible();
expect(screen.queryByText("Limite antes do prejuízo")).not.toBeInTheDocument();
```

Add a separate hierarchy regression using a copy of `focusedReport` whose sales
metric has `value: "Sem meta única"` and `unavailable: true`:

```tsx
it("dims unavailable metrics from their semantic state instead of their copy", () => {
  const sales = {
    ...focusedReport.metrics[0]!,
    value: "Sem meta única",
    unavailable: true,
  };
  const report = {
    ...focusedReport,
    metrics: [sales, ...focusedReport.metrics.slice(1)],
  };

  render(<DashboardReportFocus focus={{ status: "ready", report }} />);

  expect(screen.getByText("Sem meta única").closest(".bg-card")).toHaveClass(
    "bg-muted/25",
  );
});
```

- [ ] **Step 2: Run dashboard tests and confirm failure**

Run:

```bash
pnpm vitest run src/modules/client-dashboard/to-dashboard-report-focus.test.ts src/modules/client-dashboard/components/dashboard-report-focus.test.tsx
```

Expected: FAIL because `discount_limit` is still generated, help is not
forwarded, and unavailable styling still compares display strings.

- [ ] **Step 3: Remove the duplicate fact from the dashboard model**

Delete `"discount_limit"` from `DashboardComplementaryFact["key"]` in `client-dashboard.types.ts`.

Delete this block from `toQuickFocus`:

```ts
if (snapshot.results.breakEvenDiscountPercent !== null) {
  complementaryFacts.push({
    key: "discount_limit",
    label: "Limite antes do prejuízo",
    value: `${snapshot.results.breakEvenDiscountPercent}%`,
    supportingText: "É um limite calculado, não uma recomendação de desconto.",
  });
}
```

Keep `updatedFact(report)` immediately after the analyzed-offer fact:

```ts
const complementaryFacts: DashboardComplementaryFact[] = [
  analyzedOfferFact(snapshot.category),
  ...updatedFact(report),
];
```

- [ ] **Step 4: Forward indicator help into each dashboard metric**

Add this prop to the existing `MetricCard` call in `dashboard-report-focus.tsx`:

```tsx
helpText={metric.help?.description}
```

Do not copy help text into `details`; it stays in the accessible tooltip/popover affordance already owned by `MetricCard`.

In the same call, replace the string comparisons for unavailable values with
the derived semantic state:

```tsx
className={cn(metric.unavailable && "bg-muted/25")}
```

- [ ] **Step 5: Run dashboard and metric-card tests**

Run:

```bash
pnpm vitest run src/modules/client-dashboard/to-dashboard-report-focus.test.ts src/modules/client-dashboard/components/dashboard-report-focus.test.tsx src/components/shared/metrics/metric-card.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the dashboard propagation**

```bash
git add src/modules/client-dashboard/to-dashboard-report-focus.ts src/modules/client-dashboard/to-dashboard-report-focus.test.ts src/modules/client-dashboard/client-dashboard.types.ts src/modules/client-dashboard/components/dashboard-report-focus.tsx src/modules/client-dashboard/components/dashboard-report-focus.test.tsx
git commit -m "refactor: clarify focused dashboard metrics"
```

---

### Task 6: Verify partial content, visual layouts, and the full project

**Files:**

- Modify: `src/app/visual-review/page.tsx`
- Test: all files changed by Tasks 1–5

**Interfaces:**

- Produces: a deterministic visual-review scenario containing multiple missing item references.
- Verifies: desktop, intermediate, mobile, light, dark, current, partial, and legacy-compatible behavior.

- [ ] **Step 1: Expand the partial visual-review fixture**

In `partialProductionCommand`, change the second item from a known volume to an unknown volume:

```ts
{
  id: "77777777-7777-4777-8777-777777777777",
  position: 1,
  name: "Torta individual",
  kind: "manufacturing",
  costMode: "summarized",
  unitSalePriceCents: 3_500,
  monthlySalesVolume: null,
  productionUnitCostCents: 1_800,
},
```

This route is a development review surface; no persisted data changes.

- [ ] **Step 2: Run the complete report-focused suite**

Run:

```bash
pnpm vitest run src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-indicators.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-item-card.test.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-library.test.tsx src/modules/client-dashboard/to-dashboard-report-focus.test.ts src/modules/client-dashboard/components/dashboard-report-focus.test.tsx src/components/shared/metrics/metric-card.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Start the local development server on a fixed review port**

Run:

```bash
pnpm exec next dev --port 3100
```

Expected: Next.js serves `http://127.0.0.1:3100`. Keep this process running
while capturing the visual matrix.

- [ ] **Step 4: Capture the bounded visual verification matrix**

Capture these routes with headless Chrome:

```bash
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,1800 --screenshot=/tmp/report-complete-light-1440.png 'http://127.0.0.1:3100/visual-review?mode=report'
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1024,1400 --screenshot=/tmp/report-complete-light-1024.png 'http://127.0.0.1:3100/visual-review?mode=report'
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=390,844 --screenshot=/tmp/report-complete-light-390.png 'http://127.0.0.1:3100/visual-review?mode=report'
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-dark-mode --window-size=1440,1800 --screenshot=/tmp/report-complete-dark-1440.png 'http://127.0.0.1:3100/visual-review?mode=report'
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-dark-mode --window-size=390,844 --screenshot=/tmp/report-complete-dark-390.png 'http://127.0.0.1:3100/visual-review?mode=report'
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,1800 --screenshot=/tmp/report-partial-light-1440.png 'http://127.0.0.1:3100/visual-review?mode=partial-report'
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-dark-mode --window-size=1440,1800 --screenshot=/tmp/report-partial-dark-1440.png 'http://127.0.0.1:3100/visual-review?mode=partial-report'
```

Inspect all seven captures in one bounded pass. Verify:

- no empty desktop grid cell;
- no horizontal scroll at 390px or 1024px;
- warning values are readable in dark mode;
- badges are readable in both themes;
- calculated values outrank unavailable states;
- both isolated item references appear in the partial report;
- long item names wrap without clipping;
- persisted section cards do not appear in the current fixture.

Apply one batched correction if the captures expose defects, rerun the focused suite, and recapture only the affected viewport once. Stop visual polishing after that confirmation round.

- [ ] **Step 5: Run full repository validation**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: all four commands exit 0.

- [ ] **Step 6: Review the final diff for scope and accidental churn**

Run:

```bash
git diff --check
git status --short
git diff --stat
git diff -- src/modules/reports src/modules/client-dashboard src/components/ui/badge.tsx src/app/visual-review/page.tsx 'src/app/(private)/reports/[id]/page.tsx'
```

Expected: only the files named in this plan are changed, with no migrations, seed edits, generated artifacts, or unrelated formatting.

- [ ] **Step 7: Commit the visual fixture and any bounded verification correction**

```bash
git add src/app/visual-review/page.tsx
git add -u
git commit -m "test: cover report clarity scenarios"
```

Expected: a clean worktree after the commit.
