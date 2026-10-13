begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table(
  'private',
  'legal_acceptance_events',
  'legal acceptance history exists'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'private.legal_acceptance_events'::regclass
  ),
  'legal acceptance history enables row level security'
);

select ok(
  not has_table_privilege('anon', 'private.legal_acceptance_events', 'select')
  and not has_table_privilege('authenticated', 'private.legal_acceptance_events', 'insert')
  and not has_table_privilege('service_role', 'private.legal_acceptance_events', 'insert'),
  'direct table access is revoked'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.record_signup_legal_acceptance_v1(uuid, text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.record_signup_legal_acceptance_v1(uuid, text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.record_signup_legal_acceptance_v1(uuid, text)',
    'execute'
  ),
  'only the service role records signup acceptance'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.accept_current_legal_terms_v1(text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.current_user_has_accepted_legal_copy_v1(text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.accept_current_legal_terms_v1(text)',
    'execute'
  ),
  'authenticated clients can accept and query their own copy'
);

insert into auth.users (id, aud, role, email)
values (
  '94100000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'legal-acceptance@example.com'
);

set local role service_role;
select is(
  public.record_signup_legal_acceptance_v1(
    '94100000-0000-4000-8000-000000000001',
    'terms-privacy-v1'
  ) ->> 'status',
  'recorded',
  'signup acceptance is recorded'
);
select is(
  public.record_signup_legal_acceptance_v1(
    '94100000-0000-4000-8000-000000000001',
    'terms-privacy-v1'
  ) ->> 'status',
  'recorded',
  'the same signup version does not duplicate'
);

reset role;
select is(
  (
    select count(*)
    from private.legal_acceptance_events
    where user_id = '94100000-0000-4000-8000-000000000001'
      and copy_version = 'terms-privacy-v1'
      and source = 'signup'
  ),
  1::bigint,
  'one signup row exists for the version'
);

set local role service_role;
select throws_ok(
  $$ update private.legal_acceptance_events set source = 'gate' $$,
  '42501',
  'permission denied for table legal_acceptance_events',
  'service role cannot update acceptance history'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '94100000-0000-4000-8000-000000000001',
  true
);
select is(
  public.current_user_has_accepted_legal_copy_v1('terms-privacy-v1'),
  true,
  'the current version is accepted'
);
select is(
  public.current_user_has_accepted_legal_copy_v1('terms-privacy-v0'),
  false,
  'an older version is not accepted'
);
select is(
  public.accept_current_legal_terms_v1('terms-privacy-v1') ->> 'status',
  'recorded',
  'accepting the recorded version stays idempotent'
);

reset role;
select is(
  (
    select count(*)
    from private.legal_acceptance_events
    where user_id = '94100000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'gate acceptance does not add a second row for the same version'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select public.current_user_has_accepted_legal_copy_v1('terms-privacy-v1') $$,
  '42501',
  'a session is required to read legal acceptance',
  'a missing session is not treated as not accepted'
);

select * from finish();
rollback;
