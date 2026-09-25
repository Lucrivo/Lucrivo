# Detailed Diagnosis Quick Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar o diagnóstico detalhado de Produto e Produção ao fluxo e ao relatório rápido, preservando apenas múltiplos itens, custos completos e comparação como diferenças.

**Architecture:** Campos equivalentes serão componentes controlados compartilhados, enquanto o estado e os cálculos rápido e detalhado continuarão separados. O contrato detalhado deixará de receber margem promocional, registrará a faixa interna de atenção de 20% e persistirá conteúdo de relatório no formato de leitura do rápido. A apresentação reutilizará os blocos do rápido para o resultado geral e manterá componentes próprios para itens, comparação e ficha técnica.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5.9, Zod 4, Base UI Accordion, Tailwind CSS 4, Supabase/PostgreSQL, Vitest, Testing Library e pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-24-detailed-diagnosis-quick-alignment-design.md`

## Global Constraints

- Não alterar textos, cálculos ou ordem do diagnóstico rápido; mudanças em seus componentes servem somente para extrair partes compartilhadas sem regressão.
- Produto detalhado continua somente para revenda; Produção detalhada continua com custo pronto ou ficha técnica; Serviço e Produto digital ficam fora.
- `promotionMarginRate`, `promotionMarginBasisPoints`, `promotion_margin_basis_points` e `promotionFloorCents` deixam de fazer parte do contrato detalhado.
- A regra interna é `DETAILED_ATTENTION_BAND_BASIS_POINTS = 2_000`: há atenção quando, depois do desconto, sobram menos de R$ 20 a cada R$ 100 vendidos.
- Gastos mensais pertencem ao resultado geral; não são distribuídos artificialmente entre os itens.
- Volume vazio, zero e positivo permanecem estados distintos; qualquer volume vazio impede totais gerais dependentes de todos os itens.
- O primeiro item do relatório começa aberto; os demais fechados. Itens do editor continuam fechados até edição, inclusão ou erro.
- A palavra `mix` não pode aparecer em texto visível. Identificadores internos e o valor técnico `unit = 'mix'` podem permanecer.
- Textos ao usuário ficam em português simples; termos técnicos aparecem apenas em ajuda opcional.
- Antes de alterar componentes Next.js, ler `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` e `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`.
- Antes do `pnpm supabase:reset`, confirmar por `pnpm exec supabase status` que o alvo é a stack local. O reset local descartará os relatórios de desenvolvimento conforme aprovado.
- Não sobrescrever alterações preexistentes em `docs/DETAILED-DIAGNOSIS.md`, `AGENTS.md`, `CLAUDE.md` nem imagens locais; mesclar somente as linhas relacionadas.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/modules/quick-diagnosis/components/shared/business-fields.tsx` | Campos comuns de gastos mensais, volume, valor do dono e taxas. |
| `src/modules/quick-diagnosis/components/shared/unit-value-fields.tsx` | Campos comuns de custo direto, custo de produção e preço de venda. |
| `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts` | Nova sequência do primeiro item, dados do negócio e itens adicionais. |
| `src/modules/detailed-diagnosis/components/steps/detailed-item-name-step.tsx` | Nome do item como diferença exclusiva do detalhado. |
| `src/modules/detailed-diagnosis/components/steps/detailed-item-volume-step.tsx` | Volume do item na mesma experiência do rápido. |
| `src/modules/detailed-diagnosis/types.ts` | Entrada, comando e resultados detalhados sem margem promocional. |
| `src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts` | Resultado unitário e menor preço por item. |
| `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.ts` | Totais mensais do conjunto de itens e faixa interna de 20%. |
| `src/modules/reports/domain/build-detailed-report-content.ts` | Resumo executivo e quatro seções do rápido adaptadas a vários itens. |
| `src/modules/reports/schemas/detailed-report-snapshot.schema.ts` | Snapshot detalhado atual, sem compatibilidade com o formato descartado. |
| `src/modules/reports/presenters/to-detailed-report-view-model.ts` | Modelo de leitura geral, itens, comparação e simuladores. |
| `src/modules/reports/components/detailed-report-detail.tsx` | Ordem final: resultado geral, itens, comparação e orientações. |
| `src/modules/reports/components/detailed-item-card.tsx` | Item destacado, detalhes agrupados e simulador próprio. |
| `src/modules/reports/components/report-list-card.tsx` | Cartão detalhado semanticamente igual ao rápido. |
| `src/modules/reports/components/detailed-report-editor-fields.tsx` | Editor detalhado com os mesmos nomes e ajudas do fluxo. |
| `supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql` | Contrato limpo de criação e armazenamento detalhado. |
| `supabase/migrations/20260918234830_report_lifecycle.sql` | Substituição de relatório detalhado usando o novo contrato. |
| `supabase/tests/detailed_diagnosis_reports.test.sql` | Segurança, validação e persistência do contrato limpo. |

