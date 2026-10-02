begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'get_client_dashboard_v1',
  array[
    'date', 'date', 'text[]', 'text[]', 'text[]',
    'text[]', 'text[]', 'text', 'bigint'
  ],
  'versioned client dashboard RPC exists'
);

select ok(
  (
    select not prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = to_regprocedure(
      'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)'
    )
  ),
  'client dashboard RPC is stable security invoker with empty search path'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)',
    'execute'
  ),
  'anonymous callers cannot execute the client dashboard RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)',
    'execute'
  ),
  'authenticated callers can execute the client dashboard RPC'
);

select ok(
  not has_function_privilege(
    'service_role',
    'public.get_client_dashboard_v1(date,date,text[],text[],text[],text[],text[],text,bigint)',
    'execute'
  ),
  'service role cannot bypass caller-scoped dashboard access'
);

insert into auth.users (id, aud, role, email)
values
  (
    '92000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'dashboard-owner@example.com'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'dashboard-other@example.com'
  ),
  (
    '92000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'dashboard-empty@example.com'
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
  '92000000-0000-4000-8000-000000000010',
  '92000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'dashboard-historical-access',
  'monthly',
  'pix',
  'detached',
  4990,
  'BRL',
  null,
  1,
  'expired',
  '2026-09-01T00:00:00Z',
  '2026-10-01T00:00:00Z'
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
  analysis_mode,
  monthly_gross_revenue_cents,
  monthly_result_cents,
  item_count,
  is_partial,
  created_at,
  updated_at,
  deleted_at
) overriding system value values
  (
    92001,
    '92000000-0000-4000-8000-000000000101',
    '92000000-0000-4000-8000-000000000001',
    'service', 'hour', 4, 3, 5, 0, null, null,
    'missing_price', 'price', 'hour', '{"reportSnapshot":"secret-92001"}',
    false, 'quick', null, null, null, null,
    '2026-09-01T12:00:00Z', '2026-09-01T12:00:00Z', null
  ),
  (
    92002,
    '92000000-0000-4000-8000-000000000102',
    '92000000-0000-4000-8000-000000000001',
    'product', 'resale', 3, 3, 5, 1000, -1000, -100,
    'direct_loss', 'cost', 'unit', '{"reportSnapshot":"secret-92002"}',
    false, 'quick', null, null, null, null,
    '2026-09-02T12:00:00Z', '2026-09-02T13:00:00Z', null
  ),
  (
    92003,
    '92000000-0000-4000-8000-000000000103',
    '92000000-0000-4000-8000-000000000001',
    'production', 'manufacturing', 1, 1, 2, null, null, null,
    'incomplete_volume', 'data', 'mix', '{"reportSnapshot":"secret-92003"}',
    false, 'detailed', null, null, 2, true,
    '2026-09-03T12:00:00Z', '2026-09-03T12:00:00Z', null
  ),
  (
    92004,
    '92000000-0000-4000-8000-000000000104',
    '92000000-0000-4000-8000-000000000001',
    'product', 'resale', 1, 1, 2, null, -500, null,
    'operational_loss', 'margin', 'mix', '{"reportSnapshot":"secret-92004"}',
    false, 'detailed', 10000, -500, 2, false,
    '2026-09-04T12:00:00Z', '2026-09-04T12:00:00Z', null
  ),
  (
    92005,
    '92000000-0000-4000-8000-000000000105',
    '92000000-0000-4000-8000-000000000001',
    'product', 'digital', 1, 1, 2, null, 0, null,
    'no_sales', 'volume', 'mix', '{"reportSnapshot":"secret-92005"}',
    false, 'detailed', 0, 0, 1, false,
    '2026-09-05T12:00:00Z', '2026-09-05T12:00:00Z', null
  ),
  (
    92006,
    '92000000-0000-4000-8000-000000000106',
    '92000000-0000-4000-8000-000000000001',
    'production', 'manufacturing', 3, 3, 5, 2000, 0, 0,
    'break_even', 'margin', 'unit', '{"reportSnapshot":"secret-92006"}',
    false, 'quick', null, null, null, null,
    '2026-09-06T12:00:00Z', '2026-09-06T12:00:00Z', null
  ),
  (
    92007,
    '92000000-0000-4000-8000-000000000107',
    '92000000-0000-4000-8000-000000000001',
    'service', 'appointment', 4, 3, 5, 5000, 2500, 1250,
    'positive_result', 'price', 'appointment', '{"reportSnapshot":"secret-92007"}',
    false, 'quick', null, null, null, null,
    '2026-09-07T12:00:00Z', '2026-09-07T12:00:00Z', null
  ),
  (
    92008,
    '92000000-0000-4000-8000-000000000108',
    '92000000-0000-4000-8000-000000000001',
    'product', 'digital', 1, 1, 2, null, null, null,
    'positive_result', 'data', 'mix', '{"reportSnapshot":"secret-92008"}',
    false, 'detailed', null, null, 3, true,
    '2026-09-08T12:00:00Z', '2026-09-08T12:00:00Z', null
  ),
  (
    92009,
    '92000000-0000-4000-8000-000000000109',
    '92000000-0000-4000-8000-000000000001',
    'service', 'minute', 4, 3, 5, 3000, 1000, 300,
    'positive_result', 'price', 'hour', '{"reportSnapshot":"secret-92009"}',
    false, 'quick', null, null, null, null,
    '2026-09-09T12:00:00Z', '2026-09-09T12:00:00Z', '2026-09-10T12:00:00Z'
  ),
  (
    92010,
    '92000000-0000-4000-8000-000000000110',
    '92000000-0000-4000-8000-000000000002',
    'product', 'resale', 3, 3, 5, 9000, 2000, 1800,
    'positive_result', 'price', 'unit', '{"reportSnapshot":"secret-92010"}',
    true, 'quick', null, null, null, null,
    '2026-09-10T12:00:00Z', '2026-09-10T12:00:00Z', null
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '92000000-0000-4000-8000-000000000001',
  true
);

