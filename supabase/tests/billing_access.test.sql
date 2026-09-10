begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_column(
  'public',
  'diagnoses',
  'is_free_report',
  'diagnoses identify the single free report'
);
select col_type_is(
  'public',
  'diagnoses',
  'is_free_report',
  'boolean',
  'free-report marker is boolean'
);
select col_not_null(
  'public',
  'diagnoses',
  'is_free_report',
  'free-report marker is required'
);
select has_index(
  'public',
  'diagnoses',
  'diagnoses_one_free_report_per_user_idx',
  'a user can own at most one free report'
);

select has_function(
  'private',
  'has_paid_access_for_user',
  array['uuid', 'timestamp with time zone'],
  'internal entitlement lookup exists'
);
select has_function(
  'private',
  'has_paid_access',
  array['timestamp with time zone'],
  'caller-scoped entitlement lookup exists'
);
select has_function(
  'private',
  'can_read_diagnosis',
  array['bigint'],
  'caller-scoped report policy helper exists'
);

select ok(
  (
    select bool_and(
      prosecdef and proconfig = array['search_path=""']::text[]
    )
    from pg_proc
    where oid in (
      'private.has_paid_access_for_user(uuid,timestamptz)'::regprocedure,
      'private.has_paid_access(timestamptz)'::regprocedure,
      'private.can_read_diagnosis(bigint)'::regprocedure
    )
  ),
  'entitlement helpers are security definer with an empty search path'
);

select ok(
  has_schema_privilege('authenticated', 'private', 'usage'),
  'authenticated may resolve caller-scoped private helpers'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.has_paid_access_for_user(uuid,timestamptz)',
    'execute'
  ),
  'authenticated cannot execute arbitrary-user entitlement checks'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.has_paid_access(timestamptz)',
    'execute'
  ),
  'authenticated may evaluate its own entitlement'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.can_read_diagnosis(bigint)',
    'execute'
  ),
  'authenticated may evaluate owned report visibility'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_service_diagnosis_report(uuid,public.service_pricing_method,bigint,bigint,public.service_work_hours_period,integer,integer,smallint,bigint,bigint,bigint,integer,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)',
    'execute'
  ),
  'authenticated cannot execute the obsolete Service writer'
);

select ok(
  (
    select count(*) = 3
      and bool_and(
        not p.prosecdef
        and p.proconfig = array['search_path=""']::text[]
      )
    from pg_proc as p
    where p.oid in (
      'public.create_service_diagnosis_report_v4(uuid,public.service_pricing_method,bigint,bigint,public.service_work_hours_period,integer,integer,smallint,bigint,bigint,bigint,integer,bigint,integer,integer,text,bigint,text,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)'::regprocedure,
      'public.create_product_diagnosis_report(uuid,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)'::regprocedure,
      'public.create_production_diagnosis_report(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)'::regprocedure
    )
  ),
  'public report writers are security-invoker wrappers'
);

select ok(
  (
    select count(*) = 3
      and bool_and(
        p.prosecdef
        and p.proconfig = array['search_path=""']::text[]
      )
    from pg_proc as p
    where p.pronamespace = 'private'::regnamespace
      and p.proname in (
        'create_product_diagnosis_report_impl',
        'create_production_diagnosis_report_impl',
        'create_service_diagnosis_report_v4_impl'
      )
  ),
  'private report implementations retain security-definer isolation'
);