---

### Task 1: Extract shared quick-diagnosis fields without changing behavior

**Files:**

- Create: `src/modules/quick-diagnosis/components/shared/business-fields.tsx`
- Create: `src/modules/quick-diagnosis/components/shared/unit-value-fields.tsx`
- Create: `src/modules/quick-diagnosis/components/shared/diagnosis-fields.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-fixed-expenses-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/monthly-volume-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/owner-compensation-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-fees-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-fixed-expenses-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/monthly-volume-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/owner-compensation-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-fees-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-values-step.tsx`
- Test: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`
- Test: `src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx`

**Interfaces:**

- Consumes: `StepField`, `PlainLanguageHelpContent` and controlled string/boolean values.
- Produces: `FieldBinding`, `FixedExpensesField`, `MonthlyVolumeField`, `OwnerCompensationFields`, `SalesFeesFields`, `ResalePurchaseCostField`, `ProductionUnitCostField`, and `UnitSalePriceField`.

- [ ] **Step 1: Add failing parity tests for the shared copy and help**

Create a controlled test harness and assert the exact quick-flow text:

```tsx
render(<FixedExpensesField {...binding("fixedMonthlyExpenses")} />);
expect(screen.getByLabelText("Gastos que existem todo mês")).toBeEnabled();
await user.click(screen.getByRole("button", { name: "O que incluir?" }));
expect(screen.getByText(/aluguel, energia, internet, sistemas/i)).toBeVisible();

render(<MonthlyVolumeField {...binding("monthlySalesVolume")} />);
expect(screen.getByText("Opcional")).toBeVisible();
expect(screen.getByText(/Digite 0 se não vendeu nenhuma unidade/)).toBeVisible();
```

Also assert the owner switch, its help, both fee labels, `Quanto você paga ao fornecedor por unidade?`, `Quanto custa produzir uma unidade?`, and `Por quanto você vende cada unidade?`.

- [ ] **Step 2: Run the new shared-field test and confirm failure**

Run:

```bash
pnpm exec vitest run src/modules/quick-diagnosis/components/shared/diagnosis-fields.test.tsx
```

Expected: FAIL because the shared exports do not exist.

- [ ] **Step 3: Implement controlled shared field bindings**

Use these public types; every component must pass its supplied `field` as the DOM id so nested detailed paths remain focusable:

```ts
type FieldBinding = {
  field: string;
  value: string;
  errors: Record<string, string[] | undefined>;
  onChange: (value: string) => void;
};

type OwnerCompensationFieldsProps = {
  switchId: string;
  included: boolean;
  amount: FieldBinding;
  onIncludedChange: (value: boolean) => void;
};

type SalesFeesFieldsProps = {
  tax: FieldBinding;
  card: FieldBinding;
};
```

`business-fields.tsx` owns the exact current quick copy and popovers. `unit-value-fields.tsx` owns only the three unit-value fields; packaging and technical-sheet fields remain detailed-only.

- [ ] **Step 4: Replace duplicated quick markup with thin adapters**

Keep every existing quick step export. Each wrapper maps its flat state into a binding:

```tsx
<FixedExpensesField
  field="fixedMonthlyExpenses"
  value={props.values.fixedMonthlyExpenses}
  errors={props.errors}
  onChange={(value) => props.onChange("fixedMonthlyExpenses", value)}
/>
```

Do not alter quick step arrays, validation, state, titles, navigation or submission payloads.

- [ ] **Step 5: Run all Product and Production quick-flow tests**

Run:

```bash
pnpm exec vitest run src/modules/quick-diagnosis/components/shared src/modules/quick-diagnosis/components/product src/modules/quick-diagnosis/components/production
```

Expected: PASS with unchanged accessible names and submitted values.

- [ ] **Step 6: Commit the shared field foundation**

```bash
git add src/modules/quick-diagnosis/components/shared src/modules/quick-diagnosis/components/product/steps src/modules/quick-diagnosis/components/production/steps
git commit -m "refactor: share product and production diagnosis fields"
```

---

### Task 2: Remove the configurable promotion margin from the detailed contract

**Files:**

- Modify: `src/modules/detailed-diagnosis/types.ts`
- Modify: `src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-fees-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`
- Modify: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts`
- Modify: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.test.ts`
- Modify: `src/modules/reports/schemas/detailed-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/components/detailed-report-editor-fields.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`
- Modify: `src/modules/reports/services/create-detailed-report.service.ts`
- Modify: `src/modules/reports/services/create-detailed-report.service.test.ts`
- Modify: `src/modules/reports/editor/report-editor.adapters.ts`
- Modify: `src/modules/reports/editor/report-editor.adapters.test.ts`
- Modify: `src/modules/reports/components/detailed-item-card.tsx`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.ts`
- Modify: `src/app/visual-review/page.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`
- Modify: `src/modules/reports/services/get-report.service.test.ts`
- Modify: `supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql`
- Modify: `supabase/migrations/20260918234830_report_lifecycle.sql`
- Modify: `supabase/tests/detailed_diagnosis_reports.test.sql`
- Modify generated: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: `taxRateBasisPoints`, `cardFeeRateBasisPoints`, and the constant `DETAILED_ATTENTION_BAND_BASIS_POINTS`.
- Produces: `DetailedDiagnosisInput` and `DetailedDiagnosisCommand` without promotion fields; snapshot policy `{ attentionBandBasisPoints: 2000, ... }`; item calculation without `promotionFloorCents`.

