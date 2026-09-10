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
    ('service'::text, 4::smallint, 3::smallint, 5::smallint, 3::bigint)
  $$,
  'seed creates three current reports for every category'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
      and is_free_report
  ),
  1::bigint,
  'seed marks exactly one report as free'
);

select results_eq(
  $$
    select id
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
      and is_free_report
  $$,
  $$
    select id
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
    order by created_at, id
    limit 1
  $$,
  'the earliest seeded report is the sole free report'
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
    ('service'::text, 'operational_loss'::text, 1::bigint),
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
    from public.service_diagnoses sd
    join public.diagnoses d on d.id = sd.diagnosis_id
    where d.user_id = '10000000-0000-4000-8000-000000000001'
      and sd.source_pricing_method is not null
      and sd.source_current_price_cents is not null
      and sd.source_material_cost_cents is not null
      and sd.daily_work_minutes is not null
      and sd.source_appointment_duration_minutes is not null
      and d.report_snapshot -> 'source' = jsonb_build_object(
        'pricingMethod', sd.source_pricing_method,
        'currentPriceCents', sd.source_current_price_cents,
        'materialCostUnit', sd.source_material_cost_unit,
        'materialCostCents', sd.source_material_cost_cents,
        'dailyWorkMinutes', sd.daily_work_minutes,
        'appointmentDurationMinutes', sd.source_appointment_duration_minutes
      )
  ),
  3::bigint,
  'all seeded Service reports preserve coherent original answers'
);

select results_eq(
  $$
    select scenario, verdict, priority
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
      and business_category = 'service'
    order by scenario
  $$,
  $$ values
    ('appointment'::text, 'above_target'::text, 'volume'::text),
    ('day'::text, 'tight_margin'::text, 'margin'::text),
    ('month'::text, 'operational_loss'::text, 'price'::text)
  $$,
  'Service seed covers loss, little buffer, and healthy scenarios'
);

select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where user_id = '10000000-0000-4000-8000-000000000001'
      and business_category = 'service'
      and concat(
        report_snapshot -> 'executiveSummary',
        report_snapshot -> 'sections'
      ) ~* '(meta de 15%|preço-alvo|pró-labore|alíquota|rateio|A conta que ninguém faz)'
  ),
  0::bigint,
  'current Service copy avoids removed or technical terms'
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
  1::bigint,
  'the seeded user can read only the free report after access expires'
);

select * from finish();
rollback;
