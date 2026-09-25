begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_function(
  'public',
  'get_admin_dashboard_v1',
  array[]::text[],
  'versioned dashboard RPC exists'
);

select has_function(
  'public',
  'list_admin_recent_subscriptions_v1',
  array['text', 'text', 'text'],
  'filtered recent-subscription RPC exists'
);

select ok(
  (
    select prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = to_regprocedure('public.get_admin_dashboard_v1()')
  ),
  'dashboard RPC is stable security definer with empty search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_admin_dashboard_v1()',
    'execute'
  ),
  'anonymous callers cannot execute the dashboard RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_admin_dashboard_v1()',
    'execute'
  ),
  'authenticated callers may reach the internal authorization check'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.get_admin_dashboard_v1()',
    'execute'
  ),
  'service role cannot bypass caller-scoped dashboard authorization'
);

alter table private.admin_user_events
  disable trigger admin_user_events_reject_changes;
truncate table auth.users cascade;
alter table private.admin_user_events
  enable trigger admin_user_events_reject_changes;

create temporary table dashboard_test_clock as
select
  statement_timestamp() as snapshot_at,
  date_trunc(
    'day',
    statement_timestamp() at time zone 'America/Sao_Paulo'
  ) at time zone 'America/Sao_Paulo' as day_start,
  date_trunc(
    'week',
    statement_timestamp() at time zone 'America/Sao_Paulo'
  ) at time zone 'America/Sao_Paulo' as week_start,
  date_trunc(
    'month',
    statement_timestamp() at time zone 'America/Sao_Paulo'
  ) at time zone 'America/Sao_Paulo' as month_start,
  (
    date_trunc(
      'month',
      statement_timestamp() at time zone 'America/Sao_Paulo'
    ) + interval '1 month'
  ) at time zone 'America/Sao_Paulo' as next_month_start;

insert into auth.users (
  id,
  aud,
  role,
  email,
  created_at,
  last_sign_in_at
)
select
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  fixture.created_at,
  fixture.last_sign_in_at
from dashboard_test_clock as clock
cross join lateral (
  values
    (
      '94000000-0000-4000-8000-000000000001'::uuid,
      'admin-dashboard@example.com',
      clock.snapshot_at - interval '1 day',
      clock.snapshot_at
    ),
    (
      '94000000-0000-4000-8000-000000000002'::uuid,
      'today-dashboard@example.com',
      clock.day_start,
      clock.snapshot_at - interval '1 hour'
    ),
    (
      '94000000-0000-4000-8000-000000000003'::uuid,
      'before-day-dashboard@example.com',
      clock.day_start - interval '1 microsecond',
      null::timestamptz
    ),
    (
      '94000000-0000-4000-8000-000000000004'::uuid,
      'week-boundary-dashboard@example.com',
      clock.week_start,
      null::timestamptz
    ),
    (
      '94000000-0000-4000-8000-000000000005'::uuid,
      'before-week-dashboard@example.com',
      clock.week_start - interval '1 microsecond',
      null::timestamptz
    ),
    (
      '94000000-0000-4000-8000-000000000006'::uuid,
      'month-boundary-dashboard@example.com',
      clock.month_start,
      null::timestamptz
    ),
    (
      '94000000-0000-4000-8000-000000000007'::uuid,
      'before-month-dashboard@example.com',
      clock.month_start - interval '1 microsecond',
      null::timestamptz
    ),
    (
      '94000000-0000-4000-8000-000000000008'::uuid,
      'active-old-dashboard@example.com',
      clock.snapshot_at - interval '90 days',
      clock.snapshot_at - interval '1 day'
    ),
    (
      '94000000-0000-4000-8000-000000000009'::uuid,
      'inactive-dashboard@example.com',
      clock.snapshot_at - interval '90 days',
      clock.snapshot_at - interval '31 days'
    ),
    (
      '94000000-0000-4000-8000-000000000010'::uuid,
      'newest-dashboard@example.com',
      clock.snapshot_at - interval '90 days',
      null::timestamptz
    )
) as fixture(id, email, created_at, last_sign_in_at);

insert into private.app_administrator (user_id)
values ('94000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$ select public.get_admin_dashboard_v1() $$,
  '42501',
  'administrator access required',
  'ordinary users are denied at aal2'
);
select throws_ok(
  $$ select public.list_admin_recent_subscriptions_v1('all', 'all', 'all') $$,
  '42501',
  'administrator access required',
  'ordinary users cannot list recent subscriptions'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$ select public.get_admin_dashboard_v1() $$,
  '42501',
  'administrator access required',
  'assigned administrator is denied at aal1'
);
select throws_ok(
  $$ select public.list_admin_recent_subscriptions_v1('all', 'all', 'all') $$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot list recent subscriptions'
);
reset role;

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
  is_free_report
)
values
  (
    '94100000-0000-4000-8000-000000000001',
    '94000000-0000-4000-8000-000000000002',
    'service',
    'hour',
    1,
    1,
    1,
    10000,
    2500,
    2500,
    'adequate_margin',
    'margin',
    'hour',
    '{}'::jsonb,
    true
  ),
  (
    '94100000-0000-4000-8000-000000000002',
    '94000000-0000-4000-8000-000000000003',
    'service',
    'hour',
    1,
    1,
    1,
    10000,
    2500,
    2500,
    'adequate_margin',
    'margin',
    'hour',
    '{}'::jsonb,
    false
  );

