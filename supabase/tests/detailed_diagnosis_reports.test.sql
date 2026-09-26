begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select col_default_is(
  'public',
  'diagnoses',
  'analysis_mode',
  'quick',
  'existing report writes default to quick analysis'
);
select col_is_null(
  'public',
  'diagnoses',
  'current_price_cents',
  'the registry permits a null current price for detailed mixes'
);
select has_column(
  'public',
  'diagnoses',
  'monthly_gross_revenue_cents',
  'the registry stores detailed monthly gross revenue'
);
select has_column(
  'public',
  'diagnoses',
  'monthly_result_cents',
  'the registry stores detailed monthly result'
);
select has_column(
  'public',
  'diagnoses',
  'item_count',
  'the registry stores the detailed item count'
);
select has_column(
  'public',
  'diagnoses',
  'is_partial',
  'the registry stores whether the detailed mix is partial'
);

select has_table(
  'public',
  'detailed_diagnoses',
  'normalized detailed parents exist'
);
select has_table(
  'public',
  'detailed_diagnosis_items',
  'normalized detailed items exist'
);
select has_table(
  'public',
  'detailed_diagnosis_ingredients',
  'normalized detailed ingredients exist'
);
select hasnt_column(
  'public',
  'detailed_diagnoses',
  'promotion_margin_basis_points',
  'detailed parents no longer persist the removed promotion margin'
);
select hasnt_column(
  'public',
  'detailed_diagnosis_items',
  'promotion_floor_cents',
  'detailed items no longer persist the removed promotion floor'
);

select col_is_pk(
  'public',
  'detailed_diagnoses',
  'diagnosis_id',
  'the registry diagnosis id is the detailed parent key'
);
select fk_ok(
  'public',
  'detailed_diagnoses',
  'diagnosis_id',
  'public',
  'diagnoses',
  'id',
  'the detailed parent references the report registry'
);
select fk_ok(
  'public',
  'detailed_diagnosis_items',
  'diagnosis_id',
  'public',
  'detailed_diagnoses',
  'diagnosis_id',
  'detailed items reference their parent'
);
select fk_ok(
  'public',
  'detailed_diagnosis_ingredients',
  array['diagnosis_id', 'client_item_id'],
  'public',
  'detailed_diagnosis_items',
  array['diagnosis_id', 'client_item_id'],
  'ingredients reference their stable item UUID'
);

select results_eq(
  $$
    select relrowsecurity
    from pg_class
    where oid in (
      'public.detailed_diagnoses'::regclass,
      'public.detailed_diagnosis_items'::regclass,
      'public.detailed_diagnosis_ingredients'::regclass
    )
    order by oid
  $$,
  array[true, true, true],
  'all detailed tables enable row level security'
);
select ok(
  has_table_privilege('authenticated', 'public.detailed_diagnoses', 'select')
  and has_table_privilege(
    'authenticated', 'public.detailed_diagnosis_items', 'select'
  )
  and has_table_privilege(
    'authenticated', 'public.detailed_diagnosis_ingredients', 'select'
  ),
  'authenticated users receive read access through RLS'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.detailed_diagnoses', 'insert'
  )
  and not has_table_privilege(
    'authenticated', 'public.detailed_diagnosis_items', 'insert'
  )
  and not has_table_privilege(
    'authenticated', 'public.detailed_diagnosis_ingredients', 'insert'
  ),
  'authenticated users cannot insert normalized rows directly'
);

