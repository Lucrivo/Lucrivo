# Realistic Demo Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, realistic Supabase seed with 97 fictitious identities, 295 reports, complete billing/admin histories, automatic local loading, and an explicitly guarded staging command.

**Architecture:** TypeScript catalogs describe users, billing histories, and report inputs. A deterministic generator reuses the application's calculators, snapshot builders, and pure RPC argument mappers to emit one transactional `supabase/seed.sql`; local reset executes it normally, while a separate runner validates the exact staging project before remote execution.

**Tech Stack:** TypeScript 5.9, Node.js, `tsx` 4.23.15, Vitest 4, Supabase CLI 2.114, PostgreSQL 17, pgTAP

**Spec:** `docs/superpowers/specs/2026-09-25-realistic-demo-seed-design.md`

## Global Constraints

- Preserve every staging row whose identifier is outside the reserved demo-seed namespace.
- Create exactly 1 seeded administrator, 96 seeded clients, 259 client reports, and 36 administrator reports.
- Keep the administrator's annual contract active; do not expire it after report creation.
- Use only fictional `.test` e-mail addresses and documented development credentials.
- Generate report snapshots with the application's production calculators and parsers; do not duplicate financial formulas in the seed.
- Keep schema, functions, policies, and types in migrations; the generated seed contains DML and calls to existing RPCs only.
- Do not add an application runtime feature flag.
- Remote execution must require `ALLOW_STAGING_SEED=true`, verify project ref `camekuaudqgwawidieym`, and have no production equivalent.
- Remote execution must not run `db reset`, must not apply migrations implicitly, and must not print secrets.
- Wrap cleanup and recreation in one transaction and acquire a transaction-scoped advisory lock.
- Batch rows into multi-value inserts instead of emitting one insert per row.
- Keep package versions and the pnpm lockfile committed.

---

## File Structure

### Application code reused by the generator

- Create `src/modules/reports/services/report-rpc-args.ts`: pure mapping from commands/snapshots to database RPC arguments.
- Create `src/modules/reports/services/report-rpc-args.test.ts`: mapper contract tests independent of `server-only`.
- Modify the four `create-*-report.service.ts` files to delegate argument construction to the pure mapper module.

### Generator

- Create `scripts/demo-seed/model.ts`: shared seed types and constants.
- Create `scripts/demo-seed/ids.ts`: deterministic UUID allocation.
- Create `scripts/demo-seed/sql.ts`: SQL literal, batch insert, and RPC-call serialization.
- Create `scripts/demo-seed/report-scenarios.ts`: current report scenario factories.
- Create `scripts/demo-seed/historical-report-scenarios.ts`: the two valid historical `above_target` fixtures.
- Create `scripts/demo-seed/user-scenarios.ts`: users, access, activity, billing, payments, and admin histories.
- Create `scripts/demo-seed/render-seed.ts`: ordered transactional SQL composition.
- Create `scripts/demo-seed/generate.ts`: write/check CLI for `supabase/seed.sql`.
- Create `scripts/demo-seed/staging-target.ts`: pure staging authorization guard.
- Create `scripts/demo-seed/apply-staging.ts`: guarded remote executor.
- Create `scripts/demo-seed/verify-local.ts`: second-application and isolation verification.
- Create adjacent `*.test.ts` files for each pure unit.

### Generated and integration artifacts

- Replace `supabase/seed.sql` with the generated artifact.
- Replace `supabase/tests/seed.test.sql` with dataset and pagination assertions.
- Modify `package.json` and `pnpm-lock.yaml` for pinned tooling and seed commands.
- Modify `.github/workflows/ci.yml` to detect generator drift and execute the seed twice.
- Modify `README.md` with local/staging usage and credentials.

---

### Task 1: Extract Pure RPC Argument Mappers

**Files:**

- Create: `src/modules/reports/services/report-rpc-args.ts`
- Create: `src/modules/reports/services/report-rpc-args.test.ts`
- Modify: `src/modules/reports/services/create-service-report.service.ts`
- Modify: `src/modules/reports/services/create-product-report.service.ts`
- Modify: `src/modules/reports/services/create-production-report.service.ts`
- Modify: `src/modules/reports/services/create-detailed-report.service.ts`
- Test: the four existing `create-*-report.service.test.ts` files

**Interfaces:**

- Consumes: current diagnosis command types, current snapshot types, generated `Database` RPC argument types, and `Json`.
- Produces: `toServiceRpcArgs`, `toProductRpcArgs`, `toProductionRpcArgs`, `toDetailedPersistenceItems`, `toDetailedRpcArgs`, plus their exported argument types.

- [ ] **Step 1: Write a mapper regression test that imports no server-only module**

Create a test with one fixture per report family. Assert representative source fields, nullable values, versions, results, and the absence of a user-id argument:

```ts
import { describe, expect, it } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";

import {
  toDetailedRpcArgs,
  toProductRpcArgs,
  toProductionRpcArgs,
  toServiceRpcArgs,
} from "./report-rpc-args";

const productCommand: ProductDiagnosisCommand = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  productKind: "resale",
  purchaseUnitCostCents: 5_000,
  unitSalePriceCents: 10_000,
  fixedMonthlyExpensesCents: 100_000,
  monthlySalesVolume: 100,
  proLaboreIncluded: true,
  proLaboreCents: 200_000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 200,
};

const productSnapshot = buildProductReportSnapshot(
  productCommand,
  calculateProductReport(productCommand),
);

describe("report RPC argument mappers", () => {
  it("maps caller-scoped reports without accepting a user id", () => {
    const args = toProductRpcArgs(productCommand, productSnapshot);

    expect(args).toMatchObject({
      p_submission_id: productCommand.submissionId,
      p_schema_version: productSnapshot.schemaVersion,
      p_verdict: productSnapshot.results.verdict,
      p_monthly_sales_volume: productCommand.monthlySalesVolume,
    });
    expect(args).not.toHaveProperty("p_user_id");
  });
});
```

