begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public', 'change_admin_user_v2',
  array['uuid', 'text', 'text', 'integer', 'timestamp with time zone', 'bigint'],
  'versioned administrative mutation exists'
);

select ok(
  not has_function_privilege('anon', 'public.change_admin_user_v2(uuid,text,text,integer,timestamptz,bigint)', 'execute'),
  'anonymous callers cannot execute mutations'
);
select ok(
  not has_function_privilege('service_role', 'public.change_admin_user_v2(uuid,text,text,integer,timestamptz,bigint)', 'execute'),
  'service role cannot bypass caller-scoped mutation authorization'
);
select ok(
  not has_function_privilege('authenticated', 'public.change_admin_user_v1(uuid,text,text,timestamptz,bigint)', 'execute'),
  'authenticated callers no longer execute v1 after the application switch'
);

insert into auth.users (id, aud, role, email)
values
  ('96300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@mutation.test'),
  ('96300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'free@mutation.test'),
  ('96300000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'paid@mutation.test'),
  ('96300000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'pending@mutation.test'),
  ('96300000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'preset@mutation.test');

insert into public.billing_prices (
  id, product_code, catalog_code, billing_mode, version, amount_cents, currency,
  installment_limit, access_months, bonus_months
) values (
  '96310000-0000-4000-8000-000000000001', 'admin-mutation-fixture',
  'standard', 'monthly', 1, 4990, 'BRL', null, 1, 0
);

insert into public.billing_contracts (
  id, user_id, price_id, external_reference, catalog_code, billing_mode,
  payment_method, charge_type, amount_cents, currency, access_months,
  bonus_months, status,
  access_starts_at, access_ends_at
) values (
  '96320000-0000-4000-8000-000000000003',
  '96300000-0000-4000-8000-000000000002',
  '96310000-0000-4000-8000-000000000001',
  'admin-mutation-historical', 'standard', 'monthly', 'credit_card', 'recurring',
  4990, 'BRL', 1, 0, 'expired',
  statement_timestamp() - interval '2 months',
  statement_timestamp() - interval '1 month'
), (
  '96320000-0000-4000-8000-000000000001',
  '96300000-0000-4000-8000-000000000003',
  '96310000-0000-4000-8000-000000000001',
  'admin-mutation-active', 'standard', 'monthly', 'credit_card', 'recurring',
  4990, 'BRL', 1, 0, 'active',
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '1 month'
), (
  '96320000-0000-4000-8000-000000000002',
  '96300000-0000-4000-8000-000000000004',
  '96310000-0000-4000-8000-000000000001',
  'admin-mutation-pending', 'standard', 'monthly', 'credit_card', 'recurring',
  4990, 'BRL', 1, 0, 'pending', null, null
);

insert into public.billing_payments (
  id, contract_id, asaas_payment_id, status, value_cents
) values (
  '96330000-0000-4000-8000-000000000001',
  '96320000-0000-4000-8000-000000000003',
  'admin-mutation-payment', 'confirmed', 1000
);

delete from private.app_administrator;
insert into private.app_administrator (user_id)
values ('96300000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"96300000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'blocked', 'reason', null, null, 0)$sql$,
  '42501', 'administrator access required',
  'ordinary account cannot mutate users'
);
select set_config('request.jwt.claims', '{"sub":"96300000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'blocked', 'reason', null, null, 0)$sql$,
  '42501', 'administrator access required',
  'administrator at aal1 cannot mutate users'
);
select set_config('request.jwt.claims', '{"sub":"96300000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);

select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'blocked', ' ', null, null, 0)$sql$,
  '22023', 'invalid administrative user change', 'reason is required'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'courtesy_granted', 'reason', null, statement_timestamp() - interval '1 day', 0)$sql$,
  '22023', 'invalid administrative user change', 'courtesy expiry must be future'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000001', 'blocked', 'reason', null, null, 0) ->> 'status',
  'not_found', 'assigned administrator cannot be targeted'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'courtesy_granted', 'grant reason', null, statement_timestamp() + interval '1 month', 0) ->> 'status',
  'updated', 'courtesy grant succeeds'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'blocked', 'reason', null, null, 0) ->> 'status',
  'conflict', 'stale version cannot overwrite state'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'blocked', 'suspension reason', null, null, 1) ->> 'status',
  'updated', 'free account can be blocked'
);
select is(
  public.current_account_is_eligible(),
  true, 'administrator remains eligible'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'soft_deleted', 'delete reason', null, null, 2) ->> 'status',
  'updated', 'blocked account can be soft deleted'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'restored', 'restore reason', null, null, 3) #>> '{state,blockedAt}' is not null,
  true,
  'restoring a deleted account preserves its prior blocked state'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000002', 'unblocked', 'unblock reason', null, null, 4) ->> 'status',
  'updated', 'blocked account can be unblocked'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000003', 'blocked', 'reason', null, null, 0) ->> 'status',
  'paid_conflict', 'active paid account cannot be blocked'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000003', 'soft_deleted', 'reason', null, null, 0) ->> 'status',
  'paid_conflict', 'active paid account cannot be soft deleted'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000004', 'blocked', 'reason', null, null, 0) ->> 'status',
  'updated', 'pending contract does not prevent blocking'
);

