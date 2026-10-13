# Report Pricing and Margin Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os quatro tipos de relatório para incluir os gastos mensais e o pró-labore no menor preço quando existe volume, calcular somente a quantidade necessária quando o volume está ausente e apresentar a margem como informação objetiva, sem meta universal.

**Architecture:** Centralizar as contas unitárias compartilhadas em funções puras com inteiros, manter particularidades de Serviço e do mix Detalhado em seus próprios motores e propagar um único contrato atual por domínio, snapshot, persistência e interface. Como não existem dados de produção, os números atuais de versão e os nomes dos RPCs serão mantidos e corrigidos no lugar; schemas legados, conversores e seeds históricos serão removidos. O banco receberá uma única migração direta para as novas colunas detalhadas, constraints e corpos das funções vigentes.

**Tech Stack:** TypeScript 5.9, Next.js 16, React 19, Zod 4, Vitest, Testing Library, Supabase/PostgreSQL, pgTAP, pnpm.

**Spec:** [docs/superpowers/specs/2026-09-28-report-pricing-and-margin-corrections-design.md](../specs/2026-09-28-report-pricing-and-margin-corrections-design.md)

## Global Constraints

- Manter exatamente as versões atuais:
  - Serviço `4/3/5`;
  - Produto `3/3/4`;
  - Produção `3/3/4`;
  - Detalhado `1/1/1`.
- Manter os RPCs públicos `create_service_diagnosis_report_v4`, `create_product_diagnosis_report_v3`, `create_production_diagnosis_report_v3` e `create_detailed_diagnosis_report`.
- Não criar adapters de compatibilidade, novos RPCs versionados, backfills ou leitura paralela de snapshots antigos.
- Não editar migrações históricas. Criar uma migração nova pelo CLI do Supabase e aplicá-la somente ao banco local confirmado.
- Não executar Playwright, teste E2E em navegador, inspeção visual automatizada ou ferramenta equivalente.
- Validar componentes com Vitest, Testing Library e testes de acessibilidade já usados no repositório.
- Fazer todas as contas financeiras com inteiros e os helpers de `integer-math.ts`; não introduzir ponto flutuante em fórmulas monetárias.
- Tratar volume `null`, volume `0` e volume positivo como estados distintos.
- Quando `proLaboreIncluded` for falso, ignorar `proLaboreCents` mesmo que um payload inválido ainda traga valor.
- Em cada tarefa: escrever o teste que falha, confirmar a falha esperada,
  implementar o mínimo e confirmar a passagem antes de avançar ao checkpoint
  seguinte.
- As Tasks 2–9 formam uma única troca atômica do contrato da aplicação. Execute
  seus testes focados a cada etapa, mas não faça commits intermediários: tipos,
  schemas e consumidores mudam juntos e não deve existir commit com o
  TypeScript quebrado. O commit da aplicação acontece somente no fim da Task 9,
  depois da suíte de módulos e do typecheck.

---

## Task 1: Centralize the shared unit economics

**Files:**

- Create: `src/modules/reports/domain/unit-economics.test.ts`
- Create: `src/modules/reports/domain/unit-economics.ts`

- [ ] **Step 1: Write the failing shared-formula tests**

Create tests for this public API:

```ts
import {
  calculateAllocatedUnitEconomics,
  calculateDirectUnitEconomics,
  calculateFixedAllocation,
  calculateMonthlySalesGoal,
} from "./unit-economics";

describe("unit economics", () => {
  it("calculates the approved resale example using the complete unit cost", () => {
    const direct = calculateDirectUnitEconomics({
      currentPriceCents: 5_500,
      directUnitCostCents: 1_600,
      totalFeeBasisPoints: 700,
    });
    const fixedAllocationCents = calculateFixedAllocation(400_000, 200);
    expect(fixedAllocationCents).toBe(2_000);
    if (fixedAllocationCents === null) {
      throw new Error("Expected a fixed allocation for positive volume.");
    }
    const complete = calculateAllocatedUnitEconomics({
      ...direct,
      currentPriceCents: 5_500,
      directUnitCostCents: 1_600,
      totalFeeBasisPoints: 700,
      fixedAllocationCents,
    });

    expect(direct).toEqual({
      feeAmountCents: 385,
      netRevenueCents: 5_115,
      unitContributionCents: 3_515,
    });
    expect(complete).toEqual({
      fixedAllocationCents: 2_000,
      totalUnitCostCents: 3_600,
      unitProfitCents: 1_515,
      realMarginBasisPoints: 2_755,
      minimumPriceCents: 3_871,
    });
    expect(calculateMonthlySalesGoal(400_000, 3_515)).toBe(114);
  });

  it.each([null, 0])(
    "does not allocate monthly expenses with volume %s",
    (volume) => {
      expect(calculateFixedAllocation(400_000, volume)).toBeNull();
    },
  );

  it("returns no price floor when fees consume the whole price", () => {
    expect(
      calculateAllocatedUnitEconomics({
        currentPriceCents: 5_500,
        directUnitCostCents: 1_600,
        totalFeeBasisPoints: 10_000,
        feeAmountCents: 5_500,
        netRevenueCents: 0,
        unitContributionCents: -1_600,
        fixedAllocationCents: 2_000,
      }).minimumPriceCents,
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm test -- src/modules/reports/domain/unit-economics.test.ts
```

Expected: FAIL because `unit-economics.ts` does not exist.

- [ ] **Step 3: Implement the shared integer-only helpers**

