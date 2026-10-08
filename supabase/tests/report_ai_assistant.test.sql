begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'public',
  'report_ai_conversations',
  'report AI conversations table exists'
);
select has_table(
  'public',
  'report_ai_turns',
  'report AI turns table exists'
);

select col_is_pk(
  'public',
  'report_ai_conversations',
  'id',
  'conversation id is the primary key'
);
select col_is_pk(
  'public',
  'report_ai_turns',
  'id',
  'turn id is the primary key'
);
select col_type_is(
  'public',
  'report_ai_conversations',
  'id',
  'bigint',
  'conversation ids are bigint identities'
);
select col_type_is(
  'public',
  'report_ai_turns',
  'request_id',
  'uuid',
  'request ids are UUIDs'
);

select fk_ok(
  'public',
  'report_ai_conversations',
  'user_id',
  'auth',
  'users',
  'id',
  'conversations reference Auth users'
);
select fk_ok(
  'public',
  'report_ai_conversations',
  'diagnosis_id',
  'public',
  'diagnoses',
  'id',
  'conversations reference reports'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.report_ai_conversations'::regclass
      and conname = 'report_ai_conversations_user_report_version_key'
      and contype = 'u'
  ),
  'one conversation exists per owner, report, and version'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.report_ai_conversations'::regclass
      and conname = 'report_ai_conversations_id_user_key'
      and contype = 'u'
  ),
  'conversation id and owner form a unique composite key'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.report_ai_turns'::regclass
      and conname = 'report_ai_turns_user_request_key'
      and contype = 'u'
  ),
  'request ids are idempotent per owner'
);
select ok(
  (
    select confkey = array[
      (
        select attnum
        from pg_attribute
        where attrelid = 'public.report_ai_conversations'::regclass
          and attname = 'id'
      ),
      (
        select attnum
        from pg_attribute
        where attrelid = 'public.report_ai_conversations'::regclass
          and attname = 'user_id'
      )
    ]::smallint[]
      and confdeltype = 'c'
    from pg_constraint
    where conrelid = 'public.report_ai_turns'::regclass
      and conname = 'report_ai_turns_conversation_user_fkey'
  ),
  'turns reference the conversation and owner with cascade deletion'
);

select ok(
  (
    select bool_and(confdeltype = 'c')
    from pg_constraint
    where conrelid = 'public.report_ai_conversations'::regclass
      and conname in (
        'report_ai_conversations_user_id_fkey',
        'report_ai_conversations_diagnosis_id_fkey'
      )
  ),
  'user and report deletion cascade through conversations'
);
select ok(
  (
    select count(*) = 5
    from pg_constraint
    where conrelid = 'public.report_ai_turns'::regclass
      and contype = 'c'
      and conname in (
        'report_ai_turns_question_check',
        'report_ai_turns_status_check',
        'report_ai_turns_model_check',
        'report_ai_turns_token_check',
        'report_ai_turns_shape_check'
      )
  ),
  'turn content, status, model, tokens, and shape are constrained'
);

select has_index(
  'public',
  'report_ai_conversations',
  'report_ai_conversations_user_report_version_key',
  'conversation identity is indexed'
);
select has_index(
  'public',
  'report_ai_conversations',
  'report_ai_conversations_user_report_versions_idx',
  'conversation version history is indexed'
);
select has_index(
  'public',
  'report_ai_conversations',
  'report_ai_conversations_diagnosis_idx',
  'conversation report foreign keys are indexed'
);
select has_index(
  'public',
  'report_ai_turns',
  'report_ai_turns_conversation_created_idx',
  'conversation turns are indexed chronologically'
);
select has_index(
  'public',
  'report_ai_turns',
  'report_ai_turns_user_quota_idx',
  'counted usage is indexed per user'
);

select results_eq(
  $$
    select relname, relrowsecurity
    from pg_class
    where oid in (
      'public.report_ai_conversations'::regclass,
      'public.report_ai_turns'::regclass
    )
    order by relname
  $$,
  $$ values
    ('report_ai_conversations'::name, true),
    ('report_ai_turns'::name, true)
  $$,
  'RLS is enabled on both report AI tables'
);
select ok(
  (
    select array_agg(policyname::text order by policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('report_ai_conversations', 'report_ai_turns')
  ) = array[
    'report_ai_conversations_select_own',
    'report_ai_turns_select_own'
  ]::text[],
  'only ownership read policies are exposed'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.report_ai_conversations',
    'insert'
  ),
  'authenticated cannot insert conversations directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.report_ai_turns',
    'insert'
  ),
  'authenticated cannot insert turns directly'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.report_ai_conversations',
    'select'
  ),
  'authenticated may read conversations filtered by RLS'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.report_ai_turns',
    'select'
  ),
  'authenticated may read turns filtered by RLS'
);
select ok(
  not has_sequence_privilege(
    'authenticated',
    'public.report_ai_conversations_id_seq',
    'usage'
  )
  and not has_sequence_privilege(
    'authenticated',
    'public.report_ai_turns_id_seq',
    'usage'
  ),
  'authenticated cannot allocate report AI identities directly'
);

