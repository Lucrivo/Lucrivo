begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_function(
  'public',
  'apply_asaas_webhook_event',
  array['text', 'text', 'jsonb'],
  'transactional Asaas reducer exists'
);

select ok(
  (
    select not prosecdef
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid =
      'public.apply_asaas_webhook_event(text,text,jsonb)'::regprocedure
  ),
  'the reducer is security invoker with an empty search path'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.apply_asaas_webhook_event(text,text,jsonb)',
    'execute'
  ),
  'service_role may execute the reducer'
);
select ok(
  not has_function_privilege(
    'public',
    'public.apply_asaas_webhook_event(text,text,jsonb)',
    'execute'
  ),
  'public cannot execute the reducer'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.apply_asaas_webhook_event(text,text,jsonb)',
    'execute'
  ),
  'anon cannot execute the reducer'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.apply_asaas_webhook_event(text,text,jsonb)',
    'execute'
  ),
  'authenticated cannot execute the reducer'
);

insert into auth.users (id, aud, role, email)
select
  format(
    '91000000-0000-4000-8000-%s',
    lpad(value::text, 12, '0')
  )::uuid,
  'authenticated',
  'authenticated',
  format('webhook-%s@example.com', value)
from generate_series(1, 12) as value;

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
  status
) values
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'contract-monthly-card',
    'monthly', 'credit_card', 'recurring', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'contract-monthly-pix',
    'monthly', 'pix', 'detached', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'contract-annual-card',
    'annual', 'credit_card', 'installment', 47880, 'BRL', 12, 12, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000004',
    '91000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    'contract-annual-pix',
    'annual', 'pix', 'detached', 47880, 'BRL', 12, 12, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000005',
    '91000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000001',
    'contract-cancel',
    'monthly', 'pix', 'detached', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000006',
    '91000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000001',
    'contract-expire',
    'monthly', 'pix', 'detached', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000007',
    '91000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000001',
    'contract-retry',
    'monthly', 'credit_card', 'recurring', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000008',
    '91000000-0000-4000-8000-000000000008',
    '20000000-0000-4000-8000-000000000001',
    'contract-customer-fallback',
    'monthly', 'pix', 'detached', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000009',
    '91000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000001',
    'contract-ambiguous-a',
    'monthly', 'pix', 'detached', 4990, 'BRL', null, 1, 'active'
  ),
  (
    '92000000-0000-4000-8000-000000000010',
    '91000000-0000-4000-8000-000000000009',
    '20000000-0000-4000-8000-000000000002',
    'contract-ambiguous-b',
    'annual', 'pix', 'detached', 47880, 'BRL', 12, 12, 'active'
  ),
  (
    '92000000-0000-4000-8000-000000000011',
    '91000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000001',
    'contract-payment-checkout-session',
    'monthly', 'credit_card', 'recurring', 4990, 'BRL', null, 1, 'pending'
  ),
  (
    '92000000-0000-4000-8000-000000000012',
    '91000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000001',
    'contract-subscription-checkout-session',
    'monthly', 'credit_card', 'recurring', 4990, 'BRL', null, 1, 'pending'
  );

update public.billing_contracts
set asaas_checkout_id = case id
  when '92000000-0000-4000-8000-000000000011'
    then 'chk_payment_checkout_session'
  when '92000000-0000-4000-8000-000000000012'
    then 'chk_subscription_checkout_session'
end
where id in (
  '92000000-0000-4000-8000-000000000011',
  '92000000-0000-4000-8000-000000000012'
);

update public.billing_contracts
set access_starts_at = '2026-01-01T00:00:00Z',
    access_ends_at = '2028-01-01T00:00:00Z'
where id in (
  '92000000-0000-4000-8000-000000000009',
  '92000000-0000-4000-8000-000000000010'
);

set local role service_role;

