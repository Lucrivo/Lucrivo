# Terms and Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Portuguese terms and privacy pages, record immutable client acceptance of `terms-privacy-v1`, and keep the client product closed until that version is accepted.

**Architecture:** One shared copy module owns the version and the supplier identity. Postgres stores append-only acceptance events, written at signup through the service role and at `/accept-terms` through the session. `resolveAuthenticatedHome`, the client layouts, client server actions, and client API routes all consult that version before opening the product. Administrators skip the gate.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase SSR, PostgreSQL pgTAP, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-12-terms-and-privacy-design.md`

## Global Constraints

- Version constant is exactly `terms-privacy-v1`.
- Routes are exactly `/terms`, `/privacy`, and `/accept-terms`.
- UI and both documents stay in Portuguese.
- The register checkbox is unchecked by default. Its field name is `acceptedLegalTerms` and the accepted value is `on`. Missing it returns `legal_acceptance_required` and does not call `signUp`.
- Only client accounts accept. Administrators go to `/admin` and never see the gate.
- Refusal writes no row. Account, diagnoses, and subscription stay as they are.
- Same user and same version never inserts a second row.
- Signup recording runs only for a real identity: a session user id, or a confirmation user with at least one identity. An empty `identities` array records nothing.
- If the account is created and recording fails, signup still succeeds. The gate records acceptance on the next login.
- A failed legal-acceptance lookup sends the client to `/accept-terms` and does not use `/account-unavailable`.
- `/accept-terms` lives outside the onboarding, private, and admin layouts.
- Client API routes without acceptance return `403` with `{ error: "legal_acceptance_required" }`.
- `requireUser` stays limited to session and eligibility. Do not put the legal check inside the `try` that converts every failure into `AccountUnavailableError`.
- Supplier full name, CPF, and address come from the operator during Task 10. Do not invent them and do not reuse the test fixture as production identity.
- Contact email is `atendimento@lucrivo.com.br`.
- Out of scope: cookie banner, personal-data erasure, admin acceptance, legal review, a numeric tax-retention period, and making WhatsApp marketing mandatory.

---

## File Structure

- Create `src/modules/legal/legal-copy.ts` — version, supplier type, and pure document sections.
- Create `src/modules/legal/legal-supplier.ts` — operator identity read by the public pages. Task 10 only.
- Create `supabase/migrations/20261012233000_add_legal_acceptance.sql` — table, trigger, and three RPCs.
- Create `supabase/tests/legal_acceptance.test.sql` — privileges, append-only behavior, idempotency, and version lookup.
- Create `src/modules/legal/record-signup-legal-acceptance.ts` — service-role write used by registration.
- Create `src/modules/legal/accept-legal-terms.action.ts` — session write used by the gate.
- Modify `src/modules/auth/services/signup.service.ts` — return a real user id or null.
- Modify `src/modules/auth/actions/register.action.ts` — require the checkbox and record acceptance.
- Modify `src/modules/auth/services/require-user.ts` — add `requireClientAccess` beside `requireUser`.
- Modify `src/modules/auth/services/resolve-authenticated-home.ts` — insert the client gate.
- Modify `src/app/(private)/layout.tsx` and `src/app/(onboarding)/onboarding/layout.tsx` — redirect clients who have not accepted.
- Create `src/app/accept-terms/page.tsx` and `src/modules/legal/components/accept-terms-screen.tsx`.
- Create `src/app/terms/page.tsx` and `src/app/privacy/page.tsx`.
- Modify the register form, landing footer, and account page — checkbox and reread links.
- Modify client server actions and client API routes listed in Task 9 so they call `requireClientAccess`.
- Regenerate `src/infrastructure/database/supabase/database.types.ts`.

---

### Task 1: Legal copy model

**Files:**
- Create: `src/modules/legal/legal-copy.ts`
- Test: `src/modules/legal/legal-copy.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `LEGAL_COPY_VERSION = "terms-privacy-v1"`; `LegalSupplier = { fullName: string; cpf: string; address: string; email: "atendimento@lucrivo.com.br" }`; `legalTermsSections(supplier: LegalSupplier): LegalSection[]`; `legalPrivacySections(supplier: LegalSupplier): LegalSection[]`; `LegalSection = { id: string; heading: string; paragraphs: string[] }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  LEGAL_COPY_VERSION,
  legalPrivacySections,
  legalTermsSections,
  type LegalSupplier,
} from "./legal-copy";

const supplier: LegalSupplier = {
  fullName: "Pessoa Fornecedora Exemplo",
  cpf: "529.982.247-25",
  address: "Rua Exemplo, 100, São Paulo - SP",
  email: "atendimento@lucrivo.com.br",
};

describe("legal copy", () => {
  it("publishes the current version", () => {
    expect(LEGAL_COPY_VERSION).toBe("terms-privacy-v1");
  });

  it("states the calculation limit, the commercial offer, and the supplier", () => {
    const text = legalTermsSections(supplier)
      .flatMap((section) => section.paragraphs)
      .join("\n");

    expect(text).toContain("Pessoa Fornecedora Exemplo");
    expect(text).toContain("529.982.247-25");
    expect(text).toContain("Rua Exemplo, 100, São Paulo - SP");
    expect(text).toContain("atendimento@lucrivo.com.br");
    expect(text).toContain("não substitui contador, advogado nem consultor");
    expect(text).toContain("pode errar");
    expect(text).toContain("7 dias");
    expect(text).toContain("fim do período já pago");
    expect(text).toContain("terms-privacy-v1");
  });

  it("states the contract basis, processors, cookies, and the deletion limit", () => {
    const text = legalPrivacySections(supplier)
      .flatMap((section) => section.paragraphs)
      .join("\n");

    expect(text).toContain("contrato");
    expect(text).toContain("Supabase");
    expect(text).toContain("Asaas");
    expect(text).toContain("OpenAI");
    expect(text).toContain("Cloudflare");
    expect(text).toContain("sidebar");
    expect(text).toContain("Minha conta");
    expect(text).toContain("atendimento@lucrivo.com.br");
    expect(text).toContain("exclusão lógica");
    expect(text).toContain("obrigação fiscal");
    expect(text).not.toContain("apagamos todos os dados");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/modules/legal/legal-copy.test.ts`

