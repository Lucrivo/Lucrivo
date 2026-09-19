# Detailed Diagnosis Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a validação e transformar o fluxo detalhado em uma experiência de preenchimento, edição e leitura progressiva, clara e eficiente em desktop e celular.

**Architecture:** O schema continua como fonte única de validação e os cálculos e snapshots permanecem inalterados. Componentes controlados de ingrediente serão compartilhados entre criação e edição; o editor receberá a prévia detalhada para resumir itens recolhidos; um apresentador puro converterá o snapshot detalhado em linguagem e hierarquia de leitura sem recalcular ou persistir conteúdo novo.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, Base UI Accordion/Popover, Tailwind CSS 4, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-19-detailed-diagnosis-experience-design.md`

## Global Constraints

- O desktop é o principal contexto de uso; o celular deve manter todas as informações e ações sem rolagem horizontal.
- Não alterar fórmulas financeiras, dados persistidos nem versões do snapshot detalhado `1/1/1`.
- Texto vazio no custo unitário é inválido; o valor explícito `0` é válido no campo, mas o custo total da receita deve permanecer positivo.
- Todos os itens do editor começam recolhidos, inclusive o primeiro; vários itens podem ficar abertos simultaneamente.
- O UUID permanece técnico; o nome é o identificador visual e acessível do ingrediente.
- Estados devem usar texto e ícone além de cor; controles devem funcionar por teclado e preservar foco visível.
- Reutilizar `Accordion`, `PlainLanguageHelp`, `Badge`, `Card`, `Button` e os campos existentes antes de criar novos primitivos.
- Textos apresentados ao cliente permanecem em português brasileiro; identificadores de código permanecem em inglês.
- Antes de editar UI, carregar o contexto e o craft floor do skill `impeccable`; executar o detector uma única vez ao final sobre todos os arquivos visuais alterados.

## File Structure

| Path                                                                              | Responsibility                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts`             | Distinguir custo vazio, zero e formato inválido; manter erro agregado da receita.    |
| `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`              | Criar nomes padrão e controlar a etapa inicial de nome do ingrediente.               |
| `src/modules/detailed-diagnosis/components/ingredients/ingredient-name-entry.tsx` | Entrada compacta e acessível do nome.                                                |
| `src/modules/detailed-diagnosis/components/ingredients/ingredient-card.tsx`       | Cartão recolhível, renomeação, resumo e três campos técnicos.                        |
| `src/modules/detailed-diagnosis/components/steps/ingredient-fields.tsx`           | Orquestrar coleção, erro agregado, inclusão, confirmação e cancelamento no wizard.   |
| `src/modules/reports/editor/detailed-editor-summary.ts`                           | Derivar resumo, situação e pendências de cada item sem recalcular finanças.          |
| `src/modules/reports/components/detailed-editor-item.tsx`                         | Item recolhível do editor e adaptação dos ingredientes compartilhados.               |
| `src/modules/reports/components/detailed-report-editor-fields.tsx`                | Orquestrar dados gerais, accordion de itens e foco em erros.                         |
| `src/modules/reports/components/report-editor.tsx`                                | Entregar prévia detalhada e sinalizar tentativas inválidas.                          |
| `src/modules/reports/presenters/to-detailed-report-view-model.ts`                 | Converter snapshot em linguagem simples, prioridade, métricas e detalhes formatados. |
| `src/modules/reports/components/detailed-business-summary.tsx`                    | Conclusão, ação prioritária e números principais.                                    |
| `src/modules/reports/components/detailed-item-breakdown.tsx`                      | Comparação dos itens em linguagem cotidiana.                                         |
| `src/modules/reports/components/detailed-item-card.tsx`                           | Resumo recolhido e detalhes de cada item.                                            |
| `src/modules/reports/components/detailed-guidance-list.tsx`                       | Orientações secundárias sem competir com a prioridade.                               |
| `src/modules/reports/components/detailed-report-detail.tsx`                       | Compor a nova ordem de leitura do relatório.                                         |
| `docs/DETAILED-DIAGNOSIS.md`                                                      | Registrar as regras e a experiência final.                                           |

