create or replace function public.create_service_diagnosis_report(
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

  if p_schema_version <> 3
    or p_calculation_version <> 2
    or p_content_version <> 4
    or jsonb_typeof(p_report_snapshot) <> 'object'
    or coalesce(
      jsonb_typeof(p_report_snapshot -> 'executiveSummary'),
      ''
    ) <> 'object'
    or p_report_snapshot ->> 'schemaVersion'
      is distinct from p_schema_version::text
    or p_report_snapshot ->> 'calculationVersion'
      is distinct from p_calculation_version::text
    or p_report_snapshot ->> 'contentVersion'
      is distinct from p_content_version::text
    or p_report_snapshot ->> 'category' is distinct from 'service'
    or p_report_snapshot ->> 'scenario' is distinct from p_scenario
    or p_scenario is distinct from p_pricing_method::text
    or p_report_snapshot #>> '{inputs,workHoursPeriod}'
      is distinct from p_work_hours_period::text
    or p_report_snapshot #>> '{inputs,workPeriodMinutes}'
      is distinct from p_work_period_minutes::text
    or p_report_snapshot #>> '{inputs,monthlyWorkMinutes}'
      is distinct from p_monthly_work_minutes::text
    or p_report_snapshot #>> '{inputs,materialUnitCostCents}'
      is distinct from p_material_unit_cost_cents::text
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
    card_fee_rate_basis_points
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
    p_card_fee_rate_basis_points
  );

  return report_id;
end;
$$;

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
from public, anon;

grant execute on function public.create_service_diagnosis_report(
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
to authenticated;

create or replace function public.create_product_diagnosis_report(
  p_submission_id uuid,
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
    p_report_snapshot
  )
  on conflict (user_id, submission_id) do nothing
  returning id into report_id;

  if report_id is null then
    select d.id into report_id
    from public.diagnoses as d
    join public.product_diagnoses as p on p.diagnosis_id = d.id
    where d.user_id = caller_id
      and d.submission_id = p_submission_id
      and d.business_category = 'product'
      and d.scenario = 'resale'
      and p.user_id = caller_id
      and p.submission_id = p_submission_id;

    if report_id is null then
      raise exception using
        errcode = '23505',
        message = 'submission id belongs to another diagnosis';
    end if;

    return report_id;
  end if;

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
$$;

revoke execute on function public.create_product_diagnosis_report(
  uuid,
  bigint,
  bigint,
  bigint,
  integer,
  boolean,
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

grant execute on function public.create_product_diagnosis_report(
  uuid,
  bigint,
  bigint,
  bigint,
  integer,
  boolean,
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

create or replace function public.create_production_diagnosis_report(
  p_submission_id uuid,
  p_cost_composition_enabled boolean,
  p_production_unit_cost_cents bigint,
  p_material_unit_cost_cents bigint,
  p_packaging_unit_cost_cents bigint,
  p_direct_labor_unit_cost_cents bigint,
  p_other_variable_unit_cost_cents bigint,
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
    p_report_snapshot
  )
  on conflict (user_id, submission_id) do nothing
  returning id into report_id;

  if report_id is null then
    select d.id into report_id
    from public.diagnoses as d
    join public.production_diagnoses as p on p.diagnosis_id = d.id
    where d.user_id = caller_id
      and d.submission_id = p_submission_id
      and d.business_category = 'production'
      and d.scenario = 'manufacturing'
      and p.user_id = caller_id
      and p.submission_id = p_submission_id;

    if report_id is null then
      raise exception using
        errcode = '23505',
        message = 'submission id belongs to another diagnosis';
    end if;

    return report_id;
  end if;

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
$$;

revoke execute on function public.create_production_diagnosis_report(
  uuid,
  boolean,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  integer,
  boolean,
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

grant execute on function public.create_production_diagnosis_report(
  uuid,
  boolean,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  integer,
  boolean,
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
