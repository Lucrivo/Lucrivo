begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select enum_has_labels(
  'public',
  'business_category',
  array['service', 'product', 'production'],
  'business category contains Service, Product, and Production'
);
select has_table('public', 'production_diagnoses', 'Production detail table exists');
select columns_are(
  'public',
  'production_diagnoses',
  array[
    'diagnosis_id',
    'submission_id',
    'user_id',
    'cost_composition_enabled',
    'production_unit_cost_cents',
    'material_unit_cost_cents',
    'packaging_unit_cost_cents',
    'direct_labor_unit_cost_cents',
    'other_variable_unit_cost_cents',
    'unit_sale_price_cents',
    'fixed_monthly_expenses_cents',
    'monthly_sales_volume',
    'pro_labore_included',
    'pro_labore_cents',
    'tax_rate_basis_points',
    'card_fee_rate_basis_points'
  ],
  'Production detail exposes only the approved columns'
);
select col_is_pk(
  'public',
  'production_diagnoses',
  'diagnosis_id',
  'generic diagnosis id is the Production primary key'
);
select fk_ok(
  'public',
  'production_diagnoses',
  'diagnosis_id',
  'public',
  'diagnoses',
  'id',
  'Production detail links to the generic report'
);
select fk_ok(
  'public',
  'production_diagnoses',
  'user_id',
  'auth',
  'users',
  'id',
  'Production detail links to its authenticated owner'
);
select col_type_is(
  'public',
  'production_diagnoses',
  'monthly_sales_volume',
  'integer',
  'monthly volume uses PostgreSQL integer'
);
select col_is_null(
  'public',
  'production_diagnoses',
  'monthly_sales_volume',
  'monthly volume is optional'
);
select ok(
  (
    select jsonb_agg(to_jsonb(conname) order by conname)
    from pg_constraint
    where conrelid = 'public.production_diagnoses'::regclass
      and contype = 'c'
  ) = $json$
    [
      "production_diagnoses_card_fee_check",
      "production_diagnoses_cost_shape_check",
      "production_diagnoses_fixed_expenses_check",
      "production_diagnoses_prices_check",
      "production_diagnoses_pro_labore_shape_check",
      "production_diagnoses_tax_check",
      "production_diagnoses_volume_check"
    ]
  $json$::jsonb,
  'Production detail has every approved check constraint'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.production_diagnoses'::regclass
      and conname = 'production_diagnoses_user_submission_key'
      and contype = 'u'
  ),
  'Production submission id is unique per owner'
);
select ok(
  (
    select indkey[0] = (
      select attnum
      from pg_attribute
      where attrelid = 'public.production_diagnoses'::regclass
        and attname = 'user_id'
    )
    from pg_index
    where indexrelid =
      'public.production_diagnoses_user_submission_key'::regclass
  ),
  'Production retry index starts with user id for owned reads'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_class
    where oid = 'public.production_diagnoses'::regclass
  $$,
  array[true],
  'Production detail has row level security enabled'
);
select ok(
  (
    select array_agg(policyname::text order by policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'production_diagnoses'
  ) = array['production_diagnoses_select_own']::text[],
  'Production detail exposes only the owned-read policy'
);
select ok(
  not has_table_privilege('anon', 'public.production_diagnoses', 'select'),
  'anon cannot select Production details'
);
select ok(
  not has_table_privilege('anon', 'public.production_diagnoses', 'insert'),
  'anon cannot insert Production details'
);
select ok(
  not has_table_privilege('anon', 'public.production_diagnoses', 'update'),
  'anon cannot update Production details'
);
select ok(
  not has_table_privilege('anon', 'public.production_diagnoses', 'delete'),
  'anon cannot delete Production details'
);
select ok(
  has_table_privilege('authenticated', 'public.production_diagnoses', 'select'),
  'authenticated can select Production details through RLS'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.production_diagnoses',
    'insert'
  ),
  'authenticated cannot insert Production details directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.production_diagnoses',
    'update'
  ),
  'authenticated cannot update immutable Production details'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.production_diagnoses',
    'delete'
  ),
  'authenticated cannot delete Production details'
);

