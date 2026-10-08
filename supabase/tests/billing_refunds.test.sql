begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table(
  'public',
  'billing_refund_requests',
  'refund requests are persisted'
);

select columns_are(
  'public',
  'billing_refund_requests',
  array[
    'id', 'contract_id', 'user_id', 'status', 'previous_contract_status',
    'eligibility_started_at', 'eligibility_ends_at', 'requested_at',
    'last_attempt_at', 'provider_submitted_at', 'refund_confirmed_at',
    'recurrence_canceled_at', 'rejected_at', 'attempt_count',
    'last_error_code', 'created_at', 'updated_at'
  ],
  'refund requests contain only normalized workflow state'
);

select fk_ok(
  'public', 'billing_refund_requests', 'contract_id',
  'public', 'billing_contracts', 'id'
);
select fk_ok(
  'public', 'billing_refund_requests', 'user_id',
  'auth', 'users', 'id'
);
select col_is_unique(
  'public', 'billing_refund_requests', 'contract_id',
  'one refund request exists per contract'
);
select has_index(
  'public', 'billing_refund_requests',
  'billing_refund_requests_user_id_idx',
  'refund owner foreign key is indexed'
);
select has_index(
  'public', 'billing_refund_requests',
  'billing_refund_requests_reconciliation_idx',
  'refund reconciliation backlog is indexed'
);
select policies_are(
  'public', 'billing_refund_requests',
  array['billing_refund_requests_select_own'],
  'refund requests expose only owner reads'
);
select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.billing_refund_requests'::regclass),
  'RLS is enabled for refund requests'
);
select table_privs_are(
  'public', 'billing_refund_requests', 'authenticated', array[]::text[],
  'authenticated has only safe column-level reads'
);
select results_eq(
  $$
    select p.column_name
    from information_schema.column_privileges p
    join information_schema.columns c
      using (table_schema, table_name, column_name)
    where p.table_schema = 'public'
      and p.table_name = 'billing_refund_requests'
      and p.grantee = 'authenticated'
      and p.privilege_type = 'SELECT'
    order by c.ordinal_position
  $$,
  $$ values
    ('id'::information_schema.sql_identifier),
    ('contract_id'::information_schema.sql_identifier),
    ('user_id'::information_schema.sql_identifier),
    ('status'::information_schema.sql_identifier),
    ('eligibility_started_at'::information_schema.sql_identifier),
    ('eligibility_ends_at'::information_schema.sql_identifier),
    ('requested_at'::information_schema.sql_identifier),
    ('provider_submitted_at'::information_schema.sql_identifier),
    ('refund_confirmed_at'::information_schema.sql_identifier),
    ('recurrence_canceled_at'::information_schema.sql_identifier),
    ('rejected_at'::information_schema.sql_identifier),
    ('last_error_code'::information_schema.sql_identifier),
    ('created_at'::information_schema.sql_identifier),
    ('updated_at'::information_schema.sql_identifier)
  $$,
  'authenticated cannot read restoration or provider-attempt internals'
);
select ok(
  has_function_privilege(
    'service_role', 'public.begin_billing_refund(uuid)', 'execute'
  ),
  'service role can atomically claim refunds'
);
select ok(
  not has_function_privilege(
    'authenticated', 'public.begin_billing_refund(uuid)', 'execute'
  ),
  'authenticated cannot invoke the privileged claim directly'
);