Expected: FAIL because `src/modules/legal/legal-copy.ts` does not exist.

- [ ] **Step 3: Write the copy module**

```ts
const LEGAL_COPY_VERSION = "terms-privacy-v1" as const;

type LegalSupplier = {
  fullName: string;
  cpf: string;
  address: string;
  email: "atendimento@lucrivo.com.br";
};

type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

function legalTermsSections(supplier: LegalSupplier): LegalSection[] {
  return [
    {
      id: "supplier",
      heading: "Quem oferece o Lucrivo",
      paragraphs: [
        `O Lucrivo é oferecido por ${supplier.fullName}, CPF ${supplier.cpf}, com endereço em ${supplier.address}. O contato é ${supplier.email}.`,
      ],
    },
    {
      id: "service",
      heading: "O que o serviço faz",
      paragraphs: [
        "Você informa os números do seu negócio. O Lucrivo calcula e explica esse resultado. O resultado não substitui contador, advogado nem consultor, e a decisão de preço continua sendo sua.",
        "A conversa com a inteligência artificial segue a mesma regra: ela explica os fatos do relatório, pode errar e não é orientação profissional.",
      ],
    },
    {
      id: "subscription",
      heading: "Conta e assinatura",
      paragraphs: [
        "A assinatura é mensal ou semestral, paga no cartão ou no Pix. A cobrança é processada pelo Asaas.",
      ],
    },
    {
      id: "guarantee",
      heading: "Garantia e cancelamento",
      paragraphs: [
        "Você tem 7 dias, contados da compra, para pedir a devolução do valor pelo mesmo meio de pagamento.",
        "O cancelamento mantém o acesso até o fim do período já pago. Não há fidelidade.",
      ],
    },
    {
      id: "version",
      heading: "Aceite desta versão",
      paragraphs: [
        `Estes termos e a política de privacidade formam a versão ${LEGAL_COPY_VERSION}. Quando o texto mudar, o Lucrivo pede um novo aceite.`,
      ],
    },
  ];
}

function legalPrivacySections(supplier: LegalSupplier): LegalSection[] {
  return [
    {
      id: "controller",
      heading: "Quem trata os dados",
      paragraphs: [
        `${supplier.fullName}, CPF ${supplier.cpf}, com endereço em ${supplier.address}, é quem trata os dados da sua conta. O contato é ${supplier.email}.`,
      ],
    },
    {
      id: "data",
      heading: "Quais dados entram",
      paragraphs: [
        "A conta guarda e-mail e a senha sob o serviço de autenticação. O perfil guarda nome, WhatsApp e segmento do negócio. O diagnóstico guarda os números que você informa. A cobrança guarda os dados do pagamento.",
      ],
    },
    {
      id: "basis",
      heading: "Por que os dados são usados",
      paragraphs: [
        "Os dados necessários para criar a conta, calcular o diagnóstico e cobrar a assinatura são tratados para executar o contrato. O WhatsApp de marketing é o único consentimento opcional: você liga e desliga essa escolha em Minha conta.",
      ],
    },
    {
      id: "processors",
      heading: "Quem recebe dados",
      paragraphs: [
        "O Supabase guarda a conta, o banco e envia os e-mails de autenticação. O Asaas processa a cobrança. A OpenAI recebe os fatos do relatório e a pergunta, sem o cadastro inteiro. A Cloudflare faz a verificação de segurança do cadastro, do login e da recuperação de senha.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      paragraphs: [
        "O Lucrivo usa cookies de sessão, o cookie do filtro do dashboard e o cookie do estado da sidebar. Eles mantêm o acesso e as preferências da interface. Não há cookie de publicidade.",
      ],
    },
    {
      id: "rights",
      heading: "Seus pedidos",
      paragraphs: [
        `Você corrige o perfil do negócio em Minha conta. O e-mail de acesso não é editado ali. Pedidos de acesso, portabilidade ou exclusão vão para ${supplier.email}.`,
      ],
    },
    {
      id: "deletion",
      heading: "Exclusão",
      paragraphs: [
        "A exclusão lógica tira o seu acesso e mantém diagnóstico, contrato e pagamento. Dados de cobrança permanecem pelo tempo da garantia e da obrigação fiscal. O apagamento do restante da conta ainda não existe no produto.",
      ],
    },
  ];
}

export {
  LEGAL_COPY_VERSION,
  legalPrivacySections,
  legalTermsSections,
  type LegalSection,
  type LegalSupplier,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/modules/legal/legal-copy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/legal/legal-copy.ts src/modules/legal/legal-copy.test.ts
git commit -m "$(cat <<'EOF'
feat: add versioned terms and privacy copy

EOF
)"
```

---

### Task 2: Acceptance history in Postgres

**Files:**
- Create: `supabase/migrations/20261012233000_add_legal_acceptance.sql`
- Test: `supabase/tests/legal_acceptance.test.sql`
- Modify: `src/infrastructure/database/supabase/database.types.ts` by regeneration

**Interfaces:**
- Consumes: `LEGAL_COPY_VERSION` only as the value callers will pass. The database does not hardcode it.
- Produces: `public.record_signup_legal_acceptance_v1(p_user_id uuid, p_copy_version text) returns jsonb`; `public.accept_current_legal_terms_v1(p_copy_version text) returns jsonb`; `public.current_user_has_accepted_legal_copy_v1(p_copy_version text) returns boolean`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/legal_acceptance.test.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'private',
  'legal_acceptance_events',
  'legal acceptance history exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'private.legal_acceptance_events'::regclass
  ),
  'legal acceptance history enables row level security'
);