Define these exact contracts in `unit-economics.ts`:

```ts
type DirectUnitEconomics = {
  feeAmountCents: number;
  netRevenueCents: number;
  unitContributionCents: number;
};

type AllocatedUnitEconomics = {
  fixedAllocationCents: number;
  totalUnitCostCents: number;
  unitProfitCents: number;
  realMarginBasisPoints: number | null;
  minimumPriceCents: number | null;
};

function calculateDirectUnitEconomics(input: {
  currentPriceCents: number;
  directUnitCostCents: number;
  totalFeeBasisPoints: number;
}): DirectUnitEconomics;

function calculateFixedAllocation(
  effectiveFixedCostCents: number,
  monthlySalesVolume: number | null,
): number | null;

function calculateAllocatedUnitEconomics(
  input: DirectUnitEconomics & {
    currentPriceCents: number;
    directUnitCostCents: number;
    totalFeeBasisPoints: number;
    fixedAllocationCents: number;
  },
): AllocatedUnitEconomics;

function calculateMonthlySalesGoal(
  effectiveFixedCostCents: number,
  unitContributionCents: number,
): number | null;
```

Implementation rules:

- `feeAmountCents = round(price × fees / 10_000)`;
- `netRevenueCents = price − fee`;
- `unitContributionCents = netRevenue − directCost`;
- fixed allocation uses `ceilDivide(F, Q)` only for `Q > 0`;
- `totalUnitCostCents = directCost + allocation`;
- `unitProfitCents = netRevenue − totalUnitCost`;
- real margin uses `roundDivide(unitProfit × 10_000, price)`;
- minimum price uses `ceilDivide(totalUnitCost × 10_000, 10_000 − fees)`;
- sales goal uses `ceilDivide(F, contribution)` only when contribution is positive.

- [ ] **Step 4: Run the focused tests and typecheck**

Run:

```bash
pnpm test -- src/modules/reports/domain/unit-economics.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/reports/domain/unit-economics.ts src/modules/reports/domain/unit-economics.test.ts
git commit -m "refactor: centralize report unit economics"
```

---

## Task 2: Correct Product and Production calculations

**Files:**

- Modify: `src/modules/reports/domain/calculate-product-report.test.ts`
- Modify: `src/modules/reports/domain/calculate-product-report.ts`
- Modify: `src/modules/reports/domain/calculate-production-report.test.ts`
- Modify: `src/modules/reports/domain/calculate-production-report.ts`
- Modify: `src/modules/reports/types.ts`

- [ ] **Step 1: Replace threshold tests with objective scenario tests**

For both engines, add the approved known-volume assertions:

```ts
expect(calculation).toMatchObject({
  effectiveFixedCostCents: 400_000,
  fixedAllocationCents: 2_000,
  totalUnitCostCents: 3_600,
  feeAmountCents: 385,
  netRevenueCents: 5_115,
  unitContributionCents: 3_515,
  unitProfitCents: 1_515,
  monthlyGrossRevenueCents: 1_100_000,
  monthlyNetRevenueCents: 1_023_000,
  monthlyResultCents: 303_000,
  realMarginBasisPoints: 2_755,
  minimumPriceCents: 3_871,
  monthlySalesGoal: 114,
  verdict: "positive_result",
  priority: "volume",
});
```

Add cases proving:

- volume `null`: contribution and monthly sales goal remain available; allocation, complete cost, unit profit, monthly result, real margin, minimum price and discount limit are `null`;
- volume `0`: monthly result is `-400_000`, real margin and unit complete values remain `null`, and the monthly sales goal is still `114`;
- a larger positive volume reduces `fixedAllocationCents`;
- `proLaboreIncluded: false` ignores a non-zero residual `proLaboreCents`;
- margins of approximately 1%, 10% and 30% all classify as `positive_result`;
- break-even returns `break_even` without priority `margin`.

- [ ] **Step 2: Run both suites and confirm RED**

```bash
pnpm test -- src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.test.ts
```

Expected: FAIL on the partial minimum price, old verdicts and residual pró-labore behavior.

- [ ] **Step 3: Refactor both engines onto the shared helpers**

In both calculators:

- derive effective fixed cost with the boolean guard;
- call `calculateDirectUnitEconomics`;
- call `calculateFixedAllocation`;
- call `calculateAllocatedUnitEconomics` only when allocation exists;
- calculate monthly result exactly as `contribution × Q − F`, never as rounded unit profit times volume;
- calculate real margin as `monthlyResult × 10_000 ÷ monthlyGrossRevenue`;
- remove `PRODUCT_ATTENTION_BAND_BPS` and `PRODUCTION_ATTENTION_BAND_BPS`;
- remove `priceReferencesPartial` from both calculation types;
- make `minimumPriceCents` and `breakEvenDiscountPercent` unavailable without positive volume;
- keep monthly goal available whenever contribution is positive;
- keep weekly/daily goal `null` only when volume is unknown; volume zero is known and may show the normal split;
- emit only `direct_loss`, `incomplete_volume`, `no_sales`, `operational_loss`, `break_even` or `positive_result`;
- never emit priority `margin`.

In `types.ts`, replace the current Product and Production margin-band
verdicts with `positive_result`. Keep `margin` in the technical priority
union until the database task, but do not return it.

- [ ] **Step 4: Run focused suites**

```bash
pnpm test -- src/modules/reports/domain/calculate-product-report.test.ts src/modules/reports/domain/calculate-production-report.test.ts
```

