begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'business_segments', 'business segments table exists');
select has_table(
  'public',
  'business_subcategories',
  'business subcategories table exists'
);
select has_table(
  'public',
  'onboarding_profiles',
  'onboarding profiles table exists'
);

select col_is_pk('public', 'business_segments', 'id', 'segments use id as primary key');
select col_is_pk(
  'public',
  'business_subcategories',
  'id',
  'subcategories use id as primary key'
);
select col_is_pk(
  'public',
  'onboarding_profiles',
  'user_id',
  'profiles use the Auth user as primary key'
);
select fk_ok(
  'public',
  'business_subcategories',
  'segment_id',
  'public',
  'business_segments',
  'id',
  'subcategories reference their segment'
);
select fk_ok(
  'public',
  'onboarding_profiles',
  'user_id',
  'auth',
  'users',
  'id',
  'profiles reference Auth users'
);
select ok(
  (
    select pg_catalog.count(*) = 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.onboarding_profiles'::regclass
      and conname = 'onboarding_profiles_subcategory_segment_fkey'
      and contype = 'f'
  ),
  'profiles enforce the subcategory and segment pair'
);
select ok(
  (
    select pg_catalog.bool_and(confdeltype = 'r')
    from pg_catalog.pg_constraint
    where conrelid in (
      'public.business_subcategories'::regclass,
      'public.onboarding_profiles'::regclass
    )
      and contype = 'f'
  ),
  'all onboarding foreign keys restrict deletion'
);

select is(
  (
    select pg_catalog.count(*)
    from pg_catalog.pg_class
    where oid in (
      'public.business_segments'::regclass,
      'public.business_subcategories'::regclass,
      'public.onboarding_profiles'::regclass
    )
      and relrowsecurity
  ),
  3::bigint,
  'RLS is enabled on every public onboarding table'
);

select has_function(
  'public',
  'current_user_has_completed_onboarding',
  array[]::text[],
  'completion gate exists'
);
select has_function(
  'public',
  'list_business_catalog_v1',
  array[]::text[],
  'catalog projection exists'
);
select has_function(
  'public',
  'get_my_onboarding_profile_v1',
  array[]::text[],
  'own profile projection exists'
);
select ok(
  (
    select pg_catalog.bool_and(
      not prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    )
    from pg_catalog.pg_proc
    where oid in (
      'public.current_user_has_completed_onboarding()'::regprocedure,
      'public.list_business_catalog_v1()'::regprocedure,
      'public.get_my_onboarding_profile_v1()'::regprocedure
    )
  ),
  'read functions are stable security invokers with empty search paths'
);

select ok(
  not has_table_privilege('anon', 'public.onboarding_profiles', 'select'),
  'anonymous users cannot read profiles'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.onboarding_profiles',
    'insert'
  ),
  'clients cannot bypass the save RPC'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.onboarding_profiles',
    'select'
  ),
  'clients can read profiles through RLS'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.onboarding_profiles',
    'update'
  ),
  'clients cannot update profiles directly'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.business_segments',
    'select'
  ) and has_table_privilege(
    'authenticated',
    'public.business_subcategories',
    'select'
  ),
  'authenticated clients can read catalog labels'
);
select ok(
  not has_table_privilege('authenticated', 'public.business_segments', 'insert')
  and not has_table_privilege(
    'authenticated',
    'public.business_subcategories',
    'update'
  ),
  'authenticated clients cannot mutate the catalog'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.current_user_has_completed_onboarding()',
    'execute'
  ) and has_function_privilege(
    'authenticated',
    'public.list_business_catalog_v1()',
    'execute'
  ) and has_function_privilege(
    'authenticated',
    'public.get_my_onboarding_profile_v1()',
    'execute'
  ),
  'authenticated clients can execute onboarding read functions'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.current_user_has_completed_onboarding()',
    'execute'
  ) and not has_function_privilege(
    'service_role',
    'public.get_my_onboarding_profile_v1()',
    'execute'
  ),
  'unintended roles cannot execute caller-scoped onboarding reads'
);

