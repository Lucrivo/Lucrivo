create function public.reserve_report_ai_turn_v1(
  p_diagnosis_id bigint,
  p_report_version integer,
  p_request_id uuid,
  p_question text,
  p_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  diagnosis_record public.diagnoses%rowtype;
  reserved_conversation_id bigint;
  turn_id bigint;
  existing_turn public.report_ai_turns%rowtype;
  reservation_time timestamptz := pg_catalog.statement_timestamp();
  minute_reservations bigint;
  month_reservations bigint;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_diagnosis_id is null
    or p_report_version is null
    or p_report_version < 0
    or p_request_id is null
    or p_question is null
    or p_question <> pg_catalog.btrim(p_question)
    or pg_catalog.char_length(p_question) not between 1 and 2000
    or p_model is null
    or p_model <> pg_catalog.btrim(p_model)
    or pg_catalog.char_length(p_model) not between 1 and 100
  then
    raise exception using
      errcode = '22023',
      message = 'invalid report AI reservation';
  end if;

  select diagnosis.*
  into diagnosis_record
  from public.diagnoses as diagnosis
  where diagnosis.id = p_diagnosis_id
    and diagnosis.user_id = caller_id
    and diagnosis.deleted_at is null
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'not_found');
  end if;

  if diagnosis_record.version <> p_report_version then
    return pg_catalog.jsonb_build_object(
      'status', 'version_conflict',
      'currentVersion', diagnosis_record.version
    );
  end if;

  if not private.has_paid_access(reservation_time) then
    return pg_catalog.jsonb_build_object('status', 'plan_required');
  end if;

  insert into public.report_ai_conversations (
    user_id,
    diagnosis_id,
    report_version
  ) values (
    caller_id,
    p_diagnosis_id,
    p_report_version
  )
  on conflict (user_id, diagnosis_id, report_version) do nothing;

  select conversation.id
  into reserved_conversation_id
  from public.report_ai_conversations as conversation
  where conversation.user_id = caller_id
    and conversation.diagnosis_id = p_diagnosis_id
    and conversation.report_version = p_report_version
  for update;

  select turn.*
  into existing_turn
  from public.report_ai_turns as turn
  where turn.user_id = caller_id
    and turn.request_id = p_request_id;

  if found then
    if existing_turn.status = 'pending'
      and existing_turn.created_at < reservation_time - interval '120 seconds'
    then
      update public.report_ai_turns
      set status = 'failed',
          error_code = 'generation_lease_expired',
          completed_at = reservation_time
      where id = existing_turn.id
        and user_id = caller_id
        and status = 'pending';

      return pg_catalog.jsonb_build_object(
        'status', 'existing',
        'conversationId', existing_turn.conversation_id,
        'turnId', existing_turn.id,
        'turnStatus', 'failed',
        'retry', 'new_request'
      );
    end if;

    if existing_turn.status = 'failed'
      and not existing_turn.counts_toward_quota
    then
      update public.report_ai_turns
      set status = 'pending',
          counts_toward_quota = true,
          error_code = null,
          completed_at = null,
          created_at = reservation_time
      where id = existing_turn.id
        and user_id = caller_id
        and status = 'failed'
        and not counts_toward_quota;

      return pg_catalog.jsonb_build_object(
        'status', 'existing',
        'conversationId', existing_turn.conversation_id,
        'turnId', existing_turn.id,
        'turnStatus', 'pending',
        'retry', 'same_request'
      );
    end if;

    if existing_turn.status = 'failed' then
      return pg_catalog.jsonb_build_object(
        'status', 'existing',
        'conversationId', existing_turn.conversation_id,
        'turnId', existing_turn.id,
        'turnStatus', existing_turn.status,
        'retry', 'new_request'
      );
    end if;

    return pg_catalog.jsonb_build_object(
      'status', 'existing',
      'conversationId', existing_turn.conversation_id,
      'turnId', existing_turn.id,
      'turnStatus', existing_turn.status
    );
  end if;

  update public.report_ai_turns as turn
  set status = 'failed',
      error_code = 'generation_lease_expired',
      completed_at = reservation_time
  where turn.conversation_id = reserved_conversation_id
    and turn.user_id = caller_id
    and turn.status = 'pending'
    and turn.created_at < reservation_time - interval '120 seconds';

  if exists (
    select 1
    from public.report_ai_turns as turn
    where turn.conversation_id = reserved_conversation_id
      and turn.user_id = caller_id
      and turn.status = 'pending'
  ) then
    return pg_catalog.jsonb_build_object('status', 'busy');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select count(*)
  into minute_reservations
  from public.report_ai_turns as turn
  where turn.user_id = caller_id
    and turn.counts_toward_quota
    and turn.created_at >= reservation_time - interval '1 minute';

  if minute_reservations >= 10 then
    return pg_catalog.jsonb_build_object('status', 'rate_limited');
  end if;

  select count(*)
  into month_reservations
  from public.report_ai_turns as turn
  where turn.user_id = caller_id
    and turn.counts_toward_quota
    and turn.created_at >= (
      pg_catalog.date_trunc('month', reservation_time at time zone 'UTC')
      at time zone 'UTC'
    );

  if month_reservations >= 100 then
    return pg_catalog.jsonb_build_object('status', 'monthly_limit');
  end if;

  insert into public.report_ai_turns (
    conversation_id,
    user_id,
    request_id,
    question,
    status,
    model,
    created_at
  ) values (
    reserved_conversation_id,
    caller_id,
    p_request_id,
    p_question,
    'pending',
    p_model,
    reservation_time
  )
  returning id into turn_id;

  update public.report_ai_conversations
  set updated_at = reservation_time
  where id = reserved_conversation_id
    and user_id = caller_id;

  return pg_catalog.jsonb_build_object(
    'status', 'reserved',
    'conversationId', reserved_conversation_id,
    'turnId', turn_id
  );