select is(
  jsonb_array_length(public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) -> 'verdictCounts'),
  7,
  'every verdict bucket is returned'
);

select is(
  jsonb_array_length(public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) -> 'priorityCounts'),
  5,
  'every priority bucket is returned'
);

select is(
  (
    select jsonb_agg(entry ->> 'verdict' order by position)
    from jsonb_array_elements(public.get_client_dashboard_v1(
      null, null, null, null, null, null, null, 'all', null
    ) -> 'verdictCounts') with ordinality as bucket(entry, position)
  ),
  '["missing_price", "direct_loss", "incomplete_volume", "operational_loss", "no_sales", "break_even", "positive_result"]'::jsonb,
  'verdict buckets use the canonical persisted order'
);

select ok(
  not (
    public.get_client_dashboard_v1(
      null, null, null, null, null, null, null, 'all', null
    )::text like '%reportSnapshot%'
  ),
  'dashboard payload never exposes report snapshots'
);

select is(
  jsonb_array_length(public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) -> 'recentReports'),
  6,
  'recent reports are capped at six'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  8::bigint,
  'deleted and other-user reports are excluded from totals'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) #>> '{metrics,lossReports}')::bigint,
  2::bigint,
  'both direct and operational losses are counted'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) #>> '{metrics,pendingDataReports}')::bigint,
  3::bigint,
  'missing price, incomplete volume, and explicit partial reports are pending'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'complete', null
  ) #>> '{metrics,totalReports}')::bigint,
  5::bigint,
  'no-sales is complete rather than pending'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, array['service'], null, null, null, null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  2::bigint,
  'category filter is applied'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, array['detailed'], null, null, null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  4::bigint,
  'analysis-mode filter is applied'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, array['digital'], null, null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  2::bigint,
  'scenario filter is applied'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null,
    array['direct_loss', 'operational_loss'], null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  2::bigint,
  'verdict filter accepts the combined loss shortcut'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, array['data'], 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  2::bigint,
  'priority filter is applied'
);

select is(
  (public.get_client_dashboard_v1(
    '2026-09-04', '2026-09-06', null, null, null, null, null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  2::bigint,
  'inclusive from and exclusive to dates use the Sao Paulo calendar'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'pending', null
  ) #>> '{metrics,totalReports}')::bigint,
  3::bigint,
  'pending data-state filter includes explicit partial reports'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', 92002
  ) ->> 'focusReportId')::bigint,
  92002::bigint,
  'requested readable filtered report is selected as focus'
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', 99999
  ) ->> 'focusReportId')::bigint,
  92008::bigint,
  'invalid focus falls back to the newest filtered report'
);

select is(
  public.get_client_dashboard_v1(
    null, null, array['service'], null, null, array['no_sales'], null, 'all', null
  ) ->> 'hasAnyReports',
  'true',
  'hasAnyReports stays true for an empty filtered set'
);

select throws_ok(
  $$
    select public.get_client_dashboard_v1(
      '2026-10-01', '2026-10-01', null, null, null, null, null, 'all', null
    )
  $$,
  '22023',
  'invalid dashboard date range',
  'inverted or empty date ranges are rejected'
);

select throws_ok(
  $$
    select public.get_client_dashboard_v1(
      null, null, array['unknown'], null, null, null, null, 'all', null
    )
  $$,
  '22023',
  'invalid dashboard filters',
  'unknown filter values are rejected'
);

select throws_ok(
  $$
    select public.get_client_dashboard_v1(
      null, null, null, null, null, null, null, null, null
    )
  $$,
  '22023',
  'invalid dashboard filters',
  'null data state is rejected'
);

select set_config(
  'request.jwt.claim.sub',
  '92000000-0000-4000-8000-000000000003',
  true
);

select is(
  public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) ->> 'hasAnyReports',
  'false',
  'hasAnyReports is false for a caller with no readable reports'
);

select set_config(
  'request.jwt.claim.sub',
  '92000000-0000-4000-8000-000000000002',
  true
);

select is(
  (public.get_client_dashboard_v1(
    null, null, null, null, null, null, null, 'all', null
  ) #>> '{metrics,totalReports}')::bigint,
  1::bigint,
  'a caller sees only their own readable reports'
);

reset role;

set local role anon;
select throws_ok(
  $$
    select public.get_client_dashboard_v1(
      null, null, null, null, null, null, null, 'all', null
    )
  $$,
  '42501',
  null,
  'anonymous execution is denied'
);
reset role;

select * from finish();
rollback;