select is(
  public.apply_asaas_webhook_event(
    'evt-payment-checkout-session',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-09T12:00:00Z",
      "payment":{
        "id":"pay_checkout_session",
        "checkoutSession":"chk_payment_checkout_session",
        "subscription":"sub_payment_checkout_session",
        "customer":"cus_payment_checkout_session",
        "value":49.90,
        "dueDate":"2026-09-09"
      }
    }'::jsonb
  ),
  'processed',
  'PAYMENT_CONFIRMED resolves its contract by checkoutSession'
);
select results_eq(
  $$
    select c.status, c.asaas_subscription_id, p.status
    from public.billing_contracts as c
    join public.billing_payments as p on p.contract_id = c.id
    where c.id = '92000000-0000-4000-8000-000000000011'
  $$,
  $$ values (
    'active'::text,
    'sub_payment_checkout_session'::text,
    'confirmed'::text
  ) $$,
  'payment checkoutSession attaches identifiers and grants access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-subscription-checkout-session',
    'SUBSCRIPTION_CREATED',
    '{
      "dateCreated":"2026-09-09T12:01:00Z",
      "subscription":{
        "id":"sub_checkout_session",
        "checkoutSession":"chk_subscription_checkout_session",
        "customer":"cus_subscription_checkout_session"
      }
    }'::jsonb
  ),
  'processed',
  'SUBSCRIPTION_CREATED resolves its contract by checkoutSession'
);
select results_eq(
  $$
    select status, asaas_subscription_id
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000012'
  $$,
  $$ values ('pending'::text, 'sub_checkout_session'::text) $$,
  'subscription checkoutSession attaches its identifier without access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-checkout-created',
    'CHECKOUT_CREATED',
    '{
      "dateCreated":"2026-09-09 10:00:00",
      "checkout":{
        "id":"chk_monthly_card",
        "externalReference":"contract-monthly-card",
        "customer":"cus_monthly_card"
      }
    }'::jsonb
  ),
  'processed',
  'CHECKOUT_CREATED attaches provider identifiers'
);

