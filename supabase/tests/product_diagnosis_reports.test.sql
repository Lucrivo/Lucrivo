begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select enum_has_labels(
  'public',
  'business_category',
  array['service', 'product', 'production'],
  'business category contains Service, Product, and Production'
);
select has_table('public', 'product_diagnoses', 'Product detail table exists');
select columns_are(
  'public',
  'product_diagnoses',
  array[
    'diagnosis_id',
    'submission_id',
    'user_id',
    'purchase_unit_cost_cents',
    'unit_sale_price_cents',
    'fixed_monthly_expenses_cents',
    'monthly_sales_volume',
    'pro_labore_included',
    'pro_labore_cents',
    'tax_rate_basis_points',
    'card_fee_rate_basis_points'
  ],
  'Product detail exposes only the approved columns'
);
select col_is_pk(
  'public',
  'product_diagnoses',
  'diagnosis_id',
  'generic diagnosis id is the Product primary key'
);
select fk_ok(
  'public',
  'product_diagnoses',
  'diagnosis_id',
  'public',
  'diagnoses',
  'id',
  'Product detail links to the generic report'
);
select fk_ok(
  'public',
  'product_diagnoses',
  'user_id',
  'auth',
  'users',
  'id',
  'Product detail links to its authenticated owner'
);
select col_type_is(
  'public',
  'product_diagnoses',
  'monthly_sales_volume',
  'integer',
  'monthly volume uses PostgreSQL integer'
);
select col_is_null(
  'public',
  'product_diagnoses',
  'monthly_sales_volume',
  'monthly volume is optional'
);
select ok(
  (
    select jsonb_agg(to_jsonb(conname) order by conname)
    from pg_constraint
    where conrelid = 'public.product_diagnoses'::regclass
      and contype = 'c'
  ) = $json$
    [
      "product_diagnoses_card_fee_check",
      "product_diagnoses_fixed_expenses_check",
      "product_diagnoses_prices_check",
      "product_diagnoses_pro_labore_shape_check",
      "product_diagnoses_tax_check",
      "product_diagnoses_volume_check"
    ]
  $json$::jsonb,
  'Product detail has every approved check constraint'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_diagnoses'::regclass
      and conname = 'product_diagnoses_user_submission_key'
      and contype = 'u'
  ),
  'Product submission id is unique per owner'
);
select ok(
  (
    select indkey[0] = (
      select attnum
      from pg_attribute
      where attrelid = 'public.product_diagnoses'::regclass
        and attname = 'user_id'
    )
    from pg_index
    where indexrelid =
      'public.product_diagnoses_user_submission_key'::regclass
  ),
  'Product retry index starts with user id for owned reads'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_class
    where oid = 'public.product_diagnoses'::regclass
  $$,
  array[true],
  'Product detail has row level security enabled'
);
select ok(
  (
    select array_agg(policyname::text order by policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_diagnoses'
  ) = array['product_diagnoses_select_own']::text[],
  'Product detail exposes only the owned-read policy'
);
select ok(
  not has_table_privilege('anon', 'public.product_diagnoses', 'select'),
  'anon cannot select Product details'
);
select ok(
  not has_table_privilege('anon', 'public.product_diagnoses', 'insert'),
  'anon cannot insert Product details'
);
select ok(
  has_table_privilege('authenticated', 'public.product_diagnoses', 'select'),
  'authenticated can select Product details through RLS'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.product_diagnoses',
    'insert'
  ),
  'authenticated cannot insert Product details directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.product_diagnoses',
    'update'
  ),
  'authenticated cannot update immutable Product details'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.product_diagnoses',
    'delete'
  ),
  'authenticated cannot delete Product details'
);

select has_function(
  'public',
  'create_product_diagnosis_report',
  array[
    'uuid',
    'bigint',
    'bigint',
    'bigint',
    'integer',
    'boolean',
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
  'atomic Product report creation function exists'
);
select ok(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.create_product_diagnosis_report(
      uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
  ),
  'Product report RPC is security definer'
);
select ok(
  (
    select proconfig
    from pg_proc
    where oid = 'public.create_product_diagnosis_report(
      uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
  ) = array['search_path=""']::text[],
  'Product report RPC has empty search path'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_product_diagnosis_report(
      uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )',
    'execute'
  ),
  'anon cannot execute Product report creation'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_product_diagnosis_report(
      uuid, bigint, bigint, bigint, integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )',
    'execute'
  ),
  'authenticated can execute Product report creation'
);

