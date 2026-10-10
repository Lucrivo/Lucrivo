begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_function(
  'public',
  'get_admin_onboarding_overview_v1',
  array['date', 'date'],
  'versioned onboarding overview RPC exists'
);
select has_function(
  'public',
  'list_admin_onboarding_contacts_v1',
  array[
    'text', 'bigint', 'bigint', 'text', 'date', 'date',
    'timestamp with time zone', 'uuid', 'integer'
  ],
  'versioned onboarding contact-list RPC exists'
);

select ok(
  (
    select pg_catalog.bool_and(
      prosecdef
      and provolatile = 's'
      and proconfig = array['search_path=""']::text[]
    )
    from pg_catalog.pg_proc
    where oid in (
      pg_catalog.to_regprocedure(
        'public.get_admin_onboarding_overview_v1(date,date)'
      ),
      pg_catalog.to_regprocedure(
        'public.list_admin_onboarding_contacts_v1(text,bigint,bigint,text,date,date,timestamptz,uuid,integer)'
      )
    )
  ),
  'admin onboarding reads are stable security definers with empty search paths'
);

select ok(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.get_admin_onboarding_overview_v1(date,date)',
    'execute'
  )
  and not pg_catalog.has_function_privilege(
    'service_role',
    'public.get_admin_onboarding_overview_v1(date,date)',
    'execute'
  ),
  'unintended roles cannot execute the overview RPC'
);
select ok(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.list_admin_onboarding_contacts_v1(text,bigint,bigint,text,date,date,timestamptz,uuid,integer)',
    'execute'
  )
  and not pg_catalog.has_function_privilege(
    'service_role',
    'public.list_admin_onboarding_contacts_v1(text,bigint,bigint,text,date,date,timestamptz,uuid,integer)',
    'execute'
  ),
  'unintended roles cannot execute the contact-list RPC'
);
select ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_admin_onboarding_overview_v1(date,date)',
    'execute'
  )
  and pg_catalog.has_function_privilege(
    'authenticated',
    'public.list_admin_onboarding_contacts_v1(text,bigint,bigint,text,date,date,timestamptz,uuid,integer)',
    'execute'
  ),
  'authenticated callers reach the internal admin authorization check'
);

alter table private.whatsapp_consent_events
  disable trigger whatsapp_consent_events_reject_mutation;
alter table private.admin_user_events
  disable trigger admin_user_events_reject_changes;
truncate table auth.users cascade;
alter table private.admin_user_events
  enable trigger admin_user_events_reject_changes;
alter table private.whatsapp_consent_events
  enable trigger whatsapp_consent_events_reject_mutation;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, created_at
)
values
  (
    '97000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'admin@onboarding-admin.test',
    '2026-10-01T12:00:00Z', '2026-10-01T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'ana@onboarding-admin.test',
    '2026-10-02T12:00:00Z', '2026-10-02T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'bruno@onboarding-admin.test',
    '2026-10-03T12:00:00Z', '2026-10-03T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'carla@onboarding-admin.test',
    '2026-10-04T12:00:00Z', '2026-10-04T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'diego@onboarding-admin.test',
    '2026-10-05T12:00:00Z', '2026-10-05T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'deleted@onboarding-admin.test',
    '2026-10-06T12:00:00Z', '2026-10-06T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000007',
    'authenticated', 'authenticated', 'unconfirmed@onboarding-admin.test',
    null, '2026-10-07T12:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000008',
    'authenticated', 'authenticated', 'outside@onboarding-admin.test',
    '2026-09-30T02:59:59Z', '2026-09-30T02:59:59Z'
  );

insert into private.app_administrator (user_id)
values ('97000000-0000-4000-8000-000000000001');

insert into private.admin_user_state (user_id, blocked_at, deleted_at)
values
  (
    '97000000-0000-4000-8000-000000000003',
    '2026-10-04T00:00:00Z', null
  ),
  (
    '97000000-0000-4000-8000-000000000006',
    null, '2026-10-07T00:00:00Z'
  );

