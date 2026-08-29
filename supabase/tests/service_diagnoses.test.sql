begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_type('public', 'business_category', 'business category enum exists');
select enum_has_labels(
  'public',
  'business_category',
  array['service'],
  'business category contains only service'
);
select has_type(
  'public',
  'service_pricing_method',
  'service pricing method enum exists'
);
select enum_has_labels(
  'public',
  'service_pricing_method',
  array['hour', 'minute', 'appointment'],
  'service pricing method contains the approved labels'
);

select has_table(
  'public',
  'service_diagnoses',
  'service diagnoses table exists'
);
select columns_are(
  'public',
  'service_diagnoses',
  array[
    'id',
    'submission_id',
    'user_id',
    'business_category',
    'pricing_method',
    'desired_monthly_income_cents',
    'fixed_monthly_expenses_cents',
    'monthly_work_minutes',
    'weekly_work_days',
    'hourly_rate_cents',
    'minute_rate_cents',
    'appointment_rate_cents',
    'appointment_duration_minutes',
    'tax_rate_basis_points',
    'card_fee_rate_basis_points',
    'created_at',
    'diagnosis_id'
  ],
  'service diagnoses exposes only the approved columns'
);

select col_is_pk(
  'public',
  'service_diagnoses',
  'id',
  'id is the primary key'
);
select results_eq(
  $$
    select is_identity = 'YES' and identity_generation = 'ALWAYS'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_diagnoses'
      and column_name = 'id'
  $$,
  array[true],
  'id is generated always as identity'
);
select ok(
  (
    select jsonb_agg(
      jsonb_build_array(column_name, udt_schema, udt_name)
      order by ordinal_position
    )
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_diagnoses'
  ) = $json$
    [
      ["id", "pg_catalog", "int8"],
      ["submission_id", "pg_catalog", "uuid"],
      ["user_id", "pg_catalog", "uuid"],
      ["business_category", "public", "business_category"],
      ["pricing_method", "public", "service_pricing_method"],
      ["desired_monthly_income_cents", "pg_catalog", "int8"],
      ["fixed_monthly_expenses_cents", "pg_catalog", "int8"],
      ["monthly_work_minutes", "pg_catalog", "int4"],
      ["weekly_work_days", "pg_catalog", "int2"],
      ["hourly_rate_cents", "pg_catalog", "int8"],
      ["minute_rate_cents", "pg_catalog", "int8"],
      ["appointment_rate_cents", "pg_catalog", "int8"],
      ["appointment_duration_minutes", "pg_catalog", "int4"],
      ["tax_rate_basis_points", "pg_catalog", "int4"],
      ["card_fee_rate_basis_points", "pg_catalog", "int4"],
      ["created_at", "pg_catalog", "timestamptz"],
      ["diagnosis_id", "pg_catalog", "int8"]
    ]
  $json$::jsonb,
  'every service diagnosis column has the approved database type'
);
select results_eq(
  $$
    select count(*)::bigint
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_diagnoses'
      and is_nullable = 'NO'
  $$,
  array[16::bigint],
  'legacy Service columns remain required while report link is nullable'
);
select ok(
  (
    select jsonb_agg(to_jsonb(column_name) order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'service_diagnoses'
      and column_default is not null
  ) = $json$
    [
      "business_category",
      "desired_monthly_income_cents",
      "fixed_monthly_expenses_cents",
      "monthly_work_minutes",
      "weekly_work_days",
      "hourly_rate_cents",
      "minute_rate_cents",
      "appointment_rate_cents",
      "appointment_duration_minutes",
      "tax_rate_basis_points",
      "card_fee_rate_basis_points",
      "created_at"
    ]
  $json$::jsonb,
  'approved optional values and created timestamp have defaults'
);

select fk_ok(
  'public',
  'service_diagnoses',
  'user_id',
  'auth',
  'users',
  'id',
  'user id references auth users'
);
select results_eq(
  $$
    select confdeltype
    from pg_constraint
    where conrelid = 'public.service_diagnoses'::regclass
      and conname = 'service_diagnoses_user_id_fkey'
  $$,
  array['c'::"char"],
  'user deletion cascades to service diagnoses'
);
select ok(
  (
    select count(*) = 1
    from pg_constraint
    where conrelid = 'public.service_diagnoses'::regclass
      and conname = 'service_diagnoses_user_submission_key'
      and contype = 'u'
  ),
  'submission id has the named per-user unique constraint'
);
select ok(
  (
    select jsonb_agg(to_jsonb(conname) order by conname)
    from pg_constraint
    where conrelid = 'public.service_diagnoses'::regclass
      and contype = 'c'
  ) = $json$
    [
      "service_diagnoses_card_fee_check",
      "service_diagnoses_category_check",
      "service_diagnoses_duration_check",
      "service_diagnoses_money_check",
      "service_diagnoses_pricing_shape_check",
      "service_diagnoses_tax_check",
      "service_diagnoses_work_days_check",
      "service_diagnoses_work_minutes_check"
    ]
  $json$::jsonb,
  'all approved check constraints exist'
);
select has_index(
  'public',
  'service_diagnoses',
  'service_diagnoses_user_created_at_idx',
  'ownership history index exists'
);
select ok(
  (
    select array_agg(a.attname::text order by key.position)
    from pg_index i
    cross join lateral unnest(i.indkey) with ordinality as key(attnum, position)
    join pg_attribute a
      on a.attrelid = i.indrelid
     and a.attnum = key.attnum
    where i.indexrelid = 'public.service_diagnoses_user_created_at_idx'::regclass
  ) = array['user_id', 'created_at']::text[],
  'history index starts with the ownership column'
);
select ok(
  (
    select pg_get_indexdef(indexrelid) like
      '%(user_id, created_at DESC)%'
    from pg_index
    where indexrelid = 'public.service_diagnoses_user_created_at_idx'::regclass
  ),
  'history index stores created at in descending order'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_class
    where oid = 'public.service_diagnoses'::regclass
  $$,
  array[true],
  'row level security is enabled'
);
select ok(
  (
    select array_agg(policyname::text order by policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'service_diagnoses'
  ) = array['service_diagnoses_select_own']::text[],
  'only select-own policy exists'
);

select ok(
  not has_table_privilege('anon', 'public.service_diagnoses', 'select'),
  'anon cannot select diagnoses'
);
select ok(
  not has_table_privilege('anon', 'public.service_diagnoses', 'insert'),
  'anon cannot insert diagnoses'
);
select ok(
  not has_sequence_privilege(
    'anon',
    'public.service_diagnoses_id_seq',
    'usage'
  ),
  'anon cannot use the diagnosis identity sequence'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.service_diagnoses',
    'select'
  ),
  'authenticated can select through RLS'
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
  not has_table_privilege(
    'authenticated',
    'public.service_diagnoses',
    'update'
  ),
  'authenticated cannot update diagnoses'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.service_diagnoses',
    'delete'
  ),
  'authenticated cannot delete diagnoses'
);
select ok(
  not has_sequence_privilege(
    'authenticated',
    'public.service_diagnoses_id_seq',
    'usage'
  ),
  'authenticated cannot use the diagnosis identity sequence'
);