select has_function(
  'public',
  'create_production_diagnosis_report',
  array[
    'uuid',
    'boolean',
    'bigint',
    'bigint',
    'bigint',
    'bigint',
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
  'atomic Production report creation function exists'
);
select ok(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.create_production_diagnosis_report(
      uuid, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
      integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
  ),
  'Production report RPC is security definer'
);
select ok(
  (
    select proconfig
    from pg_proc
    where oid = 'public.create_production_diagnosis_report(
      uuid, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
      integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
  ) = array['search_path=""']::text[],
  'Production report RPC has empty search path'
);
select ok(
  not exists (
    select 1
    from pg_proc as p
    cross join lateral aclexplode(
      coalesce(p.proacl, acldefault('f', p.proowner))
    ) as privilege
    where p.oid = 'public.create_production_diagnosis_report(
      uuid, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
      integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute Production report creation'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_production_diagnosis_report(
      uuid, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
      integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )',
    'execute'
  ),
  'anon cannot execute Production report creation'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_production_diagnosis_report(
      uuid, boolean, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
      integer, boolean, bigint, integer, integer,
      smallint, smallint, smallint, text, bigint, integer, bigint,
      text, text, text, jsonb
    )',
    'execute'
  ),
  'authenticated can execute Production report creation'
);

insert into auth.users (id, aud, role, email)
values
  (
    '55555555-5555-4555-8555-555555555555',
    'authenticated',
    'authenticated',
    'production-one@example.com'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'authenticated',
    'authenticated',
    'production-two@example.com'
  );

create function pg_temp.complete_production_snapshot()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'calculationVersion', 1,
    'contentVersion', 1,
    'category', 'production',
    'scenario', 'manufacturing',
    'currency', 'BRL',
    'unit', 'unit',
    'policy', jsonb_build_object('targetMarginBasisPoints', 2000),
    'inputs', jsonb_build_object(
      'costCompositionEnabled', true,
      'productionUnitCostCents', 5000,
      'materialUnitCostCents', 3000,
      'packagingUnitCostCents', 500,
      'directLaborUnitCostCents', 1000,
      'otherVariableUnitCostCents', 500,
      'unitSalePriceCents', 10000,
      'fixedMonthlyExpensesCents', 100000,
      'monthlySalesVolume', 100,
      'proLaboreIncluded', true,
      'proLaboreCents', 200000,
      'taxRateBasisPoints', 600,
      'cardFeeRateBasisPoints', 200
    ),
    'results', jsonb_build_object(
      'productionUnitCostCents', 5000,
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

create function pg_temp.partial_production_snapshot()
returns jsonb
language sql
immutable
as $$
  select jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    pg_temp.complete_production_snapshot(),
                    '{inputs,costCompositionEnabled}',
                    'false'::jsonb
                  ),
                  '{inputs,materialUnitCostCents}',
                  'null'::jsonb
                ),
                '{inputs,packagingUnitCostCents}',
                'null'::jsonb
              ),
              '{inputs,directLaborUnitCostCents}',
              'null'::jsonb
            ),
            '{inputs,otherVariableUnitCostCents}',
            'null'::jsonb
          ),
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
  ) || jsonb_build_object(
    'results',
    (pg_temp.complete_production_snapshot() -> 'results') || jsonb_build_object(
      'realMarginBasisPoints', null,
      'unitProfitCents', null
    )
  );
$$;

create function pg_temp.create_production_report(
  p_submission_id uuid,
  p_cost_composition_enabled boolean default true,
  p_production_unit_cost_cents bigint default 5000,
  p_material_unit_cost_cents bigint default 3000,
  p_packaging_unit_cost_cents bigint default 500,
  p_direct_labor_unit_cost_cents bigint default 1000,
  p_other_variable_unit_cost_cents bigint default 500,
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
  p_scenario text default 'manufacturing',
  p_current_price_cents bigint default 10000,
  p_real_margin_basis_points integer default 1200,
  p_unit_profit_cents bigint default 1200,
  p_verdict text default 'tight_margin',
  p_priority text default 'margin',
  p_unit text default 'unit',
  p_report_snapshot jsonb default pg_temp.complete_production_snapshot()
)
returns bigint
language sql
as $$
  select public.create_production_diagnosis_report(
    p_submission_id,
    p_cost_composition_enabled,
    p_production_unit_cost_cents,
    p_material_unit_cost_cents,
    p_packaging_unit_cost_cents,
    p_direct_labor_unit_cost_cents,
    p_other_variable_unit_cost_cents,
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
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  null,
  'anon execution is denied by function privileges'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000002'
  ) $$,
  '42501',
  'authentication required',
  'Production RPC requires a JWT subject'
);

