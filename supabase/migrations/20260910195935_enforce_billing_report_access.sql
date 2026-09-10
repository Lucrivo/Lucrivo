create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter table public.diagnoses
add column is_free_report boolean not null default false;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at, id
    ) as position
  from public.diagnoses
)
update public.diagnoses as diagnosis
set is_free_report = true
from ranked
where ranked.id = diagnosis.id
  and ranked.position = 1;

create unique index diagnoses_one_free_report_per_user_idx
on public.diagnoses (user_id)
where is_free_report;

create function private.has_paid_access_for_user(
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
  if p_user_id is null or p_at is null then
    return false;
  end if;

  if caller_id is not null and caller_id <> p_user_id then
    raise exception using
      errcode = '42501',
      message = 'cannot inspect another user entitlement';
  end if;

  return exists (
    select 1
    from public.billing_contracts as contract
    where contract.user_id = p_user_id
      and contract.status in ('active', 'cancel_at_period_end')
      and contract.access_starts_at <= p_at
      and contract.access_ends_at > p_at
  );
end;
$function$;

create function private.has_paid_access(
  p_at timestamptz default statement_timestamp()
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
  if caller_id is null then
    return false;
  end if;

  return private.has_paid_access_for_user(caller_id, p_at);
end;
$function$;

create function private.can_read_diagnosis(p_diagnosis_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or p_diagnosis_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.diagnoses as diagnosis
    where diagnosis.id = p_diagnosis_id
      and diagnosis.user_id = caller_id
      and (
        diagnosis.is_free_report
        or private.has_paid_access_for_user(
          caller_id,
          pg_catalog.statement_timestamp()
        )
      )
  );
end;
$function$;

revoke execute on function private.has_paid_access_for_user(uuid, timestamptz)
from public, anon, authenticated, service_role;
revoke execute on function private.has_paid_access(timestamptz)
from public, anon, authenticated, service_role;
revoke execute on function private.can_read_diagnosis(bigint)
from public, anon, authenticated, service_role;

grant execute on function private.has_paid_access(timestamptz)
to authenticated;
grant execute on function private.can_read_diagnosis(bigint)
to authenticated;

drop policy diagnoses_select_own on public.diagnoses;
create policy diagnoses_select_own
on public.diagnoses
for select
to authenticated
using (private.can_read_diagnosis(id));

drop policy service_diagnoses_select_own on public.service_diagnoses;
create policy service_diagnoses_select_own
on public.service_diagnoses
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.can_read_diagnosis(diagnosis_id)
);

drop policy product_diagnoses_select_own on public.product_diagnoses;
create policy product_diagnoses_select_own
on public.product_diagnoses
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.can_read_diagnosis(diagnosis_id)
);

drop policy production_diagnoses_select_own on public.production_diagnoses;
create policy production_diagnoses_select_own
on public.production_diagnoses
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and private.can_read_diagnosis(diagnosis_id)
);

