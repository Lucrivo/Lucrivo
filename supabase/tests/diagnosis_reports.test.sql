begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table('public', 'diagnoses', 'common diagnosis registry exists');
select columns_are(
  'public',
  'diagnoses',
  array[
    'id',
    'submission_id',
    'user_id',
    'business_category',
    'scenario',
    'schema_version',
    'calculation_version',
    'content_version',
    'current_price_cents',
    'real_margin_basis_points',
    'unit_profit_cents',
    'verdict',
    'priority',
    'unit',
    'report_snapshot',
    'created_at'
  ],
  'registry exposes only common identity, summary, and snapshot columns'
);
select col_is_pk('public', 'diagnoses', 'id', 'registry id is primary key');
select results_eq(
  $$
    select is_identity = 'YES' and identity_generation = 'ALWAYS'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'diagnoses'
      and column_name = 'id'
  $$,
  array[true],
  'registry id is generated always as identity'
);
select ok(
  (
    select jsonb_agg(
      jsonb_build_array(column_name, udt_schema, udt_name)
      order by ordinal_position
    )
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'diagnoses'
  ) = $json$
    [
      ["id", "pg_catalog", "int8"],
      ["submission_id", "pg_catalog", "uuid"],
      ["user_id", "pg_catalog", "uuid"],
      ["business_category", "public", "business_category"],
      ["scenario", "pg_catalog", "text"],
      ["schema_version", "pg_catalog", "int2"],
      ["calculation_version", "pg_catalog", "int2"],
      ["content_version", "pg_catalog", "int2"],
      ["current_price_cents", "pg_catalog", "int8"],
      ["real_margin_basis_points", "pg_catalog", "int4"],
      ["unit_profit_cents", "pg_catalog", "int8"],
      ["verdict", "pg_catalog", "text"],
      ["priority", "pg_catalog", "text"],
      ["unit", "pg_catalog", "text"],
      ["report_snapshot", "pg_catalog", "jsonb"],
      ["created_at", "pg_catalog", "timestamptz"]
    ]
  $json$::jsonb,
  'registry columns use exact durable database types'
);
select results_eq(
  $$
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'diagnoses'
      and is_nullable = 'NO'
  $$,
  array[14::bigint],
  'only margin and profit summaries may be unavailable'
);
select fk_ok(
  'public',
  'diagnoses',
  'user_id',
  'auth',
  'users',
  'id',
  'registry owner references auth users'
);
select results_eq(
  $$
    select confdeltype
    from pg_constraint
    where conrelid = 'public.diagnoses'::regclass
      and conname = 'diagnoses_user_id_fkey'
  $$,
  array['c'::"char"],
  'user deletion cascades to owned report registry rows'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.diagnoses'::regclass
      and conname = 'diagnoses_user_submission_key'
      and contype = 'u'
  ),
  'submission id is unique per owner'
);
select ok(
  (
    select jsonb_agg(to_jsonb(conname) order by conname)
    from pg_constraint
    where conrelid = 'public.diagnoses'::regclass
      and contype = 'c'
  ) = $json$
    [
      "diagnoses_current_price_check",
      "diagnoses_priority_check",
      "diagnoses_scenario_check",
      "diagnoses_snapshot_object_check",
      "diagnoses_unit_check",
      "diagnoses_verdict_check",
      "diagnoses_versions_check"
    ]
  $json$::jsonb,
  'registry has every approved summary and snapshot check'
);
select has_index(
  'public',
  'diagnoses',
  'diagnoses_user_created_id_idx',
  'registry has deterministic keyset listing index'
);
select ok(
  (
    select pg_get_indexdef(indexrelid) like
      '%(user_id, created_at DESC, id DESC)%'
    from pg_index
    where indexrelid = 'public.diagnoses_user_created_id_idx'::regclass
  ),
  'listing index matches ownership and descending cursor order'
);