select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);
select lives_ok(
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000003'
  ) $$,
  'authenticated owner creates a complete Production report'
);
select lives_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000004',
    p_cost_composition_enabled => false,
    p_material_unit_cost_cents => null,
    p_packaging_unit_cost_cents => null,
    p_direct_labor_unit_cost_cents => null,
    p_other_variable_unit_cost_cents => null,
    p_monthly_sales_volume => null,
    p_pro_labore_included => false,
    p_pro_labore_cents => 0,
    p_real_margin_basis_points => null,
    p_unit_profit_cents => null,
    p_report_snapshot => pg_temp.partial_production_snapshot()
  ) $$,
  'authenticated owner creates a partial Production report'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses d
    join public.production_diagnoses p on p.diagnosis_id = d.id
    where d.submission_id in (
      '70000000-0000-4000-8000-000000000003',
      '70000000-0000-4000-8000-000000000004'
    )
      and d.business_category = 'production'
      and d.scenario = 'manufacturing'
      and p.user_id = d.user_id
      and p.submission_id = d.submission_id
  $$,
  array[2::bigint],
  'complete and partial calls each create one linked Production detail'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000005',
    p_cost_composition_enabled => false,
    p_packaging_unit_cost_cents => null,
    p_direct_labor_unit_cost_cents => null,
    p_other_variable_unit_cost_cents => null,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            pg_temp.complete_production_snapshot(),
            '{inputs,costCompositionEnabled}',
            'false'::jsonb
          ),
          '{inputs,packagingUnitCostCents}',
          'null'::jsonb
        ),
        '{inputs,directLaborUnitCostCents}',
        'null'::jsonb
      ),
      '{inputs,otherVariableUnitCostCents}',
      'null'::jsonb
    )
  ) $$,
  '23514',
  null,
  'summarized cost rejects non-null components'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000006',
    p_material_unit_cost_cents => null,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,materialUnitCostCents}',
      'null'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a null component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000007',
    p_material_unit_cost_cents => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,materialUnitCostCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a negative component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000008',
    p_other_variable_unit_cost_cents => 501,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,otherVariableUnitCostCents}',
      '501'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed total must equal the exact component sum'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id between
      '70000000-0000-4000-8000-000000000005' and
      '70000000-0000-4000-8000-000000000008'
  $$,
  array[0::bigint],
  'cost-shape failures roll back generic reports atomically'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000059',
    p_packaging_unit_cost_cents => null,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,packagingUnitCostCents}',
      'null'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a null packaging component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000060',
    p_direct_labor_unit_cost_cents => null,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,directLaborUnitCostCents}',
      'null'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a null direct labor component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000061',
    p_other_variable_unit_cost_cents => null,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,otherVariableUnitCostCents}',
      'null'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a null other variable component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000062',
    p_packaging_unit_cost_cents => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,packagingUnitCostCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a negative packaging component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000063',
    p_direct_labor_unit_cost_cents => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,directLaborUnitCostCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a negative direct labor component'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000064',
    p_other_variable_unit_cost_cents => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,otherVariableUnitCostCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'composed cost rejects a negative other variable component'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id between
      '70000000-0000-4000-8000-000000000059' and
      '70000000-0000-4000-8000-000000000064'
  $$,
  array[0::bigint],
  'every component-shape failure rolls back the generic report'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000010',
    p_production_unit_cost_cents => 0,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_production_snapshot(),
        '{inputs,productionUnitCostCents}',
        '0'::jsonb
      ),
      '{results,productionUnitCostCents}',
      '0'::jsonb
    )
  ) $$,
  '23514',
  null,
  'production cost must be positive'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000011',
    p_unit_sale_price_cents => 0,
    p_current_price_cents => 0,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_production_snapshot(),
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
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000012',
    p_fixed_monthly_expenses_cents => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,fixedMonthlyExpensesCents}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'fixed expenses cannot be negative'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000013',
    p_monthly_sales_volume => 0,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,monthlySalesVolume}',
      '0'::jsonb
    )
  ) $$,
  '23514',
  null,
  'present monthly volume must be positive'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000014',
    p_pro_labore_included => false,
    p_pro_labore_cents => 1,
    p_report_snapshot => jsonb_set(
      jsonb_set(
        pg_temp.complete_production_snapshot(),
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
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000015',
    p_pro_labore_cents => 0,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,proLaboreCents}',
      '0'::jsonb
    )
  ) $$,
  '23514',
  null,
  'enabled owner compensation must be positive'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000016',
    p_tax_rate_basis_points => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,taxRateBasisPoints}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'tax cannot be negative'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000017',
    p_tax_rate_basis_points => 10001,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,taxRateBasisPoints}',
      '10001'::jsonb
    )
  ) $$,
  '23514',
  null,
  'tax cannot exceed one hundred percent'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000018',
    p_card_fee_rate_basis_points => -1,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,cardFeeRateBasisPoints}',
      '-1'::jsonb
    )
  ) $$,
  '23514',
  null,
  'card fee cannot be negative'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000019',
    p_card_fee_rate_basis_points => 10001,
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
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
      '70000000-0000-4000-8000-000000000010' and
      '70000000-0000-4000-8000-000000000019'
  $$,
  array[0::bigint],
  'all Production detail constraint failures roll back generic reports'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000020',
    p_schema_version => 2::smallint
  ) $$,
  '22023',
  'invalid production report snapshot',
  'schema version mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000021',
    p_calculation_version => 2::smallint
  ) $$,
  '22023',
  'invalid production report snapshot',
  'calculation version mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000022',
    p_content_version => 2::smallint
  ) $$,
  '22023',
  'invalid production report snapshot',
  'content version mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000023',
    p_scenario => 'hour'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'scenario mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000024',
    p_unit => 'hour'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'unit mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000025',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{category}',
      '"service"'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'category mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000053',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,costCompositionEnabled}',
      'false'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'cost composition flag mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000054',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,materialUnitCostCents}',
      '3001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'material cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000055',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,packagingUnitCostCents}',
      '501'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'packaging cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000056',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,directLaborUnitCostCents}',
      '1001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'direct labor cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000057',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,otherVariableUnitCostCents}',
      '501'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'other variable cost mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000026',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,productionUnitCostCents}',
      '5001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'production cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000027',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,unitSalePriceCents}',
      '10001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'sale price mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000028',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,fixedMonthlyExpensesCents}',
      '100001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'fixed expenses mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000029',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,monthlySalesVolume}',
      '101'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'monthly volume mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000030',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,proLaboreIncluded}',
      'false'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'owner compensation flag mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000031',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,proLaboreCents}',
      '200001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'owner compensation amount mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000032',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,taxRateBasisPoints}',
      '601'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'tax mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000033',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{inputs,cardFeeRateBasisPoints}',
      '201'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'card fee mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000034',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{results,productionUnitCostCents}',
      '5001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'result production cost mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000035',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{results,currentPriceCents}',
      '10001'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'result current price mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000036',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{results,realMarginBasisPoints}',
      '1201'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'result real margin mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000037',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{results,unitProfitCents}',
      '1201'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'result unit profit mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000038',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{results,verdict}',
      '"adequate_margin"'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'result verdict mismatch is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000039',
    p_report_snapshot => jsonb_set(
      pg_temp.complete_production_snapshot(),
      '{results,priority}',
      '"volume"'::jsonb
    )
  ) $$,
  '22023',
  'invalid production report snapshot',
  'result priority mismatch is rejected'
);

