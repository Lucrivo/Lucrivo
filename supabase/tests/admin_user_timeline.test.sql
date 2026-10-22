begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'list_admin_user_history_v2',
  array['uuid', 'timestamp with time zone', 'text', 'integer'],
  'typed unified admin user timeline exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.list_admin_user_history_v2(uuid,timestamptz,text,integer)',
    'execute'
  ),
  'authenticated callers can reach the timeline authorization boundary'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.list_admin_user_history_v2(uuid,timestamptz,text,integer)',
    'execute'
  ),
  'anonymous callers cannot execute the timeline'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.list_admin_user_history_v2(uuid,timestamptz,text,integer)',
    'execute'
  ),
  'service role cannot bypass timeline authorization'
);

insert into auth.users (
  id, aud, role, email, created_at, last_sign_in_at
) values
  (
    '96400000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@admin-timeline-fixture.test',
    '2026-09-01T12:00:00Z',
    '2026-10-21T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'target@admin-timeline-fixture.test',
    '2026-10-01T12:00:00Z',
    '2026-10-20T10:00:00Z'
  );

insert into public.onboarding_profiles (
  user_id,
  full_name,
  whatsapp_e164,
  segment_id,
  subcategory_id,
  custom_subcategory,
  whatsapp_marketing_consent,
  marketing_consent_granted_at,
  completed_at,
  updated_at
)
select
  '96400000-0000-4000-8000-000000000002',
  'Cliente da Linha do Tempo',
  '+5511999996402',
  segment.id,
  null,
  'Ateliê de testes',
  false,
  null,
  '2026-10-02T12:00:00Z',
  '2026-10-03T12:00:00Z'
from public.business_segments as segment
where segment.name = 'Comércio';

insert into private.whatsapp_consent_events (
  user_id, decision, copy_version, source, created_at
) values
  (
    '96400000-0000-4000-8000-000000000002',
    'granted',
    'whatsapp-marketing-v1',
    'onboarding',
    '2026-10-02T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    'declined',
    'whatsapp-marketing-v1',
    'account',
    '2026-10-04T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    'revoked',
    'whatsapp-marketing-v1',
    'account',
    '2026-10-05T12:00:00Z'
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
  version,
  created_at,
  updated_at
) overriding system value values
  (
    96401,
    '96400000-0000-4000-8000-000000000101',
    '96400000-0000-4000-8000-000000000002',
    'product',
    'resale',
    3,
    3,
    5,
    10000,
    2000,
    2000,
    'tight_margin',
    'margin',
    'unit',
    '{"fixture":"timeline-quick"}',
    true,
    'quick',
    null,
    null,
    null,
    null,
    0,
    '2026-10-06T10:00:00Z',
    '2026-10-06T10:00:00Z'
  ),
  (
    96402,
    '96400000-0000-4000-8000-000000000102',
    '96400000-0000-4000-8000-000000000002',
    'product',
    'resale',
    3,
    3,
    5,
    null,
    null,
    null,
    'positive_result',
    'price',
    'mix',
    '{"fixture":"timeline-detailed"}',
    false,
    'detailed',
    600000,
    140000,
    4,
    false,
    2,
    '2026-10-06T12:00:00Z',
    '2026-10-06T12:00:00Z'
  );

insert into public.report_ai_conversations (
  user_id, diagnosis_id, report_version
) values (
  '96400000-0000-4000-8000-000000000002', 96402, 2
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
  created_at,
  completed_at
)
select
  conversation.id,
  conversation.user_id,
  '96400000-0000-4000-8000-000000000201',
  'Conteúdo confidencial da pergunta',
  'Conteúdo confidencial da resposta',
  'completed',
  'gpt-6-luna',
  1000,
  200,
  300,
  '2026-10-06T12:10:00Z',
  '2026-10-06T12:11:00Z'