insert into auth.users (id, aud, role, email)
values
  (
    '85000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'access-a@example.com'
  ),
  (
    '85000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'access-b@example.com'
  ),
  (
    '85000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'free-limit@example.com'
  ),
  (
    '85000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'paid-limit@example.com'
  ),
  (
    '85000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'invalid-contracts@example.com'
  ),
  (
    '85000000-0000-4000-8000-000000000006',
    'authenticated',
    'authenticated',
    'cancel-at-period-end@example.com'
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
  installment_limit,
  access_months,
  status,
  access_starts_at,
  access_ends_at
) values
  (
    '86000000-0000-4000-8000-000000000001',
    '85000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'access-a',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    'active',
    '2000-01-01T00:00:00Z',
    '2100-01-01T00:00:00Z'
  ),
  (
    '86000000-0000-4000-8000-000000000002',
    '85000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    'paid-limit',
    'annual',
    'pix',
    'detached',
    47880,
    'BRL',
    12,
    12,
    'active',
    '2000-01-01T00:00:00Z',
    '2100-01-01T00:00:00Z'
  ),
  (
    '86000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    'refunded-access',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    'refunded',
    '2000-01-01T00:00:00Z',
    '2100-01-01T00:00:00Z'
  ),
  (
    '86000000-0000-4000-8000-000000000004',
    '85000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    'chargeback-access',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    'chargeback',
    '2000-01-01T00:00:00Z',
    '2100-01-01T00:00:00Z'
  ),
  (
    '86000000-0000-4000-8000-000000000005',
    '85000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    'failed-access',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    'failed',
    '2000-01-01T00:00:00Z',
    '2100-01-01T00:00:00Z'
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
  installment_limit,
  access_months,
  status,
  access_starts_at,
  access_ends_at,
  cancel_at_period_end,
  cancellation_confirmed_at
) values (
  '86000000-0000-4000-8000-000000000006',
  '85000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000001',
  'cancel-at-period-end-access',
  'monthly',
  'credit_card',
  'recurring',
  4990,
  'BRL',
  null,
  1,
  'cancel_at_period_end',
  '2000-01-01T00:00:00Z',
  '2100-01-01T00:00:00Z',
  true,
  '2026-09-10T00:00:00Z'
);

insert into public.diagnoses (
  submission_id,
  user_id,
  business_category,
  scenario,
  schema_version,
  calculation_version,
  content_version,
  current_price_cents,
  real_margin_basis_points,
  unit_profit_cents,
  verdict,
  priority,
  unit,
  report_snapshot,
  is_free_report,
  created_at
) values
  (
    '87000000-0000-4000-8000-000000000001',
    '85000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"owner":"a","report":1}',
    true, '2026-09-01T00:00:00Z'
  ),
  (
    '87000000-0000-4000-8000-000000000002',
    '85000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"owner":"a","report":2}',
    false, '2026-09-02T00:00:00Z'
  ),
  (
    '87000000-0000-4000-8000-000000000004',
    '85000000-0000-4000-8000-000000000001',
    'service', 'hour', 4, 3, 5, 10000, 1200, 1200,
    'tight_margin', 'margin', 'hour', '{"owner":"a","report":3}',
    false, '2026-09-03T00:00:00Z'
  ),
  (
    '87000000-0000-4000-8000-000000000005',
    '85000000-0000-4000-8000-000000000001',
    'production', 'manufacturing', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"owner":"a","report":4}',
    false, '2026-09-04T00:00:00Z'
  ),
  (
    '87000000-0000-4000-8000-000000000003',
    '85000000-0000-4000-8000-000000000002',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"owner":"b","report":1}',
    true, '2026-09-01T00:00:00Z'
  );

insert into public.product_diagnoses (
  diagnosis_id,
  submission_id,
  user_id,
  purchase_unit_cost_cents,
  unit_sale_price_cents,
  fixed_monthly_expenses_cents,
  monthly_sales_volume,
  pro_labore_included,
  pro_labore_cents,
  tax_rate_basis_points,
  card_fee_rate_basis_points
)
select
  id,
  submission_id,
  user_id,
  5000,
  10000,
  100000,
  100,
  true,
  200000,
  600,
  200
from public.diagnoses
where submission_id in (
  '87000000-0000-4000-8000-000000000001',
  '87000000-0000-4000-8000-000000000002',
  '87000000-0000-4000-8000-000000000003'
);

insert into public.service_diagnoses (
  diagnosis_id,
  submission_id,
  user_id,
  pricing_method,
  hourly_rate_cents
)
select
  id,
  submission_id,
  user_id,
  'hour',
  10000