insert into public.onboarding_profiles (
  user_id,
  full_name,
  whatsapp_e164,
  segment_id,
  subcategory_id,
  custom_subcategory,
  whatsapp_marketing_consent,
  marketing_consent_granted_at,
  completed_at,
  updated_at
)
values
  (
    '97000000-0000-4000-8000-000000000002',
    'Ana Fórmula',
    '+5511999990002',
    (select id from public.business_segments where name = 'Alimentação'),
    (select id from public.business_subcategories where name = 'Confeitaria'),
    null,
    true,
    '2026-10-02T15:00:00Z',
    '2026-10-02T15:00:00Z',
    '2026-10-02T15:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000003',
    'Bruno Bloqueado',
    '+5511999990003',
    (select id from public.business_segments where name = 'Alimentação'),
    (select id from public.business_subcategories where name = 'Confeitaria'),
    null,
    false,
    null,
    '2026-10-03T15:00:00Z',
    '2026-10-03T15:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000004',
    'Carla Construção',
    '+5511999990004',
    (select id from public.business_segments where name = 'Construção'),
    null,
    'Reformas residenciais',
    true,
    '2026-10-04T15:00:00Z',
    '2026-10-04T15:00:00Z',
    '2026-10-04T15:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000006',
    'Pessoa Excluída',
    '+5511999990006',
    (select id from public.business_segments where name = 'Beleza'),
    (select id from public.business_subcategories where name = 'Salão de beleza'),
    null,
    true,
    '2026-10-06T15:00:00Z',
    '2026-10-06T15:00:00Z',
    '2026-10-06T15:00:00Z'
  ),
  (
    '97000000-0000-4000-8000-000000000008',
    'Pessoa Fora da Coorte',
    '+5511999990008',
    (select id from public.business_segments where name = 'Beleza'),
    (select id from public.business_subcategories where name = 'Salão de beleza'),
    null,
    true,
    '2026-09-30T02:59:59Z',
    '2026-09-30T02:59:59Z',
    '2026-09-30T02:59:59Z'
  );

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000002',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$ select public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10') $$,
  '42501', 'administrator access required',
  'ordinary authenticated users cannot read onboarding metrics'
);
select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(null,null,null,'all',null,null,null,null,20) $$,
  '42501', 'administrator access required',
  'ordinary authenticated users cannot list onboarding contacts'
);
reset role;

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$ select public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10') $$,
  '42501', 'administrator access required',
  'administrator at aal1 cannot read onboarding metrics'
);
select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(null,null,null,'all',null,null,null,null,20) $$,
  '42501', 'administrator access required',
  'administrator at aal1 cannot list onboarding contacts'
);
reset role;

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

select is(
  public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10')
    -> 'metrics',
  '{"accountCount":4,"completedCount":3,"completionRateBasisPoints":7500,"activeConsentCount":2,"consentRateBasisPoints":6667}'::jsonb,
  'overview computes the confirmed-account cohort and rounded rates'
);
select is(
  public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10')
    -> 'segments',
  (
    select pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', food.id, 'name', 'Alimentação', 'count', 2
      ),
      pg_catalog.jsonb_build_object(
        'id', construction.id, 'name', 'Construção', 'count', 1
      )
    )
    from public.business_segments as food
    cross join public.business_segments as construction
    where food.name = 'Alimentação'
      and construction.name = 'Construção'
  ),
  'segment distribution includes blocked clients and is deterministic'
);
select is(
  public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10')
    -> 'subcategories',
  (
    select pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', subcategory.id, 'name', 'Confeitaria', 'count', 2
      ),
      pg_catalog.jsonb_build_object(
        'id', null, 'name', 'Outro', 'count', 1
      )
    )
    from public.business_subcategories as subcategory
    where subcategory.name = 'Confeitaria'
  ),
  'custom subcategories aggregate under one Outro bucket'
);
select ok(
  (
    public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10')
      ->> 'generatedAt'
  )::timestamptz <= pg_catalog.statement_timestamp(),
  'overview exposes a generated timestamp'
);
select is(
  public.get_admin_onboarding_overview_v1('2025-01-01', '2025-01-02')
    -> 'metrics',
  '{"accountCount":0,"completedCount":0,"completionRateBasisPoints":null,"activeConsentCount":0,"consentRateBasisPoints":null}'::jsonb,
  'zero denominators return null rates'
);

select throws_ok(
  $$ select public.get_admin_onboarding_overview_v1('2026-10-10', '2026-10-01') $$,
  '22023', 'invalid onboarding overview date range',
  'inverted overview ranges are rejected'
);

