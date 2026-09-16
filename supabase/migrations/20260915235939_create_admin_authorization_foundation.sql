create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table private.app_administrator (
  singleton smallint primary key default 1,
  user_id uuid not null unique references auth.users (id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  constraint app_administrator_singleton_check check (singleton = 1)
);

alter table private.app_administrator enable row level security;

revoke all on table private.app_administrator
from public, anon, authenticated, service_role;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from private.app_administrator as administrator
      where administrator.user_id = (select auth.uid())
    );
$function$;

create function private.has_admin_access()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    (select private.is_admin())
    and coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$function$;

create function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.is_admin();
$function$;

revoke execute on function private.is_admin()
from public, anon, authenticated, service_role;
revoke execute on function private.has_admin_access()
from public, anon, authenticated, service_role;
revoke execute on function public.current_user_is_admin()
from public, anon, authenticated, service_role;

grant execute on function private.is_admin()
to authenticated;
grant execute on function private.has_admin_access()
to authenticated;
grant execute on function public.current_user_is_admin()
to authenticated;