select col_is_null(
  'public',
  'service_diagnoses',
  'diagnosis_id',
  'legacy Service inputs may remain unlinked'
);
select fk_ok(
  'public',
  'service_diagnoses',
  'diagnosis_id',
  'public',
  'diagnoses',
  'id',
  'Service input links to the common report identity'
);
select results_eq(
  $$
    select confdeltype
    from pg_constraint
    where conrelid = 'public.service_diagnoses'::regclass
      and conname = 'service_diagnoses_diagnosis_id_fkey'
  $$,
  array['r'::"char"],
  'linked Service input prevents report deletion'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.service_diagnoses'::regclass
      and conname = 'service_diagnoses_diagnosis_id_key'
      and contype = 'u'
  ),
  'one Service input may link to each common report'
);
select has_index(
  'public',
  'service_diagnoses',
  'service_diagnoses_diagnosis_id_key',
  'Service report foreign key is indexed by its unique constraint'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_class
    where oid = 'public.diagnoses'::regclass
  $$,
  array[true],
  'registry has row level security enabled'
);
select ok(
  (
    select array_agg(policyname::text order by policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'diagnoses'
  ) = array['diagnoses_select_own']::text[],
  'registry exposes only owned reads'
);

select ok(
  not has_table_privilege('anon', 'public.diagnoses', 'select'),
  'anon cannot select registry rows'
);
select ok(
  has_table_privilege('authenticated', 'public.diagnoses', 'select'),
  'authenticated can select registry rows through RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.diagnoses', 'insert'),
  'authenticated cannot insert registry rows directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.diagnoses', 'update'),
  'authenticated cannot update immutable registry rows'
);
select ok(
  not has_table_privilege('authenticated', 'public.diagnoses', 'delete'),
  'authenticated cannot delete registry rows'
);
select ok(
  not has_sequence_privilege(
    'authenticated',
    'public.diagnoses_id_seq',
    'usage'
  ),
  'authenticated cannot use the registry identity sequence directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.service_diagnoses',
    'insert'
  ),
  'authenticated cannot insert Service inputs directly'
);
select ok(
  not has_sequence_privilege(
    'authenticated',
    'public.service_diagnoses_id_seq',
    'usage'
  ),
  'authenticated cannot use the Service identity sequence directly'
);

select has_function(
  'public',
  'create_service_diagnosis_report',
  array[
    'uuid',
    'public.service_pricing_method',
    'bigint',
    'bigint',
    'public.service_work_hours_period',
    'integer',
    'integer',
    'smallint',
    'bigint',
    'bigint',
    'bigint',
    'integer',
    'bigint',
    'integer',
    'integer',
    'smallint',
    'smallint',
    'smallint',
    'text',
    'bigint',
    'integer',
    'bigint',
    'text',
    'text',
    'text',
    'jsonb'
  ],
  'atomic Service report creation function exists'
);
select ok(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.create_service_diagnosis_report(
      uuid,
      public.service_pricing_method,
      bigint,
      bigint,
      public.service_work_hours_period,
      integer,
      integer,
      smallint,
      bigint,
      bigint,
      bigint,
      integer,
      bigint,
      integer,
      integer,
      smallint,
      smallint,
      smallint,
      text,
      bigint,
      integer,
      bigint,
      text,
      text,
      text,
      jsonb
    )'::regprocedure
  ),
  'atomic creation function is security definer'
);
select ok(
  (
    select proconfig
    from pg_proc
    where oid = 'public.create_service_diagnosis_report(
      uuid,
      public.service_pricing_method,
      bigint,
      bigint,
      public.service_work_hours_period,
      integer,
      integer,
      smallint,
      bigint,
      bigint,
      bigint,
      integer,
      bigint,
      integer,
      integer,
      smallint,
      smallint,
      smallint,
      text,
      bigint,
      integer,
      bigint,
      text,
      text,
      text,
      jsonb
    )'::regprocedure
  ) = array['search_path=""']::text[],
  'security definer function uses an empty search path'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_service_diagnosis_report(
      uuid,
      public.service_pricing_method,
      bigint,
      bigint,
      public.service_work_hours_period,
      integer,
      integer,
      smallint,
      bigint,
      bigint,
      bigint,
      integer,
      bigint,
      integer,
      integer,
      smallint,
      smallint,
      smallint,
      text,
      bigint,
      integer,
      bigint,
      text,
      text,
      text,
      jsonb
    )',
    'execute'
  ),
  'anon cannot execute report creation'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_service_diagnosis_report(
      uuid,
      public.service_pricing_method,
      bigint,
      bigint,
      public.service_work_hours_period,
      integer,
      integer,
      smallint,
      bigint,
      bigint,
      bigint,
      integer,
      bigint,
      integer,
      integer,
      smallint,
      smallint,
      smallint,
      text,
      bigint,
      integer,
      bigint,
      text,
      text,
      text,
      jsonb
    )',
    'execute'
  ),
  'authenticated can execute only the controlled creation function'
);