select results_eq(
  $$
    select asaas_checkout_id, status
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('chk_monthly_card'::text, 'pending'::text) $$,
  'CHECKOUT_CREATED does not grant access'
);
select results_eq(
  $$
    select user_id, asaas_customer_id
    from public.billing_customers
    where user_id = '91000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    '91000000-0000-4000-8000-000000000001'::uuid,
    'cus_monthly_card'::text
  ) $$,
  'the customer mapping is stored without personal data'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-checkout-created',
    'CHECKOUT_CREATED',
    '{"checkout":{"id":"ignored-duplicate"}}'::jsonb
  ),
  'duplicate',
  'a completed event is idempotent'
);
select results_eq(
  $$
    select count(*)::bigint, max(attempt_count)::integer
    from public.asaas_webhook_events
    where id = 'evt-checkout-created'
  $$,
  $$ values (1::bigint, 1::integer) $$,
  'a duplicate does not create or retry its ledger row'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-checkout-paid-mc',
    'CHECKOUT_PAID',
    '{
      "dateCreated":"2026-09-09 10:00:00",
      "checkout":{
        "id":"chk_monthly_card",
        "externalReference":"contract-monthly-card",
        "customer":"cus_monthly_card"
      }
    }'::jsonb
  ),
  'processed',
  'CHECKOUT_PAID grants the initial monthly interval'
);
select results_eq(
  $$
    select status, access_starts_at, access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    'active'::text,
    '2026-09-09T13:00:00Z'::timestamptz,
    '2026-10-09T13:00:00Z'::timestamptz
  ) $$,
  'documented local event datetime is normalized to UTC'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-sub-created',
    'SUBSCRIPTION_CREATED',
    '{
      "dateCreated":"2026-09-09T13:01:00Z",
      "subscription":{
        "id":"sub_monthly_card",
        "externalReference":"contract-monthly-card",
        "customer":"cus_monthly_card"
      }
    }'::jsonb
  ),
  'processed',
  'SUBSCRIPTION_CREATED attaches the recurring identifier'
);
select results_eq(
  $$
    select asaas_subscription_id, access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    'sub_monthly_card'::text,
    '2026-10-09T13:00:00Z'::timestamptz
  ) $$,
  'subscription creation does not extend access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-payment-mc-first',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-09T13:02:00Z",
      "payment":{
        "id":"pay_monthly_card_1",
        "customer":"cus_monthly_card",
        "subscription":"sub_monthly_card",
        "value":49.90,
        "dueDate":"2026-09-09"
      }
    }'::jsonb
  ),
  'processed',
  'the first card confirmation resolves by subscription'
);
select results_eq(
  $$
    select access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('2026-10-09T13:00:00Z'::timestamptz) $$,
  'the first card confirmation does not duplicate Checkout access'
);
select results_eq(
  $$
    select status, value_cents, due_date, confirmed_at
    from public.billing_payments
    where asaas_payment_id = 'pay_monthly_card_1'
  $$,
  $$ values (
    'confirmed'::text,
    4990::bigint,
    '2026-09-09'::date,
    '2026-09-09T13:02:00Z'::timestamptz
  ) $$,
  'payment money is converted through exact numeric cents'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-payment-mc-second',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-10-09T12:00:00Z",
      "payment":{
        "id":"pay_monthly_card_2",
        "subscription":"sub_monthly_card",
        "customer":"cus_monthly_card",
        "value":49.99,
        "dueDate":"2026-10-09"
      }
    }'::jsonb
  ),
  'processed',
  'a new monthly card cycle is processed'
);
select results_eq(
  $$
    select access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('2026-11-09T00:00:00Z'::timestamptz) $$,
  'a new card cycle advances access from its due-date boundary'
);
select results_eq(
  $$
    select value_cents
    from public.billing_payments
    where asaas_payment_id = 'pay_monthly_card_2'
  $$,
  $$ values (4999::bigint) $$,
  'decimal payment values never pass through floating point'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-payment-mc-old',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-01T12:00:00Z",
      "payment":{
        "id":"pay_monthly_card_old",
        "subscription":"sub_monthly_card",
        "value":49.90,
        "dueDate":"2026-09-01"
      }
    }'::jsonb
  ),
  'processed',
  'an out-of-order older cycle is accepted idempotently'
);
select results_eq(
  $$
    select access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('2026-11-09T00:00:00Z'::timestamptz) $$,
  'an out-of-order payment never shortens access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-payment-received',
    'PAYMENT_RECEIVED',
    '{
      "dateCreated":"2026-10-10T12:00:00Z",
      "payment":{
        "id":"pay_monthly_card_2",
        "subscription":"sub_monthly_card",
        "value":49.99,
        "dueDate":"2026-10-09"
      }
    }'::jsonb
  ),
  'processed',
  'PAYMENT_RECEIVED records settlement'
);
select results_eq(
  $$
    select c.access_ends_at, p.status, p.received_at
    from public.billing_contracts as c
    join public.billing_payments as p on p.contract_id = c.id
    where p.asaas_payment_id = 'pay_monthly_card_2'
  $$,
  $$ values (
    '2026-11-09T00:00:00Z'::timestamptz,
    'received'::text,
    '2026-10-10T12:00:00Z'::timestamptz
  ) $$,
  'settlement does not grant another interval'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-monthly-pix-first',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-10T12:00:00Z",
      "payment":{
        "id":"pay_monthly_pix_1",
        "externalReference":"contract-monthly-pix",
        "customer":"cus_monthly_pix",
        "value":49.90,
        "dueDate":"2026-09-10"
      }
    }'::jsonb
  ),
  'processed',
  'monthly Pix grants its prepaid interval'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-monthly-pix-later',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-20T12:00:00Z",
      "payment":{
        "id":"pay_monthly_pix_2",
        "externalReference":"contract-monthly-pix",
        "value":49.90,
        "dueDate":"2026-09-20"
      }
    }'::jsonb
  ),
  'processed',
  'a later event for the same monthly Pix contract is recorded'
);
select results_eq(
  $$
    select status, access_starts_at, access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000002'
  $$,
  $$ values (
    'active'::text,
    '2026-09-10T12:00:00Z'::timestamptz,
    '2026-10-10T12:00:00Z'::timestamptz
  ) $$,
  'monthly Pix is never silently renewed'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-annual-card-paid',
    'CHECKOUT_PAID',
    '{
      "dateCreated":"2026-08-11T12:00:00Z",
      "checkout":{
        "id":"chk_annual_card",
        "externalReference":"contract-annual-card",
        "customer":"cus_annual_card"
      }
    }'::jsonb
  ),
  'processed',
  'annual card Checkout grants twelve months once'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-annual-card-installment',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-01T12:00:00Z",
      "payment":{
        "id":"pay_annual_card_1",
        "externalReference":"contract-annual-card",
        "installment":"ins_annual_card",
        "value":39.90,
        "installmentNumber":1,
        "dueDate":"2026-09-01"
      }
    }'::jsonb
  ),
  'processed',
  'annual installment settlement is recorded'
);
select results_eq(
  $$
    select access_starts_at, access_ends_at, asaas_installment_id
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000003'
  $$,
  $$ values (
    '2026-08-11T12:00:00Z'::timestamptz,
    '2027-08-11T12:00:00Z'::timestamptz,
    'ins_annual_card'::text
  ) $$,
  'annual card installments never multiply annual access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-annual-pix-first',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-08-12T12:00:00Z",
      "payment":{
        "id":"pay_annual_pix_1",
        "externalReference":"contract-annual-pix",
        "value":478.80,
        "dueDate":"2026-08-12"
      }
    }'::jsonb
  ),
  'processed',
  'annual Pix grants twelve months once'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-annual-pix-later',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-02T12:00:00Z",
      "payment":{
        "id":"pay_annual_pix_2",
        "externalReference":"contract-annual-pix",
        "value":478.80,
        "dueDate":"2026-09-02"
      }
    }'::jsonb
  ),
  'processed',
  'later annual Pix events are recorded'
);
select results_eq(
  $$
    select access_starts_at, access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000004'
  $$,
  $$ values (
    '2026-08-12T12:00:00Z'::timestamptz,
    '2027-08-12T12:00:00Z'::timestamptz
  ) $$,
  'annual Pix is never silently renewed'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-capture-refused',
    'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
    '{
      "dateCreated":"2026-09-03T12:00:00Z",
      "payment":{
        "id":"pay_annual_card_2",
        "externalReference":"contract-annual-card",
        "value":39.90,
        "dueDate":"2026-09-03"
      }
    }'::jsonb
  ),
  'processed',
  'capture refusal is recorded'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-overdue',
    'PAYMENT_OVERDUE',
    '{
      "dateCreated":"2026-09-04T12:00:00Z",
      "payment":{
        "id":"pay_annual_card_3",
        "externalReference":"contract-annual-card",
        "value":39.90,
        "dueDate":"2026-09-04"
      }
    }'::jsonb
  ),
  'processed',
  'overdue payment is recorded'
);
select results_eq(
  $$
    select
      (select access_ends_at from public.billing_contracts
       where id = '92000000-0000-4000-8000-000000000003'),
      array_agg(status order by status)
    from public.billing_payments
    where asaas_payment_id in ('pay_annual_card_2', 'pay_annual_card_3')
  $$,
  $$ values (
    '2027-08-11T12:00:00Z'::timestamptz,
    array['capture_refused', 'overdue']::text[]
  ) $$,
  'refused and overdue events never grant or extend access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-partial-refund',
    'PAYMENT_PARTIALLY_REFUNDED',
    '{
      "dateCreated":"2026-09-08T12:00:00Z",
      "payment":{
        "id":"pay_annual_card_1",
        "externalReference":"contract-annual-card",
        "value":39.90,
        "dueDate":"2026-09-01"
      }
    }'::jsonb
  ),
  'processed',
  'partial refund is accepted for manual review'
);
select results_eq(
  $$
    select c.access_ends_at, p.status, e.last_error
    from public.billing_contracts as c
    join public.billing_payments as p on p.contract_id = c.id
    join public.asaas_webhook_events as e on e.id = 'evt-partial-refund'
    where p.asaas_payment_id = 'pay_annual_card_1'
  $$,
  $$ values (
    '2027-08-11T12:00:00Z'::timestamptz,
    'partially_refunded'::text,
    'manual_review_required'::text
  ) $$,
  'partial refund leaves access unchanged and flags review'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-full-refund',
    'PAYMENT_REFUNDED',
    '{
      "dateCreated":"2026-09-09T12:00:00Z",
      "payment":{
        "id":"pay_annual_pix_1",
        "externalReference":"contract-annual-pix",
        "value":478.80,
        "dueDate":"2026-08-12"
      }
    }'::jsonb
  ),
  'processed',
  'full refund is processed'
);
select ok(
  (
    select status = 'refunded'
      and access_ends_at <= statement_timestamp()
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000004'
  ),
  'full refund revokes access immediately'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-chargeback',
    'PAYMENT_CHARGEBACK_REQUESTED',
    '{
      "dateCreated":"2026-09-09T13:00:00Z",
      "payment":{
        "id":"pay_annual_card_1",
        "externalReference":"contract-annual-card",
        "value":39.90,
        "dueDate":"2026-09-01"
      }
    }'::jsonb
  ),
  'processed',
  'chargeback request is processed'
);
select ok(
  (
    select status = 'chargeback'
      and access_ends_at <= statement_timestamp()
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000003'
  ),
  'chargeback revokes access immediately'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-checkout-canceled',
    'CHECKOUT_CANCELED',
    '{
      "dateCreated":"2026-09-13T12:00:00Z",
      "checkout":{
        "id":"chk_cancel",
        "externalReference":"contract-cancel"
      }
    }'::jsonb
  ),
  'processed',
  'canceled Checkout closes a pending contract'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-checkout-expired',
    'CHECKOUT_EXPIRED',
    '{
      "dateCreated":"2026-09-13T13:00:00Z",
      "checkout":{
        "id":"chk_expire",
        "externalReference":"contract-expire"
      }
    }'::jsonb
  ),
  'processed',
  'expired Checkout closes a pending contract'
);
select results_eq(
  $$
    select external_reference, status
    from public.billing_contracts
    where id in (
      '92000000-0000-4000-8000-000000000005',
      '92000000-0000-4000-8000-000000000006'
    )
    order by external_reference
  $$,
  $$ values
    ('contract-cancel'::text, 'canceled'::text),
    ('contract-expire'::text, 'expired'::text)
  $$,
  'Checkout terminal events affect only pending contracts'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-cancel-active-checkout',
    'CHECKOUT_CANCELED',
    '{
      "dateCreated":"2026-09-14T12:00:00Z",
      "checkout":{
        "id":"chk_monthly_card",
        "externalReference":"contract-monthly-card"
      }
    }'::jsonb
  ),
  'processed',
  'late Checkout cancellation is recorded'
);
select results_eq(
  $$
    select status, access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    'active'::text,
    '2026-11-09T00:00:00Z'::timestamptz
  ) $$,
  'late Checkout cancellation cannot close active access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-sub-inactivated',
    'SUBSCRIPTION_INACTIVATED',
    '{
      "dateCreated":"2026-10-20 09:30:00",
      "subscription":{
        "id":"sub_monthly_card",
        "customer":"cus_monthly_card"
      }
    }'::jsonb
  ),
  'processed',
  'subscription inactivation is processed'
);
select results_eq(
  $$
    select status, cancel_at_period_end, cancellation_confirmed_at,
      access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    'cancel_at_period_end'::text,
    true,
    '2026-10-20T12:30:00Z'::timestamptz,
    '2026-11-09T00:00:00Z'::timestamptz
  ) $$,
  'subscription cancellation preserves prepaid access'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-sub-deleted',
    'SUBSCRIPTION_DELETED',
    '{
      "dateCreated":"2026-10-21T12:30:00Z",
      "subscription":{
        "id":"sub_monthly_card",
        "customer":"cus_monthly_card"
      }
    }'::jsonb
  ),
  'processed',
  'subscription deletion confirms cancellation at period end'
);
select results_eq(
  $$
    select status, cancel_at_period_end, cancellation_confirmed_at,
      access_ends_at
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    'cancel_at_period_end'::text,
    true,
    '2026-10-21T12:30:00Z'::timestamptz,
    '2026-11-09T00:00:00Z'::timestamptz
  ) $$,
  'subscription deletion keeps the already-paid interval intact'
);

