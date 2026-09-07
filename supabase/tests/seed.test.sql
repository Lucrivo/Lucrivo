begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select is(
  (
    select count(*)::bigint
    from auth.users
    where id = '10000000-0000-4000-8000-000000000001'
      and email = 'teste@email.com'
      and email_confirmed_at is not null
  ),
  1::bigint,
  'seed creates one confirmed local test user'
);

select ok(
  (
    select encrypted_password = crypt('12345678AA', encrypted_password)
    from auth.users
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'seeded password matches the documented local credential'
);

select is(
  (
    select count(*)::bigint
    from auth.identities
    where user_id = '10000000-0000-4000-8000-000000000001'
      and provider = 'email'
  ),
  1::bigint,
  'seed creates the email identity required by local Auth'
);

select results_eq(
  $$
    select
      business_category::text,
      min(schema_version)::smallint,
      min(calculation_version)::smallint,
      min(content_version)::smallint,
      count(*)::bigint
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
    group by business_category
    order by business_category::text
  $$,
  $$ values
    ('product'::text, 1::smallint, 1::smallint, 2::smallint, 3::bigint),
    ('production'::text, 1::smallint, 1::smallint, 2::smallint, 3::bigint),
    ('service'::text, 3::smallint, 2::smallint, 4::smallint, 3::bigint)
  $$,
  'seed creates three current reports for every category'
);

select results_eq(
  $$
    select business_category::text, verdict, count(*)::bigint
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
    group by business_category, verdict
    order by business_category::text, verdict
  $$,
  $$ values
    ('product'::text, 'above_target'::text, 1::bigint),
    ('product'::text, 'direct_loss'::text, 1::bigint),
    ('product'::text, 'tight_margin'::text, 1::bigint),
    ('production'::text, 'above_target'::text, 1::bigint),
    ('production'::text, 'direct_loss'::text, 1::bigint),
    ('production'::text, 'tight_margin'::text, 1::bigint),
    ('service'::text, 'above_target'::text, 1::bigint),
    ('service'::text, 'direct_loss'::text, 1::bigint),
    ('service'::text, 'tight_margin'::text, 1::bigint)
  $$,
  'seed covers healthy, tight, and loss outcomes for every category'
);

select is(
  (
    select count(*)::bigint
    from public.service_diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'seed creates three Service detail rows'
);

select is(
  (
    select count(*)::bigint
    from public.product_diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'seed creates three Product detail rows'
);

select is(
  (
    select count(*)::bigint
    from public.production_diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  3::bigint,
  'seed creates three Production detail rows'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (select count(*)::bigint from public.diagnoses),
  9::bigint,
  'the seeded user can read all nine reports through RLS'
);

select * from finish();
rollback;