select is(
  (select pg_catalog.count(*) from public.business_segments),
  8::bigint,
  'the eight approved segments are seeded'
);
select is(
  (select pg_catalog.count(*) from public.business_subcategories),
  5::bigint,
  'the five approved subcategories are seeded'
);
select results_eq(
  $$
    select name
    from public.business_segments
    order by sort_order, id
  $$,
  array[
    'Alimentação', 'Beleza', 'Vestuário', 'Tecnologia',
    'Educação', 'Construção', 'Saúde', 'Comércio'
  ]::text[],
  'segment labels have deterministic approved ordering'
);
select is(
  (select pg_catalog.count(*) from public.business_subcategories where name = 'Outro'),
  0::bigint,
  'Outro remains synthetic'
);

insert into auth.users (id, aud, role, email)
values
  (
    '94000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'onboarding-owner@example.com'
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'onboarding-other@example.com'
  );

insert into public.onboarding_profiles (
  user_id,
  full_name,
  whatsapp_e164,
  segment_id,
  subcategory_id,
  custom_subcategory,
  whatsapp_marketing_consent,
  marketing_consent_granted_at
)
values
  (
    '94000000-0000-4000-8000-000000000001',
    'Maria da Silva',
    '+5511999999999',
    (select id from public.business_segments where name = 'Alimentação'),
    (select id from public.business_subcategories where name = 'Confeitaria'),
    null,
    true,
    '2026-10-09T12:00:00Z'
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    'João de Souza',
    '+351912345678',
    (select id from public.business_segments where name = 'Construção'),
    null,
    'Reformas residenciais',
    false,
    null
  );

select throws_ok(
  $$
    update public.onboarding_profiles
    set full_name = repeat('x', 121)
    where user_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'names longer than 120 characters are rejected'
);
select throws_ok(
  $$
    update public.onboarding_profiles
    set whatsapp_e164 = '11999999999'
    where user_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'malformed E.164 values are rejected'
);
select throws_ok(
  $$
    update public.onboarding_profiles
    set custom_subcategory = 'Confeitaria artesanal'
    where user_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'profiles cannot store both subcategory representations'
);
select throws_ok(
  $$
    update public.onboarding_profiles
    set subcategory_id = null, custom_subcategory = null
    where user_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'profiles require exactly one subcategory representation'
);
select throws_ok(
  $$
    update public.onboarding_profiles
    set segment_id = (
      select id from public.business_segments where name = 'Beleza'
    )
    where user_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23503',
  null,
  'segment and subcategory mismatches are rejected'
);
select throws_ok(
  $$
    update public.onboarding_profiles
    set whatsapp_marketing_consent = false
    where user_id = '94000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'consent state and granted timestamp remain consistent'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);

select is(
  (select pg_catalog.count(*) from public.onboarding_profiles),
  1::bigint,
  'RLS exposes only the caller profile'
);
select is(
  (select full_name from public.onboarding_profiles),
  'Maria da Silva',
  'the caller reads their own profile'
);
select is(
  public.current_user_has_completed_onboarding(),
  true,
  'completion reflects the caller profile'
);
select is(
  public.get_my_onboarding_profile_v1() ->> 'fullName',
  'Maria da Silva',
  'profile projection returns only the caller data'
);
select is(
  jsonb_array_length(public.list_business_catalog_v1()),
  8,
  'catalog projection returns all segment labels'
);
select is(
  public.list_business_catalog_v1() #>> '{0,name}',
  'Alimentação',
  'catalog projection uses deterministic ordering'
);

select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000002',
  true
);
select is(
  (select pg_catalog.count(*) from public.onboarding_profiles),
  1::bigint,
  'a second caller still sees only one profile'
);
select is(
  public.get_my_onboarding_profile_v1() ->> 'fullName',
  'João de Souza',
  'the second caller cannot read the first profile'
);

select set_config('request.jwt.claim.sub', '', true);
select is(
  public.current_user_has_completed_onboarding(),
  false,
  'missing identity is never complete'
);
select is(
  public.get_my_onboarding_profile_v1(),
  null::jsonb,
  'missing identity has no profile projection'
);

select * from finish();
rollback;
