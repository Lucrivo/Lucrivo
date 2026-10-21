begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'list_admin_users_v1',
  array[
    'text',
    'text',
    'text',
    'timestamp with time zone',
    'uuid',
    'integer'
  ],
  'versioned admin user list exists'
);
select has_function(
  'public',
  'get_admin_user_v1',
  array['uuid'],
  'versioned admin user detail exists'
);
select has_function(
  'public',
  'list_admin_user_items_v1',
  array[
    'uuid',
    'text',
    'timestamp with time zone',
    'text',
    'integer'
  ],
  'versioned admin user child list exists'
);
select has_function(
  'public',
  'list_admin_users_v2',
  array['text', 'text', 'text', 'integer', 'integer'],
  'page-number admin user list exists'
);
select has_function(
  'public',
  'get_admin_user_v2',
  array['uuid'],
  'profile-aware admin user detail exists'
);
select has_function(
  'public',
  'list_admin_user_diagnoses_v2',
  array['uuid', 'timestamp with time zone', 'text', 'integer'],
  'typed admin diagnosis collection exists'
);
select has_function(
  'public',
  'list_admin_user_subscriptions_v2',
  array['uuid', 'timestamp with time zone', 'uuid', 'integer'],
  'typed admin subscription collection exists'
);

select ok(
  not has_function_privilege('anon', 'public.list_admin_users_v1(text,text,text,timestamptz,uuid,integer)', 'execute'),
  'anonymous callers cannot execute the list'
);
select ok(
  not has_function_privilege('service_role', 'public.get_admin_user_v1(uuid)', 'execute'),
  'service role cannot bypass caller-scoped detail authorization'
);
select ok(
  has_function_privilege('authenticated', 'public.list_admin_users_v2(text,text,text,integer,integer)', 'execute'),
  'authenticated callers can reach the v2 list authorization boundary'
);
select ok(
  not has_function_privilege('anon', 'public.list_admin_users_v2(text,text,text,integer,integer)', 'execute'),
  'anonymous callers cannot execute the v2 list'
);
select ok(
  not has_function_privilege('service_role', 'public.get_admin_user_v2(uuid)', 'execute'),
  'service role cannot bypass v2 detail authorization'
);
select ok(
  has_function_privilege('authenticated', 'public.list_admin_user_diagnoses_v2(uuid,timestamptz,text,integer)', 'execute'),
  'authenticated callers can reach the diagnosis authorization boundary'
);
select ok(
  not has_function_privilege('anon', 'public.list_admin_user_diagnoses_v2(uuid,timestamptz,text,integer)', 'execute'),
  'anonymous callers cannot execute the diagnosis collection'
);
select ok(
  not has_function_privilege('service_role', 'public.list_admin_user_subscriptions_v2(uuid,timestamptz,uuid,integer)', 'execute'),
  'service role cannot bypass subscription collection authorization'
);

insert into auth.users (id, aud, role, email, created_at)
values
  (
    '96200000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@admin-read-fixture.test',
    statement_timestamp() - interval '3 days'
  ),
  (
    '96200000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'older@admin-read-fixture.test',
    statement_timestamp() - interval '2 days'
  ),
  (
    '96200000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'newer@admin-read-fixture.test',
    statement_timestamp() - interval '1 day'
  ),
  (
    '96200000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'excluded@admin-read-fixture.test',
    statement_timestamp()
  ),
  (
    '96200000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'billing-active@collection-fixture.test',
    statement_timestamp() - interval '4 days'
  );

insert into private.admin_user_state (
  user_id, blocked_at, deleted_at, courtesy_expires_at
) values (
  '96200000-0000-4000-8000-000000000002',
  null, null, statement_timestamp() + interval '1 month'
), (
  '96200000-0000-4000-8000-000000000003',
  statement_timestamp(), null, null
), (
  '96200000-0000-4000-8000-000000000004',
  null, statement_timestamp(), null
);

insert into public.onboarding_profiles (
  user_id,
  full_name,
  whatsapp_e164,
  segment_id,
  subcategory_id,
  whatsapp_marketing_consent,
  marketing_consent_granted_at,
  completed_at,
  updated_at
)
select
  '96200000-0000-4000-8000-000000000003',
  'Cliente Bloqueado',
  '+5511999999003',
  segment.id,
  subcategory.id,
  false,
  null,
  statement_timestamp() - interval '12 hours',
  statement_timestamp() - interval '12 hours'
