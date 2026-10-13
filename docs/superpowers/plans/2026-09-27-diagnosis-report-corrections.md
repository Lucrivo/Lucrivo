# Diagnosis and Report Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir Produto digital no diagnóstico detalhado, iniciar Produção com custo resumido, destacar a quantidade necessária de vendas, corrigir a edição atômica de relatórios detalhados e tornar cards e remoções mais claros e seguros.

**Architecture:** O cenário de Produto será uma escolha única compartilhada por todos os itens e reaproveitará os controles do fluxo rápido; o snapshot detalhado V1 será ampliado de forma compatível para `digital`. A meta detalhada será derivada em leitura a partir do conjunto persistido, sem mudar a versão do snapshot. A persistência será corrigida por uma nova migração imperativa que mantém o RPC público e libera a chave única do registro staged dentro da mesma transação.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 5.9, Zod 4, Tailwind CSS 4, Base UI, Supabase/PostgreSQL, Vitest, Testing Library e pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-27-diagnosis-report-corrections-design.md`

## Global Constraints

- Preservar relatórios detalhados V1 existentes; não criar uma nova versão do snapshot para esta extensão.
- Um diagnóstico detalhado de Produto é inteiramente `resale` ou inteiramente `digital`; nunca misturar os dois tipos.
- Produto digital usa `purchaseUnitCost` como custo direto por venda e mantém `packagingUnitCost` exatamente em zero no contrato normalizado; embalagem não aparece nem participa do cálculo.
- Produção nova começa em `summarized`; relatórios existentes mantêm o `costMode` salvo.
- A meta detalhada só é numérica quando todos os volumes são conhecidos, o volume total é positivo e a contribuição mensal total é positiva.
- Usar `BigInt` e `ceilDivide` para evitar perda de precisão na fórmula `ceil(F * V / C)`.
- Não duplicar a meta de vendas no resumo executivo.
- Remoção de item ou ingrediente preenchido exige diálogo; tooltip não substitui rótulo acessível.
- Manter as assinaturas dos RPCs públicos, acesso pago, propriedade, locking, versão otimista, `id` e `created_at` do relatório original.
- Criar migração somente com `pnpm exec supabase migration new`; não editar migrações históricas.
- Antes de comandos Supabase, confirmar por `pnpm exec supabase status` que o alvo é local. Não executar reset.
- Antes de alterar componentes Next.js, ler `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` e `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`.
- Antes da etapa visual, carregar a skill `impeccable`, aplicar o craft floor pertinente e executar seu detector uma única vez sobre todos os arquivos de interface alterados.
- Preservar mudanças preexistentes; conferir `git status --short` antes de cada commit e adicionar somente arquivos da tarefa.

---

### Task 1: Share Product scenario and direct-cost controls

**Files:**

- Create: `src/modules/quick-diagnosis/components/shared/product-fields.tsx`
- Create: `src/modules/quick-diagnosis/components/shared/product-fields.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx`
- Test: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`

**Interfaces:**

```ts
type ProductKindFieldProps = {
  field: string;
  value: string;
  error?: string;
  onChange: (value: ProductKind) => void;
};

type ProductDirectCostFieldProps = FieldBinding & {
  kind: ProductKind;
};
```

- [ ] **Step 1: Write failing tests for the shared Product fields**

Assert that `ProductKindField` exposes the accessible group `Tipo de produto`, both `Produto para revenda` and `Produto digital`, propagates only valid `ProductKind` values, and associates `field-error` through `aria-describedby`. Assert that `ProductDirectCostField` keeps the current resale label and the current digital label/help/optional copy.

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

```bash
pnpm exec vitest run src/modules/quick-diagnosis/components/shared/product-fields.test.tsx
```

Expected: FAIL because `product-fields.tsx` does not exist.

- [ ] **Step 3: Implement the controlled shared components**

Move `productKindLabels`, the `RadioGroup`, and the digital direct-cost `StepField` from `ProductValuesStep`. Reuse `ResalePurchaseCostField` for resale. Keep exact current copy, ids, error semantics, card states, and keyboard behavior.

- [ ] **Step 4: Convert `ProductValuesStep` to a thin adapter**