from public.diagnoses
where submission_id = '87000000-0000-4000-8000-000000000004';

insert into public.production_diagnoses (
  diagnosis_id,
  submission_id,
  user_id,
  cost_composition_enabled,
  production_unit_cost_cents,
  material_unit_cost_cents,
  packaging_unit_cost_cents,
  direct_labor_unit_cost_cents,
  other_variable_unit_cost_cents,
  unit_sale_price_cents,
  fixed_monthly_expenses_cents,
  monthly_sales_volume,
  pro_labore_included,
  pro_labore_cents,
  tax_rate_basis_points,
  card_fee_rate_basis_points
)
select
  id,
  submission_id,
  user_id,
  false,
  5000,
  null,
  null,
  null,
  null,
  10000,
  0,
  100,
  false,
  0,
  600,
  200
from public.diagnoses
where submission_id = '87000000-0000-4000-8000-000000000005';

select throws_ok(
  $$
    insert into public.diagnoses (
      submission_id, user_id, business_category, scenario,
      schema_version, calculation_version, content_version,
      current_price_cents, verdict, priority, unit,
      report_snapshot, is_free_report
    ) values (
      '87000000-0000-4000-8000-000000000099',
      '85000000-0000-4000-8000-000000000001',
      'product', 'resale', 1, 1, 2, 10000,
      'tight_margin', 'margin', 'unit', '{}', true
    )
  $$,
  '23505',
  null,
  'partial unique index rejects a second free report'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000001',
  true
);

select is(
  private.has_paid_access('2000-01-01T00:00:00Z'),
  true,
  'paid interval includes its exact start instant'
);
select is(
  private.has_paid_access('2050-01-01T00:00:00Z'),
  true,
  'paid interval grants access inside its half-open range'
);
select is(
  private.has_paid_access('2100-01-01T00:00:00Z'),
  false,
  'paid interval excludes its exact end instant'
);
select is(
  (select count(*)::bigint from public.diagnoses),
  4::bigint,
  'active owner sees all free and paid parent reports only'
);
select is(
  (select count(*)::bigint from public.product_diagnoses),
  2::bigint,
  'active owner sees matching free and paid detail rows only'
);
select is(
  (select count(*)::bigint from public.service_diagnoses),
  1::bigint,
  'active owner sees the paid Service detail row'
);
select is(
  (select count(*)::bigint from public.production_diagnoses),
  1::bigint,
  'active owner sees the paid Production detail row'
);
select is(
  (
    select count(*)::bigint
    from public.diagnoses
    where report_snapshot ->> 'owner' = 'b'
  ),
  0::bigint,
  'another user never sees parent or snapshot data'
);
select is(
  (
    select count(*)::bigint
    from public.billing_contracts
    where user_id = '85000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'another user never sees billing data'
);

reset role;
update public.billing_contracts
set status = 'expired',
    access_ends_at = '2001-01-01T00:00:00Z'
where id = '86000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000001',
  true
);
select is(
  (select count(*)::bigint from public.diagnoses),
  1::bigint,
  'expired access leaves only the free parent report visible'
);
select is(
  (select count(*)::bigint from public.product_diagnoses),
  1::bigint,
  'expired access leaves only the matching free detail visible'
);
select is(
  (select count(*)::bigint from public.service_diagnoses),
  0::bigint,
  'expired access hides the paid Service detail'
);
select is(
  (select count(*)::bigint from public.production_diagnoses),
  0::bigint,
  'expired access hides the paid Production detail'
);

reset role;
update public.billing_contracts
set status = 'active',
    access_ends_at = '2100-01-01T00:00:00Z'
where id = '86000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000001',
  true
);
select is(
  (select count(*)::bigint from public.diagnoses),
  4::bigint,
  'reactivation restores all owned parent reports'
);
select is(
  (select count(*)::bigint from public.product_diagnoses),
  2::bigint,
  'reactivation restores all owned detail rows'
);
select is(
  (select count(*)::bigint from public.service_diagnoses),
  1::bigint,
  'reactivation restores the owned Service detail'
);
select is(
  (select count(*)::bigint from public.production_diagnoses),
  1::bigint,
  'reactivation restores the owned Production detail'
);

