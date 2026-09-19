begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

insert into auth.users (id, aud, role, email)
values
  (
    '81000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'report-owner@example.com'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'report-other@example.com'
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
) values (
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'historical-report-access',
  'monthly',
  'pix',
  'detached',
  4990,
  'BRL',
  null,
  1,
  'expired',
  '2020-01-01T00:00:00Z',
  '2021-01-01T00:00:00Z'
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
  real_margin_basis_points,
  unit_profit_cents,
  verdict,
  priority,
  unit,
  report_snapshot,
  is_free_report,
  created_at
) overriding system value values
  (
    81001,
    '81000000-0000-4000-8000-000000000101',
    '81000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"report":81001}',
    false, '2020-06-01T00:00:00Z'
  ),
  (
    81002,
    '81000000-0000-4000-8000-000000000102',
    '81000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"report":81002}',
    false, '2022-06-01T00:00:00Z'
  ),
  (
    81003,
    '81000000-0000-4000-8000-000000000103',
    '81000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"report":81003}',
    true, '2022-06-02T00:00:00Z'
  ),
  (
    81004,
    '81000000-0000-4000-8000-000000000104',
    '81000000-0000-4000-8000-000000000002',
    'product', 'resale', 1, 1, 2, 10000, 1200, 1200,
    'tight_margin', 'margin', 'unit', '{"report":81004}',
    true, '2022-06-02T00:00:00Z'
  ),
  (
    81005,
    '81000000-0000-4000-8000-000000000105',
    '81000000-0000-4000-8000-000000000001',
    'product', 'resale', 3, 3, 4, 20000, 2400, 4800,
    'adequate_margin', 'price', 'unit', '{"report":81005,"staged":true}',
    false, '2022-06-03T00:00:00Z'
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
  diagnosis.id,
  diagnosis.submission_id,
  diagnosis.user_id,
  5000,
  case when diagnosis.id = 81005 then 20000 else 10000 end,
  100000,
  100,
  true,
  200000,
  600,
  200
from public.diagnoses as diagnosis
where diagnosis.id between 81001 and 81005;

select has_column(
  'public',
  'diagnoses',
  'deleted_at',
  'diagnoses have soft-delete metadata'
);

select has_column(
  'public',
  'diagnoses',
  'version',
  'diagnoses have an optimistic version'
);

select has_function(
  'public',
  'soft_delete_owned_diagnosis_v1',
  array['bigint', 'integer'],
  'soft-delete RPC exists'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);

select results_eq(
  $$ select id from public.diagnoses where id = 81001 $$,
  array[81001::bigint],
  'owner reads a report created inside a paid interval after expiry'
);

select is_empty(
  $$ select id from public.diagnoses where id = 81002 $$,
  'a later report does not inherit historical entitlement'
);

select is(
  (select count(*)::bigint from public.product_diagnoses where diagnosis_id = 81001),
  1::bigint,
  'historically entitled child rows remain visible'
);

select is(
  public.soft_delete_owned_diagnosis_v1(81001, 1),
  'conflict',
  'a stale version is rejected'
);

select is(
  public.soft_delete_owned_diagnosis_v1(81001, 0),
  'deleted',
  'owner can soft delete after plan expiry'
);

select is_empty(
  $$ select id from public.diagnoses where id = 81001 $$,
  'a deleted report is hidden through RLS'
);

select is_empty(
  $$ select diagnosis_id from public.product_diagnoses where diagnosis_id = 81001 $$,
  'child rows of a deleted report are hidden through RLS'
);

select is(
  public.soft_delete_owned_diagnosis_v1(81001, 1),
  'not_found',
  'deleting an already deleted report does not reveal it'
);

select is(
  public.soft_delete_owned_diagnosis_v1(81004, 0),
  'not_found',
  'an owner cannot delete another user report'
);

select throws_ok(
  $$ select public.replace_owned_diagnosis_from_staged_v1(81002, 81005, 0) $$,
  '42501',
  'paid access required',
  'report replacement requires current paid access'
);

select is(
  public.soft_delete_owned_diagnosis_v1(81003, 0),
  'deleted',
  'a free report may be soft deleted'
);

reset role;

insert into public.billing_contracts (
  id, user_id, price_id, external_reference, billing_mode,
  payment_method, charge_type, amount_cents, currency, installment_limit,
  access_months, status, access_starts_at, access_ends_at
) values (
  '81000000-0000-4000-8000-000000000011',
  '81000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'current-report-access', 'monthly', 'pix', 'detached', 4990, 'BRL',
  null, 1, 'active',
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '1 month'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);

select is(
  public.replace_owned_diagnosis_from_staged_v1(81002, 81005, 0),
  81002::bigint,
  'validated staged data replaces the target report'
);

reset role;

select is(
  (select created_at from public.diagnoses where id = 81002),
  '2022-06-01T00:00:00Z'::timestamptz,
  'replacement preserves the original creation time'
);

select is(
  (select version from public.diagnoses where id = 81002),
  1,
  'replacement increments the target version'
);

select is(
  (select report_snapshot from public.diagnoses where id = 81002),
  '{"report":81005,"staged":true}'::jsonb,
  'replacement stores the validated staged snapshot on the target'
);

select is(
  (select unit_sale_price_cents from public.product_diagnoses where diagnosis_id = 81002),
  20000::bigint,
  'replacement copies normalized child values'
);

select is_empty(
  $$ select id from public.diagnoses where id = 81005 $$,
  'the transient staged diagnosis is removed'
);

select is(
  (select count(*)::bigint from public.diagnoses where id in (81001, 81003)),
  2::bigint,
  'soft delete keeps physical diagnosis rows'
);

select throws_ok(
  $$
    insert into public.diagnoses (
      submission_id, user_id, business_category, scenario,
      schema_version, calculation_version, content_version,
      current_price_cents, verdict, priority, unit,
      report_snapshot, is_free_report
    ) values (
      '81000000-0000-4000-8000-000000000105',
      '81000000-0000-4000-8000-000000000001',
      'product', 'resale', 1, 1, 2, 10000,
      'tight_margin', 'margin', 'unit', '{}', true
    )
  $$,
  '23505',
  null,
  'deleting a free report does not restore the free benefit'
);

set local role anon;

select throws_ok(
  $$ select public.soft_delete_owned_diagnosis_v1(81004, 0) $$,
  '42501',
  null,
  'anonymous callers cannot execute the soft-delete RPC'
);

reset role;

select * from finish();

rollback;
