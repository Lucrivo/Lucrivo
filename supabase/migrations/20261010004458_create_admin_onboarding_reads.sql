create function public.get_admin_onboarding_overview_v1(
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  snapshot_at timestamptz := pg_catalog.statement_timestamp();
  administrator_id uuid;
  from_at timestamptz;
  to_at timestamptz;
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_from is null or p_to is null or p_from >= p_to then
    raise exception using
      errcode = '22023',
      message = 'invalid onboarding overview date range';
  end if;

  from_at := p_from::timestamp at time zone 'America/Sao_Paulo';
  to_at := p_to::timestamp at time zone 'America/Sao_Paulo';

  select administrator.user_id
  into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  with cohort as materialized (
    select
      app_user.id as user_id,
      profile.segment_id,
      profile.subcategory_id,
      profile.whatsapp_marketing_consent,
      profile.completed_at
    from auth.users as app_user
    left join private.admin_user_state as state
      on state.user_id = app_user.id
    left join public.onboarding_profiles as profile
      on profile.user_id = app_user.id
    where app_user.id <> administrator_id
      and app_user.email_confirmed_at is not null
      and app_user.created_at >= from_at
      and app_user.created_at < to_at
      and state.deleted_at is null
  ),
  metrics as (
    select
      pg_catalog.count(*) as account_count,
      pg_catalog.count(*) filter (
        where cohort.completed_at is not null
      ) as completed_count,
      pg_catalog.count(*) filter (
        where cohort.completed_at is not null
          and cohort.whatsapp_marketing_consent
      ) as active_consent_count
    from cohort
  ),
  segment_counts as (
    select
      segment.id,
      segment.name,
      pg_catalog.count(*) as item_count
    from cohort
    join public.business_segments as segment
      on segment.id = cohort.segment_id
    where cohort.completed_at is not null
    group by segment.id, segment.name
  ),
  subcategory_counts as (
    select
      subcategory.id,
      subcategory.name,
      pg_catalog.count(*) as item_count
    from cohort
    join public.business_subcategories as subcategory
      on subcategory.id = cohort.subcategory_id
     and subcategory.segment_id = cohort.segment_id
    where cohort.completed_at is not null
    group by subcategory.id, subcategory.name

    union all

    select
      null::bigint as id,
      'Outro'::text as name,
      pg_catalog.count(*) as item_count
    from cohort
    where cohort.completed_at is not null
      and cohort.subcategory_id is null
    having pg_catalog.count(*) > 0
  )
  select pg_catalog.jsonb_build_object(
    'generatedAt', snapshot_at,
    'metrics', pg_catalog.jsonb_build_object(
      'accountCount', metrics.account_count,
      'completedCount', metrics.completed_count,
      'completionRateBasisPoints', case
        when metrics.account_count = 0 then null
        else pg_catalog.round(
          metrics.completed_count::numeric * 10000 / metrics.account_count
        )::integer
      end,
      'activeConsentCount', metrics.active_consent_count,
      'consentRateBasisPoints', case
        when metrics.completed_count = 0 then null
        else pg_catalog.round(
          metrics.active_consent_count::numeric * 10000
            / metrics.completed_count
        )::integer
      end
    ),
    'segments', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', segment_counts.id,
          'name', segment_counts.name,
          'count', segment_counts.item_count
        )
        order by segment_counts.item_count desc, segment_counts.id asc
      )
      from segment_counts
    ), '[]'::jsonb),
    'subcategories', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', subcategory_counts.id,
          'name', subcategory_counts.name,
          'count', subcategory_counts.item_count
        )
        order by
          subcategory_counts.item_count desc,
          subcategory_counts.id asc nulls last
      )
      from subcategory_counts
    ), '[]'::jsonb)
  )
  into result
  from metrics;

  return result;
end;
$function$;

