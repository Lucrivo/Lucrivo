# Quick Diagnosis Plain-Language Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every quick-diagnosis flow and every newly created report a concise, plain-language vocabulary while preserving the complete presentation of saved legacy reports.

**Architecture:** Keep calculations unchanged, version the persisted report copy independently, and select shared report labels through a small `contentVersion`-aware presentation profile. Reuse one accessible click/touch popover component for optional explanations in forms and reports; keep category-specific copy in its existing category components and builders.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Base UI Popover, Tailwind CSS 4, Zod 4, Vitest/Testing Library, Supabase/Postgres migrations, pgTAP.

**Spec:** `docs/superpowers/specs/2026-09-07-quick-diagnosis-plain-language-foundation-design.md`

## Global Constraints

- New report tuples are Service `3/2/4`, Product `1/1/2`, and Production `1/1/2`.
- Existing Service `2/1/2` and `3/2/3`, Product `1/1/1`, and Production `1/1/1` reports remain readable and retain legacy narrative and presentation labels.
- Do not change financial formulas, verdict selection, priority selection, targets (Service 15%; Product and Production 20%), or discount rules.
- Do not alter report tables, recalculate snapshots, backfill rows, or edit existing saved reports.
- Do not rewrite the five detailed category-specific report sections in this delivery.
- Do not add AI conversation, a CMS, a translation framework, or a general copy engine.
- Primary UI copy is Brazilian Portuguese, plain, direct, and factual; it must not imply knowledge of competitors or a market-correct price.
- Technical identifiers remain in English and do not need renaming.
- Help opens by click, touch, and keyboard, closes with `Escape`, has semantic title/description, and never depends on hover.
- UI changes preserve the incumbent visual system and support narrow mobile widths, keyboard navigation, reduced motion, and 200% zoom.
- Use TDD for each task and keep unrelated working-tree changes intact.

---

### Task 1: Accessible plain-language help primitive

**Files:**

- Create: `src/components/shared/plain-language-help.tsx`
- Create: `src/components/shared/plain-language-help.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/shared/step-field.tsx`
- Modify: `src/modules/quick-diagnosis/components/shared/step-field.test.tsx`
- Reuse: `src/components/ui/popover.tsx`

**Interfaces:**

- Consumes: existing `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, and `PopoverDescription` primitives.
- Produces:

```ts
type PlainLanguageHelpContent = {
  triggerLabel?: string;
  title: string;
  description: string;
  technicalTerm?: string;
};

type PlainLanguageHelpProps = PlainLanguageHelpContent & {
  className?: string;
};

function PlainLanguageHelp(props: PlainLanguageHelpProps): React.JSX.Element;
```

- Default `triggerLabel`: `Entenda este valor`.
- When `technicalTerm` is present, append `Nome usado nos cálculos: {technicalTerm}.` after the plain description.
- Extend `StepFieldProps` with `help?: PlainLanguageHelpContent`; the shared
  field renders the help passed by a category but owns no business dictionary.

- [ ] **Step 1: Write the failing interaction tests**

Create tests that render:

```tsx
<PlainLanguageHelp
  title="Quanto sobra da venda"
  description="Mostra quanto sobra de cada venda depois de pagar os gastos usados no cálculo."
  technicalTerm="margem"
/>
```

Assert that:

```ts
const trigger = screen.getByRole("button", { name: "Entenda este valor" });
expect(
  screen.queryByText("Mostra quanto sobra de cada venda", { exact: false }),
).not.toBeInTheDocument();

await user.click(trigger);
expect(screen.getByText("Quanto sobra da venda")).toBeInTheDocument();
expect(
  screen.getByText("Nome usado nos cálculos: margem."),
).toBeInTheDocument();

await user.keyboard("{Escape}");
expect(screen.queryByText("Quanto sobra da venda")).not.toBeInTheDocument();
expect(trigger).toHaveFocus();
```

Add a second test that tabs to the custom trigger `Como calculamos?`, presses `Enter`, and finds the semantic title and description.

In `step-field.test.tsx`, pass a `help` object and assert the trigger is adjacent
to the field's helper area, opens its explanation, and does not change the
input's accessible label.

- [ ] **Step 2: Run the new test and verify the component is missing**

Run:

```bash
pnpm test src/components/shared/plain-language-help.test.tsx src/modules/quick-diagnosis/components/shared/step-field.test.tsx
```

Expected: FAIL because `./plain-language-help` does not exist.

- [ ] **Step 3: Implement the component on the existing popover primitive**

Use a real text button and mobile-safe popup width:

```tsx
"use client";