select has_function(
  'public',
  'create_detailed_diagnosis_report',
  array[
    'uuid', 'business_category', 'bigint', 'boolean', 'bigint', 'integer',
    'integer', 'jsonb', 'smallint', 'smallint', 'smallint',
    'bigint', 'bigint', 'integer', 'text', 'text', 'integer', 'boolean',
    'jsonb'
  ],
  'the atomic detailed report RPC exists'
);
select hasnt_function(
  'public',
  'create_detailed_diagnosis_report',
  array[
    'uuid', 'business_category', 'bigint', 'boolean', 'bigint', 'integer',
    'integer', 'integer', 'jsonb', 'smallint', 'smallint', 'smallint',
    'bigint', 'bigint', 'integer', 'text', 'text', 'integer', 'boolean',
    'jsonb'
  ],
  'the obsolete public RPC overload is removed'
);
select hasnt_function(
  'private',
  'create_detailed_diagnosis_report_impl',
  array[
    'uuid', 'business_category', 'bigint', 'boolean', 'bigint', 'integer',
    'integer', 'integer', 'jsonb', 'smallint', 'smallint', 'smallint',
    'bigint', 'bigint', 'integer', 'text', 'text', 'integer', 'boolean',
    'jsonb'
  ],
  'the obsolete private implementation overload is removed'
);
select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.create_detailed_diagnosis_report(
      uuid, public.business_category, bigint, boolean, bigint, integer,
      integer, jsonb, smallint, smallint, smallint, bigint, bigint,
      integer, text, text, integer, boolean, jsonb
    )'::regprocedure
  ),
  'the public detailed RPC is security invoker'
);
select ok(
  (
    select proconfig
    from pg_proc
    where oid = 'public.create_detailed_diagnosis_report(
      uuid, public.business_category, bigint, boolean, bigint, integer,
      integer, jsonb, smallint, smallint, smallint, bigint, bigint,
      integer, text, text, integer, boolean, jsonb
    )'::regprocedure
  ) = array['search_path=""']::text[],
  'the public detailed RPC has an empty search path'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_detailed_diagnosis_report(
      uuid, public.business_category, bigint, boolean, bigint, integer,
      integer, jsonb, smallint, smallint, smallint, bigint, bigint,
      integer, text, text, integer, boolean, jsonb
    )',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.create_detailed_diagnosis_report(
      uuid, public.business_category, bigint, boolean, bigint, integer,
      integer, jsonb, smallint, smallint, smallint, bigint, bigint,
      integer, text, text, integer, boolean, jsonb
    )',
    'execute'
  ),
  'only authenticated clients can execute the public detailed RPC'
);

insert into auth.users (id, aud, role, email)
values
  (
    '71000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'detailed-paid@example.com'
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'detailed-free@example.com'
  );

insert into public.billing_contracts (
  id, user_id, price_id, external_reference, billing_mode, payment_method,
  charge_type, amount_cents, currency, installment_limit, access_months,
  status, access_starts_at, access_ends_at
) values (
  '71000000-0000-4000-8000-000000000010',
  '71000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'detailed-report-test-access',
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
);

create function pg_temp.detailed_items()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'id', '71111111-1111-4111-8111-111111111111',
      'position', 0,
      'name', 'Caneca',
      'kind', 'resale',
      'unitSalePriceCents', 1000,
      'monthlySalesVolume', 10,
      'purchaseUnitCostCents', 400,
      'packagingUnitCostCents', 100,
      'variableUnitCostCents', 500,
      'feeAmountCents', 80,
      'netUnitRevenueCents', 920,
      'unitContributionCents', 420,
      'contributionMarginBasisPoints', 4200,
      'monthlyGrossRevenueCents', 10000,
      'monthlyContributionCents', 4200,
      'breakEvenUnitPriceCents', 610,
      'directLoss', false
    ),
    jsonb_build_object(
      'id', '72222222-2222-4222-8222-222222222222',
      'position', 1,
      'name', 'Caderno',
      'kind', 'resale',
      'unitSalePriceCents', 2000,
      'monthlySalesVolume', 5,
      'purchaseUnitCostCents', 800,
      'packagingUnitCostCents', 200,
      'variableUnitCostCents', 1000,
      'feeAmountCents', 160,
      'netUnitRevenueCents', 1840,
      'unitContributionCents', 840,
      'contributionMarginBasisPoints', 4200,
      'monthlyGrossRevenueCents', 10000,
      'monthlyContributionCents', 4200,
      'breakEvenUnitPriceCents', 1220,
      'directLoss', false
    )
  );
$$;