Use the existing fixtures from the service tests, moving them into this test only when that avoids duplicated object literals.

- [ ] **Step 2: Run the new test and verify it fails because the module does not exist**

Run: `pnpm vitest run src/modules/reports/services/report-rpc-args.test.ts`

Expected: FAIL resolving `./report-rpc-args`.

- [ ] **Step 3: Move all pure mapper code into the new module**

The module must not import `server-only` or a Supabase client. Keep these signatures:

```ts
function toServiceRpcArgs(
  command: NormalizedServiceDiagnosisCommand,
  snapshot: CurrentServiceReportSnapshot,
): ServiceReportRpcArgs;

function toProductRpcArgs(
  command: ProductDiagnosisCommand,
  snapshot: CurrentProductReportSnapshot,
): ProductRpcArgs;

function toProductionRpcArgs(
  command: ProductionDiagnosisCommand,
  snapshot: CurrentProductionReportSnapshot,
): ProductionRpcArgs;

function toDetailedPersistenceItems(
  command: DetailedDiagnosisCommand,
  snapshot: CurrentDetailedReportSnapshot,
): DetailedPersistenceItem[];

function toDetailedRpcArgs(
  command: DetailedDiagnosisCommand,
  snapshot: CurrentDetailedReportSnapshot,
): DetailedRpcArgs;
```

Move the existing bodies without changing field names or nullable overrides. The four service modules retain `import "server-only"`, their Supabase calls, result checking, and safe error mapping; they import the corresponding mapper from the new module.

- [ ] **Step 4: Run mapper and service tests**

Run:

```bash
pnpm vitest run \
  src/modules/reports/services/report-rpc-args.test.ts \
  src/modules/reports/services/create-service-report.service.test.ts \
  src/modules/reports/services/create-product-report.service.test.ts \
  src/modules/reports/services/create-production-report.service.test.ts \
  src/modules/reports/services/create-detailed-report.service.test.ts
```

Expected: PASS with the same RPC payloads as before.

- [ ] **Step 5: Commit the pure boundary**

```bash
git add src/modules/reports/services
git commit -m "refactor: extract report rpc argument mappers"
```

---

### Task 2: Add Deterministic Seed Primitives

**Files:**

- Create: `scripts/demo-seed/model.ts`
- Create: `scripts/demo-seed/ids.ts`
- Create: `scripts/demo-seed/ids.test.ts`
- Create: `scripts/demo-seed/sql.ts`
- Create: `scripts/demo-seed/sql.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: plain JavaScript values and the report mapper outputs from Task 1.
- Produces: seed model types, `seedUuid`, `sqlLiteral`, `renderBatchInsert`, and `renderRpcCall`.

- [ ] **Step 1: Install the pinned TypeScript executor**

Run: `pnpm add --save-dev --save-exact tsx@4.23.15`

Expected: `package.json` contains `"tsx": "4.23.15"` and the lockfile changes.

- [ ] **Step 2: Write deterministic ID tests**

```ts
import { describe, expect, it } from "vitest";
import { seedUuid } from "./ids";

describe("seedUuid", () => {
  it("allocates stable UUIDs per kind and ordinal", () => {
    expect(seedUuid("user", 0)).toBe("d1000000-0000-4000-8000-000000000000");
    expect(seedUuid("user", 96)).toBe("d1000000-0000-4000-8000-000000000060");
    expect(seedUuid("submission", 1, 35)).not.toBe(
      seedUuid("submission", 1, 34),
    );
  });
});
```

- [ ] **Step 3: Implement the shared model and UUID allocator**

Define the stable interfaces used by all later tasks:

```ts
type SeedUuidKind =
  | "user"
  | "identity"
  | "contract"
  | "payment"
  | "submission"
  | "item"
  | "ingredient";

type SqlCast =
  | "uuid"
  | "text"
  | "boolean"
  | "smallint"
  | "integer"
  | "bigint"
  | "date"
  | "timestamptz"
  | "jsonb"
  | "public.business_category"
  | "public.service_pricing_method"
  | "public.service_work_hours_period";

type SeedSqlArgument = {
  name: string;
  value: string | number | boolean | null | object | unknown[];
  cast: SqlCast;
};

type SeedRpcCall = {
  functionName: string;
  arguments: SeedSqlArgument[];
};
```

Implement `seedUuid(kind, ownerOrdinal, childOrdinal = 0)` with a fixed eight-hex-digit prefix per kind and a 12-digit hexadecimal suffix derived from both ordinals. Throw for negative, non-integer, or overflowing ordinals and assert uniqueness in tests.

- [ ] **Step 4: Write SQL serializer tests**

Cover quote escaping, Unicode, newlines, JSON, nulls, casts, deterministic object-key ordering, batch insert ordering, and named RPC arguments:

```ts
expect(sqlLiteral("D'Ávila", "text")).toBe("'D''Ávila'::text");
expect(sqlLiteral(null, "bigint")).toBe("null::bigint");
expect(
  renderRpcCall({
    functionName: "public.example_v1",
    arguments: [
      { name: "p_id", value: seedUuid("user", 1), cast: "uuid" },
      { name: "p_payload", value: { b: 2, a: 1 }, cast: "jsonb" },
    ],
  }),
).toContain('p_payload => \'{"a":1,"b":2}\'::jsonb');
```

- [ ] **Step 5: Implement safe deterministic SQL serialization**

`sql.ts` must:

- reject function, schema, table, column, and argument identifiers that do not match `/^[a-z_][a-z0-9_.]*$/`;
- sort JSON object keys recursively before `JSON.stringify`;
- escape text by doubling single quotes;
- preserve safe integers without converting through floating-point strings;
- render at most 500 rows per `insert ... values` batch;
- render named RPC arguments in the supplied order with explicit casts.

Use these signatures:

```ts
function sqlLiteral(value: SeedSqlArgument["value"], cast: SqlCast): string;

