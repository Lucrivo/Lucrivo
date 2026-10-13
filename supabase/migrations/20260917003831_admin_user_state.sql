create table private.admin_user_state (
  user_id uuid primary key references auth.users (id) on delete restrict,
  blocked_at timestamptz,
  deleted_at timestamptz,
  courtesy_expires_at timestamptz,
  version bigint not null default 0,
  updated_at timestamptz not null default statement_timestamp(),
  constraint admin_user_state_version_check check (version >= 0)
);

alter table private.admin_user_state enable row level security;

revoke all on table private.admin_user_state
from public, anon, authenticated, service_role;

create table private.admin_user_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  actor_id uuid not null references auth.users (id) on delete restrict,
  action text not null,
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint admin_user_events_action_check check (
    action in (
      'courtesy_granted',
      'courtesy_ended',
      'blocked',
      'unblocked',
      'soft_deleted',
      'restored'
    )
  ),
  constraint admin_user_events_reason_check check (
    length(btrim(reason)) between 1 and 500
  ),
  constraint admin_user_events_before_object_check check (
    jsonb_typeof(before_state) = 'object'
  ),
  constraint admin_user_events_after_object_check check (
    jsonb_typeof(after_state) = 'object'
  )
);

create index admin_user_events_user_created_idx
on private.admin_user_events (user_id, created_at desc, id desc);

create index admin_user_events_actor_idx
on private.admin_user_events (actor_id);

alter table private.admin_user_events enable row level security;

revoke all on table private.admin_user_events
from public, anon, authenticated, service_role;
revoke all on sequence private.admin_user_events_id_seq
from public, anon, authenticated, service_role;

create function private.reject_admin_user_event_changes()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception using
    errcode = 'P0001',
    message = 'admin user events are append-only';
end;
$function$;

revoke execute on function private.reject_admin_user_event_changes()
from public, anon, authenticated, service_role;

create trigger admin_user_events_reject_changes
before update or delete or truncate on private.admin_user_events
for each statement
execute function private.reject_admin_user_event_changes();

create function private.account_is_eligible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    (select auth.uid()) is not null
    and not exists (
      select 1
      from private.admin_user_state as state
      where state.user_id = (select auth.uid())
        and (
          state.blocked_at is not null
          or state.deleted_at is not null
        )
    );
$function$;

revoke execute on function private.account_is_eligible()
from public, anon, authenticated, service_role;

grant execute on function private.account_is_eligible()
to authenticated;