create function pg_temp.detailed_executive_summary(p_headline text)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'headline', p_headline,
    'introduction', 'Veja o resultado geral e os próximos passos.',
    'verdict', jsonb_build_object(
      'label', 'Lucro',
      'body', 'O mês terminou positivo.',
      'tone', 'positive'
    ),
    'facts', jsonb_build_array(
      jsonb_build_object(
        'key', 'margin',
        'currentLabel', 'Resultado do mês',
        'currentValue', 'R$ 83,00',
        'referenceLabel', 'Quanto sobra a cada R$ 100',
        'referenceValue', '41,5%'
      ),
      jsonb_build_object(
        'key', 'price',
        'currentLabel', 'Faturamento atual',
        'currentValue', 'R$ 200,00',
        'referenceLabel', 'Quanto precisa vender para cobrir os gastos',
        'referenceValue', 'R$ 2,39'
      )
    ),
    'priority', jsonb_build_object(
      'label', 'Faturamento do mês',
      'body', 'Acompanhe o resultado e preserve as condições atuais.'
    ),
    'answers', jsonb_build_array(
      jsonb_build_object(
        'key', 'profitability',
        'question', 'Estou ganhando dinheiro?',
        'answer', 'Sim.'
      ),
      jsonb_build_object(
        'key', 'price_sufficiency',
        'question', 'Meus preços pagam os gastos?',
        'answer', 'Sim.'
      ),
      jsonb_build_object(
        'key', 'immediate_action',
        'question', 'O que preciso fazer agora?',
        'answer', 'Acompanhe o resultado.'
      )
    )
  );
$$;

create function pg_temp.detailed_sections()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'key', 'break_even',
      'title', 'Seus menores preços sem prejuízo',
      'body', 'Valores por item.',
      'emphasisLabel', 'Itens analisados',
      'emphasisValue', '2',
      'tone', 'neutral'
    ),
    jsonb_build_object(
      'key', 'hidden_cost',
      'title', 'O que sai das vendas',
      'body', 'Custos e cobranças das vendas.',
      'emphasisLabel', 'Receita líquida',
      'emphasisValue', 'R$ 184,00',
      'tone', 'neutral'
    ),
    jsonb_build_object(
      'key', 'margin_diagnosis',
      'title', 'Quanto sobra no mês',
      'body', 'Resultado depois dos gastos.',
      'emphasisLabel', 'Lucro',
      'emphasisValue', 'R$ 83,00',
      'tone', 'positive'
    ),
    jsonb_build_object(
      'key', 'sales_goal',
      'title', 'Quanto você precisa vender',
      'body', 'Referência para pagar os gastos mensais.',
      'emphasisLabel', 'Faturamento necessário',
      'emphasisValue', 'R$ 2,39',
      'tone', 'neutral'
    )
  );
$$;

create function pg_temp.detailed_snapshot()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'calculationVersion', 1,
    'contentVersion', 1,
    'analysisMode', 'detailed',
    'category', 'product',
    'scenario', 'resale',
    'currency', 'BRL',
    'unit', 'mix',
    'policy', jsonb_build_object(
      'attentionBandBasisPoints', 2000,
      'concentrationThresholdBasisPoints', 4500,
      'weeklyDivisorHundredths', 433,
      'operatingDaysPerWeek', 6,
      'proLaboreIncluded', false
    ),
    'inputs', jsonb_build_object(
      'submissionId', '71000000-0000-4000-8000-000000000100',
      'category', 'product',
      'fixedMonthlyExpensesCents', 100,
      'proLaboreIncluded', false,
      'proLaboreCents', 0,
      'taxRateBasisPoints', 600,
      'cardFeeRateBasisPoints', 200,
      'items', (
        select jsonb_agg(
          item - array[
            'variableUnitCostCents', 'feeAmountCents',
            'netUnitRevenueCents', 'unitContributionCents',
            'contributionMarginBasisPoints', 'monthlyGrossRevenueCents',
            'monthlyContributionCents', 'breakEvenUnitPriceCents',
            'directLoss'
          ]
          order by (item ->> 'position')::integer
        )
        from jsonb_array_elements(pg_temp.detailed_items()) as item
      )
    ),
    'results', jsonb_build_object(
      'effectiveFixedCostCents', 100,
      'isPartial', false,
      'missingVolumeItemIds', jsonb_build_array(),
      'items', (
        select jsonb_agg(
          jsonb_build_object(
            'itemId', item ->> 'id',
            'variableUnitCostCents', item -> 'variableUnitCostCents',
            'feeAmountCents', item -> 'feeAmountCents',
            'netUnitRevenueCents', item -> 'netUnitRevenueCents',
            'unitContributionCents', item -> 'unitContributionCents',
            'contributionMarginBasisPoints',
              item -> 'contributionMarginBasisPoints',
            'monthlyGrossRevenueCents', item -> 'monthlyGrossRevenueCents',
            'monthlyContributionCents', item -> 'monthlyContributionCents',
            'breakEvenUnitPriceCents', item -> 'breakEvenUnitPriceCents',
            'directLoss', item -> 'directLoss'
          )
          order by (item ->> 'position')::integer
        )
        from jsonb_array_elements(pg_temp.detailed_items()) as item
      ),
      'monthlyGrossRevenueCents', 20000,
      'monthlyFeeAmountCents', 1600,
      'monthlyVariableCostCents', 10000,
      'monthlyNetRevenueCents', 18400,
      'monthlyCostCents', 10100,
      'monthlyContributionCents', 8400,
      'monthlyResultCents', 8300,
      'mixContributionMarginBasisPoints', 4200,
      'finalMarginBasisPoints', 4150,
      'breakEvenRevenueCents', 239,
      'verdict', 'adequate_margin',
      'priority', 'volume'
    ),
    'executiveSummary', pg_temp.detailed_executive_summary(
      'Seus produtos dão lucro?'
    ),
    'sections', pg_temp.detailed_sections(),
    'guidance', jsonb_build_array()
  );