import { CircleHelpIcon } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function PlainLanguageHelp({
  triggerLabel = "Entenda este valor",
  title,
  description,
  technicalTerm,
  className,
}: PlainLanguageHelpProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "text-primary inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2",
          className,
        )}
      >
        <CircleHelpIcon aria-hidden="true" className="size-3.5" />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-4"
      >
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription className="leading-6">
            {description}
          </PopoverDescription>
        </PopoverHeader>
        {technicalTerm ? (
          <p className="text-muted-foreground text-xs leading-5">
            Nome usado nos cálculos: {technicalTerm}.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
```

Define and export the two declared types. If Base UI requires its trigger to receive `render`, preserve the same visible button semantics and test contract rather than changing the public interface.

Import the content type and component into `StepField`, add the optional prop,
and render `<PlainLanguageHelp {...help} />` after the ordinary description and
before the error. Keep the existing `aria-describedby` IDs limited to actual
field description/error text; the optional popup is user-requested detail.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
pnpm test src/components/shared/plain-language-help.test.tsx src/modules/quick-diagnosis/components/shared/step-field.test.tsx
```

Expected: PASS; both pointer and keyboard cases pass.

- [ ] **Step 5: Commit the primitive**

```bash
git add src/components/shared/plain-language-help.tsx src/components/shared/plain-language-help.test.tsx src/modules/quick-diagnosis/components/shared/step-field.tsx src/modules/quick-diagnosis/components/shared/step-field.test.tsx
git commit -m "feat: add plain-language help popover"
```

---

### Task 2: Version-compatible report snapshot contracts

**Files:**

- Modify: `src/modules/reports/types.ts:1-9,148-216`
- Modify: `src/modules/reports/schemas/product-report-snapshot.schema.ts:1-260`
- Modify: `src/modules/reports/schemas/production-report-snapshot.schema.ts:1-312`
- Modify: `src/modules/reports/schemas/service-report-snapshot.schema.ts:1-218`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts:1-38`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts:1-570`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.ts:1-300`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.ts:1-310`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.ts:1-275`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.test.ts`
- Modify: `src/modules/reports/services/create-product-report.service.ts:1-65`
- Modify: `src/modules/reports/services/create-production-report.service.ts:1-78`
- Modify: `src/modules/reports/services/create-service-report.service.ts:1-68`

**Interfaces:**

- Produces current constants:

```ts
const SERVICE_CONTENT_VERSION = 4;
const PRODUCT_CONTENT_VERSION = 2;
const PRODUCTION_CONTENT_VERSION = 2;
```

- Produces legacy/current snapshot types and parsers:

```ts
type ProductReportSnapshotV1 = /* content 1 */;
type ProductReportSnapshotV2 = /* content 2 */;
type ProductReportSnapshot = ProductReportSnapshotV1 | ProductReportSnapshotV2;
type CurrentProductReportSnapshot = ProductReportSnapshotV2;

type ProductionReportSnapshotV1 = /* content 1 */;
type ProductionReportSnapshotV2 = /* content 2 */;
type ProductionReportSnapshot =
  | ProductionReportSnapshotV1
  | ProductionReportSnapshotV2;
type CurrentProductionReportSnapshot = ProductionReportSnapshotV2;

type ServiceReportSnapshotV4 = /* schema 3, calculation 2, content 4 */;
type CurrentServiceReportSnapshot = ServiceReportSnapshotV4;
```

- `parse*ReportSnapshot` accepts every supported historical/current tuple.
- `parseCurrent*ReportSnapshot` accepts only the new tuple and is used by builders before persistence.

- [ ] **Step 1: Add failing compatibility and rejection tests**

Extend `report-snapshot.schema.test.ts` with copies of the valid Product,
Production, and Service v3 fixtures whose only version change is:

```ts
const validProductV2Snapshot = {
  ...validProductSnapshot,
  contentVersion: 2,
};
const validProductionV2Snapshot = {
  ...validProductionSnapshot,
  contentVersion: 2,
};
const validServiceV4Snapshot = {
  ...validServiceV3Snapshot,
  contentVersion: 4,
};
```

Assert that both category parsers and `parseReportSnapshot` accept the three
new fixtures and continue accepting all old fixtures. Add explicit rejection
cases for Product content 3, Production content 3, Service schema 3 / calculation
2 / content 5, and Service schema 2 / calculation 1 / content 4.

Update snapshot-builder tests to expect current tuples `1/1/2`, `1/1/2`, and
`3/2/4`. Add an assertion that calculation outputs other than version and
persisted text remain equal to the pre-change fixtures.

- [ ] **Step 2: Run schema and builder tests to see the version failures**

Run:

```bash
pnpm test \
  src/modules/reports/schemas/report-snapshot.schema.test.ts \
  src/modules/reports/domain/build-product-report-snapshot.test.ts \
  src/modules/reports/domain/build-production-report-snapshot.test.ts \
  src/modules/reports/domain/build-service-report-snapshot.test.ts
```

Expected: FAIL because the current literals are still Product 1, Production 1,
and Service 3.

- [ ] **Step 3: Refactor each schema around a shared structural factory**

Keep every existing `.superRefine` rule. Replace only the version literal
construction. The factory pattern is:

```ts
const productReportSnapshotShape = {
  category: z.literal("product"),
  scenario: z.literal("resale"),
  currency: z.literal("BRL"),
  unit: z.literal("unit"),
  policy: productReportPolicySchema,
  inputs: productReportInputsSchema,
  results: productReportResultsSchema,
  executiveSummary: reportExecutiveSummarySchema,
  sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
  discountSimulationBase: productReportDiscountSimulationBaseSchema,
};

function createProductReportSnapshotSchema(contentVersion: 1 | 2) {
  return z
    .strictObject({
      schemaVersion: z.literal(1),
      calculationVersion: z.literal(1),
      contentVersion: z.literal(contentVersion),
      ...productReportSnapshotShape,
    })
    .superRefine(validateProductSnapshot);
}

const productReportSnapshotV1Schema = createProductReportSnapshotSchema(1);
const productReportSnapshotV2Schema = createProductReportSnapshotSchema(
  PRODUCT_CONTENT_VERSION,
);
const productReportSnapshotSchema = z.union([
  productReportSnapshotV1Schema,
  productReportSnapshotV2Schema,
]);
```

Extract the current inline refinement body to the named validator without
changing its checks. For Production, build `productionReportSnapshotShape`
from its existing category, scenario, currency, unit, policy, inputs, results,
executive-summary, sections, and simulator schemas, then call
`createProductionReportSnapshotSchema(1)` and
`createProductionReportSnapshotSchema(PRODUCTION_CONTENT_VERSION)`.

For Service, extract its current schema-3 shape and factory exactly as:

```ts
const serviceReportSnapshotV3Shape = {
  category: z.literal("service"),
  scenario: z.enum(pricingMethods),
  currency: z.literal("BRL"),
  unit: z.enum(serviceReportUnits),
  policy: serviceReportPolicySchema,
  inputs: serviceReportInputsV3Schema,
  results: serviceReportResultsV3Schema,
  executiveSummary: reportExecutiveSummarySchema,
  sections: z.array(reportSectionSchema).length(reportSectionKeys.length),
  discountSimulationBase: serviceReportDiscountSimulationBaseSchema,
};

function createServiceReportSnapshotV3Schema(contentVersion: 3 | 4) {
  return z
    .strictObject({
      schemaVersion: z.literal(3),
      calculationVersion: z.literal(2),
      contentVersion: z.literal(contentVersion),
      ...serviceReportSnapshotV3Shape,
    })
    .superRefine(validateOrderedContent);
}

const serviceReportSnapshotV3Schema = createServiceReportSnapshotV3Schema(3);
const serviceReportSnapshotV4Schema = createServiceReportSnapshotV3Schema(
  SERVICE_CONTENT_VERSION,
);

const serviceReportSnapshotSchema = z.union([
  serviceReportSnapshotV2Schema,
  serviceReportSnapshotV3Schema,
  serviceReportSnapshotV4Schema,
]);
```

Export the current-only parsers and types. Update builders and creation
services to use `CurrentProductReportSnapshot`,
`CurrentProductionReportSnapshot`, and `CurrentServiceReportSnapshot` so new
writes cannot accidentally use legacy content.

- [ ] **Step 4: Update the combined union and public exports**

Make `reportSnapshotSchema` consume the category unions rather than enumerating
only one version:

```ts
const reportSnapshotSchema = z.union([
  serviceReportSnapshotSchema,
  productReportSnapshotSchema,
  productionReportSnapshotSchema,
]);
```

Export union and current types from `types.ts`. Update presenter imports that
currently name only `ProductReportSnapshotV1` or
`ProductionReportSnapshotV1` to the union aliases; behavior remains unchanged
until Task 4.

- [ ] **Step 5: Run focused tests and type checking**

Run:

```bash
pnpm test \
  src/modules/reports/schemas/report-snapshot.schema.test.ts \
  src/modules/reports/domain/build-product-report-snapshot.test.ts \
  src/modules/reports/domain/build-production-report-snapshot.test.ts \
  src/modules/reports/domain/build-service-report-snapshot.test.ts
pnpm typecheck
```

Expected: PASS; all historical tuples and exactly the three new tuples parse.

- [ ] **Step 6: Commit version compatibility**

```bash
git add src/modules/reports/types.ts src/modules/reports/schemas src/modules/reports/domain/build-product-report-snapshot.ts src/modules/reports/domain/build-production-report-snapshot.ts src/modules/reports/domain/build-service-report-snapshot.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/services/create-product-report.service.ts src/modules/reports/services/create-production-report.service.ts src/modules/reports/services/create-service-report.service.ts
git commit -m "refactor: version plain-language report content"
```

---

### Task 3: Plain-language executive summaries for new reports

**Files:**

- Modify: `src/modules/reports/domain/build-product-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-service-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-service-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.test.ts`

**Interfaces:**

- Consumes: unchanged `ProductReportCalculation`,
  `ProductionReportCalculation`, and `ServiceReportCalculation` values.
- Produces: the existing `ReportExecutiveSummary` shape; no new financial
  classification or snapshot fields.
- The five `sections` arrays in snapshot builders remain byte-for-byte in
  behavior and outside this task.

**Exact shared copy contract:**

- Headlines and introductions:
  - Product: `Seu produto dá lucro?` / `Veja quanto sobra de cada venda e o que merece sua atenção primeiro.`
  - Production: `Sua produção dá lucro?` / `Veja quanto sobra de cada unidade vendida e o que merece sua atenção primeiro.`
  - Service: `Seu serviço dá lucro?` / `Veja quanto sobra do valor cobrado e o que merece sua atenção primeiro.`
- Fact labels:
  - `Margem atual` → `Quanto sobra a cada R$ 100`.
  - `Preço-alvo` → `Preço para alcançar a meta`.
  - Partial target → `Preço para a meta, sem gastos mensais`.
- Positive profit: `Sim — sobram {value} por {unit} depois de pagar os gastos considerados.`
- Negative profit: `Não — faltam {absoluteValue} por {unit} para pagar os gastos considerados.`
- Zero profit: `Não — o valor recebido apenas paga os gastos, sem deixar dinheiro.`
- Sufficient price: `Sim — seu preço alcança o valor calculado para a meta de {target}%.`
- Price between minimum and target: `Quase — o preço paga os gastos, mas ainda não alcança a meta de {target}%.`
- Price below minimum: `Não — para pagar todos os gastos, o preço precisa ser pelo menos {minimumPrice}.`
- Missing target calculation: `Ainda não dá para calcular esse valor com os dados informados.`
- Do not use `pró-labore`, `rateio`, `receita líquida`, `contribuição`,
  `operacional`, or `referência financeira` in the executive summary.

- [ ] **Step 1: Rewrite expectations first**

In each executive-summary test, keep the full state matrix and change exact
expected strings to the contract above. Add these category-specific partial
expectations:

```ts
expect(productSummary.answers[0].answer).toBe(
  "Ainda não dá para saber quanto sobra de verdade. Informe quantas unidades você vende por mês para incluir os gastos mensais.",
);
expect(productSummary.answers[1].answer).toBe(
  "Ainda é uma estimativa: R$ 69,45 inclui o custo do produto e as taxas, mas não os gastos mensais.",
);

expect(productionSummary.answers[0].answer).toBe(
  "Ainda não dá para saber quanto sobra de verdade. Informe quantas unidades você vende por mês para incluir os gastos mensais.",
);
expect(productionSummary.answers[1].answer).toBe(
  "Ainda é uma estimativa: R$ 69,45 inclui o custo de fabricação e as taxas, mas não os gastos mensais.",
);
```

For the representative Service appointment, expect:

```ts
expect(summary.answers).toEqual([
  {
    key: "profitability",
    question: "Estou ganhando dinheiro?",
    answer:
      "Sim — sobram R$ 23,60 por atendimento depois de pagar os gastos considerados.",
  },
  {
    key: "price_sufficiency",
    question: "Estou cobrando o preço certo?",
    answer: "Sim — seu preço alcança o valor calculado para a meta de 15%.",
  },
  {
    key: "immediate_action",
    question: "O que preciso fazer agora?",
    answer:
      "Mantenha a quantidade de atendimentos usada no cálculo e acompanhe se seus clientes aceitam o preço.",
  },
]);
```

Add `not.toMatch` assertions over `JSON.stringify(summary)` for the forbidden
primary terms.

- [ ] **Step 2: Run executive-summary tests and verify copy failures**

Run:

```bash
pnpm test \
  src/modules/reports/domain/build-product-executive-summary.test.ts \
  src/modules/reports/domain/build-production-executive-summary.test.ts \
  src/modules/reports/domain/build-service-executive-summary.test.ts
```

Expected: FAIL on the old technical phrases; calculation state and amounts
still match.

- [ ] **Step 3: Replace Product summary templates without changing branches**

Keep all existing `if`/verdict/priority decisions. Use these exact concepts:

```ts
const productVerdictContent = {
  direct_loss: {
    label: "Venda com prejuízo",
    body: "O valor recebido, depois das taxas, não paga o custo de compra. Vender mais nessas condições aumenta o prejuízo.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Falta informar as vendas",
    body: "A venda paga o custo do produto, mas falta informar quantas unidades você vende por mês para incluir os gastos mensais.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Preço abaixo dos gastos",
    body: "A venda paga o custo de compra, mas não cobre a parte dos gastos mensais de cada unidade.",
    tone: "critical",
  },
  tight_margin: {
    label: "Abaixo da meta",
    body: "Cada unidade dá lucro, mas ainda sobra menos que a meta de 20%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Meta alcançada",
    body: "O preço paga todos os gastos e alcança a meta de 20%. Agora mantenha a quantidade de vendas usada no cálculo.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "O preço paga todos os gastos e passa da meta de 20%. Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
    tone: "positive",
  },
};

const productPriorityContent = {
  cost: {
    label: "Custo do produto",
    body: "O custo de compra usa todo o valor que sobra da venda. Tente reduzir esse custo ou aumentar o preço antes de vender mais.",
  },
  data: {
    label: "Quantidade de vendas",
    body: "Informe quantas unidades você vende por mês. Assim, conseguimos incluir os gastos mensais e mostrar quanto realmente sobra.",
  },
  price: {
    label: "Preço",
    body: "O preço não paga todos os gastos de uma unidade. Reveja o preço ou reduza os gastos.",
  },
  margin: {
    label: "Quanto sobra",
    body: "A venda dá lucro, mas ainda sobra menos que a meta de 20%. Reveja o preço e os gastos em conjunto.",
  },
  volume: {
    label: "Quantidade de vendas",
    body: "O preço alcança a meta. Agora mantenha a quantidade de vendas usada no cálculo.",
  },
};
```

Use `Math.abs` for negative amounts. Use `por unidade` in Product answers.
Immediate actions are, in verdict order:

```ts
{
  direct_loss: "Reduza o custo de compra ou aumente o preço antes de vender mais.",
  incomplete_volume: "Informe quantas unidades você vende por mês para concluir o diagnóstico.",
  operational_loss: "Aumente o preço ou reduza os gastos de cada unidade.",
  tight_margin: "Ajuste o preço ou os gastos para chegar à meta de 20%.",
  adequate_margin: "Mantenha a quantidade de vendas usada no cálculo.",
  above_target: "Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
}
```

- [ ] **Step 4: Apply the parallel Production vocabulary**

Use this exact verdict map:

```ts
const productionVerdictContent = {
  direct_loss: {
    label: "Venda com prejuízo",
    body: "O valor recebido, depois das taxas, não paga o custo de fabricação. Vender mais nessas condições aumenta o prejuízo.",
    tone: "critical",
  },
  incomplete_volume: {
    label: "Falta informar as vendas",
    body: "A venda paga o custo de fabricação, mas falta informar quantas unidades você vende por mês para incluir os gastos mensais.",
    tone: "neutral",
  },
  operational_loss: {
    label: "Preço abaixo dos gastos",
    body: "A venda paga o custo de fabricação, mas não cobre a parte dos gastos mensais de cada unidade.",
    tone: "critical",
  },
  tight_margin: {
    label: "Abaixo da meta",
    body: "Cada unidade dá lucro, mas ainda sobra menos que a meta de 20%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Meta alcançada",
    body: "O preço paga todos os gastos e alcança a meta de 20%. Agora mantenha a quantidade de vendas usada no cálculo.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "O preço paga todos os gastos e passa da meta de 20%. Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
    tone: "positive",
  },
};
```

Use Product's priority and action sentence shapes with `custo de fabricação`
in place of `custo de compra`. The complete direct-loss action is:

```ts
"Reduza o custo de fabricação ou aumente o preço antes de vender mais.";
```

The partial price answer names `o custo de fabricação e as taxas`.

- [ ] **Step 5: Replace Service summary templates**

Use `formatReportUnit` for `hora`/`atendimento` and a helper that pluralizes
`horas`/`atendimentos` for the volume action. Preserve every existing verdict
branch. Use these priority values:

```ts
const verdictContent = {
  missing_price: {
    label: "Informe o preço",
    body: "Informe quanto você cobra para comparar com seus gastos e a meta de 15%.",
    tone: "neutral",
  },
  direct_loss: {
    label: "Venda com prejuízo",
    body: "O valor recebido, depois das taxas, não paga nem os materiais usados no serviço. Fazer mais serviços nessas condições aumenta o prejuízo.",
    tone: "critical",
  },
  operational_loss: {
    label: "Preço abaixo dos gastos",
    body: "",
    tone: "critical",
  },
  tight_margin: {
    label: "Abaixo da meta",
    body: "O preço paga os gastos, mas ainda sobra menos que a meta de 15%.",
    tone: "warning",
  },
  adequate_margin: {
    label: "Meta alcançada",
    body: "O preço paga os gastos e alcança a meta de 15%. Agora mantenha a quantidade de trabalho usada no cálculo.",
    tone: "positive",
  },
  above_target: {
    label: "Acima da meta",
    body: "O preço paga os gastos e passa da meta de 15%. Acompanhe se seus clientes aceitam o preço e mantenha a quantidade de trabalho.",
    tone: "positive",
  },
};

const priorityContent = {
  cost: {
    label: "Gastos",
    body: "Os gastos estão deixando pouco dinheiro em cada venda. Comece pelos maiores e veja quais podem ser reduzidos.",
    action: "Revise os maiores gastos antes de buscar mais vendas.",
  },
  price: {
    label: "Preço",
    body: "Seu preço não paga todos os gastos. Reveja o valor cobrado antes de buscar mais vendas.",
    action: "Aumente o preço ou reduza os gastos antes de vender mais.",
  },
  margin: {
    label: "Quanto sobra",
    body: "O serviço dá lucro, mas ainda sobra menos que a meta de 15%. Reveja o preço e os gastos em conjunto.",
    action: "Ajuste o preço ou os gastos para chegar à meta de 15%.",
  },
  volume: {
    label: "Quantidade de serviços",
    body: "Seu preço alcança a meta. Agora mantenha a quantidade de trabalho usada no cálculo.",
    action: null,
  },
};
```

For `operational_loss`, fill the intentionally dynamic body with:

```ts
`O preço não paga todos os gastos. Do jeito que está, cada ${unit} deixa o negócio no prejuízo.`;
```

Build the volume action dynamically as:

```ts
`Mantenha a quantidade de ${unit === "hora" ? "horas" : "atendimentos"} usada no cálculo e acompanhe se seus clientes aceitam o preço.`;
```

- [ ] **Step 6: Verify summaries and snapshots**

Run:

```bash
pnpm test \
  src/modules/reports/domain/build-product-executive-summary.test.ts \
  src/modules/reports/domain/build-production-executive-summary.test.ts \
  src/modules/reports/domain/build-service-executive-summary.test.ts \
  src/modules/reports/domain/build-product-report-snapshot.test.ts \
  src/modules/reports/domain/build-production-report-snapshot.test.ts \
  src/modules/reports/domain/build-service-report-snapshot.test.ts
```

Expected: PASS; exact amounts and classifications are unchanged, and detailed
section expectations remain untouched.

- [ ] **Step 7: Commit summary copy**

```bash
git add src/modules/reports/domain/build-product-executive-summary.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-production-executive-summary.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-service-executive-summary.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/domain/build-service-report-snapshot.test.ts
git commit -m "refactor: simplify report executive summaries"
```

---

### Task 4: Version-aware report presentation and explanations

**Files:**

- Create: `src/modules/reports/presenters/report-language.ts`
- Create: `src/modules/reports/presenters/report-language.test.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/components/report-detail.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/modules/reports/components/report-numbers.tsx`
- Modify: `src/modules/reports/components/report-numbers.test.tsx`
- Modify: `src/modules/reports/components/report-executive-summary.tsx`
- Modify: `src/modules/reports/components/report-executive-summary.test.tsx`
- Modify: `src/modules/reports/components/report-list-card.tsx`
- Modify: `src/modules/reports/components/report-library.test.tsx`
- Modify: `src/modules/reports/components/reports-empty-state.tsx`
- Modify: `src/modules/reports/services/list-reports.service.ts`
- Modify: `src/modules/reports/services/list-reports.service.test.ts`
- Modify: `src/app/(private)/reports/page.tsx`
- Modify: `src/app/(private)/reports/page.test.tsx`
- Modify: `src/app/(private)/reports/[id]/loading.tsx`

**Interfaces:**

- Consumes: `PlainLanguageHelpContent` and all supported `ReportSnapshot`
  variants.
- Produces:

```ts
type ReportLanguageProfile = {
  isPlainLanguage: boolean;
  reportEyebrow: string;
  analysisAriaLabel: string;
  analysisEyebrow: string;
  analysisTitle: string;
  analysisDescription: string;
  numbersTitle: string;
  numbersDescription: string;
  priorityEyebrow: string;
  toneLabels: Record<ReportTone, string>;
  savedReportLabel: string;
  verdictLabels: Record<ReportVerdict, string>;
};

function getReportLanguageProfile(
  snapshot: Pick<ReportSnapshot, "category" | "contentVersion">,
): ReportLanguageProfile;
```

- Extend `ReportViewModel` with `language: ReportLanguageProfile`.
- Extend `ReportNumberViewModel` with
  `help?: PlainLanguageHelpContent`.
- Extend `OwnedReportSummary` with `contentVersion: number` and include
  `content_version` in `REPORT_SUMMARY_COLUMNS`.

- [ ] **Step 1: Write failing profile and presenter tests**

Test this exact version gate:

```ts
function usesPlainLanguage(
  snapshot: Pick<ReportSnapshot, "category" | "contentVersion">,
) {
  return (
    (snapshot.category === "service" && snapshot.contentVersion === 4) ||
    (snapshot.category === "product" && snapshot.contentVersion === 2) ||
    (snapshot.category === "production" && snapshot.contentVersion === 2)
  );
}
```

For all legacy tuples, assert current labels such as `Seu relatório
financeiro`, `Principal ponto a corrigir`, `Margem real`, and `Preço-alvo`.
For all new tuples, assert:

```ts
{
  reportEyebrow: "Resultado do seu diagnóstico",
  analysisAriaLabel: "Como chegamos a esse resultado",
  analysisEyebrow: "Entenda o resultado",
  analysisTitle: "Como chegamos a esse resultado",
  analysisDescription:
    "Veja o que precisa ser pago, quanto sobra e quantas vendas são necessárias.",
  numbersTitle: "Seus números",
  numbersDescription: "Valores calculados com o que você informou.",
  priorityEyebrow: "Comece por aqui",
  toneLabels: {
    neutral: "Informação",
    positive: "Bom resultado",
    warning: "Fique de olho",
    critical: "Precisa de atenção",
  },
  savedReportLabel: "Diagnóstico salvo",
  verdictLabels: {
    missing_price: "Informe o preço",
    direct_loss: "Venda com prejuízo",
    incomplete_volume: "Falta informar as vendas",
    operational_loss: "Preço abaixo dos gastos",
    tight_margin: "Abaixo da meta",
    adequate_margin: "Meta alcançada",
    above_target: "Acima da meta",
  },
}
```

Add presenter expectations for new reports:

```ts
[
  "Preço atual",
  "Quanto sobra a cada R$ 100",
  "Quanto sobra por unidade",
  "Menor preço sem prejuízo",
  "Preço para alcançar a meta (20%)",
];
```

For partial Product/Production reports expect:

```ts
[
  "Preço atual",
  "Quanto sobra a cada R$ 100",
  "Quanto sobra antes dos gastos mensais",
  "Menor preço antes dos gastos mensais",
  "Preço para a meta, sem gastos mensais",
];
```

Retain existing legacy fixture assertions by cloning a newly built fixture and
setting its content version and persisted summary back to the legacy values.

- [ ] **Step 2: Run profile and presenter tests to verify failure**

Run:

```bash
pnpm test \
  src/modules/reports/presenters/report-language.test.ts \
  src/modules/reports/presenters/to-report-view-model.test.ts
```

Expected: FAIL because the profile and new view-model properties do not exist.

- [ ] **Step 3: Implement the two small immutable profiles**

Create only `legacyReportLanguage` and `plainReportLanguage`; do not move
category narratives into this file. Return one by the exact tuple gate from
Step 1. Freeze the objects with `as const satisfies ReportLanguageProfile`.

- [ ] **Step 4: Generate version-specific number labels and help**

Keep existing `toServiceNumbers`, `toProductNumbers`, and
`toProductionNumbers`; add a `plainLanguage: boolean` argument. When false,
return existing labels exactly. When true, use the labels from Step 1 and add:

```ts
const marginHelp = {
  triggerLabel: "Entenda este valor",
  title: "Quanto sobra a cada R$ 100",
  description:
    "Mostra quanto fica no negócio depois de pagar os gastos usados neste cálculo.",
  technicalTerm: "margem",
};

const targetPriceHelp = {
  triggerLabel: "Como calculamos?",
  title: "Preço para alcançar a meta",
  description:
    "É o preço calculado com seus gastos, taxas e a meta definida neste diagnóstico.",
  technicalTerm: "preço-alvo",
};
```

Attach `marginHelp` only to key `margin` and `targetPriceHelp` only to key
`target`. Partial target help must also say `Como você não informou as vendas
do mês, os gastos mensais ainda não entram neste valor.`

- [ ] **Step 5: Make report-library cards version-aware**

Add `content_version` to the select string and map it to `contentVersion` in
`toOwnedReportSummary`. Update service tests so the selected column string and
mapped result contain that value.

In `ReportListCard`, call `getReportLanguageProfile` with
`businessCategory` and `contentVersion`. Legacy cards retain all current
labels. Current cards use the profile's verdict label and saved-report label,
plus these metrics:

```ts
const plainMetricLabels = {
  price: "Preço atual",
  margin: "Quanto sobra a cada R$ 100",
  productProfit: "Quanto sobra por unidade",
  serviceHourProfit: "Quanto sobra por hora",
  serviceAppointmentProfit: "Quanto sobra por atendimento",
};
```

Choose the Service profit label from `report.unit`; do not describe an hourly
result as a generic sale.

Do not add popovers to library cards; the full explanation is available after
opening the report. Update `report-library.test.tsx` with legacy and current
fixtures and assert both vocabularies.

- [ ] **Step 6: Pass profile copy into report-detail components**

Replace hard-coded report chrome with `viewModel.language` fields. Pass
`priorityEyebrow` into `ReportExecutiveSummary`; pass `numbersTitle` and
`numbersDescription` into `ReportNumbers`. Render `PlainLanguageHelp` below
the corresponding `<dt>` only when `number.help` exists. Keep the `<dl>`,
`<dt>`, and `<dd>` semantics and values unchanged.

- [ ] **Step 7: Simplify version-independent library and loading copy**

Use these exact strings in the library shell and empty/loading states:

```text
Seus resultados
Veja os diagnósticos que você salvou e abra qualquer um sem preencher tudo de novo.
Diagnósticos salvos
Faça um diagnóstico para salvar seus números, ver quanto sobra e consultar o resultado depois.
Preparando o resultado do seu diagnóstico...
```

These strings describe the current screen rather than a saved snapshot, so
they do not need a legacy branch.

- [ ] **Step 8: Test old and new rendered reports**

In component tests render one current and one legacy view model. Assert the
current report contains `Resultado do seu diagnóstico`, `Comece por aqui`,
`Como chegamos a esse resultado`, and `Bom resultado`. Assert the legacy
report still contains `Seu relatório financeiro`, `Principal ponto a
corrigir`, `Entenda seus números`, and `Situação positiva`.

Click `Como calculamos?`, assert the price explanation, press `Escape`, and
assert focus returns to its trigger. Ensure there are only two help triggers in
the five-number rail.

- [ ] **Step 9: Run report tests**

Run:

```bash
pnpm test \
  src/modules/reports/presenters/report-language.test.ts \
  src/modules/reports/presenters/to-report-view-model.test.ts \
  src/modules/reports/components/report-numbers.test.tsx \
  src/modules/reports/components/report-executive-summary.test.tsx \
  src/modules/reports/components/report-detail.test.tsx \
  src/modules/reports/components/report-library.test.tsx \
  src/modules/reports/services/list-reports.service.test.ts \
  'src/app/(private)/reports/page.test.tsx'
```

Expected: PASS for legacy/current copy, semantic markup, and popover behavior.

- [ ] **Step 10: Commit report presentation**

```bash
git add src/modules/reports/presenters/report-language.ts src/modules/reports/presenters/report-language.test.ts src/modules/reports/presenters/to-report-view-model.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/components/report-detail.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/report-numbers.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-executive-summary.tsx src/modules/reports/components/report-executive-summary.test.tsx src/modules/reports/components/report-list-card.tsx src/modules/reports/components/report-library.test.tsx src/modules/reports/components/reports-empty-state.tsx src/modules/reports/services/list-reports.service.ts src/modules/reports/services/list-reports.service.test.ts 'src/app/(private)/reports/page.tsx' 'src/app/(private)/reports/page.test.tsx' 'src/app/(private)/reports/[id]/loading.tsx'
git commit -m "refactor: present reports in plain language"
```

---

### Task 5: Product/resale guided-flow language

**Files:**

- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-values-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-fixed-expenses-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/monthly-volume-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/owner-compensation-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-fees-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-review-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts`

**Interfaces:**

- Consumes: unchanged `ProductDiagnosisInput`, field names, reducer actions,
  and validators.
- Produces: copy-only changes plus selected `PlainLanguageHelp` instances; no
  data-shape or navigation changes.

**Required visible vocabulary:**

```ts
const stepTitles = {
  analysisMode: "Que tipo de resultado você quer ver?",
  productValues: "Quanto você paga e por quanto vende?",
  fixedExpenses: "Quais gastos você tem todo mês?",
  monthlyVolume: "Quantas unidades você vende por mês?",
  ownerCompensation: "Quanto você quer receber por mês?",
  fees: "O que é descontado de cada venda?",
  review: "Confira as informações do produto",
};
```

- `Pró-labore` is never primary copy.
- `Custos/despesas fixas` becomes `Gastos que existem todo mês`.
- Tax/card questions use direct forms: `Qual porcentagem da venda vai para
impostos?` and `Qual porcentagem fica com o cartão ou a plataforma?`.

- [ ] **Step 1: Change Product UI test expectations first**

Update wizard and step tests to query the required titles and labels. Add a
review assertion that the same phrases `Quanto você quer receber` and `Gastos
que existem todo mês` appear after data entry. Add a keyboard test opening the
monthly-expense explanation.

Update schema-test expectations so errors say exactly what to correct, for
example `Informe quanto você quer receber por mês.` instead of naming
pró-labore.

- [ ] **Step 2: Run Product flow and schema tests to verify failure**

Run:

```bash
pnpm test \
  src/modules/quick-diagnosis/components/product/steps/product-steps.test.tsx \
  src/modules/quick-diagnosis/components/product/product-diagnosis-wizard.test.tsx \
  src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts
```

Expected: FAIL on old step titles, field labels, review labels, and errors.

- [ ] **Step 3: Rewrite Product steps and review consistently**

Use these primary labels:

```text
Quanto você paga por unidade?
Por quanto você vende cada unidade?
Gastos que existem todo mês
Quantas unidades você vende em um mês comum?
Você quer incluir o valor que recebe pelo seu trabalho?
Quanto você quer receber por mês?
Porcentagem da venda destinada a impostos
Porcentagem cobrada pelo cartão ou plataforma
```

Where the existing flow supports optional monthly volume, keep the optional
behavior and explain: `Sem essa quantidade, o resultado não consegue incluir
os gastos mensais em cada unidade.`

Attach this help to the monthly-expense field:

```ts
{
  triggerLabel: "O que incluir?",
  title: "Gastos que existem todo mês",
  description:
    "Some aluguel, energia, internet, sistemas e outros gastos que continuam mesmo quando você vende pouco.",
  technicalTerm: "custos fixos",
}
```

Attach this help to owner compensation:

```ts
{
  triggerLabel: "Por que informar?",
  title: "O valor que você recebe",
  description:
    "Inclua quanto o negócio precisa pagar pelo seu trabalho em um mês comum.",
  technicalTerm: "pró-labore",
}
```

- [ ] **Step 4: Rewrite Product validation messages without changing rules**

Only replace user-facing Zod messages. Keep every numeric bound, optional
condition, transformation, and returned error field intact. Errors identify
the same field with the new visible label and an action, e.g. `Informe quantas
unidades você vende em um mês comum.`.

- [ ] **Step 5: Run Product tests and type checking**

Run the three focused test files from Step 2, then `pnpm typecheck`.

Expected: PASS; the submitted `ProductDiagnosisInput` is identical to the
pre-change input for the same typed values.

- [ ] **Step 6: Commit Product flow copy**

```bash
git add src/modules/quick-diagnosis/components/product src/modules/quick-diagnosis/schemas/product-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/product-diagnosis.schema.test.ts
git commit -m "refactor: simplify resale diagnosis language"
```

---

### Task 6: Production guided-flow language

**Files:**

- Modify: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-values-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-fixed-expenses-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/monthly-volume-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/owner-compensation-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-fees-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-review-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts`

**Interfaces:**

- Consumes: unchanged `ProductionDiagnosisInput`, summarized/composed cost
  modes, reducer actions, and validators.
- Produces: copy-only changes plus selected `PlainLanguageHelp` instances; cost
  composition and submitted values remain identical.

**Required visible vocabulary:**

```ts
const stepTitles = {
  analysisMode: "Que tipo de resultado você quer ver?",
  productionValues: "Quanto custa produzir e por quanto você vende?",
  fixedExpenses: "Quais gastos você tem todo mês?",
  monthlyVolume: "Quantas unidades você vende por mês?",
  ownerCompensation: "Quanto você quer receber por mês?",
  fees: "O que é descontado de cada venda?",
  review: "Confira as informações da produção",
};
```

- [ ] **Step 1: Change Production UI and schema expectations first**

Test both summarized and composed cost modes. In composed mode, retain the
four components but expect plain labels: `Materiais`, `Embalagem`, `Seu tempo
de produção`, and `Outros gastos por unidade`. Assert the review repeats those
labels and contains no primary `pró-labore` or `custos fixos` text.

Add the same help interaction expectations for monthly expenses and owner
compensation as Task 5.

- [ ] **Step 2: Run Production tests to verify failure**

Run:

```bash
pnpm test \
  src/modules/quick-diagnosis/components/production/steps/production-steps.test.tsx \
  src/modules/quick-diagnosis/components/production/production-diagnosis-wizard.test.tsx \
  src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts
```

Expected: FAIL on the old technical vocabulary.

- [ ] **Step 3: Rewrite Production steps and review**

Use these primary questions and labels:

```text
Você sabe o custo total de uma unidade?
Quanto custa produzir uma unidade?
Quer somar os gastos de produção por partes?
Materiais
Embalagem
Seu tempo de produção
Outros gastos por unidade
Por quanto você vende cada unidade?
Gastos que existem todo mês
Quantas unidades você vende em um mês comum?
Você quer incluir o valor que recebe pelo seu trabalho?
Quanto você quer receber por mês?
```

Use the same fee labels and help content from Task 5. Preserve the current
toggle behavior: summarized mode sends component fields as `null`; composed
mode sends their exact sum.

- [ ] **Step 4: Rewrite Production validation messages without changing rules**

Keep the exact component-total equality, positivity, nullable-mode, percentage,
and volume rules. Replace only messages with visible terms. The component sum
error becomes:

```text
A soma de materiais, embalagem, seu tempo e outros gastos precisa ser igual ao custo de uma unidade.
```

- [ ] **Step 5: Run Production tests and type checking**

Run the three focused files from Step 2, then `pnpm typecheck`.

Expected: PASS for both cost modes and unchanged submitted values.

- [ ] **Step 6: Commit Production flow copy**

```bash
git add src/modules/quick-diagnosis/components/production src/modules/quick-diagnosis/schemas/production-diagnosis.schema.ts src/modules/quick-diagnosis/schemas/production-diagnosis.schema.test.ts
git commit -m "refactor: simplify production diagnosis language"
```

---

### Task 7: Service guided-flow language

**Files:**

- Modify: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/monthly-goal-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/fixed-expenses-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/pricing-and-price-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/work-routine-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/service-duration-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/material-cost-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/fees-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/flow-summary.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/review-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/service/steps/service-steps.test.tsx`
- Modify: `src/modules/quick-diagnosis/schemas/service-flow.schema.ts`
- Modify: `src/modules/quick-diagnosis/schemas/service-flow.schema.test.ts`

**Interfaces:**

- Consumes: unchanged `ServiceFlowInput`, dynamic step order, preview
  calculations, reducer actions, and validation rules.
- Produces: plain copy plus help; no change to supported pricing periods,
  normalized work minutes, material cost conversion, or service report command.
- `FlowSummary` changes `label: string` to `label: React.ReactNode` so a label
  and `PlainLanguageHelp` can share the summary header.

**Required titles:**

```ts
const stepTitles = {
  monthlyGoal: "Quanto você quer receber por mês?",
  fixedExpenses: "Quais gastos você tem todo mês?",
  pricingMethod: "Como você cobra pelo seu trabalho?",
  workRoutine: "Quanto tempo você trabalha?",
  serviceDuration: "Quanto tempo dura um serviço?",
  materialCost: "Você gasta materiais para fazer o serviço?",
  fees: "O que é descontado do valor recebido?",
  review: "Confira as informações do serviço",
};
```

- [ ] **Step 1: Change Service expectations first**

Update step/wizard/schema tests for the required titles. Keep all existing
pricing-method matrix and preview-value assertions. Add assertions for:

```text
Quanto você quer receber por mês?
Gastos que existem todo mês
Quanto você consegue trabalhar por mês
Quanto cada hora precisa gerar
Quanto tempo dura, em média, um serviço?
Você gasta com materiais ou produtos para fazer este serviço?
Qual porcentagem do valor recebido vai para impostos?
Qual porcentagem fica com o cartão ou a plataforma?
```

In review tests, expect `Quanto você quer receber`, `Gastos que existem todo
mês`, and `Quanto você consegue trabalhar por mês`.

- [ ] **Step 2: Run Service tests to verify failure**

Run:

```bash
pnpm test \
  src/modules/quick-diagnosis/components/service/steps/service-steps.test.tsx \
  src/modules/quick-diagnosis/components/service/service-diagnosis-wizard.test.tsx \
  src/modules/quick-diagnosis/schemas/service-flow.schema.test.ts \
  src/modules/quick-diagnosis/schemas/service-work-capacity.test.ts
```

Expected: FAIL on old labels while current preview numbers continue matching.

- [ ] **Step 3: Rewrite Service entry and review copy**

Use `receber` for the owner's desired monthly amount and reserve `gerar` for
the gross amount the activity needs. Rewrite the main preview sentence as:

```tsx
<FlowSummary label="Quanto o negócio precisa gerar por mês">
  {currency.format(preview.monthlyRevenueTargetCents / 100)} para pagar os
  gastos do mês e deixar o valor que você quer receber.
</FlowSummary>
```

The routine preview uses:

```text
Quanto você consegue trabalhar por mês
Para gerar {monthlyTarget}, cada hora precisa gerar {requiredHourlyRate}.
Hoje, seu preço equivale a {currentEquivalentRate} por hora.
```

Replace `Comparação na mesma base` with `Compare usando uma hora`.

Use the monthly-expense and owner-compensation help from Task 5, adapted from
sales to service. Add capacity help:

```ts
{
  triggerLabel: "Como calculamos?",
  title: "Quanto você consegue trabalhar por mês",
  description:
    "Usamos as horas e os dias informados para estimar o tempo disponível em um mês comum.",
  technicalTerm: "capacidade mensal",
}
```

- [ ] **Step 4: Rewrite Service validation messages without changing rules**

Preserve dynamic requirements for pricing method, work period, duration,
material unit, taxes, and payment fees. Replace technical field descriptions
with the exact visible questions. Examples:

```text
Informe quanto você quer receber por mês.
Informe os gastos que existem todo mês.
Informe quanto tempo dura, em média, um serviço.
Escolha quando esse gasto com materiais acontece.
Informe a porcentagem do valor recebido que vai para impostos.
```

- [ ] **Step 5: Run Service tests and type checking**

Run the four focused files from Step 2, then `pnpm typecheck`.

Expected: PASS; all previews and the final `ServiceDiagnosisCommand` retain
their existing numeric values.

- [ ] **Step 6: Commit Service flow copy**

```bash
git add src/modules/quick-diagnosis/components/service src/modules/quick-diagnosis/schemas/service-flow.schema.ts src/modules/quick-diagnosis/schemas/service-flow.schema.test.ts
git commit -m "refactor: simplify service diagnosis language"
```

---

### Task 8: Accept new content versions in atomic database writes

**Files:**

- Create: `supabase/migrations/20260907141951_accept_plain_language_report_versions.sql`
- Modify: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/product_diagnosis_reports.test.sql`
- Modify: `supabase/tests/production_diagnosis_reports.test.sql`

**Interfaces:**

- Consumes: unchanged signatures of
  `public.create_service_diagnosis_report`,
  `public.create_product_diagnosis_report`, and
  `public.create_production_diagnosis_report`.
- Produces: the same functions, permissions, RLS behavior, input validation,
  idempotency, and return values, with current accepted tuples changed to
  Service `3/2/4`, Product `1/1/2`, and Production `1/1/2`.
- This task writes Postgres/Supabase code; load the repository's `supabase` and
  `supabase-postgres-best-practices` skills before editing.

- [ ] **Step 1: Update pgTAP fixtures and add failing version assertions**

Change current helper defaults and JSON fixtures to content 4 for Service and
content 2 for Product/Production. Add one rejection assertion per old write
tuple:

```sql
-- Service function now rejects a new write claiming content 3.
p_content_version => 3::smallint

-- Product and Production now reject new writes claiming content 1.
p_content_version => 1::smallint
```

Keep tests that insert historical rows directly for read compatibility; do not
route historical fixtures through the current creation functions.

Continue asserting rejection of mismatched JSON scalar versions, malformed
snapshot objects, foreign users, unauthenticated calls, and duplicate
submission behavior.

- [ ] **Step 2: Run the three database files and verify current-version failures**

Run:

```bash
pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
```

Expected: FAIL because the installed functions still require content 3/1/1.

- [ ] **Step 3: Create the migration with unchanged function boundaries**

Copy the latest complete definitions from:

- Service: `supabase/migrations/20260902211904_refine_service_diagnosis_cost_flow.sql`
- Product: `supabase/migrations/20260901132003_create_product_diagnosis_reports.sql`
- Production: `supabase/migrations/20260901215331_create_production_diagnosis_reports.sql`

Use `create or replace function` with their existing argument lists. Preserve
the entire bodies, `security invoker`, `search_path`, revoke/grant statements,
and snapshot checks. Change only these conditions:

```sql
-- Service
if p_schema_version <> 3
  or p_calculation_version <> 2
  or p_content_version <> 4

-- Product
if p_schema_version is distinct from 1
  or p_calculation_version is distinct from 1
  or p_content_version is distinct from 2

-- Production
if p_schema_version is distinct from 1
  or p_calculation_version is distinct from 1
  or p_content_version is distinct from 2
```

Do not add a table update or any statement that rewrites `diagnoses`.

- [ ] **Step 4: Reset and run database verification**

Run:

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all pgTAP files pass; lint/advisors report no error-level finding
introduced by the migration.

- [ ] **Step 5: Commit database acceptance**

```bash
git add supabase/migrations supabase/tests/diagnosis_reports.test.sql supabase/tests/product_diagnosis_reports.test.sql supabase/tests/production_diagnosis_reports.test.sql
git commit -m "feat: accept plain-language report versions"
```

---

### Task 9: Cross-flow regression, accessibility, and bounded visual verification

**Files:**

- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/app/(private)/reports/[id]/page.test.tsx`
- Modify: `src/app/(private)/reports/page.test.tsx`
- Verify: all UI files changed in Tasks 1 and 4-7

**Interfaces:**

- Consumes: complete plain-language flows, current/legacy report parsers,
  current database functions, and the existing private-route auth boundaries.
- Produces: a green complete quality gate and one bounded desktop/mobile UI
  inspection; no new product behavior.

- [ ] **Step 1: Add route-level legacy/current coverage where absent**

At report detail route level, mock one current Product report and one legacy
Service report. Assert the current response contains `Resultado do seu
diagnóstico` and the legacy response contains `Seu relatório financeiro`.
Keep ownership/not-found/unavailable assertions intact.

At quick-diagnosis route/component level, assert the three category choices
still enter their original wizard and that the first visible title uses the
new vocabulary.

- [ ] **Step 2: Run all quick-diagnosis and report tests**

Run:

```bash
pnpm test src/modules/quick-diagnosis src/modules/reports 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx' 'src/app/(private)/reports/page.test.tsx'
```

Expected: PASS. If a failure asserts intentional old visible copy, update that
assertion to the approved new copy. If it detects changed calculation data,
fix the implementation rather than the expected number.

- [ ] **Step 3: Start the app and inspect desktop and mobile once**

Run: `pnpm dev`

Using seeded/local authenticated data, inspect one new report of each category
and one legacy report. Capture the quick-diagnosis flow and report at desktop
and a narrow mobile viewport. Check:

```text
- no clipped trigger or popup at 320 CSS px;
- no horizontal scrolling at 200% zoom;
- popup trigger is visible and understandable without its icon;
- focus ring is visible;
- Escape closes the popup and restores trigger focus;
- legacy report chrome and labels remain legacy;
- current report summary and number labels use the plain profile;
- all monetary values and percentages remain aligned and legible;
- no help is added to obvious values such as current price.
```

Collect all defects from this desktop/mobile pass and correct them in one
batch. Perform one confirmation pass only.

- [ ] **Step 4: Run the Impeccable detector once over changed UI targets**

Run:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json \
  src/components/shared/plain-language-help.tsx \
  src/modules/reports/components \
  src/modules/quick-diagnosis/components/product \
  src/modules/quick-diagnosis/components/production \
  src/modules/quick-diagnosis/components/service
```

Expected: no unresolved error-level design finding. Address findings in the
same bounded correction batch; do not begin an open-ended polish loop.

- [ ] **Step 5: Run the complete project gate**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
git diff --check
git status --short
```

Expected: all commands pass. `git status --short` contains only intentional
files from this feature before the final commit.

- [ ] **Step 6: Commit final integration corrections**

```bash
git add src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx 'src/app/(private)/quick-diagnosis/page.test.tsx' 'src/app/(private)/reports/[id]/page.test.tsx' 'src/app/(private)/reports/page.test.tsx'
git commit -m "test: verify plain-language diagnosis experience"
```

If the bounded visual pass changed an implementation file, add that exact file
to this commit command. Do not stage a directory or any unrelated working-tree
change.

- [ ] **Step 7: Handoff**

Report:

```text
- the three current content tuples;
- confirmation that legacy tuples still open with legacy labels;
- focused and full test commands run;
- database reset/pgTAP/lint/advisor results;
- desktop/mobile/keyboard checks completed;
- any intentionally deferred category-specific detailed copy.
```
