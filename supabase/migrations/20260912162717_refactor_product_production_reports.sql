alter table public.product_diagnoses
add column product_kind text,
add constraint product_diagnoses_product_kind_check
check (product_kind is null or product_kind in ('resale', 'digital'));

alter table public.diagnoses
drop constraint diagnoses_scenario_check,
add constraint diagnoses_scenario_check check (
  (
    business_category = 'service'
    and scenario in ('minute', 'hour', 'appointment', 'day', 'week', 'month')
  )
  or (
    business_category = 'product'
    and scenario in ('resale', 'digital')
  )
  or (
    business_category = 'production'
    and scenario = 'manufacturing'
  )
),
drop constraint diagnoses_verdict_check,
add constraint diagnoses_verdict_check check (
  verdict in (
    'missing_price',
    'direct_loss',
    'incomplete_volume',
    'no_sales',
    'operational_loss',
    'break_even',
    'tight_margin',
    'adequate_margin',
    'above_target'
  )
);

create function private.create_product_diagnosis_report_v2_impl(
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
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_product_kind not in ('resale', 'digital')
    or p_scenario is distinct from p_product_kind
    or p_schema_version is distinct from 2
    or p_calculation_version is distinct from 2
    or p_content_version is distinct from 3
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'executiveSummary') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_report_snapshot -> 'discountSimulationBase') is distinct from 'object'
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
    or p_report_snapshot #>> '{results,monthlySalesVolumeUsed}' is distinct from coalesce(p_monthly_sales_volume, 0)::text
    or p_report_snapshot #>> '{results,realMarginBasisPoints}' is distinct from p_real_margin_basis_points::text
    or p_report_snapshot #>> '{results,unitProfitCents}' is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,monthlyResultCents}' is distinct from p_monthly_result_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
  then
    raise exception using errcode = '22023', message = 'invalid product report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));

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
    select 1 from public.diagnoses as d
    where d.user_id = caller_id and d.submission_id = p_submission_id
  ) then
    raise exception using errcode = '23505', message = 'submission id belongs to another diagnosis';
  end if;

  report_is_free := not exists (
    select 1 from public.diagnoses as d
    where d.user_id = caller_id and d.is_free_report
  );

  if not report_is_free
    and not private.has_paid_access_for_user(caller_id, pg_catalog.statement_timestamp())
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

create function public.create_product_diagnosis_report_v2(
  p_submission_id uuid, p_product_kind text,
  p_purchase_unit_cost_cents bigint, p_unit_sale_price_cents bigint,
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
language sql
security invoker
set search_path = ''
as $wrapper$
  select private.create_product_diagnosis_report_v2_impl(
    p_submission_id, p_product_kind, p_purchase_unit_cost_cents,
    p_unit_sale_price_cents, p_fixed_monthly_expenses_cents,
    p_monthly_sales_volume, p_pro_labore_included, p_pro_labore_cents,
    p_tax_rate_basis_points, p_card_fee_rate_basis_points, p_schema_version,
    p_calculation_version, p_content_version, p_scenario,
    p_current_price_cents, p_real_margin_basis_points, p_unit_profit_cents,
    p_monthly_result_cents, p_verdict, p_priority, p_unit, p_report_snapshot
  );
$wrapper$;

create function private.create_production_diagnosis_report_v2_impl(
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
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_schema_version is distinct from 2
    or p_calculation_version is distinct from 2
    or p_content_version is distinct from 3
    or p_scenario is distinct from 'manufacturing'
    or p_unit is distinct from 'unit'
    or p_current_price_cents is distinct from p_unit_sale_price_cents
    or jsonb_typeof(p_report_snapshot) is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'inputs') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'results') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'executiveSummary') is distinct from 'object'
    or jsonb_typeof(p_report_snapshot -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_report_snapshot -> 'discountSimulationBase') is distinct from 'object'
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
    or p_report_snapshot #>> '{results,monthlySalesVolumeUsed}' is distinct from coalesce(p_monthly_sales_volume, 0)::text
    or p_report_snapshot #>> '{results,realMarginBasisPoints}' is distinct from p_real_margin_basis_points::text
    or p_report_snapshot #>> '{results,unitProfitCents}' is distinct from p_unit_profit_cents::text
    or p_report_snapshot #>> '{results,monthlyResultCents}' is distinct from p_monthly_result_cents::text
    or p_report_snapshot #>> '{results,verdict}' is distinct from p_verdict
    or p_report_snapshot #>> '{results,priority}' is distinct from p_priority
  then
    raise exception using errcode = '22023', message = 'invalid production report snapshot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));

  select d.id into report_id
  from public.diagnoses as d
  join public.production_diagnoses as detail on detail.diagnosis_id = d.id
  where d.user_id = caller_id
    and d.submission_id = p_submission_id
    and d.business_category = 'production'
    and d.scenario = 'manufacturing'
    and detail.user_id = caller_id
    and detail.submission_id = p_submission_id;

  if report_id is not null then return report_id; end if;

  if exists (
    select 1 from public.diagnoses as d
    where d.user_id = caller_id and d.submission_id = p_submission_id
  ) then
    raise exception using errcode = '23505', message = 'submission id belongs to another diagnosis';
  end if;

  report_is_free := not exists (
    select 1 from public.diagnoses as d
    where d.user_id = caller_id and d.is_free_report
  );

  if not report_is_free
    and not private.has_paid_access_for_user(caller_id, pg_catalog.statement_timestamp())
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

create function public.create_production_diagnosis_report_v2(
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
language sql
security invoker
set search_path = ''
as $wrapper$
  select private.create_production_diagnosis_report_v2_impl(
    p_submission_id, p_cost_composition_enabled,
    p_production_unit_cost_cents, p_material_unit_cost_cents,
    p_packaging_unit_cost_cents, p_direct_labor_unit_cost_cents,
    p_other_variable_unit_cost_cents, p_unit_sale_price_cents,
    p_fixed_monthly_expenses_cents, p_monthly_sales_volume,
    p_pro_labore_included, p_pro_labore_cents, p_tax_rate_basis_points,
    p_card_fee_rate_basis_points, p_schema_version, p_calculation_version,
    p_content_version, p_scenario, p_current_price_cents,
    p_real_margin_basis_points, p_unit_profit_cents, p_monthly_result_cents,
    p_verdict, p_priority, p_unit, p_report_snapshot
  );
$wrapper$;

revoke execute on function public.create_product_diagnosis_report_v2(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function public.create_product_diagnosis_report_v2(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_product_diagnosis_report_v2_impl(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function private.create_product_diagnosis_report_v2_impl(uuid,text,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function public.create_production_diagnosis_report_v2(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function public.create_production_diagnosis_report_v2(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;

revoke execute on function private.create_production_diagnosis_report_v2_impl(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
from public, anon, service_role;
grant execute on function private.create_production_diagnosis_report_v2_impl(uuid,boolean,bigint,bigint,bigint,bigint,bigint,bigint,bigint,integer,boolean,bigint,integer,integer,smallint,smallint,smallint,text,bigint,integer,bigint,bigint,text,text,text,jsonb)
to authenticated;
