create table private.admin_onboarding_export_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  filters jsonb not null,
  row_count integer not null,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint admin_onboarding_export_events_filters_object_check
    check (pg_catalog.jsonb_typeof(filters) = 'object'),
  constraint admin_onboarding_export_events_filters_length_check
    check (pg_catalog.char_length(filters::text) <= 2000),
  constraint admin_onboarding_export_events_row_count_check
    check (row_count >= 0 and row_count <= 5000)
);

create index admin_onboarding_export_events_actor_created_idx
on private.admin_onboarding_export_events (actor_id, created_at desc, id desc);

alter table private.admin_onboarding_export_events enable row level security;

revoke all on table private.admin_onboarding_export_events
from public, anon, authenticated, service_role;
revoke all on sequence private.admin_onboarding_export_events_id_seq
from public, anon, authenticated, service_role;

create function public.export_admin_onboarding_contacts_v1(
  p_segment_id bigint default null,
  p_subcategory_id bigint default null,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  administrator_id uuid;
  from_at timestamptz := case
    when p_from is null then null
    else p_from::timestamp at time zone 'America/Sao_Paulo'
  end;
  to_at timestamptz := case
    when p_to is null then null
    else p_to::timestamp at time zone 'America/Sao_Paulo'
  end;
  export_filters jsonb;
  export_items jsonb;
  export_count bigint;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  if actor_id is null
    or (p_segment_id is not null and p_segment_id <= 0)
    or (p_subcategory_id is not null and p_subcategory_id <= 0)
    or (p_from is not null and p_to is not null and p_from >= p_to)
  then
    raise exception using
      errcode = '22023',
      message = 'invalid onboarding export filter';
  end if;

  select administrator.user_id
  into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  export_filters := pg_catalog.jsonb_build_object(
    'segmentId', p_segment_id,
    'subcategoryId', p_subcategory_id,
    'from', p_from,
    'to', p_to
  );

  with authorized as materialized (
    select
      profile.user_id,
      profile.full_name,
      profile.whatsapp_e164,
      segment.name as segment_name,
      coalesce(subcategory.name, profile.custom_subcategory) as subcategory_name,
      profile.marketing_consent_granted_at,
      profile.completed_at
    from public.onboarding_profiles as profile
    join public.business_segments as segment
      on segment.id = profile.segment_id
    left join public.business_subcategories as subcategory
      on subcategory.id = profile.subcategory_id
     and subcategory.segment_id = profile.segment_id
    left join private.admin_user_state as state
      on state.user_id = profile.user_id
    where profile.user_id <> administrator_id
      and state.deleted_at is null
      and profile.whatsapp_marketing_consent
      and profile.marketing_consent_granted_at is not null
      and (p_segment_id is null or profile.segment_id = p_segment_id)
      and (
        p_subcategory_id is null
        or profile.subcategory_id = p_subcategory_id
      )
      and (from_at is null or profile.completed_at >= from_at)
      and (to_at is null or profile.completed_at < to_at)
    order by profile.completed_at desc, profile.user_id desc
    limit 5001
  )
  select
    pg_catalog.count(*),
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'fullName', authorized.full_name,
          'whatsappE164', authorized.whatsapp_e164,
          'segment', authorized.segment_name,
          'subcategory', authorized.subcategory_name,
          'consentedAt', authorized.marketing_consent_granted_at
        )
        order by authorized.completed_at desc, authorized.user_id desc
      ),
      '[]'::jsonb
    )
  into export_count, export_items
  from authorized;

  if export_count = 0 then
    return pg_catalog.jsonb_build_object('status', 'empty');
  end if;

  if export_count > 5000 then
    return pg_catalog.jsonb_build_object('status', 'limit_exceeded');
  end if;

  insert into private.admin_onboarding_export_events (
    actor_id,
    filters,
    row_count
  ) values (
    actor_id,
    export_filters,
    export_count
  );

  return pg_catalog.jsonb_build_object(
    'status', 'ready',
    'items', export_items
  );
end;
$function$;

revoke execute on function public.export_admin_onboarding_contacts_v1(
  bigint, bigint, date, date
)
from public, anon, authenticated, service_role;

grant execute on function public.export_admin_onboarding_contacts_v1(
  bigint, bigint, date, date
)
to authenticated;