Expected: PASS.

- [ ] **Step 5: Keep the application change uncommitted**

Continue directly to Task 3. The full TypeScript graph is expected to remain
in transition until Task 9; do not restore old verdicts to make an intermediate
commit compile.

---

## Task 3: Correct Detailed allocation and sales goals

**Files:**

- Modify: `src/modules/detailed-diagnosis/types.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-item.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.ts`
- Modify: `src/modules/reports/domain/calculate-detailed-sales-goal.test.ts`
- Modify: `src/modules/reports/domain/calculate-detailed-sales-goal.ts`

- [ ] **Step 1: Add failing full-cost item tests**

Extend `DetailedItemCalculation` with:

```ts
fixedAllocationCents: number | null;
totalUnitCostCents: number | null;
unitProfitCents: number | null;
realMarginBasisPoints: number | null;
```

Change the item-calculator contract to:

```ts
calculateDetailedItem(
  item,
  rates,
  fixedAllocationCents: number | null,
)
```

For the approved R$ 55 resale item and a R$ 20 allocation, assert:

```ts
expect(result).toMatchObject({
  variableUnitCostCents: 1_600,
  feeAmountCents: 385,
  netUnitRevenueCents: 5_115,
  unitContributionCents: 3_515,
  fixedAllocationCents: 2_000,
  totalUnitCostCents: 3_600,
  unitProfitCents: 1_515,
  realMarginBasisPoints: 2_755,
  breakEvenUnitPriceCents: 3_871,
});
```

With allocation `null`, assert that the four complete-cost fields and `breakEvenUnitPriceCents` are `null`, while contribution fields remain calculated.

- [ ] **Step 2: Add failing mix and sales-goal tests**

Cover:

- all item volumes known and total volume positive: one shared `ceilDivide(F, totalVolume)` allocation is applied to every unit;
- the fixed cost is subtracted once from the monthly mix result;
- any missing volume makes every per-item complete-cost field unavailable;
- total known volume zero gives monthly result `-F` and no unit allocation;
- one item with unknown volume and positive contribution returns monthly goal `ceil(F / contribution)`, with weekly/daily values `null`;
- multiple items with any unknown volume return unavailable because the mix is unknown;
- all volumes known preserve the informed mix with `ceil(F × totalVolume / monthlyContribution)`;
- disabled pró-labore ignores residual cents;
- positive monthly results always emit `positive_result`.

Update the available sales-goal shape to:

```ts
type DetailedSalesGoal =
  | {
      available: true;
      monthly: number;
      weekly: number | null;
      daily: number | null;
      basedOnKnownMix: boolean;
    }
  | { available: false; reason: string };
```

- [ ] **Step 3: Run the focused suites and confirm RED**

```bash
pnpm test -- src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/reports/domain/calculate-detailed-sales-goal.test.ts
```

Expected: FAIL because item floors still use only variable cost and partial single-item goals are unavailable.

- [ ] **Step 4: Implement shared allocation across the mix**

In `calculateDetailedDiagnosis`:

```ts
const effectiveProLaboreCents = command.proLaboreIncluded
  ? command.proLaboreCents
  : 0;
const totalKnownVolume = isPartial
  ? null
  : command.items.reduce(
      (sum, item) => sum + (item.monthlySalesVolume ?? 0),
      0,
    );
const fixedAllocationCents = calculateFixedAllocation(
  effectiveFixedCostCents,
  totalKnownVolume,
);
const items = command.items.map((item) =>
  calculateDetailedItem(item, rates, fixedAllocationCents),
);
```

Use the shared direct and allocated unit helpers inside `calculateDetailedItem`. Keep contribution margin because it explains how much a sale helps to pay the month; do not label it as real margin.

Remove `DETAILED_ATTENTION_BAND_BASIS_POINTS`. The corrected classifier must return `positive_result` for every positive monthly result and must never return priority `margin`.

- [ ] **Step 5: Implement the three sales-goal branches**

Use:

1. one item with missing volume: `ceil(F / itemContribution)`, no weekly/daily split;
2. multiple items with a missing volume: unavailable;
3. complete known mix with positive total volume and contribution: preserve mix and calculate weekly/daily;
4. known total volume zero: unavailable because there is no observed mix.

Messages returned as `reason` must be plain and actionable, for example: `"Para calcular uma quantidade única, informe as vendas mensais de todos os itens."`

- [ ] **Step 6: Run focused suites**

```bash
pnpm test -- src/modules/detailed-diagnosis/domain/calculate-detailed-item.test.ts src/modules/detailed-diagnosis/domain/calculate-detailed-diagnosis.test.ts src/modules/reports/domain/calculate-detailed-sales-goal.test.ts
```

Expected: PASS.

- [ ] **Step 7: Keep the application change uncommitted**

Continue directly to Task 4.

---

## Task 4: Remove the Service margin target

**Files:**

- Modify: `src/modules/reports/domain/calculate-service-report.test.ts`
- Modify: `src/modules/reports/domain/calculate-service-report.ts`
- Modify: `src/modules/reports/types.ts`

- [ ] **Step 1: Write failing objective-verdict tests**

Replace tests around 15% and `above_target` with cases proving:

- price missing remains `missing_price`;
- non-positive contribution remains `direct_loss`;
- missing work capacity leaves complete cost, minimum price, unit profit and real margin unavailable;
- negative full result is `operational_loss`;
- zero full result is `break_even`;
- any positive full result, whether its margin is about 1%, 10% or 30%, is `positive_result`;
- no corrected path returns priority `margin`;
- `targetPriceCents` no longer exists.

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm test -- src/modules/reports/domain/calculate-service-report.test.ts
```

Expected: FAIL on removed target fields and old margin-band verdicts.

- [ ] **Step 3: Simplify Service calculation**

Remove:

- `SERVICE_TARGET_MARGIN_BPS`;
- `SERVICE_ABOVE_TARGET_BPS`;
- `targetRateBps`;
- `targetPriceCents`;
- all branches for `tight_margin`, `adequate_margin` and `above_target`.

Keep the existing capacity denominator and full service cost. Add `break_even` and `positive_result` to the service verdict type. Select priority only from objective facts: `cost` for direct loss, `price` for missing/negative result, and `volume` for break-even/positive result.

- [ ] **Step 4: Run focused suite**

```bash
pnpm test -- src/modules/reports/domain/calculate-service-report.test.ts
```

Expected: PASS.

- [ ] **Step 5: Keep the application change uncommitted**

Continue directly to Task 5.

---

## Task 5: Collapse snapshots to the corrected current contracts

**Files:**

- Modify: `src/modules/reports/schemas/service-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/product-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/production-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/detailed-report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.ts`
- Modify: `src/modules/reports/schemas/report-snapshot.schema.test.ts`
- Modify: `src/modules/reports/types.ts`

- [ ] **Step 1: Replace compatibility tests with current-contract tests**

Rewrite the large snapshot fixture suite around exactly four valid fixtures:

- Service `4/3/5`;
- Product `3/3/4`;
- Production `3/3/4`;
- Detailed `1/1/1`.

Assert that:

- each current parser accepts its corrected fixture;
- the union parser accepts all four;
- `positive_result` is accepted;
- target/attention fields and partial direct-cost floors are rejected by strict schemas;
- a representative old Product, Production or Service snapshot is rejected;
- recalculated results must still match normalized inputs;
- missing positive volume requires `minimumPriceCents: null` and `unitCostCents: null` in the discount base;
- detailed results contain the four new nullable item fields.

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm test -- src/modules/reports/schemas/report-snapshot.schema.test.ts
```

Expected: FAIL because current schemas still union legacy contracts and still require target/attention fields.

- [ ] **Step 3: Collapse each schema file**

Preserve the numeric version literals but expose only one shape per report.

The corrected discount base is:

```ts
type ReportDiscountSimulationBase = {
  originalPriceCents: number;
  unitCostCents: number | null;
  totalFeeBasisPoints: number;
  minimumPriceCents: number | null;
};
```

Remove from active schemas:

- `targetMarginBasisPoints`;
- `attentionBandBasisPoints`;
- `targetPriceCents`;
- `priceReferencesPartial`;
- `partial`;
- legacy schema unions and legacy exported version types.

Keep only aliases that help callers express “current”, for example:

```ts
type ServiceReportSnapshot = z.infer<typeof serviceReportSnapshotSchema>;
type CurrentServiceReportSnapshot = ServiceReportSnapshot;
```

Detailed policy keeps only concentration and scheduling values plus `proLaboreIncluded`; it no longer contains an attention band.

- [ ] **Step 4: Simplify the top-level report union**

`report-snapshot.schema.ts` must discriminate only the four corrected contracts. Delete guards whose only purpose is selecting old snapshot versions.

Update `types.ts` exports so consumers cannot import `ProductReportSnapshotV1`, `ServiceReportSnapshotV2` or equivalent historical types.

- [ ] **Step 5: Run schema tests**

```bash
pnpm test -- src/modules/reports/schemas/report-snapshot.schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Keep the application change uncommitted**

Continue directly to Task 6. Do not add historical type aliases back for
consumers that have not yet been updated.

---

## Task 6: Rebuild snapshot content with objective, caring language

**Files:**

- Modify: `src/modules/reports/domain/build-service-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-service-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-product-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-production-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.test.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-snapshot.ts`
- Modify: `src/modules/reports/domain/build-service-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-service-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-product-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.test.ts`
- Modify: `src/modules/reports/domain/build-production-executive-summary.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-content.test.ts`
- Modify: `src/modules/reports/domain/build-detailed-report-content.ts`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts`
- Modify: `src/modules/detailed-diagnosis/domain/build-detailed-guidance.ts`

- [ ] **Step 1: Write failing copy and snapshot assertions**

Across builder tests, assert:

- known volume explains the share of monthly expenses and displays the full minimum price;
- unknown volume does not display a direct-cost price floor;
- unknown volume highlights the monthly quantity at the current price;
- the sentence mentions the amount set aside for the person only when pró-labore is enabled;
- contribution is called `"Valor deixado por venda"`;
- true unit profit is called `"Quanto sobra por venda"`;
- real margin is called `"Quanto sobra a cada R$ 100"`;
- no content contains `margem adequada`, `margem apertada`, `acima da meta`, `boa folga`, `pouca folga`, `meta de 15%`, `meta de 20%` or `preço-alvo`;
- `positive_result` is described factually, without saying the business is healthy or the price is ideal.

- [ ] **Step 2: Run all builder tests and confirm RED**

```bash
pnpm test -- src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-detailed-report-content.test.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
```

Expected: FAIL on old verdict labels, attention policy and partial price language.

- [ ] **Step 3: Update quick builders and summaries**

Use these primary phrases consistently:

- `Quanto esta unidade custa`;
- `Parte dos gastos do mês`;
- `Custo completo por unidade`;
- `Valor deixado por venda`;
- `Quanto sobra por venda`;
- `Quanto sobra a cada R$ 100`;
- `Quantas vendas pagam o mês`;
- `Menor preço para não ficar no prejuízo`.

For unknown volume, use:

> Como você ainda não informou quantas vendas faz, não dividimos os gastos do mês por uma quantidade estimada. No preço atual, você precisa de cerca de N vendas para pagar esses gastos e separar o valor informado para você.

Omit the final withdrawal clause when pró-labore is disabled.

Build discount bases with `unitCostCents: null` whenever the full unit cost is unavailable.

- [ ] **Step 4: Update Detailed content and guidance**

Use complete item profit only when allocation exists. Comparisons may say one informed item leaves more or less than another, but must not turn that observation into a universal margin judgment.

When multiple items have an unknown volume, explain that a combined quantity would require inventing a sales mix. For one item with unknown volume, show only the monthly quantity.

- [ ] **Step 5: Run builder suites and forbidden-copy scan**

```bash
pnpm test -- src/modules/reports/domain/build-service-report-snapshot.test.ts src/modules/reports/domain/build-product-report-snapshot.test.ts src/modules/reports/domain/build-production-report-snapshot.test.ts src/modules/reports/domain/build-detailed-report-snapshot.test.ts src/modules/reports/domain/build-service-executive-summary.test.ts src/modules/reports/domain/build-product-executive-summary.test.ts src/modules/reports/domain/build-production-executive-summary.test.ts src/modules/reports/domain/build-detailed-report-content.test.ts src/modules/detailed-diagnosis/domain/build-detailed-guidance.test.ts
rg -n --glob '!*.test.*' "margem adequada|margem apertada|acima da meta|boa folga|pouca folga|meta de 15%|meta de 20%|preço-alvo" src/modules/reports/domain src/modules/detailed-diagnosis/domain
```

Expected: tests PASS and `rg` returns no active user-facing match.

- [ ] **Step 6: Keep the application change uncommitted**

Continue directly to Task 7.

---

## Task 7: Simplify presenters to one current language profile

**Files:**

- Modify: `src/modules/reports/presenters/report-language.test.ts`
- Modify: `src/modules/reports/presenters/report-language.ts`
- Modify: `src/modules/reports/presenters/to-comfortable-report-answers.test.ts`
- Modify: `src/modules/reports/presenters/to-comfortable-report-answers.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.test.ts`
- Modify: `src/modules/reports/presenters/to-report-view-model.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.test.ts`
- Modify: `src/modules/reports/presenters/to-detailed-report-view-model.ts`

- [ ] **Step 1: Write failing current-only presenter tests**

Assert that presenters:

- map `positive_result` to `"Resultado positivo"`, not a margin quality label;
- contain no version-tuple branching;
- expose no `target` number and no `legacy_target` simulator mode;
- show unavailable complete values with an explanation, never `R$ 0,00`;
- show detailed item allocation, full unit cost, unit profit and real margin separately from contribution;
- show a single-item unknown-volume goal without weekly/daily supporting text;
- keep all help text understandable without depending on `rateio`, `contribuição` or other accounting vocabulary.

- [ ] **Step 2: Run presenter tests and confirm RED**

```bash
pnpm test -- src/modules/reports/presenters/report-language.test.ts src/modules/reports/presenters/to-comfortable-report-answers.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts
```

Expected: FAIL on legacy profiles, target-price cards and missing detailed fields.

- [ ] **Step 3: Remove legacy presenter branches**

Delete:

- `LegacyProductSnapshot` and `LegacyProductionSnapshot`;
- version-tuple language profiles;
- `serviceMarginHelp`, `attentionBandHelp`, `targetPriceHelp` and `partialTargetPriceHelp`;
- number key `target`;
- simulator mode `legacy_target`;
- references to `targetPriceCents`, `attentionBandBasisPoints`, `targetMarginBasisPoints`, `partial` and `priceReferencesPartial`.

Keep one current language map for objective verdicts. For positive results, use the exact calculated amount and percentage, without adjectives about quality.

- [ ] **Step 4: Extend the detailed item view model**

Add formatted labels for:

```ts
fixedAllocationLabel: string;
totalUnitCostLabel: string;
unitProfitLabel: string;
realMarginLabel: string;
completeCostUnavailableReason?: string;
```

The discount base must use `totalUnitCostCents`, never `variableUnitCostCents`.

- [ ] **Step 5: Run presenter suites**

```bash
pnpm test -- src/modules/reports/presenters/report-language.test.ts src/modules/reports/presenters/to-comfortable-report-answers.test.ts src/modules/reports/presenters/to-report-view-model.test.ts src/modules/reports/presenters/to-detailed-report-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 6: Keep the application change uncommitted**

Continue directly to Task 8.

---

## Task 8: Update the simulator and report cards without browser automation

**Required skill before editing UI:** Read and follow `/home/pereira/projetos/Lucrivo/.agents/skills/impeccable/SKILL.md`. Use it only to preserve clarity, accessibility and responsive behavior within the approved interface; do not redesign unrelated screens.

**Files:**

- Modify: `src/modules/reports/components/discount-simulator.test.tsx`
- Modify: `src/modules/reports/components/discount-simulator.tsx`
- Modify: `src/modules/reports/components/detailed-item-card.test.tsx`
- Modify: `src/modules/reports/components/detailed-item-card.tsx`
- Modify: `src/modules/reports/components/detailed-item-breakdown.tsx`
- Modify: `src/modules/reports/components/report-numbers.test.tsx`
- Modify: `src/modules/reports/components/report-numbers.tsx`
- Modify: `src/modules/reports/components/report-detail.test.tsx`
- Modify: `src/modules/reports/components/detailed-report-detail.test.tsx`

- [ ] **Step 1: Rewrite simulator unit tests around four objective states**

The exact status union is:

```ts
type DiscountSimulationStatus =
  "unavailable" | "positive_result" | "break_even" | "loss";