$$;

create function pg_temp.production_items()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'id', '73333333-3333-4333-8333-333333333333',
      'position', 0,
      'name', 'Bolo',
      'kind', 'manufacturing',
      'costMode', 'technical_sheet',
      'unitSalePriceCents', 3000,
      'monthlySalesVolume', 2,
      'recipeYield', 10,
      'lossRateBasisPoints', 1000,
      'packagingUnitCostCents', 100,
      'directLaborUnitCostCents', 200,
      'otherVariableUnitCostCents', 50,
      'ingredients', jsonb_build_array(
        jsonb_build_object(
          'id', '74444444-4444-4444-8444-444444444444',
          'position', 0,
          'name', 'Farinha',
          'quantityMillionths', 1000000,
          'unit', 'kg',
          'unitCostTenThousandths', 30000
        )
      ),
      'variableUnitCostCents', 650,
      'feeAmountCents', 240,
      'netUnitRevenueCents', 2760,
      'unitContributionCents', 2110,
      'contributionMarginBasisPoints', 7033,
      'monthlyGrossRevenueCents', 6000,
      'monthlyContributionCents', 4220,
      'breakEvenUnitPriceCents', 810,
      'directLoss', false
    )
  );
$$;

create function pg_temp.production_snapshot(p_submission_id uuid)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'calculationVersion', 1,
    'contentVersion', 1,
    'analysisMode', 'detailed',
    'category', 'production',
    'scenario', 'manufacturing',
    'currency', 'BRL',
    'unit', 'mix',
    'policy', jsonb_build_object(
      'attentionBandBasisPoints', 2000,
      'concentrationThresholdBasisPoints', 4500,
      'weeklyDivisorHundredths', 433,
      'operatingDaysPerWeek', 6,
      'proLaboreIncluded', false
    ),
    'inputs', jsonb_build_object(
      'submissionId', p_submission_id,
      'category', 'production',
      'fixedMonthlyExpensesCents', 100,
      'proLaboreIncluded', false,
      'proLaboreCents', 0,
      'taxRateBasisPoints', 600,
      'cardFeeRateBasisPoints', 200,
      'items', (
        select jsonb_agg(
          item - array[
            'variableUnitCostCents', 'feeAmountCents',
            'netUnitRevenueCents', 'unitContributionCents',
            'contributionMarginBasisPoints', 'monthlyGrossRevenueCents',
            'monthlyContributionCents', 'breakEvenUnitPriceCents',
            'directLoss'
          ]
        )
        from jsonb_array_elements(pg_temp.production_items()) as item
      )
    ),
    'results', jsonb_build_object(
      'effectiveFixedCostCents', 100,
      'isPartial', false,
      'missingVolumeItemIds', jsonb_build_array(),
      'items', (
        select jsonb_agg(
          jsonb_build_object(
            'itemId', item ->> 'id',
            'variableUnitCostCents', item -> 'variableUnitCostCents',
            'feeAmountCents', item -> 'feeAmountCents',
            'netUnitRevenueCents', item -> 'netUnitRevenueCents',
            'unitContributionCents', item -> 'unitContributionCents',
            'contributionMarginBasisPoints',
              item -> 'contributionMarginBasisPoints',
            'monthlyGrossRevenueCents', item -> 'monthlyGrossRevenueCents',
            'monthlyContributionCents', item -> 'monthlyContributionCents',
            'breakEvenUnitPriceCents', item -> 'breakEvenUnitPriceCents',
            'directLoss', item -> 'directLoss'
          )
        )
        from jsonb_array_elements(pg_temp.production_items()) as item
      ),
      'monthlyGrossRevenueCents', 6000,
      'monthlyFeeAmountCents', 480,
      'monthlyVariableCostCents', 1300,
      'monthlyNetRevenueCents', 5520,
      'monthlyCostCents', 1400,
      'monthlyContributionCents', 4220,
      'monthlyResultCents', 4120,
      'mixContributionMarginBasisPoints', 7033,
      'finalMarginBasisPoints', 6867,
      'breakEvenRevenueCents', 143,
      'verdict', 'adequate_margin',
      'priority', 'volume'
    ),
    'executiveSummary', pg_temp.detailed_executive_summary(
      'Suas produções dão lucro?'
    ),
    'sections', pg_temp.detailed_sections(),
    'guidance', jsonb_build_array()
  );