insert into auth.users (id, aud, role, email)
select
  format('a1000000-0000-4000-8000-%s', lpad(value::text, 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  format('refund-%s@example.com', value)
from generate_series(1, 7) as value;

insert into public.billing_contracts (
  id, user_id, price_id, external_reference, billing_mode, payment_method,
  charge_type, amount_cents, currency, installment_limit, access_months,
  asaas_subscription_id, asaas_installment_id, status,
  access_starts_at, access_ends_at
)
select
  format('a2000000-0000-4000-8000-%s', lpad(value::text, 12, '0'))::uuid,
  format('a1000000-0000-4000-8000-%s', lpad(value::text, 12, '0'))::uuid,
  case when value = 6
    then '20000000-0000-4000-8000-000000000002'::uuid
    else '20000000-0000-4000-8000-000000000001'::uuid
  end,
  format('refund-contract-%s', value),
  case when value = 6 then 'semiannual' else 'monthly' end,
  case when value in (2, 5, 6) then 'credit_card' else 'pix' end,
  case when value in (2, 5) then 'recurring'
       when value = 6 then 'installment'
       else 'detached' end,
  case when value = 6 then 17940 else 3990 end,
  'BRL',
  case when value = 6 then 6 else null end,
  case when value = 6 then 6 else 1 end,
  case value
    when 2 then 'sub_refund_2'
    when 5 then 'sub_refund_5'
    else null
  end,
  case when value = 6 then 'ins_refund_6' else null end,
  'active',
  case value
    when 1 then transaction_timestamp() - interval '7 days' + interval '1 second'
    when 2 then transaction_timestamp() - interval '7 days'
    when 3 then transaction_timestamp() - interval '7 days' - interval '1 microsecond'
    else transaction_timestamp() - interval '1 day'
  end,
  transaction_timestamp() + interval '1 month'
from generate_series(1, 6) as value;

insert into public.billing_payments (
  contract_id, asaas_payment_id, status, value_cents, installment_number,
  due_date, confirmed_at
)
select
  format('a2000000-0000-4000-8000-%s', lpad(value::text, 12, '0'))::uuid,
  format('pay_refund_%s', value),
  'confirmed',
  case when value = 6 then 2990 else 3990 end,
  case when value = 6 then 1 else null end,
  current_date,
  transaction_timestamp() - interval '1 day'
from generate_series(1, 6) as value
where value <> 4;

select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000001'::uuid
  )->>'status',
  'ready',
  'a request just before seven days is eligible'
);
select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000002'::uuid
  )->>'status',
  'ready',
  'the exact seven-day boundary is eligible'
);
select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000003'::uuid
  )->>'status',
  'not_eligible',
  'an instant after seven days is ineligible'
);
select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000004'::uuid
  )->>'status',
  'not_ready',
  'missing provider payment data does not revoke access'
);
select is(
  (select status from public.billing_contracts
   where id = 'a2000000-0000-4000-8000-000000000004'),
  'active',
  'not-ready requests preserve the contract'
);
select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000007'::uuid
  )->>'status',
  'not_found',
  'a user without a contract receives not-found'
);
select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000001'::uuid
  )->>'status',
  'already_submitted',
  'a duplicate click is idempotent'
);
select results_eq(
  $$
    select status, attempt_count
    from public.billing_refund_requests
    where contract_id = 'a2000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('processing'::text, 1::integer) $$,
  'the initial request is claimed once'
);
select is(
  (select status from public.billing_contracts
   where id = 'a2000000-0000-4000-8000-000000000001'),
  'refund_pending',
  'claiming a refund blocks access immediately'
);

select is(
  public.record_billing_refund_provider_result(
    (select id from public.billing_refund_requests
     where contract_id = 'a2000000-0000-4000-8000-000000000001'),
    'rejected', 'provider_rejected', false
  ),
  'rejected',
  'a definitive provider rejection is recorded'
);
select is(
  (select status from public.billing_contracts
   where id = 'a2000000-0000-4000-8000-000000000001'),
  'active',
  'a rejection restores the exact previous contract status'
);
select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000001'::uuid
  )->>'status',
  'ready',
  'a rejected request may be reclaimed before its original deadline'
);
select is(
  (select attempt_count from public.billing_refund_requests
   where contract_id = 'a2000000-0000-4000-8000-000000000001'),
  2,
  'reclaiming increments the existing request attempt count'
);