create function private.create_service_diagnosis_report_v4_impl(p_submission_id uuid, p_pricing_method public.service_pricing_method, p_desired_monthly_income_cents bigint, p_fixed_monthly_expenses_cents bigint, p_work_hours_period public.service_work_hours_period, p_work_period_minutes integer, p_monthly_work_minutes integer, p_weekly_work_days smallint, p_hourly_rate_cents bigint, p_minute_rate_cents bigint, p_appointment_rate_cents bigint, p_appointment_duration_minutes integer, p_material_unit_cost_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_source_pricing_method text, p_source_current_price_cents bigint, p_source_material_cost_unit text, p_source_material_cost_cents bigint, p_daily_work_minutes integer, p_source_appointment_duration_minutes integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
  report_is_free boolean;
  source_price_minutes bigint;
  source_material_minutes bigint;
  target_minutes bigint;
  expected_current_price_cents bigint;
  expected_material_cost_cents bigint;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_schema_version is distinct from 4
    or p_calculation_version is distinct from 3
    or p_content_version is distinct from 5
    or p_source_pricing_method not in (
      'minute', 'hour', 'appointment', 'day', 'week', 'month'
    )
    or (
      p_source_material_cost_unit is not null
      and p_source_material_cost_unit not in (
        'appointment', 'hour', 'day', 'month'
      )
    )
    or p_scenario is distinct from p_source_pricing_method
    or p_work_hours_period is distinct from 'day'
    or p_work_period_minutes is distinct from p_daily_work_minutes
    or p_monthly_work_minutes is distinct from (
      (
        p_daily_work_minutes::bigint
        * p_weekly_work_days::bigint
        * 433::bigint
        + 50::bigint
      ) / 100::bigint
    )::integer
    or (
      p_source_pricing_method = 'appointment'
      and (
        p_pricing_method is distinct from 'appointment'
        or p_unit is distinct from 'appointment'
        or p_appointment_duration_minutes
          is distinct from p_source_appointment_duration_minutes
      )
    )
    or (
      p_source_pricing_method <> 'appointment'
      and (
        p_pricing_method is distinct from 'hour'
        or p_unit is distinct from 'hour'
        or p_appointment_duration_minutes is distinct from 0
      )
    )
    or p_minute_rate_cents is distinct from 0
    or jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'source') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'executiveSummary')
      is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_report_snapshot -> 'discountSimulationBase')
      is distinct from 'object'
    or p_report_snapshot ->> 'schemaVersion'
      is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion'
      is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion'
      is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'service'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_report_snapshot ->> 'unit' is distinct from p_unit
    or p_report_snapshot #>> '{inputs,desiredMonthlyIncomeCents}'
      is distinct from p_desired_monthly_income_cents::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}'
      is distinct from p_fixed_monthly_expenses_cents::text
    or p_report_snapshot #>> '{inputs,workHoursPeriod}'
      is distinct from p_work_hours_period::text
    or p_report_snapshot #>> '{inputs,workPeriodMinutes}'
      is distinct from p_work_period_minutes::text
    or p_report_snapshot #>> '{inputs,monthlyWorkMinutes}'
      is distinct from p_monthly_work_minutes::text
    or p_report_snapshot #>> '{inputs,weeklyWorkDays}'
      is distinct from p_weekly_work_days::text
    or p_report_snapshot #>> '{inputs,hourlyRateCents}'
      is distinct from p_hourly_rate_cents::text
    or p_report_snapshot #>> '{inputs,minuteRateCents}'
      is distinct from p_minute_rate_cents::text
    or p_report_snapshot #>> '{inputs,appointmentRateCents}'
      is distinct from p_appointment_rate_cents::text
    or p_report_snapshot #>> '{inputs,appointmentDurationMinutes}'
      is distinct from p_appointment_duration_minutes::text
    or p_report_snapshot #>> '{inputs,materialUnitCostCents}'
      is distinct from p_material_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}'
      is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}'
      is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{source,pricingMethod}'
      is distinct from p_source_pricing_method
    or p_report_snapshot #>> '{source,currentPriceCents}'
      is distinct from p_source_current_price_cents::text
    or p_report_snapshot #>> '{source,materialCostUnit}'
      is distinct from p_source_material_cost_unit
    or p_report_snapshot #>> '{source,materialCostCents}'
      is distinct from p_source_material_cost_cents::text
    or p_report_snapshot #>> '{source,dailyWorkMinutes}'
      is distinct from p_daily_work_minutes::text
    or p_report_snapshot #>> '{source,appointmentDurationMinutes}'
      is distinct from p_source_appointment_duration_minutes::text
    or p_report_snapshot #>> '{results,currentPriceCents}'
      is distinct from p_current_price_cents::text
    or p_report_snapshot #>> '{results,realMarginBasisPoints}'
      is distinct from p_real_margin_basis_points::text
    or p_report_snapshot #>> '{results,unitProfitCents}'
      is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
    or p_report_snapshot #>> '{results,materialUnitCostCents}'
      is distinct from p_material_unit_cost_cents::text
  then
    raise exception using
      errcode = '22023',
      message = 'invalid report snapshot';
  end if;

  source_price_minutes := case p_source_pricing_method
    when 'minute' then 1
    when 'hour' then 60
    when 'appointment' then p_source_appointment_duration_minutes
    when 'day' then p_daily_work_minutes
    when 'week' then p_daily_work_minutes::bigint * p_weekly_work_days::bigint
    when 'month' then p_monthly_work_minutes
  end;
  target_minutes := case
    when p_source_pricing_method = 'appointment'
      then p_source_appointment_duration_minutes
    else 60
  end;

  if source_price_minutes <= 0 or target_minutes <= 0 then
    raise exception using
      errcode = '22023',
      message = 'invalid report snapshot';
  end if;

  expected_current_price_cents := trunc(
    (
      p_source_current_price_cents::numeric * target_minutes::numeric
      + trunc(source_price_minutes::numeric / 2)
    ) / source_price_minutes::numeric
  )::bigint;

  source_material_minutes := case p_source_material_cost_unit
    when 'appointment' then p_source_appointment_duration_minutes
    when 'hour' then 60
    when 'day' then p_daily_work_minutes
    when 'month' then p_monthly_work_minutes
    else null
  end;
  expected_material_cost_cents := case
    when p_source_material_cost_unit is null
      and p_source_material_cost_cents = 0 then 0
    when source_material_minutes > 0 then trunc(
      (
        p_source_material_cost_cents::numeric * target_minutes::numeric
        + trunc(source_material_minutes::numeric / 2)
      ) / source_material_minutes::numeric
    )
    else null
  end;

  if expected_current_price_cents is distinct from p_current_price_cents
    or (
      p_source_pricing_method = 'appointment'
      and p_appointment_rate_cents
        is distinct from expected_current_price_cents
    )
    or (
      p_source_pricing_method <> 'appointment'
      and p_hourly_rate_cents is distinct from expected_current_price_cents
    )
    or expected_material_cost_cents is distinct from p_material_unit_cost_cents
  then
    raise exception using
      errcode = '22023',
      message = 'invalid report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select d.id into report_id
  from public.diagnoses as d
  join public.service_diagnoses as detail
    on detail.diagnosis_id = d.id
  where d.user_id = caller_id
    and d.submission_id = p_submission_id
    and d.business_category = 'service'
    and detail.user_id = caller_id
    and detail.submission_id = p_submission_id;

  if report_id is not null then
    return report_id;
  end if;

  if exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id
      and d.submission_id = p_submission_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'submission id already used';
  end if;

  report_is_free := not exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id
      and d.is_free_report
  );

  if not report_is_free
    and not private.has_paid_access_for_user(
      caller_id,
      pg_catalog.statement_timestamp()
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'free_report_limit_reached';
  end if;

  insert into public.diagnoses (
    submission_id,
    user_id,
    business_category,
    scenario,
    schema_version,
    calculation_version,
    content_version,
    current_price_cents,
    real_margin_basis_points,
    unit_profit_cents,
    verdict,
    priority,
    unit,
    report_snapshot,
    is_free_report
  ) values (
    p_submission_id,
    caller_id,
    'service',
    p_scenario,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    p_unit,
    p_report_snapshot,
    report_is_free
  )
  returning id into report_id;

  insert into public.service_diagnoses (
    diagnosis_id,
    submission_id,
    user_id,
    pricing_method,
    desired_monthly_income_cents,
    fixed_monthly_expenses_cents,
    work_hours_period,
    work_period_minutes,
    monthly_work_minutes,
    weekly_work_days,
    hourly_rate_cents,
    minute_rate_cents,
    appointment_rate_cents,
    appointment_duration_minutes,
    material_unit_cost_cents,
    tax_rate_basis_points,
    card_fee_rate_basis_points,
    source_pricing_method,
    source_current_price_cents,
    source_material_cost_unit,
    source_material_cost_cents,
    daily_work_minutes,
    source_appointment_duration_minutes
  ) values (
    report_id,
    p_submission_id,
    caller_id,
    p_pricing_method,
    p_desired_monthly_income_cents,
    p_fixed_monthly_expenses_cents,
    p_work_hours_period,
    p_work_period_minutes,
    p_monthly_work_minutes,
    p_weekly_work_days,
    p_hourly_rate_cents,
    p_minute_rate_cents,
    p_appointment_rate_cents,
    p_appointment_duration_minutes,
    p_material_unit_cost_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points,
    p_source_pricing_method,
    p_source_current_price_cents,
    p_source_material_cost_unit,
    p_source_material_cost_cents,
    p_daily_work_minutes,
    p_source_appointment_duration_minutes
  );

  return report_id;
end;
$function$;

create or replace function public.create_service_diagnosis_report_v4(p_submission_id uuid, p_pricing_method public.service_pricing_method, p_desired_monthly_income_cents bigint, p_fixed_monthly_expenses_cents bigint, p_work_hours_period public.service_work_hours_period, p_work_period_minutes integer, p_monthly_work_minutes integer, p_weekly_work_days smallint, p_hourly_rate_cents bigint, p_minute_rate_cents bigint, p_appointment_rate_cents bigint, p_appointment_duration_minutes integer, p_material_unit_cost_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_source_pricing_method text, p_source_current_price_cents bigint, p_source_material_cost_unit text, p_source_material_cost_cents bigint, p_daily_work_minutes integer, p_source_appointment_duration_minutes integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
returns bigint
language sql
security invoker
set search_path = ''
as $wrapper$
  select private.create_service_diagnosis_report_v4_impl(
    p_submission_id,
    p_pricing_method,
    p_desired_monthly_income_cents,
    p_fixed_monthly_expenses_cents,
    p_work_hours_period,
    p_work_period_minutes,
    p_monthly_work_minutes,
    p_weekly_work_days,
    p_hourly_rate_cents,
    p_minute_rate_cents,
    p_appointment_rate_cents,
    p_appointment_duration_minutes,
    p_material_unit_cost_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points,
    p_source_pricing_method,
    p_source_current_price_cents,
    p_source_material_cost_unit,
    p_source_material_cost_cents,
    p_daily_work_minutes,
    p_source_appointment_duration_minutes,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_scenario,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    p_unit,
    p_report_snapshot
  );
$wrapper$;

revoke execute on function public.create_service_diagnosis_report_v4(uuid,public.service_pricing_method,bigint,bigint,public.service_work_hours_period,integer,integer,smallint,bigint,bigint,bigint,integer,bigint,integer,integer,text,bigint,text,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
from public, anon, service_role;

grant execute on function public.create_service_diagnosis_report_v4(uuid,public.service_pricing_method,bigint,bigint,public.service_work_hours_period,integer,integer,smallint,bigint,bigint,bigint,integer,bigint,integer,integer,text,bigint,text,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_service_diagnosis_report_v4_impl(uuid,public.service_pricing_method,bigint,bigint,public.service_work_hours_period,integer,integer,smallint,bigint,bigint,bigint,integer,bigint,integer,integer,text,bigint,text,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
from public, anon, authenticated, service_role;

grant execute on function private.create_service_diagnosis_report_v4_impl(uuid,public.service_pricing_method,bigint,bigint,public.service_work_hours_period,integer,integer,smallint,bigint,bigint,bigint,integer,bigint,integer,integer,text,bigint,text,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
to authenticated;

create function private.create_product_diagnosis_report_impl(p_submission_id uuid, p_purchase_unit_cost_cents bigint, p_unit_sale_price_cents bigint, p_fixed_monthly_expenses_cents bigint, p_monthly_sales_volume integer, p_pro_labore_included boolean, p_pro_labore_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
  report_is_free boolean;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_schema_version is distinct from 1
    or p_calculation_version is distinct from 1
    or p_content_version is distinct from 2
    or p_scenario is distinct from 'resale'
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'executiveSummary')
      is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_report_snapshot -> 'discountSimulationBase')
      is distinct from 'object'
    or p_report_snapshot ->> 'schemaVersion'
      is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion'
      is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion'
      is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'product'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_report_snapshot ->> 'unit' is distinct from p_unit
    or p_report_snapshot #>> '{inputs,purchaseUnitCostCents}'
      is distinct from p_purchase_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,unitSalePriceCents}'
      is distinct from p_unit_sale_price_cents::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}'
      is distinct from p_fixed_monthly_expenses_cents::text
    or (p_report_snapshot #>> '{inputs,monthlySalesVolume}')
      is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{inputs,proLaboreIncluded}'
      is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{inputs,proLaboreCents}'
      is distinct from p_pro_labore_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}'
      is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}'
      is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{results,purchaseUnitCostCents}'
      is distinct from p_purchase_unit_cost_cents::text
    or p_report_snapshot #>> '{results,currentPriceCents}'
      is distinct from p_current_price_cents::text
    or (p_report_snapshot #>> '{results,realMarginBasisPoints}')
      is distinct from p_real_margin_basis_points::text
    or (p_report_snapshot #>> '{results,unitProfitCents}')
      is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
  then
    raise exception using
      errcode = '22023',
      message = 'invalid product report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select d.id into report_id
  from public.diagnoses as d
  join public.product_diagnoses as detail
    on detail.diagnosis_id = d.id
  where d.user_id = caller_id
    and d.submission_id = p_submission_id
    and d.business_category = 'product'
      and d.scenario = 'resale'
    and detail.user_id = caller_id
    and detail.submission_id = p_submission_id;

  if report_id is not null then
    return report_id;
  end if;

  if exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id
      and d.submission_id = p_submission_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'submission id belongs to another diagnosis';
  end if;

  report_is_free := not exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id
      and d.is_free_report
  );

  if not report_is_free
    and not private.has_paid_access_for_user(
      caller_id,
      pg_catalog.statement_timestamp()
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'free_report_limit_reached';
  end if;

  insert into public.diagnoses (
    submission_id,
    user_id,
    business_category,
    scenario,
    schema_version,
    calculation_version,
    content_version,
    current_price_cents,
    real_margin_basis_points,
    unit_profit_cents,
    verdict,
    priority,
    unit,
    report_snapshot,
    is_free_report
  ) values (
    p_submission_id,
    caller_id,
    'product',
    'resale',
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    'unit',
    p_report_snapshot,
    report_is_free
  )
  returning id into report_id;

  insert into public.product_diagnoses (
    diagnosis_id,
    submission_id,
    user_id,
    purchase_unit_cost_cents,
    unit_sale_price_cents,
    fixed_monthly_expenses_cents,
    monthly_sales_volume,
    pro_labore_included,
    pro_labore_cents,
    tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id,
    p_submission_id,
    caller_id,
    p_purchase_unit_cost_cents,
    p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_sales_volume,
    p_pro_labore_included,
    p_pro_labore_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$function$;

create or replace function public.create_product_diagnosis_report(p_submission_id uuid, p_purchase_unit_cost_cents bigint, p_unit_sale_price_cents bigint, p_fixed_monthly_expenses_cents bigint, p_monthly_sales_volume integer, p_pro_labore_included boolean, p_pro_labore_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
returns bigint
language sql
security invoker
set search_path = ''
as $wrapper$
  select private.create_product_diagnosis_report_impl(
    p_submission_id,
    p_purchase_unit_cost_cents,
    p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_sales_volume,
    p_pro_labore_included,
    p_pro_labore_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_scenario,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    p_unit,
    p_report_snapshot
  );
$wrapper$;

revoke execute on function public.create_product_diagnosis_report(uuid,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
from public, anon, service_role;

grant execute on function public.create_product_diagnosis_report(uuid,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_product_diagnosis_report_impl(uuid,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
from public, anon, authenticated, service_role;

grant execute on function private.create_product_diagnosis_report_impl(uuid,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
to authenticated;

create function private.create_production_diagnosis_report_impl(p_submission_id uuid, p_cost_composition_enabled boolean, p_production_unit_cost_cents bigint, p_material_unit_cost_cents bigint, p_packaging_unit_cost_cents bigint, p_direct_labor_unit_cost_cents bigint, p_other_variable_unit_cost_cents bigint, p_unit_sale_price_cents bigint, p_fixed_monthly_expenses_cents bigint, p_monthly_sales_volume integer, p_pro_labore_included boolean, p_pro_labore_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
  report_is_free boolean;
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_schema_version is distinct from 1
    or p_calculation_version is distinct from 1
    or p_content_version is distinct from 2
    or p_scenario is distinct from 'manufacturing'
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'executiveSummary')
      is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_report_snapshot -> 'discountSimulationBase')
      is distinct from 'object'
    or p_report_snapshot ->> 'schemaVersion'
      is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion'
      is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion'
      is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'production'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_report_snapshot ->> 'unit' is distinct from p_unit
    or p_report_snapshot #>> '{inputs,costCompositionEnabled}'
      is distinct from p_cost_composition_enabled::text
    or p_report_snapshot #>> '{inputs,productionUnitCostCents}'
      is distinct from p_production_unit_cost_cents::text
    or (p_report_snapshot #>> '{inputs,materialUnitCostCents}')
      is distinct from p_material_unit_cost_cents::text
    or (p_report_snapshot #>> '{inputs,packagingUnitCostCents}')
      is distinct from p_packaging_unit_cost_cents::text
    or (p_report_snapshot #>> '{inputs,directLaborUnitCostCents}')
      is distinct from p_direct_labor_unit_cost_cents::text
    or (p_report_snapshot #>> '{inputs,otherVariableUnitCostCents}')
      is distinct from p_other_variable_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,unitSalePriceCents}'
      is distinct from p_unit_sale_price_cents::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}'
      is distinct from p_fixed_monthly_expenses_cents::text
    or (p_report_snapshot #>> '{inputs,monthlySalesVolume}')
      is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{inputs,proLaboreIncluded}'
      is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{inputs,proLaboreCents}'
      is distinct from p_pro_labore_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}'
      is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}'
      is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{results,productionUnitCostCents}'
      is distinct from p_production_unit_cost_cents::text
    or p_report_snapshot #>> '{results,currentPriceCents}'
      is distinct from p_current_price_cents::text
    or (p_report_snapshot #>> '{results,realMarginBasisPoints}')
      is distinct from p_real_margin_basis_points::text
    or (p_report_snapshot #>> '{results,unitProfitCents}')
      is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
  then
    raise exception using
      errcode = '22023',
      message = 'invalid production report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select d.id into report_id
  from public.diagnoses as d
  join public.production_diagnoses as detail
    on detail.diagnosis_id = d.id
  where d.user_id = caller_id
    and d.submission_id = p_submission_id
    and d.business_category = 'production'
      and d.scenario = 'manufacturing'
    and detail.user_id = caller_id
    and detail.submission_id = p_submission_id;

  if report_id is not null then
    return report_id;
  end if;

  if exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id
      and d.submission_id = p_submission_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'submission id belongs to another diagnosis';
  end if;

  report_is_free := not exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id
      and d.is_free_report
  );

  if not report_is_free
    and not private.has_paid_access_for_user(
      caller_id,
      pg_catalog.statement_timestamp()
    )
  then
    raise exception using
      errcode = 'P0001',
      message = 'free_report_limit_reached';
  end if;

  insert into public.diagnoses (
    submission_id,
    user_id,
    business_category,
    scenario,
    schema_version,
    calculation_version,
    content_version,
    current_price_cents,
    real_margin_basis_points,
    unit_profit_cents,
    verdict,
    priority,
    unit,
    report_snapshot,
    is_free_report
  ) values (
    p_submission_id,
    caller_id,
    'production',
    'manufacturing',
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    'unit',
    p_report_snapshot,
    report_is_free
  )
  returning id into report_id;

  insert into public.production_diagnoses (
    diagnosis_id,
    submission_id,
    user_id,
    cost_composition_enabled,
    production_unit_cost_cents,
    material_unit_cost_cents,
    packaging_unit_cost_cents,
    direct_labor_unit_cost_cents,
    other_variable_unit_cost_cents,
    unit_sale_price_cents,
    fixed_monthly_expenses_cents,
    monthly_sales_volume,
    pro_labore_included,
    pro_labore_cents,
    tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id,
    p_submission_id,
    caller_id,
    p_cost_composition_enabled,
    p_production_unit_cost_cents,
    p_material_unit_cost_cents,
    p_packaging_unit_cost_cents,
    p_direct_labor_unit_cost_cents,
    p_other_variable_unit_cost_cents,
    p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_sales_volume,
    p_pro_labore_included,
    p_pro_labore_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$function$;

create or replace function public.create_production_diagnosis_report(p_submission_id uuid, p_cost_composition_enabled boolean, p_production_unit_cost_cents bigint, p_material_unit_cost_cents bigint, p_packaging_unit_cost_cents bigint, p_direct_labor_unit_cost_cents bigint, p_other_variable_unit_cost_cents bigint, p_unit_sale_price_cents bigint, p_fixed_monthly_expenses_cents bigint, p_monthly_sales_volume integer, p_pro_labore_included boolean, p_pro_labore_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
returns bigint
language sql
security invoker
set search_path = ''
as $wrapper$
  select private.create_production_diagnosis_report_impl(
    p_submission_id,
    p_cost_composition_enabled,
    p_production_unit_cost_cents,
    p_material_unit_cost_cents,
    p_packaging_unit_cost_cents,
    p_direct_labor_unit_cost_cents,
    p_other_variable_unit_cost_cents,
    p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_sales_volume,
    p_pro_labore_included,
    p_pro_labore_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    p_scenario,
    p_current_price_cents,
    p_real_margin_basis_points,
    p_unit_profit_cents,
    p_verdict,
    p_priority,
    p_unit,
    p_report_snapshot
  );
$wrapper$;

revoke execute on function public.create_production_diagnosis_report(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
from public, anon, service_role;

grant execute on function public.create_production_diagnosis_report(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_production_diagnosis_report_impl(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
from public, anon, authenticated, service_role;

grant execute on function private.create_production_diagnosis_report_impl(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function public.create_service_diagnosis_report(
  uuid,
  public.service_pricing_method,
  bigint,
  bigint,
  public.service_work_hours_period,
  integer,
  integer,
  smallint,
  bigint,
  bigint,
  bigint,
  integer,
  bigint,
  integer,
  integer,
  smallint,
  smallint,
  smallint,
  text,
  bigint,
  integer,
  bigint,
  text,
  text,
  text,
  jsonb
)
from public, anon, authenticated, service_role;