It must render `ProductKindField`; after a valid choice, render `ProductDirectCostField` and `UnitSalePriceField`. Do not change quick wizard state, schema, step order, or payload.

- [ ] **Step 5: Run shared and quick Product tests**

```bash
pnpm exec vitest run src/modules/quick-diagnosis/components/shared/product-fields.test.tsx src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx
```

Expected: PASS with unchanged quick-flow text and behavior.

- [ ] **Step 6: Commit the shared foundation**

```bash
git add src/modules/quick-diagnosis/components/shared/product-fields.tsx src/modules/quick-diagnosis/components/shared/product-fields.test.tsx src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx
git commit -m "refactor: share product scenario fields"
```

---

### Task 2: Extend the detailed domain and default Production to summarized cost

**Files:**

- Modify: `src/modules/detailed-diagnosis/types.ts`
- Modify: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts`
- Modify: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`

**Interfaces:**

```ts
type DetailedProductItemInput = DetailedItemBaseInput & {
  kind: ProductKind;
  purchaseUnitCost: string;
  packagingUnitCost: string;
};

type DetailedProductItem = DetailedItemBase & {
  kind: ProductKind;
  purchaseUnitCostCents: number;
  packagingUnitCostCents: number;
};
```

- [ ] **Step 1: Add failing schema cases for Digital and a uniform Product scenario**

Cover valid digital input with empty, zero, and positive direct cost; expect normalized packaging to be zero. Cover rejection of mixed `resale`/`digital`, Product with `manufacturing`, Production with a Product kind, and an unexpected digital packaging value after normalization.

- [ ] **Step 2: Add failing domain cases for digital cost**

Assert that a digital item's `variableUnitCostCents` equals only `purchaseUnitCostCents`; a resale item still adds purchase plus packaging; Production remains unchanged.

- [ ] **Step 3: Add failing reducer cases for the Production default**

Assert the first Production item and every item created by `addItem` use `costMode: "summarized"`. Switching an existing summarized item to `technical_sheet` must leave it with one editable blank ingredient; switching back must not erase filled technical-sheet values.

- [ ] **Step 4: Run focused tests and record the expected failures**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
```

Expected: FAIL on the literal `resale`, mixed-kind validation, digital calculation, and `technical_sheet` default.

- [ ] **Step 5: Expand types and schemas compatibly**

Import `ProductKind` from `quick-diagnosis/types`. Change detailed Product item unions to accept both Product kinds. In schema normalization, set digital `packagingUnitCostCents` to `0` regardless of the hidden input and add one collection-level issue when Product kinds differ. Keep strict objects and all existing numeric bounds.

- [ ] **Step 6: Implement digital calculation and the summarized default**

In `calculateDetailedItem`, branch explicitly among `digital`, `resale`, and `manufacturing`; never let digital fall into Production. Set `blankProductionItem.costMode` to `summarized`. Retain a blank ingredient internally for a later switch to the technical sheet, but set `pendingIngredientNameId` only when technical-sheet entry is visible.

- [ ] **Step 7: Run the focused suite and commit**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis
git add src/modules/detailed-diagnosis/types.ts src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/detailed-diagnosis/components/detailed-wizard-state.ts src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
git commit -m "feat: support digital detailed products"
```

---

### Task 3: Add the Product scenario step to the detailed wizard

**Files:**

- Create: `src/modules/detailed-diagnosis/components/steps/detailed-product-kind-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-product-costs-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-item-complete-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx`

**State contract:**

```ts
type DetailedWizardPhase =
  | "productKind"
  | "itemName"
  | "itemValues"
  | "fixedExpenses"
  | "itemVolume"
  | "ownerCompensation"
  | "fees"
  | "itemComplete"
  | "review";

type DetailedWizardState = {
  productKind: ProductKind | "";
  productKindError: string | null;
  // existing members stay unchanged
};
```

- [ ] **Step 1: Add failing navigation and invariance tests**

Product must begin in `productKind`; attempting `next` without a choice keeps the phase and sets an error. Choosing a kind updates every Product item, entering an additional item skips scenario choice, and going back from the first name returns to it. Production still begins at `itemName`.

