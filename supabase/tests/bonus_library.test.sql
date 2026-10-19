begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table(
  'public',
  'bonus_access_grants',
  'permanent bonus access ledger exists'
);
select columns_are(
  'public',
  'bonus_access_grants',
  array[
    'id',
    'user_id',
    'contract_id',
    'granted_at',
    'revoked_at',
    'revocation_reason',
    'created_at'
  ],
  'bonus grants expose only the expected columns'
);
select col_is_unique(
  'public',
  'bonus_access_grants',
  'contract_id',
  'one bonus grant exists per paid contract'
);
select has_index(
  'public',
  'bonus_access_grants',
  'bonus_access_grants_live_user_idx',
  'live grant lookups use a partial owner index'
);
select is(
  (
    select pg_get_expr(indpred, indrelid)
    from pg_index
    where indexrelid =
      'public.bonus_access_grants_live_user_idx'::regclass
  ),
  '(revoked_at IS NULL)'::text,
  'the owner index contains only live grants'
);
select policies_are(
  'public',
  'bonus_access_grants',
  array['bonus_access_grants_select_own'],
  'only owner reads are exposed'
);
select table_privs_are(
  'public',
  'bonus_access_grants',
  'authenticated',
  array[]::text[],
  'authenticated has no table-wide privilege'
);
select results_eq(
  $$
    select column_name
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'bonus_access_grants'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
    order by column_name
  $$,
  $$ values
    ('contract_id'::information_schema.sql_identifier),
    ('created_at'::information_schema.sql_identifier),
    ('granted_at'::information_schema.sql_identifier),
    ('id'::information_schema.sql_identifier),
    ('revoked_at'::information_schema.sql_identifier),
    ('user_id'::information_schema.sql_identifier)
  $$,
  'authenticated may read only non-sensitive grant columns'
);
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.bonus_access_grants'::regclass
  ),
  true,
  'RLS is enabled on bonus grants'
);

select results_eq(
  $$
    select public, file_size_limit, allowed_mime_types
    from storage.buckets
    where id = 'bonus-materials'
  $$,
  $$ values (
    false,
    26214400::bigint,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  ) $$,
  'bonus materials bucket is private and constrained'
);
select policies_are(
  'storage',
  'objects',
  array['bonus_materials_read_allowed_objects'],
  'Storage exposes only the narrow bonus read policy'
);

insert into auth.users (id, aud, role, email) values
  (
    '93000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'bonus-owner@example.com'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'bonus-other@example.com'
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
  renewal_adjustment_status,
  status,
  access_starts_at,
  access_ends_at
) values
  (
    '94000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'bonus-owner-first',
    'launch', 'monthly', 'pix', 'detached', 3990, 'BRL', null, 2,
    1, 'not_required', 'active',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 month'
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    '93000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'bonus-owner-second',
    'launch', 'semiannual', 'pix', 'detached', 17940, 'BRL', 6, 12,
    6, 'not_required', 'active',
    statement_timestamp() - interval '2 days',
    statement_timestamp() + interval '6 months'
  ),
  (
    '94000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'bonus-other',
    'launch', 'monthly', 'pix', 'detached', 3990, 'BRL', null, 2,
    1, 'not_required', 'active',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 month'
  ),
  (
    '94000000-0000-4000-8000-000000000004',
    '93000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000005',
    'bonus-owner-price-only',
    'launch_price', 'monthly', 'pix', 'detached', 3990, 'BRL', null, 1,
    0, 'not_required', 'active',
    statement_timestamp() - interval '1 day',
    statement_timestamp() + interval '1 month'
  );

insert into public.bonus_access_grants (
  id,
  user_id,
  contract_id,
  granted_at
) values
  (
    '95000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000001',
    '94000000-0000-4000-8000-000000000001',
    statement_timestamp() - interval '1 day'
  ),
  (
    '95000000-0000-4000-8000-000000000002',
    '93000000-0000-4000-8000-000000000001',
    '94000000-0000-4000-8000-000000000002',
    statement_timestamp() - interval '2 days'
  ),
  (
    '95000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000002',
    '94000000-0000-4000-8000-000000000003',
    statement_timestamp() - interval '1 day'
  ),
  (
    '95000000-0000-4000-8000-000000000004',
    '93000000-0000-4000-8000-000000000001',
    '94000000-0000-4000-8000-000000000004',
    statement_timestamp() - interval '1 day'
  );

update public.bonus_access_grants
set revoked_at = statement_timestamp(),
    revocation_reason = 'full_refund'
where id = '95000000-0000-4000-8000-000000000001';

select throws_ok(
  $$
    insert into public.bonus_access_grants (
      user_id, contract_id, granted_at, revoked_at, revocation_reason
    ) values (
      '93000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000001',
      statement_timestamp(), null, 'chargeback'
    )
  $$,
  '23514',
  null,
  'a revocation reason requires a revocation instant'
);
select throws_ok(
  $$
    insert into public.bonus_access_grants (
      user_id, contract_id, granted_at, revoked_at
    ) values (
      '93000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000001',
      statement_timestamp(), statement_timestamp()
    )
  $$,
  '23514',
  null,
  'a revocation instant requires a reason'
);
select throws_ok(
  $$
    insert into public.bonus_access_grants (
      user_id, contract_id, granted_at
    ) values (
      '93000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000002',
      statement_timestamp()
    )
  $$,
  '23505',
  null,
  'a contract cannot create a duplicate grant'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000001',
  true
);

select results_eq(
  $$
    select contract_id, revoked_at is null
    from public.bonus_access_grants
    order by contract_id
  $$,
  $$ values
    ('94000000-0000-4000-8000-000000000001'::uuid, false),
    ('94000000-0000-4000-8000-000000000002'::uuid, true),
    ('94000000-0000-4000-8000-000000000004'::uuid, true)
  $$,
  'an owner sees launch and launch_price library grants independent of bonus months'
);
select throws_ok(
  $$
    insert into public.bonus_access_grants (
      user_id, contract_id, granted_at
    ) values (
      '93000000-0000-4000-8000-000000000001',
      '94000000-0000-4000-8000-000000000003',
      statement_timestamp()
    )
  $$,
  '42501',
  null,
  'authenticated cannot insert grants'
);
select throws_ok(
  $$
    update public.bonus_access_grants
    set revoked_at = statement_timestamp(), revocation_reason = 'chargeback'
  $$,
  '42501',
  null,
  'authenticated cannot update grants'
);
select throws_ok(
  $$ delete from public.bonus_access_grants $$,
  '42501',
  null,
  'authenticated cannot delete grants'
);

reset role;

select * from finish();

rollback;