insert into auth.users (id, aud, role, email)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'one@example.com'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'two@example.com'
  );

select lives_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100
      )
  $sql$,
  'hour accepts only a positive hourly rate'
);
select results_eq(
  $$
    select
      business_category,
      desired_monthly_income_cents,
      fixed_monthly_expenses_cents,
      monthly_work_minutes,
      weekly_work_days,
      minute_rate_cents,
      appointment_rate_cents,
      appointment_duration_minutes,
      tax_rate_basis_points,
      card_fee_rate_basis_points,
      created_at is not null
    from public.service_diagnoses
    where submission_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  $$,
  $$ values (
    'service'::public.business_category,
    0::bigint,
    0::bigint,
    0::integer,
    0::smallint,
    0::bigint,
    0::bigint,
    0::integer,
    0::integer,
    0::integer,
    true
  ) $$,
  'approved defaults persist canonical zero values and service category'
);
select lives_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        minute_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
        '11111111-1111-4111-8111-111111111111',
        'minute',
        10,
        40
      )
  $sql$,
  'minute accepts a positive rate and average appointment duration'
);
select lives_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        appointment_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
        '11111111-1111-4111-8111-111111111111',
        'appointment',
        20000,
        60
      )
  $sql$,
  'appointment accepts positive rate and duration'
);

select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, minute_rate_cents)
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        1
      )
  $sql$,
  '23514',
  null,
  'hour rejects a minute rate'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        minute_rate_cents,
        appointment_rate_cents
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
        '11111111-1111-4111-8111-111111111111',
        'minute',
        10,
        1
      )
  $sql$,
  '23514',
  null,
  'minute rejects an appointment rate'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, appointment_rate_cents)
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
        '11111111-1111-4111-8111-111111111111',
        'appointment',
        100
      )
  $sql$,
  '23514',
  null,
  'appointment requires a positive duration'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, appointment_rate_cents)
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        1
      )
  $sql$,
  '23514',
  null,
  'hour rejects an appointment rate'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        hourly_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        1
      )
  $sql$,
  '23514',
  null,
  'hour rejects an appointment duration'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, minute_rate_cents)
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',
        '11111111-1111-4111-8111-111111111111',
        'minute',
        1,
        10
      )
  $sql$,
  '23514',
  null,
  'minute rejects an hourly rate'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        minute_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
        '11111111-1111-4111-8111-111111111111',
        'minute',
        10,
        0
      )
  $sql$,
  '23514',
  null,
  'minute requires a positive average appointment duration'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        hourly_rate_cents,
        appointment_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11',
        '11111111-1111-4111-8111-111111111111',
        'appointment',
        1,
        100,
        60
      )
  $sql$,
  '23514',
  null,
  'appointment rejects an hourly rate'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        minute_rate_cents,
        appointment_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12',
        '11111111-1111-4111-8111-111111111111',
        'appointment',
        1,
        100,
        60
      )
  $sql$,
  '23514',
  null,
  'appointment rejects a minute rate'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        appointment_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa13',
        '11111111-1111-4111-8111-111111111111',
        'appointment',
        0,
        60
      )
  $sql$,
  '23514',
  null,
  'appointment requires a positive rate'
);