- [ ] **Step 2: Add failing UI tests for Digital wording**

Select `Produto digital`, advance, and assert the cost step shows `Existe algum gasto a cada venda?`, does not show supplier or packaging copy, and keeps the chosen kind after back/forward navigation. Assert resale keeps supplier and packaging fields.

- [ ] **Step 3: Run wizard tests and confirm failure**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx
```

- [ ] **Step 4: Implement the reducer transition**

Add `setProductKind`. It accepts only `ProductKind`, assigns that kind to every Product item, zeroes each digital `packagingUnitCost`, and clears the local kind error. `createBlankItem` receives the selected kind so later items cannot diverge. Keep server field errors separate from this pre-schema step error.

- [ ] **Step 5: Render and route the new step**

`DetailedProductKindStep` wraps `ProductKindField`. Update phase title, progress count, `nextDetailedPhase`, `previousDetailedPhase`, back behavior, current field paths, and focus routing. Product has one extra step; Production progress is unchanged.

- [ ] **Step 6: Adapt Product item cost and summary steps**

Use `ProductDirectCostField` for both Product kinds. Render packaging only for resale. In the completion summary, label digital cost as direct cost per sale and never use Production or supplier terminology.

- [ ] **Step 7: Run the detailed wizard suite and commit**

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/components
git add src/modules/detailed-diagnosis/components/steps/detailed-product-kind-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-product-costs-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-item-complete-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx src/modules/detailed-diagnosis/components/detailed-wizard-state.ts src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx
git commit -m "feat: choose detailed product scenario"
```

---

### Task 4: Carry Digital through snapshots, reports, and the editor

**Files:**

- Modify: `src/modules/reports/schemas/detailed-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-content.test.ts`
- Modify: `src/modules/reports/editor/report-editor.adapters.ts`
- Modify: `src/modules/reports/editor/report-editor.adapters.test.ts`
- Modify: `src/modules/reports/components/detailed-report-editor-fields.tsx`
- Modify: `src/modules/reports/components/detailed-editor-item.tsx`
- Modify: `src/modules/reports/components/detailed-editor-item.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Test: `src/modules/reports/components/report-list-card.tsx`
- Test: `src/modules/reports/components/report-library.test.tsx`

- [ ] **Step 1: Add failing snapshot compatibility tests**

Keep an existing resale V1 fixture passing. Add a digital V1 fixture whose `scenario` and every Product item kind are `digital`. Reject a scenario/item mismatch, mixed Product items, and manufacturing under Product.

- [ ] **Step 2: Add failing adapter and editor tests**

Round-trip a digital snapshot through `toDetailedReportEditValues` and `toDetailedDiagnosisCommand`. Assert a new editor item inherits digital, direct cost remains editable, packaging is absent, and scenario cannot be switched in the editor.

- [ ] **Step 3: Run the focused reports suite and confirm failure**

```bash
pnpm exec vitest run src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/editor/report-editor.adapters.test.ts src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/report-library.test.tsx
```

- [ ] **Step 4: Extend the V1 schema without weakening consistency checks**

Let the Product item schema use `z.enum(productKinds)` and the snapshot scenario accept `digital`. For Product, derive `expectedScenario` from the first input item, require it to be `resale` or `digital`, and require every item and `snapshot.scenario` to match. Require `packagingUnitCostCents === 0` for Digital. For Production, require `manufacturing`. Continue recalculating results and checking item order/ids.

- [ ] **Step 5: Build and edit the correct scenario**

`buildDetailedReportSnapshot` derives Product scenario from the first validated item. In adapters, handle `digital` before the manufacturing branch and force packaging to `"0"`/`0`. In `newItem`, receive the existing Product kind; never default a digital report back to resale.

- [ ] **Step 6: Render Digital copy in report/editor surfaces**

Treat `item.kind !== "manufacturing"` as Product where appropriate, then branch direct-cost labels by Product kind. Reuse `formatReportScenario`/existing `Produto digital` library copy. Ensure no digital screen mentions embalagem, fornecedor, ficha técnica, or fabricação.

- [ ] **Step 7: Run reports tests and commit**

```bash
pnpm exec vitest run src/modules/reports
git add src/modules/reports/schemas/detailed-report-snapshot.schema.ts src/modules/reports/schemas/report-snapshot.schema.test.ts src/modules/reports/domain/build-detailed-report-snapshot.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/domain/build-detailed-report-content.test.ts src/modules/reports/editor/report-editor.adapters.ts src/modules/reports/editor/report-editor.adapters.test.ts src/modules/reports/components/detailed-report-editor-fields.tsx src/modules/reports/components/detailed-editor-item.tsx src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx src/modules/reports/components/report-list-card.tsx src/modules/reports/components/report-library.test.tsx
git commit -m "feat: persist digital detailed reports"
```

---

### Task 5: Calculate and feature the required sales quantity

**Files:**

- Create: `src/modules/reports/domain/calculate-detailed-sales-goal.ts`
- Create: `src/modules/reports/domain/calculate-detailed-sales-goal.test.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/report-numbers.tsx`
- Modify: `src/modules/reports/components/report-numbers.test.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`

**Domain contract:**

```ts
type DetailedSalesGoal =
  | { available: true; monthly: number; weekly: number; daily: number }
  | { available: false; reason: string };