function renderBatchInsert(input: {
  table: string;
  columns: string[];
  rows: Array<Array<SeedSqlArgument["value"]>>;
  casts: SqlCast[];
  suffix?: string;
}): string;

function renderRpcCall(call: SeedRpcCall): string;
```

- [ ] **Step 6: Run primitive tests and typecheck**

Run:

```bash
pnpm vitest run scripts/demo-seed/ids.test.ts scripts/demo-seed/sql.test.ts
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit seed primitives**

```bash
git add package.json pnpm-lock.yaml scripts/demo-seed
git commit -m "feat: add deterministic seed primitives"
```

---

### Task 3: Build the Current Report Scenario Catalog

**Files:**

- Create: `scripts/demo-seed/report-scenarios.ts`
- Create: `scripts/demo-seed/report-scenarios.test.ts`

**Interfaces:**

- Consumes: production command types, calculators, snapshot builders, Task 1 RPC mappers, Task 2 deterministic IDs and `SeedRpcCall`.
- Produces: `currentReportTemplates` with 34 validated current templates and `materializeReportTemplate` for any seeded owner/report ordinal.

- [ ] **Step 1: Write the expected current matrix test**

```ts
const expected = [
  ["service", "quick", "missing_price"],
  ["service", "quick", "direct_loss"],
  ["service", "quick", "operational_loss"],
  ["service", "quick", "tight_margin"],
  ["service", "quick", "adequate_margin"],
  ["service", "quick", "above_target"],
  ["product", "quick", "direct_loss"],
  ["product", "quick", "incomplete_volume"],
  ["product", "quick", "no_sales"],
  ["product", "quick", "operational_loss"],
  ["product", "quick", "break_even"],
  ["product", "quick", "tight_margin"],
  ["product", "quick", "adequate_margin"],
  ["production", "quick", "direct_loss"],
  ["production", "quick", "incomplete_volume"],
  ["production", "quick", "no_sales"],
  ["production", "quick", "operational_loss"],
  ["production", "quick", "break_even"],
  ["production", "quick", "tight_margin"],
  ["production", "quick", "adequate_margin"],
  ["product", "detailed", "direct_loss"],
  ["product", "detailed", "incomplete_volume"],
  ["product", "detailed", "no_sales"],
  ["product", "detailed", "operational_loss"],
  ["product", "detailed", "break_even"],
  ["product", "detailed", "tight_margin"],
  ["product", "detailed", "adequate_margin"],
  ["production", "detailed", "direct_loss"],
  ["production", "detailed", "incomplete_volume"],
  ["production", "detailed", "no_sales"],
  ["production", "detailed", "operational_loss"],
  ["production", "detailed", "break_even"],
  ["production", "detailed", "tight_margin"],
  ["production", "detailed", "adequate_margin"],
] as const;

expect(
  currentReportTemplates.map((item) => [
    item.category,
    item.analysisMode,
    item.expectedVerdict,
  ]),
).toEqual(expected);
```

- [ ] **Step 2: Add current report template types and materialization**

```ts
export type SeedReportTemplate = {
  key: string;
  category: "service" | "product" | "production";
  analysisMode: "quick" | "detailed";
  expectedVerdict: ReportVerdict;
  materialize(ids: SeedReportIds): SeedMaterializedReport;
};

type SeedMaterializedReport = {
  templateKey: string;
  submissionId: string;
  verdict: ReportVerdict;
  priority: ReportPriority;
  rpc: SeedRpcCall;
};
```

Every materializer must calculate, build, parse, map to RPC arguments, compare the actual verdict with `expectedVerdict`, and throw with the template key on mismatch.

- [ ] **Step 3: Implement six Service templates through the real normalization flow**

Build `ServiceFlowSubmissionInput` objects and pass them through `composeServiceDiagnosisCommand`, `calculateServiceReport`, `buildServiceReportSnapshot`, and `toServiceRpcArgs`. Use this source-unit/verdict mapping:

| Source unit   | Verdict            | Price behavior                              |
| ------------- | ------------------ | ------------------------------------------- |
| `month`       | `missing_price`    | zero current price                          |
| `minute`      | `direct_loss`      | normalized price below materials and fees   |
| `week`        | `operational_loss` | positive contribution below structural cost |
| `day`         | `tight_margin`     | positive margin below 15%                   |
| `appointment` | `adequate_margin`  | margin from 15% through 18%                 |
| `hour`        | `above_target`     | margin above 18%                            |

Use the same base routine for all six: `dailyWorkHours: "6"`, `weeklyWorkDays: "5"`, `appointmentDurationMinutes: "60"`, taxes `"6"`, card fee `"2"`, monthly owner income `"4000"`, and fixed expenses `"2000"`. Use these literal source values:

| Source unit   | Current price | Material cost    |
| ------------- | ------------: | ---------------- |
| `month`       |        `0.00` | none             |
| `minute`      |        `1.00` | `70.00` per hour |
| `week`        |     `1000.00` | none             |
| `day`         |      `348.00` | none             |
| `appointment` |       `60.00` | none             |
| `hour`        |       `70.00` | none             |

