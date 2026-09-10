begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table('public', 'billing_prices', 'billing price catalog exists');
select has_table('public', 'billing_customers', 'billing customer map exists');
select has_table('public', 'billing_contracts', 'billing contracts exist');
select has_table('public', 'billing_payments', 'billing payments exist');
select has_table(
  'public',
  'asaas_webhook_events',
  'Asaas webhook ledger exists'
);

select columns_are(
  'public',
  'billing_prices',
  array[
    'id',
    'product_code',
    'billing_mode',
    'version',
    'amount_cents',
    'currency',
    'installment_limit',
    'access_months',
    'is_active',
    'created_at',
    'retired_at'
  ],
  'price catalog has only the approved columns'
);
select col_type_is('public', 'billing_prices', 'id', 'uuid', 'price id is uuid');
select col_type_is(
  'public',
  'billing_prices',
  'amount_cents',
  'bigint',
  'price uses integer cents'
);
select col_type_is(
  'public',
  'billing_prices',
  'created_at',
  'timestamp with time zone',
  'price timestamp keeps its time zone'
);
select col_is_pk('public', 'billing_prices', 'id', 'price id is primary key');

select columns_are(
  'public',
  'billing_customers',
  array['user_id', 'asaas_customer_id', 'created_at', 'updated_at'],
  'customer map stores no duplicate personal data'
);
select col_is_pk(
  'public',
  'billing_customers',
  'user_id',
  'customer user id is primary key'
);
select fk_ok(
  'public',
  'billing_customers',
  'user_id',
  'auth',
  'users',
  'id'
);

select columns_are(
  'public',
  'billing_contracts',
  array[
    'id',
    'user_id',
    'price_id',
    'external_reference',
    'billing_mode',
    'payment_method',
    'charge_type',
    'amount_cents',
    'currency',
    'installment_limit',
    'access_months',
    'asaas_checkout_id',
    'asaas_checkout_url',
    'checkout_expires_at',
    'asaas_subscription_id',
    'asaas_installment_id',
    'status',
    'access_starts_at',
    'access_ends_at',
    'cancel_at_period_end',
    'cancellation_requested_at',
    'cancellation_confirmed_at',
    'canceled_at',
    'created_at',
    'updated_at'
  ],
  'contracts contain commercial snapshots and provider mappings'
);
select col_is_pk(
  'public',
  'billing_contracts',
  'id',
  'contract id is primary key'
);
select col_type_is(
  'public',
  'billing_contracts',
  'access_ends_at',
  'timestamp with time zone',
  'access end keeps its time zone'
);
select fk_ok(
  'public',
  'billing_contracts',
  'user_id',
  'auth',
  'users',
  'id'
);
select fk_ok(
  'public',
  'billing_contracts',
  'price_id',
  'public',
  'billing_prices',
  'id'
);

select columns_are(
  'public',
  'billing_payments',
  array[
    'id',
    'contract_id',
    'asaas_payment_id',
    'status',
    'value_cents',
    'installment_number',
    'due_date',
    'confirmed_at',
    'received_at',
    'refunded_at',
    'chargeback_at',
    'created_at',
    'updated_at'
  ],
  'payments contain normalized financial state only'
);
select col_is_pk(
  'public',
  'billing_payments',
  'id',
  'payment id is primary key'
);
select fk_ok(
  'public',
  'billing_payments',
  'contract_id',
  'public',
  'billing_contracts',
  'id'
);

select columns_are(
  'public',
  'asaas_webhook_events',
  array[
    'id',
    'event_type',
    'contract_id',
    'payload',
    'received_at',
    'processing_status',
    'attempt_count',
    'last_error',
    'processed_at'
  ],
  'webhook ledger contains retry and redacted payload state'
);
select col_is_pk(
  'public',
  'asaas_webhook_events',
  'id',
  'provider event id is primary key'
);
select col_type_is(
  'public',
  'asaas_webhook_events',
  'payload',
  'jsonb',
  'redacted webhook payload is jsonb'
);
select fk_ok(
  'public',
  'asaas_webhook_events',
  'contract_id',
  'public',
  'billing_contracts',
  'id'
);