insert into public.billing_prices (
  id,
  product_code,
  billing_mode,
  version,
  amount_cents,
  currency,
  access_months
)
values (
  '94200000-0000-4000-8000-000000000001',
  'admin-dashboard-test-monthly',
  'monthly',
  1,
  1000,
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
  access_ends_at,
  cancel_at_period_end,
  cancellation_requested_at,
  cancellation_confirmed_at,
  created_at,
  updated_at
)
select
  fixture.id,
  fixture.user_id,
  '94200000-0000-4000-8000-000000000001',
  fixture.external_reference,
  'monthly',
  'credit_card',
  'recurring',
  1000,
  'BRL',
  1,
  fixture.status,
  fixture.access_starts_at,
  fixture.access_ends_at,
  fixture.cancel_at_period_end,
  fixture.cancellation_requested_at,
  fixture.cancellation_confirmed_at,
  fixture.created_at,
  fixture.created_at
from dashboard_test_clock as clock
cross join lateral (
  values
    (
      '94300000-0000-4000-8000-000000000001'::uuid,
      '94000000-0000-4000-8000-000000000010'::uuid,
      'admin-dashboard-test-active',
      'active',
      clock.month_start - interval '1 month',
      clock.next_month_start + interval '1 month',
      false,
      null::timestamptz,
      null::timestamptz,
      clock.snapshot_at - interval '1 hour'
    ),
    (
      '94300000-0000-4000-8000-000000000002'::uuid,
      '94000000-0000-4000-8000-000000000002'::uuid,
      'admin-dashboard-test-canceling',
      'cancel_at_period_end',
      clock.month_start - interval '1 month',
      clock.next_month_start + interval '1 month',
      true,
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 3),
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 2),
      clock.snapshot_at - interval '2 hours'
    ),
    (
      '94300000-0000-4000-8000-000000000003'::uuid,
      '94000000-0000-4000-8000-000000000003'::uuid,
      'admin-dashboard-test-recent-3',
      'expired',
      clock.snapshot_at - interval '2 months',
      clock.snapshot_at - interval '1 month',
      false,
      null::timestamptz,
      null::timestamptz,
      clock.snapshot_at - interval '3 hours'
    ),
    (
      '94300000-0000-4000-8000-000000000004'::uuid,
      '94000000-0000-4000-8000-000000000004'::uuid,
      'admin-dashboard-test-recent-4',
      'expired',
      null::timestamptz,
      null::timestamptz,
      false,
      null::timestamptz,
      null::timestamptz,
      clock.snapshot_at - interval '4 hours'
    ),
    (
      '94300000-0000-4000-8000-000000000005'::uuid,
      '94000000-0000-4000-8000-000000000005'::uuid,
      'admin-dashboard-test-recent-5',
      'refunded',
      null::timestamptz,
      null::timestamptz,
      false,
      null::timestamptz,
      null::timestamptz,
      clock.snapshot_at - interval '5 hours'
    ),
    (
      '94300000-0000-4000-8000-000000000006'::uuid,
      '94000000-0000-4000-8000-000000000006'::uuid,
      'admin-dashboard-test-recent-6',
      'chargeback',
      null::timestamptz,
      null::timestamptz,
      false,
      null::timestamptz,
      null::timestamptz,
      clock.snapshot_at - interval '6 hours'
    )
) as fixture(
  id,
  user_id,
  external_reference,
  status,
  access_starts_at,
  access_ends_at,
  cancel_at_period_end,
  cancellation_requested_at,
  cancellation_confirmed_at,
  created_at
);

insert into public.billing_payments (
  id,
  contract_id,
  asaas_payment_id,
  status,
  value_cents,
  confirmed_at,
  received_at
)
select
  fixture.id,
  '94300000-0000-4000-8000-000000000001',
  fixture.asaas_payment_id,
  fixture.status,
  fixture.value_cents,
  fixture.confirmed_at,
  fixture.received_at
from dashboard_test_clock as clock
cross join lateral (
  values
    (
      '94400000-0000-4000-8000-000000000001'::uuid,
      'admin-dashboard-test-payment-confirmed',
      'confirmed',
      1000::bigint,
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 3),
      null::timestamptz
    ),
    (
      '94400000-0000-4000-8000-000000000002'::uuid,
      'admin-dashboard-test-payment-received',
      'received',
      2000::bigint,
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 4),
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 2)
    ),
    (
      '94400000-0000-4000-8000-000000000003'::uuid,
      'admin-dashboard-test-payment-refunded',
      'refunded',
      4000::bigint,
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 4),
      clock.month_start + ((clock.snapshot_at - clock.month_start) / 2)
    )
) as fixture(
  id,
  asaas_payment_id,
  status,
  value_cents,
  confirmed_at,
  received_at
);