insert into auth.users (id, aud, role, email)
values
  (
    '55555555-5555-4555-8555-555555555555',
    'authenticated',
    'authenticated',
    'product-one@example.com'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'authenticated',
    'authenticated',
    'product-two@example.com'
  );

create function pg_temp.complete_product_snapshot()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'calculationVersion', 1,
    'contentVersion', 1,
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

create function pg_temp.partial_product_snapshot()
returns jsonb
language sql
immutable
as $$
  select jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            pg_temp.complete_product_snapshot(),
            '{inputs,monthlySalesVolume}',
            'null'::jsonb
          ),
          '{inputs,proLaboreIncluded}',
          'false'::jsonb
        ),
        '{inputs,proLaboreCents}',
        '0'::jsonb
      ),
      '{results,realMarginBasisPoints}',
      'null'::jsonb
    ),
    '{results,unitProfitCents}',
    'null'::jsonb
  );
$$;

create function pg_temp.create_product_report(
  p_submission_id uuid,
  p_purchase_unit_cost_cents bigint default 5000,
  p_unit_sale_price_cents bigint default 10000,
  p_fixed_monthly_expenses_cents bigint default 100000,
  p_monthly_sales_volume integer default 100,
  p_pro_labore_included boolean default true,
  p_pro_labore_cents bigint default 200000,
  p_tax_rate_basis_points integer default 600,
  p_card_fee_rate_basis_points integer default 200,
  p_schema_version smallint default 1,
  p_calculation_version smallint default 1,
  p_content_version smallint default 1,
  p_scenario text default 'resale',
  p_current_price_cents bigint default 10000,
  p_real_margin_basis_points integer default 1200,
  p_unit_profit_cents bigint default 1200,
  p_verdict text default 'tight_margin',
  p_priority text default 'margin',
  p_unit text default 'unit',
  p_report_snapshot jsonb default pg_temp.complete_product_snapshot()
)
returns bigint
language sql
as $$
  select public.create_product_diagnosis_report(
    p_submission_id,
    p_purchase_unit_cost_cents,
    p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_sales_volume,
    p_pro_labore_included,
    p_pro_labore_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_scenario,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    p_unit,
    p_report_snapshot
  );
$$;

set local role anon;
select throws_ok(
  $$ select pg_temp.create_product_report(
    '50000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  null,
  'anon execution is denied by function privileges'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select pg_temp.create_product_report(
    '50000000-0000-4000-8000-000000000002'
  ) $$,
  '42501',
  'authentication required',
  'Product RPC requires a JWT subject'
);

select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);
select lives_ok(
  $$ select pg_temp.create_product_report(
    '50000000-0000-4000-8000-000000000003'
  ) $$,
  'authenticated owner creates a complete Product report'
);
select lives_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000004',
    p_monthly_sales_volume => null,
    p_pro_labore_included => false,
    p_pro_labore_cents => 0,
    p_real_margin_basis_points => null,
    p_unit_profit_cents => null,
    p_report_snapshot => pg_temp.partial_product_snapshot()
  ) $$,
  'authenticated owner creates a partial Product report'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses d
    join public.product_diagnoses p on p.diagnosis_id = d.id
    where d.submission_id in (
      '50000000-0000-4000-8000-000000000003',
      '50000000-0000-4000-8000-000000000004'
    )
      and d.business_category = 'product'
      and d.scenario = 'resale'
      and p.user_id = d.user_id
      and p.submission_id = d.submission_id
  $$,
  array[2::bigint],
  'complete and partial calls each create one linked Product detail'
);