The tests must prove these inputs still yield the requested classifications; do not add a runtime search loop.

- [ ] **Step 4: Implement seven current Product and seven current Production templates**

Use 8% total fees and these deterministic classification shapes:

| Verdict             | Volume | Direct unit cost | Effective fixed cost |  Price |
| ------------------- | -----: | ---------------: | -------------------: | -----: |
| `direct_loss`       |    100 |            9,500 |              300,000 | 10,000 |
| `incomplete_volume` |   null |            5,000 |              300,000 | 10,000 |
| `no_sales`          |      0 |            5,000 |              300,000 | 10,000 |
| `operational_loss`  |     50 |            5,000 |              300,000 | 10,000 |
| `break_even`        |    100 |            5,000 |              420,000 | 10,000 |
| `tight_margin`      |    100 |            5,000 |              300,000 | 10,000 |
| `adequate_margin`   |    100 |            3,000 |              200,000 | 10,000 |

For Product, use `digital` with zero purchase cost for `incomplete_volume` and `no_sales`; use `resale` with the table's direct costs for the other five outcomes. For Production, alternate summarized and composed costs while keeping the final `productionUnitCostCents` equal to the component sum.

- [ ] **Step 5: Implement fourteen detailed templates**

Build Product item counts `[1, 2, 3, 5, 8, 10, 12]` and Production item counts `[12, 10, 8, 5, 3, 2, 1]` in verdict order. Derive every item and ingredient UUID from `SeedReportIds`; sort positions from zero; use `calculateDetailedDiagnosis`, `buildDetailedReportSnapshot`, and `toDetailedRpcArgs`.

Use zero fees for the exact break-even templates so the total item contribution equals effective fixed cost without rounding. Ensure the union of the fourteen `guidance` arrays contains exactly:

```ts
[
  "missing_volume",
  "direct_loss",
  "concentration",
  "best_unit_contribution",
  "high_volume_low_margin",
  "business_result",
];
```

Production templates must include at least one summarized item, at least one technical-sheet item, and one multi-item report containing both modes. Every technical sheet must contain at least two ingredients with nonzero quantity, explicit unit, recipe yield, loss rate, packaging, direct labor, and other variable cost.

- [ ] **Step 6: Run report catalog tests**

Run:

```bash
pnpm vitest run scripts/demo-seed/report-scenarios.test.ts
```

Expected: 34 templates, exact matrix, detailed item counts, six guidance keys, all current parsers accepting the snapshots, and no duplicate IDs.

- [ ] **Step 7: Commit the current report catalog**

```bash
git add scripts/demo-seed/report-scenarios.ts scripts/demo-seed/report-scenarios.test.ts
git commit -m "feat: catalog current demo report scenarios"
```

---

### Task 4: Preserve the Two Historical Above-Target Scenarios

**Files:**

- Create: `scripts/demo-seed/historical-report-scenarios.ts`
- Create: `scripts/demo-seed/historical-report-scenarios.test.ts`
- Read before replacement: `supabase/seed.sql`

**Interfaces:**

- Consumes: Task 2 SQL/RPC model and the backward-compatible Product/Production snapshot parsers.
- Produces: `historicalReportTemplates`, containing exactly Product and Production `above_target`, and `allAdminReportTemplates`, containing 36 entries.

- [ ] **Step 1: Write compatibility tests for the two legacy fixtures**

The expected fixtures are the existing calls identified by:

- Product submission `12000000-0000-4000-8000-000000000001`, versions `1/1/2`, verdict `above_target`, priority `volume`, margin `3867`, unit profit `5800`.
- Production submission `13000000-0000-4000-8000-000000000001`, versions `1/1/2`, verdict `above_target`, priority `volume`, margin `3867`, unit profit `5800`.

Assert `parseProductReportSnapshot` and `parseProductionReportSnapshot` accept their exact snapshots, and assert the combined matrix has 36 unique keys.

- [ ] **Step 2: Run the compatibility test and verify it fails before the fixtures exist**

Run: `pnpm vitest run scripts/demo-seed/historical-report-scenarios.test.ts`

Expected: FAIL resolving the new module.

- [ ] **Step 3: Move the exact two validated fixtures into typed historical templates**

Copy the full Product call currently beginning at line 773 and the full Production call currently beginning at line 1272 before Task 6 replaces the generated artifact. Preserve their JSON byte-for-byte except for submission/item IDs injected by the template. Render calls to the existing legacy RPC names:

```ts
const historicalReportTemplates: SeedReportTemplate[] = [
  buildHistoricalProductAboveTargetTemplate(),
  buildHistoricalProductionAboveTargetTemplate(),
];

const allAdminReportTemplates = [
  ...currentReportTemplates,
  ...historicalReportTemplates,
];
```

The template constructors must parse the fixture snapshots on module initialization and throw if a future schema change stops supporting them.

- [ ] **Step 4: Run compatibility and matrix tests**

Run:

```bash
pnpm vitest run \
  scripts/demo-seed/report-scenarios.test.ts \
  scripts/demo-seed/historical-report-scenarios.test.ts
```

Expected: 36 administrator templates, including all verdicts listed in the spec.

- [ ] **Step 5: Commit historical fixtures**

```bash
git add scripts/demo-seed/historical-report-scenarios.ts scripts/demo-seed/historical-report-scenarios.test.ts
git commit -m "feat: preserve historical report scenarios in demo data"
```

---

### Task 5: Build Users, Billing, Activity, and Admin Histories

**Files:**