```

Assert:

- unavailable when full unit cost or minimum price is absent;
- positive whenever discounted unit profit is greater than zero, independent of percentage;
- break-even at zero unit profit;
- loss below the complete-cost floor;
- no target/attention field is read;
- the range input is disabled when unavailable;
- the unavailable message says a quantity is needed to divide monthly expenses;
- status text, not color alone, communicates the result.

- [ ] **Step 2: Add failing detailed-card tests**

For a complete item, assert visible rows for:

1. price and amount after fees;
2. direct unit cost;
3. monthly-expense share;
4. complete unit cost;
5. amount left per sale;
6. real margin;
7. full minimum price;
8. value contributed toward the month.

For an incomplete item, assert the complete-cost rows say `"Ainda não calculado"` and explain the missing quantity; do not render a zero or direct-cost floor.

- [ ] **Step 3: Run component tests and confirm RED**

```bash
pnpm test -- src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/detailed-item-card.test.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx
```

Expected: FAIL on target states and missing complete-cost rows.

- [ ] **Step 4: Implement the objective simulator**

Remove all context modes and safety messages tied to target percentages. Keep the category only if wording genuinely changes between a service and a unit.

The positive message should be factual:

> Com este desconto, o preço ainda paga os valores considerados e deixa X por venda.

The unavailable message should be:

> Para calcular um desconto seguro, primeiro precisamos de uma quantidade para dividir os gastos do mês.

Service may keep its capacity-based simulator because its full unit cost is available.

- [ ] **Step 5: Update cards and comparison**

The detailed comparison must use:

- monthly result attributable to the informed item mix when full volume exists; or
- direct contribution only when explaining how a sale helps the month.

Its labels must explicitly distinguish these meanings. Do not call contribution `lucro`.

- [ ] **Step 6: Run component tests only**

```bash
pnpm test -- src/modules/reports/components/discount-simulator.test.tsx src/modules/reports/components/detailed-item-card.test.tsx src/modules/reports/components/report-numbers.test.tsx src/modules/reports/components/report-detail.test.tsx src/modules/reports/components/detailed-report-detail.test.tsx
```

Expected: PASS. Do not run Playwright or any browser-driven command.

- [ ] **Step 7: Keep the application change uncommitted**

Continue directly to Task 9.

---

## Task 9: Align editor previews, services and RPC arguments

**Files:**

- Modify: `src/modules/reports/editor/calculate-report-preview.test.ts`
- Modify: `src/modules/reports/editor/calculate-report-preview.ts`
- Modify: `src/modules/reports/editor/detailed-editor-summary.test.ts`
- Modify: `src/modules/reports/editor/detailed-editor-summary.ts`
- Modify: `src/modules/reports/editor/report-editor.adapters.test.ts`
- Modify: `src/modules/reports/editor/report-editor.adapters.ts`
- Modify: `src/modules/reports/components/report-editor.test.tsx`
- Modify: `src/modules/reports/services/report-rpc-args.test.ts`
- Modify: `src/modules/reports/services/report-rpc-args.ts`
- Modify: `src/modules/reports/services/create-service-report.service.test.ts`
- Modify: `src/modules/reports/services/create-product-report.service.test.ts`
- Modify: `src/modules/reports/services/create-production-report.service.test.ts`
- Modify: `src/modules/reports/services/create-detailed-report.service.test.ts`
- Modify: `src/modules/reports/services/replace-report.service.test.ts`
- Modify: `scripts/demo-seed/report-scenarios.test.ts`
- Modify: `scripts/demo-seed/report-scenarios.ts`
- Modify: `scripts/demo-seed/user-scenarios.test.ts`
- Modify: `scripts/demo-seed/user-scenarios.ts`
- Delete: `scripts/demo-seed/historical-report-scenarios.test.ts`
- Delete: `scripts/demo-seed/historical-report-scenarios.ts`
- Modify (generated): `supabase/seed.sql`

- [ ] **Step 1: Add failing preview and RPC tests**

Assert:

- removing volume from the editor clears allocation, complete unit cost, minimum price, unit profit and real margin together;
- adding volume restores all five from the same domain engine used at creation;
- the single-item detailed preview without volume shows its monthly sales goal;
- the four service methods still call the existing RPC names;
- quick RPC argument versions remain unchanged;
- detailed `p_items` contains `fixedAllocationCents`, `totalUnitCostCents`, `unitProfitCents` and `realMarginBasisPoints`;
- no RPC argument contains a target/attention field.

- [ ] **Step 2: Run focused suites and confirm RED**

```bash
pnpm test -- src/modules/reports/editor/calculate-report-preview.test.ts src/modules/reports/editor/detailed-editor-summary.test.ts src/modules/reports/editor/report-editor.adapters.test.ts src/modules/reports/components/report-editor.test.tsx src/modules/reports/services/report-rpc-args.test.ts src/modules/reports/services/create-service-report.service.test.ts src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-production-report.service.test.ts src/modules/reports/services/create-detailed-report.service.test.ts src/modules/reports/services/replace-report.service.test.ts
```

Expected: FAIL on stale snapshot types and detailed persistence shape.

- [ ] **Step 3: Remove compatibility adapters**

Make preview and edit adapters accept only corrected current snapshots. Do not convert old tuples. Continue to call the same domain calculators and builders as creation actions.

- [ ] **Step 4: Update detailed persistence items**

Because `p_items` is already JSON, keep the public RPC signature unchanged. `toDetailedPersistenceItems` should naturally merge the four added calculation fields into every item.

Preserve all current scalar RPC arguments and current RPC names.

- [ ] **Step 5: Replace historical demo fixtures**

Replace the old verdict matrices with:

- Service: `missing_price`, `direct_loss`, `operational_loss`,
  `break_even`, `positive_result`;
- Product and Production quick: `direct_loss`, `incomplete_volume`,
  `no_sales`, `operational_loss`, `break_even`, `positive_result`;
- Product and Production detailed: the same six unit-report states.

Delete both historical scenario files. Build admin and client reports from
`currentReportTemplates` directly. Update shapes so each expected verdict is
produced by the corrected engines.

Run:

```bash
pnpm test -- scripts/demo-seed/report-scenarios.test.ts scripts/demo-seed/user-scenarios.test.ts
pnpm seed:generate
pnpm seed:check
```

Expected: PASS. Do not hand-edit `supabase/seed.sql`.

- [ ] **Step 6: Run focused suites, all report modules and typecheck**

```bash
pnpm test -- src/modules/reports/editor/calculate-report-preview.test.ts src/modules/reports/editor/detailed-editor-summary.test.ts src/modules/reports/editor/report-editor.adapters.test.ts src/modules/reports/components/report-editor.test.tsx src/modules/reports/services/report-rpc-args.test.ts src/modules/reports/services/create-service-report.service.test.ts src/modules/reports/services/create-product-report.service.test.ts src/modules/reports/services/create-production-report.service.test.ts src/modules/reports/services/create-detailed-report.service.test.ts src/modules/reports/services/replace-report.service.test.ts
pnpm test -- src/modules/reports src/modules/detailed-diagnosis
pnpm test -- scripts/demo-seed
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the atomic application change**