from public.business_segments as segment
join public.business_subcategories as subcategory
  on subcategory.segment_id = segment.id
where segment.name = 'Alimentação'
  and subcategory.name = 'Confeitaria';

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
  version,
  created_at,
  updated_at
) overriding system value values
  (
    96201,
    '96200000-0000-4000-8000-000000000101',
    '96200000-0000-4000-8000-000000000005',
    'service',
    'hour',
    4,
    3,
    5,
    10000,
    2500,
    2500,
    'adequate_margin',
    'margin',
    'hour',
    '{"fixture":"active-quick"}',
    true,
    'quick',
    null,
    null,
    null,
    null,
    0,
    statement_timestamp() - interval '4 hours',
    statement_timestamp() - interval '4 hours'
  ),
  (
    96202,
    '96200000-0000-4000-8000-000000000102',
    '96200000-0000-4000-8000-000000000003',
    'product',
    'resale',
    3,
    3,
    5,
    null,
    null,
    null,
    'positive_result',
    'margin',
    'mix',
    '{"fixture":"blocked-detailed"}',
    false,
    'detailed',
    500000,
    125000,
    3,
    false,
    3,
    statement_timestamp() - interval '1 hour',
    statement_timestamp() - interval '30 minutes'
  ),
  (
    96203,
    '96200000-0000-4000-8000-000000000103',
    '96200000-0000-4000-8000-000000000003',
    'product',
    'resale',
    3,
    3,
    5,
    12000,
    2000,
    2400,
    'tight_margin',
    'price',
    'unit',
    '{"fixture":"blocked-quick"}',
    true,
    'quick',
    null,
    null,
    null,
    null,
    1,
    statement_timestamp() - interval '2 hours',
    statement_timestamp() - interval '2 hours'
  ),
  (
    96204,
    '96200000-0000-4000-8000-000000000104',
    '96200000-0000-4000-8000-000000000004',
    'production',
    'manufacturing',
    3,
    3,
    5,
    8000,
    1500,
    1200,
    'tight_margin',
    'cost',
    'unit',
    '{"fixture":"deleted-quick"}',
    true,
    'quick',
    null,
    null,
    null,
    null,
    0,
    statement_timestamp() - interval '3 hours',
    statement_timestamp() - interval '3 hours'
  );

insert into public.report_ai_conversations (
  user_id, diagnosis_id, report_version
) values (
  '96200000-0000-4000-8000-000000000003', 96202, 3
);

insert into public.report_ai_turns (
  conversation_id,
  user_id,
  request_id,
  question,
  answer,
  status,
  model,
  input_tokens,
  cached_input_tokens,
  output_tokens,
  error_code,
  created_at,
  completed_at
)
select
  conversation.id,
  conversation.user_id,
  turn.request_id,
  turn.question,
  turn.answer,
  turn.status,
  turn.model,
  turn.input_tokens,
  turn.cached_input_tokens,
  turn.output_tokens,
  turn.error_code,
  turn.created_at,
  turn.completed_at
from public.report_ai_conversations as conversation
cross join lateral (
  values
    (
      '96200000-0000-4000-8000-000000000201'::uuid,
      'Pergunta confidencial um'::text,
      'Resposta confidencial um'::text,
      'completed'::text,
      'gpt-6-luna'::text,
      700,
      200,
      250,
      null::text,
      statement_timestamp() - interval '50 minutes',
      statement_timestamp() - interval '49 minutes'
    ),
    (
      '96200000-0000-4000-8000-000000000202'::uuid,
      'Pergunta confidencial dois'::text,
      'Resposta confidencial dois'::text,
      'completed'::text,
      'gpt-6-luna'::text,
      500,
      100,
      200,
      null::text,
      statement_timestamp() - interval '40 minutes',
      statement_timestamp() - interval '39 minutes'
    ),
    (
      '96200000-0000-4000-8000-000000000203'::uuid,
      'Pergunta confidencial com falha'::text,
      null::text,
      'failed'::text,
      'gpt-6-luna'::text,
      900,
      900,
      900,
      'provider_error'::text,
      statement_timestamp() - interval '30 minutes',
      statement_timestamp() - interval '29 minutes'
    )
) as turn(
  request_id,
  question,
  answer,
  status,
  model,
  input_tokens,
  cached_input_tokens,
  output_tokens,
  error_code,
  created_at,
  completed_at
)
where conversation.diagnosis_id = 96202
  and conversation.report_version = 3;