from public.report_ai_conversations as conversation
where conversation.diagnosis_id = 96402;

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
) values
  (
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-fixture',
    'standard',
    'monthly',
    1,
    4990,
    'BRL',
    null,
    1,
    0
  ),
  (
    '96400000-0000-4000-8000-000000000302',
    'admin-timeline-fixture',
    'standard',
    'semiannual',
    1,
    23940,
    'BRL',
    6,
    6,
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
  installment_limit,
  access_months,
  bonus_months,
  status,
  access_starts_at,
  access_ends_at,
  cancel_at_period_end,
  cancellation_requested_at,
  cancellation_confirmed_at,
  created_at,
  updated_at
) values
  (
    '96400000-0000-4000-8000-000000000401',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-recurring',
    'standard',
    'monthly',
    'credit_card',
    'recurring',
    4990,
    'BRL',
    null,
    1,
    0,
    'active',
    '2026-10-07T10:00:00Z',
    '2026-12-07T10:00:00Z',
    false,
    null,
    null,
    '2026-10-07T09:00:00Z',
    '2026-10-12T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000402',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000302',
    'admin-timeline-installment',
    'standard',
    'semiannual',
    'credit_card',
    'installment',
    23940,
    'BRL',
    6,
    6,
    0,
    'active',
    '2026-10-08T10:00:00Z',
    '2027-04-08T10:00:00Z',
    false,
    null,
    null,
    '2026-10-08T09:00:00Z',
    '2026-10-09T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000403',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-canceling',
    'standard',
    'monthly',
    'credit_card',
    'recurring',
    4990,
    'BRL',
    null,
    1,
    0,
    'cancel_at_period_end',
    '2026-10-09T10:00:00Z',
    '2026-11-09T10:00:00Z',
    true,
    '2026-10-10T10:00:00Z',
    '2026-10-10T10:05:00Z',
    '2026-10-09T09:00:00Z',
    '2026-10-10T10:05:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000404',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-expired',
    'standard',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    0,
    'expired',
    '2026-09-19T10:00:00Z',
    '2026-10-19T10:00:00Z',
    false,
    null,
    null,
    '2026-09-19T09:00:00Z',
    '2026-10-19T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000405',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-refund-request',
    'standard',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    0,
    'refunded',
    '2026-10-11T09:00:00Z',
    '2026-11-11T09:00:00Z',
    false,
    null,
    null,
    '2026-10-11T08:00:00Z',
    '2026-10-12T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000406',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-payment-refund',
    'standard',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    0,
    'refunded',
    '2026-10-12T09:00:00Z',
    '2026-11-12T09:00:00Z',
    false,
    null,
    null,
    '2026-10-12T08:00:00Z',
    '2026-10-13T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000407',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-chargeback',
    'standard',
    'monthly',
    'credit_card',
    'recurring',
    4990,
    'BRL',
    null,
    1,
    0,
    'chargeback',
    '2026-10-13T09:00:00Z',
    '2026-11-13T09:00:00Z',
    false,
    null,
    null,
    '2026-10-13T08:00:00Z',
    '2026-10-14T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000408',
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000301',
    'admin-timeline-payment-failed',
    'standard',
    'monthly',
    'credit_card',
    'recurring',
    4990,
    'BRL',
    null,
    1,
    0,
    'failed',
    null,
    null,
    false,
    null,
    null,
    '2026-10-14T08:00:00Z',
    '2026-10-14T12:00:00Z'
  );

