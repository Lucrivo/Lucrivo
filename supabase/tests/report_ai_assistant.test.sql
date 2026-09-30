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

select * from finish();
rollback;