create temporary table courtesy_preset_window (
  before_at timestamptz not null,
  result jsonb not null,
  after_at timestamptz not null
) on commit drop;

insert into courtesy_preset_window (before_at, result, after_at)
select
  pg_catalog.clock_timestamp(),
  public.change_admin_user_v2(
    '96300000-0000-4000-8000-000000000005',
    'courtesy_granted', 'sete dias', 7, null, 0
  ),
  pg_catalog.clock_timestamp();

select is(
  (select result ->> 'status' from courtesy_preset_window),
  'updated', 'seven-day preset succeeds'
);
select ok(
  (
    select (bounds.result #>> '{state,courtesyExpiresAt}')::timestamptz
      between bounds.before_at + interval '7 days'
          and bounds.after_at + interval '7 days'
    from courtesy_preset_window as bounds
  ),
  'seven-day preset is derived at confirmation time'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_granted', 'invalid', 0, null, 1)$sql$,
  '22023', 'invalid administrative user change', 'zero-day preset is rejected'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_granted', 'invalid', 2, null, 1)$sql$,
  '22023', 'invalid administrative user change', 'two-day preset is rejected'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_granted', 'invalid', 31, null, 1)$sql$,
  '22023', 'invalid administrative user change', 'thirty-one-day preset is rejected'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_granted', 'invalid', 7, statement_timestamp() + interval '7 days', 1)$sql$,
  '22023', 'invalid administrative user change', 'preset and absolute expiry are mutually exclusive'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_ended', 'invalid', 7, null, 1)$sql$,
  '22023', 'invalid administrative user change', 'non-grant action rejects a duration'
);
select throws_ok(
  $sql$select public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_ended', 'invalid', null, statement_timestamp() + interval '1 day', 1)$sql$,
  '22023', 'invalid administrative user change', 'non-grant action rejects an absolute expiry'
);
select is(
  public.change_admin_user_v2('96300000-0000-4000-8000-000000000005', 'courtesy_ended', 'preset cleanup', null, null, 1) ->> 'status',
  'updated', 'preset change remains auditable and versioned'
);
reset role;

select throws_ok(
  $sql$update public.billing_contracts
    set status = 'active',
        access_starts_at = statement_timestamp() - interval '1 day',
        access_ends_at = statement_timestamp() + interval '1 month'
    where id = '96320000-0000-4000-8000-000000000002'$sql$,
  '23514', 'paid access cannot activate for an unavailable account',
  'paid activation cannot race past account suspension'
);

select is(
  (select count(*) from private.admin_user_events where user_id = '96300000-0000-4000-8000-000000000002'),
  5::bigint, 'each successful change creates exactly one audit event'
);
select is(
  (select count(*) from private.admin_user_events where user_id = '96300000-0000-4000-8000-000000000005'),
  2::bigint, 'preset grant and end each create exactly one audit event'
);
select is(
  (select version from private.admin_user_state where user_id = '96300000-0000-4000-8000-000000000005'),
  2::bigint, 'rejected preset requests do not advance the version'
);
select is(
  (select version from private.admin_user_state where user_id = '96300000-0000-4000-8000-000000000002'),
  5::bigint, 'conflicts do not advance the version'
);
select is(
  (select count(*) from public.billing_payments where contract_id = '96320000-0000-4000-8000-000000000003'),
  1::bigint, 'soft deletion retains payment history'
);

select * from finish();
rollback;