---

### Task 1: Correct ingredient cost validation and error routing

**Files:**

- Modify: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts`
- Modify: `src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/ingredient-fields.tsx`

**Interfaces:**

- Consumes: `scaledInteger(value, 4)`, `validateDetailedDiagnosisPaths(paths,input)`.
- Produces: erro de campo em `items.{itemIndex}.ingredients.{ingredientIndex}.unitCost` e erro agregado em `items.{itemIndex}.ingredients`.

- [ ] **Step 1: Write failing schema tests for blank, explicit zero, format, and aggregate cost**

Add focused assertions that inspect exact paths and messages instead of only `success: false`:

```ts
const blankCost = detailedDiagnosisSchema.safeParse({
  ...validTechnicalSheetInput,
  items: [
    {
      ...production,
      ingredients: [{ ...production.ingredients[0], unitCost: "   " }],
    },
  ],
});
expect(blankCost.success).toBe(false);
if (blankCost.success) throw new Error("expected invalid ingredient cost");
expect(blankCost.error.issues).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      path: ["items", 0, "ingredients", 0, "unitCost"],
      message:
        "Informe o custo unitário. Se este ingrediente não tiver custo, digite 0.",
    }),
  ]),
);

expect(
  validateDetailedDiagnosisPaths(["items.0.ingredients"], {
    ...validTechnicalSheetInput,
    items: [
      {
        ...production,
        ingredients: [
          { ...production.ingredients[0], unitCost: "0" },
          {
            ...production.ingredients[0],
            id: "44444444-4444-4444-8444-444444444444",
            unitCost: "1",
          },
        ],
      },
    ],
  }),
).not.toHaveProperty("items.0.ingredients.0.unitCost");
```

Also assert that all-zero ingredients return exactly `A receita precisa ter pelo menos um ingrediente com custo maior que zero.` at `items.0.ingredients`, and that `1,12345` keeps the four-decimal format error.

- [ ] **Step 2: Run the schema tests and verify the blank-cost assertion fails**

Run:

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts
```

Expected: FAIL because the existing decimal helper converts blank text to zero and the aggregate copy differs.

- [ ] **Step 3: Add a required scaled-string schema without changing optional decimal behavior**

Keep `scaledInteger` unchanged. Add a schema dedicated to the ingredient cost:

```ts
const ingredientUnitCostSchema = z.string().superRefine((value, context) => {
  if (value.trim() === "") {
    context.addIssue({
      code: "custom",
      message:
        "Informe o custo unitário. Se este ingrediente não tiver custo, digite 0.",
    });
    return;
  }
  try {
    scaledInteger(value, 4);
  } catch {
    context.addIssue({
      code: "custom",
      message:
        "Informe um custo unitário válido com até quatro casas decimais.",
    });
  }
});
```

Use it in `detailedIngredientInputSchema.unitCost`. Change only the aggregate message to `A receita precisa ter pelo menos um ingrediente com custo maior que zero.`. Do not change normalization or calculation code.

- [ ] **Step 4: Write the failing focus-routing test for an aggregate ingredient error**

In the wizard test, return a server error at `items.0.ingredients`, submit from review, and assert focus reaches the ingredient group alert:

```tsx
expect(
  await screen.findByRole("alert", {
    name: "Erro nos ingredientes",
  }),
).toHaveFocus();
```

- [ ] **Step 5: Route collection errors to a stable focus target**

Give the aggregate error element `id="items.0.ingredients"`, `tabIndex={-1}`, `role="alert"`, and `aria-label="Erro nos ingredientes"`. The existing wizard focus logic can then resolve both field and collection paths through `document.getElementById(path)`.

- [ ] **Step 6: Run validation and wizard tests**

Run:

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the validation correction**

```bash
git add src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.ts src/modules/detailed-diagnosis/schemas/detailed-diagnosis.schema.test.ts src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx src/modules/detailed-diagnosis/components/steps/ingredient-fields.tsx
git commit -m "fix: explain required ingredient costs"
```

---

### Task 2: Build the progressive ingredient flow

**Files:**