select has_index(
  'public',
  'billing_prices',
  'billing_prices_one_active_mode_idx',
  'catalog has one-active-price index'
);
select has_trigger(
  'public',
  'billing_prices',
  'billing_prices_prevent_commercial_update',
  'catalog has an immutability trigger'
);
select has_index(
  'public',
  'billing_contracts',
  'billing_contracts_user_id_idx',
  'contract owner foreign key is indexed'
);
select has_index(
  'public',
  'billing_contracts',
  'billing_contracts_price_id_idx',
  'contract price foreign key is indexed'
);
select has_index(
  'public',
  'billing_contracts',
  'billing_contracts_one_pending_user_idx',
  'user has at most one pending Checkout'
);
select has_index(
  'public',
  'billing_contracts',
  'billing_contracts_user_access_idx',
  'current access lookup is indexed'
);
select has_index(
  'public',
  'billing_contracts',
  'billing_contracts_reconciliation_idx',
  'reconciliation backlog is indexed'
);
select has_index(
  'public',
  'billing_payments',
  'billing_payments_contract_id_idx',
  'payment contract foreign key is indexed'
);
select has_index(
  'public',
  'asaas_webhook_events',
  'asaas_webhook_events_contract_id_idx',
  'webhook contract foreign key is indexed'
);
select has_index(
  'public',
  'asaas_webhook_events',
  'asaas_webhook_events_retry_idx',
  'failed webhook retry queue is indexed'
);

select ok(
  (
    select pg_get_expr(indpred, indrelid)
    from pg_index
    where indexrelid =
      'public.billing_prices_one_active_mode_idx'::regclass
  ) = 'is_active',
  'one-active-price index uses the expected predicate'
);
select ok(
  (
    select pg_get_expr(indpred, indrelid)
    from pg_index
    where indexrelid =
      'public.billing_contracts_one_pending_user_idx'::regclass
  ) = '(status = ANY (ARRAY[''pending''::text, ''pending_reconciliation''::text]))',
  'one-pending-contract index covers both pending statuses'
);

select policies_are(
  'public',
  'billing_prices',
  array['billing_prices_select_active'],
  'only active price reads are exposed'
);
select policies_are(
  'public',
  'billing_customers',
  array[]::text[],
  'customer mappings have no client policy'
);
select policies_are(
  'public',
  'billing_contracts',
  array['billing_contracts_select_own'],
  'contracts expose only owner reads'
);
select policies_are(
  'public',
  'billing_payments',
  array['billing_payments_select_own'],
  'payments expose only owner reads'
);
select policies_are(
  'public',
  'asaas_webhook_events',
  array[]::text[],
  'webhook ledger has no client policy'
);

select results_eq(
  $$
    select relname, relrowsecurity
    from pg_class
    where oid in (
      'public.billing_prices'::regclass,
      'public.billing_customers'::regclass,
      'public.billing_contracts'::regclass,
      'public.billing_payments'::regclass,
      'public.asaas_webhook_events'::regclass
    )
    order by relname
  $$,
  $$ values
    ('asaas_webhook_events'::name, true),
    ('billing_contracts'::name, true),
    ('billing_customers'::name, true),
    ('billing_payments'::name, true),
    ('billing_prices'::name, true)
  $$,
  'RLS is enabled on every billing table'
);

select table_privs_are(
  'public',
  'asaas_webhook_events',
  'authenticated',
  array[]::text[],
  'authenticated has no webhook table privileges'
);
select table_privs_are(
  'public',
  'billing_customers',
  'authenticated',
  array[]::text[],
  'authenticated has no customer-map table privileges'
);
select table_privs_are(
  'public',
  'billing_contracts',
  'authenticated',
  array[]::text[],
  'authenticated has only column-level contract reads'
);
select table_privs_are(
  'public',
  'billing_payments',
  'authenticated',
  array[]::text[],
  'authenticated has only column-level payment reads'
);
select table_privs_are(
  'public',
  'billing_prices',
  'anon',
  array['SELECT'],
  'anon can only select public prices'
);