select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000040',
    p_report_snapshot => '[]'::jsonb
  ) $$,
  '22023',
  'invalid production report snapshot',
  'non-object Production snapshot is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000041',
    p_report_snapshot => pg_temp.complete_production_snapshot() - 'inputs'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'Production snapshot without an inputs object is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000042',
    p_report_snapshot => pg_temp.complete_production_snapshot() - 'results'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'Production snapshot without a results object is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000043',
    p_report_snapshot => pg_temp.complete_production_snapshot() - 'executiveSummary'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'Production snapshot without an executive summary object is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000044',
    p_report_snapshot => pg_temp.complete_production_snapshot() - 'sections'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'Production snapshot without sections is rejected'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    p_submission_id => '70000000-0000-4000-8000-000000000045',
    p_report_snapshot =>
      pg_temp.complete_production_snapshot() - 'discountSimulationBase'
  ) $$,
  '22023',
  'invalid production report snapshot',
  'Production snapshot without a discount base is rejected'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.production_diagnoses
    where user_id = '55555555-5555-4555-8555-555555555555'
      and submission_id = '70000000-0000-4000-8000-000000000003'
  $$,
  array[1::bigint],
  'owner can select their Production detail'
);
select throws_ok(
  $$
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
    ) values (
      1,
      '70000000-0000-4000-8000-000000000046',
      '55555555-5555-4555-8555-555555555555',
      true,
      5000,
      3000,
      500,
      1000,
      500,
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
  'authenticated cannot insert Production detail directly'
);
select throws_ok(
  $$
    update public.production_diagnoses
    set unit_sale_price_cents = 12000
    where submission_id = '70000000-0000-4000-8000-000000000003'
  $$,
  '42501',
  null,
  'authenticated cannot update Production detail directly'
);
select throws_ok(
  $$
    delete from public.production_diagnoses
    where submission_id = '70000000-0000-4000-8000-000000000003'
  $$,
  '42501',
  null,
  'authenticated cannot delete Production detail directly'
);

