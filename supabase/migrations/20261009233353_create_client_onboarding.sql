create table public.business_segments (
  id bigint generated always as identity primary key,
  name text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  version integer not null default 0,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  updated_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint business_segments_name_check
    check (pg_catalog.char_length(pg_catalog.btrim(name)) between 2 and 60),
  constraint business_segments_sort_order_check
    check (sort_order between 0 and 10000),
  constraint business_segments_version_check check (version >= 0)
);

create unique index business_segments_name_key
on public.business_segments (pg_catalog.lower(pg_catalog.btrim(name)));

create index business_segments_order_idx
on public.business_segments (sort_order, id);

create table public.business_subcategories (
  id bigint generated always as identity primary key,
  segment_id bigint not null
    references public.business_segments(id) on delete restrict,
  name text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  version integer not null default 0,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  updated_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint business_subcategories_id_segment_key unique (id, segment_id),
  constraint business_subcategories_name_check
    check (pg_catalog.char_length(pg_catalog.btrim(name)) between 2 and 80),
  constraint business_subcategories_sort_order_check
    check (sort_order between 0 and 10000),
  constraint business_subcategories_version_check check (version >= 0)
);

create unique index business_subcategories_segment_name_key
on public.business_subcategories (
  segment_id,
  pg_catalog.lower(pg_catalog.btrim(name))
);

create index business_subcategories_segment_order_idx
on public.business_subcategories (segment_id, sort_order, id);

create table public.onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null,
  whatsapp_e164 text not null,
  segment_id bigint not null
    references public.business_segments(id) on delete restrict,
  subcategory_id bigint,
  custom_subcategory text,
  whatsapp_marketing_consent boolean not null default false,
  marketing_consent_granted_at timestamptz,
  completed_at timestamptz not null default pg_catalog.statement_timestamp(),
  updated_at timestamptz not null default pg_catalog.statement_timestamp(),
  version integer not null default 0,
  constraint onboarding_profiles_name_check
    check (pg_catalog.char_length(pg_catalog.btrim(full_name)) between 2 and 120),
  constraint onboarding_profiles_phone_check
    check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint onboarding_profiles_subcategory_shape_check check (
    (subcategory_id is not null and custom_subcategory is null)
    or (
      subcategory_id is null
      and custom_subcategory is not null
      and pg_catalog.char_length(pg_catalog.btrim(custom_subcategory)) between 2 and 80
    )
  ),
  constraint onboarding_profiles_consent_shape_check check (
    whatsapp_marketing_consent = (marketing_consent_granted_at is not null)
  ),
  constraint onboarding_profiles_version_check check (version >= 0),
  constraint onboarding_profiles_subcategory_segment_fkey
    foreign key (subcategory_id, segment_id)
    references public.business_subcategories(id, segment_id)
    on delete restrict
);

create index onboarding_profiles_segment_id_idx
on public.onboarding_profiles (segment_id);

create index onboarding_profiles_subcategory_id_idx
on public.onboarding_profiles (subcategory_id);

create index onboarding_profiles_completed_at_idx
on public.onboarding_profiles (completed_at);

create index onboarding_profiles_active_consent_idx
on public.onboarding_profiles (marketing_consent_granted_at desc, user_id)
where whatsapp_marketing_consent;

insert into public.business_segments (name, sort_order)
values
  ('Alimentação', 10),
  ('Beleza', 20),
  ('Vestuário', 30),
  ('Tecnologia', 40),
  ('Educação', 50),
  ('Construção', 60),
  ('Saúde', 70),
  ('Comércio', 80);

insert into public.business_subcategories (segment_id, name, sort_order)
select segment.id, seed.name, seed.sort_order
from (
  values
    ('Alimentação'::text, 'Confeitaria'::text, 10),
    ('Beleza'::text, 'Salão de beleza'::text, 10),
    ('Vestuário'::text, 'Loja de roupas'::text, 10),
    ('Tecnologia'::text, 'Assistência técnica'::text, 10),
    ('Educação'::text, 'Curso online'::text, 10)
) as seed(segment_name, name, sort_order)
join public.business_segments as segment
  on segment.name = seed.segment_name;

alter table public.business_segments enable row level security;
alter table public.business_subcategories enable row level security;
alter table public.onboarding_profiles enable row level security;

create policy business_segments_select_authenticated
on public.business_segments for select to authenticated
using (true);

create policy business_subcategories_select_authenticated
on public.business_subcategories for select to authenticated
using (true);

create policy onboarding_profiles_select_own
on public.onboarding_profiles for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.business_segments
from public, anon, authenticated, service_role;
revoke all on table public.business_subcategories
from public, anon, authenticated, service_role;
revoke all on table public.onboarding_profiles
from public, anon, authenticated, service_role;

revoke all on sequence public.business_segments_id_seq
from public, anon, authenticated, service_role;
revoke all on sequence public.business_subcategories_id_seq
from public, anon, authenticated, service_role;

grant select on table public.business_segments to authenticated;
grant select on table public.business_subcategories to authenticated;
grant select on table public.onboarding_profiles to authenticated;

create function public.current_user_has_completed_onboarding()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.onboarding_profiles as profile
      where profile.user_id = (select auth.uid())
    );
$function$;

create function public.list_business_catalog_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', segment.id,
        'name', segment.name,
        'sortOrder', segment.sort_order,
        'isActive', segment.is_active,
        'subcategories', coalesce((
          select pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'id', subcategory.id,
              'segmentId', subcategory.segment_id,
              'name', subcategory.name,
              'sortOrder', subcategory.sort_order,
              'isActive', subcategory.is_active
            )
            order by subcategory.sort_order, subcategory.id
          )
          from public.business_subcategories as subcategory
          where subcategory.segment_id = segment.id
        ), '[]'::jsonb)
      )
      order by segment.sort_order, segment.id
    ),
    '[]'::jsonb
  )
  from public.business_segments as segment;
$function$;

create function public.get_my_onboarding_profile_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'fullName', profile.full_name,
    'whatsappE164', profile.whatsapp_e164,
    'segmentId', profile.segment_id,
    'segmentName', segment.name,
    'segmentIsActive', segment.is_active,
    'subcategoryId', profile.subcategory_id,
    'subcategoryName', subcategory.name,
    'subcategoryIsActive', subcategory.is_active,
    'customSubcategory', profile.custom_subcategory,
    'whatsappMarketingConsent', profile.whatsapp_marketing_consent,
    'marketingConsentGrantedAt', profile.marketing_consent_granted_at,
    'completedAt', profile.completed_at,
    'updatedAt', profile.updated_at,
    'version', profile.version
  )
  from public.onboarding_profiles as profile
  join public.business_segments as segment on segment.id = profile.segment_id
  left join public.business_subcategories as subcategory
    on subcategory.id = profile.subcategory_id
   and subcategory.segment_id = profile.segment_id
  where profile.user_id = (select auth.uid());
$function$;

revoke execute on function public.current_user_has_completed_onboarding()
from public, anon, authenticated, service_role;
revoke execute on function public.list_business_catalog_v1()
from public, anon, authenticated, service_role;
revoke execute on function public.get_my_onboarding_profile_v1()
from public, anon, authenticated, service_role;

grant execute on function public.current_user_has_completed_onboarding()
to authenticated;
grant execute on function public.list_business_catalog_v1()
to authenticated;
grant execute on function public.get_my_onboarding_profile_v1()
to authenticated;
