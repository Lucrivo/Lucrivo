create table private.legal_acceptance_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  copy_version text not null,
  source text not null,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint legal_acceptance_events_copy_version_check
    check (pg_catalog.char_length(copy_version) between 1 and 64),
  constraint legal_acceptance_events_source_check
    check (source in ('signup', 'gate'))
);

create unique index legal_acceptance_events_user_version_uidx
on private.legal_acceptance_events (user_id, copy_version);

alter table private.legal_acceptance_events enable row level security;

revoke all on table private.legal_acceptance_events
from public, anon, authenticated, service_role;
revoke all on sequence private.legal_acceptance_events_id_seq
from public, anon, authenticated, service_role;

create function private.reject_legal_acceptance_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if session_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'legal acceptance history is append-only';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

create trigger legal_acceptance_events_reject_mutation
before update or delete on private.legal_acceptance_events
for each row execute function private.reject_legal_acceptance_event_mutation();

revoke execute on function private.reject_legal_acceptance_event_mutation()
from public, anon, authenticated, service_role;

create function public.record_signup_legal_acceptance_v1(
  p_user_id uuid,
  p_copy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_user_id is null
    or p_copy_version is null
    or pg_catalog.char_length(p_copy_version) not between 1 and 64
  then
    raise exception using
      errcode = '22023',
      message = 'invalid legal acceptance';
  end if;

  begin
    insert into private.legal_acceptance_events (user_id, copy_version, source)
    values (p_user_id, p_copy_version, 'signup');
  exception
    when unique_violation then
      null;
  end;

  return pg_catalog.jsonb_build_object('status', 'recorded');
end;
$function$;

create function public.accept_current_legal_terms_v1(p_copy_version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'a session is required to accept legal terms';
  end if;

  if p_copy_version is null
    or pg_catalog.char_length(p_copy_version) not between 1 and 64
  then
    raise exception using
      errcode = '22023',
      message = 'invalid legal acceptance';
  end if;

  begin
    insert into private.legal_acceptance_events (user_id, copy_version, source)
    values (caller_id, p_copy_version, 'gate');
  exception
    when unique_violation then
      null;
  end;

  return pg_catalog.jsonb_build_object('status', 'recorded');
end;
$function$;

create function public.current_user_has_accepted_legal_copy_v1(
  p_copy_version text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'a session is required to read legal acceptance';
  end if;

  return exists (
    select 1
    from private.legal_acceptance_events as event
    where event.user_id = caller_id
      and event.copy_version = p_copy_version
  );
end;
$function$;

revoke execute on function public.record_signup_legal_acceptance_v1(uuid, text)
from public, anon, authenticated;
revoke execute on function public.accept_current_legal_terms_v1(text)
from public, anon, authenticated;
revoke execute on function public.current_user_has_accepted_legal_copy_v1(text)
from public, anon, authenticated;

grant execute on function public.record_signup_legal_acceptance_v1(uuid, text)
to service_role;
grant execute on function public.accept_current_legal_terms_v1(text)
to authenticated;
grant execute on function public.current_user_has_accepted_legal_copy_v1(text)
to authenticated;