insert into public.billing_customers (user_id, asaas_customer_id)
values
  ('91000000-0000-4000-8000-000000000008', 'cus_fallback'),
  ('91000000-0000-4000-8000-000000000009', 'cus_ambiguous');

select is(
  public.apply_asaas_webhook_event(
    'evt-customer-fallback',
    'CHECKOUT_CREATED',
    '{
      "dateCreated":"2026-09-15T12:00:00Z",
      "checkout":{"id":"chk_fallback","customer":"cus_fallback"}
    }'::jsonb
  ),
  'processed',
  'a customer resolves exactly one non-final contract'
);
select results_eq(
  $$
    select asaas_checkout_id
    from public.billing_contracts
    where id = '92000000-0000-4000-8000-000000000008'
  $$,
  $$ values ('chk_fallback'::text) $$,
  'customer fallback attaches the provider ID to its sole contract'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-customer-ambiguous',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-15T12:00:00Z",
      "payment":{
        "id":"pay_ambiguous",
        "customer":"cus_ambiguous",
        "value":49.90,
        "dueDate":"2026-09-15"
      }
    }'::jsonb
  ),
  'unresolved',
  'an ambiguous customer does not guess a contract'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-late-mapping',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-16T12:00:00Z",
      "payment":{
        "id":"pay_late",
        "subscription":"sub_late",
        "value":49.90,
        "dueDate":"2026-09-16"
      }
    }'::jsonb
  ),
  'unresolved',
  'a known event without a mapping is retained for retry'
);
select results_eq(
  $$
    select processing_status, attempt_count, processed_at is null
    from public.asaas_webhook_events
    where id = 'evt-late-mapping'
  $$,
  $$ values ('failed'::text, 1::integer, true) $$,
  'an unresolved event is durable and non-final'
);