select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        hourly_rate_cents,
        desired_monthly_income_cents
      )
    values
      (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'desired monthly income cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        hourly_rate_cents,
        fixed_monthly_expenses_cents
      )
    values
      (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'fixed monthly expenses cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        -1
      )
  $sql$,
  '23514',
  null,
  'hourly rate cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, minute_rate_cents)
    values
      (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'minute rate cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, appointment_rate_cents)
    values
      (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'appointment rate cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        hourly_rate_cents,
        appointment_duration_minutes
      )
    values
      (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'appointment duration cannot be negative'
);

select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, monthly_work_minutes)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'monthly work minutes cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, monthly_work_minutes)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        44641
      )
  $sql$,
  '23514',
  null,
  'monthly work minutes stop at 44640'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, weekly_work_days)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'weekly work days cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, weekly_work_days)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc4',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        8
      )
  $sql$,
  '23514',
  null,
  'weekly work days stop at seven'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, tax_rate_basis_points)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc5',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'tax rate cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, tax_rate_basis_points)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc6',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        10001
      )
  $sql$,
  '23514',
  null,
  'tax rate stops at 100 percent'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, card_fee_rate_basis_points)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc7',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        -1
      )
  $sql$,
  '23514',
  null,
  'card fee rate cannot be negative'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents, card_fee_rate_basis_points)
    values
      (
        'cccccccc-cccc-4ccc-8ccc-ccccccccccc8',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        10001
      )
  $sql$,
  '23514',
  null,
  'card fee rate stops at 100 percent'
);

select lives_ok(
  $sql$
    insert into public.service_diagnoses
      (
        submission_id,
        user_id,
        pricing_method,
        hourly_rate_cents,
        monthly_work_minutes,
        weekly_work_days,
        tax_rate_basis_points,
        card_fee_rate_basis_points
      )
    values
      (
        'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        0,
        0,
        0,
        0
      ),
      (
        'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100,
        44640,
        7,
        10000,
        10000
      )
  $sql$,
  'bounded numeric columns accept both endpoints'
);

select lives_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
        '22222222-2222-4222-8222-222222222222',
        'hour',
        100
      )
  $sql$,
  'different users may reuse a submission id'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100
      )
  $sql$,
  '23505',
  null,
  'a submission id is unique for the same user'
);

insert into public.service_diagnoses
  (submission_id, user_id, pricing_method, hourly_rate_cents)
values
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff1',
    '11111111-1111-4111-8111-111111111111',
    'hour',
    100
  ),
  (
    'ffffffff-ffff-4fff-8fff-fffffffffff2',
    '22222222-2222-4222-8222-222222222222',
    'hour',
    100
  );

set local role anon;
select throws_ok(
  'select count(*) from public.service_diagnoses',
  '42501',
  null,
  'anon cannot read diagnoses'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'ffffffff-ffff-4fff-8fff-fffffffffff3',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100
      )
  $sql$,
  '42501',
  null,
  'anon cannot insert diagnoses'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select results_eq(
  $$
    select submission_id
    from public.service_diagnoses
    where submission_id in (
      'ffffffff-ffff-4fff-8fff-fffffffffff1',
      'ffffffff-ffff-4fff-8fff-fffffffffff2'
    )
    order by submission_id
  $$,
  array['ffffffff-ffff-4fff-8fff-fffffffffff1'::uuid],
  'an authenticated user selects only their own diagnosis'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'ffffffff-ffff-4fff-8fff-fffffffffff4',
        '11111111-1111-4111-8111-111111111111',
        'hour',
        100
      )
  $sql$,
  '42501',
  null,
  'an authenticated user cannot insert their own Service input directly'
);
select throws_ok(
  $sql$
    insert into public.service_diagnoses
      (submission_id, user_id, pricing_method, hourly_rate_cents)
    values
      (
        'ffffffff-ffff-4fff-8fff-fffffffffff5',
        '22222222-2222-4222-8222-222222222222',
        'hour',
        100
      )
  $sql$,
  '42501',
  null,
  'an authenticated user cannot insert for another owner'
);
select throws_ok(
  $sql$
    update public.service_diagnoses
    set hourly_rate_cents = 200
    where submission_id = 'ffffffff-ffff-4fff-8fff-fffffffffff1'
  $sql$,
  '42501',
  null,
  'authenticated cannot update diagnoses'
);
select throws_ok(
  $sql$
    delete from public.service_diagnoses
    where submission_id = 'ffffffff-ffff-4fff-8fff-fffffffffff1'
  $sql$,
  '42501',
  null,
  'authenticated cannot delete diagnoses'
);
reset role;

select * from finish();

rollback;
