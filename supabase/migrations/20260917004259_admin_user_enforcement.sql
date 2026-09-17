create function public.current_account_is_eligible()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.account_is_eligible();
$function$;

revoke execute on function public.current_account_is_eligible()
from public, anon, authenticated, service_role;

grant execute on function public.current_account_is_eligible()
to authenticated;

create function private.has_report_entitlement_for_user(
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
      and (
        diagnosis.is_free_report
        or private.has_report_entitlement_for_user(
          caller_id,
          pg_catalog.statement_timestamp()
        )
      )
  );
end;
$function$;

create function private.reject_ineligible_diagnosis_insert()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if (select auth.uid()) is not null
    and not private.account_is_eligible()
  then
    raise exception using
      errcode = '42501',
      message = 'account unavailable';
  end if;

  return new;
end;
$function$;

revoke execute on function private.reject_ineligible_diagnosis_insert()
from public, anon, authenticated, service_role;

create trigger diagnoses_reject_ineligible_insert
before insert on public.diagnoses
for each row
execute function private.reject_ineligible_diagnosis_insert();

-- Existing report implementations are long validated calculation functions.
-- Preserve their exact bodies and change only the two authorization sites.
do $migration$
declare
  function_name text;
  definition text;
  function_oid oid;
  paid_reference constant text := 'private.has_paid_access_for_user';
  eligibility_reference constant text := 'if caller_id is null then';
begin
  foreach function_name in array array[
    'create_service_diagnosis_report_v4_impl',
    'create_product_diagnosis_report_impl',
    'create_product_diagnosis_report_v2_impl',
    'create_production_diagnosis_report_impl',
    'create_production_diagnosis_report_v2_impl'
  ] loop
    select routine.oid, pg_catalog.pg_get_functiondef(routine.oid)
    into function_oid, definition
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = routine.pronamespace
    where namespace.nspname = 'private'
      and routine.proname = function_name
      and routine.prokind = 'f';

    if function_oid is null
      or (
        length(definition) - length(replace(definition, paid_reference, ''))
      ) / length(paid_reference) <> 1
      or (
        length(definition)
        - length(replace(definition, eligibility_reference, ''))
      ) / length(eligibility_reference) <> 1
    then
      raise exception 'unexpected report function shape: %', function_name;
    end if;

    execute replace(
      replace(
        definition,
        paid_reference,
        'private.has_report_entitlement_for_user'
      ),
      eligibility_reference,
      'if caller_id is null or not private.account_is_eligible() then'
    );
  end loop;
end;
$migration$;

drop policy billing_contracts_select_own on public.billing_contracts;
create policy billing_contracts_select_own
on public.billing_contracts
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and (select private.account_is_eligible())
);

drop policy billing_payments_select_own on public.billing_payments;
create policy billing_payments_select_own
on public.billing_payments
for select
to authenticated
using (
  (select private.account_is_eligible())
  and exists (
    select 1
    from public.billing_contracts as contract
    where contract.id = billing_payments.contract_id
      and contract.user_id = (select auth.uid())
  )
);