- [ ] **Step 1: Write failing schema and calculation tests for the clean contract**

Replace promotion assertions with:

```ts
expect(detailedDiagnosisSchema.parse(validInput)).not.toHaveProperty(
  "promotionMarginBasisPoints",
);

expect(
  detailedDiagnosisSchema.safeParse({
    ...validInput,
    promotionMarginRate: "15",
  }).success,
).toBe(false);

expect(calculateDetailedItem(item, rates)).toEqual(
  expect.not.objectContaining({ promotionFloorCents: expect.anything() }),
);
```

Update fixtures so `rates` contains only tax and card. Assert `DETAILED_ATTENTION_BAND_BASIS_POINTS` remains `2_000` and still classifies a final margin below 20% as `tight_margin`.

- [ ] **Step 2: Run focused domain tests and confirm failure**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts
```

Expected: FAIL on the old input, command, item result and snapshot policy.

- [ ] **Step 3: Remove the field through input, normalization and calculation**

Make the rate interface exact:

```ts
type DetailedItemRates = {
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};
```

Delete `promotionMarginRate` from `DetailedDiagnosisInput`, `promotionMarginBasisPoints` from `DetailedDiagnosisCommand`, and `promotionFloorCents` from `DetailedItemCalculation`. Delete its Zod schema and transform. Keep `breakEvenUnitPriceCents` based only on variable cost plus tax and card.

Remove the same field from the wizard default state, general-field union, phase paths, error routing, fees step, detailed editor and all action/component fixtures in this task. The fees step must temporarily contain only tax and card; Task 3 will replace its markup with the shared component.

- [ ] **Step 4: Replace the snapshot policy with the internal attention band**

The builder must persist:

```ts
policy: {
  attentionBandBasisPoints: DETAILED_ATTENTION_BAND_BASIS_POINTS,
  concentrationThresholdBasisPoints: 4_500,
  weeklyDivisorHundredths: 433,
  operatingDaysPerWeek: 6,
  proLaboreIncluded: command.proLaboreIncluded,
}
```

The strict snapshot schema must accept `attentionBandBasisPoints: z.literal(2_000)`, reject `promotionMarginBasisPoints`, recalculate results from inputs, and remove the promotion floor from item results. Remove the old promotion-price row from `DetailedItemCard`; Task 5 will replace it with the simulator.

- [ ] **Step 5: Change the local-only database contract in place**

In `20260917150000_create_detailed_diagnosis_reports.sql`:

- remove `detailed_diagnoses.promotion_margin_basis_points` and its check;
- remove `detailed_diagnosis_items.promotion_floor_cents`;
- remove `p_promotion_margin_basis_points` from private/public function signatures, calls, grants and snapshot comparisons;
- remove `promotionFloorCents` from JSON recordsets and inserts;
- validate `policy.attentionBandBasisPoints = '2000'`.

In `20260918234830_report_lifecycle.sql`, remove the same argument from `replace_detailed_diagnosis_report_v1` and its call. Keep the internal registry value `unit = 'mix'` because it is not user-facing and still distinguishes multi-item rows.

- [ ] **Step 6: Update pgTAP fixtures and rebuild the local schema**

First run:

```bash
pnpm exec supabase status
```

Expected: local URLs point to `127.0.0.1`. Then run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql supabase/tests/report_lifecycle.test.sql
pnpm supabase:types
```

Expected: PASS; generated RPC arguments and rows contain no promotion-margin parameter or column. Do not hand-edit `database.types.ts`.

- [ ] **Step 7: Update application persistence, editor adapters and fixtures**

Remove `p_promotion_margin_basis_points` from `toDetailedRpcArgs`, remove the field from editable-draft conversion, and update every detailed snapshot fixture. Add this exact service assertion:

```ts
expect(toDetailedRpcArgs(command, snapshot)).toMatchObject({
  p_tax_rate_basis_points: command.taxRateBasisPoints,
  p_card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
});
expect(toDetailedRpcArgs(command, snapshot)).not.toHaveProperty(
  "p_promotion_margin_basis_points",
);
```

- [ ] **Step 8: Run the complete contract slice**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/services/create-detailed-report.service.test.ts src/modules/reports/editor/report-editor.adapters.test.ts src/modules/reports/services/get-report.service.test.ts 'src/app/(private)/reports/[id]/page.test.tsx'
pnpm typecheck
```

Expected: PASS and no TypeScript reference to removed detailed promotion fields.

- [ ] **Step 9: Commit the clean-break contract**

```bash
git add src/modules/detailed-diagnosis src/modules/reports src/app/visual-review/page.tsx 'src/app/(private)/reports/[id]/page.test.tsx' supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql supabase/migrations/20260918234830_report_lifecycle.sql supabase/tests/detailed_diagnosis_reports.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "refactor: make detailed discount policy implicit"
```

---

### Task 3: Reorder the detailed wizard around the quick flow

**Files:**

- Create: `src/modules/detailed-diagnosis/components/steps/detailed-item-name-step.tsx`
- Create: `src/modules/detailed-diagnosis/components/steps/detailed-item-volume-step.tsx`
- Delete: `src/modules/detailed-diagnosis/components/steps/detailed-item-basics-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-fixed-expenses-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-owner-compensation-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-fees-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-product-costs-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-production-costs-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

**Interfaces:**

- Consumes: shared fields from Task 1 and clean input from Task 2.
- Produces: `DetailedWizardPhase = "itemName" | "itemValues" | "fixedExpenses" | "itemVolume" | "ownerCompensation" | "fees" | "itemComplete" | "review"` and `DetailedItemJourney = "first" | "additional" | "editing"`.

- [ ] **Step 1: Write reducer tests for first, additional and editing journeys**

Assert the exact first journey:

```ts
expect(phasesFrom(productState())).toEqual([
  "itemName",
  "itemValues",
  "fixedExpenses",
  "itemVolume",
  "ownerCompensation",
  "fees",
  "itemComplete",
  "review",
]);
```

After `addItem`, assert `itemName -> itemValues -> itemVolume -> itemComplete` without repeating business fields. After `editItem`, assert the same item-only journey and preservation of every other item.

- [ ] **Step 2: Run state tests and confirm the old order fails**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
```

Expected: FAIL because the current state begins with fixed expenses and combines name, price and volume.

- [ ] **Step 3: Implement state-aware navigation**

Replace static phase maps with pure functions:

```ts
function nextDetailedPhase(state: DetailedWizardState): DetailedWizardPhase {
  if (state.phase === "itemName") return "itemValues";
  if (state.phase === "itemValues")
    return state.itemJourney === "first" ? "fixedExpenses" : "itemVolume";
  if (state.phase === "fixedExpenses") return "itemVolume";
  if (state.phase === "itemVolume")
    return state.itemJourney === "first" ? "ownerCompensation" : "itemComplete";
  if (state.phase === "ownerCompensation") return "fees";
  if (state.phase === "fees") return "itemComplete";
  if (state.phase === "itemComplete") return "review";
  return "review";
}
```

Implement the inverse with the same journey distinction. Initial state uses `itemName` and `first`; `addItem` uses `additional`; `editItem` uses `editing`. Server-error routing sends name to `itemName`, sale/cost fields to `itemValues`, volume to `itemVolume`, and general fields to their own phase.

- [ ] **Step 4: Split item identity, values and volume**

`DetailedItemNameStep` renders only `Nome do produto` or `Nome da produção`. `DetailedProductCostsStep` and `DetailedProductionCostsStep` become the `itemValues` content and place the shared `UnitSalePriceField` alongside costs. `DetailedItemVolumeStep` uses the shared `MonthlyVolumeField` with nested id `items.{index}.monthlySalesVolume`.

For summarized Production use `ProductionUnitCostField`; for Product use `ResalePurchaseCostField`; packaging and technical sheet remain their current detailed-only controls.

- [ ] **Step 5: Replace common detailed markup with shared fields**

Map nested/general state without copying any labels:

```tsx
<SalesFeesFields
  tax={bindGeneral("taxRate")}
  card={bindGeneral("cardFeeRate")}
