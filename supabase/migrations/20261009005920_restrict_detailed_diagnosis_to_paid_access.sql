-- Detailed creation requires current paid or courtesy entitlement.
-- The permanent free allowance applies only to quick reports.

drop index public.diagnoses_one_free_report_per_user_idx;

create unique index diagnoses_one_free_quick_report_per_user_idx
on public.diagnoses (user_id)
where is_free_report and analysis_mode = 'quick';

create or replace function private.create_service_diagnosis_report_v4_impl(p_submission_id uuid, p_pricing_method public.service_pricing_method, p_desired_monthly_income_cents bigint, p_fixed_monthly_expenses_cents bigint, p_work_hours_period public.service_work_hours_period, p_work_period_minutes integer, p_monthly_work_minutes integer, p_weekly_work_days smallint, p_hourly_rate_cents bigint, p_minute_rate_cents bigint, p_appointment_rate_cents bigint, p_appointment_duration_minutes integer, p_material_unit_cost_cents bigint, p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer, p_source_pricing_method text, p_source_current_price_cents bigint, p_source_material_cost_unit text, p_source_material_cost_cents bigint, p_daily_work_minutes integer, p_source_appointment_duration_minutes integer, p_schema_version smallint, p_calculation_version smallint, p_content_version smallint, p_scenario text, p_current_price_cents bigint, p_real_margin_basis_points integer, p_unit_profit_cents bigint, p_verdict text, p_priority text, p_unit text, p_report_snapshot jsonb)
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
  if caller_id is null or not private.account_is_eligible() then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_schema_version is distinct from 4
    or p_calculation_version is distinct from 3
    or p_content_version is distinct from 6
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
    or not (
      (p_verdict = 'missing_price' and p_priority = 'price')
      or (p_verdict = 'direct_loss' and p_priority = 'cost')
      or (p_verdict = 'operational_loss' and p_priority = 'price')
      or (p_verdict in ('break_even', 'positive_result')
        and p_priority = 'volume')
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetMarginBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.attentionBandBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetPriceCents'
    )
    or p_verdict is distinct from (case
      when p_current_price_cents <= 0 then 'missing_price'
      when (
        case
          when pg_catalog.jsonb_typeof(
            p_report_snapshot #> '{results,unitContributionCents}'
          ) = 'number'
          then (p_report_snapshot #>> '{results,unitContributionCents}')::bigint
          else null
        end
      ) <= 0 then 'direct_loss'
      when p_real_margin_basis_points is null
        or p_real_margin_basis_points < 0 then 'operational_loss'
      when p_real_margin_basis_points = 0 then 'break_even'
      else 'positive_result'
    end)
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
    from public.diagnoses as diagnosis
    where diagnosis.user_id = caller_id
      and diagnosis.is_free_report
      and diagnosis.analysis_mode = 'quick'
  );

  if not report_is_free
    and not private.has_report_entitlement_for_user(
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

create or replace function private.create_product_diagnosis_report_v3_impl(
  p_submission_id uuid,
  p_product_kind text,
  p_purchase_unit_cost_cents bigint,
  p_unit_sale_price_cents bigint,
  p_fixed_monthly_expenses_cents bigint,
  p_monthly_sales_volume integer,
  p_pro_labore_included boolean,
  p_pro_labore_cents bigint,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
  p_schema_version smallint,
  p_calculation_version smallint,
  p_content_version smallint,
  p_scenario text,
  p_current_price_cents bigint,
  p_real_margin_basis_points integer,
  p_unit_profit_cents bigint,
  p_monthly_result_cents bigint,
  p_verdict text,
  p_priority text,
  p_unit text,
  p_report_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
  report_is_free boolean;
begin
  if caller_id is null or not private.account_is_eligible() then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_product_kind not in ('resale', 'digital')
    or p_scenario is distinct from p_product_kind
    or p_schema_version is distinct from 3
    or p_calculation_version is distinct from 3
    or p_content_version is distinct from 6
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or not (
      (p_verdict = 'direct_loss' and p_priority = 'cost')
      or (p_verdict = 'incomplete_volume' and p_priority = 'data')
      or (p_verdict = 'no_sales' and p_priority = 'volume')
      or (p_verdict = 'operational_loss' and p_priority = 'price')
      or (p_verdict in ('break_even', 'positive_result') and p_priority = 'volume')
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetMarginBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.attentionBandBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetPriceCents'
    )
    or p_verdict is distinct from (case
      when (
        case
          when pg_catalog.jsonb_typeof(
            p_report_snapshot #> '{results,unitContributionCents}'
          ) = 'number'
          then (p_report_snapshot #>> '{results,unitContributionCents}')::bigint
          else null
        end
      ) <= 0 then 'direct_loss'
      when p_monthly_sales_volume is null then 'incomplete_volume'
      when p_monthly_sales_volume = 0 then 'no_sales'
      when p_monthly_result_cents < 0 then 'operational_loss'
      when p_monthly_result_cents = 0 then 'break_even'
      else 'positive_result'
    end)
    or pg_catalog.jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'executiveSummary') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'discountSimulationBase') is distinct from 'object'
    or p_report_snapshot ->> 'schemaVersion' is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion' is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion' is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'product'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_report_snapshot ->> 'unit' is distinct from p_unit
    or p_report_snapshot #>> '{inputs,productKind}' is distinct from p_product_kind
    or p_report_snapshot #>> '{inputs,purchaseUnitCostCents}' is distinct from p_purchase_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,unitSalePriceCents}' is distinct from p_unit_sale_price_cents::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}' is distinct from p_fixed_monthly_expenses_cents::text
    or p_report_snapshot #>> '{inputs,monthlySalesVolume}' is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{inputs,proLaboreIncluded}' is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{inputs,proLaboreCents}' is distinct from p_pro_labore_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}' is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}' is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{results,purchaseUnitCostCents}' is distinct from p_purchase_unit_cost_cents::text
    or p_report_snapshot #>> '{results,currentPriceCents}' is distinct from p_current_price_cents::text
    or (p_monthly_sales_volume is null) is distinct from
       ((p_report_snapshot #>> '{results,monthlySalesVolumeUsed}') is null)
    or p_report_snapshot #>> '{results,monthlySalesVolumeUsed}' is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{results,realMarginBasisPoints}' is distinct from p_real_margin_basis_points::text
    or p_report_snapshot #>> '{results,unitProfitCents}' is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,monthlyResultCents}' is distinct from p_monthly_result_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
    or (
      p_monthly_sales_volume is null
      and (
        p_monthly_result_cents is not null
        or p_real_margin_basis_points is not null
        or p_unit_profit_cents is not null
        or p_report_snapshot #>> '{results,monthlyGrossRevenueCents}' is not null
        or p_report_snapshot #>> '{results,monthlyNetRevenueCents}' is not null
      )
    )
    or (
      p_monthly_sales_volume is not null
      and (
        p_monthly_result_cents is null
        or p_report_snapshot #>> '{results,monthlyGrossRevenueCents}' is null
        or p_report_snapshot #>> '{results,monthlyNetRevenueCents}' is null
      )
    )
    or (
      p_monthly_sales_volume = 0
      and (p_real_margin_basis_points is not null or p_unit_profit_cents is not null)
    )
    or (
      p_monthly_sales_volume > 0
      and (p_real_margin_basis_points is null or p_unit_profit_cents is null)
    )
  then
    raise exception using errcode = '22023', message = 'invalid product report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select d.id into report_id
  from public.diagnoses as d
  join public.product_diagnoses as detail on detail.diagnosis_id = d.id
  where d.user_id = caller_id
    and d.submission_id = p_submission_id
    and d.business_category = 'product'
    and d.scenario = p_product_kind
    and detail.user_id = caller_id
    and detail.submission_id = p_submission_id
    and detail.product_kind = p_product_kind;

  if report_id is not null then
    return report_id;
  end if;

  if exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id and d.submission_id = p_submission_id
  ) then
    raise exception using errcode = '23505', message = 'submission id belongs to another diagnosis';
  end if;

  report_is_free := not exists (
    select 1
    from public.diagnoses as diagnosis
    where diagnosis.user_id = caller_id
      and diagnosis.is_free_report
      and diagnosis.analysis_mode = 'quick'
  );

  if not report_is_free
    and not private.has_report_entitlement_for_user(
      caller_id,
      pg_catalog.statement_timestamp()
    )
  then
    raise exception using errcode = 'P0001', message = 'free_report_limit_reached';
  end if;

  insert into public.diagnoses (
    submission_id, user_id, business_category, scenario, schema_version,
    calculation_version, content_version, current_price_cents,
    real_margin_basis_points, unit_profit_cents, verdict, priority, unit,
    report_snapshot, is_free_report
  ) values (
    p_submission_id, caller_id, 'product', p_product_kind, p_schema_version,
    p_calculation_version, p_content_version, p_current_price_cents,
    p_real_margin_basis_points, p_unit_profit_cents, p_verdict, p_priority,
    'unit', p_report_snapshot, report_is_free
  ) returning id into report_id;

  insert into public.product_diagnoses (
    diagnosis_id, submission_id, user_id, product_kind,
    purchase_unit_cost_cents, unit_sale_price_cents,
    fixed_monthly_expenses_cents, monthly_sales_volume,
    pro_labore_included, pro_labore_cents, tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id, p_submission_id, caller_id, p_product_kind,
    p_purchase_unit_cost_cents, p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents, p_monthly_sales_volume,
    p_pro_labore_included, p_pro_labore_cents, p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$function$;

create or replace function private.create_production_diagnosis_report_v3_impl(
  p_submission_id uuid, p_cost_composition_enabled boolean,
  p_production_unit_cost_cents bigint, p_material_unit_cost_cents bigint,
  p_packaging_unit_cost_cents bigint, p_direct_labor_unit_cost_cents bigint,
  p_other_variable_unit_cost_cents bigint, p_unit_sale_price_cents bigint,
  p_fixed_monthly_expenses_cents bigint, p_monthly_sales_volume integer,
  p_pro_labore_included boolean, p_pro_labore_cents bigint,
  p_tax_rate_basis_points integer, p_card_fee_rate_basis_points integer,
  p_schema_version smallint, p_calculation_version smallint,
  p_content_version smallint, p_scenario text, p_current_price_cents bigint,
  p_real_margin_basis_points integer, p_unit_profit_cents bigint,
  p_monthly_result_cents bigint, p_verdict text, p_priority text,
  p_unit text, p_report_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
  report_is_free boolean;
begin
  if caller_id is null or not private.account_is_eligible() then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_schema_version is distinct from 3
    or p_calculation_version is distinct from 3
    or p_content_version is distinct from 6
    or p_scenario is distinct from 'manufacturing'
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or not (
      (p_verdict = 'direct_loss' and p_priority = 'cost')
      or (p_verdict = 'incomplete_volume' and p_priority = 'data')
      or (p_verdict = 'no_sales' and p_priority = 'volume')
      or (p_verdict = 'operational_loss' and p_priority = 'price')
      or (p_verdict in ('break_even', 'positive_result') and p_priority = 'volume')
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetMarginBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.attentionBandBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetPriceCents'
    )
    or p_verdict is distinct from (case
      when (
        case
          when pg_catalog.jsonb_typeof(
            p_report_snapshot #> '{results,unitContributionCents}'
          ) = 'number'
          then (p_report_snapshot #>> '{results,unitContributionCents}')::bigint
          else null
        end
      ) <= 0 then 'direct_loss'
      when p_monthly_sales_volume is null then 'incomplete_volume'
      when p_monthly_sales_volume = 0 then 'no_sales'
      when p_monthly_result_cents < 0 then 'operational_loss'
      when p_monthly_result_cents = 0 then 'break_even'
      else 'positive_result'
    end)
    or pg_catalog.jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'executiveSummary') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'discountSimulationBase') is distinct from 'object'
    or p_report_snapshot ->> 'schemaVersion' is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion' is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion' is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'production'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_report_snapshot ->> 'unit' is distinct from p_unit
    or p_report_snapshot #>> '{inputs,costCompositionEnabled}' is distinct from p_cost_composition_enabled::text
    or p_report_snapshot #>> '{inputs,productionUnitCostCents}' is distinct from p_production_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,materialUnitCostCents}' is distinct from p_material_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,packagingUnitCostCents}' is distinct from p_packaging_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,directLaborUnitCostCents}' is distinct from p_direct_labor_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,otherVariableUnitCostCents}' is distinct from p_other_variable_unit_cost_cents::text
    or p_report_snapshot #>> '{inputs,unitSalePriceCents}' is distinct from p_unit_sale_price_cents::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}' is distinct from p_fixed_monthly_expenses_cents::text
    or p_report_snapshot #>> '{inputs,monthlySalesVolume}' is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{inputs,proLaboreIncluded}' is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{inputs,proLaboreCents}' is distinct from p_pro_labore_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}' is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}' is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{results,productionUnitCostCents}' is distinct from p_production_unit_cost_cents::text
    or p_report_snapshot #>> '{results,currentPriceCents}' is distinct from p_current_price_cents::text
    or (p_monthly_sales_volume is null) is distinct from
       ((p_report_snapshot #>> '{results,monthlySalesVolumeUsed}') is null)
    or p_report_snapshot #>> '{results,monthlySalesVolumeUsed}' is distinct from p_monthly_sales_volume::text
    or p_report_snapshot #>> '{results,realMarginBasisPoints}' is distinct from p_real_margin_basis_points::text
    or p_report_snapshot #>> '{results,unitProfitCents}' is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,monthlyResultCents}' is distinct from p_monthly_result_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
    or (
      p_monthly_sales_volume is null
      and (
        p_monthly_result_cents is not null
        or p_real_margin_basis_points is not null
        or p_unit_profit_cents is not null
        or p_report_snapshot #>> '{results,monthlyGrossRevenueCents}' is not null
        or p_report_snapshot #>> '{results,monthlyNetRevenueCents}' is not null
      )
    )
    or (
      p_monthly_sales_volume is not null
      and (
        p_monthly_result_cents is null
        or p_report_snapshot #>> '{results,monthlyGrossRevenueCents}' is null
        or p_report_snapshot #>> '{results,monthlyNetRevenueCents}' is null
      )
    )
    or (
      p_monthly_sales_volume = 0
      and (p_real_margin_basis_points is not null or p_unit_profit_cents is not null)
    )
    or (
      p_monthly_sales_volume > 0
      and (p_real_margin_basis_points is null or p_unit_profit_cents is null)
    )
  then
    raise exception using errcode = '22023', message = 'invalid production report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select d.id into report_id
  from public.diagnoses as d
  join public.production_diagnoses as detail on detail.diagnosis_id = d.id
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
    where d.user_id = caller_id and d.submission_id = p_submission_id
  ) then
    raise exception using errcode = '23505', message = 'submission id belongs to another diagnosis';
  end if;

  report_is_free := not exists (
    select 1
    from public.diagnoses as diagnosis
    where diagnosis.user_id = caller_id
      and diagnosis.is_free_report
      and diagnosis.analysis_mode = 'quick'
  );

  if not report_is_free
    and not private.has_report_entitlement_for_user(
      caller_id,
      pg_catalog.statement_timestamp()
    )
  then
    raise exception using errcode = 'P0001', message = 'free_report_limit_reached';
  end if;

  insert into public.diagnoses (
    submission_id, user_id, business_category, scenario, schema_version,
    calculation_version, content_version, current_price_cents,
    real_margin_basis_points, unit_profit_cents, verdict, priority, unit,
    report_snapshot, is_free_report
  ) values (
    p_submission_id, caller_id, 'production', 'manufacturing', p_schema_version,
    p_calculation_version, p_content_version, p_current_price_cents,
    p_real_margin_basis_points, p_unit_profit_cents, p_verdict, p_priority,
    'unit', p_report_snapshot, report_is_free
  ) returning id into report_id;

  insert into public.production_diagnoses (
    diagnosis_id, submission_id, user_id, cost_composition_enabled,
    production_unit_cost_cents, material_unit_cost_cents,
    packaging_unit_cost_cents, direct_labor_unit_cost_cents,
    other_variable_unit_cost_cents, unit_sale_price_cents,
    fixed_monthly_expenses_cents, monthly_sales_volume,
    pro_labore_included, pro_labore_cents, tax_rate_basis_points,
    card_fee_rate_basis_points
  ) values (
    report_id, p_submission_id, caller_id, p_cost_composition_enabled,
    p_production_unit_cost_cents, p_material_unit_cost_cents,
    p_packaging_unit_cost_cents, p_direct_labor_unit_cost_cents,
    p_other_variable_unit_cost_cents, p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents, p_monthly_sales_volume,
    p_pro_labore_included, p_pro_labore_cents, p_tax_rate_basis_points,
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$function$;

create or replace function private.create_detailed_diagnosis_report_impl(
  p_submission_id uuid,
  p_category public.business_category,
  p_fixed_monthly_expenses_cents bigint,
  p_pro_labore_included boolean,
  p_pro_labore_cents bigint,
  p_tax_rate_basis_points integer,
  p_card_fee_rate_basis_points integer,
  p_items jsonb,
  p_schema_version smallint,
  p_calculation_version smallint,
  p_content_version smallint,
  p_monthly_gross_revenue_cents bigint,
  p_monthly_result_cents bigint,
  p_real_margin_basis_points integer,
  p_verdict text,
  p_priority text,
  p_item_count integer,
  p_is_partial boolean,
  p_report_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  report_id bigint;
  expected_scenario text;
  item_record record;
  ingredient_record record;
begin
  if caller_id is null or not private.account_is_eligible() then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_category not in ('product', 'production') then
    raise exception using
      errcode = '22023',
      message = 'invalid detailed report payload';
  end if;

  if pg_catalog.jsonb_typeof(p_items) is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'policy')
      is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'inputs')
      is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot #> '{inputs,items}')
      is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'results')
      is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot #> '{results,items}')
      is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'executiveSummary')
      is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'sections')
      is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_report_snapshot -> 'guidance')
      is distinct from 'array'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid detailed report payload';
  end if;

  expected_scenario := case p_category
    when 'product' then p_items #>> '{0,kind}'
    when 'production' then 'manufacturing'
  end;

  if p_schema_version is distinct from 1
    or p_calculation_version is distinct from 1
    or p_content_version is distinct from 3
    or p_item_count <= 0
    or not (
      (p_verdict = 'direct_loss' and p_priority = 'cost')
      or (p_verdict = 'incomplete_volume' and p_priority = 'data')
      or (p_verdict = 'no_sales' and p_priority = 'volume')
      or (p_verdict = 'operational_loss' and p_priority = 'price')
      or (p_verdict in ('break_even', 'positive_result') and p_priority = 'volume')
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetMarginBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.attentionBandBasisPoints'
    )
    or pg_catalog.jsonb_path_exists(
      p_report_snapshot,
      '$.**.targetPriceCents'
    )
    or p_verdict is distinct from (case
      when exists (
        select 1
        from pg_catalog.jsonb_array_elements(p_items) as payload(item)
        where payload.item @> '{"directLoss": true}'::jsonb
      ) then 'direct_loss'
      when p_is_partial then 'incomplete_volume'
      when p_monthly_gross_revenue_cents = 0 then 'no_sales'
      when p_monthly_result_cents < 0 then 'operational_loss'
      when p_monthly_result_cents = 0 then 'break_even'
      else 'positive_result'
    end)
    or expected_scenario is null
    or (
      p_category = 'product'
      and expected_scenario not in ('resale', 'digital')
    )
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_items) as payload(item)
      where payload.item ->> 'kind' is distinct from expected_scenario
    )
    or pg_catalog.jsonb_array_length(p_items) is distinct from p_item_count
    or pg_catalog.jsonb_array_length(
      p_report_snapshot #> '{inputs,items}'
    ) is distinct from p_item_count
    or pg_catalog.jsonb_array_length(
      p_report_snapshot #> '{results,items}'
    ) is distinct from p_item_count
    or pg_catalog.jsonb_array_length(p_report_snapshot -> 'sections')
      is distinct from 4
    or p_report_snapshot #>> '{sections,0,key}' is distinct from 'break_even'
    or p_report_snapshot #>> '{sections,1,key}' is distinct from 'hidden_cost'
    or p_report_snapshot #>> '{sections,2,key}'
      is distinct from 'margin_diagnosis'
    or p_report_snapshot #>> '{sections,3,key}' is distinct from 'sales_goal'
    or p_report_snapshot ->> 'schemaVersion'
      is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion'
      is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion'
      is distinct from p_content_version::text
    or p_report_snapshot ->> 'analysisMode' is distinct from 'detailed'
    or p_report_snapshot ->> 'category' is distinct from p_category::text
    or p_report_snapshot ->> 'scenario' is distinct from expected_scenario
    or p_report_snapshot ->> 'currency' is distinct from 'BRL'
    or p_report_snapshot ->> 'unit' is distinct from 'mix'
    or p_report_snapshot #>> '{inputs,submissionId}'
      is distinct from p_submission_id::text
    or p_report_snapshot #>> '{inputs,category}'
      is distinct from p_category::text
    or p_report_snapshot #>> '{inputs,fixedMonthlyExpensesCents}'
      is distinct from p_fixed_monthly_expenses_cents::text
    or p_report_snapshot #>> '{inputs,proLaboreIncluded}'
      is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{inputs,proLaboreCents}'
      is distinct from p_pro_labore_cents::text
    or p_report_snapshot #>> '{inputs,taxRateBasisPoints}'
      is distinct from p_tax_rate_basis_points::text
    or p_report_snapshot #>> '{inputs,cardFeeRateBasisPoints}'
      is distinct from p_card_fee_rate_basis_points::text
    or p_report_snapshot #>> '{policy,concentrationThresholdBasisPoints}'
      is distinct from '4500'
    or p_report_snapshot #>> '{policy,weeklyDivisorHundredths}'
      is distinct from '433'
    or p_report_snapshot #>> '{policy,operatingDaysPerWeek}'
      is distinct from '6'
    or p_report_snapshot #>> '{policy,proLaboreIncluded}'
      is distinct from p_pro_labore_included::text
    or p_report_snapshot #>> '{results,monthlyGrossRevenueCents}'
      is distinct from p_monthly_gross_revenue_cents::text
    or p_report_snapshot #>> '{results,monthlyResultCents}'
      is distinct from p_monthly_result_cents::text
    or p_report_snapshot #>> '{results,finalMarginBasisPoints}'
      is distinct from p_real_margin_basis_points::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
    or p_report_snapshot #>> '{results,isPartial}'
      is distinct from p_is_partial::text
    or (
      p_is_partial
      and (
        p_monthly_gross_revenue_cents is not null
        or p_monthly_result_cents is not null
        or p_real_margin_basis_points is not null
      )
    )
    or (
      not p_is_partial
      and (
        p_monthly_gross_revenue_cents is null
        or p_monthly_result_cents is null
      )
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid detailed report payload';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items)
      with ordinality as payload(item, position)
    join pg_catalog.jsonb_array_elements(
      p_report_snapshot #> '{inputs,items}'
    ) with ordinality as source(item, position) using (position)
    join pg_catalog.jsonb_array_elements(
      p_report_snapshot #> '{results,items}'
    ) with ordinality as result(item, position) using (position)
    where not (
      result.item ? 'fixedAllocationCents'
      and result.item ? 'totalUnitCostCents'
      and result.item ? 'unitProfitCents'
      and result.item ? 'realMarginBasisPoints'
    )
      or payload.item is distinct from (
        source.item || (result.item - 'itemId')
      )
      or source.item ->> 'id' is distinct from result.item ->> 'itemId'
      or source.item ->> 'position'
        is distinct from (source.position - 1)::text
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid detailed report payload';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_id::text, 0)
  );

  select d.id into report_id
  from public.diagnoses as d
  join public.detailed_diagnoses as detail on detail.diagnosis_id = d.id
  where d.user_id = caller_id
    and d.submission_id = p_submission_id
    and d.analysis_mode = 'detailed'
    and detail.user_id = caller_id
    and detail.submission_id = p_submission_id
    and detail.category = p_category
    and d.report_snapshot = p_report_snapshot;

  if report_id is not null then
    return report_id;
  end if;

  if exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id and d.submission_id = p_submission_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'submission id belongs to another diagnosis';
  end if;

  if not private.has_report_entitlement_for_user(
    caller_id,
    pg_catalog.statement_timestamp()
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'paid_access_required';
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
    is_free_report,
    analysis_mode,
    monthly_gross_revenue_cents,
    monthly_result_cents,
    item_count,
    is_partial
  ) values (
    p_submission_id,
    caller_id,
    p_category,
    expected_scenario,
    p_schema_version,
    p_calculation_version,
    p_content_version,
    null,
    p_real_margin_basis_points,
    null,
    p_verdict,
    p_priority,
    'mix',
    p_report_snapshot,
    false,
    'detailed',
    p_monthly_gross_revenue_cents,
    p_monthly_result_cents,
    p_item_count,
    p_is_partial
  ) returning id into report_id;

  insert into public.detailed_diagnoses (
    diagnosis_id,
    submission_id,
    user_id,
    category,
    fixed_monthly_expenses_cents,
    pro_labore_included,
    pro_labore_cents,
    tax_rate_basis_points,
    card_fee_rate_basis_points,
    item_count
  ) values (
    report_id,
    p_submission_id,
    caller_id,
    p_category,
    p_fixed_monthly_expenses_cents,
    p_pro_labore_included,
    p_pro_labore_cents,
    p_tax_rate_basis_points,
    p_card_fee_rate_basis_points,
    p_item_count
  );

  for item_record in
    select *
    from pg_catalog.jsonb_to_recordset(p_items) as item(
      id uuid,
      position integer,
      name text,
      kind text,
      "costMode" text,
      "unitSalePriceCents" bigint,
      "monthlySalesVolume" integer,
      "purchaseUnitCostCents" bigint,
      "packagingUnitCostCents" bigint,
      "productionUnitCostCents" bigint,
      "recipeYield" integer,
      "lossRateBasisPoints" integer,
      "directLaborUnitCostCents" bigint,
      "otherVariableUnitCostCents" bigint,
      ingredients jsonb,
      "variableUnitCostCents" bigint,
      "feeAmountCents" bigint,
      "netUnitRevenueCents" bigint,
      "unitContributionCents" bigint,
      "contributionMarginBasisPoints" integer,
      "fixedAllocationCents" bigint,
      "totalUnitCostCents" bigint,
      "unitProfitCents" bigint,
      "realMarginBasisPoints" integer,
      "monthlyGrossRevenueCents" bigint,
      "monthlyContributionCents" bigint,
      "breakEvenUnitPriceCents" bigint,
      "directLoss" boolean
    )
    order by position
  loop
    if item_record.kind is distinct from expected_scenario
      or (
        item_record.kind = 'manufacturing'
        and item_record."costMode" = 'technical_sheet'
        and (
          pg_catalog.jsonb_typeof(item_record.ingredients)
            is distinct from 'array'
          or pg_catalog.jsonb_array_length(item_record.ingredients) = 0
        )
      )
      or (
        (
          item_record.kind <> 'manufacturing'
          or item_record."costMode" <> 'technical_sheet'
        )
        and item_record.ingredients is not null
      )
    then
      raise exception using
        errcode = '22023',
        message = 'invalid detailed report payload';
    end if;

    insert into public.detailed_diagnosis_items (
      diagnosis_id,
      submission_id,
      user_id,
      client_item_id,
      position,
      name,
      kind,
      cost_mode,
      unit_sale_price_cents,
      monthly_sales_volume,
      purchase_unit_cost_cents,
      packaging_unit_cost_cents,
      production_unit_cost_cents,
      recipe_yield,
      loss_rate_basis_points,
      direct_labor_unit_cost_cents,
      other_variable_unit_cost_cents,
      variable_unit_cost_cents,
      fee_amount_cents,
      net_unit_revenue_cents,
      unit_contribution_cents,
      contribution_margin_basis_points,
      fixed_allocation_cents,
      total_unit_cost_cents,
      unit_profit_cents,
      real_margin_basis_points,
      monthly_gross_revenue_cents,
      monthly_contribution_cents,
      break_even_unit_price_cents,
      direct_loss
    ) values (
      report_id,
      p_submission_id,
      caller_id,
      item_record.id,
      item_record.position,
      item_record.name,
      item_record.kind,
      item_record."costMode",
      item_record."unitSalePriceCents",
      item_record."monthlySalesVolume",
      item_record."purchaseUnitCostCents",
      item_record."packagingUnitCostCents",
      item_record."productionUnitCostCents",
      item_record."recipeYield",
      item_record."lossRateBasisPoints",
      item_record."directLaborUnitCostCents",
      item_record."otherVariableUnitCostCents",
      item_record."variableUnitCostCents",
      item_record."feeAmountCents",
      item_record."netUnitRevenueCents",
      item_record."unitContributionCents",
      item_record."contributionMarginBasisPoints",
      item_record."fixedAllocationCents",
      item_record."totalUnitCostCents",
      item_record."unitProfitCents",
      item_record."realMarginBasisPoints",
      item_record."monthlyGrossRevenueCents",
      item_record."monthlyContributionCents",
      item_record."breakEvenUnitPriceCents",
      item_record."directLoss"
    );

    if item_record.ingredients is not null then
      for ingredient_record in
        select *
        from pg_catalog.jsonb_to_recordset(item_record.ingredients)
          as ingredient(
            id uuid,
            position integer,
            name text,
            "quantityMillionths" bigint,
            unit text,
            "unitCostTenThousandths" bigint
          )
        order by position
      loop
        insert into public.detailed_diagnosis_ingredients (
          diagnosis_id,
          submission_id,
          user_id,
          client_item_id,
          client_ingredient_id,
          position,
          name,
          quantity_millionths,
          unit,
          unit_cost_ten_thousandths
        ) values (
          report_id,
          p_submission_id,
          caller_id,
          item_record.id,
          ingredient_record.id,
          ingredient_record.position,
          ingredient_record.name,
          ingredient_record."quantityMillionths",
          ingredient_record.unit,
          ingredient_record."unitCostTenThousandths"
        );
      end loop;
    end if;
  end loop;

  return report_id;
end;
$function$;
