begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'list_admin_users_v1',
  array[
    'text',
    'text',
    'text',
    'timestamp with time zone',
    'uuid',
    'integer'
  ],
  'versioned admin user list exists'
);
select has_function(
  'public',
  'get_admin_user_v1',
  array['uuid'],
  'versioned admin user detail exists'
);
select has_function(
  'public',
  'list_admin_user_items_v1',
  array[
    'uuid',
    'text',
    'timestamp with time zone',
    'text',
    'integer'
  ],
  'versioned admin user child list exists'
);
select has_function(
  'public',
  'list_admin_users_v2',
  array['text', 'text', 'text', 'integer', 'integer'],
  'page-number admin user list exists'
);
select has_function(
  'public',
  'get_admin_user_v2',
  array['uuid'],
  'profile-aware admin user detail exists'
);

select ok(
  not has_function_privilege('anon', 'public.list_admin_users_v1(text,text,text,timestamptz,uuid,integer)', 'execute'),
  'anonymous callers cannot execute the list'
);
select ok(
  not has_function_privilege('service_role', 'public.get_admin_user_v1(uuid)', 'execute'),
  'service role cannot bypass caller-scoped detail authorization'
);
select ok(
  has_function_privilege('authenticated', 'public.list_admin_users_v2(text,text,text,integer,integer)', 'execute'),
  'authenticated callers can reach the v2 list authorization boundary'
);
select ok(
  not has_function_privilege('anon', 'public.list_admin_users_v2(text,text,text,integer,integer)', 'execute'),
  'anonymous callers cannot execute the v2 list'
);
select ok(
  not has_function_privilege('service_role', 'public.get_admin_user_v2(uuid)', 'execute'),
  'service role cannot bypass v2 detail authorization'
);

insert into auth.users (id, aud, role, email, created_at)
values
  (
    '96200000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'admin@admin-read-fixture.test',
    statement_timestamp() - interval '3 days'
  ),
  (
    '96200000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'older@admin-read-fixture.test',
    statement_timestamp() - interval '2 days'
  ),
  (
    '96200000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'newer@admin-read-fixture.test',
    statement_timestamp() - interval '1 day'
  ),
  (
    '96200000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'excluded@admin-read-fixture.test',
    statement_timestamp()
  );

insert into private.admin_user_state (
  user_id, blocked_at, deleted_at, courtesy_expires_at
) values (
  '96200000-0000-4000-8000-000000000002',
  null, null, statement_timestamp() + interval '1 month'
), (
  '96200000-0000-4000-8000-000000000003',
  statement_timestamp(), null, null
), (
  '96200000-0000-4000-8000-000000000004',
  null, statement_timestamp(), null
);

insert into public.onboarding_profiles (
  user_id,
  full_name,
  whatsapp_e164,
  segment_id,
  subcategory_id,
  whatsapp_marketing_consent,
  marketing_consent_granted_at,
  completed_at,
  updated_at
)
select
  '96200000-0000-4000-8000-000000000003',
  'Cliente Bloqueado',
  '+5511999999003',
  segment.id,
  subcategory.id,
  false,
  null,
  statement_timestamp() - interval '12 hours',
  statement_timestamp() - interval '12 hours'
from public.business_segments as segment
join public.business_subcategories as subcategory
  on subcategory.segment_id = segment.id
where segment.name = 'Alimentação'
  and subcategory.name = 'Confeitaria';

delete from private.app_administrator;
insert into private.app_administrator (user_id)
values ('96200000-0000-4000-8000-000000000001');

create temporary table admin_user_first_page (payload jsonb) on commit drop;
grant select, insert on admin_user_first_page to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96200000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96200000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $sql$ select public.list_admin_users_v1(
    'admin-read-fixture.test', 'current', 'all', null, null, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary account cannot list users'
);
select throws_ok(
  $sql$ select public.list_admin_users_v2(
    'admin-read-fixture.test', 'current', 'all', 1, 20
  ) $sql$,
  '42501',
  'administrator access required',
  'ordinary account cannot list users through v2'
);
select throws_ok(
  $sql$ select public.list_admin_user_items_v1(
    '96200000-0000-4000-8000-000000000003', 'history', null, null, 20
  ) $sql$,
  '42501', 'administrator access required',
  'ordinary account cannot inspect administrative history'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '96200000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"96200000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $sql$ select public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000002'
  ) $sql$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot inspect users'
);
select throws_ok(
  $sql$ select public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000002'
  ) $sql$,
  '42501',
  'administrator access required',
  'administrator at aal1 cannot inspect users through v2'
);
reset role;