insert into public.billing_prices (
  id,
  product_code,
  catalog_code,
  billing_mode,
  version,
  amount_cents,
  currency,
  installment_limit,
  access_months,
  bonus_months
) values (
  '96200000-0000-4000-8000-000000000301',
  'admin-user-read-monthly',
  'standard',
  'monthly',
  1,
  4990,
  'BRL',
  null,
  1,
  0
);

insert into public.billing_contracts (
  id,
  user_id,
  price_id,
  external_reference,
  catalog_code,
  billing_mode,
  payment_method,
  charge_type,
  amount_cents,
  currency,
  access_months,
  bonus_months,
  status,
  access_starts_at,
  access_ends_at,
  created_at,
  updated_at
) values
  (
    '96200000-0000-4000-8000-000000000401',
    '96200000-0000-4000-8000-000000000005',
    '96200000-0000-4000-8000-000000000301',
    'admin-user-read-active-contract',
    'standard',
    'monthly',
    'credit_card',
    'recurring',
    4990,
    'BRL',
    1,
    0,
    'active',
    statement_timestamp() - interval '1 month',
    statement_timestamp() + interval '1 month',
    statement_timestamp() - interval '2 days',
    statement_timestamp() - interval '1 hour'
  ),
  (
    '96200000-0000-4000-8000-000000000402',
    '96200000-0000-4000-8000-000000000003',
    '96200000-0000-4000-8000-000000000301',
    'admin-user-read-blocked-contract',
    'standard',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    1,
    0,
    'expired',
    statement_timestamp() - interval '2 months',
    statement_timestamp() - interval '1 month',
    statement_timestamp() - interval '3 days',
    statement_timestamp() - interval '1 month'
  ),
  (
    '96200000-0000-4000-8000-000000000403',
    '96200000-0000-4000-8000-000000000004',
    '96200000-0000-4000-8000-000000000301',
    'admin-user-read-deleted-contract',
    'standard',
    'monthly',
    'credit_card',
    'recurring',
    4990,
    'BRL',
    1,
    0,
    'refunded',
    statement_timestamp() - interval '1 month',
    statement_timestamp() + interval '1 month',
    statement_timestamp() - interval '1 day',
    statement_timestamp() - interval '30 minutes'
  ),
  (
    '96200000-0000-4000-8000-000000000404',
    '96200000-0000-4000-8000-000000000005',
    '96200000-0000-4000-8000-000000000301',
    'admin-user-read-active-older-contract',
    'standard',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    1,
    0,
    'expired',
    statement_timestamp() - interval '3 months',
    statement_timestamp() - interval '2 months',
    statement_timestamp() - interval '3 days',
    statement_timestamp() - interval '2 months'
  );

insert into public.billing_payments (
  id,
  contract_id,
  asaas_payment_id,
  status,
  value_cents,
  confirmed_at,
  received_at,
  created_at,
  updated_at
) values
  (
    '96200000-0000-4000-8000-000000000501',
    '96200000-0000-4000-8000-000000000401',
    'admin-user-read-payment-active',
    'received',
    4990,
    statement_timestamp() - interval '2 days',
    statement_timestamp() - interval '2 days',
    statement_timestamp() - interval '2 days',
    statement_timestamp() - interval '2 days'
  ),
  (
    '96200000-0000-4000-8000-000000000502',
    '96200000-0000-4000-8000-000000000403',
    'admin-user-read-payment-deleted',
    'refunded',
    4990,
    statement_timestamp() - interval '1 day',
    statement_timestamp() - interval '1 day',
    statement_timestamp() - interval '1 day',
    statement_timestamp() - interval '30 minutes'
  );

insert into public.billing_refund_requests (
  id,
  contract_id,
  user_id,
  status,
  previous_contract_status,
  eligibility_started_at,
  eligibility_ends_at,
  requested_at,
  last_attempt_at,
  provider_submitted_at,
  refund_confirmed_at,
  attempt_count,
  created_at,
  updated_at
) values (
  '96200000-0000-4000-8000-000000000601',
  '96200000-0000-4000-8000-000000000403',
  '96200000-0000-4000-8000-000000000004',
  'confirmed',
  'active',
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '6 days',
  statement_timestamp() - interval '12 hours',
  statement_timestamp() - interval '1 hour',
  statement_timestamp() - interval '11 hours',
  statement_timestamp() - interval '1 hour',
  1,
  statement_timestamp() - interval '12 hours',
  statement_timestamp() - interval '1 hour'
);