update public.billing_contracts
set asaas_subscription_id = 'sub_late'
where id = '92000000-0000-4000-8000-000000000007';

select is(
  public.apply_asaas_webhook_event(
    'evt-late-mapping',
    'PAYMENT_CONFIRMED',
    '{
      "dateCreated":"2026-09-16T12:00:00Z",
      "payment":{
        "id":"pay_late",
        "subscription":"sub_late",
        "value":49.90,
        "dueDate":"2026-09-16"
      }
    }'::jsonb
  ),
  'processed',
  'a failed event can be retried after reconciliation'
);
select results_eq(
  $$
    select processing_status, attempt_count, processed_at is not null
    from public.asaas_webhook_events
    where id = 'evt-late-mapping'
  $$,
  $$ values ('processed'::text, 2::integer, true) $$,
  'successful retry finalizes the original ledger row'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-future-provider-event',
    'PAYMENT_NEW_EVENT_ADDED_LATER',
    '{"dateCreated":"2026-09-17T12:00:00Z","newResource":{"id":"x"}}'::jsonb
  ),
  'ignored',
  'unknown forward-compatible events are ignored safely'
);
select results_eq(
  $$
    select processing_status, processed_at is not null
    from public.asaas_webhook_events
    where id = 'evt-future-provider-event'
  $$,
  $$ values ('ignored'::text, true) $$,
  'ignored events remain visible in the durable ledger'
);

reset role;

set local role anon;
select throws_ok(
  $$
    select public.apply_asaas_webhook_event(
      'evt-anon', 'UNKNOWN', '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'anon cannot invoke the reducer'
);
select throws_ok(
  $$ select count(*) from public.asaas_webhook_events $$,
  '42501',
  null,
  'anon cannot read webhook payloads'
);

reset role;
set local role authenticated;
select throws_ok(
  $$
    select public.apply_asaas_webhook_event(
      'evt-authenticated', 'UNKNOWN', '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'authenticated cannot invoke the reducer'
);
select throws_ok(
  $$ select count(*) from public.asaas_webhook_events $$,
  '42501',
  null,
  'authenticated cannot read webhook payloads'
);

reset role;

select * from finish();

rollback;