select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000009',
    p_purchase_unit_cost_cents => -1,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_product_snapshot(),
        '{inputs,purchaseUnitCostCents}',
        '-1'::jsonb
      ),
      '{results,purchaseUnitCostCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'purchase cost cannot be negative'
);
select lives_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000010',
    p_purchase_unit_cost_cents => 0,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_product_snapshot(),
        '{inputs,purchaseUnitCostCents}',
        '0'::jsonb
      ),
      '{results,purchaseUnitCostCents}',
      '0'::jsonb
    )
  ) $$,
  'purchase cost can be zero for products without direct cost'
);
select results_eq(
  $$
    select purchase_unit_cost_cents
    from public.product_diagnoses
    where submission_id = '50000000-0000-4000-8000-000000000010'
  $$,
  array[0::bigint],
  'zero purchase cost is persisted exactly'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000011',
    p_unit_sale_price_cents => 0,
    p_current_price_cents => 0,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_product_snapshot(),
        '{inputs,unitSalePriceCents}',
        '0'::jsonb
      ),
      '{results,currentPriceCents}',
      '0'::jsonb
    )
  ) $$,
  '23514',
  null,
  'sale price must be positive'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000012',
    p_fixed_monthly_expenses_cents => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,fixedMonthlyExpensesCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'fixed expenses cannot be negative'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000013',
    p_monthly_sales_volume => 0,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,monthlySalesVolume}',
      '0'::jsonb
    )
  ) $$,
  '23514',
  null,
  'present monthly volume must be positive'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000014',
    p_pro_labore_included => false,
    p_pro_labore_cents => 1,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_product_snapshot(),
        '{inputs,proLaboreIncluded}',
        'false'::jsonb
      ),
      '{inputs,proLaboreCents}',
      '1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'disabled owner compensation must be zero'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000015',
    p_pro_labore_cents => 0,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,proLaboreCents}',
      '0'::jsonb
    )
  ) $$,
  '23514',
  null,
  'enabled owner compensation must be positive'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000016',
    p_tax_rate_basis_points => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,taxRateBasisPoints}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'tax cannot be negative'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000017',
    p_tax_rate_basis_points => 10001,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,taxRateBasisPoints}',
      '10001'::jsonb
    )
  ) $$,
  '23514',
  null,
  'tax cannot exceed one hundred percent'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000018',
    p_card_fee_rate_basis_points => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,cardFeeRateBasisPoints}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'card fee cannot be negative'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000019',
    p_card_fee_rate_basis_points => 10001,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,cardFeeRateBasisPoints}',
      '10001'::jsonb
    )
  ) $$,
  '23514',
  null,
  'card fee cannot exceed one hundred percent'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id between
      '50000000-0000-4000-8000-000000000011' and
      '50000000-0000-4000-8000-000000000019'
  $$,
  array[0::bigint],
  'all Product detail constraint failures roll back generic reports'
);

select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000020',
    p_schema_version => 2::smallint
  ) $$,
  '22023',
  'invalid product report snapshot',
  'schema version mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000021',
    p_calculation_version => 2::smallint
  ) $$,
  '22023',
  'invalid product report snapshot',
  'calculation version mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000022',
    p_content_version => 2::smallint
  ) $$,
  '22023',
  'invalid product report snapshot',
  'content version mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000023',
    p_scenario => 'hour'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'scenario mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000024',
    p_unit => 'hour'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'unit mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000025',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{category}',
      '"service"'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'category mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000026',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,purchaseUnitCostCents}',
      '5001'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'purchase cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000027',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,unitSalePriceCents}',
      '10001'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'sale price mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000028',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,fixedMonthlyExpensesCents}',
      '100001'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'fixed expenses mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000029',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,monthlySalesVolume}',
      '101'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'monthly volume mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000030',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,proLaboreIncluded}',
      'false'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'owner compensation flag mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000031',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,proLaboreCents}',
      '200001'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'owner compensation amount mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000032',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,taxRateBasisPoints}',
      '601'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'tax mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000033',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{inputs,cardFeeRateBasisPoints}',
      '201'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'card fee mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000034',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{results,purchaseUnitCostCents}',
      '5001'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'result purchase cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000035',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{results,currentPriceCents}',
      '10001'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'result current price mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000036',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{results,realMarginBasisPoints}',
      '1201'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'result real margin mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000037',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{results,unitProfitCents}',
      '1201'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'result unit profit mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000038',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{results,verdict}',
      '"adequate_margin"'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'result verdict mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000039',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_product_snapshot(),
      '{results,priority}',
      '"volume"'::jsonb
    )
  ) $$,
  '22023',
  'invalid product report snapshot',
  'result priority mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000040',
    p_report_snapshot => '[]'::jsonb
  ) $$,
  '22023',
  'invalid product report snapshot',
  'non-object Product snapshot is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000041',
    p_report_snapshot => pg_temp.complete_product_snapshot() - 'inputs'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'Product snapshot without an inputs object is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000042',
    p_report_snapshot => pg_temp.complete_product_snapshot() - 'results'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'Product snapshot without a results object is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000043',
    p_report_snapshot => pg_temp.complete_product_snapshot() - 'executiveSummary'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'Product snapshot without an executive summary object is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000044',
    p_report_snapshot => pg_temp.complete_product_snapshot() - 'sections'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'Product snapshot without sections is rejected'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    p_submission_id => '50000000-0000-4000-8000-000000000045',
    p_report_snapshot =>
      pg_temp.complete_product_snapshot() - 'discountSimulationBase'
  ) $$,
  '22023',
  'invalid product report snapshot',
  'Product snapshot without a discount base is rejected'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.product_diagnoses
    where user_id = '55555555-5555-4555-8555-555555555555'
      and submission_id = '50000000-0000-4000-8000-000000000003'
  $$,
  array[1::bigint],
  'owner can select their Product detail'
);
select throws_ok(
  $$
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
    ) values (
      1,
      '50000000-0000-4000-8000-000000000046',
      '55555555-5555-4555-8555-555555555555',
      5000,
      10000,
      100000,
      100,
      true,
      200000,
      600,
      200
    )
  $$,
  '42501',
  null,
  'authenticated cannot insert Product detail directly'
);
select throws_ok(
  $$
    update public.product_diagnoses
    set unit_sale_price_cents = 12000
    where submission_id = '50000000-0000-4000-8000-000000000003'
  $$,
  '42501',
  null,
  'authenticated cannot update Product detail directly'
);
select throws_ok(
  $$
    delete from public.product_diagnoses
    where submission_id = '50000000-0000-4000-8000-000000000003'
  $$,
  '42501',
  null,
  'authenticated cannot delete Product detail directly'
);