function calculateDetailedSalesGoal(
  inputs: CurrentDetailedReportSnapshot["inputs"],
  results: CurrentDetailedReportSnapshot["results"],
  policy: Pick<
    CurrentDetailedReportSnapshot["policy"],
    "weeklyDivisorHundredths" | "operatingDaysPerWeek"
  >,
): DetailedSalesGoal;
```

- [ ] **Step 1: Write failing pure calculation tests**

Use a case with `F = 10_000`, `V = 10`, and `C = 10_000`; expect monthly `10`, weekly `3` from `ceil(10 * 100 / 433)`, and daily `1`. Add non-divisible rounding. Freeze these unavailable reasons:

- missing item volume: `Informe as vendas mensais de todos os itens para calcular.`;
- total volume zero: `Informe uma quantidade vendida maior que zero para calcular.`;
- null, zero, or negative contribution: `As vendas informadas não deixam valor suficiente para calcular uma meta.`.

Also cover `F = 0`, which produces zero monthly, weekly, and daily units.

- [ ] **Step 2: Run the new domain test and confirm failure**

```bash
pnpm exec vitest run src/modules/reports/domain/calculate-detailed-sales-goal.test.ts
```

- [ ] **Step 3: Implement deterministic integer arithmetic**

Sum known volumes and use the already calculated monthly contribution. Return unavailable before division when `results.isPartial`, `V <= 0`, or `C <= 0`. Calculate monthly with:

```ts
ceilDivide(
  BigInt(results.effectiveFixedCostCents) * BigInt(totalVolume),
  BigInt(results.monthlyContributionCents),
);
```

Then use policy `433` and `6` for weekly/daily rounding.

- [ ] **Step 4: Add failing presenter-order tests**

For detailed reports, expect `numbers[0].key === "sales"`, `Unidades necessárias no mês`, and supporting text `Estimativa mantendo a mesma proporção de vendas entre os itens.` plus weekly/daily reference. For each unavailable condition, expect the sales surface to remain first with `Indisponível` and its reason. For current quick Product, Production, and Service snapshots, expect `sales` first; legacy snapshot ordering stays unchanged.

- [ ] **Step 5: Prepend the sales entry in current presenters**

Detailed Product and Production both use units because this is the combined item count. Reorder, rather than duplicate, existing quick `sales` entries. Do not add sales entries to legacy shapes that do not contain the metric.

- [ ] **Step 6: Add failing component tests for the featured surface**

Assert the first `sales` term/value is wrapped by a dedicated identifiable region such as `data-slot="featured-report-number"`, all other values remain in the ordinary list, and the semantic `dl`/`dt`/`dd` structure is intact.

- [ ] **Step 7: Style the featured sales surface**

Give `sales` its own bordered, softly tinted block at the top of `Seus números`, with strong numeric hierarchy and readable supporting copy. Use existing theme tokens (`border-primary/20`, `bg-primary/5`, `text-primary`) and preserve contrast in dark mode.

- [ ] **Step 8: Run presenter/component tests and commit**

```bash
pnpm exec vitest run src/modules/reports/domain/calculate-detailed-sales-goal.test.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx
git add src/modules/reports/domain/calculate-detailed-sales-goal.ts src/modules/reports/domain/calculate-detailed-sales-goal.test.ts src/modules/reports/presenters/to-detailed-report-view-model.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts src/modules/reports/presenters/to-report-view-model.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-numbers.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx
git commit -m "feat: feature required sales quantity"
```

---

### Task 6: Align item cards and protect destructive actions

**Files:**

- Create: `src/components/shared/confirm-removal-button.tsx`
- Create: `src/components/shared/confirm-removal-button.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/ingredients/ingredient-card.tsx`
- Modify: `src/modules/detailed-diagnosis/components/ingredients/ingredient-card.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-item-complete-step.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`
- Modify: `src/modules/reports/components/detailed-editor-item.tsx`
- Modify: `src/modules/reports/components/detailed-editor-item.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-editor-fields.tsx`
- Modify: `src/modules/reports/components/report-editor.test.tsx`

**Reusable control:**

```ts
type ConfirmRemovalButtonProps = {
  ariaLabel: string;
  tooltip: string;
  disabled?: boolean;
  disabledReason?: string;
  title: string;
  description: string;
  confirmLabel: "Remover item" | "Remover ingrediente";
  onConfirm: () => void;
};
```

- [ ] **Step 1: Write failing interaction tests for the reusable removal control**

Clicking the trash trigger opens a named alert dialog and does not call `onConfirm`. `Cancelar` closes it, preserves data, and restores trigger focus. The destructive action calls once. Keyboard activation works. A disabled trigger exposes `disabledReason` through a wrapper tooltip without making the disabled button focusable or clickable.

- [ ] **Step 2: Run the new test and confirm failure**

```bash
pnpm exec vitest run src/components/shared/confirm-removal-button.test.tsx
```

- [ ] **Step 3: Implement the controlled AlertDialog + Tooltip control**

Use a neutral ghost button at rest and destructive foreground/background on hover, `focus-visible`, and active states. Keep a visible focus ring. Name both the target and consequence in the dialog. On cancel/close, use the dialog primitive's focus restoration; test the behavior rather than adding arbitrary timeouts.

- [ ] **Step 4: Add failing integration tests for item and ingredient removal**

In both wizard and report editor, assert neither removal mutates state before confirmation. Cancel preserves values; confirm removes exactly the selected item/ingredient. Preserve the existing wizard item-removal confirmation while bringing its trigger styling/tooltip into parity.

- [ ] **Step 5: Add failing layout tests for the item-card summary**

Assert desktop summary has explicit slots for name, sale, cost, and status before the independent remove control. Use stable `data-slot` markers, not Tailwind-class-only assertions. Assert a long name is truncated visually but its full text is available in an accessible tooltip.

- [ ] **Step 6: Fix the card structure**

Change the desktop inner grid to four explicit columns, for example `sm:grid-cols-[minmax(10rem,1fr)_auto_auto_auto]`. Keep sale and cost non-wrapping, badge in the fourth slot, and the delete button outside the accordion trigger. On mobile, stack name, financial summary, and status while maintaining separate expand/remove targets.

- [ ] **Step 7: Replace immediate removals**

Use `ConfirmRemovalButton` in `IngredientCard` and `DetailedEditorItem`. Supply the specific item/ingredient name. When only one item/ingredient must remain, keep the action disabled and explain why. Do not add a second confirmation to report deletion or admin user deletion, which already have their own dialogs.

- [ ] **Step 8: Run UI interaction tests and commit**

```bash
pnpm exec vitest run src/components/shared/confirm-removal-button.test.tsx src/modules/detailed-diagnosis/components/ingredients/ingredient-card.test.tsx src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/report-editor.test.tsx
git add src/components/shared/confirm-removal-button.tsx src/components/shared/confirm-removal-button.test.tsx src/modules/detailed-diagnosis/components/ingredients/ingredient-card.tsx src/modules/detailed-diagnosis/components/ingredients/ingredient-card.test.tsx src/modules/detailed-diagnosis/components/steps/detailed-item-complete-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx src/modules/reports/components/detailed-editor-item.tsx src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/detailed-report-editor-fields.tsx src/modules/reports/components/report-editor.test.tsx
git commit -m "fix: align item cards and confirm removals"
```

---

### Task 7: Fix detailed report replacement and persist Digital safely

**Files:**

- Modify: `supabase/tests/detailed_diagnosis_reports.test.sql`
- Create with CLI: the exact `supabase/migrations/` path printed by `supabase migration new add_detailed_digital_and_fix_report_edit`
- Regenerate if changed: `src/infrastructure/database/supabase/database.types.ts`

- [ ] **Step 1: Confirm local database target and discover CLI syntax**

```bash
pnpm exec supabase status
pnpm exec supabase migration new --help
pnpm exec supabase migration up --help
```

Expected: local API/DB URLs are shown. Stop if the target is not the local stack.

- [ ] **Step 2: Add a failing pgTAP regression for detailed replacement**

Create a detailed resale report, create its staged replacement with a different submission UUID, call `replace_detailed_diagnosis_report_v1`, and assert `lives_ok`. Then assert original diagnosis id and `created_at` are preserved, version increments once, snapshot/normalized children come from staged, and the staged diagnosis/tree no longer exists.

- [ ] **Step 3: Add failing pgTAP cases for Digital persistence**

Create a digital detailed report and assert `diagnoses.scenario = 'digital'`, every detailed item has `kind = 'digital'`, and direct cost/zero packaging persist. Assert mixed resale/digital payloads and snapshot mismatches raise SQLSTATE `22023`. Keep paid-access and ownership setup identical to existing tests.

- [ ] **Step 4: Run the pgTAP file and confirm both failures**

```bash
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql
```

Expected before migration: the kind constraint/create validation rejects Digital and the replacement hits `detailed_diagnoses_user_submission_key`.

- [ ] **Step 5: Generate the imperative migration**

```bash
pnpm exec supabase migration new add_detailed_digital_and_fix_report_edit
```

Use the exact path printed by the CLI for all subsequent `git add` commands. Do not modify `20260917150000_create_detailed_diagnosis_reports.sql`, `20260918234830_report_lifecycle.sql`, or `20260925235525_reconcile_detailed_diagnosis_schema.sql`.

- [ ] **Step 6: Extend current table constraints**

Drop/recreate the named item-kind and source-shape checks so Product accepts `resale` and `digital`, Production remains `manufacturing`, and digital uses Product columns with non-negative direct cost and zero packaging. Preserve `NOT VALID`/validation order if the current constraint definitions use it.

- [ ] **Step 7: Replace the private creation implementation**

Copy the current effective definition of `private.create_detailed_diagnosis_report_impl` from the latest migration, then make only scenario validation changes: Product accepts one uniform `resale` or `digital` kind matching `p_report_snapshot->>'scenario'`; Production requires `manufacturing`. Keep signature, `security definer`, empty `search_path`, transaction behavior, exception SQLSTATEs, revokes, and grants unchanged.

- [ ] **Step 8: Replace the private staged-replacement implementation**

Copy the current effective definition of `private.replace_owned_diagnosis_from_staged_v1_impl`. In the detailed branch, after deleting the target detail children/parent and before inserting the replacement parent, free the staged unique key inside the same locked transaction:

```sql
update public.detailed_diagnoses
set submission_id = target.submission_id
where diagnosis_id = p_staged_id
  and user_id = caller_id;