- Create: `src/modules/detailed-diagnosis/components/ingredients/ingredient-name-entry.tsx`
- Create: `src/modules/detailed-diagnosis/components/ingredients/ingredient-name-entry.test.tsx`
- Create: `src/modules/detailed-diagnosis/components/ingredients/ingredient-card.tsx`
- Create: `src/modules/detailed-diagnosis/components/ingredients/ingredient-card.test.tsx`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.ts`
- Modify: `src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts`
- Modify: `src/modules/detailed-diagnosis/components/steps/ingredient-fields.tsx`
- Modify: `src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/shared/step-field.tsx`

**Interfaces:**

- Consumes: `DetailedIngredientInput`, `DetailedDiagnosisFieldErrors`, `StepField`, `Accordion`.
- Produces: `pendingIngredientNameId: string | null` in `DetailedWizardState`; actions `confirmIngredientName` and `cancelIngredientName`; controlled `IngredientNameEntry` and `IngredientCard`.

- [ ] **Step 1: Write reducer tests for names and pending-name state**

Update the production-state assertions and cover addition, confirmation and cancellation:

```ts
expect(productionState()).toMatchObject({
  pendingIngredientNameId: "ingredient-1",
  values: { items: [{ ingredients: [{ name: "Ingrediente 1" }] }] },
});

let state = detailedWizardReducer(productionState(), {
  type: "confirmIngredientName",
  itemId: "item-1",
  ingredientId: "ingredient-1",
});
expect(state.pendingIngredientNameId).toBeNull();

state = detailedWizardReducer(state, {
  type: "addIngredient",
  itemId: "item-1",
  createId: () => "ingredient-2",
});
expect(state.pendingIngredientNameId).toBe("ingredient-2");
expect(
  (state.values.items[0] as DetailedProductionItemInput).ingredients[1].name,
).toBe("Ingrediente 2");
```

Assert `cancelIngredientName` removes a new second ingredient, while canceling the only ingredient keeps it and restores `Ingrediente 1` as the pending name.

- [ ] **Step 2: Run reducer tests and verify failure**

Run:

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts
```

Expected: FAIL because the state and actions do not exist.

- [ ] **Step 3: Implement deterministic default names and reducer actions**

Change the helper to accept the visible position:

```ts
function blankIngredient(
  id: string,
  position: number,
): DetailedIngredientInput {
  return {
    id,
    name: `Ingrediente ${position + 1}`,
    quantity: "",
    unit: "",
    unitCost: "",
  };
}
```

Add `pendingIngredientNameId` to state. `addIngredient` uses the current length as position and sets the new ID as pending. `confirmIngredientName` clears pending only when `name.trim()` is non-empty. `cancelIngredientName` removes the pending ingredient when siblings exist; for the only ingredient, restore the default and keep it pending. Clear obsolete errors below the affected ingredient path.

- [ ] **Step 4: Write failing component tests for name-first entry and named cards**

Cover these interactions:

```tsx
expect(screen.getByLabelText("Nome do ingrediente")).toHaveValue(
  "Ingrediente 1",
);
expect(screen.queryByLabelText("Quantidade usada")).not.toBeInTheDocument();
await user.click(
  screen.getByRole("button", { name: "Continuar com Ingrediente 1" }),
);
expect(dispatch).toHaveBeenCalledWith({
  type: "confirmIngredientName",
  itemId: "item-1",
  ingredientId: "ingredient-1",
});
```

For `IngredientCard`, assert the heading uses `Farinha`, its body has only `Quantidade usada`, `Unidade de compra`, and `Custo por unidade de compra`, and `Renomear Farinha` opens an inline name field without changing the other controlled values. Also clear the rename field and assert `Informe um nome.` appears locally; canceling must restore `Farinha` without calling `onChange`.

- [ ] **Step 5: Implement `IngredientNameEntry`**

Use a controlled text `Input`, not a dialog. Its props are:

```ts
type IngredientNameEntryProps = {
  id: string;
  value: string;
  error?: string;
  canCancel: boolean;
  onChange: (value: string) => void;
  onContinue: () => void;
  onCancel: () => void;
};
```

