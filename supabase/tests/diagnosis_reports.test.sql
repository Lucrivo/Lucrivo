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
    'created_at',
    'is_free_report'
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
      ["created_at", "pg_catalog", "timestamptz"],
      ["is_free_report", "pg_catalog", "bool"]
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
  array[15::bigint],
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
  not has_function_privilege(
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
  'authenticated cannot execute the obsolete Service writer'
);

select has_function(
  'public',
  'create_service_diagnosis_report_v4',
  'normalized Service report creation function exists'
);
select ok(
  not (
    select prosecdef
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'create_service_diagnosis_report_v4'
  ),
  'normalized public creation function is security invoker'
);
select ok(
  (
    select proconfig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'create_service_diagnosis_report_v4'
  ) = array['search_path=""']::text[],
  'normalized creation function uses an empty search path'
);
select ok(
  not has_function_privilege(
    'anon',
    (
      select oid
      from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname = 'create_service_diagnosis_report_v4'
    ),
    'execute'
  ),
  'anon cannot execute normalized report creation'
);
select ok(
  has_function_privilege(
    'authenticated',
    (
      select oid
      from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname = 'create_service_diagnosis_report_v4'
    ),
    'execute'
  ),
  'authenticated can execute normalized report creation'
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

create function pg_temp.create_month_report_v4(
  p_submission_id uuid,
  p_source_current_price_cents bigint default 400000,
  p_schema_version smallint default 4,
  p_report_snapshot jsonb default '{
    "schemaVersion": 4,
    "calculationVersion": 3,
    "contentVersion": 5,
    "category": "service",
    "scenario": "month",
    "unit": "hour",
    "inputs": {
      "desiredMonthlyIncomeCents": 400000,
      "fixedMonthlyExpensesCents": 200000,
      "workHoursPeriod": "day",
      "workPeriodMinutes": 360,
      "monthlyWorkMinutes": 7794,
      "weeklyWorkDays": 5,
      "hourlyRateCents": 3079,
      "minuteRateCents": 0,
      "appointmentRateCents": 0,
      "appointmentDurationMinutes": 0,
      "materialUnitCostCents": 0,
      "taxRateBasisPoints": 600,
      "cardFeeRateBasisPoints": 200
    },
    "source": {
      "pricingMethod": "month",
      "currentPriceCents": 400000,
      "materialCostUnit": null,
      "materialCostCents": 0,
      "dailyWorkMinutes": 360,
      "appointmentDurationMinutes": 0
    },
    "results": {
      "currentPriceCents": 3079,
      "realMarginBasisPoints": -5801,
      "unitProfitCents": -1786,
      "verdict": "operational_loss",
      "priority": "price",
      "materialUnitCostCents": 0
    },
    "executiveSummary": {},
    "sections": [],
    "discountSimulationBase": {}
  }'::jsonb
)
returns bigint
language sql
as $$
  select public.create_service_diagnosis_report_v4(
    p_submission_id,
    'hour'::public.service_pricing_method,
    400000,
    200000,
    'day'::public.service_work_hours_period,
    360,
    7794,
    5::smallint,
    3079,
    0,
    0,
    0,
    0,
    600,
    200,
    'month',
    p_source_current_price_cents,
    null,
    0,
    360,
    0,
    p_schema_version,
    3::smallint,
    5::smallint,
    'month',
    3079,
    -5801,
    -1786,
    'operational_loss',
    'price',
    'hour',
    p_report_snapshot
  );
$$;

set local role anon;
select throws_ok(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000020'
  ) $$,
  '42501',
  null,
  'anon normalized execution is denied by function privileges'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000021'
  ) $$,
  '42501',
  'authentication required',
  'normalized function rejects an authenticated role without a JWT subject'
);

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select lives_ok(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000022'
  ) $$,
  'authenticated owner creates a normalized report'
);
select results_eq(
  $$
    select
      d.scenario,
      d.schema_version,
      d.calculation_version,
      d.content_version,
      s.pricing_method::text,
      s.hourly_rate_cents,
      s.source_pricing_method,
      s.source_current_price_cents,
      s.daily_work_minutes
    from public.diagnoses d
    join public.service_diagnoses s on s.diagnosis_id = d.id
    where d.submission_id = '30000000-0000-4000-8000-000000000022'
  $$,
  $$ values (
    'month'::text,
    4::smallint,
    3::smallint,
    5::smallint,
    'hour'::text,
    3079::bigint,
    'month'::text,
    400000::bigint,
    360::integer
  ) $$,
  'normalized function persists source and canonical values together'
);
select results_eq(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000022'
  ) $$,
  $$
    select id
    from public.diagnoses
    where submission_id = '30000000-0000-4000-8000-000000000022'
  $$,
  'normalized retry returns the original diagnosis id'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.service_diagnoses s
    where s.submission_id = '30000000-0000-4000-8000-000000000022'
  $$,
  array[1::bigint],
  'normalized retry creates no duplicate Service row'
);
select throws_ok(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000025'
  ) $$,
  'P0001',
  'free_report_limit_reached',
  'a second distinct Service report requires paid access'
);
select throws_ok(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000023',
    9000
  ) $$,
  '22023',
  'invalid report snapshot',
  'normalized function rejects source arguments that differ from snapshot'
);
select throws_ok(
  $$ select pg_temp.create_month_report_v4(
    '30000000-0000-4000-8000-000000000024',
    400000,
    3::smallint
  ) $$,
  '22023',
  'invalid report snapshot',
  'normalized function writes only version 4 3 5'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id in (
      '30000000-0000-4000-8000-000000000023',
      '30000000-0000-4000-8000-000000000024'
    )
  $$,
  array[0::bigint],
  'invalid normalized calls leave no partial registry rows'
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