insert into auth.users (id, aud, role, email)
values
  (
    '97000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'report-ai-owner@example.com'
  ),
  (
    '97000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'report-ai-other@example.com'
  );

insert into public.diagnoses (
  id,
  submission_id,
  user_id,
  business_category,
  scenario,
  schema_version,
  calculation_version,
  content_version,
  current_price_cents,
  verdict,
  priority,
  unit,
  report_snapshot,
  is_free_report,
  version
) overriding system value values
  (
    97001,
    '97000000-0000-4000-8000-000000000101',
    '97000000-0000-4000-8000-000000000001',
    'product',
    'resale',
    3,
    3,
    5,
    10000,
    'adequate_margin',
    'margin',
    'unit',
    '{"report":97001}',
    true,
    3
  ),
  (
    97002,
    '97000000-0000-4000-8000-000000000102',
    '97000000-0000-4000-8000-000000000002',
    'product',
    'resale',
    3,
    3,
    5,
    10000,
    'adequate_margin',
    'margin',
    'unit',
    '{"report":97002}',
    true,
    1
  );

insert into public.report_ai_conversations (
  user_id,
  diagnosis_id,
  report_version
) values
  ('97000000-0000-4000-8000-000000000001', 97001, 3),
  ('97000000-0000-4000-8000-000000000002', 97002, 1);

insert into public.report_ai_turns (
  conversation_id,
  user_id,
  request_id,
  question,
  answer,
  status,
  model,
  completed_at
)
select
  conversation.id,
  conversation.user_id,
  case conversation.user_id
    when '97000000-0000-4000-8000-000000000001'::uuid
      then '97000000-0000-4000-8000-000000000201'::uuid
    else '97000000-0000-4000-8000-000000000202'::uuid
  end,
  'Explique a margem.',
  'A margem está descrita no relatório.',
  'completed',
  'gpt-6-luna',
  statement_timestamp()
