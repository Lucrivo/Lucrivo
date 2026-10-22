create or replace function public.change_admin_user_v2(
  p_user_id uuid,
  p_action text,
  p_reason text,
  p_courtesy_duration_days integer,
  p_courtesy_expires_at timestamptz,
  p_expected_version bigint
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  administrator_id uuid;
  actor_id uuid := (select auth.uid());
  current_state private.admin_user_state%rowtype;
  next_blocked_at timestamptz;
  next_deleted_at timestamptz;
  next_courtesy_expires_at timestamptz;
  change_at timestamptz := clock_timestamp();
  before_payload jsonb;
  after_payload jsonb;
  next_version bigint;
begin
  if not coalesce((select private.has_admin_access()), false) then
    raise exception using errcode = '42501',
      message = 'administrator access required';
  end if;

  if p_user_id is null
    or p_action is null
    or p_action not in (
      'courtesy_granted', 'courtesy_ended', 'blocked', 'unblocked',
      'soft_deleted', 'restored'
    )
    or p_reason is null
    or length(btrim(p_reason)) not between 1 and 500
    or p_expected_version is null
    or p_expected_version < 0
  then
    raise exception using errcode = '22023',
      message = 'invalid administrative user change';
  end if;

  if p_action = 'courtesy_granted' then
    if (p_courtesy_duration_days is null) = (p_courtesy_expires_at is null)
      or (
        p_courtesy_duration_days is not null
        and p_courtesy_duration_days not in (1, 7, 30)
      )
    then
      raise exception using errcode = '22023',
        message = 'invalid administrative user change';
    end if;

    next_courtesy_expires_at := coalesce(
      change_at + pg_catalog.make_interval(days => p_courtesy_duration_days),
      p_courtesy_expires_at
    );
    if next_courtesy_expires_at <= change_at then
      raise exception using errcode = '22023',
        message = 'invalid administrative user change';
    end if;
  else
    if p_courtesy_duration_days is not null
      or p_courtesy_expires_at is not null
    then
      raise exception using errcode = '22023',
        message = 'invalid administrative user change';
    end if;
  end if;

  select administrator.user_id into strict administrator_id
  from private.app_administrator as administrator
  where administrator.singleton = 1;

  if p_user_id = administrator_id then
    return jsonb_build_object('status', 'not_found');
  end if;

  perform 1 from auth.users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  insert into private.admin_user_state (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into strict current_state
  from private.admin_user_state
  where user_id = p_user_id
  for update;

  if current_state.version <> p_expected_version then
    return jsonb_build_object(
      'status', 'conflict',
      'version', current_state.version
    );
  end if;

  if p_action in ('blocked', 'soft_deleted') and exists (
    select 1 from public.billing_contracts as contract
    where contract.user_id = p_user_id
      and contract.status in ('active', 'cancel_at_period_end')
      and contract.access_starts_at <= change_at
      and contract.access_ends_at > change_at
  ) then
    return jsonb_build_object(
      'status', 'paid_conflict',
      'version', current_state.version
    );
  end if;

  next_blocked_at := current_state.blocked_at;
  next_deleted_at := current_state.deleted_at;
  if p_action <> 'courtesy_granted' then
    next_courtesy_expires_at := current_state.courtesy_expires_at;
  end if;

  case p_action
    when 'courtesy_granted' then
      if current_state.deleted_at is not null
        or current_state.blocked_at is not null
        or current_state.courtesy_expires_at is not distinct from next_courtesy_expires_at
      then
        return jsonb_build_object(
          'status', 'conflict',
          'version', current_state.version
        );
      end if;
    when 'courtesy_ended' then
      if current_state.courtesy_expires_at is null then
        return jsonb_build_object(
          'status', 'conflict',
          'version', current_state.version
        );
      end if;
      next_courtesy_expires_at := null;
    when 'blocked' then
      if current_state.blocked_at is not null
        or current_state.deleted_at is not null
      then
        return jsonb_build_object(
          'status', 'conflict',
          'version', current_state.version
        );
      end if;
      next_blocked_at := change_at;
    when 'unblocked' then
      if current_state.blocked_at is null
        or current_state.deleted_at is not null
      then
        return jsonb_build_object(
          'status', 'conflict',
          'version', current_state.version
        );
      end if;
      next_blocked_at := null;
    when 'soft_deleted' then
      if current_state.deleted_at is not null then
        return jsonb_build_object(
          'status', 'conflict',
          'version', current_state.version
        );
      end if;
      next_deleted_at := change_at;
    when 'restored' then
      if current_state.deleted_at is null then
        return jsonb_build_object(
          'status', 'conflict',
          'version', current_state.version
        );
      end if;
      next_deleted_at := null;
  end case;

  before_payload := jsonb_build_object(
    'blockedAt', current_state.blocked_at,
    'deletedAt', current_state.deleted_at,
    'courtesyExpiresAt', current_state.courtesy_expires_at
  );
  after_payload := jsonb_build_object(
    'blockedAt', next_blocked_at,
    'deletedAt', next_deleted_at,
    'courtesyExpiresAt', next_courtesy_expires_at
  );
  next_version := current_state.version + 1;

  update private.admin_user_state
  set blocked_at = next_blocked_at,
      deleted_at = next_deleted_at,
      courtesy_expires_at = next_courtesy_expires_at,
      version = next_version,
      updated_at = change_at
  where user_id = p_user_id;

  insert into private.admin_user_events (
    user_id, actor_id, action, reason, before_state, after_state
  ) values (
    p_user_id, actor_id, p_action, btrim(p_reason), before_payload, after_payload
  );

  return jsonb_build_object(
    'status', 'updated',
    'version', next_version,
    'state', after_payload
  );
end;
$function$;

revoke execute on function public.change_admin_user_v2(
  uuid, text, text, integer, timestamptz, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.change_admin_user_v2(
  uuid, text, text, integer, timestamptz, bigint
) to authenticated;

revoke execute on function public.change_admin_user_v1(
  uuid, text, text, timestamptz, bigint
) from authenticated;