select lives_ok(
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000050'
  ) $$,
  'first same-category submission creates a Production report'
);
select results_eq(
  $$
    select pg_temp.create_production_report(
      '70000000-0000-4000-8000-000000000050'
    )
  $$,
  $$
    select id
    from public.diagnoses
    where submission_id = '70000000-0000-4000-8000-000000000050'
  $$,
  'same-category retry returns the original generic report id'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.production_diagnoses
    where submission_id = '70000000-0000-4000-8000-000000000050'
  $$,
  array[1::bigint],
  'same-category retry keeps exactly one Production detail'
);

select lives_ok(
  $$
    select public.create_service_diagnosis_report(
      '70000000-0000-4000-8000-000000000051',
      'hour'::public.service_pricing_method,
      400000,
      200000,
      6000,
      5::smallint,
      10000,
      0,
      0,
      0,
      600,
      200,
      2::smallint,
      1::smallint,
      2::smallint,
      'hour',
      10000,
      1700,
      1360,
      'adequate_margin',
      'volume',
      'hour',
      '{
        "schemaVersion": 2,
        "calculationVersion": 1,
        "contentVersion": 2,
        "category": "service",
        "scenario": "hour",
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
    where d.submission_id = '70000000-0000-4000-8000-000000000051'
  $$,
  array[1::bigint],
  'existing Service RPC still creates one linked Service detail'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000051'
  ) $$,
  '23505',
  'submission id belongs to another diagnosis',
  'Service-owned submission id cannot be reused for Production'
);

select lives_ok(
  $$
    select public.create_product_diagnosis_report(
      '70000000-0000-4000-8000-000000000058',
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
      1::smallint,
      'resale',
      10000,
      1200,
      1200,
      'tight_margin',
      'margin',
      'unit',
      '{
        "schemaVersion": 1,
        "calculationVersion": 1,
        "contentVersion": 1,
        "category": "product",
        "scenario": "resale",
        "currency": "BRL",
        "unit": "unit",
        "inputs": {
          "purchaseUnitCostCents": 5000,
          "unitSalePriceCents": 10000,
          "fixedMonthlyExpensesCents": 100000,
          "monthlySalesVolume": 100,
          "proLaboreIncluded": true,
          "proLaboreCents": 200000,
          "taxRateBasisPoints": 600,
          "cardFeeRateBasisPoints": 200
        },
        "results": {
          "purchaseUnitCostCents": 5000,
          "currentPriceCents": 10000,
          "realMarginBasisPoints": 1200,
          "unitProfitCents": 1200,
          "verdict": "tight_margin",
          "priority": "margin"
        },
        "executiveSummary": {},
        "sections": [],
        "discountSimulationBase": {}
      }'::jsonb
    )
  $$,
  'existing Product RPC still creates a report'
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000058'
  ) $$,
  '23505',
  'submission id belongs to another diagnosis',
  'Product-owned submission id cannot be reused for Production'
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
  '70000000-0000-4000-8000-000000000052',
  '55555555-5555-4555-8555-555555555555',
  'production',
  'manufacturing',
  1,
  1,
  1,
  10000,
  1200,
  1200,
  'tight_margin',
  'margin',
  'unit',
  pg_temp.complete_production_snapshot()
);
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);
select throws_ok(
  $$ select pg_temp.create_production_report(
    '70000000-0000-4000-8000-000000000052'
  ) $$,
  '23505',
  'submission id belongs to another diagnosis',
  'Production generic row without Production detail fails closed on retry'
);

select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);
select results_eq(
  $$
    select count(*)::bigint
    from public.production_diagnoses
    where submission_id = '70000000-0000-4000-8000-000000000003'
  $$,
  array[0::bigint],
  'a second user cannot read another owner Production detail'
);

reset role;

select * from finish();

rollback;