select is(
  public.list_admin_onboarding_contacts_v1(
    'ana fórmula', null, null, 'all', null, null, null, null, 20
  ) #>> '{items,0,fullName}',
  'Ana Fórmula',
  'contact search matches names case-insensitively'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    '99990004', null, null, 'all', null, null, null, null, 20
  ) #>> '{items,0,fullName}',
  'Carla Construção',
  'contact search matches E.164 phone fragments'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_onboarding_contacts_v1(
      null,
      (select id from public.business_segments where name = 'Alimentação'),
      null,
      'all', null, null, null, null, 20
    ) -> 'items'
  ),
  2,
  'segment filter is exact'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_onboarding_contacts_v1(
      null,
      null,
      (select id from public.business_subcategories where name = 'Confeitaria'),
      'all', null, null, null, null, 20
    ) -> 'items'
  ),
  2,
  'subcategory filter is exact'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_onboarding_contacts_v1(
      null, null, null, 'granted', null, null, null, null, 20
    ) -> 'items'
  ),
  3,
  'granted consent filter includes only current active consent'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    null, null, null, 'declined', null, null, null, null, 20
  ) #>> '{items,0,fullName}',
  'Bruno Bloqueado',
  'declined consent filter includes current declined consent'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_onboarding_contacts_v1(
      null, null, null, 'all', '2026-10-03', '2026-10-05',
      null, null, 20
    ) -> 'items'
  ),
  2,
  'contact date range is inclusive from and exclusive to in Sao Paulo time'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  ) #>> '{items,0,fullName}',
  'Carla Construção',
  'contacts are ordered by completion time descending'
);
select ok(
  public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  ) -> 'items' @> '[{"fullName":"Pessoa Fora da Coorte"}]'::jsonb,
  'contact list is independent of the overview account-created cohort'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    'carla', null, null, 'all', null, null, null, null, 20
  ) #> '{items,0,subcategory}',
  '{"id":null,"name":"Outro"}'::jsonb,
  'custom choices expose the synthetic Outro label'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    'carla', null, null, 'all', null, null, null, null, 20
  ) #>> '{items,0,customSubcategory}',
  'Reformas residenciais',
  'custom choice exposes its text only for Outro'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    'ana', null, null, 'all', null, null, null, null, 20
  ) #> '{items,0,customSubcategory}',
  'null'::jsonb,
  'catalog subcategories never expose custom text'
);
select ok(
  public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  )::text not like '%@onboarding-admin.test%'
  and public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  )::text not like '%report%'
  and public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  )::text not like '%billing%'
  and public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  )::text not like '%consent_events%'
  and public.list_admin_onboarding_contacts_v1(
    null, null, null, 'all', null, null, null, null, 20
  )::text not like '%97000000-0000-4000-8000-000000000006%'
  ,
  'contact payload omits email, reports, billing, consent history, and deleted users'
);

create temporary table first_contact_page (payload jsonb) on commit drop;
grant select, insert on first_contact_page to authenticated;
insert into first_contact_page (payload)
select public.list_admin_onboarding_contacts_v1(
  null, null, null, 'all', null, null, null, null, 1
);
select is(
  (select pg_catalog.jsonb_array_length(payload -> 'items') from first_contact_page),
  1,
  'contact page limit is applied inside the database'
);
select ok(
  (select payload -> 'nextCursor' is not null from first_contact_page),
  'contact page exposes a continuation cursor'
);
select ok(
  (
    select public.list_admin_onboarding_contacts_v1(
      null, null, null, 'all', null, null,
      (payload #>> '{nextCursor,completedAt}')::timestamptz,
      (payload #>> '{nextCursor,userId}')::uuid,
      1
    ) #>> '{items,0,userId}'
      <> payload #>> '{items,0,userId}'
    from first_contact_page
  ),
  'compound cursor advances without repeating a contact'
);
select is(
  pg_catalog.jsonb_array_length(
    public.list_admin_onboarding_contacts_v1(
      null, null, null, 'all', null, null, null, null, 500
    ) -> 'items'
  ),
  4,
  'oversized page requests are capped and deleted contacts remain excluded'
);

select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(repeat('x',121),null,null,'all',null,null,null,null,20) $$,
  '22023', 'invalid onboarding contact filter',
  'search length is bounded'
);
select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(null,null,null,'maybe',null,null,null,null,20) $$,
  '22023', 'invalid onboarding contact filter',
  'unknown consent filters are rejected'
);
select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(null,0,null,'all',null,null,null,null,20) $$,
  '22023', 'invalid onboarding contact filter',
  'non-positive catalog IDs are rejected'
);
select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(null,null,null,'all',null,null,statement_timestamp(),null,20) $$,
  '22023', 'invalid onboarding contact filter',
  'partial cursors are rejected'
);
select throws_ok(
  $$ select public.list_admin_onboarding_contacts_v1(null,null,null,'all','2026-10-10','2026-10-01',null,null,20) $$,
  '22023', 'invalid onboarding contact filter',
  'inverted contact date ranges are rejected'
);