$$;

create function pg_temp.create_detailed_report(
  p_submission_id uuid,
  p_items jsonb default pg_temp.detailed_items(),
  p_monthly_result_cents bigint default 8300,
  p_report_snapshot jsonb default pg_temp.detailed_snapshot()
)
returns bigint
language sql
as $$
  select public.create_detailed_diagnosis_report(
    p_submission_id,
    'product'::public.business_category,
    100,
    false,
    0,
    600,
    200,
    p_items,
    1::smallint,
    1::smallint,
    1::smallint,
    20000,
    p_monthly_result_cents,
    4150,
    'adequate_margin',
    'volume',
    2,
    false,
    jsonb_set(
      p_report_snapshot,
      '{inputs,submissionId}',
      to_jsonb(p_submission_id::text)
    )
  );
$$;

set local role anon;
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000100'
  ) $$,
  '42501',
  null,
  'anonymous clients cannot call the detailed RPC'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000100'
  ) $$,
  '42501',
  'authentication required',
  'the detailed RPC requires an authenticated subject'
);

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);
select lives_ok(
  $$ select pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000100'
  ) $$,
  'one RPC inserts the detailed parent and ordered items'
);
select results_eq(
  $$
    select category::text, fixed_monthly_expenses_cents, item_count
    from public.detailed_diagnoses
    where submission_id = '71000000-0000-4000-8000-000000000100'
  $$,
  $$ values ('product'::text, 100::bigint, 2::integer) $$,
  'the normalized detailed parent preserves authoritative inputs'
);
select results_eq(
  $$
    select position, client_item_id, unit_contribution_cents
    from public.detailed_diagnosis_items
    where submission_id = '71000000-0000-4000-8000-000000000100'
    order by position
  $$,
  $$ values
    (0, '71111111-1111-4111-8111-111111111111'::uuid, 420::bigint),
    (1, '72222222-2222-4222-8222-222222222222'::uuid, 840::bigint)
  $$,
  'ordered items persist their stable IDs and calculated values'
);
select results_eq(
  $$
    select analysis_mode, current_price_cents, unit,
      monthly_gross_revenue_cents, monthly_result_cents, item_count, is_partial
    from public.diagnoses
    where submission_id = '71000000-0000-4000-8000-000000000100'
  $$,
  $$ values (
    'detailed'::text, null::bigint, 'mix'::text,
    20000::bigint, 8300::bigint, 2::integer, false
  ) $$,
  'the registry stores a detailed mix summary with no single price'
);

