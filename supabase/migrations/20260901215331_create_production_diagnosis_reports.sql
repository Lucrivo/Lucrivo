alter table public.diagnoses
drop constraint diagnoses_scenario_check,
add constraint diagnoses_scenario_check check (
  (
    business_category = 'service'
    and scenario in ('hour', 'minute', 'appointment')
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

create table public.production_diagnoses (
  diagnosis_id bigint primary key
    references public.diagnoses (id) on delete restrict,
  submission_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  cost_composition_enabled boolean not null,
  production_unit_cost_cents bigint not null,
  material_unit_cost_cents bigint,
  packaging_unit_cost_cents bigint,
  direct_labor_unit_cost_cents bigint,
  other_variable_unit_cost_cents bigint,
  unit_sale_price_cents bigint not null,
  fixed_monthly_expenses_cents bigint not null,
  monthly_sales_volume integer,
  pro_labore_included boolean not null,
  pro_labore_cents bigint not null,
  tax_rate_basis_points integer not null,
  card_fee_rate_basis_points integer not null,
  constraint production_diagnoses_user_submission_key
    unique (user_id, submission_id),
  constraint production_diagnoses_prices_check check (
    production_unit_cost_cents > 0 and unit_sale_price_cents > 0
  ),
  constraint production_diagnoses_cost_shape_check check (
    (
      not cost_composition_enabled
      and material_unit_cost_cents is null
      and packaging_unit_cost_cents is null
      and direct_labor_unit_cost_cents is null
      and other_variable_unit_cost_cents is null
    ) or (
      cost_composition_enabled
      and material_unit_cost_cents is not null
      and packaging_unit_cost_cents is not null
      and direct_labor_unit_cost_cents is not null
      and other_variable_unit_cost_cents is not null
      and material_unit_cost_cents >= 0
      and packaging_unit_cost_cents >= 0
      and direct_labor_unit_cost_cents >= 0
      and other_variable_unit_cost_cents >= 0
      and production_unit_cost_cents = material_unit_cost_cents
        + packaging_unit_cost_cents
        + direct_labor_unit_cost_cents
        + other_variable_unit_cost_cents
    )
  ),
  constraint production_diagnoses_fixed_expenses_check check (
    fixed_monthly_expenses_cents >= 0
  ),
  constraint production_diagnoses_volume_check check (
    monthly_sales_volume is null or monthly_sales_volume > 0
  ),
  constraint production_diagnoses_pro_labore_shape_check check (
    (not pro_labore_included and pro_labore_cents = 0)
    or (pro_labore_included and pro_labore_cents > 0)
  ),
  constraint production_diagnoses_tax_check check (
    tax_rate_basis_points between 0 and 10000
  ),
  constraint production_diagnoses_card_fee_check check (
    card_fee_rate_basis_points between 0 and 10000
  )
);

revoke all on table public.production_diagnoses from anon, authenticated;
grant select on table public.production_diagnoses to authenticated;

alter table public.production_diagnoses enable row level security;

create policy production_diagnoses_select_own
on public.production_diagnoses
for select
to authenticated
using ((select auth.uid()) = user_id);

create function public.create_production_diagnosis_report(
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
    or p_content_version is distinct from 1
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