On the first focus, call `event.currentTarget.select()`. Submit through a `<form>` so Enter continues. Keep `Continuar` and `Cancelar` at least 44 px high on mobile and give the error `role="alert"`.

- [ ] **Step 6: Extend `StepField` for text input mode and implement `IngredientCard`**

Change `StepFieldProps.inputMode` to `React.HTMLAttributes<HTMLInputElement>["inputMode"]`. `IngredientCard` receives:

```ts
type IngredientCardProps = {
  ingredient: DetailedIngredientInput;
  basePath: string;
  errors: DetailedDiagnosisFieldErrors;
  canRemove: boolean;
  defaultOpen?: boolean;
  onChange: (field: DetailedIngredientTextField, value: string) => void;
  onRemove: () => void;
};
```

Use an `Accordion` with `defaultValue={defaultOpen ? [ingredient.id] : []}`. Keep the rename button separate from `AccordionTrigger`. Render a pending badge when quantity, unit, or unit cost is blank or has an error. Use the ingredient name in remove and rename accessible labels.

Renaming uses a local draft. `Salvar nome` trims and sends the value through `onChange("name", value)` only when non-empty; otherwise it shows `Informe um nome.`. `Cancelar` discards the local draft and restores the controlled name.

- [ ] **Step 7: Replace the repeated ingredient grid with the progressive collection**

In `IngredientFields`, render `IngredientNameEntry` for `state.pendingIngredientNameId` and `IngredientCard` for confirmed siblings. Display `state.fieldErrors[items.${itemIndex}.ingredients]` above the collection with the stable focus ID from Task 1. `Adicionar ingrediente` dispatches the existing action and lets the reducer generate `Ingrediente N`.

- [ ] **Step 8: Run component and detailed-flow tests**

Run:

```bash
pnpm exec vitest run src/modules/detailed-diagnosis/components/detailed-wizard-state.test.ts src/modules/detailed-diagnosis/components/ingredients src/modules/detailed-diagnosis/components/steps/detailed-steps.test.tsx src/modules/detailed-diagnosis/components/detailed-diagnosis-wizard.test.tsx
```

Expected: PASS with creation, keyboard submit, rename, cancel, minimum-one and accessible errors covered.

- [ ] **Step 9: Commit the progressive ingredient flow**

```bash
git add src/modules/detailed-diagnosis/components src/modules/quick-diagnosis/components/shared/step-field.tsx
git commit -m "feat: streamline detailed ingredients"
```

---

### Task 3: Collapse detailed editor items with useful summaries

**Files:**

- Create: `src/modules/reports/editor/detailed-editor-summary.ts`
- Create: `src/modules/reports/editor/detailed-editor-summary.test.ts`
- Create: `src/modules/reports/components/detailed-editor-item.tsx`
- Create: `src/modules/reports/components/detailed-editor-item.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-editor-fields.tsx`
- Modify: `src/modules/reports/components/report-editor.tsx`
- Modify: `src/modules/reports/components/report-editor.test.tsx`

**Interfaces:**

- Consumes: `DetailedDiagnosisInput`, current or last-valid `CurrentDetailedReportSnapshot`, current `fieldErrors`.
- Produces: `buildDetailedEditorItemSummary(item,index,preview,errors): DetailedEditorItemSummary`; `DetailedReportEditorFields` props `previewSnapshot` and `revealErrorsSignal`.

- [ ] **Step 1: Write summary tests for valid, loss, and invalid items**

Define the result contract in the test:

```ts
expect(buildDetailedEditorItemSummary(item, 0, snapshot, {})).toEqual({
  name: "Bolo de festa",
  priceLabel: "R$ 150,00",
  costLabel: expect.stringMatching(/^R\$/),
  status: { label: "Deixa valor por venda", tone: "positive" },
  pendingCount: 0,
});

expect(
  buildDetailedEditorItemSummary(item, 0, snapshot, {
    "items.0.unitSalePrice": ["Inválido"],
    "items.0.ingredients.0.unitCost": ["Obrigatório"],
  }),
).toMatchObject({
  status: { label: "Revise os campos", tone: "warning" },
  pendingCount: 2,
});
```

