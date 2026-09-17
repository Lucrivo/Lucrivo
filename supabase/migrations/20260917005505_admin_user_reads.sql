create function public.list_admin_users_v1(
  p_query text default null,
  p_state text default 'current',
  p_access text default 'all',
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
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
  snapshot_at timestamptz := statement_timestamp();
  search_text text := nullif(btrim(p_query), '');
  page_size integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_state not in ('current', 'active', 'blocked', 'deleted', 'all')
    or p_access not in ('all', 'free', 'paid', 'courtesy')
    or (p_cursor_created_at is null) <> (p_cursor_id is null)
    or length(coalesce(search_text, '')) > 120
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
      (contract.id is not null) as has_paid_access,
      (
        select count(*)
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
        or position(
          lower(search_text) in lower(coalesce(app_user.email, ''))
        ) > 0
      )
      and (
        p_cursor_created_at is null
        or (app_user.created_at, app_user.id)
          < (p_cursor_created_at, p_cursor_id)
      )
  ),
  windowed as (
    select *
    from projected
    where (
      p_state = 'all'
      or (p_state = 'current' and account_state <> 'deleted')
      or p_state = account_state
    )
      and (p_access = 'all' or p_access = access_source)
    order by created_at desc, id desc
    limit page_size + 1
  ),
  numbered as (
    select
      windowed.*,
      row_number() over (order by created_at desc, id desc) as position
    from windowed
  )
  select jsonb_build_object(
    'items',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'email', email,
          'createdAt', created_at,
          'lastSignInAt', last_sign_in_at,
          'state', account_state,
          'access', access_source,
          'courtesyExpiresAt', courtesy_expires_at,
          'subscription', case
            when billing_mode is null then null
            else jsonb_build_object(
              'billingMode', billing_mode,
              'status', contract_status,
              'accessEndsAt', access_ends_at
            )
          end,
          'diagnosisCount', diagnosis_count,
          'version', version,
          'hasPaidAccess', has_paid_access
        )
        order by created_at desc, id desc
      ) filter (where position <= page_size),
      '[]'::jsonb
    ),
    'nextCursor',
    case when count(*) > page_size then
      jsonb_build_object(
        'createdAt',
        (array_agg(created_at) filter (where position = page_size))[1],
        'id',
        (array_agg(id) filter (where position = page_size))[1]
      )
    else null end
  )
  into result
  from numbered;

  return result;
end;
$function$;