delete from private.app_administrator;
insert into private.app_administrator (user_id)
values ('96200000-0000-4000-8000-000000000001');

create temporary table admin_user_first_page (payload jsonb) on commit drop;
grant select, insert on admin_user_first_page to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96200000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96200000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $sql$ select public.list_admin_users_v1(
    'admin-read-fixture.test', 'current', 'all', null, null, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary account cannot list users'
);
select throws_ok(
  $sql$ select public.list_admin_users_v2(
    'admin-read-fixture.test', 'current', 'all', 1, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary account cannot list users through v2'
);
select throws_ok(
  $sql$ select public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary account cannot inspect diagnoses through v2'
);
select throws_ok(
  $sql$ select public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000004', null, null, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary account cannot inspect subscriptions through v2'
);
select throws_ok(
  $sql$ select public.list_admin_user_items_v1(
    '96200000-0000-4000-8000-000000000003', 'history', null, null, 20
  ) $sql$,
  '42501', 'administrator access required',
  'ordinary account cannot inspect administrative history'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96200000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96200000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $sql$ select public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000002'
  ) $sql$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot inspect users'
);
select throws_ok(
  $sql$ select public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000002'
  ) $sql$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot inspect users through v2'
);
select throws_ok(
  $sql$ select public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot inspect diagnosis collections'
);
reset role;

set local role anon;
select throws_ok(
  $sql$ select public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 1, 20
  ) $sql$,
  '42501',
  'permission denied for function list_admin_users_v2',
  'anonymous caller cannot execute the v2 list'
);
select throws_ok(
  $sql$ select public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) $sql$,
  '42501',
  'permission denied for function list_admin_user_diagnoses_v2',
  'anonymous caller cannot execute the diagnosis collection'
);
reset role;

set local role service_role;
select throws_ok(
  $sql$ select public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) $sql$,
  '42501',
  'permission denied for function get_admin_user_v2',
  'service role cannot execute the v2 detail function'
);
select throws_ok(
  $sql$ select public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000004', null, null, 20
  ) $sql$,
  '42501',
  'permission denied for function list_admin_user_subscriptions_v2',
  'service role cannot execute the subscription collection'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96200000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into admin_user_first_page (payload)
select public.list_admin_users_v1(
  'admin-read-fixture.test', 'current', 'all', null, null, 1
);