/>
```

Use the same pattern for fixed expenses and owner compensation. Delete all promotion-margin UI and the explanatory sentence about a promotional margin.

- [ ] **Step 6: Update wizard titles, progress and validation paths**

Use `totalSteps={10}` for the first journey with global positions 3 through 10. Item titles identify the current item, for example `Produto 2 · custos e preço`. Validate only the fields displayed in each phase. Back from the first `itemName` returns to modality; back from item review follows the active journey without losing data.

- [ ] **Step 7: Update interaction tests for exact order and shared copy**

Drive a Product and a Production journey through the UI. Assert cost and price appear before gastos mensais, volume after gastos mensais, and fees after owner compensation. Assert adding a second item never displays gastos mensais, owner compensation or fees again. Assert the submitted payload has no promotion field.

- [ ] **Step 8: Run wizard and quick regression tests**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/components src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx src/modules/quick-diagnosis/components/product src/modules/quick-diagnosis/components/production
```

Expected: PASS for keyboard focus, back navigation, multiple items, technical sheet and exact shared labels.

- [ ] **Step 9: Commit the aligned detailed flow**

```bash
git add src/modules/detailed-diagnosis/components src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
git commit -m "feat: align detailed diagnosis flow with quick diagnosis"
```

---

### Task 4: Build quick-style detailed report content

**Files:**

- Create: `src/modules/reports/domain/build-detailed-report-content.ts`
- Create: `src/modules/reports/domain/build-detailed-report-content.test.ts`
- Modify: `src/modules/detailed-diagnosis/types.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.test.ts`
- Modify: `src/modules/reports/schemas/detailed-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql`
- Modify: `supabase/tests/detailed_diagnosis_reports.test.sql`

**Interfaces:**

- Consumes: `DetailedDiagnosisCommand`, `DetailedDiagnosisCalculation`, quick `ReportExecutiveSummary` and `ReportSection` shapes.
- Produces: `buildDetailedReportContent(command, calculation): { executiveSummary: ReportExecutiveSummary; sections: [ReportSection, ReportSection, ReportSection, ReportSection] }`.

- [ ] **Step 1: Add failing aggregate tests for complete and partial reports**

For complete input, assert `monthlyFeeAmountCents`, `monthlyVariableCostCents`, `monthlyNetRevenueCents`, and `monthlyCostCents` equal the sums across every item. For any missing volume, assert all four are `null` with the other consolidated totals.

- [ ] **Step 2: Add failing content tests for the quick hierarchy**

Assert exact structure and stable keys:

```ts
expect(content.executiveSummary).toMatchObject({
  headline: "Seus produtos dão lucro?",
  answers: [
    { key: "profitability", question: "Estou ganhando dinheiro?" },
    { key: "price_sufficiency", question: "Meus preços pagam os gastos?" },
    { key: "immediate_action", question: "O que preciso fazer agora?" },
  ],
});
expect(content.sections.map((section) => section.key)).toEqual([
  "break_even",
  "hidden_cost",
  "margin_diagnosis",
  "sales_goal",
]);
```

Production uses `Suas produções dão lucro?`. Partial content must say what is missing and must not format a known-subset total as the business result.

- [ ] **Step 3: Run content and calculation tests and confirm failure**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/reports/domain/build-detailed-report-content.test.ts
```

Expected: FAIL because aggregate cost fields and the content builder do not exist.

- [ ] **Step 4: Calculate aggregate amounts only in the domain**

Extend `DetailedDiagnosisCalculation` with four nullable fields. For a complete report, sum item fee and variable cost multiplied by volume; derive net revenue and total monthly cost with integer helpers. For a partial report, return `null`. The presenter must never perform these financial calculations.

- [ ] **Step 5: Build the executive summary and four sections**

Use the same headings and questions as the current Product/Production quick builders wherever they remain true. Adapt only singular/plural and the second fact from one price to:

```ts
{
  key: "price",
  currentLabel: "Faturamento atual",
  currentValue: optionalCurrency(calculation.monthlyGrossRevenueCents),
  referenceLabel: "Quanto precisa vender para cobrir os gastos",
  referenceValue: optionalCurrency(calculation.breakEvenRevenueCents),
}
```

The four sections are `Seus menores preços sem prejuízo`, `O que sai das vendas`, `Quanto sobra no mês`, and `Quanto você precisa vender`. The first points to exact item values; the last expresses a revenue amount, never an invented unit count.

- [ ] **Step 6: Persist and validate report content**

Add `executiveSummary` and four ordered `sections` to the detailed snapshot. Import `reportExecutiveSummarySchema` and `reportSectionSchema`; validate exact section-key order. Keep versions `1/1/1` because the local data is reset and no compatibility branch is required.

Update SQL shape validation to require an executive-summary object and a four-entry sections array. Extend pgTAP fixtures with valid content and add one rejection case for missing sections.

- [ ] **Step 7: Run snapshot, content and database tests**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/reports/domain/build-detailed-report-content.test.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/schemas/report-snapshot.schema.test.ts
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql
```