Also assert `directLoss` produces `Perda por venda` and that summary values come from the supplied preview rather than a new calculation.

- [ ] **Step 2: Implement the pure summary builder**

Find the result by `item.id`, count unique error keys below `items.${index}`, and format price/cost through `formatCurrency`. The status precedence is current errors, direct loss, then positive contribution. Do not import a calculator.

- [ ] **Step 3: Write failing editor interaction tests**

Using a detailed draft with two items, assert:

```tsx
expect(screen.queryByLabelText("Preço de venda (R$)")).not.toBeInTheDocument();
expect(
  screen.getByRole("button", { name: /Abrir Bolo de festa/i }),
).toHaveAttribute("aria-expanded", "false");
await user.click(screen.getByRole("button", { name: /Abrir Bolo de festa/i }));
expect(screen.getByLabelText("Preço de venda (R$)")).toBeVisible();
```

Open both item triggers and assert both panels remain visible. Add an item and assert only its ID joins the controlled accordion value. On an invalid save, assert the first invalid item opens and its field receives focus.

- [ ] **Step 4: Implement `DetailedEditorItem`**

Render one `AccordionItem` with a trigger containing the summary name, status badge, price, cost and pending count. Put remove in a sibling control outside the trigger. The expanded body owns item basics, product costs or production fields, using the ingredient components from Task 2 for technical sheets.

Use this prop boundary:

```ts
type DetailedEditorItemProps = {
  item: DetailedDiagnosisInput["items"][number];
  index: number;
  errors: Record<string, string[]>;
  summary: DetailedEditorItemSummary;
  canRemove: boolean;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
};
```

- [ ] **Step 5: Turn the item list into a controlled multiple accordion**

In `DetailedReportEditorFields`, start with `const [expandedItemIds,setExpandedItemIds] = useState<string[]>([])` and render:

```tsx
<Accordion multiple value={expandedItemIds} onValueChange={setExpandedItemIds}>
  {values.items.map((item, index) => (
    <DetailedEditorItem
      key={item.id}
      item={item}
      index={index}
      {...itemProps}
    />
  ))}
</Accordion>
```

Change `newItem` to receive an ID. Generate the ID before adding a new item, append the item, then append the ID to `expandedItemIds`. When removing, filter only that ID. Pass the current preview snapshot to `buildDetailedEditorItemSummary`.

`DetailedEditorItem` keeps a local pending ingredient-name ID. Adding an ingredient or changing an empty summarized production to `technical_sheet` creates `Ingrediente N` and opens `IngredientNameEntry`; confirming reveals its card and canceling removes the newly added row. Existing saved ingredients start as recolhidos `IngredientCard` instances.

- [ ] **Step 6: Open and focus the first invalid item only after a save attempt**

Add `revealErrorsSignal: number` to `DetailedReportEditorFields`. When it changes, find the first path matching `^items\.(\d+)\.`; add that item ID to the open list and focus `document.getElementById(path)` in `requestAnimationFrame`. Keep root errors focused through the existing summary.

In `ReportEditor`, increment the signal when `submit()` sees an invalid detailed preview. Narrow `preview.snapshot.analysisMode === "detailed"` before passing it as `previewSnapshot`.

- [ ] **Step 7: Run editor tests**

Run:

```bash
pnpm exec vitest run src/modules/reports/editor/detailed-editor-summary.test.ts src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/report-editor.test.tsx src/modules/reports/editor/use-report-preview.test.tsx
```

Expected: PASS; existing quick-editor tests remain unchanged.

- [ ] **Step 8: Commit the collapsed editor**

```bash
git add src/modules/reports/editor src/modules/reports/components/detailed-editor-item.tsx src/modules/reports/components/detailed-editor-item.test.tsx src/modules/reports/components/detailed-report-editor-fields.tsx src/modules/reports/components/report-editor.tsx src/modules/reports/components/report-editor.test.tsx
git commit -m "feat: collapse detailed report editor items"
```

---

### Task 4: Create the detailed report presentation model

