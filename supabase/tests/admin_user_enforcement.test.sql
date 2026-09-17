begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'current_account_is_eligible',
  array[]::text[],
  'caller-scoped account eligibility RPC exists'
);
select has_function(
  'private',
  'has_report_entitlement_for_user',
  array['uuid', 'timestamp with time zone'],
  'report entitlement combines verified payment and courtesy'
);
select has_function(
  'public',
  'current_courtesy_access_expires_at',
  array[]::text[],
  'caller-scoped courtesy expiry RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.current_account_is_eligible()',
    'execute'
  ),
  'anonymous callers cannot query account eligibility'
);

insert into auth.users (id, aud, role, email, created_at)
values
  (
    '96100000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'blocked-fixture@example.com',
    statement_timestamp()
  ),
  (
    '96100000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'courtesy-fixture@example.com',
    statement_timestamp()
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
  verdict,
  priority,
  unit,
  report_snapshot,
  is_free_report
)
values (
  '96110000-0000-4000-8000-000000000001',
  '96100000-0000-4000-8000-000000000001',
  'service',
  'hour',
  4,
  3,
  5,
  1000,
  'adequate_margin',
  'price',
  'hour',
  '{}'::jsonb,
  true
);

insert into public.billing_prices (
  id, product_code, billing_mode, version, amount_cents, currency, access_months
)
values (
  '96120000-0000-4000-8000-000000000001',
  'admin-user-enforcement-fixture',
  'monthly',
  1,
  1000,
  'BRL',
  1
);

insert into public.billing_contracts (
  id, user_id, price_id, external_reference, billing_mode,
  payment_method, charge_type, amount_cents, currency, access_months,
  status, access_starts_at, access_ends_at
)
values (
  '96130000-0000-4000-8000-000000000001',
  '96100000-0000-4000-8000-000000000001',
  '96120000-0000-4000-8000-000000000001',
  'admin-user-enforcement-contract',
  'monthly',
  'credit_card',
  'recurring',
  1000,
  'BRL',
  1,
  'expired',
  statement_timestamp() - interval '2 months',
  statement_timestamp() - interval '1 month'
);

insert into public.billing_payments (
  id, contract_id, asaas_payment_id, status, value_cents
)
values (
  '96140000-0000-4000-8000-000000000001',
  '96130000-0000-4000-8000-000000000001',
  'admin-user-enforcement-payment',
  'confirmed',
  1000
);

insert into private.admin_user_state (
  user_id,
  blocked_at,
  courtesy_expires_at
)
values
  (
    '96100000-0000-4000-8000-000000000001',
    statement_timestamp(),
    null
  ),
  (
    '96100000-0000-4000-8000-000000000002',
    null,
    statement_timestamp() + interval '7 days'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96100000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.current_account_is_eligible(),
  false,
  'blocked user is denied with an existing JWT'
);
select is(
  (select count(*) from public.diagnoses),
  0::bigint,
  'blocked user cannot read even the free diagnosis'
);
select is(
  (select count(*) from public.billing_contracts),
  0::bigint,
  'blocked user cannot read a historical billing contract'
);
select is(
  (select count(*) from public.billing_payments),
  0::bigint,
  'blocked user cannot read a historical payment'
);
reset role;

select is(
  (
    select count(*)
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'private'
      and routine.proname in (
        'create_service_diagnosis_report_v4_impl',
        'create_product_diagnosis_report_impl',
        'create_product_diagnosis_report_v2_impl',
        'create_production_diagnosis_report_impl',
        'create_production_diagnosis_report_v2_impl'
      )
      and pg_catalog.pg_get_functiondef(routine.oid)
        like '%not private.account_is_eligible()%'
      and pg_catalog.pg_get_functiondef(routine.oid)
        like '%private.has_report_entitlement_for_user%'
  ),
  5::bigint,
  'all report creation implementations check eligibility and courtesy'
);

select throws_ok(
  $sql$
    insert into public.diagnoses (
      submission_id, user_id, business_category, scenario,
      schema_version, calculation_version, content_version,
      current_price_cents, verdict, priority, unit,
      report_snapshot, is_free_report
    )
    values (
      '96110000-0000-4000-8000-000000000002',
      '96100000-0000-4000-8000-000000000001',
      'service', 'hour', 4, 3, 5,
      1000, 'adequate_margin', 'price', 'hour',
      '{}'::jsonb, false
    )
  $sql$,
  '42501',
  'account unavailable',
  'blocked JWT cannot write a report even through a privileged path'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96100000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96100000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select ok(
  public.current_account_is_eligible(),
  'courtesy user remains eligible'
);
select ok(
  private.has_report_entitlement_for_user(
    '96100000-0000-4000-8000-000000000002',
    statement_timestamp()
  ),
  'courtesy grants report entitlement'
);
select ok(
  public.current_courtesy_access_expires_at() > statement_timestamp(),
  'user can read their own active courtesy expiry'
);
reset role;

select ok(
  not private.has_paid_access_for_user(
    '96100000-0000-4000-8000-000000000002',
    statement_timestamp()
  ),
  'courtesy does not masquerade as a paid contract'
);

update private.admin_user_state
set deleted_at = statement_timestamp()
where user_id = '96100000-0000-4000-8000-000000000002';

set local role authenticated;
select ok(
  not public.current_account_is_eligible(),
  'soft deletion revokes eligibility with an existing JWT'
);
select ok(
  not private.has_report_entitlement_for_user(
    '96100000-0000-4000-8000-000000000002',
    statement_timestamp()
  ),
  'soft deletion revokes courtesy report entitlement'
);
select is(
  public.current_courtesy_access_expires_at(),
  null::timestamptz,
  'soft-deleted account cannot read its courtesy expiry'
);
reset role;

select * from finish();
rollback;