select results_eq(
  $$
    select p.column_name
    from information_schema.column_privileges p
    join information_schema.columns c
      using (table_schema, table_name, column_name)
    where p.table_schema = 'public'
      and p.table_name = 'billing_contracts'
      and p.grantee = 'authenticated'
      and p.privilege_type = 'SELECT'
    order by c.ordinal_position
  $$,
  $$ values
    ('id'::information_schema.sql_identifier),
    ('user_id'::information_schema.sql_identifier),
    ('price_id'::information_schema.sql_identifier),
    ('billing_mode'::information_schema.sql_identifier),
    ('payment_method'::information_schema.sql_identifier),
    ('charge_type'::information_schema.sql_identifier),
    ('amount_cents'::information_schema.sql_identifier),
    ('currency'::information_schema.sql_identifier),
    ('installment_limit'::information_schema.sql_identifier),
    ('access_months'::information_schema.sql_identifier),
    ('status'::information_schema.sql_identifier),
    ('access_starts_at'::information_schema.sql_identifier),
    ('access_ends_at'::information_schema.sql_identifier),
    ('cancel_at_period_end'::information_schema.sql_identifier),
    ('cancellation_requested_at'::information_schema.sql_identifier),
    ('cancellation_confirmed_at'::information_schema.sql_identifier),
    ('canceled_at'::information_schema.sql_identifier),
    ('created_at'::information_schema.sql_identifier),
    ('updated_at'::information_schema.sql_identifier)
  $$,
  'authenticated receives only safe contract columns'
);

select results_eq(
  $$
    select p.column_name
    from information_schema.column_privileges p
    join information_schema.columns c
      using (table_schema, table_name, column_name)
    where p.table_schema = 'public'
      and p.table_name = 'billing_payments'
      and p.grantee = 'authenticated'
      and p.privilege_type = 'SELECT'
    order by c.ordinal_position
  $$,
  $$ values
    ('id'::information_schema.sql_identifier),
    ('contract_id'::information_schema.sql_identifier),
    ('status'::information_schema.sql_identifier),
    ('value_cents'::information_schema.sql_identifier),
    ('installment_number'::information_schema.sql_identifier),
    ('due_date'::information_schema.sql_identifier),
    ('confirmed_at'::information_schema.sql_identifier),
    ('received_at'::information_schema.sql_identifier),
    ('refunded_at'::information_schema.sql_identifier),
    ('chargeback_at'::information_schema.sql_identifier),
    ('created_at'::information_schema.sql_identifier),
    ('updated_at'::information_schema.sql_identifier)
  $$,
  'authenticated receives only safe payment columns'
);

select results_eq(
  $$
    select table_name, privilege_type
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name in (
        'billing_prices',
        'billing_customers',
        'billing_contracts',
        'billing_payments',
        'asaas_webhook_events'
      )
      and grantee = 'service_role'
    order by table_name, privilege_type
  $$,
  $$ values
    ('asaas_webhook_events'::information_schema.sql_identifier, 'DELETE'::information_schema.character_data),
    ('asaas_webhook_events'::information_schema.sql_identifier, 'INSERT'::information_schema.character_data),
    ('asaas_webhook_events'::information_schema.sql_identifier, 'SELECT'::information_schema.character_data),
    ('asaas_webhook_events'::information_schema.sql_identifier, 'UPDATE'::information_schema.character_data),
    ('billing_contracts'::information_schema.sql_identifier, 'DELETE'::information_schema.character_data),
    ('billing_contracts'::information_schema.sql_identifier, 'INSERT'::information_schema.character_data),
    ('billing_contracts'::information_schema.sql_identifier, 'SELECT'::information_schema.character_data),
    ('billing_contracts'::information_schema.sql_identifier, 'UPDATE'::information_schema.character_data),
    ('billing_customers'::information_schema.sql_identifier, 'DELETE'::information_schema.character_data),
    ('billing_customers'::information_schema.sql_identifier, 'INSERT'::information_schema.character_data),
    ('billing_customers'::information_schema.sql_identifier, 'SELECT'::information_schema.character_data),
    ('billing_customers'::information_schema.sql_identifier, 'UPDATE'::information_schema.character_data),
    ('billing_payments'::information_schema.sql_identifier, 'DELETE'::information_schema.character_data),
    ('billing_payments'::information_schema.sql_identifier, 'INSERT'::information_schema.character_data),
    ('billing_payments'::information_schema.sql_identifier, 'SELECT'::information_schema.character_data),
    ('billing_payments'::information_schema.sql_identifier, 'UPDATE'::information_schema.character_data),
    ('billing_prices'::information_schema.sql_identifier, 'DELETE'::information_schema.character_data),
    ('billing_prices'::information_schema.sql_identifier, 'INSERT'::information_schema.character_data),
    ('billing_prices'::information_schema.sql_identifier, 'SELECT'::information_schema.character_data),
    ('billing_prices'::information_schema.sql_identifier, 'UPDATE'::information_schema.character_data)
  $$,
  'service role receives explicit CRUD and no broad table privileges'
);