set local role anon;
select throws_ok(
  $sql$ select public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 1, 20
  ) $sql$,
  '42501',
  'permission denied for function list_admin_users_v2',
  'anonymous caller cannot execute the v2 list'
);
reset role;

set local role service_role;
select throws_ok(
  $sql$ select public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) $sql$,
  '42501',
  'permission denied for function get_admin_user_v2',
  'service role cannot execute the v2 detail function'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96200000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into admin_user_first_page (payload)
select public.list_admin_users_v1(
  'admin-read-fixture.test', 'current', 'all', null, null, 1
);

select is(
  (select payload #>> '{items,0,email}' from admin_user_first_page),
  'newer@admin-read-fixture.test',
  'newest matching non-admin user is first'
);
select is(
  (select jsonb_array_length(payload -> 'items') from admin_user_first_page),
  1,
  'page limit is applied in the database'
);
select ok(
  (select payload -> 'nextCursor' is not null from admin_user_first_page),
  'first page exposes a continuation cursor'
);
select is(
  (
    select public.list_admin_users_v1(
      'admin-read-fixture.test',
      'current',
      'all',
      (payload #>> '{nextCursor,createdAt}')::timestamptz,
      (payload #>> '{nextCursor,id}')::uuid,
      1
    ) #>> '{items,0,email}'
    from admin_user_first_page
  ),
  'older@admin-read-fixture.test',
  'cursor advances without repeating the first user'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000002'
  ) ->> 'email',
  'older@admin-read-fixture.test',
  'detail projection returns the requested real email'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000004'
  ) ->> 'state',
  'deleted',
  'excluded account remains inspectable by direct admin detail'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 1, 1
  ) ->> 'totalCount',
  '3',
  'filtered result exposes an exact total'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 2, 1
  ) #>> '{items,0,email}',
  'newer@admin-read-fixture.test',
  'page two is deterministic'
);
select is(
  public.list_admin_users_v2(
    'admin-read-fixture.test', 'all', 'all', 4, 1
  ) -> 'items',
  '[]'::jsonb,
  'out-of-range page returns an empty item list'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) ->> 'state',
  'blocked',
  'administrator can inspect a blocked target'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000003'
  ) ->> 'fullName',
  'Cliente Bloqueado',
  'detail includes the onboarding name'
);
select is(
  public.get_admin_user_v2(
    '96200000-0000-4000-8000-000000000004'
  ) ->> 'state',
  'deleted',
  'administrator can inspect a soft-deleted target through v2'
);
select is(
  public.list_admin_users_v1('admin-read-fixture.test', 'active', 'all', null, null, 20) #>> '{items,0,email}',
  'older@admin-read-fixture.test',
  'state filter distinguishes active and blocked users'
);
select is(
  public.list_admin_users_v1('ADMIN-READ-FIXTURE.TEST', 'all', 'courtesy', null, null, 20) #>> '{items,0,email}',
  'older@admin-read-fixture.test',
  'search is case-insensitive and courtesy filter uses effective access'
);
select is(
  public.list_admin_users_v1('admin-read-fixture.test', 'current', 'all', null, null, 20) -> 'items' @> '[{"email":"excluded@admin-read-fixture.test"}]'::jsonb,
  false,
  'default scope omits excluded accounts'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000001'
  ),
  null::jsonb,
  'administrator cannot inspect their own account through user management'
);
select is(
  public.get_admin_user_v1(
    '96200000-0000-4000-8000-000000000099'
  ),
  null::jsonb,
  'missing account returns null'
);
select is(
  jsonb_array_length(
    public.list_admin_user_items_v1(
      '96200000-0000-4000-8000-000000000002',
      'history',
      null,
      null,
      20
    ) -> 'items'
  ),
  0,
  'empty history is represented as an empty list'
);
select ok(
  (select payload::text not like '%report_snapshot%' from admin_user_first_page),
  'list does not expose raw diagnosis snapshots'
);
reset role;

select * from finish();
rollback;