create temporary table dashboard_authorized_snapshot (
  payload jsonb not null
);

create temporary table dashboard_recent_subscriptions (
  payload jsonb not null
);

grant insert on dashboard_authorized_snapshot to authenticated;
grant insert on dashboard_recent_subscriptions to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into dashboard_authorized_snapshot (payload)
select public.get_admin_dashboard_v1();

insert into dashboard_recent_subscriptions (payload)
select public.list_admin_recent_subscriptions_v1('all', 'all', 'all');

reset role;

select is(
  jsonb_array_length((select payload from dashboard_recent_subscriptions)),
  3,
  'only contracts that granted access appear as subscriptions'
);

select is_empty(
  $$
    select value
    from jsonb_array_elements(
      (select payload from dashboard_recent_subscriptions)
    )
    where value ->> 'id' in (
      '94300000-0000-4000-8000-000000000004',
      '94300000-0000-4000-8000-000000000005',
      '94300000-0000-4000-8000-000000000006'
    )
  $$,
  'checkout attempts without an access interval are excluded'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

select is(
  jsonb_array_length(
    public.list_admin_recent_subscriptions_v1('30d', 'monthly', 'active')
  ),
  2,
  'active filters are applied before the five-row limit'
);

select is(
  jsonb_array_length(
    public.list_admin_recent_subscriptions_v1('all', 'all', 'ended')
  ),
  1,
  'ended means the contract no longer grants access'
);

reset role;

select is(
  jsonb_typeof((select payload from dashboard_authorized_snapshot)),
  'object',
  'authorized administrator receives one JSON object'
);

select is(
  jsonb_array_length(
    (select payload from dashboard_authorized_snapshot) -> 'revenueHistory'
  ),
  12,
  'revenue history always contains twelve zero-filled buckets'
);

select is(
  jsonb_array_length(
    (select payload from dashboard_authorized_snapshot) -> 'userGrowth'
  ),
  6,
  'user growth always contains six zero-filled buckets'
);

select ok(
  jsonb_array_length(
    (select payload from dashboard_authorized_snapshot)
      -> 'recentSubscriptions'
  ) <= 5,
  'recent subscriptions are capped at five'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,newUsers,today}'
  )::bigint,
  (
    select count(*)
    from auth.users as app_user
    cross join dashboard_test_clock as clock
    where app_user.id <> '94000000-0000-4000-8000-000000000001'
      and app_user.created_at >= clock.day_start
      and app_user.created_at <= clock.snapshot_at
  ),
  'the administrator is excluded and the day boundary is inclusive'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,newUsers,week}'
  )::bigint,
  (
    select count(*)
    from auth.users as app_user
    cross join dashboard_test_clock as clock
    where app_user.id <> '94000000-0000-4000-8000-000000000001'
      and app_user.created_at >= clock.week_start
      and app_user.created_at <= clock.snapshot_at
  ),
  'the week starts on Monday in Sao Paulo and excludes the prior microsecond'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,newUsers,month}'
  )::bigint,
  (
    select count(*)
    from auth.users as app_user
    cross join dashboard_test_clock as clock
    where app_user.id <> '94000000-0000-4000-8000-000000000001'
      and app_user.created_at >= clock.month_start
      and app_user.created_at <= clock.snapshot_at
  ),
  'the month uses Sao Paulo boundaries and excludes the prior microsecond'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,activeUsers}'
  )::bigint,
  2::bigint,
  'only non-admin users signed in during the trailing thirty days are active'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,freeDiagnoses}'
  )::bigint,
  1::bigint,
  'only free diagnoses contribute to the free total'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,activeSubscriptions}'
  )::bigint,
  2::bigint,
  'active and scheduled-cancellation access are both counted'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,canceledSubscriptions}'
  )::bigint,
  1::bigint,
  'the current-month confirmed cancellation is counted once'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,monthlyRevenueCents}'
  )::bigint,
  3000::bigint,
  'confirmed and received payments are summed while refunds are excluded'
);

select is(
  (
    (select payload from dashboard_authorized_snapshot)
      #>> '{metrics,cancellationRateBasisPoints}'
  )::integer,
  5000,
  'one cancellation over an opening base of two is fifty percent'
);

select is(
  (select payload from dashboard_authorized_snapshot)
    #>> '{revenueHistory,11,valueCents}',
  '3000',
  'the newest revenue bucket is the current month'
);

select is(
  (select payload from dashboard_authorized_snapshot)
    #>> '{recentSubscriptions,0,email}',
  'newest-dashboard@example.com',
  'recent contracts use deterministic newest-first order'
);

delete from public.billing_payments;
delete from public.billing_contracts;
delete from dashboard_authorized_snapshot;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into dashboard_authorized_snapshot (payload)
select public.get_admin_dashboard_v1();

reset role;

select is(
  (select payload from dashboard_authorized_snapshot)
    #>> '{metrics,cancellationRateBasisPoints}',
  null,
  'a zero opening base returns an unavailable cancellation rate'
);

select * from finish();
rollback;
