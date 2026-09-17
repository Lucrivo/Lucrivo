begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public', 'change_admin_user_v1',
  array['uuid', 'text', 'text', 'timestamp with time zone', 'bigint'],
  'versioned administrative mutation exists'
);

select ok(
  not has_function_privilege('anon', 'public.change_admin_user_v1(uuid,text,text,timestamptz,bigint)', 'execute'),
  'anonymous callers cannot execute mutations'
);
select ok(
  not has_function_privilege('service_role', 'public.change_admin_user_v1(uuid,text,text,timestamptz,bigint)', 'execute'),
  'service role cannot bypass caller-scoped mutation authorization'
);

insert into auth.users (id, aud, role, email)
values
  ('96300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@mutation.test'),
  ('96300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'free@mutation.test'),
  ('96300000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'paid@mutation.test'),
  ('96300000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'pending@mutation.test');

insert into public.billing_prices (
  id, product_code, billing_mode, version, amount_cents, currency, access_months
) values (
  '96310000-0000-4000-8000-000000000001', 'admin-mutation-fixture',
  'monthly', 1, 1000, 'BRL', 1
);

insert into public.billing_contracts (
  id, user_id, price_id, external_reference, billing_mode, payment_method,
  charge_type, amount_cents, currency, access_months, status,
  access_starts_at, access_ends_at
) values (
  '96320000-0000-4000-8000-000000000003',
  '96300000-0000-4000-8000-000000000002',
  '96310000-0000-4000-8000-000000000001',
  'admin-mutation-historical', 'monthly', 'credit_card', 'recurring',
  1000, 'BRL', 1, 'expired',
  statement_timestamp() - interval '2 months',
  statement_timestamp() - interval '1 month'
), (
  '96320000-0000-4000-8000-000000000001',
  '96300000-0000-4000-8000-000000000003',
  '96310000-0000-4000-8000-000000000001',
  'admin-mutation-active', 'monthly', 'credit_card', 'recurring',
  1000, 'BRL', 1, 'active',
  statement_timestamp() - interval '1 day',
  statement_timestamp() + interval '1 month'
), (
  '96320000-0000-4000-8000-000000000002',
  '96300000-0000-4000-8000-000000000004',
  '96310000-0000-4000-8000-000000000001',
  'admin-mutation-pending', 'monthly', 'credit_card', 'recurring',
  1000, 'BRL', 1, 'pending', null, null
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
  $sql$select public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'blocked', 'reason', null, 0)$sql$,
  '42501', 'administrator access required',
  'ordinary account cannot mutate users'
);
select set_config('request.jwt.claims', '{"sub":"96300000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $sql$select public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'blocked', 'reason', null, 0)$sql$,
  '42501', 'administrator access required',
  'administrator at aal1 cannot mutate users'
);
select set_config('request.jwt.claims', '{"sub":"96300000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);

select throws_ok(
  $sql$select public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'blocked', ' ', null, 0)$sql$,
  '22023', 'invalid administrative user change', 'reason is required'
);
select throws_ok(
  $sql$select public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'courtesy_granted', 'reason', statement_timestamp() - interval '1 day', 0)$sql$,
  '22023', 'invalid administrative user change', 'courtesy expiry must be future'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000001', 'blocked', 'reason', null, 0) ->> 'status',
  'not_found', 'assigned administrator cannot be targeted'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'courtesy_granted', 'grant reason', statement_timestamp() + interval '1 month', 0) ->> 'status',
  'updated', 'courtesy grant succeeds'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'blocked', 'reason', null, 0) ->> 'status',
  'conflict', 'stale version cannot overwrite state'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'blocked', 'suspension reason', null, 1) ->> 'status',
  'updated', 'free account can be blocked'
);
select is(
  public.current_account_is_eligible(),
  true, 'administrator remains eligible'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'soft_deleted', 'delete reason', null, 2) ->> 'status',
  'updated', 'blocked account can be soft deleted'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'restored', 'restore reason', null, 3) #>> '{state,blockedAt}' is not null,
  true,
  'restoring a deleted account preserves its prior blocked state'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000002', 'unblocked', 'unblock reason', null, 4) ->> 'status',
  'updated', 'blocked account can be unblocked'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000003', 'blocked', 'reason', null, 0) ->> 'status',
  'paid_conflict', 'active paid account cannot be blocked'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000003', 'soft_deleted', 'reason', null, 0) ->> 'status',
  'paid_conflict', 'active paid account cannot be soft deleted'
);
select is(
  public.change_admin_user_v1('96300000-0000-4000-8000-000000000004', 'blocked', 'reason', null, 0) ->> 'status',
  'updated', 'pending contract does not prevent blocking'
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
  (select version from private.admin_user_state where user_id = '96300000-0000-4000-8000-000000000002'),
  5::bigint, 'conflicts do not advance the version'
);
select is(
  (select count(*) from public.billing_payments where contract_id = '96320000-0000-4000-8000-000000000003'),
  1::bigint, 'soft deletion retains payment history'
);

select * from finish();
rollback;
