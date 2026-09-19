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

create function private.replace_owned_diagnosis_from_staged_v1_impl(
  p_target_id bigint,
  p_staged_id bigint,
  p_expected_version integer
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  target public.diagnoses%rowtype;
  staged public.diagnoses%rowtype;
  locked_id bigint;
begin
  if caller_id is null or not private.account_is_eligible() then
    raise exception using errcode = '42501', message = 'account unavailable';
  end if;

  if not private.has_paid_access_for_user(
    caller_id,
    pg_catalog.statement_timestamp()
  ) then
    raise exception using errcode = '42501', message = 'paid access required';
  end if;

  if p_target_id is null
    or p_staged_id is null
    or p_target_id = p_staged_id
    or p_expected_version is null
  then
    raise exception using errcode = '22023', message = 'invalid report replacement';
  end if;

  for locked_id in
    select diagnosis.id
    from public.diagnoses as diagnosis
    where diagnosis.id in (p_target_id, p_staged_id)
    order by diagnosis.id
    for update
  loop
    null;
  end loop;

  select diagnosis.* into target
  from public.diagnoses as diagnosis
  where diagnosis.id = p_target_id
    and diagnosis.user_id = caller_id;

  select diagnosis.* into staged
  from public.diagnoses as diagnosis
  where diagnosis.id = p_staged_id
    and diagnosis.user_id = caller_id;

  if target.id is null
    or staged.id is null
    or target.deleted_at is not null
    or staged.deleted_at is not null
  then
    raise exception using errcode = '22023', message = 'report not found';
  end if;

  if target.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'report version conflict';
  end if;

  if target.business_category <> staged.business_category
    or target.analysis_mode <> staged.analysis_mode
  then
    raise exception using errcode = '22023', message = 'report kind mismatch';
  end if;

  if target.analysis_mode = 'quick' and target.business_category = 'service' then
    delete from public.service_diagnoses where diagnosis_id = p_target_id;
    update public.service_diagnoses
    set diagnosis_id = p_target_id
    where diagnosis_id = p_staged_id;
  elsif target.analysis_mode = 'quick' and target.business_category = 'product' then
    delete from public.product_diagnoses where diagnosis_id = p_target_id;
    update public.product_diagnoses
    set diagnosis_id = p_target_id
    where diagnosis_id = p_staged_id;
  elsif target.analysis_mode = 'quick' and target.business_category = 'production' then
    delete from public.production_diagnoses where diagnosis_id = p_target_id;
    update public.production_diagnoses
    set diagnosis_id = p_target_id
    where diagnosis_id = p_staged_id;
  elsif target.analysis_mode = 'detailed' then
    delete from public.detailed_diagnosis_ingredients
    where diagnosis_id = p_target_id;
    delete from public.detailed_diagnosis_items
    where diagnosis_id = p_target_id;
    delete from public.detailed_diagnoses
    where diagnosis_id = p_target_id;

    insert into public.detailed_diagnoses (
      diagnosis_id, submission_id, user_id, category,
      fixed_monthly_expenses_cents, pro_labore_included, pro_labore_cents,
      tax_rate_basis_points, card_fee_rate_basis_points,
      promotion_margin_basis_points, item_count
    )
    select
      p_target_id, submission_id, user_id, category,
      fixed_monthly_expenses_cents, pro_labore_included, pro_labore_cents,
      tax_rate_basis_points, card_fee_rate_basis_points,
      promotion_margin_basis_points, item_count
    from public.detailed_diagnoses
    where diagnosis_id = p_staged_id;

    insert into public.detailed_diagnosis_items (
      diagnosis_id, submission_id, user_id, client_item_id, position, name,
      kind, cost_mode, unit_sale_price_cents, monthly_sales_volume,
      purchase_unit_cost_cents, packaging_unit_cost_cents,
      production_unit_cost_cents, recipe_yield, loss_rate_basis_points,
      direct_labor_unit_cost_cents, other_variable_unit_cost_cents,
      variable_unit_cost_cents, fee_amount_cents, net_unit_revenue_cents,
      unit_contribution_cents, contribution_margin_basis_points,
      monthly_gross_revenue_cents, monthly_contribution_cents,
      break_even_unit_price_cents, promotion_floor_cents, direct_loss
    )
    select
      p_target_id, submission_id, user_id, client_item_id, position, name,
      kind, cost_mode, unit_sale_price_cents, monthly_sales_volume,
      purchase_unit_cost_cents, packaging_unit_cost_cents,
      production_unit_cost_cents, recipe_yield, loss_rate_basis_points,
      direct_labor_unit_cost_cents, other_variable_unit_cost_cents,
      variable_unit_cost_cents, fee_amount_cents, net_unit_revenue_cents,
      unit_contribution_cents, contribution_margin_basis_points,
      monthly_gross_revenue_cents, monthly_contribution_cents,
      break_even_unit_price_cents, promotion_floor_cents, direct_loss
    from public.detailed_diagnosis_items
    where diagnosis_id = p_staged_id
    order by position;

    insert into public.detailed_diagnosis_ingredients (
      diagnosis_id, submission_id, user_id, client_item_id,
      client_ingredient_id, position, name, quantity_millionths,
      unit, unit_cost_ten_thousandths
    )
    select
      p_target_id, submission_id, user_id, client_item_id,
      client_ingredient_id, position, name, quantity_millionths,
      unit, unit_cost_ten_thousandths
    from public.detailed_diagnosis_ingredients
    where diagnosis_id = p_staged_id
    order by client_item_id, position;
  else
    raise exception using errcode = '22023', message = 'unsupported report kind';
  end if;

  delete from public.detailed_diagnosis_ingredients
  where diagnosis_id = p_staged_id;
  delete from public.detailed_diagnosis_items
  where diagnosis_id = p_staged_id;
  delete from public.detailed_diagnoses
  where diagnosis_id = p_staged_id;
  delete from public.service_diagnoses
  where diagnosis_id = p_staged_id;
  delete from public.product_diagnoses
  where diagnosis_id = p_staged_id;
  delete from public.production_diagnoses
  where diagnosis_id = p_staged_id;
  delete from public.diagnoses
  where id = p_staged_id and user_id = caller_id;

  update public.diagnoses
  set submission_id = staged.submission_id,
      business_category = staged.business_category,
      scenario = staged.scenario,
      schema_version = staged.schema_version,
      calculation_version = staged.calculation_version,
      content_version = staged.content_version,
      current_price_cents = staged.current_price_cents,
      real_margin_basis_points = staged.real_margin_basis_points,
      unit_profit_cents = staged.unit_profit_cents,
      verdict = staged.verdict,
      priority = staged.priority,
      unit = staged.unit,
      report_snapshot = staged.report_snapshot,
      analysis_mode = staged.analysis_mode,
      monthly_gross_revenue_cents = staged.monthly_gross_revenue_cents,
      monthly_result_cents = staged.monthly_result_cents,
      item_count = staged.item_count,
      is_partial = staged.is_partial,
      updated_at = pg_catalog.statement_timestamp(),
      version = target.version + 1
  where id = p_target_id
    and user_id = caller_id
    and version = p_expected_version
    and deleted_at is null;

  if not found then
    raise exception using errcode = '40001', message = 'report version conflict';
  end if;

  return p_target_id;
end;
$function$;

create function public.replace_owned_diagnosis_from_staged_v1(
  p_target_id bigint,
  p_staged_id bigint,
  p_expected_version integer
)
returns bigint
language sql
security invoker
set search_path = ''
as $function$
  select private.replace_owned_diagnosis_from_staged_v1_impl(
    p_target_id,
    p_staged_id,
    p_expected_version
  );
$function$;

revoke execute on function private.replace_owned_diagnosis_from_staged_v1_impl(
  bigint,
  bigint,
  integer
)
from public, anon, authenticated, service_role;

grant execute on function private.replace_owned_diagnosis_from_staged_v1_impl(
  bigint,
  bigint,
  integer
)
to authenticated;

revoke execute on function public.replace_owned_diagnosis_from_staged_v1(
  bigint,
  bigint,
  integer
)
from public, anon, service_role;

grant execute on function public.replace_owned_diagnosis_from_staged_v1(
  bigint,
  bigint,
  integer
)
to authenticated;