from public.report_ai_conversations as conversation;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  (select count(*) from public.report_ai_conversations),
  1::bigint,
  'an authenticated user sees only their conversation'
);
select is(
  (select count(*) from public.report_ai_turns),
  1::bigint,
  'an authenticated user sees only their turns'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is(
  (select count(*) from public.report_ai_conversations),
  1::bigint,
  'a second authenticated user sees only their conversation'
);
select is(
  (select count(*) from public.report_ai_turns),
  1::bigint,
  'a second authenticated user sees only their turns'
);
reset role;

delete from public.diagnoses where id = 97001;

select is(
  (
    select count(*)
    from public.report_ai_conversations
    where diagnosis_id = 97001
  ),
  0::bigint,
  'deleting a report cascades to its conversation'
);
select is(
  (
    select count(*)
    from public.report_ai_turns
    where user_id = '97000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'deleting a report cascades to its turns'
);

select function_returns(
  'public',
  'reserve_report_ai_turn_v1',
  array['bigint', 'integer', 'uuid', 'text', 'text'],
  'jsonb',
  'reservation returns a stable JSON result'
);
select function_returns(
  'public',
  'complete_report_ai_turn_v1',
  array['bigint', 'text', 'integer', 'integer', 'integer'],
  'text',
  'completion returns a stable text result'
);
select function_returns(
  'public',
  'fail_report_ai_turn_v1',
  array['bigint', 'text', 'boolean'],
  'text',
  'failure returns a stable text result'
);
select function_returns(
  'public',
  'update_report_ai_summary_v1',
  array['bigint', 'text', 'bigint'],
  'text',
  'summary updates return a stable text result'
);

select ok(
  (
    select count(*) = 4
      and bool_and(
        prosecdef
        and proconfig = array['search_path=""']::text[]
      )
    from pg_proc
    where oid in (
      'public.reserve_report_ai_turn_v1(bigint,integer,uuid,text,text)'::regprocedure,
      'public.complete_report_ai_turn_v1(bigint,text,integer,integer,integer)'::regprocedure,
      'public.fail_report_ai_turn_v1(bigint,text,boolean)'::regprocedure,
      'public.update_report_ai_summary_v1(bigint,text,bigint)'::regprocedure
    )
  ),
  'report AI mutations are security definer functions with empty search paths'
);
select ok(
  (
    select bool_and(
      has_function_privilege(
        'authenticated',
        pg_proc.oid,
        'execute'
      )
      and not has_function_privilege('anon', pg_proc.oid, 'execute')
      and not has_function_privilege('service_role', pg_proc.oid, 'execute')
    )
    from pg_proc
    where oid in (
      'public.reserve_report_ai_turn_v1(bigint,integer,uuid,text,text)'::regprocedure,
      'public.complete_report_ai_turn_v1(bigint,text,integer,integer,integer)'::regprocedure,
      'public.fail_report_ai_turn_v1(bigint,text,boolean)'::regprocedure,
      'public.update_report_ai_summary_v1(bigint,text,bigint)'::regprocedure
    )
  ),
  'only authenticated callers may execute report AI mutations'
);

select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$
    select public.reserve_report_ai_turn_v1(
      42,
      3,
      '10000000-0000-4000-8000-000000000001',
      'Pergunta',
      'gpt-6-luna'
    )
  $$,
  '42501',
  'authentication required',
  'reservation requires authentication'
);

insert into auth.users (id, aud, role, email)
values
  (
    '97100000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'report-ai-paid@example.com'
  ),
  (
    '97100000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'report-ai-free@example.com'
  ),
  (
    '97100000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'report-ai-courtesy@example.com'
  ),
  (
    '97100000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'report-ai-foreign@example.com'
  );

insert into public.billing_prices (
  id,
  product_code,
  billing_mode,
  version,
  amount_cents,
  currency,
  access_months
) values (
  '97110000-0000-4000-8000-000000000001',
  'report-ai-test',
  'monthly',
  1,
  3990,
  'BRL',
  1
);

insert into public.billing_contracts (
  id,
  user_id,
  price_id,
  external_reference,
  billing_mode,
  payment_method,
  charge_type,
  amount_cents,
  currency,
  access_months,
  status,
  access_starts_at,
  access_ends_at
) values (
  '97120000-0000-4000-8000-000000000001',
  '97100000-0000-4000-8000-000000000001',
  '97110000-0000-4000-8000-000000000001',
  'report-ai-paid-contract',
  'monthly',
  'credit_card',
  'recurring',
  3990,
  'BRL',
  1,
  'active',
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '1 month'
);

insert into private.admin_user_state (user_id, courtesy_expires_at)
values (
  '97100000-0000-4000-8000-000000000003',
  statement_timestamp() + interval '1 month'
);

insert into public.diagnoses (
  id,
  submission_id,
  user_id,
  business_category,
  scenario,
  schema_version,
  calculation_version,
  content_version,
  current_price_cents,
  verdict,
  priority,
  unit,
  report_snapshot,
  is_free_report,
  version
) overriding system value values
  (
    97101,
    '97100000-0000-4000-8000-000000000101',
    '97100000-0000-4000-8000-000000000001',
    'product', 'resale', 3, 3, 5, 10000,
    'adequate_margin', 'margin', 'unit', '{"report":97101}', false, 3
  ),
  (
    97102,
    '97100000-0000-4000-8000-000000000102',
    '97100000-0000-4000-8000-000000000002',
    'product', 'resale', 3, 3, 5, 10000,
    'adequate_margin', 'margin', 'unit', '{"report":97102}', true, 1
  ),
  (
    97103,
    '97100000-0000-4000-8000-000000000103',
    '97100000-0000-4000-8000-000000000003',
    'product', 'resale', 3, 3, 5, 10000,
    'adequate_margin', 'margin', 'unit', '{"report":97103}', true, 1
  ),
  (
    97104,
    '97100000-0000-4000-8000-000000000104',
    '97100000-0000-4000-8000-000000000004',
    'product', 'resale', 3, 3, 5, 10000,
    'adequate_margin', 'margin', 'unit', '{"report":97104}', true, 1
  );

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97102,
    1,
    '97100000-0000-4000-8000-000000000201',
    'Pergunta gratuita',
    'gpt-6-luna'
  ) ->> 'status',
  'plan_required',
  'free users cannot reserve turns'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97103,
    1,
    '97100000-0000-4000-8000-000000000202',
    'Pergunta de cortesia',
    'gpt-6-luna'
  ) ->> 'status',
  'plan_required',
  'courtesy access does not unlock report AI'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000203',
    'Pergunta estrangeira',
    'gpt-6-luna'
  ) ->> 'status',
  'not_found',
  'foreign reports are indistinguishable from missing reports'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    2,
    '97100000-0000-4000-8000-000000000204',
    'Pergunta em versão antiga',
    'gpt-6-luna'
  ),
  jsonb_build_object('status', 'version_conflict', 'currentVersion', 3),
  'stale report versions are rejected with the current version'
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000205',
    'Primeira pergunta',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'a paid owner reserves a turn'
);
select is(
  public.complete_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000205'
    ),
    'Primeira resposta',
    100,
    25,
    40
  ),
  'completed',
  'the owner completes a pending turn'
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000205',
    'Primeira pergunta',
    'gpt-6-luna'
  ) ->> 'turnStatus',
  'completed',
  'a completed idempotent request does not call the provider again'
);
select is(
  (
    select count(*)
    from public.report_ai_turns
    where request_id = '97100000-0000-4000-8000-000000000205'
  ),
  1::bigint,
  'idempotent completion keeps exactly one turn'
);
select is(
  public.complete_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000205'
    ),
    'Resposta duplicada',
    100,
    25,
    40
  ),
  'conflict',
  'a completed turn cannot be completed twice'
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000206',
    'Pergunta pendente',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'a second request reserves after completion'
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000206',
    'Pergunta pendente',
    'gpt-6-luna'
  ) ->> 'turnStatus',
  'pending',
  'an active idempotent request returns its pending turn'
);
select is(
  public.fail_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000206'
    ),
    'provider_timeout',
    true
  ),
  'failed',
  'the owner fails a pending turn with sanitized metadata'
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000206',
    'Pergunta pendente',
    'gpt-6-luna'
  ) ->> 'retry',
  'new_request',
  'a counted failed request requires a new request id'
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000207',
    'Falha antes do provedor',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'an uncounted failure starts as a normal reservation'
);
select is(
  public.fail_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000207'
    ),
    'provider_unavailable',
    false
  ),
  'failed',
  'a proven pre-provider failure can be marked uncounted'
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000207',
    'Falha antes do provedor',
    'gpt-6-luna'
  ) ->> 'turnStatus',
  'pending',
  'an uncounted failed request is reset for the same request id'
);
select ok(
  (
    select status = 'pending'
      and counts_toward_quota
      and error_code is null
      and completed_at is null
    from public.report_ai_turns
    where request_id = '97100000-0000-4000-8000-000000000207'
  ),
  'resetting an uncounted failure clears failure state without a second row'
);
select is(
  public.fail_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000207'
    ),
    'provider_timeout',
    true
  ),
  'failed',
  'the retried request can be closed'
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000208',
    'Geração ativa',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'a fresh generation is reserved'
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000209',
    'Geração concorrente',
    'gpt-6-luna'
  ) ->> 'status',
  'busy',
  'one active generation is allowed per conversation'
);
select is(
  public.fail_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000208'
    ),
    'client_disconnected',
    true
  ),
  'failed',
  'the active-generation fixture is closed'
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000210',
    'Lease antigo',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'a stale-lease fixture is reserved'
);
reset role;
update public.report_ai_turns
set created_at = statement_timestamp() - interval '121 seconds'
where request_id = '97100000-0000-4000-8000-000000000210';
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000211',
    'Após lease antigo',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'an expired lease no longer blocks a reservation'
);
select ok(
  (
    select status = 'failed'
      and error_code = 'generation_lease_expired'
      and counts_toward_quota
      and completed_at is not null
    from public.report_ai_turns
    where request_id = '97100000-0000-4000-8000-000000000210'
  ),
  'an expired lease becomes a counted failure'
);
select is(
  public.fail_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000211'
    ),
    'client_disconnected',
    true
  ),
  'failed',
  'the post-lease reservation is closed'
);