select results_eq(
  $$
    select billing_mode, amount_cents, currency, installment_limit,
      access_months, is_active
    from public.billing_prices
    where product_code = 'quick_diagnosis_pro'
    order by billing_mode desc
  $$,
  $$ values
    ('monthly'::text, 4990::bigint, 'BRL'::text, null::integer, 1, true),
    ('annual'::text, 47880::bigint, 'BRL'::text, 12, 12, true)
  $$,
  'v1 catalog contains the approved monthly and annual prices'
);

select throws_ok(
  $$
    update public.billing_prices
    set amount_cents = 1
    where id = '20000000-0000-4000-8000-000000000001'
  $$,
  'P0001',
  'billing prices are immutable',
  'commercial price fields cannot be changed'
);

insert into public.billing_prices (
  id,
  product_code,
  billing_mode,
  version,
  amount_cents,
  currency,
  installment_limit,
  access_months,
  is_active
) values (
  '20000000-0000-4000-8000-000000000099',
  'retirement_test',
  'monthly',
  1,
  100,
  'BRL',
  null,
  1,
  true
);

select lives_ok(
  $$
    update public.billing_prices
    set is_active = false,
        retired_at = '2026-09-10T00:00:00Z'
    where id = '20000000-0000-4000-8000-000000000099'
  $$,
  'a price can be retired without rewriting its commercial snapshot'
);

select throws_ok(
  $$
    insert into public.billing_prices (
      product_code, billing_mode, version, amount_cents, currency,
      installment_limit, access_months, is_active
    ) values (
      'quick_diagnosis_pro', 'monthly', 2, 5990, 'BRL', null, 1, true
    )
  $$,
  '23505',
  null,
  'only one price can be active for a product and billing mode'
);

insert into auth.users (id, aud, role, email)
values
  (
    '81000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'billing-a@example.com'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'billing-b@example.com'
  );

create function pg_temp.assert_invalid_billing_flows()
returns void
language plpgsql
as $$
declare
  candidate record;
begin
  for candidate in
    select *
    from (
      values
        ('monthly', 'credit_card', 'installment'),
        ('monthly', 'credit_card', 'detached'),
        ('monthly', 'pix', 'recurring'),
        ('monthly', 'pix', 'installment'),
        ('annual', 'credit_card', 'recurring'),
        ('annual', 'credit_card', 'detached'),
        ('annual', 'pix', 'recurring'),
        ('annual', 'pix', 'installment')
    ) as invalid_flow(billing_mode, payment_method, charge_type)
  loop
    begin
      insert into public.billing_contracts (
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
      ) values (
        '81000000-0000-4000-8000-000000000001',
        case candidate.billing_mode
          when 'monthly' then '20000000-0000-4000-8000-000000000001'::uuid
          else '20000000-0000-4000-8000-000000000002'::uuid
        end,
        gen_random_uuid()::text,
        candidate.billing_mode,
        candidate.payment_method,
        candidate.charge_type,
        case candidate.billing_mode when 'monthly' then 4990 else 47880 end,
        'BRL',
        case candidate.billing_mode when 'monthly' then null else 12 end,
        case candidate.billing_mode when 'monthly' then 1 else 12 end,
        'failed'
      );

      raise exception 'invalid billing flow was accepted';
    exception
      when check_violation then null;
    end;
  end loop;
end;
$$;

select lives_ok(
  $$ select pg_temp.assert_invalid_billing_flows() $$,
  'every unsupported period, payment, and charge combination is rejected'
);

select lives_ok(
  $$
    insert into public.billing_contracts (
      id, user_id, price_id, external_reference, billing_mode,
      payment_method, charge_type, amount_cents, currency,
      installment_limit, access_months, status
    ) values
      (
        '82000000-0000-4000-8000-000000000091',
        '81000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '83000000-0000-4000-8000-000000000091',
        'monthly', 'credit_card', 'recurring', 4990, 'BRL', null, 1,
        'failed'
      ),
      (
        '82000000-0000-4000-8000-000000000092',
        '81000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000002',
        '83000000-0000-4000-8000-000000000092',
        'annual', 'pix', 'detached', 47880, 'BRL', 12, 12,
        'failed'
      )
  $$,
  'all four approved billing flows satisfy the contract constraints'
);

