begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table('private', 'admin_user_state', 'account state exists');
select has_table('private', 'admin_user_events', 'audit history exists');
select has_function(
  'private',
  'account_is_eligible',
  array[]::text[],
  'caller eligibility helper exists'
);

select ok(
  not has_table_privilege('anon', 'private.admin_user_state', 'select'),
  'anonymous clients cannot read account state'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.admin_user_state',
    'select'
  ),
  'authenticated clients cannot read account state'
);
select ok(
  not has_table_privilege('service_role', 'private.admin_user_state', 'select'),
  'service role cannot read account state directly'
);
select ok(
  not has_table_privilege('authenticated', 'private.admin_user_events', 'select'),
  'authenticated clients cannot read audit history directly'
);

insert into auth.users (id, aud, role, email, created_at)
values (
  '96000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'account-state-fixture@example.com',
  statement_timestamp()
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select ok(private.account_is_eligible(), 'account without state is eligible');
reset role;

insert into private.admin_user_state (user_id, blocked_at)
values (
  '96000000-0000-4000-8000-000000000001',
  statement_timestamp()
);

set local role authenticated;
select ok(not private.account_is_eligible(), 'blocked account is ineligible');
reset role;

update private.admin_user_state
set blocked_at = null, deleted_at = statement_timestamp()
where user_id = '96000000-0000-4000-8000-000000000001';

set local role authenticated;
select ok(not private.account_is_eligible(), 'soft-deleted account is ineligible');
reset role;

insert into private.admin_user_events (
  user_id,
  actor_id,
  action,
  reason,
  before_state,
  after_state
)
values (
  '96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000001',
  'soft_deleted',
  'Fixture de auditoria',
  '{}'::jsonb,
  '{"deleted":true}'::jsonb
);

select throws_ok(
  $$ update private.admin_user_events set reason = 'changed' $$,
  'P0001',
  'admin user events are append-only',
  'audit history cannot be changed'
);

select * from finish();
rollback;