Expected: PASS for complete/partial values, content order, strict snapshot parsing and SQL payload rejection.

- [ ] **Step 8: Commit the detailed report content**

```bash
git add src/modules/detailed-diagnosis src/modules/reports/domain src/modules/reports/schemas supabase/migrations/20260917150000_create_detailed_diagnosis_reports.sql supabase/tests/detailed_diagnosis_reports.test.sql
git commit -m "feat: add quick-style detailed report content"
```

---

### Task 5: Compose the new detailed report and per-item simulators

**Files:**

- Delete: `src/modules/reports/components/detailed-business-summary.tsx`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/detailed-item-card.tsx`
- Create: `src/modules/reports/components/detailed-item-card.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Modify: `src/modules/reports/components/detailed-item-breakdown.tsx`

**Interfaces:**

- Consumes: `ReportExecutiveSummary`, four persisted sections, detailed inputs/results and `attentionBandBasisPoints: 2_000`.
- Produces: a detailed view model containing quick-compatible `executiveSummary`, `numbers`, `sections`, plus item `discountSimulationBase`; `DiscountSimulationContext.mode` gains `detailed_item_attention`.

- [ ] **Step 1: Write presenter tests for the full result model**

Assert numbers include revenue, monthly costs, monthly result, amount left per R$ 100 and break-even revenue. Assert each item provides:

```ts
expect(viewModel.items[0].discountSimulationBase).toEqual({
  originalPriceCents: 5_000,
  unitCostCents: 2_200,
  totalFeeBasisPoints: 0,
  attentionBandBasisPoints: 2_000,
  minimumPriceCents: 2_200,
  partial: true,
});
```

`partial: true` here means the simulator intentionally uses direct sale costs only; its displayed copy is controlled by `detailed_item_attention` and must not claim that sales volume is missing.

- [ ] **Step 2: Write failing component tests for order and expansion**

Render two items and assert:

```tsx
expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
expect(secondTrigger).toHaveAttribute("aria-expanded", "false");
expect(itemsHeading.compareDocumentPosition(comparisonHeading)).toBe(
  Node.DOCUMENT_POSITION_FOLLOWING,
);
expect(within(firstItem).getByTestId("discount-simulator")).toBeVisible();
```

Also assert the executive summary questions, `Seus números`, all four analysis headings, and the explanation that monthly expenses remain in the general result.

- [ ] **Step 3: Run presenter and component tests and confirm failure**

```bash
pnpm exec vitest run src/modules/reports/presenters/to-detailed-report-view-model.test.ts src/modules/reports/components/detailed-item-card.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/discount-simulator.test.tsx
```

Expected: FAIL on missing quick blocks, simulator context, order and initial expansion.

- [ ] **Step 4: Build the quick-compatible detailed view model**

Extend `ReportNumberViewModel["key"]` with `revenue`, `costs`, `result`, and `break_even`; existing quick keys and rendering remain unchanged.

Export the quick component view-model types from `to-report-view-model.ts`. In the detailed presenter, map persisted summary/sections to those types and add tone labels from the current unit language profile. Produce numbers without recalculation; use `Ainda não calculado` plus a short reason for partial results.

Each item receives category, monthly contribution label, grouped display values and its simulator base. Remove `promotionFloorLabel` and every promotional-floor field.

- [ ] **Step 5: Add the detailed-item simulator mode**

Extend the context union:

```ts
type DiscountSimulationContext = {
  category: "service" | "product" | "production";
  mode:
    | "legacy_target"
    | "service_attention"
    | "unit_attention"
    | "detailed_item_attention";
};
```

Use the existing calculation and 20% margin comparison. For the new mode, display: `Esta simulação considera os gastos desta venda. Os gastos mensais permanecem no resultado geral.` Keep loss and limit messages in plain language.

- [ ] **Step 6: Rebuild the item card around clear groups**

The trigger shows name, price, `Quanto este item deixa no mês` when known, and status. The open panel groups sale, sale costs, minimum price, monthly contribution, simulator and technical sheet. Add `data-open:border-primary/35`, a subtle open background and stronger shadow to `AccordionItem`; retain text and icon in every state.

- [ ] **Step 7: Compose the final report order using quick components**

In `DetailedReportDetail`, render `ReportExecutiveSummary`, then the quick two-column `ReportNumbers` plus `ReportSectionCard` list, then `Item por item`, then `DetailedItemBreakdown`, then guidance. Set:

```tsx
<Accordion
  multiple
  defaultValue={viewModel.items[0] ? [viewModel.items[0].id] : []}
  className="grid gap-4"
>
```

Delete `DetailedBusinessSummary` after its final import is removed.

- [ ] **Step 8: Run report presentation tests**