**Files:**

- Create: `src/modules/reports/presenters/to-detailed-report-view-model.ts`
- Create: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`

**Interfaces:**

- Consumes: `{ id: number; createdAt: string; snapshot: CurrentDetailedReportSnapshot }`.
- Produces: `DetailedReportViewModel` containing `identity`, `conclusion`, `priority`, `metrics`, `comparison`, `items`, and `secondaryGuidance`.

- [ ] **Step 1: Write presenter tests for four decision states**

Build deterministic snapshots for complete positive, partial, direct-loss and nonpositive-margin scenarios. Assert wording and unchanged values:

```ts
const model = toDetailedReportViewModel({ id: 168, createdAt, snapshot });
expect(model.conclusion).toMatchObject({
  title: "O mix cobre os gastos com folga",
  completenessLabel: "Análise completa",
});
expect(model.priority.title).toBeTruthy();
expect(model.metrics.map((metric) => metric.label)).toEqual([
  "Quanto entrou com as vendas",
  "Quanto sobrou ou faltou no mês",
  "Quanto precisa vender para cobrir os gastos",
]);
expect(model.items[0].rawValues).toEqual({
  unitSalePriceCents: snapshot.inputs.items[0].unitSalePriceCents,
  variableUnitCostCents: snapshot.results.items[0].variableUnitCostCents,
});
```

For partial reports, expect `Informe as vendas mensais para calcular` instead of a bare `Indisponível`. For null item price references caused by rates, expect `As taxas informadas impedem este cálculo.`.

- [ ] **Step 2: Define explicit view-model types**

Use these stable shapes:

```ts
type DetailedMetricViewModel = {
  key: "revenue" | "monthly_result" | "break_even_revenue";
  label: string;
  valueLabel: string;
  unavailableReason?: string;
  tone: "neutral" | "positive" | "warning" | "critical";
  help?: PlainLanguageHelpContent;
};

type DetailedItemViewModel = {
  id: string;
  name: string;
  volumeLabel: string;
  statusLabel: string;
  statusTone: "positive" | "critical";
  priceLabel: string;
  costLabel: string;
  surplusLabel: string;
  marginLabel: string;
  breakEvenLabel: string;
  breakEvenUnavailableReason?: string;
  promotionFloorLabel: string;
  promotionFloorUnavailableReason?: string;
  technicalDetails: DetailedTechnicalDetailsViewModel | null;
  rawValues: { unitSalePriceCents: number; variableUnitCostCents: number };
};

type DetailedTechnicalDetailsViewModel = {
  modeLabel: "Custo total informado" | "Ficha técnica completa";
  yieldAndLossLabel?: string;
  ingredients: Array<{
    id: string;
    name: string;
    quantityLabel: string;
    unitCostLabel: string;
  }>;
  additionalCostsLabel?: string;
};

type DetailedComparisonEntryViewModel = {
  id: string;
  name: string;
  amountCents: number;
  amountLabel: string;
  contextLabel: "por unidade" | "no mês";
  statusLabel: string;
  tone: "positive" | "critical";
};

