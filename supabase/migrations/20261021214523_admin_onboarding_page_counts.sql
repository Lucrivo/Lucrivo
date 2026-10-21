create function public.list_admin_onboarding_contacts_v2(
  p_query text default null,
  p_segment_id bigint default null,
  p_subcategory_id bigint default null,
  p_consent text default 'all',
  p_from date default null,
  p_to date default null,
  p_page integer default 1,
  p_page_size integer default 20
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
    greatest(coalesce(p_page_size, 20), 1),
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
    or (p_from is not null and p_to is not null and p_from >= p_to)
    or p_page is null
    or p_page < 1
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
  ),
  paged as (
    select filtered.*
    from filtered
    order by filtered.completed_at desc, filtered.user_id desc
    limit page_size
    offset (p_page - 1) * page_size
  ),
  totals as (
    select pg_catalog.count(*)::integer as total_count
    from filtered
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'userId', page.user_id,
            'fullName', page.full_name,
            'whatsappE164', page.whatsapp_e164,
            'segment', pg_catalog.jsonb_build_object(
              'id', page.segment_id,
              'name', page.segment_name
            ),
            'subcategory', pg_catalog.jsonb_build_object(
              'id', page.subcategory_id,
              'name', page.subcategory_name
            ),
            'customSubcategory', page.custom_subcategory,
            'consent', page.whatsapp_marketing_consent,
            'consentedAt', page.marketing_consent_granted_at,
            'completedAt', page.completed_at
          )
          order by page.completed_at desc, page.user_id desc
        )
        from paged as page
      ),
      '[]'::jsonb
    ),
    'page', p_page,
    'pageSize', page_size,
    'totalCount', totals.total_count,
    'totalPages', case
      when totals.total_count = 0 then 0
      else pg_catalog.ceil(totals.total_count::numeric / page_size)::integer
    end
  )
  into result
  from totals;

  return result;
end;
$function$;

revoke execute on function public.list_admin_onboarding_contacts_v2(
  text, bigint, bigint, text, date, date, integer, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_onboarding_contacts_v2(
  text, bigint, bigint, text, date, date, integer, integer
) to authenticated;