```bash
git add src/modules/reports src/modules/detailed-diagnosis scripts/demo-seed supabase/seed.sql
git commit -m "fix: correct report pricing and margin calculations"
```

---

## Task 10: Persist the corrected current contract in Supabase

**Files:**

- Create via CLI: the migration ending in `_correct_report_economics.sql` under `supabase/migrations/`
- Modify: `supabase/tests/diagnosis_reports.test.sql`
- Modify: `supabase/tests/product_diagnosis_reports.test.sql`
- Modify: `supabase/tests/production_diagnosis_reports.test.sql`
- Modify: `supabase/tests/detailed_diagnosis_reports.test.sql`
- Modify: `supabase/tests/report_lifecycle.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts`

- [ ] **Step 1: Confirm the target is local**

Run:

```bash
pnpm exec supabase status
```

Expected: local API and database URLs on `127.0.0.1`. Stop if the target is remote.

- [ ] **Step 2: Write failing pgTAP assertions first**

Update the five SQL suites to require:

- `positive_result` accepted in `public.diagnoses`;
- the same four public RPC names and signatures;
- current version tuples unchanged;
- snapshots with corrected objective results accepted;
- snapshots/scalars with mismatched result, margin or verdict rejected;
- detailed rows contain the four new columns;
- detailed JSON values match normalized rows;
- staged replacement copies the four new columns and deletes the staged report;
- ownership, paid access, idempotency and optimistic version checks remain intact.

Run:

```bash
pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql
```

Expected: FAIL because the columns and corrected function validations do not exist yet.

- [ ] **Step 3: Create the migration through the required CLI flow**

```bash
pnpm exec supabase migration new correct_report_economics
```

Use the exact generated path printed by the CLI for every remaining step in this task. Do not invent or edit an older migration filename.

- [ ] **Step 4: Add the detailed item columns and constraints**

The migration must add:

```sql
alter table public.detailed_diagnosis_items
  add column fixed_allocation_cents bigint,
  add column total_unit_cost_cents bigint,
  add column unit_profit_cents bigint,
  add column real_margin_basis_points integer;

alter table public.detailed_diagnosis_items
  add constraint detailed_diagnosis_items_full_cost_check check (
    (
      fixed_allocation_cents is null
      and total_unit_cost_cents is null
      and unit_profit_cents is null
      and real_margin_basis_points is null
    )
    or (
      fixed_allocation_cents >= 0
      and total_unit_cost_cents =
        variable_unit_cost_cents + fixed_allocation_cents
      and unit_profit_cents is not null
      and real_margin_basis_points is not null
    )
  );
```

Keep `break_even_unit_price_cents` independently nullable because fees at or above 100% make a floor impossible even when full unit cost exists.

There is no data backfill. Existing local rows may keep these nullable fields until the local database is reset.

- [ ] **Step 5: Update verdict constraint without broad cleanup**

Replace `diagnoses_verdict_check` so it accepts `positive_result`. It may continue accepting old values to minimize unrelated database churn, but corrected application functions must not emit them. Keep the priority constraint unchanged; corrected functions must not emit `margin`.

- [ ] **Step 6: Replace current private function bodies**