reset role;

update public.business_segments
set name = 'Alimentação atualizada'
where name = 'Alimentação';
update public.business_subcategories
set name = 'Confeitaria atualizada'
where name = 'Confeitaria';

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  public.get_admin_onboarding_overview_v1('2026-10-01', '2026-10-10')
    #>> '{segments,0,name}',
  'Alimentação atualizada',
  'overview resolves the current segment label'
);
select is(
  public.list_admin_onboarding_contacts_v1(
    'ana', null, null, 'all', null, null, null, null, 20
  ) #>> '{items,0,subcategory,name}',
  'Confeitaria atualizada',
  'contact list resolves the current subcategory label'
);
reset role;

select has_function(
  'public',
  'save_admin_business_segment_v1',
  array['bigint', 'text', 'integer', 'boolean', 'integer'],
  'versioned segment mutation RPC exists'
);
select has_function(
  'public',
  'save_admin_business_subcategory_v1',
  array['bigint', 'bigint', 'text', 'integer', 'boolean', 'integer'],
  'versioned subcategory mutation RPC exists'
);
select ok(
  (
    select pg_catalog.bool_and(
      prosecdef
      and provolatile = 'v'
      and proconfig = array['search_path=""']::text[]
    )
    from pg_catalog.pg_proc
    where oid in (
      pg_catalog.to_regprocedure(
        'public.save_admin_business_segment_v1(bigint,text,integer,boolean,integer)'
      ),
      pg_catalog.to_regprocedure(
        'public.save_admin_business_subcategory_v1(bigint,bigint,text,integer,boolean,integer)'
      )
    )
  ),
  'catalog mutations are volatile security definers with empty search paths'
);
select ok(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.save_admin_business_segment_v1(bigint,text,integer,boolean,integer)',
    'execute'
  )
  and not pg_catalog.has_function_privilege(
    'service_role',
    'public.save_admin_business_subcategory_v1(bigint,bigint,text,integer,boolean,integer)',
    'execute'
  ),
  'unintended roles cannot execute catalog mutations'
);
select ok(
  not pg_catalog.has_table_privilege(
    'authenticated', 'public.business_segments', 'delete'
  )
  and not pg_catalog.has_table_privilege(
    'authenticated', 'public.business_subcategories', 'delete'
  ),
  'catalog entries have no authenticated delete grant'
);

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000002',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$ select public.save_admin_business_segment_v1(null,'Novo segmento',10,true,null) $$,
  '42501', 'administrator access required',
  'ordinary users cannot mutate segments'
);
select throws_ok(
  $$ select public.save_admin_business_subcategory_v1(null,1,'Nova subcategoria',10,true,null) $$,
  '42501', 'administrator access required',
  'ordinary users cannot mutate subcategories'
);
reset role;

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$ select public.save_admin_business_segment_v1(null,'Novo segmento',10,true,null) $$,
  '42501', 'administrator access required',
  'administrator at aal1 cannot mutate segments'
);
select throws_ok(
  $$ select public.save_admin_business_subcategory_v1(null,1,'Nova subcategoria',10,true,null) $$,
  '42501', 'administrator access required',
  'administrator at aal1 cannot mutate subcategories'
);
reset role;

create temporary table saved_segment (payload jsonb) on commit drop;
create temporary table saved_subcategory (payload jsonb) on commit drop;
grant select, insert, update on saved_segment to authenticated;
grant select, insert, update on saved_subcategory to authenticated;