- Create: `scripts/demo-seed/user-scenarios.ts`
- Create: `scripts/demo-seed/user-scenarios.test.ts`
- Modify: `scripts/demo-seed/model.ts`

**Interfaces:**

- Consumes: deterministic IDs and 36 report templates.
- Produces: `buildDemoCatalog(): DemoSeedCatalog` with exact users, report assignments, contracts, payments, states, and events.

- [ ] **Step 1: Define and test the exact report-count distribution**

Implement this pure ordinal mapping:

```ts
function clientReportCount(ordinal: number): number {
  if (ordinal <= 24) return 0;
  if (ordinal <= 48) return 1;
  if (ordinal <= 58) return 2;
  if (ordinal <= 68) return 3;
  if (ordinal <= 78) return 4;
  if (ordinal <= 88) return 5;
  if (ordinal <= 95) return ordinal - 83;
  return 32;
}
```

Assert the client counts sum to 259 and `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 32]` all occur.

- [ ] **Step 2: Define the catalog model**

```ts
type SeedAccountState = "active" | "blocked" | "deleted";
type SeedAccessSource = "free" | "paid" | "courtesy";

type SeedUser = {
  ordinal: number;
  id: string;
  identityId: string;
  email: string;
  isAdmin: boolean;
  accountState: SeedAccountState;
  accessSource: SeedAccessSource;
  reportCount: number;
  createdBucket: "today" | "week" | "month" | `month-${1 | 2 | 3 | 4 | 5}`;
  lastSignInOffsetDays: number | null;
};

type SeedRelativeTime = {
  anchor: "now" | "month_start";
  months: number;
  days: number;
  hours: number;
};

type SeedContractStatus =
  | "pending"
  | "pending_reconciliation"
  | "active"
  | "cancel_at_period_end"
  | "expired"
  | "canceled"
  | "refunded"
  | "chargeback"
  | "failed";

type SeedPaymentStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "capture_refused"
  | "refunded"
  | "partially_refunded"
  | "chargeback_requested"
  | "chargeback_dispute";

type SeedAssignedReport = {
  ownerId: string;
  ownerOrdinal: number;
  reportOrdinal: number;
  templateKey: string;
  createdAt: SeedRelativeTime;
  deletedAt: SeedRelativeTime | null;
};

type SeedContract = {
  id: string;
  userId: string;
  priceId: string;
  externalReference: string;
  billingMode: "monthly" | "annual";
  paymentMethod: "credit_card" | "pix";
  chargeType: "recurring" | "installment" | "detached";
  amountCents: number;
  installmentLimit: number | null;
  accessMonths: 1 | 12;
  status: SeedContractStatus;
  accessStartsAt: SeedRelativeTime | null;
  accessEndsAt: SeedRelativeTime | null;
  cancelAtPeriodEnd: boolean;
  cancellationRequestedAt: SeedRelativeTime | null;
  cancellationConfirmedAt: SeedRelativeTime | null;
  canceledAt: SeedRelativeTime | null;
  createdAt: SeedRelativeTime;
};

type SeedPayment = {
  id: string;
  contractId: string;
  externalPaymentId: string;
  status: SeedPaymentStatus;
  valueCents: number;
  installmentNumber: number | null;
  dueAt: SeedRelativeTime;
  confirmedAt: SeedRelativeTime | null;
  receivedAt: SeedRelativeTime | null;
  refundedAt: SeedRelativeTime | null;
  chargebackAt: SeedRelativeTime | null;
};

type SeedAdminUserState = {
  userId: string;
  blockedAt: SeedRelativeTime | null;
  deletedAt: SeedRelativeTime | null;
  courtesyExpiresAt: SeedRelativeTime | null;
  version: number;
};

type SeedAdminUserEvent = {
  userId: string;
  actorId: string;
  action:
    | "courtesy_granted"
    | "courtesy_ended"
    | "blocked"
    | "unblocked"
    | "soft_deleted"
    | "restored";
  marker: string;
  reason: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: SeedRelativeTime;
};

type DemoSeedCatalog = {
  admin: SeedUser;
  clients: SeedUser[];
  reports: SeedAssignedReport[];
  contracts: SeedContract[];
  payments: SeedPayment[];
  states: SeedAdminUserState[];
  events: SeedAdminUserEvent[];
};
```

- [ ] **Step 3: Generate the 97 identities and cross-cutting cohorts**

Use `admin@seed.lucrivo.test` and `cliente+001@seed.lucrivo.test` through `cliente+096@seed.lucrivo.test`. Set:

- clients 73–80 blocked;
- clients 81–88 deleted;
- every other client active;
- clients 1–44 currently free;
- clients 45–84 currently paid;
- clients 85–96 currently on courtesy;
- recent sign-ins for clients 1–47 and 96, totaling 48;
- older sign-ins for clients 48–79, totaling 32;
- null sign-ins for clients 80–95, totaling 16;
- created buckets with counts 6 today, 10 earlier this week, 16 earlier this month, and prior-month counts `[13, 13, 13, 13, 12]` for `month-1` through `month-5`.

Tests must calculate these totals from the catalog rather than asserting implementation arrays directly.

- [ ] **Step 4: Assign 295 reports deterministically**

Give all 36 templates to the admin. Assign the 259 client reports by cycling only through current templates, rotating the start index by client ordinal so categories and verdicts are spread across accounts. Derive every submission/item/ingredient ID from owner ordinal and report ordinal. Store a relative creation offset for each report and mark at least 12 client reports soft-deleted after creation.

Assert each report-owning client has one report at ordinal zero, which the database will mark free, and all later reports have a covering paid-access interval.

- [ ] **Step 5: Create coherent contract and payment histories**