```

Insert the target detailed parent explicitly with the validated submission id still held by the staged main `diagnoses` row, copy items/ingredients, delete the staged tree, and update the main target row as before. Preserve lock order and all lifecycle invariants.

- [ ] **Step 9: Apply locally and run database verification**

```bash
pnpm exec supabase migration up --local
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all tests pass; lint/advisors report no new errors or warnings attributable to this migration.

- [ ] **Step 10: Regenerate types, review the diff, and commit**

```bash
pnpm supabase:types
git diff -- src/infrastructure/database/supabase/database.types.ts
git status --short
git add supabase/tests/detailed_diagnosis_reports.test.sql
git add src/infrastructure/database/supabase/database.types.ts
git commit -m "fix: replace detailed reports atomically"
```

Before committing, add the one exact migration path printed in Step 5 as a separate `git add` argument. If generated types are byte-for-byte unchanged, omit that file from `git add`.

---

### Task 8: Complete documentation and visual verification

**Files:**

- Modify: `PRODUCT.md`
- Modify: `docs/DETAILED-DIAGNOSIS.md`
- Modify: `docs/superpowers/specs/2026-09-27-diagnosis-report-corrections-design.md`
- Verify: all UI files changed in Tasks 1, 3, 4, 5, and 6

- [ ] **Step 1: Update product documentation**