end;
$function$;

create function public.complete_report_ai_turn_v1(
  p_turn_id bigint,
  p_answer text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_output_tokens integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  turn_status text;
  completion_time timestamptz := pg_catalog.statement_timestamp();
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select turn.status
  into turn_status
  from public.report_ai_turns as turn
  where turn.id = p_turn_id
    and turn.user_id = caller_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if turn_status <> 'pending' then
    return 'conflict';
  end if;

  if p_answer is null
    or nullif(pg_catalog.btrim(p_answer), '') is null
    or pg_catalog.char_length(p_answer) > 32000
    or p_input_tokens is null
    or p_input_tokens < 0
    or p_cached_input_tokens is null
    or p_cached_input_tokens < 0
    or p_output_tokens is null
    or p_output_tokens < 0
  then
    raise exception using
      errcode = '22023',
      message = 'invalid completed turn';
  end if;

  update public.report_ai_turns
  set answer = p_answer,
      status = 'completed',
      input_tokens = p_input_tokens,
      cached_input_tokens = p_cached_input_tokens,
      output_tokens = p_output_tokens,
      completed_at = completion_time
  where id = p_turn_id
    and user_id = caller_id
    and status = 'pending';

  return 'completed';
end;
$function$;

create function public.fail_report_ai_turn_v1(
  p_turn_id bigint,
  p_error_code text,
  p_counts_toward_quota boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  turn_status text;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select turn.status
  into turn_status
  from public.report_ai_turns as turn
  where turn.id = p_turn_id
    and turn.user_id = caller_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if turn_status <> 'pending' then
    return 'conflict';
  end if;

  if p_error_code is null
    or p_error_code not in (
      'provider_rejected',
      'provider_timeout',
      'provider_unavailable',
      'client_disconnected',
      'persistence_failed',
      'generation_lease_expired'
    )
    or p_counts_toward_quota is null
  then
    raise exception using
      errcode = '22023',
      message = 'invalid failed turn';
  end if;

  update public.report_ai_turns
  set status = 'failed',
      counts_toward_quota = p_counts_toward_quota,
      error_code = p_error_code,
      completed_at = pg_catalog.statement_timestamp()
  where id = p_turn_id
    and user_id = caller_id
    and status = 'pending';

  return 'failed';
end;
$function$;

create function public.update_report_ai_summary_v1(
  p_conversation_id bigint,
  p_summary text,
  p_summary_through_turn bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  current_summary_through_turn bigint;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  select conversation.summary_through_turn
  into current_summary_through_turn
  from public.report_ai_conversations as conversation
  where conversation.id = p_conversation_id
    and conversation.user_id = caller_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if p_summary is null
    or pg_catalog.char_length(p_summary) > 12000
    or p_summary_through_turn is null
  then
    raise exception using
      errcode = '22023',
      message = 'invalid report AI summary';
  end if;

  if current_summary_through_turn is not null
    and p_summary_through_turn <= current_summary_through_turn
  then
    return 'conflict';
  end if;

  if not exists (
    select 1
    from public.report_ai_turns as turn
    where turn.id = p_summary_through_turn
      and turn.conversation_id = p_conversation_id
      and turn.user_id = caller_id
      and turn.status = 'completed'
  ) then
    return 'conflict';
  end if;

  update public.report_ai_conversations
  set summary = p_summary,
      summary_through_turn = p_summary_through_turn,
      updated_at = pg_catalog.statement_timestamp()
  where id = p_conversation_id
    and user_id = caller_id;

  return 'updated';
end;
$function$;

revoke execute on function public.reserve_report_ai_turn_v1(
  bigint,
  integer,
  uuid,
  text,
  text
)
from public, anon, authenticated, service_role;
revoke execute on function public.complete_report_ai_turn_v1(
  bigint,
  text,
  integer,
  integer,
  integer
)
from public, anon, authenticated, service_role;
revoke execute on function public.fail_report_ai_turn_v1(
  bigint,
  text,
  boolean
)
from public, anon, authenticated, service_role;
revoke execute on function public.update_report_ai_summary_v1(
  bigint,
  text,
  bigint
)
from public, anon, authenticated, service_role;

grant execute on function public.reserve_report_ai_turn_v1(
  bigint,
  integer,
  uuid,
  text,
  text
)
to authenticated;
grant execute on function public.complete_report_ai_turn_v1(
  bigint,
  text,
  integer,
  integer,
  integer
)
to authenticated;
grant execute on function public.fail_report_ai_turn_v1(
  bigint,
  text,
  boolean
)
to authenticated;
grant execute on function public.update_report_ai_summary_v1(
  bigint,
  text,
  bigint
)
to authenticated;
