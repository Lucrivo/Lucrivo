begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

select has_table(
  'private',
  'app_administrator',
  'private administrator singleton exists'
);

select columns_are(
  'private',
  'app_administrator',
  array['singleton', 'user_id', 'created_at'],
  'administrator singleton contains only assignment metadata'
);

select col_type_is(
  'private',
  'app_administrator',
  'singleton',
  'smallint',
  'singleton discriminator is smallint'
);
select col_is_pk(
  'private',
  'app_administrator',
  'singleton',
  'singleton discriminator is the primary key'
);
select col_is_unique(
  'private',
  'app_administrator',
  'user_id',
  'administrator user id is unique'
);
select fk_ok(
  'private',
  'app_administrator',
  'user_id',
  'auth',
  'users',
  'id',
  'administrator references the Auth user primary key'
);

select ok(
  (
    select pg_get_constraintdef(oid) = 'CHECK ((singleton = 1))'
    from pg_constraint
    where conrelid = 'private.app_administrator'::regclass
      and conname = 'app_administrator_singleton_check'
  ),
  'singleton check permits only slot one'
);
select ok(
  (
    select confdeltype = 'r'
    from pg_constraint
    where conrelid = 'private.app_administrator'::regclass
      and conname = 'app_administrator_user_id_fkey'
  ),
  'deleting the assigned Auth user is restricted'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'private.app_administrator'::regclass
  ),
  'RLS is enabled on the private singleton table'
);

select table_privs_are(
  'private',
  'app_administrator',
  'anon',
  array[]::text[],
  'anon has no administrator-table privileges'
);
select table_privs_are(
  'private',
  'app_administrator',
  'authenticated',
  array[]::text[],
  'authenticated has no administrator-table privileges'
);
select table_privs_are(
  'private',
  'app_administrator',
  'service_role',
  array[]::text[],
  'service role has no direct administrator-table privileges'
);

select has_function(
  'private',
  'is_admin',
  array[]::text[],
  'private caller-scoped role helper exists'
);
select has_function(
  'private',
  'has_admin_access',
  array[]::text[],
  'private MFA-aware access helper exists'
);
select has_function(
  'public',
  'current_user_is_admin',
  array[]::text[],
  'public caller-status RPC exists'
);

select ok(
  (
    select prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = 'private.is_admin()'::regprocedure
  ),
  'private role helper is stable security definer with empty search path'
);
select ok(
  (
    select not prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = 'private.has_admin_access()'::regprocedure
  ),
  'private access helper is stable security invoker with empty search path'
);
select ok(
  (
    select not prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    from pg_proc
    where oid = 'public.current_user_is_admin()'::regprocedure
  ),
  'public status RPC is stable security invoker with empty search path'
);

select ok(
  has_function_privilege('authenticated', 'private.is_admin()', 'execute'),
  'authenticated may evaluate its role through policies and wrappers'
);
select ok(
  has_function_privilege(
    'authenticated',
    'private.has_admin_access()',
    'execute'
  ),
  'authenticated may evaluate its MFA-aware access through policies'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.current_user_is_admin()',
    'execute'
  ),
  'authenticated may call the current-user status RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.current_user_is_admin()',
    'execute'
  ),
  'anon cannot call the current-user status RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.current_user_is_admin()',
    'execute'
  ),
  'service role cannot use the user-facing status RPC'
);

delete from private.app_administrator;

insert into auth.users (id, aud, role, email)
values
  (
    '93000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin-authz@example.com'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'regular-authz@example.com'
  );

insert into private.app_administrator (user_id)
values ('93000000-0000-4000-8000-000000000001');

select throws_ok(
  $$
    insert into private.app_administrator (user_id)
    values ('93000000-0000-4000-8000-000000000002')
  $$,
  '23505',
  null,
  'a second administrator row violates the singleton primary key'
);

select is(
  private.is_admin(),
  false,
  'missing JWT subject is never an administrator'
);

set local role anon;
select throws_ok(
  $$ select public.current_user_is_admin() $$,
  '42501',
  null,
  'anon cannot execute the status RPC'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  public.current_user_is_admin(),
  false,
  'ordinary authenticated user receives false from the status RPC'
);
select is(
  private.has_admin_access(),
  false,
  'ordinary authenticated user never has admin access even at aal2'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '93000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  public.current_user_is_admin(),
  true,
  'assigned caller receives true from the status RPC'
);
select is(
  private.has_admin_access(),
  false,
  'assigned caller at aal1 does not have administrative access'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  private.has_admin_access(),
  true,
  'assigned caller at aal2 has administrative access'
);
reset role;

select * from finish();
rollback;