The admin receives one annual Pix detached contract using active annual price `20000000-0000-4000-8000-000000000002`, amount `47880`, 12 installments, and a received payment.

Create final contracts covering every supported status:

```ts
const contractStatuses = [
  "pending",
  "pending_reconciliation",
  "active",
  "cancel_at_period_end",
  "expired",
  "canceled",
  "refunded",
  "chargeback",
  "failed",
] as const;
```

Use only valid purchase tuples:

```ts
[
  ["monthly", "credit_card", "recurring"],
  ["monthly", "pix", "detached"],
  ["annual", "credit_card", "installment"],
  ["annual", "pix", "detached"],
] as const;
```

Create at least one confirmed or received payment in each of the twelve dashboard months and cover every payment status. Client 96 receives 24 historical monthly contracts with corresponding payment records. Contract intervals for nonfree reports must contain their report creation timestamps.

- [ ] **Step 6: Create courtesy and administrative event history**

Create active courtesy expirations for clients 85–96 and expired courtesy history for at least four other clients. Client 96 receives at least 24 append-only events cycling through `courtesy_granted`, `courtesy_ended`, `blocked`, `unblocked`, `soft_deleted`, and `restored`; the final materialized account state remains active and courtesy remains current.

- [ ] **Step 7: Run catalog tests**

Run: `pnpm vitest run scripts/demo-seed/user-scenarios.test.ts`

Expected: all exact counts, state/access/activity cohorts, twelve revenue months, nine contract states, all payment states, 24 power-user contracts/events, and no duplicate IDs.

- [ ] **Step 8: Commit the operational catalog**

```bash
git add scripts/demo-seed/model.ts scripts/demo-seed/user-scenarios.ts scripts/demo-seed/user-scenarios.test.ts
git commit -m "feat: model realistic demo operations"
```

---

### Task 6: Render the Transactional SQL Artifact

**Files:**

- Create: `scripts/demo-seed/render-seed.ts`
- Create: `scripts/demo-seed/render-seed.test.ts`
- Create: `scripts/demo-seed/generate.ts`
- Replace: `supabase/seed.sql`
- Modify: `package.json`

**Interfaces:**

- Consumes: `DemoSeedCatalog`, SQL primitives, and materialized report RPC calls.
- Produces: `renderDemoSeed(catalog): string`, `generateDemoSeed(): string`, `pnpm seed:generate`, and `pnpm seed:check`.

- [ ] **Step 1: Write renderer structure tests**

Assert the generated string:

- starts with the generated-file warning, documented credentials, `begin;`, timeout settings, and the advisory lock;
- checks for a conflicting administrator before deleting any row;
- deletes only IDs from the exact generated seed-user array;
- batches auth users, identities, contracts, and payments;
- creates reports before final blocked/deleted states;
- contains 295 report RPC calls;
- contains final invariant checks;
- ends with `commit;` and one newline;
- is byte-identical across two calls with the same catalog.

- [ ] **Step 2: Implement the transaction preamble and conflict guard**

Emit this ordering and equivalent SQL:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '5min';
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('lucrivo-demo-seed-v1', 0)
);