select lives_ok(
  $$ select pg_temp.create_product_report(
    '50000000-0000-4000-8000-000000000050'
  ) $$,
  'first same-category submission creates a Product report'
);
select results_eq(
  $$
    select pg_temp.create_product_report(
      '50000000-0000-4000-8000-000000000050'
    )
  $$,
  $$
    select id
    from public.diagnoses
    where submission_id = '50000000-0000-4000-8000-000000000050'
  $$,
  'same-category retry returns the original generic report id'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.product_diagnoses
    where submission_id = '50000000-0000-4000-8000-000000000050'
  $$,
  array[1::bigint],
  'same-category retry keeps exactly one Product detail'
);

select lives_ok(
  $$
    select public.create_service_diagnosis_report(
      '50000000-0000-4000-8000-000000000051',
      'hour'::public.service_pricing_method,
      400000,
      200000,
      'month'::public.service_work_hours_period,
      6000,
      6000,
      5::smallint,
      10000,
      0,
      0,
      0,
      0,
      600,
      200,
      3::smallint,
      2::smallint,
      3::smallint,
      'hour',
      10000,
      1700,
      1360,
      'adequate_margin',
      'volume',
      'hour',
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
        "executiveSummary": {"headline": "Diagnóstico de serviço"}
      }'::jsonb
    )
  $$,
  'existing Service RPC still creates a report'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses d
    join public.service_diagnoses s on s.diagnosis_id = d.id
    where d.submission_id = '50000000-0000-4000-8000-000000000051'
  $$,
  array[1::bigint],
  'existing Service RPC still creates one linked Service detail'
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    '50000000-0000-4000-8000-000000000051'
  ) $$,
  '23505',
  'submission id belongs to another diagnosis',
  'Service-owned submission id cannot be reused for Product'
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
  report_snapshot
) values (
  '50000000-0000-4000-8000-000000000052',
  '55555555-5555-4555-8555-555555555555',
  'product',
  'resale',
  1,
  1,
  1,
  10000,
  1200,
  1200,
  'tight_margin',
  'margin',
  'unit',
  pg_temp.complete_product_snapshot()
);
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);
select throws_ok(
  $$ select pg_temp.create_product_report(
    '50000000-0000-4000-8000-000000000052'
  ) $$,
  '23505',
  'submission id belongs to another diagnosis',
  'Product generic row without Product detail fails closed on retry'
);

select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);
select results_eq(
  $$
    select count(*)::bigint
    from public.product_diagnoses
    where submission_id = '50000000-0000-4000-8000-000000000003'
  $$,
  array[0::bigint],
  'a second user cannot read another owner Product detail'
);

reset role;

select * from finish();

rollback;