```bash
pnpm exec vitest run src/modules/reports/presenters src/modules/reports/components/detailed-item-card.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/report-numbers.test.tsx
```

Expected: PASS with the quick components unchanged for quick snapshots.

- [ ] **Step 9: Commit the report composition**

```bash
git add src/modules/reports
git commit -m "feat: expand detailed report insights by item"
```

---

### Task 6: Align report identity and remove user-facing “mix” copy

**Files:**

- Modify: `src/modules/reports/presenters/report-language.ts`
- Modify: `src/modules/reports/presenters/report-language.test.ts`
- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`
- Modify: `src/modules/quick-diagnosis/components/product/steps/analysis-mode-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/analysis-mode-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx`

**Interfaces:**

- Consumes: `OwnedReportSummary.analysisMode`, category, scenario, verdict and item count.
- Produces: detailed library card with category + scenario + verdict, title `Análise de produtos` or `Análise de produções`, and `{n} itens analisados`.

- [ ] **Step 1: Rewrite failing library expectations**

For a complete detailed Product report assert `Produto`, `Revenda`, `Análise de produtos`, `3 itens analisados` and the same `Lucro` verdict badge used by current quick unit reports. Assert absence of `Diagnóstico detalhado`, `Completo`, `Parcial`, and `Resultado do mix`. For partial input assert `Falta informar as vendas` and no monthly total.

- [ ] **Step 2: Run library and language tests and confirm failure**

```bash
pnpm exec vitest run src/modules/reports/components/report-library.test.tsx src/modules/reports/presenters/report-language.test.ts
```

Expected: FAIL on the old special badges and title.

- [ ] **Step 3: Reuse current unit verdict language for detailed summaries**

Extend the language identity with optional `analysisMode`. When it is `detailed` and category is Product or Production, return the current unit profile. Pass `analysisMode` from `ReportListCard` and use the shared verdict presentation map instead of completeness badges.

- [ ] **Step 4: Align card and report-header identity**

Detailed cards use category and `scenarioLabels[report.scenario]`, a verdict badge, category-aware title, and item-count metadata. The report header uses category and scenario badges; remove its `Diagnóstico detalhado` badge. Completeness remains explained in the report body through the verdict, not a separate flag.

- [ ] **Step 5: Replace every visible “mix” sentence**

Use `resultado geral`, `conjunto de itens` or `todos os itens` in guidance, presenter fallbacks and mode descriptions. Keep calculation property names and the database unit unchanged. Add rendered assertions:

```tsx
expect(screen.queryByText(/\bmix\b/i)).not.toBeInTheDocument();
```

for detailed report, library card, Product mode and Production mode.

- [ ] **Step 6: Run identity and copy tests**

```bash
pnpm exec vitest run src/modules/reports/components/report-library.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/presenters src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx
```

Expected: PASS with no user-facing `mix` and unchanged quick-card behavior.

- [ ] **Step 7: Commit semantic report identity**

```bash
git add src/modules/reports src/modules/detailed-diagnosis/domain src/modules/quick-diagnosis/components/product/steps src/modules/quick-diagnosis/components/production/steps
git commit -m "fix: align detailed report identity and language"
```

---

### Task 7: Align detailed report editing with the new fields

**Files:**

- Modify: `src/modules/reports/components/detailed-report-editor-fields.tsx`
- Modify: `src/modules/reports/components/detailed-editor-item.tsx`
- Modify: `src/modules/reports/components/detailed-editor-item.test.tsx`
- Modify: `src/modules/reports/components/report-editor.test.tsx`
- Modify: `src/modules/reports/editor/report-editor.adapters.test.ts`
- Modify: `src/modules/reports/editor/calculate-report-preview.test.ts`
- Modify: `src/modules/reports/actions/save-report-edit.action.test.ts`
- Modify: `src/modules/reports/services/replace-report.service.test.ts`

**Interfaces:**

- Consumes: shared fields from Task 1, clean `DetailedDiagnosisInput`, current detailed snapshot preview.
- Produces: direct editor with matching labels/help, no promotion field, items closed initially, new items opened, invalid items opened and focused.

- [ ] **Step 1: Add failing editor parity tests**

Assert that the business section has the exact wizard labels and help for gastos mensais, owner compensation and fees. Assert no field named `Margem mínima para promoção (%)`. Within an opened item, assert exact shared price, cost and optional-volume copy.

Keep existing expectations that all saved items start closed, a newly added item opens, and the first invalid item opens and focuses its exact nested id.

- [ ] **Step 2: Run editor tests and confirm failure**

```bash
pnpm exec vitest run src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/report-editor.test.tsx src/modules/reports/editor/report-editor.adapters.test.ts
```

Expected: FAIL on old abbreviated labels and missing shared help.

- [ ] **Step 3: Use shared fields for business values**

Render `FixedExpensesField`, `OwnerCompensationFields`, and `SalesFeesFields` inside the existing business section. Bind them to root fields and preserve `proLaboreIncluded` independently instead of deriving it only from non-empty text.

- [ ] **Step 4: Use shared unit fields inside items**

Use `UnitSalePriceField`, `MonthlyVolumeField`, `ResalePurchaseCostField`, and `ProductionUnitCostField` with nested ids. Keep name, packaging, cost mode, recipe, loss and ingredients in `DetailedEditorItem` because they are detailed-only.

- [ ] **Step 5: Verify preview, replace and copy save paths**

Update action/service fixtures to the clean command and snapshot. Assert invalid input preserves the draft, replace passes the new RPC shape, and copy creates a new report without a promotion argument.

- [ ] **Step 6: Run the complete editing slice**

```bash
pnpm exec vitest run src/modules/reports/components/report-editor.test.tsx src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/editor src/modules/reports/actions/save-report-edit.action.test.ts src/modules/reports/services/replace-report.service.test.ts
```

Expected: PASS for preview, focus, retry, replacement and copy.

- [ ] **Step 7: Commit editor alignment**

```bash
git add src/modules/reports/components/detailed-report-editor-fields.tsx src/modules/reports/components/detailed-editor-item.tsx src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/report-editor.test.tsx src/modules/reports/editor src/modules/reports/actions/save-report-edit.action.test.ts src/modules/reports/services/replace-report.service.test.ts
git commit -m "feat: align detailed report editing fields"
```

---

### Task 8: Update documentation, visual fixtures and run full verification

**Files:**

- Modify carefully: `docs/DETAILED-DIAGNOSIS.md`
- Modify: `src/app/visual-review/page.tsx`
- Modify as required by final fixtures: `src/app/(private)/reports/[id]/page.test.tsx`
- Modify as required by final fixtures: `src/modules/reports/services/get-report.service.test.ts`
- Modify generated: `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: every completed task and the approved spec.
- Produces: current functional documentation, representative complete and partial visual fixtures, deterministic generated database types, and a clean verification report.