select ok(
  not has_table_privilege('anon', 'private.legal_acceptance_events', 'select')
  and not has_table_privilege('authenticated', 'private.legal_acceptance_events', 'insert')
  and not has_table_privilege('service_role', 'private.legal_acceptance_events', 'insert'),
  'direct table access is revoked'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.record_signup_legal_acceptance_v1(uuid, text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.record_signup_legal_acceptance_v1(uuid, text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.record_signup_legal_acceptance_v1(uuid, text)',
    'execute'
  ),
  'only the service role records signup acceptance'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.accept_current_legal_terms_v1(text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.current_user_has_accepted_legal_copy_v1(text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.accept_current_legal_terms_v1(text)',
    'execute'
  ),
  'authenticated clients can accept and query their own copy'
);

insert into auth.users (id, aud, role, email)
values (
  '94100000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'legal-acceptance@example.com'
);

set local role service_role;
select is(
  public.record_signup_legal_acceptance_v1(
    '94100000-0000-4000-8000-000000000001',
    'terms-privacy-v1'
  ) ->> 'status',
  'recorded',
  'signup acceptance is recorded'
);
select is(
  public.record_signup_legal_acceptance_v1(
    '94100000-0000-4000-8000-000000000001',
    'terms-privacy-v1'
  ) ->> 'status',
  'recorded',
  'the same signup version does not duplicate'
);

reset role;
select is(
  (
    select count(*)
    from private.legal_acceptance_events
    where user_id = '94100000-0000-4000-8000-000000000001'
      and copy_version = 'terms-privacy-v1'
      and source = 'signup'
  ),
  1::bigint,
  'one signup row exists for the version'
);

set local role service_role;
select throws_ok(
  $$ update private.legal_acceptance_events set source = 'gate' $$,
  '42501',
  'legal acceptance history is append-only',
  'service role cannot update acceptance history'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94100000-0000-4000-8000-000000000001',
  true
);
select is(
  public.current_user_has_accepted_legal_copy_v1('terms-privacy-v1'),
  true,
  'the current version is accepted'
);
select is(
  public.current_user_has_accepted_legal_copy_v1('terms-privacy-v0'),
  false,
  'an older version is not accepted'
);
select is(
  public.accept_current_legal_terms_v1('terms-privacy-v1') ->> 'status',
  'recorded',
  'accepting the recorded version stays idempotent'
);

reset role;
select is(
  (
    select count(*)
    from private.legal_acceptance_events
    where user_id = '94100000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'gate acceptance does not add a second row for the same version'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select public.current_user_has_accepted_legal_copy_v1('terms-privacy-v1') $$,
  '42501',
  'a session is required to read legal acceptance',
  'a missing session is not treated as not accepted'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec supabase test db supabase/tests/legal_acceptance.test.sql`

Expected: FAIL because the table or functions do not exist. Start the local stack first with `pnpm supabase:start` if the command cannot reach the database.

- [ ] **Step 3: Add the migration**

Create `supabase/migrations/20261012233000_add_legal_acceptance.sql` with this SQL:

```sql
create table private.legal_acceptance_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  copy_version text not null,
  source text not null,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint legal_acceptance_events_copy_version_check
    check (pg_catalog.char_length(copy_version) between 1 and 64),
  constraint legal_acceptance_events_source_check
    check (source in ('signup', 'gate'))
);

create unique index legal_acceptance_events_user_version_uidx
on private.legal_acceptance_events (user_id, copy_version);

alter table private.legal_acceptance_events enable row level security;

revoke all on table private.legal_acceptance_events
from public, anon, authenticated, service_role;
revoke all on sequence private.legal_acceptance_events_id_seq
from public, anon, authenticated, service_role;

create function private.reject_legal_acceptance_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if session_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'legal acceptance history is append-only';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

create trigger legal_acceptance_events_reject_mutation
before update or delete on private.legal_acceptance_events
for each row execute function private.reject_legal_acceptance_event_mutation();

revoke execute on function private.reject_legal_acceptance_event_mutation()
from public, anon, authenticated, service_role;

create function public.record_signup_legal_acceptance_v1(
  p_user_id uuid,
  p_copy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_user_id is null
    or p_copy_version is null
    or pg_catalog.char_length(p_copy_version) not between 1 and 64
  then
    raise exception using
      errcode = '22023',
      message = 'invalid legal acceptance';
  end if;

  begin
    insert into private.legal_acceptance_events (user_id, copy_version, source)
    values (p_user_id, p_copy_version, 'signup');
  exception
    when unique_violation then
      null;
  end;

  return pg_catalog.jsonb_build_object('status', 'recorded');
end;
$function$;

create function public.accept_current_legal_terms_v1(p_copy_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'a session is required to accept legal terms';
  end if;

  if p_copy_version is null
    or pg_catalog.char_length(p_copy_version) not between 1 and 64
  then
    raise exception using
      errcode = '22023',
      message = 'invalid legal acceptance';
  end if;

  begin
    insert into private.legal_acceptance_events (user_id, copy_version, source)
    values (caller_id, p_copy_version, 'gate');
  exception
    when unique_violation then
      null;
  end;

  return pg_catalog.jsonb_build_object('status', 'recorded');
end;
$function$;

create function public.current_user_has_accepted_legal_copy_v1(
  p_copy_version text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'a session is required to read legal acceptance';
  end if;

  return exists (
    select 1
    from private.legal_acceptance_events as event
    where event.user_id = caller_id
      and event.copy_version = p_copy_version
  );
end;
$function$;

revoke execute on function public.record_signup_legal_acceptance_v1(uuid, text)
from public, anon, authenticated;
revoke execute on function public.accept_current_legal_terms_v1(text)
from public, anon, authenticated;
revoke execute on function public.current_user_has_accepted_legal_copy_v1(text)
from public, anon, authenticated;

grant execute on function public.record_signup_legal_acceptance_v1(uuid, text)
to service_role;
grant execute on function public.accept_current_legal_terms_v1(text)
to authenticated;
grant execute on function public.current_user_has_accepted_legal_copy_v1(text)
to authenticated;
```

- [ ] **Step 4: Run the database test and regenerate types**

Run:

```bash
pnpm exec supabase test db supabase/tests/legal_acceptance.test.sql
pnpm exec supabase migration up --local
pnpm supabase:types
```

Expected: pgTAP PASS, and `database.types.ts` contains `record_signup_legal_acceptance_v1`, `accept_current_legal_terms_v1`, and `current_user_has_accepted_legal_copy_v1`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261012233000_add_legal_acceptance.sql supabase/tests/legal_acceptance.test.sql src/infrastructure/database/supabase/database.types.ts
git commit -m "$(cat <<'EOF'
feat: record immutable legal acceptance

EOF
)"
```

---

### Task 3: Signup returns a real user id

**Files:**
- Modify: `src/modules/auth/services/signup.service.ts`
- Modify: `src/modules/auth/services/signup.service.test.ts`

**Interfaces:**
- Consumes: Supabase `signUp` response `data.user` and `data.session`
- Produces: `SignupServiceResult` with `status: "authenticated"` carrying `userId: string`, or `status: "confirmation_required"` carrying `userId: string | null`. Error variants stay unchanged.

- [ ] **Step 1: Write the failing tests**

Add these cases to `signup.service.test.ts`. Keep the existing CAPTCHA test, and change its mocked response to include an empty user so the new return shape is explicit.

```ts
it("returns the session user id when signup authenticates immediately", async () => {
  signUp.mockResolvedValue({
    data: {
      session: { access_token: "token" },
      user: { id: "user-1", identities: [{ id: "identity-1" }] },
    },
    error: null,
  });

  await expect(
    signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
  ).resolves.toEqual({ status: "authenticated", userId: "user-1" });
});

it("returns the user id when confirmation still has an identity", async () => {
  signUp.mockResolvedValue({
    data: {
      session: null,
      user: { id: "user-2", identities: [{ id: "identity-2" }] },
    },
    error: null,
  });

  await expect(
    signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
  ).resolves.toEqual({
    status: "confirmation_required",
    userId: "user-2",
  });
});

it("returns no user id when confirmation has no identity", async () => {
  signUp.mockResolvedValue({
    data: { session: null, user: { id: "user-3", identities: [] } },
    error: null,
  });

  await expect(
    signup({ email: "usuario@lucrivo.com", password: "senha-segura1" }),
  ).resolves.toEqual({ status: "confirmation_required", userId: null });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/modules/auth/services/signup.service.test.ts`

Expected: FAIL because the result has no `userId`.

- [ ] **Step 3: Return the id from signup**

In `signup.service.ts`, derive the id after a successful `signUp`:

```ts
if (data.session) {
  if (!data.user?.id) return { status: "error", error: "signup_failed" };
  return { status: "authenticated", userId: data.user.id };
}

const identities = data.user?.identities;
const userId =
  data.user?.id && Array.isArray(identities) && identities.length > 0
    ? data.user.id
    : null;

return { status: "confirmation_required", userId };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/modules/auth/services/signup.service.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/services/signup.service.ts src/modules/auth/services/signup.service.test.ts
git commit -m "$(cat <<'EOF'
feat: expose the signup user id for legal acceptance

EOF
)"
```

---

### Task 4: Require and record acceptance during registration

**Files:**
- Create: `src/modules/legal/record-signup-legal-acceptance.ts`
- Create: `src/modules/legal/record-signup-legal-acceptance.test.ts`
- Modify: `src/modules/auth/actions/register.action.ts`
- Modify: `src/modules/auth/actions/register.action.test.ts`
- Modify: `src/components/register/register-form.tsx`
- Modify: `src/components/register/register-form.test.tsx`

**Interfaces:**
- Consumes: `LEGAL_COPY_VERSION`, `createAdminClient`, `record_signup_legal_acceptance_v1`, and `SignupServiceResult.userId`
- Produces: `recordSignupLegalAcceptance(userId: string): Promise<"recorded" | "failed">`. `RegisterActionState` gains error `"legal_acceptance_required"`.

- [ ] **Step 1: Write the failing recorder and action tests**

Recorder test, with `createAdminClient` mocked:

```ts
it("sends the signup user and the current version", async () => {
  rpc.mockResolvedValue({ data: { status: "recorded" }, error: null });

  await expect(recordSignupLegalAcceptance("user-1")).resolves.toBe(
    "recorded",
  );
  expect(rpc).toHaveBeenCalledWith("record_signup_legal_acceptance_v1", {
    p_user_id: "user-1",
    p_copy_version: "terms-privacy-v1",
  });
});

it("reports failure without throwing", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });

  await expect(recordSignupLegalAcceptance("user-1")).resolves.toBe("failed");
});
```

In `register.action.test.ts`, set `acceptedLegalTerms` to `on` inside `registerFormData`. Add:

```ts
it("rejects a missing legal acceptance before signup", async () => {
  vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
  vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
  const formData = registerFormData();
  formData.delete("acceptedLegalTerms");

  const result = await register(null, formData);

  expect(signup).not.toHaveBeenCalled();
  expect(result).toEqual({
    status: "error",
    error: "legal_acceptance_required",
  });
});

it("records acceptance when signup returns a user id and still confirms email", async () => {
  vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
  vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
  signup.mockResolvedValue({
    status: "confirmation_required",
    userId: "user-1",
  });

  const result = await register(null, registerFormData());

  expect(recordSignupLegalAcceptance).toHaveBeenCalledWith("user-1");
  expect(result).toEqual({
    status: "success",
    outcome: "confirmation_required",
  });
});

it("keeps the confirmation when acceptance recording fails", async () => {
  vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
  vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
  signup.mockResolvedValue({
    status: "confirmation_required",
    userId: "user-1",
  });
  recordSignupLegalAcceptance.mockResolvedValue("failed");

  await expect(register(null, registerFormData())).resolves.toEqual({
    status: "success",
    outcome: "confirmation_required",
  });
});
```

Mock `@/modules/legal/record-signup-legal-acceptance` in the action test. Update the immediate-auth mock to `{ status: "authenticated", userId: "user-1" }`. Add this case too:

```ts
it("does not record acceptance when confirmation has no user id", async () => {
  vi.stubEnv("AUTH_SIGNUP_ENABLED", "true");
  vi.stubEnv("AUTH_CAPTCHA_ENABLED", "false");
  signup.mockResolvedValue({
    status: "confirmation_required",
    userId: null,
  });

  const result = await register(null, registerFormData());

  expect(recordSignupLegalAcceptance).not.toHaveBeenCalled();
  expect(result).toEqual({
    status: "success",
    outcome: "confirmation_required",
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/modules/legal/record-signup-legal-acceptance.test.ts src/modules/auth/actions/register.action.test.ts`

Expected: FAIL because the recorder and the new error do not exist.

- [ ] **Step 3: Implement the recorder and the action check**

`recordSignupLegalAcceptance` calls `createAdminClient().rpc(...)`. Any thrown error or RPC error returns `"failed"`. A null error returns `"recorded"`.

In `register`, after the schema succeeds and before `signup`, require `formData.get("acceptedLegalTerms") === "on"`. Otherwise return `{ status: "error", error: "legal_acceptance_required" }`. After a non-error signup, call the recorder only when `result.userId` is a non-empty string. Ignore `"failed"`. Then keep the current confirmation return or `/auth/continue` redirect.

In `register-form.tsx`, add the unchecked checkbox and the error message `Aceite os Termos de Uso e a Política de Privacidade para criar a conta.` The control is a native checkbox so the server action receives it:

```tsx
<label className="flex items-start gap-3 text-sm leading-6">
  <input
    type="checkbox"
    name="acceptedLegalTerms"
    value="on"
    className="mt-1 size-4"
  />
  <span>
    Li e aceito os <a href="/terms">Termos de Uso</a> e a{" "}
    <a href="/privacy">Política de Privacidade</a>.
  </span>
</label>
```

Add a form test that the checkbox is unchecked and both links have those hrefs.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/modules/legal/record-signup-legal-acceptance.test.ts src/modules/auth/actions/register.action.test.ts src/components/register/register-form.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/legal/record-signup-legal-acceptance.ts src/modules/legal/record-signup-legal-acceptance.test.ts src/modules/auth/actions/register.action.ts src/modules/auth/actions/register.action.test.ts src/components/register/register-form.tsx src/components/register/register-form.test.tsx
git commit -m "$(cat <<'EOF'
feat: require legal acceptance before signup

EOF
)"
```

---

### Task 5: Client access helper

**Files:**
- Modify: `src/modules/auth/services/require-user.ts`
- Create: `src/modules/auth/services/require-client-access.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `current_user_is_admin`, `current_user_has_accepted_legal_copy_v1`, `LEGAL_COPY_VERSION`
- Produces: `class LegalAcceptanceRequiredError extends Error`; `requireClientAccess(): Promise<{ userId: string; supabase: SupabaseClient<Database>; isAdmin: boolean }>`

- [ ] **Step 1: Write the failing test**

Create `src/modules/auth/services/require-client-access.test.ts`, mocking `createClient` the same way `require-user.test.ts` does. Use this RPC mock and these assertions:

```ts
rpc.mockImplementation(async (name: string) => {
  if (name === "current_account_is_eligible") return { data: true, error: null };
  if (name === "current_user_is_admin") return { data: false, error: null };
  if (name === "current_user_has_accepted_legal_copy_v1") {
    return { data: true, error: null };
  }
  throw new Error(`unexpected rpc ${name}`);
});

it("lets an administrator through without a legal lookup", async () => {
  rpc.mockImplementation(async (name: string) => ({
    data: name !== "current_user_has_accepted_legal_copy_v1",
    error: null,
  }));

  await expect(requireClientAccess()).resolves.toMatchObject({
    isAdmin: true,
    userId: "user-123",
  });
  expect(rpc.mock.calls.map(([name]) => name)).toEqual([
    "current_account_is_eligible",
    "current_user_is_admin",
  ]);
});

it("allows a client who accepted the current version", async () => {
  await expect(requireClientAccess()).resolves.toMatchObject({
    isAdmin: false,
  });
  expect(rpc).toHaveBeenCalledWith(
    "current_user_has_accepted_legal_copy_v1",
    { p_copy_version: "terms-privacy-v1" },
  );
});

it("rejects a client who has not accepted", async () => {
  rpc.mockImplementation(async (name: string) => {
    if (name === "current_account_is_eligible") {
      return { data: true, error: null };
    }
    if (name === "current_user_is_admin") return { data: false, error: null };
    return { data: false, error: null };
  });

  await expect(requireClientAccess()).rejects.toBeInstanceOf(
    LegalAcceptanceRequiredError,
  );
});

it("rejects when the legal lookup fails", async () => {
  rpc.mockImplementation(async (name: string) =>
    name === "current_user_has_accepted_legal_copy_v1"
      ? { data: null, error: { message: "unavailable" } }
      : { data: name === "current_account_is_eligible", error: null },
  );

  await expect(requireClientAccess()).rejects.toBeInstanceOf(
    LegalAcceptanceRequiredError,
  );
});

it("keeps an ineligible account unavailable", async () => {
  rpc.mockResolvedValue({ data: false, error: null });

  await expect(requireClientAccess()).rejects.toBeInstanceOf(
    AccountUnavailableError,
  );
  expect(rpc).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/modules/auth/services/require-client-access.test.ts`

Expected: FAIL because `requireClientAccess` is not exported.

- [ ] **Step 3: Add the helper beside requireUser**

Call `requireUser` first. Then call `current_user_is_admin`. `data === true` returns immediately with `isAdmin: true`. Any other result, including a thrown RPC, continues as a client. For a client, call `current_user_has_accepted_legal_copy_v1` with `{ p_copy_version: LEGAL_COPY_VERSION }`. Return only when `data === true` and `error` is null. Otherwise throw `new LegalAcceptanceRequiredError()`. Keep this call outside the eligibility `try/catch` inside `requireUser`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/modules/auth/services/require-user.test.ts src/modules/auth/services/require-client-access.test.ts`

Expected: PASS, including the existing `requireUser` tests.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/services/require-user.ts src/modules/auth/services/require-client-access.test.ts
git commit -m "$(cat <<'EOF'
feat: block client access until legal terms are accepted

EOF
)"
```

---

### Task 6: Send unsigned clients to the gate

**Files:**
- Modify: `src/modules/auth/services/resolve-authenticated-home.ts`
- Modify: `src/modules/auth/services/resolve-authenticated-home.test.ts`

**Interfaces:**
- Consumes: `LEGAL_COPY_VERSION` and `current_user_has_accepted_legal_copy_v1`
- Produces: `AuthenticatedHome` includes `"/accept-terms"`. Order is login, account unavailable, admin, accept-terms, onboarding failure, onboarding, dashboard.

- [ ] **Step 1: Update the failing resolver tests**

Change the default RPC mock so `current_user_has_accepted_legal_copy_v1` returns `true`. The complete-user call list becomes:

```ts
[
  "current_account_is_eligible",
  "current_user_is_admin",
  "current_user_has_accepted_legal_copy_v1",
  "current_user_has_completed_onboarding",
]
```

Add:

```ts
it("sends a client without the current acceptance to /accept-terms", async () => {
  rpc.mockImplementation(async (name: string) => ({
    data: name === "current_account_is_eligible",
    error: null,
  }));

  await expect(resolveAuthenticatedHome()).resolves.toBe("/accept-terms");
});

it("sends a failed acceptance lookup to /accept-terms", async () => {
  rpc.mockImplementation(async (name: string) => {
    if (name === "current_user_has_accepted_legal_copy_v1") {
      return { data: null, error: { message: "unavailable" } };
    }
    return {
      data: name === "current_account_is_eligible",
      error: null,
    };
  });

  await expect(resolveAuthenticatedHome()).resolves.toBe("/accept-terms");
});
```

The admin test still expects only eligibility and `current_user_is_admin`. The thrown role-RPC test must expect `/accept-terms` when the same mock then throws the legal RPC. Onboarding failure still expects `/account-unavailable`, with the legal RPC returning `true` first.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/modules/auth/services/resolve-authenticated-home.test.ts`

Expected: FAIL because `/accept-terms` is not returned.

- [ ] **Step 3: Insert the gate after the admin branch**

After a confirmed admin, return `/admin` without calling the legal RPC. For everyone else, call the legal RPC. `error`, a thrown call, or `data !== true` returns `/accept-terms`. Only `data === true` continues to the existing onboarding branch.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/modules/auth/services/resolve-authenticated-home.test.ts src/app/auth/continue/route.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/services/resolve-authenticated-home.ts src/modules/auth/services/resolve-authenticated-home.test.ts
git commit -m "$(cat <<'EOF'
feat: route clients without legal acceptance to the gate

EOF
)"
```

---

### Task 7: Close direct client routes

**Files:**
- Modify: `src/app/(private)/layout.tsx`
- Modify: `src/app/(private)/layout.test.tsx`
- Modify: `src/app/(onboarding)/onboarding/layout.tsx`
- Modify: `src/app/(onboarding)/onboarding/layout.test.tsx`

**Interfaces:**
- Consumes: `requireClientAccess`, `LegalAcceptanceRequiredError`, `AuthRequiredError`, `AccountUnavailableError`
- Produces: private and onboarding layouts redirect a missing acceptance to `/accept-terms`. Admin private layout still renders the shell.

- [ ] **Step 1: Write the failing layout tests**

Private layout currently mocks `requireUser`. Change that mock to `requireClientAccess`, returning `{ userId, supabase, isAdmin }`. Add:

```ts
it("redirects a client who has not accepted the current terms", async () => {
  requireClientAccess.mockRejectedValue(new LegalAcceptanceRequiredError());

  await expect(PrivateLayout({ children: null })).rejects.toThrow(
    "redirect:/accept-terms",
  );
});
```

Keep the completed-onboarding render test by resolving `isAdmin: false` and a supabase whose `current_user_has_completed_onboarding` RPC returns `true`. The admin shell test resolves `isAdmin: true` and does not require the onboarding RPC.

Add the same redirect test to `onboarding/layout.test.tsx`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/app/(private)/layout.test.tsx src/app/(onboarding)/onboarding/layout.test.tsx`

Expected: FAIL because the layouts still call `requireUser` and do not redirect to `/accept-terms`.

- [ ] **Step 3: Use the helper in both layouts**

Replace `requireUser()` with `requireClientAccess()`. Map `LegalAcceptanceRequiredError` to `redirect("/accept-terms")`. Keep login and account-unavailable mappings. In the private layout, use the returned `isAdmin` instead of a second `current_user_is_admin` call. The onboarding check remains only for `isAdmin === false`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/app/(private)/layout.test.tsx src/app/(onboarding)/onboarding/layout.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(private)/layout.tsx src/app/(private)/layout.test.tsx src/app/(onboarding)/onboarding/layout.tsx src/app/(onboarding)/onboarding/layout.test.tsx
git commit -m "$(cat <<'EOF'
feat: keep unsigned clients out of private routes

EOF
)"
```

---

### Task 8: Acceptance screen

**Files:**
- Create: `src/modules/legal/accept-legal-terms.action.ts`
- Create: `src/modules/legal/accept-legal-terms.action.test.ts`
- Create: `src/modules/legal/components/accept-terms-screen.tsx`
- Create: `src/modules/legal/components/accept-terms-screen.test.tsx`
- Create: `src/app/accept-terms/page.tsx`
- Create: `src/app/accept-terms/page.test.tsx`

**Interfaces:**
- Consumes: `requireUser`, `accept_current_legal_terms_v1`, `current_user_has_accepted_legal_copy_v1`, `LEGAL_COPY_VERSION`, existing `logout`
- Produces: `acceptLegalTerms(): Promise<{ status: "error" }>`; page redirects listed in the spec

- [ ] **Step 1: Write the failing page and action tests**

Action test: success calls the RPC with `terms-privacy-v1` and redirects to `/auth/continue`. RPC error resolves `{ status: "error" }` and does not redirect.

Page tests, mocking `requireUser` and `redirect`:

- `AuthRequiredError` throws `redirect:/login`;
- admin RPC `true` throws `redirect:/admin`;
- legal RPC `true` throws `redirect:/auth/continue`;
- legal RPC `false` shows links `/terms` and `/privacy`, a button `Aceitar`, and a button `Sair da conta`;
- legal RPC error shows `Não foi possível verificar agora.`, a button `Tentar de novo`, and `Sair da conta`, and does not show `Aceitar`.

The screen test renders the form state `{ status: "error" }` and expects `Não foi possível registrar o aceite. Tente novamente.`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/modules/legal/accept-legal-terms.action.test.ts src/app/accept-terms/page.test.tsx src/modules/legal/components/accept-terms-screen.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the page outside every authenticated layout**

`src/app/accept-terms/page.tsx` is a sibling of the route groups, not inside `(private)`, `(onboarding)`, or `(admin-panel)`. It uses `requireUser` only. Admin goes to `/admin`. Accepted clients go to `/auth/continue`. A lookup error renders the unavailable screen. Otherwise it renders the form whose action is `acceptLegalTerms`.

`acceptLegalTerms` calls `requireUser()`, then `supabase.rpc("accept_current_legal_terms_v1", { p_copy_version: LEGAL_COPY_VERSION })`. Error or throw returns `{ status: "error" }`. Success calls `redirect("/auth/continue")`.

`Tentar de novo` is a link to `/accept-terms`. `Sair da conta` submits the existing `logout` action. The acceptance button posts the server action. There is no app shell and no link into the product.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/modules/legal/accept-legal-terms.action.test.ts src/app/accept-terms/page.test.tsx src/modules/legal/components/accept-terms-screen.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/legal/accept-legal-terms.action.ts src/modules/legal/accept-legal-terms.action.test.ts src/modules/legal/components/accept-terms-screen.tsx src/modules/legal/components/accept-terms-screen.test.tsx src/app/accept-terms/page.tsx src/app/accept-terms/page.test.tsx
git commit -m "$(cat <<'EOF'
feat: add the legal acceptance gate

EOF
)"
```

---

### Task 9: Enforce acceptance on client mutations

**Files:**
- Modify these callers from `requireUser()` to `requireClientAccess()`:
  - `src/app/api/billing/checkout/route.ts`
  - `src/app/api/billing/refund/route.ts`
  - `src/app/api/billing/cancel/route.ts`
  - `src/app/api/dashboard/filters/route.ts`
  - `src/app/api/reports/[id]/ai/messages/route.ts`
  - `src/app/api/reports/[id]/ai/conversations/route.ts`
  - `src/modules/onboarding/actions/save-onboarding-profile.action.ts`
  - `src/modules/quick-diagnosis/actions/create-product-diagnosis.action.ts`
  - `src/modules/quick-diagnosis/actions/create-production-diagnosis.action.ts`
  - `src/modules/quick-diagnosis/actions/create-service-diagnosis.action.ts`
  - `src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.ts`
  - `src/modules/reports/actions/delete-report.action.ts`
  - `src/modules/reports/actions/save-report-edit.action.ts`
- Modify the matching `*.test.ts` files so their `require-user` mock also exports `requireClientAccess` as the same mocked function.

**Interfaces:**
- Consumes: `requireClientAccess` and `LegalAcceptanceRequiredError`
- Produces: HTTP `403` `{ error: "legal_acceptance_required" }` on the six API routes. Server actions map the same error to the unauthorized or generic error they already return for `AuthRequiredError`, so their result unions do not grow.

- [ ] **Step 1: Write the failing API test**

In `src/app/api/billing/checkout/route.test.ts`, add `requireClientAccess` to the hoisted mock and to the `vi.mock` factory. Point `beforeEach` and the existing 401 test at `requireClientAccess` instead of `requireUser`. Add:

```ts
it("blocks checkout before legal acceptance", async () => {
  requireClientAccess.mockRejectedValue(new LegalAcceptanceRequiredError());

  const { response, json } = await post();

  expect(response.status).toBe(403);
  expect(json).toEqual({ error: "legal_acceptance_required" });
  expect(createHostedCheckout).not.toHaveBeenCalled();
});
```

`post` is the helper already in that file. Repeat the same status and body assertion, using each file's existing request helper, in the refund, cancel, dashboard filter, and both report AI route tests. Update those files' `beforeEach` setups to resolve `requireClientAccess` where they previously resolved `requireUser`.

- [ ] **Step 2: Run one test to verify it fails**

Run: `pnpm exec vitest run src/app/api/billing/checkout/route.test.ts`

Expected: FAIL because the route still calls `requireUser` and has no `403` branch.

- [ ] **Step 3: Switch the callers**

Each API catch becomes:

```ts
if (error instanceof AuthRequiredError) {
  return json({ error: "unauthorized" }, 401);
}
if (error instanceof LegalAcceptanceRequiredError) {
  return json({ error: "legal_acceptance_required" }, 403);
}
return json({ error: "service_unavailable" }, 503);
```

Each server action catch that already returns `unauthorized` for `AuthRequiredError` returns that same result for `LegalAcceptanceRequiredError`. Catches that already return `{ status: "error" }` for every auth failure keep that result, after the call has changed to `requireClientAccess()`.

Do not change admin routes, `requireAdmin`, page components inside the private layout, or `get-onboarding.service.ts`. The layouts from Task 7 already cover those page renders.

In every listed test, add `requireClientAccess` to the mock. Where the mock replaces the whole module, include `LegalAcceptanceRequiredError` as a real class or the original export. Where the mock uses `importOriginal`, spread the original module and override `requireClientAccess` with the same `vi.fn` that used to be `requireUser`.

- [ ] **Step 4: Run the affected tests**

Run:

```bash
pnpm exec vitest run \
  src/app/api/billing/checkout/route.test.ts \
  src/app/api/billing/refund/route.test.ts \
  src/app/api/billing/cancel/route.test.ts \
  src/app/api/dashboard/filters/route.test.ts \
  src/app/api/reports/[id]/ai/messages/route.test.ts \
  src/app/api/reports/[id]/ai/conversations/route.test.ts \
  src/modules/onboarding/actions/save-onboarding-profile.action.test.ts \
  src/modules/quick-diagnosis/actions/create-product-diagnosis.action.test.ts \
  src/modules/quick-diagnosis/actions/create-production-diagnosis.action.test.ts \
  src/modules/quick-diagnosis/actions/create-service-diagnosis.action.test.ts \
  src/modules/detailed-diagnosis/actions/create-detailed-diagnosis.action.test.ts \
  src/modules/reports/actions/delete-report.action.test.ts \
  src/modules/reports/actions/save-report-edit.action.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/billing src/app/api/dashboard/filters src/app/api/reports src/modules/onboarding/actions src/modules/quick-diagnosis/actions src/modules/detailed-diagnosis/actions src/modules/reports/actions
git commit -m "$(cat <<'EOF'
feat: reject client mutations before legal acceptance

EOF
)"
```

---

### Task 10: Public pages and reread links

**Files:**
- Create: `src/modules/legal/legal-supplier.ts`
- Create: `src/modules/legal/legal-supplier.test.ts`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.test.tsx`
- Create: `src/app/privacy/page.test.tsx`
- Modify: `src/components/landing/landing-footer.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/(private)/account/page.tsx`
- Modify: `src/app/(private)/account/page.test.tsx`

**Interfaces:**
- Consumes: `legalTermsSections`, `legalPrivacySections`, `LegalSupplier`, `LEGAL_COPY_VERSION`
- Produces: `LEGAL_SUPPLIER` used only by the two public pages. Footer and account links point at `/terms` and `/privacy`.

- [ ] **Step 1: Ask for the supplier identity, then write the failing supplier test**

Stop and ask the operator for the full name, CPF, and address if this session does not already contain them. Do not continue this task with invented values.

Then write `legal-supplier.test.ts` against the real module:

```ts
import { describe, expect, it } from "vitest";

import { LEGAL_SUPPLIER } from "./legal-supplier";

describe("legal supplier", () => {
  it("uses the operator identity and the support email", () => {
    expect(LEGAL_SUPPLIER.fullName).toBe("<operator full name>");
    expect(LEGAL_SUPPLIER.cpf).toBe("<operator cpf formatted 000.000.000-00>");
    expect(LEGAL_SUPPLIER.address).toBe("<operator address>");
    expect(LEGAL_SUPPLIER.email).toBe("atendimento@lucrivo.com.br");
  });
});
```

Replace the three angle-bracket strings with the exact values the operator provided before running the test.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/modules/legal/legal-supplier.test.ts`

Expected: FAIL because `legal-supplier.ts` does not exist.

- [ ] **Step 3: Write the supplier module and the pages**

`legal-supplier.ts` exports `LEGAL_SUPPLIER` satisfying `LegalSupplier`, with the operator's values and `email: "atendimento@lucrivo.com.br"`.

Both pages are public server components. Each renders an `h1`, then the sections from Task 1, and a footer line `Versão terms-privacy-v1`. `/terms` uses `legalTermsSections(LEGAL_SUPPLIER)` and the title `Termos de uso`. `/privacy` uses `legalPrivacySections(LEGAL_SUPPLIER)` and the title `Política de privacidade`. Each page links to the other.

Page tests render the headings and expect the operator name, the version, and the sibling link.

In `landing-footer.tsx`, add a third column or two links in the existing footer nav:

```tsx
{ href: "/terms", label: "Termos de uso" },
{ href: "/privacy", label: "Política de privacidade" },
```

Extend the footer assertion in `src/app/page.test.tsx` with those two pairs.

On the account page, below the email section, add:

```tsx
<nav aria-label="Documentos legais">
  <a href="/terms">Termos de uso</a>
  <a href="/privacy">Política de privacidade</a>
</nav>
```

Extend `account/page.test.tsx` to expect both links. Do not add a checkbox there.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/modules/legal/legal-supplier.test.ts src/app/terms/page.test.tsx src/app/privacy/page.test.tsx src/app/page.test.tsx src/app/(private)/account/page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/legal/legal-supplier.ts src/modules/legal/legal-supplier.test.ts src/app/terms src/app/privacy src/components/landing/landing-footer.tsx src/app/page.test.tsx src/app/(private)/account/page.tsx src/app/(private)/account/page.test.tsx
git commit -m "$(cat <<'EOF'
feat: publish terms, privacy, and reread links

EOF
)"
```

---

### Task 11: Full check

**Files:**
- No new production files.

**Interfaces:**
- Consumes: the previous tasks.
- Produces: a green targeted database test and the project check.

- [ ] **Step 1: Run the legal database test and the project check**

Run:

```bash
pnpm exec supabase test db supabase/tests/legal_acceptance.test.sql
pnpm check
```

Expected: pgTAP PASS, then Vitest, typecheck, lint, and format check PASS.

- [ ] **Step 2: Fix only failures caused by this plan**

If format check fails, run `pnpm format` on the files this plan touched and commit:

```bash
git add src/modules/legal src/modules/auth src/app src/components/landing/landing-footer.tsx src/components/register supabase
git commit -m "$(cat <<'EOF'
style: format legal acceptance changes

EOF
)"
```

If `pnpm check` fails for a behavior this plan introduced, fix that behavior and add the missing assertion before committing. Do not expand into erasure, cookies, or admin acceptance.

- [ ] **Step 3: Stop**

Do not start the personal-data erasure project from this plan.