reset role;
delete from public.report_ai_turns
where user_id = '97100000-0000-4000-8000-000000000001';
insert into public.report_ai_turns (
  conversation_id,
  user_id,
  request_id,
  question,
  answer,
  status,
  model,
  created_at,
  completed_at
)
select
  conversation.id,
  conversation.user_id,
  md5('report-ai-rate-' || series.value)::uuid,
  format('Pergunta rápida %s', series.value),
  'Resposta de cota',
  'completed',
  'gpt-6-luna',
  statement_timestamp() - interval '30 seconds',
  statement_timestamp()
from public.report_ai_conversations as conversation
cross join generate_series(1, 10) as series(value)
where conversation.user_id = '97100000-0000-4000-8000-000000000001'
  and conversation.diagnosis_id = 97101
  and conversation.report_version = 3;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000212',
    'Décima primeira pergunta rápida',
    'gpt-6-luna'
  ) ->> 'status',
  'rate_limited',
  'the eleventh reservation in a minute is rate limited'
);

reset role;
delete from public.report_ai_turns
where user_id = '97100000-0000-4000-8000-000000000001';
insert into public.report_ai_turns (
  conversation_id,
  user_id,
  request_id,
  question,
  answer,
  status,
  model,
  created_at,
  completed_at
)
select
  conversation.id,
  conversation.user_id,
  md5('report-ai-month-' || series.value)::uuid,
  format('Pergunta mensal %s', series.value),
  'Resposta de cota',
  'completed',
  'gpt-6-luna',
  statement_timestamp() - interval '2 minutes',
  statement_timestamp()