Copy the latest effective signatures from:

- `private.create_service_diagnosis_report_v4_impl`;
- `private.create_product_diagnosis_report_v3_impl`;
- `private.create_production_diagnosis_report_v3_impl`;
- `private.create_detailed_diagnosis_report_impl`;
- `private.replace_owned_diagnosis_from_staged_v1_impl`.

Use `create or replace function`; do not create v5/v4/v2 alternatives.

Exact behavior changes:

- accept the unchanged version tuples only;
- validate objective verdicts and no target-based snapshot fields;
- detailed creation extracts the four new camelCase keys from `p_items`, verifies them against `p_report_snapshot` and inserts their snake_case columns;
- staged replacement copies all four columns;
- fixed expenses are still stored/subtracted once per report;
- wrappers remain `security invoker`;
- private writers remain `security definer set search_path = ''`;
- validate `auth.uid()` before writes;
- preserve current `PUBLIC`, `authenticated` and `service_role` grants exactly.

- [ ] **Step 7: Reset local database and run pgTAP**

```bash
pnpm supabase:reset
pnpm exec supabase test db supabase/tests/diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/product_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/production_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/detailed_diagnosis_reports.test.sql
pnpm exec supabase test db supabase/tests/report_lifecycle.test.sql
```

Expected: PASS.

- [ ] **Step 8: Regenerate database types**

```bash
pnpm supabase:types
pnpm typecheck
```

Confirm `database.types.ts` contains the four detailed item columns and unchanged public RPC names.

- [ ] **Step 9: Run database lint and advisors**

```bash
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: no errors introduced by the migration.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations supabase/tests src/infrastructure/database/supabase/database.types.ts
git commit -m "fix: persist corrected report economics"
```

---

## Task 11: Verify the corrected seed against the local database

**Files:**

- Modify: `supabase/tests/seed.test.sql`

- [ ] **Step 1: Update seed pgTAP expectations**

Replace counts and verdict expectations that referred to historical or
margin-band fixtures. Require `positive_result` coverage in all four report
families and assert that stored snapshots use only the corrected current
version tuples.

- [ ] **Step 2: Reset and verify locally**

```bash
pnpm seed:check
pnpm supabase:reset
pnpm seed:verify-local
pnpm exec supabase test db supabase/tests/seed.test.sql
```

Expected: PASS with only corrected current snapshots.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/seed.test.sql
git commit -m "test: verify corrected report seed"
```

---

## Task 12: Update living documentation and run the final non-browser verification

**Files:**

- Modify: `docs/QUICK-DIAGNOSIS.md`
- Modify: `docs/DETAILED-DIAGNOSIS.md`

- [ ] **Step 1: Update the two living architecture documents**

Document:

- known-volume full-cost floor;
- unknown-volume monthly quantity only;
- zero-volume distinction;
- shared detailed allocation by total units;
- objective `positive_result`;
- no universal margin target;
- unchanged current version tuples and RPC names;
- no promise of reading pre-correction local snapshots.

Do not rewrite historical specs/plans; they remain implementation history.

- [ ] **Step 2: Run targeted module suites**

```bash
pnpm test -- src/modules/reports src/modules/detailed-diagnosis
```

Expected: PASS.

- [ ] **Step 3: Run seed and database verification**

```bash
pnpm seed:check
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: PASS.

- [ ] **Step 4: Run the complete application checks**

```bash
pnpm check
```

Expected: Vitest, typecheck, ESLint and Prettier all PASS.

- [ ] **Step 5: Scan active code and living docs for removed policy**

```bash
rg -n --glob '!*.test.*' "targetMarginBasisPoints|attentionBandBasisPoints|targetPriceCents|priceReferencesPartial|legacy_target|tight_margin|adequate_margin|above_target|margem adequada|margem apertada|acima da meta|meta de 15%|meta de 20%" src scripts/demo-seed docs/QUICK-DIAGNOSIS.md docs/DETAILED-DIAGNOSIS.md
```

Expected: no active match. Database migrations may still contain historical strings and are intentionally excluded from this scan.

- [ ] **Step 6: Confirm no browser automation was added or run**

```bash
git diff --name-only f6955e7..HEAD | rg "playwright|e2e"
```

Expected: no output. Do not run a Playwright command as part of verification.

- [ ] **Step 7: Review the final diff and working tree**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intentional files, or a clean tree after the final commit.

- [ ] **Step 8: Commit**

```bash
git add docs/QUICK-DIAGNOSIS.md docs/DETAILED-DIAGNOSIS.md
git commit -m "docs: document corrected report economics"
```

## Done When

- The R$ 16 / R$ 4.000 / 200 / 7% / R$ 55 example produces R$ 38,71 minimum price, R$ 15,15 per-unit profit, 27,55% real margin, R$ 3.030 monthly result and 114 required sales.
- Without volume, no report invents a complete unit cost, minimum price, unit profit or real margin; a single known item still shows the monthly quantity required at the current price.
- Detailed reports allocate monthly expenses once across total informed units.
- Service, Product, Production and Detailed reports never judge a margin against 15%, 20%, 25% or any other universal target.
- All visible wording remains clear, human and caring without confusing contribution with profit.
- Current version tuples and public RPC names are unchanged.
- No compatibility layer, backfill or historical seed remains.
- Vitest, pgTAP, typecheck, lint, formatting, Supabase lint/advisors and seed verification pass.
- No Playwright or browser automation is part of implementation or verification.
