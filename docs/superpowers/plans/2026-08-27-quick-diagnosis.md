# Quick Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um wizard privado de sete etapas que valida, revisa e persiste de forma imutável e idempotente um diagnóstico rápido para negócios de serviços.

**Architecture:** A feature fica isolada em `src/modules/quick-diagnosis`: componentes cliente mantêm o rascunho somente em memória, uma Server Action autentica e normaliza a submissão, e um service usa o cliente Supabase tipado. A tabela `public.service_diagnoses` aplica constraints, privilégios mínimos e RLS como barreira final; não há Route Handler, repository, mapper ou persistência de rascunho.

**Tech Stack:** Next.js 16 App Router e Server Actions, React 19, TypeScript 5.9, Zod 4, Supabase JS/SSR 2, PostgreSQL/RLS, pgTAP, Vitest, Testing Library, Base UI/shadcn e Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-27-quick-diagnosis-design.md`

## Global Constraints

- A única categoria desta entrega é `service`; produto e produção ficam fora do escopo.
- A única moeda é `BRL`; valores persistidos usam centavos inteiros.
- Percentuais persistidos usam pontos-base inteiros; `100` pontos-base equivalem a `1%`.
- Tempo persistido usa minutos inteiros; horas mensais aceitam decimal e são arredondadas para o minuto mais próximo.
- Os métodos de preço válidos são exatamente `hour`, `minute` e `appointment`.
- O fluxo tem exatamente sete etapas; o estado de sucesso não é uma etapa.
- Nada é persistido antes da confirmação final; refresh ou fechamento descarta o rascunho.
- O navegador não envia `user_id` nem escolhe `business_category`.
- O `submission_id` permanece estável durante retries e muda somente ao iniciar outro diagnóstico.
- A unicidade de `(user_id, submission_id)` no banco é a proteção autoritativa contra duplicação.
- `authenticated` recebe somente `select` e `insert`; `anon` não recebe acesso; não há update ou delete.
- Não expor mensagens, detalhes, hints ou códigos do Supabase/Postgres para a interface.
- Não usar `service_role`, Route Handler, chamada HTTP interna, repository, mapper, Realtime, Storage, job ou integração externa.
- Não adicionar dependência nem componente antes de provar que os atuais são insuficientes.
- Não alterar `.env.local`, executar seed hospedado ou fazer alteração permanente pelo Dashboard.
- Criar a migration exclusivamente com a CLI instalada depois de consultar `--help`; o executor não inventa timestamp.
- Mudanças de comportamento seguem TDD: teste falhando, implementação mínima, teste passando.
- Cada tarefa termina em software coerente e testável, commit próprio e checkpoint antes da tarefa seguinte.

---

## File Structure

| Path                                                                       | Responsibility                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `supabase/migrations/*_create_service_diagnoses.sql`                       | Criar enums, tabela, constraints, índice, grants e policies RLS. O nome exato é produzido pela CLI. |
| `supabase/tests/service_diagnoses.test.sql`                                | Verificar shape, integridade, privilégios e isolamento RLS com pgTAP.                               |
| `.github/workflows/ci.yml`                                                 | Executar pgTAP no job `Database` depois do reset.                                                   |
| `src/infrastructure/database/supabase/database.types.ts`                   | Representar o schema público gerado; nunca editar manualmente.                                      |
| `src/modules/auth/services/require-user.ts`                                | Devolver cliente server-side e identidade verificada ou erro conhecido.                             |
| `src/modules/quick-diagnosis/types.ts`                                     | Definir contratos brutos, normalizados, resultados e estado do wizard.                              |
| `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`          | Fazer parsing decimal exato, normalização e validação condicional.                                  |
| `src/modules/quick-diagnosis/services/create-service-diagnosis.service.ts` | Inserir e recuperar o ID no retry idempotente.                                                      |
| `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts`   | Orquestrar validação, autenticação e service.                                                       |
| `src/app/(private)/quick-diagnosis/page.tsx`                               | Compor a página privada e o wizard.                                                                 |
| `src/components/layout/app-sidebar.tsx`                                    | Expor o link e estado ativo da nova rota.                                                           |
| `src/modules/quick-diagnosis/components/wizard-state.ts`                   | Concentrar estado, navegação, erros e reset sem efeitos React.                                      |
| `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`        | Renderizar uma etapa, controlar foco, submissão e feedback.                                         |
| `src/modules/quick-diagnosis/components/steps/*.tsx`                       | Renderizar as sete etapas com contratos tipados e acessíveis.                                       |
| `src/modules/quick-diagnosis/components/diagnosis-success.tsx`             | Mostrar sucesso, dashboard e reinício limpo.                                                        |

Serviços, schemas, actions, estado e composição recebem testes irmãos; os componentes de etapa são exercitados pelo teste integrado do wizard, que cobre seus contratos acessíveis.

## Shared Contracts

Os nomes abaixo são autoritativos para todas as tarefas:

```ts
export const pricingMethods = ["hour", "minute", "appointment"] as const;
export type ServicePricingMethod = (typeof pricingMethods)[number];

export type ServiceDiagnosisInput = {
  submissionId: string;
  pricingMethod: string;
  desiredMonthlyIncome: string;
  fixedMonthlyExpenses: string;
  monthlyWorkHours: string;
  weeklyWorkDays: string;
  hourlyRate: string;
  minuteRate: string;
  appointmentRate: string;
  appointmentDurationMinutes: string;
  taxRate: string;
  cardFeeRate: string;
};

export type ServiceDiagnosisCommand = {
  submissionId: string;
  pricingMethod: ServicePricingMethod;
  desiredMonthlyIncomeCents: number;
  fixedMonthlyExpensesCents: number;
  monthlyWorkMinutes: number;
  weeklyWorkDays: number;
  hourlyRateCents: number;
  minuteRateCents: number;
  appointmentRateCents: number;
  appointmentDurationMinutes: number;
  taxRateBasisPoints: number;
  cardFeeRateBasisPoints: number;
};

export type ServiceDiagnosisField = keyof ServiceDiagnosisInput;
export type ServiceDiagnosisFieldErrors = Partial<
  Record<ServiceDiagnosisField, string[]>
>;

export type CreateServiceDiagnosisActionResult =
  | { status: "success"; diagnosisId: number }
  | {
      status: "error";
      error: "invalid_input";
      fieldErrors: ServiceDiagnosisFieldErrors;
    }
  | { status: "error"; error: "unauthorized" | "create_failed" };
```

---

### Task 1: Create and protect the service diagnosis schema

**Files:**

- Create via CLI: `supabase/migrations/*_create_service_diagnoses.sql`
- Create: `supabase/tests/service_diagnoses.test.sql`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: `auth.users(id)`, `auth.uid()`, roles `anon` and `authenticated`.
- Produces: enums `public.business_category` and `public.service_pricing_method`; table `public.service_diagnoses`; constraint `service_diagnoses_user_submission_key`; index `service_diagnoses_user_created_at_idx`; create-only ownership access.

- [ ] **Step 1: Confirm CLI syntax and migration workflow**

```bash
test ! -d supabase/schemas
pnpm exec supabase --version
pnpm exec supabase migration new --help
pnpm exec supabase test db --help
```

Expected: the project uses imperative migrations and both commands exist. Do not run linked or remote commands.

- [ ] **Step 2: Write the failing pgTAP contract**

Create a transactional test with `extensions.pgtap`, fixed user UUIDs and `no_plan()`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_type('public', 'business_category');
select enum_has_labels('public', 'business_category', array['service']);
select has_type('public', 'service_pricing_method');
select enum_has_labels(
  'public', 'service_pricing_method',
  array['hour', 'minute', 'appointment']
);
select has_table('public', 'service_diagnoses');
select columns_are(
  'public', 'service_diagnoses',
  array[
    'id', 'submission_id', 'user_id', 'business_category', 'pricing_method',
    'desired_monthly_income_cents', 'fixed_monthly_expenses_cents',
    'monthly_work_minutes', 'weekly_work_days', 'hourly_rate_cents',
    'minute_rate_cents', 'appointment_rate_cents',
    'appointment_duration_minutes', 'tax_rate_basis_points',
    'card_fee_rate_basis_points', 'created_at'
  ]
);
select col_is_pk('public', 'service_diagnoses', 'id');
select fk_ok(
  'public', 'service_diagnoses', 'user_id',
  'auth', 'users', 'id'
);
select has_index(
  'public', 'service_diagnoses',
  'service_diagnoses_user_created_at_idx'
);

select ok(not has_table_privilege('anon', 'public.service_diagnoses', 'select'));
select ok(not has_table_privilege('anon', 'public.service_diagnoses', 'insert'));
select ok(has_table_privilege('authenticated', 'public.service_diagnoses', 'select'));
select ok(has_table_privilege('authenticated', 'public.service_diagnoses', 'insert'));
select ok(not has_table_privilege('authenticated', 'public.service_diagnoses', 'update'));
select ok(not has_table_privilege('authenticated', 'public.service_diagnoses', 'delete'));

select * from finish();
rollback;
```

Before `finish()`, add explicit `lives_ok` cases for valid hour, minute and appointment rows, and `throws_ok` cases for:

```sql
-- SQLSTATE 23514: each negative cents field; monthly minutes -1/44641;
-- weekly days -1/8; appointment duration -1; both rates -1/10001;
-- hour with minute/appointment values; minute with hour/appointment values;
-- appointment without positive rate and duration.
-- SQLSTATE 23505: duplicate user_id + submission_id.
```

The actual test statements use these fixed rows, not a generic helper assertion:

```sql
insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'one@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'two@example.com');

select lives_ok($sql$
  insert into public.service_diagnoses
    (submission_id, user_id, pricing_method, hourly_rate_cents)
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
     '11111111-1111-4111-8111-111111111111', 'hour', 100)
$sql$, 'valid hour row');

select throws_ok($sql$
  insert into public.service_diagnoses
    (submission_id, user_id, pricing_method, hourly_rate_cents, minute_rate_cents)
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
     '11111111-1111-4111-8111-111111111111', 'hour', 100, 1)
$sql$, '23514', null, 'hour rejects minute rate');
```

For RLS, set `role authenticated` plus `request.jwt.claim.sub`; assert own-row count, zero foreign rows, own insert succeeds, foreign-owner insert raises `42501`, and update/delete privileges remain absent.

- [ ] **Step 3: Verify the test is red**

```bash
pnpm supabase:start
pnpm exec supabase test db supabase/tests/service_diagnoses.test.sql
```

Expected: FAIL because the table and enums do not exist.

- [ ] **Step 4: Let the CLI create the exact migration filename**

```bash
pnpm exec supabase migration new create_service_diagnoses
```

Expected: one new `*_create_service_diagnoses.sql`; use the emitted path verbatim.

- [ ] **Step 5: Implement schema and constraints**

```sql
create type public.business_category as enum ('service');
create type public.service_pricing_method as enum ('hour', 'minute', 'appointment');

create table public.service_diagnoses (
  id bigint generated always as identity primary key,
  submission_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  business_category public.business_category not null default 'service',
  pricing_method public.service_pricing_method not null,
  desired_monthly_income_cents bigint not null default 0,
  fixed_monthly_expenses_cents bigint not null default 0,
  monthly_work_minutes integer not null default 0,
  weekly_work_days smallint not null default 0,
  hourly_rate_cents bigint not null default 0,
  minute_rate_cents bigint not null default 0,
  appointment_rate_cents bigint not null default 0,
  appointment_duration_minutes integer not null default 0,
  tax_rate_basis_points integer not null default 0,
  card_fee_rate_basis_points integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  constraint service_diagnoses_user_submission_key unique (user_id, submission_id),
  constraint service_diagnoses_category_check check (business_category = 'service'),
  constraint service_diagnoses_money_check check (
    desired_monthly_income_cents >= 0 and fixed_monthly_expenses_cents >= 0 and
    hourly_rate_cents >= 0 and minute_rate_cents >= 0 and appointment_rate_cents >= 0
  ),
  constraint service_diagnoses_work_minutes_check check (monthly_work_minutes between 0 and 44640),
  constraint service_diagnoses_work_days_check check (weekly_work_days between 0 and 7),
  constraint service_diagnoses_duration_check check (appointment_duration_minutes >= 0),
  constraint service_diagnoses_tax_check check (tax_rate_basis_points between 0 and 10000),
  constraint service_diagnoses_card_fee_check check (card_fee_rate_basis_points between 0 and 10000),
  constraint service_diagnoses_pricing_shape_check check (
    (pricing_method = 'hour' and hourly_rate_cents > 0 and minute_rate_cents = 0 and appointment_rate_cents = 0 and appointment_duration_minutes = 0)
    or
    (pricing_method = 'minute' and minute_rate_cents > 0 and hourly_rate_cents = 0 and appointment_rate_cents = 0 and appointment_duration_minutes = 0)
    or
    (pricing_method = 'appointment' and appointment_rate_cents > 0 and appointment_duration_minutes > 0 and hourly_rate_cents = 0 and minute_rate_cents = 0)
  )
);

create index service_diagnoses_user_created_at_idx
  on public.service_diagnoses (user_id, created_at desc);
```

The composite index begins with the RLS/FK equality column and avoids a redundant single-column index.

- [ ] **Step 6: Apply least privilege and RLS**

```sql
revoke all on table public.service_diagnoses from anon, authenticated;
revoke all on sequence public.service_diagnoses_id_seq from anon, authenticated;
grant select, insert on table public.service_diagnoses to authenticated;
grant usage on sequence public.service_diagnoses_id_seq to authenticated;

alter table public.service_diagnoses enable row level security;

create policy service_diagnoses_select_own
on public.service_diagnoses for select to authenticated
using ((select auth.uid()) = user_id);

create policy service_diagnoses_insert_own
on public.service_diagnoses for insert to authenticated
with check ((select auth.uid()) = user_id);
```

Do not add `for all`, update/delete policies, `auth.role()` or `security definer`.

- [ ] **Step 7: Make database tests green**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:lint
pnpm supabase:advisors
```

Expected: all commands exit `0` with no introduced security/performance warning.

- [ ] **Step 8: Add the CI database-test step**

Immediately after `Rebuild local database`:

```yaml
- name: Test database policies and constraints
  run: pnpm exec supabase test db
```

Run `pnpm exec prettier --check .github/workflows/ci.yml && git diff --check`.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/*_create_service_diagnoses.sql supabase/tests/service_diagnoses.test.sql .github/workflows/ci.yml
git commit -m "feat: add protected service diagnoses schema"
```

**Checkpoint:** Report the generated migration path, pgTAP allow/deny evidence and advisor output. Wait for approval before Task 2.

---

### Task 2: Generate deterministic database types

**Files:**

- Modify (generated): `src/infrastructure/database/supabase/database.types.ts`

**Interfaces:**

- Consumes: Task 1 schema and `scripts/generate-database-types.mjs`.
- Produces: generated `service_diagnoses` Row/Insert/Update types and both enums.

- [ ] **Step 1: Rebuild and generate**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
```

- [ ] **Step 2: Inspect exact generated contracts**

```bash
rg -n 'service_diagnoses|business_category|service_pricing_method' src/infrastructure/database/supabase/database.types.ts
```

Expected: `Row.id` is `number`, `Insert.id` is optional, and enum labels match the spec.

- [ ] **Step 3: Prove deterministic generation**

```bash
git diff -- src/infrastructure/database/supabase/database.types.ts
pnpm supabase:types
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

Expected: the second generation adds no diff.

- [ ] **Step 4: Run static gates and commit**

```bash
pnpm typecheck
pnpm exec eslint src/infrastructure/database/supabase/database.types.ts
pnpm exec prettier --check src/infrastructure/database/supabase/database.types.ts
git add src/infrastructure/database/supabase/database.types.ts
git commit -m "chore: generate service diagnosis database types"
```

**Checkpoint:** Report generated table/enums and zero second-generation diff. Wait for approval before Task 3.

---

### Task 3: Centralize verified server authentication

**Files:**

- Create: `src/modules/auth/services/require-user.ts`
- Create: `src/modules/auth/services/require-user.test.ts`

**Interfaces:**

- Consumes: `createClient()` and `supabase.auth.getClaims()`.
- Produces: `AuthRequiredError` and `requireUser(): Promise<{ userId: string; supabase: SupabaseClient<Database> }>`.

- [ ] **Step 1: Write failing tests**

```ts
it("returns the verified subject and the same client", async () => {
  createClient.mockResolvedValue(supabase);
  getClaims.mockResolvedValue({
    data: { claims: { sub: "user-123" } },
    error: null,
  });
  await expect(requireUser()).resolves.toEqual({
    userId: "user-123",
    supabase,
  });
  expect(createClient).toHaveBeenCalledTimes(1);
});

it.each([
  { data: null, error: { message: "provider detail" } },
  { data: { claims: {} }, error: null },
  { data: { claims: { sub: "" } }, error: null },
  { data: { claims: { sub: 42 } }, error: null },
])("rejects unusable claims safely", async (result) => {
  getClaims.mockResolvedValue(result);
  await expect(requireUser()).rejects.toBeInstanceOf(AuthRequiredError);
});
```

- [ ] **Step 2: Verify red**

```bash
pnpm test -- src/modules/auth/services/require-user.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the guard**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/database/supabase/database.types";
import { createClient } from "@/infrastructure/database/supabase/clients/server.client";

class AuthRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthRequiredError";
  }
}

async function requireUser(): Promise<{
  userId: string;
  supabase: SupabaseClient<Database>;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || typeof subject !== "string" || subject.length === 0) {
    throw new AuthRequiredError();
  }
  return { userId: subject, supabase };
}

export { AuthRequiredError, requireUser };
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- src/modules/auth/services/require-user.test.ts
pnpm typecheck
pnpm exec eslint src/modules/auth/services/require-user.ts src/modules/auth/services/require-user.test.ts
pnpm exec prettier --check src/modules/auth/services/require-user.ts src/modules/auth/services/require-user.test.ts
git add src/modules/auth/services/require-user.ts src/modules/auth/services/require-user.test.ts
git commit -m "feat: add authenticated server user guard"
```

**Checkpoint:** Prove all unauthenticated paths throw a single safe error. Wait for approval before Task 4.

---

### Task 4: Validate and normalize diagnosis input

**Files:**

- Create: `src/modules/quick-diagnosis/types.ts`
- Create: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.ts`
- Create: `src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts`

**Interfaces:**

- Consumes: `ServiceDiagnosisInput` strings.
- Produces: contracts in Shared Contracts and `serviceDiagnosisSchema: ZodType<ServiceDiagnosisCommand, ServiceDiagnosisInput>`.

- [ ] **Step 1: Create shared contracts and failing test fixture**

Put Shared Contracts in `types.ts`. Use this test fixture:

```ts
const validHour: ServiceDiagnosisInput = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  pricingMethod: "hour",
  desiredMonthlyIncome: "R$ 5.000,25",
  fixedMonthlyExpenses: "1.234,56",
  monthlyWorkHours: "160,5",
  weeklyWorkDays: "5",
  hourlyRate: "125,90",
  minuteRate: "",
  appointmentRate: "",
  appointmentDurationMinutes: "",
  taxRate: "6,25",
  cardFeeRate: "3.50",
};

expect(serviceDiagnosisSchema.parse(validHour)).toEqual({
  submissionId: validHour.submissionId,
  pricingMethod: "hour",
  desiredMonthlyIncomeCents: 500025,
  fixedMonthlyExpensesCents: 123456,
  monthlyWorkMinutes: 9630,
  weeklyWorkDays: 5,
  hourlyRateCents: 12590,
  minuteRateCents: 0,
  appointmentRateCents: 0,
  appointmentDurationMinutes: 0,
  taxRateBasisPoints: 625,
  cardFeeRateBasisPoints: 350,
});
```

Add table-driven failures for invalid UUID/method, negatives, money/percent with three decimal places, `744,01` hours, `8` days, `100,01%`, and unsafe integers. Add passing boundaries `0`, `744`, `7`, `100`, and tests for empty-to-zero normalization.

- [ ] **Step 2: Add failing conditional-shape tests**

```ts
expect(
  serviceDiagnosisSchema.safeParse({ ...validHour, hourlyRate: "" }).success,
).toBe(false);

expect(
  serviceDiagnosisSchema.parse({
    ...validHour,
    pricingMethod: "minute",
    minuteRate: "2,50",
    appointmentRate: "800",
    appointmentDurationMinutes: "45",
  }),
).toEqual(
  expect.objectContaining({
    pricingMethod: "minute",
    hourlyRateCents: 0,
    minuteRateCents: 250,
    appointmentRateCents: 0,
    appointmentDurationMinutes: 0,
  }),
);

expect(
  serviceDiagnosisSchema.parse({
    ...validHour,
    pricingMethod: "appointment",
    appointmentRate: "350,00",
    appointmentDurationMinutes: "90",
  }),
).toEqual(
  expect.objectContaining({
    pricingMethod: "appointment",
    hourlyRateCents: 0,
    appointmentRateCents: 35000,
    appointmentDurationMinutes: 90,
  }),
);
```

Reject appointment rate `0`, duration `0` and duration `45,5`; attach cross-field issues to the editable price/duration fields.

- [ ] **Step 3: Verify red**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
```

- [ ] **Step 4: Implement string-based decimal helpers**

```ts
function canonicalDecimal(value: string): string {
  const compact = value
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");
  if (compact === "") return "0";
  return compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
}

function scaledInteger(value: string, scale: number): number {
  const match = canonicalDecimal(value).match(/^(\d+)(?:\.(\d+))?$/);
  if (!match || (match[2]?.length ?? 0) > scale)
    throw new Error("invalid_decimal");
  const factor = 10n ** BigInt(scale);
  const fraction = (match[2] ?? "").padEnd(scale, "0");
  const result = BigInt(match[1]) * factor + BigInt(fraction || "0");
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("unsafe_integer");
  return Number(result);
}

function roundedMinutes(value: string): number {
  const canonical = canonicalDecimal(value);
  const [whole, fraction = ""] = canonical.split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction))
    throw new Error("invalid_decimal");
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole) * denominator + BigInt(fraction || "0");
  const minutes = (numerator * 120n + denominator) / (2n * denominator);
  if (minutes > 44640n) throw new Error("out_of_range");
  return Number(minutes);
}
```

Build a raw Zod object with field-specific Portuguese messages, transform all fields into `ServiceDiagnosisCommand`, zero unrelated method fields, and use `superRefine` for selected-price/duration positivity. Convert helper exceptions to Zod issues; never expose helper error strings.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas
pnpm exec prettier --check src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas
git add src/modules/quick-diagnosis/types.ts src/modules/quick-diagnosis/schemas
git commit -m "feat: validate service diagnosis input"
```

**Checkpoint:** Show one normalized fixture and one field error per pricing method. Wait for approval before Task 5.

---

### Task 5: Persist with constraint-specific idempotency

**Files:**

- Create: `src/modules/quick-diagnosis/services/create-service-diagnosis.service.ts`
- Create: `src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts`

**Interfaces:**

- Consumes: `SupabaseClient<Database>`, trusted `userId`, `ServiceDiagnosisCommand`.
- Produces: success with `diagnosisId` or safe `create_failed`.

- [ ] **Step 1: Write failing payload tests**

For hour, minute and appointment, assert `insert` receives every snake_case field. The hour case is:

```ts
expect(insert).toHaveBeenCalledWith({
  submission_id: command.submissionId,
  user_id: "trusted-user",
  business_category: "service",
  pricing_method: "hour",
  desired_monthly_income_cents: command.desiredMonthlyIncomeCents,
  fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
  monthly_work_minutes: command.monthlyWorkMinutes,
  weekly_work_days: command.weeklyWorkDays,
  hourly_rate_cents: command.hourlyRateCents,
  minute_rate_cents: 0,
  appointment_rate_cents: 0,
  appointment_duration_minutes: 0,
  tax_rate_basis_points: command.taxRateBasisPoints,
  card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
});
```

Assert `.select("id").single()` returns `{ status: "success", diagnosisId: 42 }`.

- [ ] **Step 2: Write failing idempotency/error tests**

Only error code `23505` whose message names `service_diagnoses_user_submission_key` may query by both `.eq("user_id", userId)` and `.eq("submission_id", submissionId)`. Existing row returns success; absent row, lookup error, thrown exception, another constraint name, and all other errors return exactly `{ status: "error", error: "create_failed" }`.

- [ ] **Step 3: Verify red**

```bash
pnpm test -- src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts
```

- [ ] **Step 4: Implement the typed service**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  TablesInsert,
} from "@/infrastructure/database/supabase/database.types";
import type { ServiceDiagnosisCommand } from "../types";

const IDEMPOTENCY_CONSTRAINT = "service_diagnoses_user_submission_key";

type CreateServiceDiagnosisServiceInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  command: ServiceDiagnosisCommand;
};

type CreateServiceDiagnosisServiceResult =
  | { status: "success"; diagnosisId: number }
  | { status: "error"; error: "create_failed" };

function toInsert(
  userId: string,
  command: ServiceDiagnosisCommand,
): TablesInsert<"service_diagnoses"> {
  return {
    submission_id: command.submissionId,
    user_id: userId,
    business_category: "service",
    pricing_method: command.pricingMethod,
    desired_monthly_income_cents: command.desiredMonthlyIncomeCents,
    fixed_monthly_expenses_cents: command.fixedMonthlyExpensesCents,
    monthly_work_minutes: command.monthlyWorkMinutes,
    weekly_work_days: command.weeklyWorkDays,
    hourly_rate_cents: command.hourlyRateCents,
    minute_rate_cents: command.minuteRateCents,
    appointment_rate_cents: command.appointmentRateCents,
    appointment_duration_minutes: command.appointmentDurationMinutes,
    tax_rate_basis_points: command.taxRateBasisPoints,
    card_fee_rate_basis_points: command.cardFeeRateBasisPoints,
  };
}
```

Implement insert and ownership-scoped lookup in `try/catch`; never log or return provider errors.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/services/create-service-diagnosis.service.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/services
pnpm exec prettier --check src/modules/quick-diagnosis/services
git add src/modules/quick-diagnosis/services
git commit -m "feat: persist service diagnoses idempotently"
```

**Checkpoint:** Report normal insert, successful retry, unrelated collision and safe technical failure. Wait for approval before Task 6.

---

### Task 6: Expose a safe Server Action

**Files:**

- Create: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts`
- Create: `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts`

**Interfaces:**

- Consumes: raw input, schema, `requireUser`, persistence service.
- Produces: `createServiceDiagnosis(input): Promise<CreateServiceDiagnosisActionResult>`.

- [ ] **Step 1: Write failing orchestration tests**

Assert invalid input returns field errors without authentication/service calls; `AuthRequiredError` maps to `unauthorized`; success passes the normalized command plus trusted user/client; service error and unexpected exception map to `create_failed`. Serialize results and prove they omit `message`, `details`, `hint`, `code` and mocked provider details.

```ts
expect(await createServiceDiagnosis(invalidInput)).toEqual({
  status: "error",
  error: "invalid_input",
  fieldErrors: { hourlyRate: ["Informe o valor por hora."] },
});
expect(requireUser).not.toHaveBeenCalled();
expect(createServiceDiagnosisService).not.toHaveBeenCalled();
```

- [ ] **Step 2: Verify red**

```bash
pnpm test -- src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
```

- [ ] **Step 3: Implement validation-first action**

```ts
"use server";

async function createServiceDiagnosis(
  input: ServiceDiagnosisInput,
): Promise<CreateServiceDiagnosisActionResult> {
  const parsed = serviceDiagnosisSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      error: "invalid_input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { userId, supabase } = await requireUser();
    return await createServiceDiagnosisService({
      userId,
      supabase,
      command: parsed.data,
    });
  } catch (error) {
    if (error instanceof AuthRequiredError)
      return { status: "error", error: "unauthorized" };
    return { status: "error", error: "create_failed" };
  }
}
```

Do not add `fetch`, Route Handler, redirect or technical logging.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/actions
pnpm exec prettier --check src/modules/quick-diagnosis/actions
git add src/modules/quick-diagnosis/actions
git commit -m "feat: add service diagnosis server action"
```

**Checkpoint:** Report call order and all four public result shapes. Wait for approval before Task 7.

---

### Task 7: Add private route and sidebar navigation

**Files:**

- Create: `src/app/(private)/quick-diagnosis/page.tsx`
- Create: `src/app/(private)/quick-diagnosis/page.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/app-sidebar.test.tsx`
- Create initial: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`

**Interfaces:**

- Consumes: private layout auth and `createServiceDiagnosis`.
- Produces: `/quick-diagnosis`, “Diagnóstico rápido” link and `QuickDiagnosisWizard` prop `createDiagnosis`.

- [ ] **Step 1: Write failing navigation/page tests**

```ts
usePathname.mockReturnValue("/quick-diagnosis");
render(<AppSidebar />);
expect(screen.getByRole("link", { name: /diagnóstico rápido/i })).toHaveAttribute("href", "/quick-diagnosis");
expect(screen.getByRole("link", { name: /diagnóstico rápido/i })).toHaveAttribute("data-active", "true");
expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveAttribute("data-active", "true");
```

The page test mocks the wizard and verifies it receives `createServiceDiagnosis`.

- [ ] **Step 2: Verify red**

```bash
pnpm test -- src/components/layout/app-sidebar.test.tsx 'src/app/(private)/quick-diagnosis/page.test.tsx'
```

- [ ] **Step 3: Add sidebar item and thin page**

Use the existing `SidebarMenuItem`/`SidebarMenuButton` pattern with `ClipboardCheckIcon`, exact href and exact active match. Create:

```tsx
export default function QuickDiagnosisPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <h1 className="sr-only">Diagnóstico rápido</h1>
      <QuickDiagnosisWizard createDiagnosis={createServiceDiagnosis} />
    </main>
  );
}
```

Add a minimal client wizard accepting `CreateServiceDiagnosisAction`; Task 8 replaces only its body.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test -- src/components/layout/app-sidebar.test.tsx 'src/app/(private)/quick-diagnosis/page.test.tsx'
pnpm typecheck
pnpm exec eslint src/components/layout/app-sidebar.tsx 'src/app/(private)/quick-diagnosis' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx
pnpm exec prettier --check src/components/layout/app-sidebar.tsx 'src/app/(private)/quick-diagnosis' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx
git add src/components/layout/app-sidebar.tsx src/components/layout/app-sidebar.test.tsx 'src/app/(private)/quick-diagnosis' src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx
git commit -m "feat: add quick diagnosis private route"
```

**Checkpoint:** Demonstrate route, href and exact active state. Wait for approval before Task 8.

---

### Task 8: Build deterministic wizard state and accessible shell

**Files:**

- Create: `src/modules/quick-diagnosis/components/wizard-state.ts`
- Create: `src/modules/quick-diagnosis/components/wizard-state.test.ts`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Create: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

**Interfaces:**

- Consumes: shared input/errors/action types.
- Produces: `createInitialWizardState`, `wizardReducer`, progress `N de 7`, single mounted step and focused heading.

- [ ] **Step 1: Write failing reducer tests**

Assert initial empty values with injected UUID; `next`, `back`, `edit`, `setField`, errors, submitting, success and reset. Changing method must clear all method-dependent strings:

```ts
expect(
  wizardReducer(hourState, {
    type: "setPricingMethod",
    value: "minute",
  }).values,
).toEqual(
  expect.objectContaining({
    pricingMethod: "minute",
    hourlyRate: "",
    minuteRate: "",
    appointmentRate: "",
    appointmentDurationMinutes: "",
  }),
);
```

- [ ] **Step 2: Verify red**

```bash
pnpm test -- src/modules/quick-diagnosis/components/wizard-state.test.ts
```

- [ ] **Step 3: Implement the state machine**

```ts
export const wizardSteps = [
  "pricingMethod",
  "monthlyGoal",
  "fixedExpenses",
  "workRoutine",
  "currentPrice",
  "fees",
  "review",
] as const;

type WizardState = {
  step: (typeof wizardSteps)[number];
  values: ServiceDiagnosisInput;
  fieldErrors: ServiceDiagnosisFieldErrors;
  status: "editing" | "submitting" | "success";
  diagnosisId: number | null;
  submitError: "unauthorized" | "create_failed" | null;
};
```

Reducer actions are `setField`, `setPricingMethod`, `setFieldErrors`, `next`, `back`, `edit`, `submitting`, `submitError`, `success`, and `reset`. Clamp navigation; retry preserves state; reset receives a new UUID.

- [ ] **Step 4: Write failing shell tests**

```tsx
expect(screen.getByText("1 de 7")).toBeInTheDocument();
expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "7");
expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
```

- [ ] **Step 5: Implement shell and focus**

Accept optional `createSubmissionId = crypto.randomUUID` for deterministic tests. Store its first result in `useRef`, initialize reducer once, and on step changes call `headingRef.current?.focus({ preventScroll: true })`. Render existing `Progress`, `Card`, `Button`, one `section[data-testid="wizard-step"]`, Back and Continue. Do not submit in this task.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/components/wizard-state.test.ts src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components
pnpm exec prettier --check src/modules/quick-diagnosis/components
git add src/modules/quick-diagnosis/components
git commit -m "feat: add quick diagnosis wizard shell"
```

**Checkpoint:** Demonstrate progress, one mounted section, heading focus, Back preservation and method clearing. Wait for approval before Task 9.

---

### Task 9: Implement six input steps and progressive validation

**Files:**

- Create: `src/modules/quick-diagnosis/components/steps/pricing-method-step.tsx`
- Create: `src/modules/quick-diagnosis/components/steps/monthly-goal-step.tsx`
- Create: `src/modules/quick-diagnosis/components/steps/fixed-expenses-step.tsx`
- Create: `src/modules/quick-diagnosis/components/steps/work-routine-step.tsx`
- Create: `src/modules/quick-diagnosis/components/steps/current-price-step.tsx`
- Create: `src/modules/quick-diagnosis/components/steps/fees-step.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`
- Modify: schema and schema test to export/test pure per-field validation.

**Interfaces:**

- Consumes: raw values, errors and typed reducer callbacks.
- Produces: six accessible input steps and `validateServiceDiagnosisFields(fields, values)`.

- [ ] **Step 1: Write failing full-path tests**

Use `userEvent` to select each pricing method, fill all inputs, Continue/Back, and assert exactly one step. Required accessible labels are:

| Step | Heading                                    | Fields                                                     |
| ---- | ------------------------------------------ | ---------------------------------------------------------- |
| 1    | `Como você vende seu tempo?`               | `Por hora`, `Por minuto`, `Por atendimento`                |
| 2    | `Quanto você quer tirar por mês pra você?` | `Renda mensal desejada`                                    |
| 3    | `Quais são suas despesas fixas?`           | `Despesas fixas mensais`                                   |
| 4    | `Como é sua rotina de trabalho?`           | `Horas de trabalho por mês`, `Dias de trabalho por semana` |
| 5    | `Qual é seu preço atual?`                  | selected price; appointment also has duration              |
| 6    | `Quais taxas incidem nas vendas?`          | `Impostos`, `Taxa do cartão`                               |

Prove hour/minute/appointment render only relevant fields and method switching clears the old value.

- [ ] **Step 2: Write failing validation/accessibility tests**

Continue with empty/invalid values and assert it stays on the source step. Cover `744,01`, `8`, `100,01`, zero selected price and fractional appointment minutes. Each invalid input has `aria-invalid=true`, `aria-describedby=<id>-error`, and a matching `role=alert` node. Test radio selection by keyboard.

- [ ] **Step 3: Verify red**

```bash
pnpm test -- src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
```

- [ ] **Step 4: Implement presentational step contracts**

```ts
type StepProps = {
  values: ServiceDiagnosisInput;
  errors: ServiceDiagnosisFieldErrors;
  onChange: (field: ServiceDiagnosisField, value: string) => void;
};
```

Pricing also receives `onPricingMethodChange(ServicePricingMethod)`. Money uses `InputGroup` with `R$`; rates use `%`; hours use `h`; duration uses `min`. Keep text values and `inputMode`; never call `Number()` in change handlers.

- [ ] **Step 5: Reuse the schema's pure parsers per step**

Export:

```ts
function validateServiceDiagnosisFields(
  fields: readonly ServiceDiagnosisField[],
  values: ServiceDiagnosisInput,
): ServiceDiagnosisFieldErrors;
```

Map steps exactly:

```ts
const stepFields = {
  pricingMethod: ["pricingMethod"],
  monthlyGoal: ["desiredMonthlyIncome"],
  fixedExpenses: ["fixedMonthlyExpenses"],
  workRoutine: ["monthlyWorkHours", "weeklyWorkDays"],
  currentPrice: [
    "hourlyRate",
    "minuteRate",
    "appointmentRate",
    "appointmentDurationMinutes",
  ],
  fees: ["taxRate", "cardFeeRate"],
} as const;
```

Continue advances only with zero returned issues. Full Server Action validation remains authoritative.

- [ ] **Step 6: Verify and commit**

```bash
pnpm test -- src/modules/quick-diagnosis/schemas/service-diagnosis.schema.test.ts src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components src/modules/quick-diagnosis/schemas
pnpm exec prettier --check src/modules/quick-diagnosis/components src/modules/quick-diagnosis/schemas
git add src/modules/quick-diagnosis/components src/modules/quick-diagnosis/schemas
git commit -m "feat: add quick diagnosis input steps"
```

**Checkpoint:** Demonstrate all input paths, linked errors, Back, method clearing, keyboard selection and one mounted step. Wait for approval before Task 10.

---

### Task 10: Implement review, submission and success

**Files:**

- Create: `src/modules/quick-diagnosis/components/steps/review-step.tsx`
- Create: `src/modules/quick-diagnosis/components/diagnosis-success.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.tsx`
- Modify: `src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx`

**Interfaces:**

- Consumes: in-memory answers and action result union.
- Produces: review/edit, confirmation, safe retry and clean success/reset.

- [ ] **Step 1: Write failing review tests**

Complete a valid flow and assert `7 de 7`, grouped user-facing values and six specifically named Edit buttons. Assert `createDiagnosis` has not run. Each Edit returns to the source step with strings preserved.

```ts
expect(screen.getByText("Por hora")).toBeInTheDocument();
expect(screen.getByText("R$ 5.000,00")).toBeInTheDocument();
expect(screen.getByText("160 horas por mês")).toBeInTheDocument();
expect(createDiagnosis).not.toHaveBeenCalled();
```

- [ ] **Step 2: Write failing submission/result tests**

With a deferred promise, assert `Confirmar diagnóstico` calls once, changes to disabled `Enviando...`, and blocks concurrent calls. Cover:

- success: `Diagnóstico salvo`, dashboard link and no progress;
- `create_failed`: remain on review, generic retry message, preserve answers and UUID;
- `unauthorized`: remain on review and show `/login` link;
- `invalid_input`: go to earliest invalid field and focus it;
- new diagnosis: clear values, create new UUID and return to `1 de 7`.

- [ ] **Step 3: Verify red**

```bash
pnpm test -- src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx
```

- [ ] **Step 4: Implement review formatting and edit contract**

`ReviewStep` receives values, errors, pending, submit error, `onEdit` and `onSubmit`. Format money with `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`; preserve percentage precision; use Edit names containing each section. Only review renders `Confirmar diagnóstico`.

- [ ] **Step 5: Implement submission and field routing**

Guard `submitting`, await the action and exhaustively branch. Use:

```ts
const fieldStep: Record<ServiceDiagnosisField, WizardStep> = {
  submissionId: "pricingMethod",
  pricingMethod: "pricingMethod",
  desiredMonthlyIncome: "monthlyGoal",
  fixedMonthlyExpenses: "fixedExpenses",
  monthlyWorkHours: "workRoutine",
  weeklyWorkDays: "workRoutine",
  hourlyRate: "currentPrice",
  minuteRate: "currentPrice",
  appointmentRate: "currentPrice",
  appointmentDurationMinutes: "currentPrice",
  taxRate: "fees",
  cardFeeRate: "fees",
};
```

Navigate to the earliest invalid step. If `submissionId` is invalid, regenerate it because the field is not editable. Focus the first invalid input after render.

- [ ] **Step 6: Implement success state**

`DiagnosisSuccess` receives `diagnosisId` and `onStartAnother`. Render `Diagnóstico salvo`, `/dashboard` link and `Iniciar outro diagnóstico`; reset creates a fresh UUID. It is not an eighth step and contains no calculation/recommendation copy.

- [ ] **Step 7: Verify accessibility, motion and commit**

Use `role=alert` for errors, focus the success heading, preserve visible focus and apply `motion-reduce:transition-none` to transitions.

```bash
pnpm test -- src/modules/quick-diagnosis/components/quick-diagnosis-wizard.test.tsx 'src/app/(private)/quick-diagnosis/page.test.tsx'
pnpm typecheck
pnpm exec eslint src/modules/quick-diagnosis/components 'src/app/(private)/quick-diagnosis'
pnpm exec prettier --check src/modules/quick-diagnosis/components 'src/app/(private)/quick-diagnosis'
git add src/modules/quick-diagnosis/components
git commit -m "feat: complete quick diagnosis submission flow"
```

**Checkpoint:** Demonstrate review-before-submit, pending lock, same-ID retry, safe errors, success, dashboard and new-ID reset. Wait for approval before Task 11.

---

### Task 11: Run integrated regression and delivery checks

**Files:**

- Modify only files already named by Tasks 1–10 when a failing gate identifies a regression introduced by this feature.

**Interfaces:**

- Consumes: all database and application deliverables.
- Produces: reproducible acceptance evidence and staging-ready additive changes.

- [ ] **Step 1: Rebuild and verify database**

```bash
pnpm supabase:reset
pnpm exec supabase test db
pnpm supabase:types
pnpm supabase:lint
pnpm supabase:advisors
git diff --exit-code -- src/infrastructure/database/supabase/database.types.ts
```

- [ ] **Step 2: Run application gates**

```bash
pnpm check
pnpm build
git diff --check
```

- [ ] **Step 3: Verify desktop/mobile and accessibility manually**

For hour, minute and appointment at approximately `375px` and `1440px`, confirm seven steps, progressive errors, Back, review Edit, final confirmation, retry, success and reset. Repeat by keyboard, in light/dark themes and with reduced motion enabled.

- [ ] **Step 4: Verify persistence and idempotency**

Query the local database before confirmation and expect no row. Confirm once and expect one row. Replay the same `submission_id` and expect the same `diagnosisId` plus one row. Start another diagnosis and expect a different UUID plus a second row. Do not add test rows to seed.

- [ ] **Step 5: Verify ownership and immutability**

With a second local user and the pgTAP role/JWT setup, prove no visibility of user-one rows, foreign-owner insert denied by RLS, and update/delete denied by privileges. Do not use `service_role`.

- [ ] **Step 6: Inspect final scope**

```bash
git status --short
git diff --stat
git diff -- . ':!src/infrastructure/database/supabase/database.types.ts'
git diff --cached --name-only
```

Expected: no `.env.local`, browser artifact, seed data, product/production flow, calculation, recommendation, history, Route Handler or dependency addition.

- [ ] **Step 7: Commit only a real regression fix**

If a gate required a correction, first confirm that every changed path belongs to the file structure above, then stage the feature's explicit paths and commit:

```bash
git add .github/workflows/ci.yml supabase/migrations supabase/tests \
  src/infrastructure/database/supabase/database.types.ts \
  src/modules/auth/services/require-user.ts \
  src/modules/auth/services/require-user.test.ts \
  src/modules/quick-diagnosis \
  'src/app/(private)/quick-diagnosis' \
  src/components/layout/app-sidebar.tsx \
  src/components/layout/app-sidebar.test.tsx
git commit -m "fix: resolve quick diagnosis regression"
```

If no source correction was required, do not create an empty commit.

**Checkpoint:** Deliver command results, manual matrix, migration path, RLS/idempotency evidence, final files and deferred scope. Application rollback before release removes/reverts route and sidebar while leaving the additive table unused; database object/data removal requires a separately approved forward migration.