select is(
  (select payload #>> '{items,0,email}' from admin_user_first_page),
  'newer@admin-read-fixture.test',
  'newest matching non-admin user is first'
);
select is(
  (select jsonb_array_length(payload -> 'items') from admin_user_first_page),
  1,
  'page limit is applied in the database'
);
select ok(
  (select payload -> 'nextCursor' is not null from admin_user_first_page),
  'first page exposes a continuation cursor'
);
select is(
  (
    select public.list_admin_users_v1(
      'admin-read-fixture.test',
      'current',
      'all',
      (payload #>> '{nextCursor,createdAt}')::timestamptz,
      (payload #>> '{nextCursor,id}')::uuid,
      1
    ) #>> '{items,0,email}'
    from admin_user_first_page
  ),
  'older@admin-read-fixture.test',
  'cursor advances without repeating the first user'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000002'
  ) ->> 'email',
  'older@admin-read-fixture.test',
  'detail projection returns the requested real email'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000004'
  ) ->> 'state',
  'deleted',
  'excluded account remains inspectable by direct admin detail'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 1, 1
  ) ->> 'totalCount',
  '3',
  'filtered result exposes an exact total'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 2, 1
  ) #>> '{items,0,email}',
  'newer@admin-read-fixture.test',
  'page two is deterministic'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 4, 1
  ) -> 'items',
  '[]'::jsonb,
  'out-of-range page returns an empty item list'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) ->> 'state',
  'blocked',
  'administrator can inspect a blocked target'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) ->> 'fullName',
  'Cliente Bloqueado',
  'detail includes the onboarding name'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000004'
  ) ->> 'state',
  'deleted',
  'administrator can inspect a soft-deleted target through v2'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) #>> '{items,0,analysisMode}',
  'detailed',
  'blocked target diagnoses remain inspectable'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_user_diagnoses_v2(
      '96200000-0000-4000-8000-000000000005', null, null, 20
    ) -> 'items'
  ),
  1,
  'active target diagnoses remain inspectable'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_user_diagnoses_v2(
      '96200000-0000-4000-8000-000000000004', null, null, 20
    ) -> 'items'
  ),
  1,
  'deleted target diagnoses remain inspectable'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) #>> '{items,0,aiUsage,completedTurns}',
  '2',
  'completed AI turns are aggregated per report version'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) #>> '{items,0,aiUsage,failedTurns}',
  '1',
  'failed AI turns are counted separately'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 20
  ) #>> '{items,0,aiUsage,inputTokens}',
  '1200',
  'failed-turn token values do not enter completed usage totals'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003', null, null, 1
  ) #>> '{nextCursor,id}',
  '96202',
  'diagnosis cursor is based on the last returned row'
);
select is(
  public.list_admin_user_diagnoses_v2(
    '96200000-0000-4000-8000-000000000003',
    (
      public.list_admin_user_diagnoses_v2(
        '96200000-0000-4000-8000-000000000003', null, null, 1
      ) #>> '{nextCursor,createdAt}'
    )::timestamptz,
    public.list_admin_user_diagnoses_v2(
      '96200000-0000-4000-8000-000000000003', null, null, 1
    ) #>> '{nextCursor,id}',
    1
  ) #>> '{items,0,id}',
  '96203',
  'diagnosis cursor advances deterministically'
);
select ok(
  not (
    public.list_admin_user_diagnoses_v2(
      '96200000-0000-4000-8000-000000000003', null, null, 20
    )::text ~ 'reportSnapshot|question|answer|asaas'
  ),
  'diagnosis payload omits reports, AI content and provider identifiers'
);
select is(
  public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000004', null, null, 20
  ) #>> '{items,0,refund,status}',
  'confirmed',
  'deleted target billing history remains inspectable'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_user_subscriptions_v2(
      '96200000-0000-4000-8000-000000000003', null, null, 20
    ) -> 'items'
  ),
  1,
  'blocked target billing history remains inspectable'
);
select is(
  public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000005', null, null, 20
  ) #>> '{items,0,payment,receivedCents}',
  '4990',
  'payment summary includes received value'
);
select is(
  public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000005', null, null, 1
  ) #>> '{nextCursor,id}',
  '96200000-0000-4000-8000-000000000401',
  'subscription cursor is based on the last returned row'
);
select is(
  public.list_admin_user_subscriptions_v2(
    '96200000-0000-4000-8000-000000000005',
    (
      public.list_admin_user_subscriptions_v2(
        '96200000-0000-4000-8000-000000000005', null, null, 1
      ) #>> '{nextCursor,createdAt}'
    )::timestamptz,
    (
      public.list_admin_user_subscriptions_v2(
        '96200000-0000-4000-8000-000000000005', null, null, 1
      ) #>> '{nextCursor,id}'
    )::uuid,
    1
  ) #>> '{items,0,id}',
  '96200000-0000-4000-8000-000000000404',
  'subscription cursor advances deterministically'
);
select ok(
  not (
    public.list_admin_user_subscriptions_v2(
      '96200000-0000-4000-8000-000000000004', null, null, 20
    )::text ~ 'externalReference|asaas|checkout'
  ),
  'subscription payload omits provider and checkout identifiers'
);
select is(
  public.list_admin_users_v1('admin-read-fixture.test', 'active', 'all', null, null, 20) #>> '{items,0,email}',
  'older@admin-read-fixture.test',
  'state filter distinguishes active and blocked users'
);
select is(
  public.list_admin_users_v1('ADMIN-READ-FIXTURE.TEST', 'all', 'courtesy', null, null, 20) #>> '{items,0,email}',
  'older@admin-read-fixture.test',
  'search is case-insensitive and courtesy filter uses effective access'
);
select is(
  public.list_admin_users_v1('admin-read-fixture.test', 'current', 'all', null, null, 20) -> 'items' @> '[{"email":"excluded@admin-read-fixture.test"}]'::jsonb,
  false,
  'default scope omits excluded accounts'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000001'
  ),
  null::jsonb,
  'administrator cannot inspect their own account through user management'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000099'
  ),
  null::jsonb,
  'missing account returns null'
);
select is(
  jsonb_array_length(
    public.list_admin_user_items_v1(
      '96200000-0000-4000-8000-000000000002',
      'history',
      null,
      null,
      20
    ) -> 'items'
  ),
  0,
  'empty history is represented as an empty list'
);
select ok(
  (select payload::text not like '%report_snapshot%' from admin_user_first_page),
  'list does not expose raw diagnosis snapshots'
);
reset role;

select * from finish();
rollback;