Document the single Product scenario choice, digital direct cost, zero/hidden packaging, summarized Production default, proportional detailed sales goal and its unavailable conditions, report-edit replacement behavior, and confirmation coverage. Change spec status to `Aprovado`.

- [ ] **Step 2: Run a visible-copy regression search**

```bash
rg -n "fornecedor|embalagem|ficha técnica|fabricação" src/modules/detailed-diagnosis src/modules/reports
```

Review every match and prove it is either resale/production-only or hidden from Digital. Do not mechanically remove valid copy.

- [ ] **Step 3: Run the impeccable detector once over the complete UI change set**

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json src/components/shared/confirm-removal-button.tsx src/modules/quick-diagnosis/components/shared/product-fields.tsx src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-product-kind-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-product-costs-step.tsx src/modules/detailed-diagnosis/components/steps/detailed-item-complete-step.tsx src/modules/detailed-diagnosis/components/ingredients/ingredient-card.tsx src/modules/reports/components/detailed-editor-item.tsx src/modules/reports/components/report-numbers.tsx
```

Fix only findings relevant to this scope, then rerun the affected focused tests rather than rerunning the detector.

- [ ] **Step 4: Perform desktop and mobile visual review**

Run `pnpm dev` and inspect the Product detailed choice/cost steps, a digital report editor, `Seus números`, and `Itens do diagnóstico` at 1440×900 and 390×844. Verify long names, long currency values, zero and multiple pending items, disabled removal, tooltip, dialog focus, dark theme, and no horizontal overflow. Record screenshots under `.playwright-mcp/` when the configured browser inspection tool is available.

- [ ] **Step 5: Commit docs and visual-only corrections**

```bash
git add PRODUCT.md docs/DETAILED-DIAGNOSIS.md docs/superpowers/specs/2026-09-27-diagnosis-report-corrections-design.md
git commit -m "docs: document detailed report corrections"
```

When visual inspection required a correction, add each corrected file by its exact path before the commit. Do not add `.playwright-mcp` artifacts unless the repository already tracks the corresponding review assets.

---

### Task 9: Run full gates and audit the delivered contract

**Files:**

- Verify: all files changed by Tasks 1–8

- [ ] **Step 1: Run all application tests**

```bash
pnpm test
```

Expected: all Vitest suites pass without unhandled errors.

- [ ] **Step 2: Run static quality gates**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

If formatting fails, run `pnpm format`, review only mechanical changes, and rerun the three commands.

- [ ] **Step 3: Rerun database acceptance tests after the full application changes**

```bash
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql
pnpm supabase:lint
pnpm supabase:advisors
```

- [ ] **Step 4: Audit spec coverage**

Check each acceptance criterion in the approved spec against at least one automated test or the recorded visual review: Digital create/read/edit, summarized Production default, sales-goal success/unavailable states, paid detailed replacement, aligned card, confirmation/cancel, accessibility, and resale backward compatibility.

- [ ] **Step 5: Scan for placeholders and temporary debugging**

```bash
rg -n "TODO|FIXME|HACK|console\.log\(" src supabase docs PRODUCT.md
```

Expected: no placeholders introduced by this plan and no temporary `console.log(result)` in `report-editor.tsx`. Existing unrelated matches must be documented, not silently changed.

- [ ] **Step 6: Review final diff and commit any gate-only fixes**

```bash
git status --short
git diff --check
git diff --stat
```

If gates required code changes, rerun their focused tests and commit them with a scoped message. Finish with a clean worktree and report the migration filename, focused/full test results, database results, and any consciously deferred issue.