select lives_ok(
  $$ select public.create_detailed_diagnosis_report(
    '71000000-0000-4000-8000-000000000110',
    'production'::public.business_category,
    100,
    false,
    0,
    600,
    200,
    pg_temp.production_items(),
    1::smallint,
    1::smallint,
    1::smallint,
    6000,
    4120,
    6867,
    'adequate_margin',
    'volume',
    1,
    false,
    pg_temp.production_snapshot(
      '71000000-0000-4000-8000-000000000110'
    )
  ) $$,
  'one RPC inserts a technical-sheet item and its ingredients'
);
select results_eq(
  $$
    select i.position, i.client_item_id, ingredient.position,
      ingredient.client_ingredient_id, ingredient.quantity_millionths
    from public.detailed_diagnosis_items as i
    join public.detailed_diagnosis_ingredients as ingredient
      on ingredient.diagnosis_id = i.diagnosis_id
      and ingredient.client_item_id = i.client_item_id
    where i.submission_id = '71000000-0000-4000-8000-000000000110'
  $$,
  $$ values (
    0,
    '73333333-3333-4333-8333-333333333333'::uuid,
    0,
    '74444444-4444-4444-8444-444444444444'::uuid,
    1000000::bigint
  ) $$,
  'the ingredient keeps its stable IDs, order, and normalized scale'
);

select is(
  pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000100'
  ),
  (
    select id
    from public.diagnoses
    where submission_id = '71000000-0000-4000-8000-000000000100'
  ),
  'an equivalent retry returns the same diagnosis ID'
);
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    p_submission_id => '71000000-0000-4000-8000-000000000100',
    p_monthly_result_cents => 8301,
    p_report_snapshot => jsonb_set(
      pg_temp.detailed_snapshot(),
      '{results,monthlyResultCents}',
      '8301'::jsonb
    )
  ) $$,
  '23505',
  'submission id belongs to another diagnosis',
  'a submission UUID cannot be reused for a different detailed report'
);

select throws_ok(
  $$ select pg_temp.create_detailed_report(
    p_submission_id => '71000000-0000-4000-8000-000000000101',
    p_items => '{}'::jsonb
  ) $$,
  '22023',
  'invalid detailed report payload',
  'malformed item JSON is rejected atomically'
);
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    p_submission_id => '71000000-0000-4000-8000-000000000102',
    p_report_snapshot => jsonb_set(
      pg_temp.detailed_snapshot(),
      '{results,monthlyGrossRevenueCents}',
      '1'::jsonb
    )
  ) $$,
  '22023',
  'invalid detailed report payload',
  'a mismatched detailed snapshot is rejected atomically'
);
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    p_submission_id => '71000000-0000-4000-8000-000000000103',
    p_report_snapshot => pg_temp.detailed_snapshot() - 'sections'
  ) $$,
  '22023',
  'invalid detailed report payload',
  'a detailed snapshot without report sections is rejected atomically'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where submission_id in (
      '71000000-0000-4000-8000-000000000101',
      '71000000-0000-4000-8000-000000000102',
      '71000000-0000-4000-8000-000000000103'
    )
  $$,
  array[0::bigint],
  'invalid detailed payloads insert no registry rows'
);