revoke execute on function public.list_admin_users_v1(
  text, text, text, timestamptz, uuid, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_users_v1(
  text, text, text, timestamptz, uuid, integer
) to authenticated;

create function public.get_admin_user_v1(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  administrator_id uuid;
  snapshot_at timestamptz := statement_timestamp();
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  select jsonb_build_object(
    'id', app_user.id,
    'email', coalesce(app_user.email, 'E-mail indisponível'),
    'createdAt', app_user.created_at,
    'lastSignInAt', app_user.last_sign_in_at,
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
      else jsonb_build_object(
        'billingMode', contract.billing_mode,
        'status', contract.status,
        'accessEndsAt', contract.access_ends_at
      ) end,
    'diagnosisCount', (
      select count(*)
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

revoke execute on function public.get_admin_user_v1(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.get_admin_user_v1(uuid) to authenticated;

create function public.list_admin_user_items_v1(
  p_user_id uuid,
  p_kind text,
  p_cursor_created_at timestamptz default null,
  p_cursor_id text default null,
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
  page_size integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  result jsonb;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_kind not in ('diagnoses', 'subscriptions', 'history')
    or (p_cursor_created_at is null) <> (p_cursor_id is null)
  then
    raise exception using errcode = '22023',
      message = 'invalid user items filter';
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  if p_user_id = administrator_id
    or not exists (select 1 from auth.users where id = p_user_id)
  then
    return null;
  end if;

  if p_kind = 'diagnoses' then
    with windowed as (
      select diagnosis.id, diagnosis.created_at,
        jsonb_build_object(
          'id', diagnosis.id::text,
          'createdAt', diagnosis.created_at,
          'category', diagnosis.business_category,
          'scenario', diagnosis.scenario,
          'isFreeReport', diagnosis.is_free_report
        ) as item
      from public.diagnoses as diagnosis
      where diagnosis.user_id = p_user_id
        and (
          p_cursor_created_at is null
          or (diagnosis.created_at, diagnosis.id)
            < (p_cursor_created_at, p_cursor_id::bigint)
        )
      order by diagnosis.created_at desc, diagnosis.id desc
      limit page_size + 1
    ),
    numbered as (
      select *,
        row_number() over (order by created_at desc, id desc) as position
      from windowed
    )
    select jsonb_build_object(
      'items', coalesce(
        jsonb_agg(item order by created_at desc, id desc)
          filter (where position <= page_size),
        '[]'::jsonb
      ),
      'nextCursor', case when count(*) > page_size then
        jsonb_build_object(
          'createdAt',
          (array_agg(created_at) filter (where position = page_size))[1],
          'id',
          (array_agg(id::text) filter (where position = page_size))[1]
        )
      else null end
    )
    into result
    from numbered;
  elsif p_kind = 'subscriptions' then
    with windowed as (
      select contract.id, contract.created_at,
        jsonb_build_object(
          'id', contract.id,
          'createdAt', contract.created_at,
          'billingMode', contract.billing_mode,
          'paymentMethod', contract.payment_method,
          'status', contract.status,
          'amountCents', contract.amount_cents,
          'accessStartsAt', contract.access_starts_at,
          'accessEndsAt', contract.access_ends_at,
          'cancelAtPeriodEnd', contract.cancel_at_period_end,
          'cancellationConfirmedAt', contract.cancellation_confirmed_at
        ) as item
      from public.billing_contracts as contract
      where contract.user_id = p_user_id
        and (
          p_cursor_created_at is null
          or (contract.created_at, contract.id)
            < (p_cursor_created_at, p_cursor_id::uuid)
        )
      order by contract.created_at desc, contract.id desc
      limit page_size + 1
    ),
    numbered as (
      select *,
        row_number() over (order by created_at desc, id desc) as position
      from windowed
    )
    select jsonb_build_object(
      'items', coalesce(
        jsonb_agg(item order by created_at desc, id desc)
          filter (where position <= page_size),
        '[]'::jsonb
      ),
      'nextCursor', case when count(*) > page_size then
        jsonb_build_object(
          'createdAt',
          (array_agg(created_at) filter (where position = page_size))[1],
          'id',
          (array_agg(id::text) filter (where position = page_size))[1]
        )
      else null end
    )
    into result
    from numbered;
  else
    with windowed as (
      select event.id, event.created_at,
        jsonb_build_object(
          'id', event.id::text,
          'createdAt', event.created_at,
          'actorEmail', coalesce(actor.email, 'E-mail indisponível'),
          'action', event.action,
          'reason', event.reason,
          'before', event.before_state,
          'after', event.after_state
        ) as item
      from private.admin_user_events as event
      join auth.users as actor on actor.id = event.actor_id
      where event.user_id = p_user_id
        and (
          p_cursor_created_at is null
          or (event.created_at, event.id)
            < (p_cursor_created_at, p_cursor_id::bigint)
        )
      order by event.created_at desc, event.id desc
      limit page_size + 1
    ),
    numbered as (
      select *,
        row_number() over (order by created_at desc, id desc) as position
      from windowed
    )
    select jsonb_build_object(
      'items', coalesce(
        jsonb_agg(item order by created_at desc, id desc)
          filter (where position <= page_size),
        '[]'::jsonb
      ),
      'nextCursor', case when count(*) > page_size then
        jsonb_build_object(
          'createdAt',
          (array_agg(created_at) filter (where position = page_size))[1],
          'id',
          (array_agg(id::text) filter (where position = page_size))[1]
        )
      else null end
    )
    into result
    from numbered;
  end if;

  return result;
end;
$function$;

revoke execute on function public.list_admin_user_items_v1(
  uuid, text, timestamptz, text, integer
)
from public, anon, authenticated, service_role;
grant execute on function public.list_admin_user_items_v1(
  uuid, text, timestamptz, text, integer
) to authenticated;
