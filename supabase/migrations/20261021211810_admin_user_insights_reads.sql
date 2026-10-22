create function public.list_admin_users_v2(
  p_query text default null,
  p_state text default 'current',
  p_access text default 'all',
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
  snapshot_at timestamptz := pg_catalog.statement_timestamp();
  search_text text := nullif(pg_catalog.btrim(p_query), '');
  page_size integer := least(
    greatest(coalesce(p_page_size, 20), 1),
    50
  );
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_state not in ('current', 'active', 'blocked', 'deleted', 'all')
    or p_access not in ('all', 'free', 'paid', 'courtesy')
    or p_page is null
    or p_page < 1
    or pg_catalog.length(coalesce(search_text, '')) > 120
  then
    raise exception using errcode = '22023',
      message = 'invalid user list filter';
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  with projected as materialized (
    select
      app_user.id,
      coalesce(app_user.email, 'E-mail indisponível') as email,
      app_user.created_at,
      app_user.last_sign_in_at,
      coalesce(state.version, 0) as version,
      state.courtesy_expires_at,
      case
        when state.deleted_at is not null then 'deleted'
        when state.blocked_at is not null then 'blocked'
        else 'active'
      end as account_state,
      case
        when contract.id is not null then 'paid'
        when state.courtesy_expires_at > snapshot_at then 'courtesy'
        else 'free'
      end as access_source,
      contract.billing_mode,
      contract.status as contract_status,
      contract.access_ends_at,
      contract.id is not null as has_paid_access,
      (
        select pg_catalog.count(*)
        from public.diagnoses as diagnosis
        where diagnosis.user_id = app_user.id
      ) as diagnosis_count
    from auth.users as app_user
    left join private.admin_user_state as state
      on state.user_id = app_user.id
    left join lateral (
      select
        candidate.id,
        candidate.billing_mode,
        candidate.status,
        candidate.access_ends_at
      from public.billing_contracts as candidate
      where candidate.user_id = app_user.id
        and candidate.status in ('active', 'cancel_at_period_end')
        and candidate.access_starts_at <= snapshot_at
        and candidate.access_ends_at > snapshot_at
      order by candidate.access_ends_at desc, candidate.id desc
      limit 1
    ) as contract on true
    where app_user.id <> administrator_id
      and (
        search_text is null
        or pg_catalog.strpos(
          pg_catalog.lower(coalesce(app_user.email, '')),
          pg_catalog.lower(search_text)
        ) > 0
      )
      and (
        p_state = 'all'
        or (
          p_state = 'current'
          and state.deleted_at is null
        )
        or (
          p_state = 'active'
          and state.deleted_at is null
          and state.blocked_at is null
        )
        or (
          p_state = 'blocked'
          and state.deleted_at is null
          and state.blocked_at is not null
        )
        or (p_state = 'deleted' and state.deleted_at is not null)
      )
      and (
        p_access = 'all'
        or (
          p_access = 'paid'
          and contract.id is not null
        )
        or (
          p_access = 'courtesy'
          and contract.id is null
          and state.courtesy_expires_at > snapshot_at
        )
        or (
          p_access = 'free'
          and contract.id is null
          and not coalesce(state.courtesy_expires_at > snapshot_at, false)
        )
      )
  ),
  paged as (
    select projected.*
    from projected
    order by projected.created_at desc, projected.id desc
    limit page_size
    offset (p_page - 1) * page_size
  ),
  totals as (
    select pg_catalog.count(*)::integer as total_count
    from projected
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', page.id,
            'email', page.email,
            'createdAt', page.created_at,
            'lastSignInAt', page.last_sign_in_at,
            'state', page.account_state,
            'access', page.access_source,
            'courtesyExpiresAt', page.courtesy_expires_at,
            'subscription', case
              when page.billing_mode is null then null
              else pg_catalog.jsonb_build_object(
                'billingMode', page.billing_mode,
                'status', page.contract_status,
                'accessEndsAt', page.access_ends_at
              )
            end,
            'diagnosisCount', page.diagnosis_count,
            'version', page.version,
            'hasPaidAccess', page.has_paid_access
          )
          order by page.created_at desc, page.id desc
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

revoke execute on function public.list_admin_users_v2(
  text, text, text, integer, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_users_v2(
  text, text, text, integer, integer
) to authenticated;

create function public.get_admin_user_v2(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  administrator_id uuid;
  snapshot_at timestamptz := pg_catalog.statement_timestamp();
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  select pg_catalog.jsonb_build_object(
    'id', app_user.id,
    'email', coalesce(app_user.email, 'E-mail indisponível'),
    'fullName', profile.full_name,
    'createdAt', app_user.created_at,
    'onboardingCompletedAt', profile.completed_at,
    'lastSignInAt', app_user.last_sign_in_at,
    'segment', case when segment.id is null then null else
      pg_catalog.jsonb_build_object('id', segment.id, 'name', segment.name)
    end,
    'subcategory', case when profile.user_id is null then null else
      pg_catalog.jsonb_build_object(
        'id', subcategory.id,
        'name', coalesce(subcategory.name, 'Outro'),
        'customName', case when subcategory.id is null
          then profile.custom_subcategory else null end
      )
    end,
    'state', case
      when state.deleted_at is not null then 'deleted'
      when state.blocked_at is not null then 'blocked'
      else 'active'
    end,
    'blockedAt', state.blocked_at,
    'deletedAt', state.deleted_at,
    'access', case
      when contract.id is not null then 'paid'
      when state.courtesy_expires_at > snapshot_at then 'courtesy'
      else 'free'
    end,
    'courtesyExpiresAt', state.courtesy_expires_at,
    'subscription', case when contract.id is null then null
      else pg_catalog.jsonb_build_object(
        'billingMode', contract.billing_mode,
        'status', contract.status,
        'accessEndsAt', contract.access_ends_at
      ) end,
    'diagnosisCount', (
      select pg_catalog.count(*)
      from public.diagnoses as diagnosis
      where diagnosis.user_id = app_user.id
    ),
    'version', coalesce(state.version, 0),
    'hasPaidAccess', contract.id is not null
  )
  into result
  from auth.users as app_user
  left join private.admin_user_state as state
    on state.user_id = app_user.id
  left join public.onboarding_profiles as profile
    on profile.user_id = app_user.id
  left join public.business_segments as segment
    on segment.id = profile.segment_id
  left join public.business_subcategories as subcategory
    on subcategory.id = profile.subcategory_id
  left join lateral (
    select
      candidate.id,
      candidate.billing_mode,
      candidate.status,
      candidate.access_ends_at
    from public.billing_contracts as candidate
    where candidate.user_id = app_user.id
      and candidate.status in ('active', 'cancel_at_period_end')
      and candidate.access_starts_at <= snapshot_at
      and candidate.access_ends_at > snapshot_at
    order by candidate.access_ends_at desc, candidate.id desc
    limit 1
  ) as contract on true
  where app_user.id = p_user_id
    and app_user.id <> administrator_id;

  return result;
end;
$function$;

revoke execute on function public.get_admin_user_v2(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.get_admin_user_v2(uuid) to authenticated;
