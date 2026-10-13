create table private.whatsapp_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null,
  copy_version text not null,
  source text not null,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint whatsapp_consent_events_decision_check
    check (decision in ('granted', 'declined', 'revoked')),
  constraint whatsapp_consent_events_copy_version_check
    check (pg_catalog.char_length(copy_version) between 1 and 64),
  constraint whatsapp_consent_events_source_check
    check (source in ('onboarding', 'account'))
);

create index whatsapp_consent_events_user_created_idx
on private.whatsapp_consent_events (user_id, created_at desc, id desc);

alter table private.whatsapp_consent_events enable row level security;

revoke all on table private.whatsapp_consent_events
from public, anon, authenticated, service_role;
revoke all on sequence private.whatsapp_consent_events_id_seq
from public, anon, authenticated, service_role;

create function private.reject_whatsapp_consent_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if session_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'WhatsApp consent history is append-only';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

create trigger whatsapp_consent_events_reject_mutation
before update or delete on private.whatsapp_consent_events
for each row execute function private.reject_whatsapp_consent_event_mutation();

revoke execute on function private.reject_whatsapp_consent_event_mutation()
from public, anon, authenticated, service_role;

create function public.save_onboarding_profile_v1(
  p_full_name text,
  p_whatsapp_e164 text,
  p_segment_id bigint,
  p_subcategory_id bigint,
  p_custom_subcategory text,
  p_whatsapp_marketing_consent boolean,
  p_consent_copy_version text,
  p_expected_version integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  normalized_full_name text;
  normalized_custom_subcategory text;
  existing_profile public.onboarding_profiles%rowtype;
  has_existing_profile boolean := false;
  segment_active boolean;
  subcategory_active boolean;
  selection_unchanged boolean := false;
  saved_at timestamptz := pg_catalog.statement_timestamp();
  saved_version integer;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  normalized_full_name := pg_catalog.regexp_replace(
    pg_catalog.btrim(p_full_name),
    '[[:space:]]+',
    ' ',
    'g'
  );
  normalized_custom_subcategory := case
    when p_custom_subcategory is null then null
    else pg_catalog.regexp_replace(
      pg_catalog.btrim(p_custom_subcategory),
      '[[:space:]]+',
      ' ',
      'g'
    )
  end;

  if normalized_full_name is null
    or pg_catalog.char_length(normalized_full_name) not between 2 and 120
    or p_whatsapp_e164 is null
    or p_whatsapp_e164 !~ '^\+[1-9][0-9]{7,14}$'
    or p_segment_id is null
    or p_segment_id <= 0
    or p_whatsapp_marketing_consent is null
    or p_consent_copy_version is null
    or pg_catalog.char_length(p_consent_copy_version) not between 1 and 64
    or p_consent_copy_version <> 'whatsapp-marketing-v1'
    or (p_expected_version is not null and p_expected_version < 0)
    or (
      p_subcategory_id is null
      and normalized_custom_subcategory is null
    )
    or (
      p_subcategory_id is not null
      and normalized_custom_subcategory is not null
    )
    or (p_subcategory_id is not null and p_subcategory_id <= 0)
    or (
      normalized_custom_subcategory is not null
      and pg_catalog.char_length(normalized_custom_subcategory) not between 2 and 80
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid onboarding profile input';
  end if;

  select profile.*
  into existing_profile
  from public.onboarding_profiles as profile
  where profile.user_id = caller_id
  for update;

  has_existing_profile := found;

  if has_existing_profile then
    if p_expected_version is distinct from existing_profile.version then
      return pg_catalog.jsonb_build_object('status', 'conflict');
    end if;

    selection_unchanged :=
      existing_profile.segment_id = p_segment_id
      and existing_profile.subcategory_id is not distinct from p_subcategory_id
      and existing_profile.custom_subcategory
        is not distinct from normalized_custom_subcategory;
  elsif p_expected_version is not null then
    return pg_catalog.jsonb_build_object('status', 'conflict');
  end if;

  select segment.is_active
  into segment_active
  from public.business_segments as segment
  where segment.id = p_segment_id;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'catalog_inactive');
  end if;

  if p_subcategory_id is not null then
    select subcategory.is_active
    into subcategory_active
    from public.business_subcategories as subcategory
    where subcategory.id = p_subcategory_id
      and subcategory.segment_id = p_segment_id;

    if not found then
      return pg_catalog.jsonb_build_object('status', 'catalog_inactive');
    end if;
  end if;

  if not selection_unchanged
    and (
      not segment_active
      or (
        p_subcategory_id is not null
        and not subcategory_active
      )
    )
  then
    return pg_catalog.jsonb_build_object('status', 'catalog_inactive');
  end if;

  if not has_existing_profile then
    insert into public.onboarding_profiles (
      user_id,
      full_name,
      whatsapp_e164,
      segment_id,
      subcategory_id,
      custom_subcategory,
      whatsapp_marketing_consent,
      marketing_consent_granted_at,
      completed_at,
      updated_at,
      version
    ) values (
      caller_id,
      normalized_full_name,
      p_whatsapp_e164,
      p_segment_id,
      p_subcategory_id,
      normalized_custom_subcategory,
      p_whatsapp_marketing_consent,
      case when p_whatsapp_marketing_consent then saved_at else null end,
      saved_at,
      saved_at,
      0
    );

    insert into private.whatsapp_consent_events (
      user_id,
      decision,
      copy_version,
      source,
      created_at
    ) values (
      caller_id,
      case when p_whatsapp_marketing_consent then 'granted' else 'declined' end,
      p_consent_copy_version,
      'onboarding',
      saved_at
    );

    saved_version := 0;
  else
    saved_version := existing_profile.version + 1;

    update public.onboarding_profiles
    set
      full_name = normalized_full_name,
      whatsapp_e164 = p_whatsapp_e164,
      segment_id = p_segment_id,
      subcategory_id = p_subcategory_id,
      custom_subcategory = normalized_custom_subcategory,
      whatsapp_marketing_consent = p_whatsapp_marketing_consent,
      marketing_consent_granted_at = case
        when p_whatsapp_marketing_consent
          = existing_profile.whatsapp_marketing_consent
          then existing_profile.marketing_consent_granted_at
        when p_whatsapp_marketing_consent then saved_at
        else null
      end,
      updated_at = saved_at,
      version = saved_version
    where user_id = caller_id;

    if p_whatsapp_marketing_consent
      is distinct from existing_profile.whatsapp_marketing_consent
    then
      insert into private.whatsapp_consent_events (
        user_id,
        decision,
        copy_version,
        source,
        created_at
      ) values (
        caller_id,
        case when p_whatsapp_marketing_consent then 'granted' else 'revoked' end,
        p_consent_copy_version,
        'account',
        saved_at
      );
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'saved',
    'version', saved_version
  );
end;
$function$;

revoke execute on function public.save_onboarding_profile_v1(
  text, text, bigint, bigint, text, boolean, text, integer
) from public, anon, authenticated, service_role;

grant execute on function public.save_onboarding_profile_v1(
  text, text, bigint, bigint, text, boolean, text, integer
) to authenticated;