insert into auth.users (id, aud, role, email)
values
  (
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'reports-one@example.com'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'authenticated',
    'authenticated',
    'reports-two@example.com'
  );

create function pg_temp.create_hour_report(
  p_submission_id uuid,
  p_hourly_rate_cents bigint default 10000,
  p_schema_version smallint default 3,
  p_content_version smallint default 3,
  p_report_snapshot jsonb default '{
    "schemaVersion": 3,
    "calculationVersion": 2,
    "contentVersion": 3,
    "category": "service",
    "scenario": "hour",
    "inputs": {
      "workHoursPeriod": "month",
      "workPeriodMinutes": 6000,
      "monthlyWorkMinutes": 6000,
      "materialUnitCostCents": 0
    },
    "executiveSummary": {"headline": "A verdade por trás do preço."},
    "marker": "first"
  }'::jsonb
)
returns bigint
language sql
as $$
  select public.create_service_diagnosis_report(
    p_submission_id,
    'hour'::public.service_pricing_method,
    400000,
    200000,
    'month'::public.service_work_hours_period,
    6000,
    6000,
    5::smallint,
    p_hourly_rate_cents,
    0,
    0,
    0,
    0,
    600,
    200,
    p_schema_version,
    2::smallint,
    p_content_version,
    'hour',
    p_hourly_rate_cents,
    1700,
    1360,
    'adequate_margin',
    'volume',
    'hour',
    p_report_snapshot
  );
$$;

set local role anon;
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  null,
  'anon execution is denied by function privileges'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000002'
  ) $$,
  '42501',
  'authentication required',
  'function rejects an authenticated role without a JWT subject'
);

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select lives_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000003'
  ) $$,
  'authenticated owner creates one atomic report'
);
select results_eq(
  $$
    select user_id
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000003'
  $$,
  array['33333333-3333-4333-8333-333333333333'::uuid],
  'function always derives report ownership from auth uid'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses d
    join public.service_diagnoses s on s.diagnosis_id = d.id
    where d.submission_id = '30000000-0000-4000-8000-000000000003'
      and s.submission_id = d.submission_id
      and s.user_id = d.user_id
  $$,
  array[1::bigint],
  'valid function call inserts one registry and one linked Service input'
);
select results_eq(
  $$
    select
      work_hours_period,
      work_period_minutes,
      monthly_work_minutes,
      material_unit_cost_cents
    from public.service_diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000003'
  $$,
  $$ values (
    'month'::public.service_work_hours_period,
    6000::integer,
    6000::integer,
    0::bigint
  ) $$,
  'atomic function persists source capacity, normalized capacity, and material cost'
);
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000010',
    10000,
    1::smallint,
    1::smallint,
    '{
      "schemaVersion": 1,
      "calculationVersion": 1,
      "contentVersion": 1,
      "category": "service",
      "scenario": "hour"
    }'::jsonb
  ) $$,
  '22023',
  'invalid report snapshot',
  'atomic function rejects obsolete version 1 snapshots'
);
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000011',
    10000,
    2::smallint,
    2::smallint,
    '{
      "schemaVersion": 2,
      "calculationVersion": 1,
      "contentVersion": 2,
      "category": "service",
      "scenario": "hour"
    }'::jsonb
  ) $$,
  '22023',
  'invalid report snapshot',
  'atomic function rejects version 2 without an executive summary object'
);
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000012',
    10000,
    3::smallint,
    3::smallint,
    '{
      "schemaVersion": 3,
      "calculationVersion": 2,
      "contentVersion": 3,
      "category": "service",
      "scenario": "hour",
      "inputs": {
        "workHoursPeriod": "month",
        "workPeriodMinutes": 6000,
        "monthlyWorkMinutes": 6000,
        "materialUnitCostCents": 1
      },
      "executiveSummary": {"headline": "A verdade por trás do preço."}
    }'::jsonb
  ) $$,
  '22023',
  'invalid report snapshot',
  'atomic function rejects snapshot scalars that differ from persisted inputs'
);
select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000013',
    10000,
    3::smallint,
    3::smallint,
    '{
      "schemaVersion": 3,
      "calculationVersion": 2,
      "contentVersion": 3,
      "category": "service",
      "scenario": "hour",
      "executiveSummary": {"headline": "A verdade por trás do preço."}
    }'::jsonb
  ) $$,
  '22023',
  'invalid report snapshot',
  'atomic function rejects snapshots without persisted input scalars'
);
select results_eq(
  $$
    select report_snapshot -> 'executiveSummary' ->> 'headline'
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000003'
  $$,
  array['A verdade por trás do preço.'],
  'atomic function preserves resolved executive-summary content'
);