type DetailedReportViewModel = {
  identity: {
    title: string;
    categoryLabel: string;
    createdAtLabel: string;
    reportLabel: string;
  };
  conclusion: {
    title: string;
    description: string;
    completenessLabel: "Análise completa" | "Análise parcial";
    tone: "neutral" | "positive" | "warning" | "critical";
  };
  priority: {
    title: string;
    body: string;
    tone: DetailedMetricViewModel["tone"];
  };
  metrics: DetailedMetricViewModel[];
  comparison: DetailedComparisonEntryViewModel[];
  items: DetailedItemViewModel[];
  secondaryGuidance: Array<{
    key: string;
    title: string;
    body: string;
    tone: DetailedMetricViewModel["tone"];
  }>;
};
```

Keep comparison entries formatted and ordered, but include the numeric `amountCents` for bar width. Export only types consumed by components.

- [ ] **Step 3: Implement language mappings without recalculation**

Map snapshot verdicts to conclusion copy and map guidance `key`, `tone`, `itemIds` to the priority/secondary texts. Reuse input item names through an ID map. Format all values with existing formatters. Use `PlainLanguageHelpContent` for:

```ts
const surplusHelp = {
  title: "O que sobra por venda?",
  description:
    "É o valor que resta depois do custo do item e das taxas. Ele ajuda a pagar os gastos do mês.",
  technicalTerm: "contribuição unitária",
};
```

Create equivalent help for contribution margin, minimum price without loss, planned-promotion minimum and revenue needed to cover expenses. Never call `calculateDetailedDiagnosis` from the presenter.

- [ ] **Step 4: Prove snapshot compatibility and complete presenter tests**

Deep-freeze the input snapshot in one test, call the presenter, and assert it is unchanged. Run:

```bash
pnpm exec vitest run src/modules/reports/presenters/to-detailed-report-view-model.test.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts
```

Expected: PASS without snapshot-version changes.

- [ ] **Step 5: Commit the presentation model**

```bash
git add src/modules/reports/presenters/to-detailed-report-view-model.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts
git commit -m "feat: present detailed reports in plain language"
```

---

### Task 5: Recompose the detailed report around decisions

**Files:**

- Modify: `src/modules/reports/components/detailed-report-detail.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`
- Modify: `src/modules/reports/components/detailed-business-summary.tsx`
- Modify: `src/modules/reports/components/detailed-item-breakdown.tsx`
- Modify: `src/modules/reports/components/detailed-item-card.tsx`
- Modify: `src/modules/reports/components/detailed-guidance-list.tsx`

**Interfaces:**

- Consumes: `DetailedReportViewModel` from Task 4 and optional report-management slot.
- Produces: report order `conclusion → priority → metrics → comparison → item details → secondary guidance`.

- [ ] **Step 1: Rewrite component tests around the approved reading order**

Keep financial value assertions and replace technical-first copy assertions with user-language assertions:

```tsx
expect(
  screen.getByRole("heading", { name: "Como está seu negócio" }),
).toBeVisible();
expect(
  screen.getByRole("heading", { name: "O que fazer primeiro" }),
).toBeVisible();
expect(screen.getByText("Quanto sobrou ou faltou no mês")).toBeVisible();
expect(
  screen.getAllByText("Menor preço sem prejuízo na venda"),
).not.toHaveLength(0);
expect(screen.queryByText(/^Indisponível$/)).not.toBeInTheDocument();
```

Use DOM position comparisons to prove the priority section precedes metrics and comparison. Assert item triggers start with `aria-expanded="false"`; activate one with keyboard and verify its details and `PlainLanguageHelp` trigger.

- [ ] **Step 2: Make `DetailedReportDetail` create and distribute one view model**

Call:

```ts
const viewModel = toDetailedReportViewModel({ id, createdAt, snapshot });
```

Keep header navigation and management controls. Change the report title to a category-aware title from the model, then compose summary, comparison, a multiple accordion of item cards with `defaultValue={[]}`, and secondary guidance.

- [ ] **Step 3: Build the decision-first desktop and mobile summary**

`DetailedBusinessSummary` receives `conclusion`, `priority`, and `metrics`. Use:

```tsx
<section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.8fr)]">
  <div>{/* conclusion then priority */}</div>
  <dl>{/* three metrics */}</dl>