insert into public.billing_payments (
  id,
  contract_id,
  asaas_payment_id,
  status,
  value_cents,
  installment_number,
  confirmed_at,
  received_at,
  refunded_at,
  chargeback_at,
  created_at,
  updated_at
) values
  (
    '96400000-0000-4000-8000-000000000501',
    '96400000-0000-4000-8000-000000000401',
    'admin-timeline-recurring-first',
    'confirmed',
    4990,
    null,
    '2026-10-07T10:00:00Z',
    null,
    null,
    null,
    '2026-10-07T09:30:00Z',
    '2026-10-07T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000502',
    '96400000-0000-4000-8000-000000000401',
    'admin-timeline-recurring-later',
    'received',
    4990,
    null,
    '2026-10-12T10:00:00Z',
    '2026-10-12T10:01:00Z',
    null,
    null,
    '2026-10-12T09:30:00Z',
    '2026-10-12T10:01:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000503',
    '96400000-0000-4000-8000-000000000402',
    'admin-timeline-installment-first',
    'confirmed',
    3990,
    1,
    '2026-10-08T10:00:00Z',
    null,
    null,
    null,
    '2026-10-08T09:30:00Z',
    '2026-10-08T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000504',
    '96400000-0000-4000-8000-000000000402',
    'admin-timeline-installment-second',
    'confirmed',
    3990,
    2,
    '2026-10-09T10:00:00Z',
    null,
    null,
    null,
    '2026-10-09T09:30:00Z',
    '2026-10-09T10:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000505',
    '96400000-0000-4000-8000-000000000405',
    'admin-timeline-refund-request-payment',
    'refunded',
    4990,
    null,
    '2026-10-11T09:00:00Z',
    '2026-10-11T09:01:00Z',
    '2026-10-12T12:00:00Z',
    null,
    '2026-10-11T08:30:00Z',
    '2026-10-12T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000506',
    '96400000-0000-4000-8000-000000000406',
    'admin-timeline-payment-refunded',
    'refunded',
    4990,
    null,
    '2026-10-12T09:00:00Z',
    '2026-10-12T09:01:00Z',
    '2026-10-13T12:00:00Z',
    null,
    '2026-10-12T08:30:00Z',
    '2026-10-13T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000507',
    '96400000-0000-4000-8000-000000000407',
    'admin-timeline-payment-chargeback',
    'chargeback_requested',
    4990,
    null,
    '2026-10-13T09:00:00Z',
    '2026-10-13T09:01:00Z',
    null,
    '2026-10-14T12:00:00Z',
    '2026-10-13T08:30:00Z',
    '2026-10-14T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000508',
    '96400000-0000-4000-8000-000000000408',
    'admin-timeline-payment-failed',
    'capture_refused',
    4990,
    null,
    null,
    null,
    null,
    null,
    '2026-10-14T11:00:00Z',
    '2026-10-14T12:00:00Z'
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
  '96400000-0000-4000-8000-000000000601',
  '96400000-0000-4000-8000-000000000405',
  '96400000-0000-4000-8000-000000000002',
  'confirmed',
  'active',
  '2026-10-11T09:00:00Z',
  '2026-10-18T09:00:00Z',
  '2026-10-12T10:00:00Z',
  '2026-10-12T12:00:00Z',
  '2026-10-12T10:05:00Z',
  '2026-10-12T12:00:00Z',
  1,
  '2026-10-12T10:00:00Z',
  '2026-10-12T12:00:00Z'
);

insert into private.admin_user_events (
  user_id, actor_id, action, reason, before_state, after_state, created_at
) values
  (
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000001',
    'courtesy_granted',
    'cortesia de teste',
    '{}'::jsonb,
    '{"courtesyExpiresAt":"2026-10-30T12:00:00Z"}'::jsonb,
    '2026-10-15T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000001',
    'courtesy_ended',
    'fim da cortesia de teste',
    '{"courtesyExpiresAt":"2026-10-30T12:00:00Z"}'::jsonb,
    '{"courtesyExpiresAt":null}'::jsonb,
    '2026-10-16T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000001',
    'unblocked',
    'desbloqueio de teste',
    '{"blockedAt":"2026-10-16T12:00:00Z"}'::jsonb,
    '{"blockedAt":null}'::jsonb,
    '2026-10-17T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000001',
    'soft_deleted',
    'exclusão de teste',
    '{}'::jsonb,
    '{"deletedAt":"2026-10-18T12:00:00Z"}'::jsonb,
    '2026-10-18T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000001',
    'restored',
    'restauração de teste',
    '{"deletedAt":"2026-10-18T12:00:00Z"}'::jsonb,
    '{"deletedAt":null}'::jsonb,
    '2026-10-19T12:00:00Z'
  ),
  (
    '96400000-0000-4000-8000-000000000002',
    '96400000-0000-4000-8000-000000000001',
    'blocked',
    'fixture with legacy state',
    '{}'::jsonb,
    '{"action":"blocked","sequence":3}'::jsonb,
    '2026-10-20T12:00:00Z'
  );