from public.report_ai_conversations as conversation
cross join generate_series(1, 100) as series(value)
where conversation.user_id = '97100000-0000-4000-8000-000000000001'
  and conversation.diagnosis_id = 97101
  and conversation.report_version = 3;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000213',
    'Centésima primeira pergunta mensal',
    'gpt-6-luna'
  ) ->> 'status',
  'monthly_limit',
  'the 101st reservation in the UTC month is rejected'
);

reset role;
delete from public.report_ai_turns
where user_id = '97100000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000214',
    'Primeiro resumo',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'the first summary fixture is reserved'
);
select is(
  public.complete_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000214'
    ),
    'Resposta para o primeiro resumo',
    10,
    0,
    10
  ),
  'completed',
  'the first summary fixture is completed'
);
select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000215',
    'Segundo resumo',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'the second summary fixture is reserved'
);
select is(
  public.complete_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000215'
    ),
    'Resposta para o segundo resumo',
    10,
    0,
    10
  ),
  'completed',
  'the second summary fixture is completed'
);

select is(
  public.update_report_ai_summary_v1(
    (
      select id
      from public.report_ai_conversations
      where user_id = '97100000-0000-4000-8000-000000000001'
        and diagnosis_id = 97101
        and report_version = 3
    ),
    'Resumo inicial',
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000214'
    )
  ),
  'updated',
  'the owner advances the conversation summary'
);
select is(
  public.update_report_ai_summary_v1(
    (
      select id
      from public.report_ai_conversations
      where user_id = '97100000-0000-4000-8000-000000000001'
        and diagnosis_id = 97101
        and report_version = 3
    ),
    'Resumo repetido',
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000214'
    )
  ),
  'conflict',
  'the summary high-water mark cannot remain still or move backwards'
);
select is(
  public.update_report_ai_summary_v1(
    (
      select id
      from public.report_ai_conversations
      where user_id = '97100000-0000-4000-8000-000000000001'
        and diagnosis_id = 97101
        and report_version = 3
    ),
    'Resumo avançado',
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000215'
    )
  ),
  'updated',
  'the summary high-water mark can move forward'
);

select is(
  public.reserve_report_ai_turn_v1(
    97101,
    3,
    '97100000-0000-4000-8000-000000000216',
    'Validação das mutações',
    'gpt-6-luna'
  ) ->> 'status',
  'reserved',
  'a pending turn is available for mutation validation'
);
select throws_ok(
  $$
    select public.complete_report_ai_turn_v1(
      (
        select id
        from public.report_ai_turns
        where request_id = '97100000-0000-4000-8000-000000000216'
      ),
      repeat('a', 32001),
      1,
      0,
      1
    )
  $$,
  '22023',
  'invalid completed turn',
  'answers longer than 32,000 characters are rejected'
);
select throws_ok(
  $$
    select public.fail_report_ai_turn_v1(
      (
        select id
        from public.report_ai_turns
        where request_id = '97100000-0000-4000-8000-000000000216'
      ),
      'raw_provider_error',
      true
    )
  $$,
  '22023',
  'invalid failed turn',
  'raw error codes are rejected'
);
select is(
  public.fail_report_ai_turn_v1(
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000216'
    ),
    'persistence_failed',
    true
  ),
  'failed',
  'the mutation-validation fixture is closed'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97100000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
select is(
  public.update_report_ai_summary_v1(
    (
      select id
      from public.report_ai_conversations
      where user_id = '97100000-0000-4000-8000-000000000001'
        and diagnosis_id = 97101
        and report_version = 3
    ),
    'Resumo estrangeiro',
    (
      select id
      from public.report_ai_turns
      where request_id = '97100000-0000-4000-8000-000000000215'
    )
  ),
  'not_found',
  'foreign users cannot update summaries'
);
reset role;

select * from finish();
rollback;