do $guard$
begin
  if exists (
    select 1
    from private.app_administrator
    where singleton = 1
      and user_id <> 'd1000000-0000-4000-8000-000000000000'::uuid
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'demo_seed_refuses_to_replace_administrator';
  end if;
end
$guard$;
```

No cleanup statement may appear before this guard.

- [ ] **Step 3: Render namespace cleanup in foreign-key order**

Use the generated 97-user UUID array in every predicate. Delete, in order:

1. `public.detailed_diagnosis_ingredients`;
2. `public.detailed_diagnosis_items`;
3. `public.detailed_diagnoses`;
4. `public.service_diagnoses`;
5. `public.product_diagnoses`;
6. `public.production_diagnoses`;
7. `public.diagnoses`;
8. `public.billing_payments` through seeded contracts;
9. `public.billing_contracts`;
10. `public.billing_customers` for seeded users;
11. `private.admin_user_state`.

Do not delete `private.admin_user_events`, `auth.identities`, `auth.users`, or the seeded administrator assignment. Admin events are append-only and keep restrictive foreign keys to both actor and subject. Do not use broad e-mail patterns or truncate any table.

- [ ] **Step 4: Render batched Auth and administrator creation**

Upsert confirmed users with `extensions.crypt('LucrivoSeed2026AA', extensions.gen_salt('bf'))`, provider-only `raw_app_meta_data`, non-authoritative `raw_user_meta_data`, relative `created_at`, and relative/null `last_sign_in_at`. Upsert all email identities in one batch. Insert the administrator singleton with `on conflict (singleton) do update` only after the conflict guard has proved the existing assignment is empty or identical.

Never put an authorization claim in `raw_user_meta_data`.

- [ ] **Step 5: Render temporary access, report RPCs, and final timestamps**

Create the contracts required for paid report creation before impersonation. For each user with reports:

```sql
select set_config('request.jwt.claim.sub', '<user uuid>', true);
```

Then render that user's calls in creation order. After all calls, update `public.diagnoses.created_at`, `updated_at`, and selected `deleted_at` by deterministic submission ID. Convert temporary contracts to their catalogued final states only after every report has been accepted.

- [ ] **Step 6: Render payments, final states, events, and invariants**

Batch payments and upsert state rows. Insert append-only events only after the state snapshot exists, using a deterministic marker such as `[demo-seed:event-0001]` in `reason` and `where not exists` on the same actor, user, and marker. Never update or delete existing events. End with a `do $assert$` block that raises `demo_seed_invariant_failed` unless all of these hold inside the seed namespace:

```text
97 users
96 non-admin clients
295 diagnoses
36 admin diagnoses
259 client diagnoses
40 paid clients at statement time
12 courtesy clients at statement time
8 blocked clients
8 deleted clients
```

Also assert the administrator has an active annual contract whose interval contains `statement_timestamp()`.

- [ ] **Step 7: Implement write and drift-check CLI modes**

`generate.ts` must use `process.argv.includes("--check")`. Normal mode writes `supabase/seed.sql` only when bytes differ. Check mode never writes and exits nonzero with `supabase/seed.sql is stale; run pnpm seed:generate` when bytes differ.

Add:

```json
{
  "scripts": {
    "seed:generate": "tsx scripts/demo-seed/generate.ts",
    "seed:check": "tsx scripts/demo-seed/generate.ts --check"
  }
}
```

- [ ] **Step 8: Generate and test the artifact**

Run:

```bash
pnpm seed:generate
pnpm seed:check
pnpm vitest run scripts/demo-seed/render-seed.test.ts
git diff --check
```

Expected: check mode reports no drift, renderer tests pass, and the generated SQL replaces the 1,892-line manual artifact.

- [ ] **Step 9: Commit generator and artifact together**

```bash
git add package.json scripts/demo-seed/render-seed.ts scripts/demo-seed/render-seed.test.ts scripts/demo-seed/generate.ts supabase/seed.sql
git commit -m "feat: generate realistic Supabase demo seed"
```

---

### Task 7: Add Guarded Staging and Local Verification Runners

**Files:**

- Create: `scripts/demo-seed/staging-target.ts`
- Create: `scripts/demo-seed/staging-target.test.ts`
- Create: `scripts/demo-seed/apply-staging.ts`
- Create: `scripts/demo-seed/verify-local.ts`
- Create: `scripts/demo-seed/verify-local.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: generated SQL, `ALLOW_STAGING_SEED`, `supabase/.temp/project-ref`, and Supabase CLI.
- Produces: `assertStagingSeedAllowed`, `seed:local`, `seed:verify-local`, and `seed:staging`.

- [ ] **Step 1: Write staging guard tests**

```ts
expect(() =>
  assertStagingSeedAllowed({ allow: undefined, linkedProjectRef: STAGING_REF }),
).toThrow("ALLOW_STAGING_SEED=true is required");

expect(() =>
  assertStagingSeedAllowed({ allow: "true", linkedProjectRef: "production" }),
).toThrow("linked Supabase project is not lucrivo-staging");

expect(
  assertStagingSeedAllowed({ allow: "true", linkedProjectRef: STAGING_REF }),
).toBeUndefined();
```

- [ ] **Step 2: Implement the exact target guard**

```ts
const STAGING_PROJECT_REF = "camekuaudqgwawidieym";

function assertStagingSeedAllowed(input: {
  allow: string | undefined;
  linkedProjectRef: string;
}): void {
  if (input.allow !== "true") {
    throw new Error("ALLOW_STAGING_SEED=true is required");
  }
  if (input.linkedProjectRef.trim() !== STAGING_PROJECT_REF) {
    throw new Error("linked Supabase project is not lucrivo-staging");
  }
}
```

- [ ] **Step 3: Implement the staging runner without a shell**

Read `supabase/.temp/project-ref`, call the guard, call the same drift check used by `generate.ts`, then use `spawnSync` with an argument array and `shell: false`:

```ts
[
  "exec",
  "supabase",
  "db",
  "query",
  "--project-ref",
  STAGING_PROJECT_REF,
  "--file",
  "supabase/seed.sql",
];
```

Print the project name/ref and seeded counts, but never environment values. Propagate a nonzero CLI status.

- [ ] **Step 4: Implement local second-run and isolation verification**

`verify-local.ts` must:

1. insert or upsert sentinel auth user `e0000000-0000-4000-8000-000000000001` / `sentinel@outside-seed.test` through `supabase db query --local`;
2. apply `supabase/seed.sql` through `supabase db query --local --file`;
3. query exact seeded counts plus the sentinel count with JSON output;
4. throw unless counts are `97`, `295`, and sentinel `1`;
5. delete the sentinel in a `finally` block.

Keep command construction in a pure `buildLocalVerificationCommands()` function and test the exact argument arrays without invoking the CLI.

- [ ] **Step 5: Add package scripts**

```json
{
  "scripts": {
    "seed:local": "supabase db query --local --file supabase/seed.sql",
    "seed:verify-local": "tsx scripts/demo-seed/verify-local.ts",
    "seed:staging": "tsx scripts/demo-seed/apply-staging.ts"
  }
}
```

- [ ] **Step 6: Run guard and runner unit tests**

Run:

```bash
pnpm vitest run \
  scripts/demo-seed/staging-target.test.ts \
  scripts/demo-seed/verify-local.test.ts
```

Expected: authorization and target mismatches fail; exact staging and local command arrays pass.

- [ ] **Step 7: Commit protected runners**

```bash
git add package.json scripts/demo-seed/staging-target.ts scripts/demo-seed/staging-target.test.ts scripts/demo-seed/apply-staging.ts scripts/demo-seed/verify-local.ts scripts/demo-seed/verify-local.test.ts
git commit -m "feat: guard demo seed environment execution"
```

---

### Task 8: Replace pgTAP Seed Coverage and Enforce It in CI

**Files:**

- Replace: `supabase/tests/seed.test.sql`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: the generated dataset, admin RPCs, and package seed commands.
- Produces: database-level proof of counts, coherence, filters, pagination, time-series population, and reexecution.

- [ ] **Step 1: Replace single-user pgTAP expectations with namespace totals**

Use the contiguous seeded UUID namespace, not broad domain matching, for authoritative counts. Begin with:

```sql
select is(
  (
    select count(*)::bigint
    from auth.users
    where id between
      'd1000000-0000-4000-8000-000000000000'::uuid
      and 'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  97::bigint,
  'seed creates 97 deterministic Auth users'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id between
      'd1000000-0000-4000-8000-000000000000'::uuid
      and 'd1000000-0000-4000-8000-000000000060'::uuid
  ),
  295::bigint,
  'seed creates 295 reports'
);
```

Keep these range boundaries covered by the `seedUuid` unit test so the pgTAP namespace and generator cannot drift independently.

- [ ] **Step 2: Assert Auth, admin, and annual access**

Test one identity per seeded user, password verification for the documented admin credential, exactly one administrator, annual active status, current access interval, amount `47880`, and at least one received admin payment.

- [ ] **Step 3: Assert report distributions and normalized coherence**

Add pgTAP assertions for:

- client counts at 0, 1, 2, 3, 4, 5, 6–12, and 32 reports;
- exactly one `is_free_report` for every report-owning seeded user;
- 36 admin reports with the exact category/mode/verdict matrix;
- 14 detailed admin reports, item counts in both specified sequences, and ingredients only under technical-sheet items;
- each detail table's `user_id`, `submission_id`, category, and snapshot source/result fields matching its parent diagnosis;
- all quick normalized detail rows matching snapshot inputs/results;
- at least 12 soft-deleted seeded reports.

- [ ] **Step 4: Assert operational cohorts and dashboard time series**

Test 8 blocked, 8 deleted, 40 currently paid, 12 currently courtesy, all contract/payment statuses, 24 power-user contracts/events, twelve nonzero revenue months, and six nonzero user-growth months.

- [ ] **Step 5: Exercise filters and cursor pagination as the seeded admin**

Follow the existing admin test authentication pattern:

```sql
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-4000-8000-000000000000","role":"authenticated","aal":"aal2"}',
  true
);
```

Assert `list_admin_users_v1` returns a non-null cursor at limit 20 and that following the cursor yields disjoint user IDs. Assert `active`, `blocked`, `deleted`, `free`, `paid`, and `courtesy` filters are nonempty. For client 96, assert each `list_admin_user_items_v1` kind (`diagnoses`, `subscriptions`, `history`) returns a non-null first-page cursor at limit 20.

- [ ] **Step 6: Add generator drift and second-application checks to CI**

In the Application job, run `pnpm seed:check` after tests. In the Database job, run `pnpm seed:check` before starting Supabase and `pnpm seed:verify-local` immediately after `pnpm supabase:reset`, before pgTAP.

The database sequence becomes:

```yaml
- name: Verify generated demo seed
  run: pnpm seed:check
- name: Start local Supabase stack
  run: pnpm supabase:start
- name: Rebuild local database
  run: pnpm supabase:reset
- name: Verify seed reapplication and isolation
  run: pnpm seed:verify-local
- name: Test database policies, constraints, and seed
  run: pnpm exec supabase test db
```

- [ ] **Step 7: Run local integration verification**

Run:

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm seed:verify-local
pnpm exec supabase test db supabase/tests/seed.test.sql
```

Expected: reset succeeds, a second application succeeds, the external sentinel survives, and all pgTAP assertions pass.

- [ ] **Step 8: Commit database verification**

```bash
git add supabase/tests/seed.test.sql .github/workflows/ci.yml
git commit -m "test: verify realistic demo seed dataset"
```

---

### Task 9: Document Usage and Run the Full Quality Gate

**Files:**

- Modify: `README.md`
- Verify: every file changed by Tasks 1–8

**Interfaces:**

- Consumes: package commands and documented credentials implemented above.
- Produces: a safe operator workflow for local development and staging.

- [ ] **Step 1: Document local generation and login**

Under `Banco local`, document:

```bash
pnpm seed:generate
pnpm seed:check
pnpm supabase:reset
```

State that reset recreates the 97 fictitious identities and 295 reports. Document admin login `admin@seed.lucrivo.test` / `LucrivoSeed2026AA` and identify it explicitly as development/staging-only.

- [ ] **Step 2: Document staging safety and execution**

Add:

```bash
ALLOW_STAGING_SEED=true pnpm seed:staging
```

Explain that the command accepts only project ref `camekuaudqgwawidieym`, recreates only reserved seed identities, preserves all other rows, requires current migrations, and must never be adapted or run against production.

- [ ] **Step 3: Run focused generator and mapper tests**

Run:

```bash
pnpm vitest run scripts/demo-seed src/modules/reports/services
pnpm seed:check
```

Expected: PASS and no generated-file drift.

- [ ] **Step 4: Run the complete application quality gate**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: PASS.

- [ ] **Step 5: Run the complete database quality gate**

Run:

```bash
pnpm supabase:reset
pnpm seed:verify-local
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: reset, reapplication, pgTAP, lint, security advisors, and performance advisors all pass. If an advisor reports a pre-existing warning, record it separately and verify this change adds no new warning.

- [ ] **Step 6: Inspect repository scope and generated diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- supabase/seed.sql | sed -n '1,240p'
```

Expected: only planned files changed, no whitespace errors, generated header present, no real credentials or personal data.

- [ ] **Step 7: Commit documentation and final verification adjustments**

```bash
git add README.md package.json pnpm-lock.yaml scripts/demo-seed src/modules/reports/services supabase/seed.sql supabase/tests/seed.test.sql .github/workflows/ci.yml
git commit -m "docs: document realistic demo seed workflow"
```
