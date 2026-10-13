create function private.current_courtesy_access_expires_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $function$
  select state.courtesy_expires_at
  from private.admin_user_state as state
  where state.user_id = (select auth.uid())
    and state.blocked_at is null
    and state.deleted_at is null
    and state.courtesy_expires_at > statement_timestamp();
$function$;

revoke execute on function private.current_courtesy_access_expires_at()
from public, anon, authenticated, service_role;

grant execute on function private.current_courtesy_access_expires_at()
to authenticated;

create function public.current_courtesy_access_expires_at()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.current_courtesy_access_expires_at();
$function$;

revoke execute on function public.current_courtesy_access_expires_at()
from public, anon, authenticated, service_role;

grant execute on function public.current_courtesy_access_expires_at()
to authenticated;