create function public.list_admin_onboarding_contacts_v1(
  p_query text default null,
  p_segment_id bigint default null,
  p_subcategory_id bigint default null,
  p_consent text default 'all',
  p_from date default null,
  p_to date default null,
  p_cursor_completed_at timestamptz default null,
  p_cursor_user_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  administrator_id uuid;
  search_text text := nullif(pg_catalog.btrim(p_query), '');
  page_size integer := least(
    greatest(coalesce(p_limit, 20), 1),
    50
  );
  from_at timestamptz := case
    when p_from is null then null
    else p_from::timestamp at time zone 'America/Sao_Paulo'
  end;
  to_at timestamptz := case
    when p_to is null then null
    else p_to::timestamp at time zone 'America/Sao_Paulo'
  end;
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using
      errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_consent is null
    or p_consent not in ('all', 'granted', 'declined')
    or pg_catalog.char_length(coalesce(search_text, '')) > 120
    or (p_segment_id is not null and p_segment_id <= 0)
    or (p_subcategory_id is not null and p_subcategory_id <= 0)
    or (p_cursor_completed_at is null) <> (p_cursor_user_id is null)
    or (p_from is not null and p_to is not null and p_from >= p_to)
  then
    raise exception using
      errcode = '22023',
      message = 'invalid onboarding contact filter';
  end if;

  select administrator.user_id
  into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  with filtered as materialized (
    select
      profile.user_id,
      profile.full_name,
      profile.whatsapp_e164,
      segment.id as segment_id,
      segment.name as segment_name,
      subcategory.id as subcategory_id,
      coalesce(subcategory.name, 'Outro') as subcategory_name,
      case
        when subcategory.id is null then profile.custom_subcategory
        else null
      end as custom_subcategory,
      profile.whatsapp_marketing_consent,
      profile.marketing_consent_granted_at,
      profile.completed_at
    from public.onboarding_profiles as profile
    join auth.users as app_user
      on app_user.id = profile.user_id
    join public.business_segments as segment
      on segment.id = profile.segment_id
    left join public.business_subcategories as subcategory
      on subcategory.id = profile.subcategory_id
     and subcategory.segment_id = profile.segment_id
    left join private.admin_user_state as state
      on state.user_id = profile.user_id
    where profile.user_id <> administrator_id
      and state.deleted_at is null
      and (
        search_text is null
        or pg_catalog.strpos(
          pg_catalog.lower(profile.full_name),
          pg_catalog.lower(search_text)
        ) > 0
        or pg_catalog.strpos(profile.whatsapp_e164, search_text) > 0
      )
      and (p_segment_id is null or profile.segment_id = p_segment_id)
      and (
        p_subcategory_id is null
        or profile.subcategory_id = p_subcategory_id
      )
      and (
        p_consent = 'all'
        or (
          p_consent = 'granted'
          and profile.whatsapp_marketing_consent
          and profile.marketing_consent_granted_at is not null
        )
        or (p_consent = 'declined' and not profile.whatsapp_marketing_consent)
      )
      and (from_at is null or profile.completed_at >= from_at)
      and (to_at is null or profile.completed_at < to_at)
      and (
        p_cursor_completed_at is null
        or (profile.completed_at, profile.user_id)
          < (p_cursor_completed_at, p_cursor_user_id)
      )
  ),
  windowed as (
    select filtered.*
    from filtered
    order by filtered.completed_at desc, filtered.user_id desc
    limit page_size + 1
  ),
  numbered as (
    select
      windowed.*,
      pg_catalog.row_number() over (
        order by windowed.completed_at desc, windowed.user_id desc
      ) as position
    from windowed
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'userId', numbered.user_id,
          'fullName', numbered.full_name,
          'whatsappE164', numbered.whatsapp_e164,
          'segment', pg_catalog.jsonb_build_object(
            'id', numbered.segment_id,
            'name', numbered.segment_name
          ),
          'subcategory', pg_catalog.jsonb_build_object(
            'id', numbered.subcategory_id,
            'name', numbered.subcategory_name
          ),
          'customSubcategory', numbered.custom_subcategory,
          'consent', numbered.whatsapp_marketing_consent,
          'consentedAt', numbered.marketing_consent_granted_at,
          'completedAt', numbered.completed_at
        )
        order by numbered.completed_at desc, numbered.user_id desc
      ) filter (where numbered.position <= page_size),
      '[]'::jsonb
    ),
    'nextCursor', case
      when pg_catalog.count(*) > page_size then
        pg_catalog.jsonb_build_object(
          'completedAt', (
            pg_catalog.array_agg(numbered.completed_at)
            filter (where numbered.position = page_size)
          )[1],
          'userId', (
            pg_catalog.array_agg(numbered.user_id)
            filter (where numbered.position = page_size)
          )[1]
        )
      else null
    end
  )
  into result
  from numbered;

  return result;
end;
$function$;

revoke execute on function public.get_admin_onboarding_overview_v1(date, date)
from public, anon, authenticated, service_role;
revoke execute on function public.list_admin_onboarding_contacts_v1(
  text, bigint, bigint, text, date, date, timestamptz, uuid, integer
)
from public, anon, authenticated, service_role;

grant execute on function public.get_admin_onboarding_overview_v1(date, date)
to authenticated;
grant execute on function public.list_admin_onboarding_contacts_v1(
  text, bigint, bigint, text, date, date, timestamptz, uuid, integer
)
to authenticated;