select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000005',
  true
);
select is(
  private.has_paid_access('2050-01-01T00:00:00Z'),
  false,
  'refunded, chargeback, and failed contracts never grant access'
);

select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000006',
  true
);
select is(
  private.has_paid_access('2050-01-01T00:00:00Z'),
  true,
  'cancel-at-period-end keeps access through the paid interval'
);

reset role;

create function pg_temp.complete_product_snapshot()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'calculationVersion', 1,
    'contentVersion', 2,
    'category', 'product',
    'scenario', 'resale',
    'currency', 'BRL',
    'unit', 'unit',
    'policy', jsonb_build_object('targetMarginBasisPoints', 2000),
    'inputs', jsonb_build_object(
      'purchaseUnitCostCents', 5000,
      'unitSalePriceCents', 10000,
      'fixedMonthlyExpensesCents', 100000,
      'monthlySalesVolume', 100,
      'proLaboreIncluded', true,
      'proLaboreCents', 200000,
      'taxRateBasisPoints', 600,
      'cardFeeRateBasisPoints', 200
    ),
    'results', jsonb_build_object(
      'purchaseUnitCostCents', 5000,
      'currentPriceCents', 10000,
      'realMarginBasisPoints', 1200,
      'unitProfitCents', 1200,
      'verdict', 'tight_margin',
      'priority', 'margin'
    ),
    'executiveSummary', jsonb_build_object('headline', 'Diagnóstico'),
    'sections', jsonb_build_array(),
    'discountSimulationBase', jsonb_build_object('partial', false)
  );
$$;

create function pg_temp.create_product_report(p_submission_id uuid)
returns bigint
language sql
as $$
  select public.create_product_diagnosis_report(
    p_submission_id,
    5000,
    10000,
    100000,
    100,
    true,
    200000,
    600,
    200,
    1::smallint,
    1::smallint,
    2::smallint,
    'resale',
    10000,
    1200,
    1200,
    'tight_margin',
    'margin',
    'unit',
    pg_temp.complete_product_snapshot()
  );
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000003',
  true
);

select lives_ok(
  $$ select pg_temp.create_product_report(
    '88000000-0000-4000-8000-000000000001'
  ) $$,
  'a free user creates the first report'
);
select results_eq(
  $$
    select pg_temp.create_product_report(
      '88000000-0000-4000-8000-000000000001'
    )
  $$,
  $$
    select id
    from public.diagnoses
    where submission_id = '88000000-0000-4000-8000-000000000001'
  $$,
  'retry returns the first report id without consuming another allowance'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    '88000000-0000-4000-8000-000000000002'
  ) $$,
  'P0001',
  'free_report_limit_reached',
  'a second distinct free submission is rejected'
);
select results_eq(
  $$
    select is_free_report, count(*)::bigint
    from public.diagnoses
    group by is_free_report
  $$,
  $$ values (true, 1::bigint) $$,
  'the free user retains exactly one free report'
);

select set_config(
  'request.jwt.claim.sub',
  '85000000-0000-4000-8000-000000000004',
  true
);
select lives_ok(
  $$ select pg_temp.create_product_report(
    '88000000-0000-4000-8000-000000000003'
  ) $$,
  'a paid user creates the first free report'
);
select lives_ok(
  $$ select pg_temp.create_product_report(
    '88000000-0000-4000-8000-000000000004'
  ) $$,
  'a paid user creates a subsequent paid report'
);
select results_eq(
  $$
    select is_free_report, count(*)::bigint
    from public.diagnoses
    group by is_free_report
    order by is_free_report desc
  $$,
  $$ values (true, 1::bigint), (false, 1::bigint) $$,
  'the paid user keeps one free report and one paid report'
);

select * from finish();

rollback;