select is(
  public.apply_asaas_webhook_event(
    'evt-refund-first-2',
    'PAYMENT_REFUNDED',
    jsonb_build_object(
      'dateCreated', transaction_timestamp(),
      'payment', jsonb_build_object(
        'id', 'pay_refund_2',
        'externalReference', 'refund-contract-2',
        'value', 39.90,
        'dueDate', current_date
      )
    )
  ),
  'processed',
  'a monthly refund webhook is processed before cancellation'
);
select results_eq(
  $$
    select status, refund_confirmed_at is not null,
      recurrence_canceled_at is null
    from public.billing_refund_requests
    where contract_id = 'a2000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('submitted'::text, true, true) $$,
  'monthly card waits for recurrence cancellation after refund confirmation'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-cancel-second-2',
    'SUBSCRIPTION_DELETED',
    jsonb_build_object(
      'dateCreated', transaction_timestamp(),
      'subscription', jsonb_build_object('id', 'sub_refund_2')
    )
  ),
  'processed',
  'subscription deletion converges after the refund'
);
select results_eq(
  $$
    select request.status, contract.status,
      request.refund_confirmed_at is not null,
      request.recurrence_canceled_at is not null
    from public.billing_refund_requests as request
    join public.billing_contracts as contract on contract.id = request.contract_id
    where request.contract_id = 'a2000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('confirmed'::text, 'refunded'::text, true, true) $$,
  'refund then subscription deletion reaches confirmed without restoring access'
);

select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000005'::uuid
  )->>'status',
  'ready',
  'the reverse-order monthly fixture is claimed'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-cancel-first-5',
    'SUBSCRIPTION_INACTIVATED',
    jsonb_build_object(
      'dateCreated', transaction_timestamp(),
      'subscription', jsonb_build_object('id', 'sub_refund_5')
    )
  ),
  'processed',
  'subscription cancellation is processed before its refund'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-refund-second-5',
    'PAYMENT_REFUNDED',
    jsonb_build_object(
      'dateCreated', transaction_timestamp(),
      'payment', jsonb_build_object(
        'id', 'pay_refund_5',
        'externalReference', 'refund-contract-5',
        'value', 39.90,
        'dueDate', current_date
      )
    )
  ),
  'processed',
  'refund confirmation converges after recurrence cancellation'
);
select results_eq(
  $$
    select request.status, contract.status,
      request.refund_confirmed_at is not null,
      request.recurrence_canceled_at is not null
    from public.billing_refund_requests as request
    join public.billing_contracts as contract on contract.id = request.contract_id
    where request.contract_id = 'a2000000-0000-4000-8000-000000000005'
  $$,
  $$ values ('confirmed'::text, 'refunded'::text, true, true) $$,
  'subscription deletion then refund also reaches confirmed'
);

select is(
  public.begin_billing_refund(
    'a1000000-0000-4000-8000-000000000006'::uuid
  )->>'status',
  'ready',
  'the semiannual installment fixture is claimed'
);
select is(
  public.apply_asaas_webhook_event(
    'evt-semiannual-refund-6',
    'PAYMENT_REFUNDED',
    jsonb_build_object(
      'dateCreated', transaction_timestamp(),
      'payment', jsonb_build_object(
        'id', 'pay_refund_6',
        'externalReference', 'refund-contract-6',
        'installment', 'ins_refund_6',
        'installmentNumber', 1,
        'value', 29.90,
        'dueDate', current_date
      )
    )
  ),
  'processed',
  'a semiannual refund webhook is processed'
);
select is(
  (select status from public.billing_refund_requests
   where contract_id = 'a2000000-0000-4000-8000-000000000006'),
  'confirmed',
  'fixed-term refunds need no recurrence event'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-4000-8000-000000000001',
  true
);
select is(
  (select count(*)::integer from public.billing_refund_requests),
  1,
  'an authenticated user reads only their own refund request'
);
select throws_ok(
  $$ select previous_contract_status from public.billing_refund_requests $$,
  '42501', null,
  'restoration state is not exposed to the browser'
);
select throws_ok(
  $$ update public.billing_refund_requests set status = 'confirmed' $$,
  '42501', null,
  'authenticated users cannot mutate refund workflow state'
);

select * from finish();
rollback;
