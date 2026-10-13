alter table public.service_diagnoses
add column source_pricing_method text,
add column source_current_price_cents bigint,
add column source_material_cost_unit text,
add column source_material_cost_cents bigint,
add column daily_work_minutes integer,
add column source_appointment_duration_minutes integer,
add constraint service_diagnoses_source_shape_check check (
  (
    source_pricing_method is null
    and source_current_price_cents is null
    and source_material_cost_unit is null
    and source_material_cost_cents is null
    and daily_work_minutes is null
    and source_appointment_duration_minutes is null
  )
  or (
    source_pricing_method is not null
    and source_current_price_cents is not null
    and source_material_cost_cents is not null
    and daily_work_minutes is not null
    and source_appointment_duration_minutes is not null
    and (
      source_material_cost_unit is not null
      or source_material_cost_cents = 0
    )
  )
),
add constraint service_diagnoses_source_method_check check (
  source_pricing_method is null
  or source_pricing_method in (
    'minute',
    'hour',
    'appointment',
    'day',
    'week',
    'month'
  )
),
add constraint service_diagnoses_source_material_unit_check check (
  source_material_cost_unit is null
  or source_material_cost_unit in ('appointment', 'hour', 'day', 'month')
),
add constraint service_diagnoses_source_money_check check (
  (source_current_price_cents is null or source_current_price_cents >= 0)
  and (source_material_cost_cents is null or source_material_cost_cents >= 0)
),
add constraint service_diagnoses_source_duration_check check (
  daily_work_minutes is null
  or (
    daily_work_minutes between 1 and 1440
    and source_appointment_duration_minutes between 0 and 1440
    and (
      (
        source_pricing_method = 'appointment'
        or source_material_cost_unit = 'appointment'
      )
      is not true
      or source_appointment_duration_minutes > 0
    )
  )
);

alter table public.diagnoses
drop constraint diagnoses_scenario_check,
add constraint diagnoses_scenario_check check (
  (
    business_category = 'service'
    and scenario in (
      'minute',
      'hour',
      'appointment',
      'day',
      'week',
      'month'
    )
  )
  or (
    business_category = 'product'
    and scenario = 'resale'
  )
  or (
    business_category = 'production'
    and scenario = 'manufacturing'
  )
);

create function public.create_service_diagnosis_report_v4(
  p_submission_id uuid,
  p_pricing_method public.service_pricing_method,
  p_desired_monthly_income_cents bigint,
  p_fixed_monthly_expenses_cents bigint,
  p_work_hours_period public.service_work_hours_period,
  p_work_period_minutes integer,
  p_monthly_work_minutes integer,
  p_weekly_work_days smallint,
  p_hourly_rate_cents bigint,
  p_minute_rate_cents bigint,
  p_appointment_rate_cents bigint,
  p_appointment_duration_minutes integer,
  p_material_unit_cost_cents bigint,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
  p_source_pricing_method text,
  p_source_current_price_cents bigint,
  p_source_material_cost_unit text,
  p_source_material_cost_cents bigint,
  p_daily_work_minutes integer,
  p_source_appointment_duration_minutes integer,
  p_schema_version smallint,
  p_calculation_version smallint,
  p_content_version smallint,
  p_scenario text,
  p_current_price_cents bigint,
  p_real_margin_basis_points integer,
  p_unit_profit_cents bigint,
  p_verdict text,
  p_priority text,
  p_unit text,
  p_report_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
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
    report_snapshot
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
    p_report_snapshot
  )
  on conflict (user_id, submission_id) do nothing
  returning id into report_id;

  if report_id is null then
    select id into report_id
    from public.diagnoses
    where user_id = caller_id
      and submission_id = p_submission_id
      and business_category = 'service';

    if report_id is null then
      raise exception using
        errcode = '23505',
        message = 'submission id already used';
    end if;
    return report_id;
  end if;

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
$$;

revoke execute on function public.create_service_diagnosis_report_v4(
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
  text,
  bigint,
  text,
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
from public, anon;

grant execute on function public.create_service_diagnosis_report_v4(
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
  text,
  bigint,
  text,
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
to authenticated;