</section>
```

On smaller screens, source order keeps conclusion, priority and metrics. Give each metric a reason when unavailable and a `PlainLanguageHelp` trigger when help exists. Preserve tabular numerals and semantic tones.

- [ ] **Step 4: Simplify comparison and item details**

`DetailedItemBreakdown` uses model comparison entries and headings `Quais itens ajudam ou prejudicam o resultado?` and either `Sobra por unidade` or `Resultado no mês`. Keep text alongside colored bars.

`DetailedItemCard` becomes one `AccordionItem`. Its closed trigger shows name, status, price, cost and surplus. Its panel shows plain-language references and optional help, followed by technical production details in a nested disclosure. Do not place the remove or edit controls here; report management stays at page level.

- [ ] **Step 5: Demote secondary guidance**

Render only `secondaryGuidance` under `Outros pontos para acompanhar`, because the principal guidance already appears in the summary. Keep its tone styles, icon and body; prevent duplicate primary text.

- [ ] **Step 6: Run detailed report and route tests**

Run:

```bash
pnpm exec vitest run src/modules/reports/components/detailed-report-detail.test.tsx src/app/'(private)'/reports/'[id]'/page.test.tsx src/modules/reports/presenters/to-detailed-report-view-model.test.ts
```

Expected: PASS for complete, partial, loss and positive scenarios.

- [ ] **Step 7: Commit the report hierarchy**

```bash
git add src/modules/reports/components/detailed-*.tsx src/modules/reports/components/detailed-report-detail.test.tsx
git commit -m "feat: clarify detailed report decisions"
```

---

### Task 6: Document and verify the complete detailed flow

**Files:**

- Modify: `docs/DETAILED-DIAGNOSIS.md`
- Modify only if a gate identifies a regression caused by Tasks 1–5: files named by that gate.

**Interfaces:**

- Consumes: completed schema, ingredient flow, editor and report presentation.
- Produces: documented and verified behavior across desktop and mobile.

- [ ] **Step 1: Update the functional documentation**

Document these exact rules:

```markdown
- O custo unitário do ingrediente é obrigatório; digitar `0` declara explicitamente ausência de custo.
- A receita completa precisa ter ao menos um ingrediente com custo maior que zero.
- Um novo ingrediente começa pela definição do nome e usa esse nome como título editável.
- Ingredientes e itens usam divulgação progressiva para reduzir rolagem sem ocultar pendências.
- O relatório prioriza conclusão, primeira ação, números principais, comparação e memória de cálculo.
```

Remove any statement that says the blank ingredient cost is normalized to zero. Keep the formulas and snapshot version unchanged.

- [ ] **Step 2: Run focused test suites**

Run:

```bash
pnpm exec vitest run src/modules/detailed-diagnosis src/modules/reports/components src/modules/reports/editor src/modules/reports/presenters
```

Expected: all focused tests pass.

- [ ] **Step 3: Run the Impeccable detector once over changed UI files**

Run one command after all visual edits:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json \
  src/modules/detailed-diagnosis/components/ingredients \
  src/modules/detailed-diagnosis/components/steps/ingredient-fields.tsx \
  src/modules/reports/components/detailed-editor-item.tsx \
  src/modules/reports/components/detailed-report-editor-fields.tsx \
  src/modules/reports/components/detailed-report-detail.tsx \
  src/modules/reports/components/detailed-business-summary.tsx \
  src/modules/reports/components/detailed-item-breakdown.tsx \
  src/modules/reports/components/detailed-item-card.tsx \
  src/modules/reports/components/detailed-guidance-list.tsx
```

Expected: `[]`. Fix verified mechanical findings once; do not rerun the detector.

- [ ] **Step 4: Inspect representative viewports and interactions**

Run the app and inspect the creation flow, report editor and saved report at:

- desktop amplo: 1440 × 900;
- desktop intermediário: 1024 × 768;
- celular: 390 × 844.

At each size, verify keyboard expansion, rename, error focus, long ingredient names, two open editor items, partial report reasons, no horizontal overflow and 44 px mobile targets. Fix all observed defects in one batch, then perform one confirmation pass.

- [ ] **Step 5: Run project quality gates**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
NEXT_TELEMETRY_DISABLED=1 CIRCLE_NODE_TOTAL=4 NEXT_PUBLIC_TURNSTILE_SITE_KEY=production-build-validation pnpm build
```

Expected: tests, types, formatting and build pass; ESLint has no new errors or warnings in changed files. The temporary Turnstile value applies only to the build process and must not be written to `.env.local`.

- [ ] **Step 6: Review scope and repository diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm there is no database migration, snapshot version change, calculation change, mobile-only branch or unrelated admin/dashboard edit.

- [ ] **Step 7: Commit documentation and final corrections**

```bash
git add docs/DETAILED-DIAGNOSIS.md src
git commit -m "docs: record detailed diagnosis experience"
```