- [ ] **Step 1: Update functional documentation without overwriting local edits**

Inspect `git diff -- docs/DETAILED-DIAGNOSIS.md` first. Merge the new flow, removed field, internal 20% attention rule, general/item calculation boundary, report order, item expansion and library language into the current document. Remove obsolete statements about a user-chosen promotional margin or comparison preceding item details.

- [ ] **Step 2: Refresh visual-review fixtures**

Provide at least one complete multi-item Product report and one partial technical-sheet Production report using the current snapshot builder. The visual page must exercise the first-open item, simulator, quick-style summary, item-before-comparison order and long item names at desktop and mobile widths. Do not overwrite the untracked PNG files already in the workspace.

- [ ] **Step 3: Scan for obsolete contract and visible language**

Run:

```bash
rg -n "promotionMarginRate|promotionMarginBasisPoints|promotion_margin_basis_points|promotionFloorCents" src supabase
rg -n "Margem mínima para simular promoções|Margem mínima para promoção|Resultado do mix|resultado do mix" src --glob '*.{ts,tsx}'
```

Expected: the first command returns no detailed-contract occurrence; the second returns no obsolete visible copy. Internal identifiers such as `mixContributionMarginBasisPoints`, CSS `color-mix`, SQL `unit = 'mix'`, and test descriptions may remain.

- [ ] **Step 4: Rebuild and test the local database**

Confirm local target, then run:

```bash
pnpm exec supabase status
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:types
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

Expected: all database tests and lint pass; the second type generation is deterministic and leaves no new diff.

- [ ] **Step 5: Run the full application checks**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

Expected: every command exits successfully.

- [ ] **Step 6: Perform the final responsive and keyboard review**

Run `pnpm dev`, open `/visual-review`, and inspect at approximately 390 px, 1024 px and 1440 px. Verify no horizontal scrolling, first report item open, readable collapsed triggers, visible focus, keyboard expansion, simulator range announcements, item details before comparison, and no meaning conveyed by color alone.

- [ ] **Step 7: Commit documentation and final verification fixtures**

```bash
git add docs/DETAILED-DIAGNOSIS.md src/app/visual-review/page.tsx 'src/app/(private)/reports/[id]/page.test.tsx' src/modules/reports/services/get-report.service.test.ts src/infrastructure/database/supabase/database.types.ts
git commit -m "docs: finalize detailed diagnosis alignment"
```

Do not add `AGENTS.md`, `CLAUDE.md`, or existing untracked PNG files unless the user separately requests them.