delete from private.app_administrator;
insert into private.app_administrator (user_id)
values ('96400000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96400000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $sql$ select public.list_admin_user_history_v2(
    '96400000-0000-4000-8000-000000000002', null, null, 50
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary authenticated account cannot inspect the timeline'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"96400000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $sql$ select public.list_admin_user_history_v2(
    '96400000-0000-4000-8000-000000000002', null, null, 50
  ) $sql$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot inspect the timeline'
);
reset role;

set local role anon;
select throws_ok(
  $sql$ select public.list_admin_user_history_v2(
    '96400000-0000-4000-8000-000000000002', null, null, 50
  ) $sql$,
  '42501',
  'permission denied for function list_admin_user_history_v2',
  'anonymous caller cannot execute the timeline'
);
reset role;

set local role service_role;
select throws_ok(
  $sql$ select public.list_admin_user_history_v2(
    '96400000-0000-4000-8000-000000000002', null, null, 50
  ) $sql$,
  '42501',
  'permission denied for function list_admin_user_history_v2',
  'service role cannot execute the timeline'
);
reset role;

create temporary table admin_timeline_payload (payload jsonb not null)
on commit drop;
grant select, insert on admin_timeline_payload to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96400000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into admin_timeline_payload (payload)
select public.list_admin_user_history_v2(
  '96400000-0000-4000-8000-000000000002', null, null, 50
);

select is(
  (
    select item ->> 'kind'
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'admin_blocked'
  ),
  'admin_blocked',
  'legacy partial state produces a valid admin event'
);
select is(
  (
    select item #>> '{payload,changes}'
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'admin_blocked'
  ),
  '[]',
  'missing legacy before/after keys normalize to no state changes'
);
select is(
  (
    select pg_catalog.count(*)::text
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'subscription_renewed'
  ),
  '1',
  'only later recurring monthly payments are renewals'
);
select is(
  (
    select pg_catalog.count(*)::text
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'subscription_expired'
  ),
  '1',
  'only already-ended access emits expiration'
);
select is(
  (
    select pg_catalog.count(distinct item ->> 'kind')::integer
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
  ),
  24,
  'the unified timeline includes every canonical event kind'
);
select is(
  (
    select pg_catalog.count(*)::integer
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
    where item ->> 'kind' = 'payment_refunded'
  ),
  1,
  'refund request confirmation suppresses the duplicate payment refund event'
);
select ok(
  not (
    (select payload::text from admin_timeline_payload)
      ~ 'reportSnapshot|question|answer|asaas|checkout'
  ),
  'timeline omits report, AI content and provider identifiers'
);
select is(
  (
    select item #>> '{payload,aiUsage,inputTokens}'
    from admin_timeline_payload,
      pg_catalog.jsonb_array_elements(payload -> 'items') as item
    where item ->> 'eventKey' = 'diagnosis:96402'
  ),
  '1000',
  'diagnosis timeline event includes bounded AI usage'
);
select ok(
  (
    select pg_catalog.bool_and(
      previous.occurred_at > current.occurred_at
      or (
        previous.occurred_at = current.occurred_at
        and previous.event_key > current.event_key
      )
    )
    from (
      select
        item ->> 'eventKey' as event_key,
        (item ->> 'occurredAt')::timestamptz as occurred_at,
        pg_catalog.row_number() over () as position
      from admin_timeline_payload,
        pg_catalog.jsonb_array_elements(payload -> 'items') as item
    ) as current
    join (
      select
        item ->> 'eventKey' as event_key,
        (item ->> 'occurredAt')::timestamptz as occurred_at,
        pg_catalog.row_number() over () as position
      from admin_timeline_payload,
        pg_catalog.jsonb_array_elements(payload -> 'items') as item
    ) as previous on previous.position = current.position - 1
  ),
  'timeline ordering is deterministic'
);

select ok(
  public.list_admin_user_history_v2(
    '96400000-0000-4000-8000-000000000002', null, null, 5
  ) -> 'nextCursor' is not null,
  'bounded timeline exposes a continuation cursor'
);

reset role;

select * from finish();
rollback;
