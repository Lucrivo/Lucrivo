alter table public.diagnoses
add column updated_at timestamptz,
add column deleted_at timestamptz,
add column version integer not null default 0;

update public.diagnoses
set updated_at = created_at
where updated_at is null;

alter table public.diagnoses
alter column updated_at set not null,
alter column updated_at set default statement_timestamp(),
add constraint diagnoses_version_check check (version >= 0),
add constraint diagnoses_deleted_after_creation_check check (
  deleted_at is null or deleted_at >= created_at
);

drop index public.diagnoses_user_created_id_idx;

create index diagnoses_user_active_created_id_idx
on public.diagnoses (user_id, created_at desc, id desc)
where deleted_at is null;

create index billing_contracts_user_access_interval_idx
on public.billing_contracts (user_id, access_starts_at, access_ends_at)
where access_starts_at is not null and access_ends_at is not null;

create or replace function private.can_read_diagnosis(p_diagnosis_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null
    or p_diagnosis_id is null
    or not private.account_is_eligible()
  then
    return false;
  end if;

  return exists (
    select 1
    from public.diagnoses as diagnosis
    where diagnosis.id = p_diagnosis_id
      and diagnosis.user_id = caller_id
      and diagnosis.deleted_at is null
      and (
        diagnosis.is_free_report
        or exists (
          select 1
          from public.billing_contracts as contract
          where contract.user_id = caller_id
            and contract.access_starts_at <= diagnosis.created_at
            and contract.access_ends_at > diagnosis.created_at
        )
      )
  );
end;
$function$;

drop policy detailed_diagnoses_select_own
on public.detailed_diagnoses;
create policy detailed_diagnoses_select_own
on public.detailed_diagnoses
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.can_read_diagnosis(diagnosis_id)
);

drop policy detailed_diagnosis_items_select_own
on public.detailed_diagnosis_items;
create policy detailed_diagnosis_items_select_own
on public.detailed_diagnosis_items
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.can_read_diagnosis(diagnosis_id)
);

drop policy detailed_diagnosis_ingredients_select_own
on public.detailed_diagnosis_ingredients;
create policy detailed_diagnosis_ingredients_select_own
on public.detailed_diagnosis_ingredients
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.can_read_diagnosis(diagnosis_id)
);

create function private.soft_delete_owned_diagnosis_v1_impl(
  p_diagnosis_id bigint,
  p_expected_version integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  diagnosis_record public.diagnoses%rowtype;
begin
  if caller_id is null or not private.account_is_eligible() then
    raise exception using errcode = '42501', message = 'account unavailable';
  end if;

  if p_diagnosis_id is null or p_expected_version is null then
    raise exception using errcode = '22023', message = 'invalid report deletion';
  end if;

  select diagnosis.*
  into diagnosis_record
  from public.diagnoses as diagnosis
  where diagnosis.id = p_diagnosis_id
    and diagnosis.user_id = caller_id
  for update;

  if not found or diagnosis_record.deleted_at is not null then
    return 'not_found';
  end if;

  if diagnosis_record.version <> p_expected_version then
    return 'conflict';
  end if;

  update public.diagnoses
  set deleted_at = pg_catalog.statement_timestamp(),
      updated_at = pg_catalog.statement_timestamp(),
      version = version + 1
  where id = p_diagnosis_id
    and user_id = caller_id
    and deleted_at is null
    and version = p_expected_version;

  return 'deleted';
end;
$function$;

create function public.soft_delete_owned_diagnosis_v1(
  p_diagnosis_id bigint,
  p_expected_version integer
)
returns text
language sql
security invoker
set search_path = ''
as $function$
  select private.soft_delete_owned_diagnosis_v1_impl(
    p_diagnosis_id,
    p_expected_version
  );
$function$;

revoke execute on function private.soft_delete_owned_diagnosis_v1_impl(
  bigint,
  integer
)
from public, anon, authenticated, service_role;

grant execute on function private.soft_delete_owned_diagnosis_v1_impl(
  bigint,
  integer
)
to authenticated;

revoke execute on function public.soft_delete_owned_diagnosis_v1(
  bigint,
  integer
)
from public, anon, service_role;

grant execute on function public.soft_delete_owned_diagnosis_v1(
  bigint,
  integer
)
to authenticated;
