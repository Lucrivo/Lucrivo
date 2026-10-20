create or replace function private.has_report_entitlement_for_user(
  p_user_id uuid,
  p_at timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or p_user_id is null or p_at is null then
    return false;
  end if;

  if caller_id <> p_user_id then
    raise exception using
      errcode = '42501',
      message = 'cannot inspect another user entitlement';
  end if;

  if not private.account_is_eligible() then
    return false;
  end if;

  return private.has_paid_access_for_user(p_user_id, p_at)
    or private.is_admin()
    or exists (
      select 1
      from private.admin_user_state as state
      where state.user_id = p_user_id
        and state.courtesy_expires_at > p_at
    );
end;
$function$;

revoke execute on function private.has_report_entitlement_for_user(
  uuid,
  timestamptz
)
from public, anon, authenticated, service_role;

grant execute on function private.has_report_entitlement_for_user(
  uuid,
  timestamptz
)
to authenticated;