select throws_ok(
  $$ insert into public.detailed_diagnoses (
    diagnosis_id, submission_id, user_id, category,
    fixed_monthly_expenses_cents, pro_labore_included, pro_labore_cents,
    tax_rate_basis_points, card_fee_rate_basis_points,
    item_count
  ) values (
    999999,
    '71000000-0000-4000-8000-000000000999',
    '71000000-0000-4000-8000-000000000001',
    'product', 0, false, 0, 0, 0, 1
  ) $$,
  '42501',
  null,
  'direct detailed parent inserts are denied'
);

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  true
);
select lives_ok(
  $$ select pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000200'
  ) $$,
  'an unpaid user creates one free detailed mix'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.diagnoses
    where user_id = '71000000-0000-4000-8000-000000000002'
  $$,
  array[1::bigint],
  'a multi-item detailed mix consumes exactly one report slot'
);
select throws_ok(
  $$ select pg_temp.create_detailed_report(
    '71000000-0000-4000-8000-000000000201'
  ) $$,
  'P0001',
  'free_report_limit_reached',
  'a second detailed mix is blocked by the free-tier limit'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.detailed_diagnoses
  $$,
  array[1::bigint],
  'RLS exposes only the current user detailed parent'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.detailed_diagnosis_items
  $$,
  array[2::bigint],
  'RLS exposes only the current user detailed items'
);
select results_eq(
  $$
    select count(*)::bigint
    from public.detailed_diagnosis_ingredients
  $$,
  array[0::bigint],
  'RLS applies to detailed ingredients too'
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
  verdict,
  priority,
  unit,
  report_snapshot,
  analysis_mode,
  item_count,
  is_partial
) values (
  '71000000-0000-4000-8000-000000000400',
  '71000000-0000-4000-8000-000000000001',
  'product',
  'resale',
  1,
  1,
  1,
  null,
  'adequate_margin',
  'volume',
  'mix',
  '{}'::jsonb,
  'detailed',
  1,
  false
);
select throws_ok(
  $$ insert into public.detailed_diagnoses (
    diagnosis_id, submission_id, user_id, category,
    fixed_monthly_expenses_cents, pro_labore_included, pro_labore_cents,
    tax_rate_basis_points, card_fee_rate_basis_points,
    item_count
  ) values (
    (
      select id from public.diagnoses
      where submission_id = '71000000-0000-4000-8000-000000000400'
    ),
    '71000000-0000-4000-8000-000000000400',
    '71000000-0000-4000-8000-000000000001',
    'product', -1, false, 0, 0, 0, 1
  ) $$,
  '23514',
  null,
  'detailed parents reject invalid normalized shapes'
);

select throws_ok(
  $$ insert into public.detailed_diagnosis_items (
    diagnosis_id, submission_id, user_id, client_item_id, position, name,
    kind, unit_sale_price_cents, monthly_sales_volume,
    purchase_unit_cost_cents, packaging_unit_cost_cents,
    variable_unit_cost_cents, fee_amount_cents, net_unit_revenue_cents,
    unit_contribution_cents, contribution_margin_basis_points,
    monthly_gross_revenue_cents, monthly_contribution_cents, direct_loss
  ) select
    diagnosis_id, submission_id, user_id,
    '75555555-5555-4555-8555-555555555555'::uuid,
    9, '', 'resale', 1000, 1, 100, 0,
    100, 0, 1000, 900, 9000, 1000, 900, false
  from public.detailed_diagnoses
  where submission_id = '71000000-0000-4000-8000-000000000100' $$,
  '23514',
  null,
  'detailed items reject invalid normalized shapes'
);

select throws_ok(
  $$ insert into public.detailed_diagnosis_ingredients (
    diagnosis_id, submission_id, user_id, client_item_id,
    client_ingredient_id, position, name, quantity_millionths,
    unit, unit_cost_ten_thousandths
  ) select
    diagnosis_id, submission_id, user_id, client_item_id,
    '76666666-6666-4666-8666-666666666666'::uuid,
    9, 'Açúcar', -1, 'kg', 10000
  from public.detailed_diagnosis_items
  where submission_id = '71000000-0000-4000-8000-000000000110' $$,
  '23514',
  null,
  'detailed ingredients reject invalid normalized scales'
);

select throws_ok(
  $$ insert into public.diagnoses (
    submission_id, user_id, business_category, scenario,
    schema_version, calculation_version, content_version,
    current_price_cents, verdict, priority, unit, report_snapshot
  ) values (
    '71000000-0000-4000-8000-000000000300',
    '71000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 1,
    null, 'adequate_margin', 'volume', 'unit', '{}'::jsonb
  ) $$,
  '23514',
  null,
  'quick registry rows cannot omit the current price'
);
select throws_ok(
  $$ insert into public.diagnoses (
    submission_id, user_id, business_category, scenario,
    schema_version, calculation_version, content_version,
    current_price_cents, verdict, priority, unit, report_snapshot,
    analysis_mode, item_count, is_partial
  ) values (
    '71000000-0000-4000-8000-000000000301',
    '71000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 1,
    null, 'adequate_margin', 'volume', 'unit', '{}'::jsonb,
    'detailed', 1, false
  ) $$,
  '23514',
  null,
  'detailed registry rows must use the mix unit'
);

select * from finish();

rollback;