set local role authenticated;
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '97000000-0000-4000-8000-000000000001',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into saved_segment (payload)
select public.save_admin_business_segment_v1(
  null, '  Serviços   criativos  ', 900, true, null
);
select is(
  (select payload - 'item' from saved_segment),
  '{"status":"saved"}'::jsonb,
  'segment create returns saved status'
);
select is(
  (select payload -> 'item' from saved_segment),
  (
    select pg_catalog.jsonb_build_object(
      'id', (payload #>> '{item,id}')::bigint,
      'name', 'Serviços criativos',
      'sortOrder', 900,
      'isActive', true,
      'version', 0
    )
    from saved_segment
  ),
  'segment create normalizes its name and starts at version zero'
);

update saved_segment
set payload = public.save_admin_business_segment_v1(
  (payload #>> '{item,id}')::bigint,
  'Serviços profissionais',
  900,
  true,
  0
);
select is(
  (select payload #>> '{item,name}' from saved_segment),
  'Serviços profissionais',
  'segment rename saves with the exact expected version'
);
select is(
  (select payload #>> '{item,version}' from saved_segment),
  '1',
  'segment rename increments the version exactly once'
);

update saved_segment
set payload = public.save_admin_business_segment_v1(
  (payload #>> '{item,id}')::bigint,
  payload #>> '{item,name}',
  901,
  true,
  1
);
select is(
  (select payload #>> '{item,sortOrder}' from saved_segment),
  '901',
  'segment ordering can be changed'
);

update saved_segment
set payload = public.save_admin_business_segment_v1(
  (payload #>> '{item,id}')::bigint,
  payload #>> '{item,name}',
  (payload #>> '{item,sortOrder}')::integer,
  false,
  2
);
select is(
  (select payload #>> '{item,isActive}' from saved_segment),
  'false',
  'segment can be archived without deletion'
);

select is(
  public.save_admin_business_segment_v1(
    (select (payload #>> '{item,id}')::bigint from saved_segment),
    'Tentativa antiga',
    1,
    true,
    2
  ),
  '{"status":"conflict"}'::jsonb,
  'stale segment versions return conflict'
);
select is(
  public.save_admin_business_segment_v1(
    999999, 'Ausente', 1, true, 0
  ),
  '{"status":"not_found"}'::jsonb,
  'missing segment IDs return not_found'
);
select is(
  public.save_admin_business_segment_v1(
    null, 'bElEzA', 1, true, null
  ),
  '{"status":"duplicate"}'::jsonb,
  'segment duplicates are case-insensitive'
);
select throws_ok(
  $$ select public.save_admin_business_segment_v1(null,'x',1,true,null) $$,
  '22023', 'invalid business segment input',
  'invalid segment name lengths are rejected'
);
select throws_ok(
  $$ select public.save_admin_business_segment_v1(null,'Segmento válido',10001,true,null) $$,
  '22023', 'invalid business segment input',
  'invalid segment ordering is rejected'
);

update saved_segment
set payload = public.save_admin_business_segment_v1(
  (payload #>> '{item,id}')::bigint,
  payload #>> '{item,name}',
  (payload #>> '{item,sortOrder}')::integer,
  true,
  3
);
select is(
  (select payload #>> '{item,version}' from saved_segment),
  '4',
  'segment can be restored with the next version'
);

insert into saved_subcategory (payload)
select public.save_admin_business_subcategory_v1(
  null,
  (select (payload #>> '{item,id}')::bigint from saved_segment),
  '  Consultoria   estratégica  ',
  700,
  true,
  null
);
select is(
  (select payload #>> '{item,name}' from saved_subcategory),
  'Consultoria estratégica',
  'subcategory create normalizes its name'
);
select is(
  (select payload #>> '{item,version}' from saved_subcategory),
  '0',
  'subcategory create starts at version zero'
);

update saved_subcategory
set payload = public.save_admin_business_subcategory_v1(
  (payload #>> '{item,id}')::bigint,
  (payload #>> '{item,segmentId}')::bigint,
  'Consultoria financeira',
  700,
  true,
  0
);
select is(
  (select payload #>> '{item,name}' from saved_subcategory),
  'Consultoria financeira',
  'subcategory rename saves with the exact expected version'
);

update saved_subcategory
set payload = public.save_admin_business_subcategory_v1(
  (payload #>> '{item,id}')::bigint,
  (payload #>> '{item,segmentId}')::bigint,
  payload #>> '{item,name}',
  701,
  true,
  1
);
select is(
  (select payload #>> '{item,sortOrder}' from saved_subcategory),
  '701',
  'subcategory ordering can be changed'
);

update saved_subcategory
set payload = public.save_admin_business_subcategory_v1(
  (payload #>> '{item,id}')::bigint,
  (payload #>> '{item,segmentId}')::bigint,
  payload #>> '{item,name}',
  (payload #>> '{item,sortOrder}')::integer,
  false,
  2
);
select is(
  (select payload #>> '{item,isActive}' from saved_subcategory),
  'false',
  'subcategory can be archived without deletion'
);
select is(
  public.save_admin_business_subcategory_v1(
    (select (payload #>> '{item,id}')::bigint from saved_subcategory),
    (select (payload #>> '{item,segmentId}')::bigint from saved_subcategory),
    'Tentativa antiga',
    1,
    true,
    2
  ),
  '{"status":"conflict"}'::jsonb,
  'stale subcategory versions return conflict'
);
select is(
  public.save_admin_business_subcategory_v1(
    999999,
    (select (payload #>> '{item,id}')::bigint from saved_segment),
    'Ausente', 1, true, 0
  ),
  '{"status":"not_found"}'::jsonb,
  'missing subcategory IDs return not_found'
);
select is(
  public.save_admin_business_subcategory_v1(
    null,
    (select id from public.business_segments where name = 'Beleza'),
    'sAlÃo De BeLeZa',
    1,
    true,
    null
  ),
  '{"status":"duplicate"}'::jsonb,
  'subcategory duplicates are case-insensitive within a segment'
);
select throws_ok(
  $$ select public.save_admin_business_subcategory_v1(null,1,'x',1,true,null) $$,
  '22023', 'invalid business subcategory input',
  'invalid subcategory name lengths are rejected'
);
select throws_ok(
  $$ select public.save_admin_business_subcategory_v1(null,1,'Subcategoria válida',-1,true,null) $$,
  '22023', 'invalid business subcategory input',
  'invalid subcategory ordering is rejected'
);
select throws_ok(
  $$
    select public.save_admin_business_subcategory_v1(
      (select (payload #>> '{item,id}')::bigint from saved_subcategory),
      (select id from public.business_segments where name = 'Beleza'),
      'Consultoria financeira', 701, false, 3
    )
  $$,
  '22023', 'business subcategory segment is immutable',
  'existing subcategories cannot move between segments'
);

update saved_subcategory
set payload = public.save_admin_business_subcategory_v1(
  (payload #>> '{item,id}')::bigint,
  (payload #>> '{item,segmentId}')::bigint,
  payload #>> '{item,name}',
  (payload #>> '{item,sortOrder}')::integer,
  true,
  3
);
select is(
  (select payload #>> '{item,version}' from saved_subcategory),
  '4',
  'subcategory can be restored with the next version'
);

update saved_segment
set payload = public.save_admin_business_segment_v1(
  (payload #>> '{item,id}')::bigint,
  payload #>> '{item,name}',
  (payload #>> '{item,sortOrder}')::integer,
  false,
  4
);
select throws_ok(
  $$
    select public.save_admin_business_subcategory_v1(
      null,
      (select (payload #>> '{item,id}')::bigint from saved_segment),
      'Nova em segmento inativo', 1, true, null
    )
  $$,
  '22023', 'new subcategories require an active segment',
  'new subcategories cannot attach to archived segments'
);

select is(
  public.save_admin_business_segment_v1(
    (select id from public.business_segments where name = 'Alimentação atualizada'),
    'Alimentação atualizada',
    (select sort_order from public.business_segments where name = 'Alimentação atualizada'),
    false,
    0
  ) ->> 'status',
  'saved',
  'a referenced segment can be archived'
);
reset role;
select is(
  (
    select pg_catalog.count(*)
    from public.onboarding_profiles as profile
    join public.business_segments as segment on segment.id = profile.segment_id
    where segment.name = 'Alimentação atualizada'
  ),
  2::bigint,
  'archiving preserves profiles that reference the segment'
);

select * from finish();
rollback;
