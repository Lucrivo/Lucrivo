create or replace function public.create_service_diagnosis_report(
  p_submission_id uuid,
  p_pricing_method public.service_pricing_method,
  p_desired_monthly_income_cents bigint,
  p_fixed_monthly_expenses_cents bigint,
  p_monthly_work_minutes integer,
  p_weekly_work_days smallint,
  p_hourly_rate_cents bigint,
  p_minute_rate_cents bigint,
  p_appointment_rate_cents bigint,
  p_appointment_duration_minutes integer,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
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
begin
  if caller_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_schema_version <> 2
    or p_calculation_version <> 1
    or p_content_version <> 2
    or jsonb_typeof(p_report_snapshot) <> 'object'
    or coalesce(
      jsonb_typeof(p_report_snapshot -> 'executiveSummary'),
      ''
    ) <> 'object'
    or p_report_snapshot ->> 'schemaVersion' <> p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion' <> p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion' <> p_content_version::text
    or p_report_snapshot ->> 'category' <> 'service'
    or p_report_snapshot ->> 'scenario' <> p_scenario
    or p_scenario <> p_pricing_method::text
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
      and submission_id = p_submission_id;

    return report_id;
  end if;

  insert into public.service_diagnoses (
    diagnosis_id,
    submission_id,
    user_id,
    pricing_method,
    desired_monthly_income_cents,
    fixed_monthly_expenses_cents,
    monthly_work_minutes,
    weekly_work_days,
    hourly_rate_cents,
    minute_rate_cents,
    appointment_rate_cents,
    appointment_duration_minutes,
    tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id,
    p_submission_id,
    caller_id,
    p_pricing_method,
    p_desired_monthly_income_cents,
    p_fixed_monthly_expenses_cents,
    p_monthly_work_minutes,
    p_weekly_work_days,
    p_hourly_rate_cents,
    p_minute_rate_cents,
    p_appointment_rate_cents,
    p_appointment_duration_minutes,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$$;