select throws_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000004',
    0
  ) $$,
  '23514',
  null,
  'invalid Service input fails the atomic call'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000004'
  $$,
  array[0::bigint],
  'failed Service input rolls back its registry insert'
);

select lives_ok(
  $$ select pg_temp.create_hour_report(
    '30000000-0000-4000-8000-000000000005'
  ) $$,
  'first idempotent submission creates its report'
);
select results_eq(
  $$
    select pg_temp.create_hour_report(
      '30000000-0000-4000-8000-000000000005',
      12000,
      3::smallint,
      3::smallint,
      '{
        "schemaVersion": 3,
        "calculationVersion": 2,
        "contentVersion": 3,
        "category": "service",
        "scenario": "hour",
        "inputs": {
          "workHoursPeriod": "month",
          "workPeriodMinutes": 6000,
          "monthlyWorkMinutes": 6000,
          "materialUnitCostCents": 0
        },
        "executiveSummary": {"headline": "A verdade por trás do preço."},
        "marker": "second"
      }'::jsonb
    )
  $$,
  $$
    select id
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000005'
  $$,
  'retry returns the original common diagnosis id'
);
select results_eq(
  $$
    select report_snapshot ->> 'marker'
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000005'
  $$,
  array['first'::text],
  'retry preserves the first immutable snapshot'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.service_diagnoses s
    join public.diagnoses d on d.id = s.diagnosis_id
    where d.submission_id = '30000000-0000-4000-8000-000000000005'
  $$,
  array[1::bigint],
  'retry does not duplicate the linked Service input'
);

select throws_ok(
  $$
    insert into public.diagnoses (
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
      report_snapshot
    ) values (
      '30000000-0000-4000-8000-000000000006',
      '33333333-3333-4333-8333-333333333333',
      'service',
      'hour',
      1,
      1,
      1,
      10000,
      'adequate_margin',
      'volume',
      'hour',
      '{"category":"service"}'::jsonb
    )
  $$,
  '42501',
  null,
  'authenticated cannot bypass the function to insert a registry row'
);
select throws_ok(
  $$
    insert into public.service_diagnoses (
      submission_id,
      user_id,
      pricing_method,
      hourly_rate_cents
    ) values (
      '30000000-0000-4000-8000-000000000007',
      '33333333-3333-4333-8333-333333333333',
      'hour',
      10000
    )
  $$,
  '42501',
  null,
  'authenticated cannot bypass the function to insert Service input'
);

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000003'
  $$,
  array[0::bigint],
  'a second user cannot read the first user report'
);
reset role;

select * from finish();

rollback;