delete from public.billing_contracts
where id in (
  '82000000-0000-4000-8000-000000000091',
  '82000000-0000-4000-8000-000000000092'
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
) values
  (
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    'monthly',
    'pix',
    'detached',
    4990,
    'BRL',
    null,
    1,
    'active',
    '2026-09-01T00:00:00Z',
    '2026-10-01T00:00:00Z'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '83000000-0000-4000-8000-000000000002',
    'annual',
    'credit_card',
    'installment',
    47880,
    'BRL',
    12,
    12,
    'active',
    '2026-09-01T00:00:00Z',
    '2027-09-01T00:00:00Z'
  );

insert into public.billing_customers (user_id, asaas_customer_id)
values
  ('81000000-0000-4000-8000-000000000001', 'cus_a'),
  ('81000000-0000-4000-8000-000000000002', 'cus_b');

insert into public.billing_payments (
  id,
  contract_id,
  asaas_payment_id,
  status,
  value_cents,
  due_date
) values
  (
    '84000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'pay_a',
    'received',
    4990,
    '2026-09-01'
  ),
  (
    '84000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000002',
    'pay_b',
    'confirmed',
    47880,
    '2026-09-01'
  );

insert into public.asaas_webhook_events (
  id,
  event_type,
  contract_id,
  payload
) values (
  'evt_private',
  'CHECKOUT_PAID',
  '82000000-0000-4000-8000-000000000001',
  '{"id":"evt_private","event":"CHECKOUT_PAID"}'::jsonb
);

set local role anon;

select is(
  (select count(*)::bigint from public.billing_prices),
  2::bigint,
  'anon reads exactly the two active public prices'
);
select throws_ok(
  $$ select id from public.billing_contracts $$,
  '42501',
  null,
  'anon cannot read contracts'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);

select results_eq(
  $$ select id, status from public.billing_contracts order by id $$,
  $$ values (
    '82000000-0000-4000-8000-000000000001'::uuid,
    'active'::text
  ) $$,
  'authenticated user reads only their safe contract row'
);
select results_eq(
  $$ select id, status from public.billing_payments order by id $$,
  $$ values (
    '84000000-0000-4000-8000-000000000001'::uuid,
    'received'::text
  ) $$,
  'authenticated user reads only payments for their contract'
);
select throws_ok(
  $$ select external_reference from public.billing_contracts $$,
  '42501',
  null,
  'authenticated cannot select private contract columns'
);
select throws_ok(
  $$ select asaas_payment_id from public.billing_payments $$,
  '42501',
  null,
  'authenticated cannot select provider payment IDs'
);
select throws_ok(
  $$ select * from public.billing_customers $$,
  '42501',
  null,
  'authenticated cannot read provider customer mappings'
);
select throws_ok(
  $$ select * from public.asaas_webhook_events $$,
  '42501',
  null,
  'authenticated cannot read webhook payloads'
);
select throws_ok(
  $$
    insert into public.billing_contracts (
      user_id, price_id, external_reference, billing_mode, payment_method,
      charge_type, amount_cents, currency, installment_limit, access_months
    ) values (
      '81000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000099',
      'monthly', 'pix', 'detached', 4990, 'BRL', null, 1
    )
  $$,
  '42501',
  null,
  'authenticated cannot insert billing state'
);
select throws_ok(
  $$
    update public.billing_contracts
    set status = 'canceled'
    where id = '82000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated cannot update billing state'
);
select throws_ok(
  $$
    delete from public.billing_contracts
    where id = '82000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated cannot delete billing state'
);

select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000002',
  true
);
select results_eq(
  $$ select id, status from public.billing_contracts order by id $$,
  $$ values (
    '82000000-0000-4000-8000-000000000002'::uuid,
    'active'::text
  ) $$,
  'a second user cannot read the first user contract'
);
select results_eq(
  $$ select id, status from public.billing_payments order by id $$,
  $$ values (
    '84000000-0000-4000-8000-000000000002'::uuid,
    'confirmed'::text
  ) $$,
  'a second user cannot read the first user payment'
);

reset role;

select * from finish();
rollback;
