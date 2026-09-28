alter table public.detailed_diagnosis_items
drop constraint detailed_diagnosis_items_kind_check,
drop constraint detailed_diagnosis_items_source_shape_check;

alter table public.detailed_diagnosis_items
add constraint detailed_diagnosis_items_kind_check check (
  kind in ('resale', 'digital', 'manufacturing')
),
add constraint detailed_diagnosis_items_source_shape_check check (
  (
    kind = 'resale'
    and cost_mode is null
    and purchase_unit_cost_cents >= 0
    and packaging_unit_cost_cents >= 0
    and production_unit_cost_cents is null
    and recipe_yield is null
    and loss_rate_basis_points is null
    and direct_labor_unit_cost_cents is null
    and other_variable_unit_cost_cents is null
  )
  or
  (
    kind = 'digital'
    and cost_mode is null
    and purchase_unit_cost_cents is not null
    and purchase_unit_cost_cents >= 0
    and packaging_unit_cost_cents is not null
    and packaging_unit_cost_cents = 0
    and production_unit_cost_cents is null
    and recipe_yield is null
    and loss_rate_basis_points is null
    and direct_labor_unit_cost_cents is null
    and other_variable_unit_cost_cents is null
  )
  or
  (
    kind = 'manufacturing'
    and cost_mode = 'summarized'
    and purchase_unit_cost_cents is null
    and packaging_unit_cost_cents is null
    and production_unit_cost_cents > 0
    and recipe_yield is null
    and loss_rate_basis_points is null
    and direct_labor_unit_cost_cents is null
    and other_variable_unit_cost_cents is null
  )
  or
  (
    kind = 'manufacturing'
    and cost_mode = 'technical_sheet'
    and purchase_unit_cost_cents is null
    and packaging_unit_cost_cents >= 0
    and production_unit_cost_cents is null
    and recipe_yield > 0
    and loss_rate_basis_points between 0 and 9999
    and direct_labor_unit_cost_cents >= 0
    and other_variable_unit_cost_cents >= 0
  )
);

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
  report_is_free boolean;
  expected_scenario text;
  item_record record;
  ingredient_record record;
begin
  if caller_id is null then
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
    or p_content_version is distinct from 1
    or p_item_count <= 0
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
    or p_report_snapshot #>> '{policy,attentionBandBasisPoints}'
      is distinct from '2000'
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
    where payload.item is distinct from (
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

  report_is_free := not exists (
    select 1
    from public.diagnoses as d
    where d.user_id = caller_id and d.is_free_report
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
    report_is_free,
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

revoke execute on function private.create_detailed_diagnosis_report_impl(
  uuid,
  public.business_category,
  bigint,
  boolean,
  bigint,
  integer,
  integer,
  jsonb,
  smallint,
  smallint,
  smallint,
  bigint,
  bigint,
  integer,
  text,
  text,
  integer,
  boolean,
  jsonb
)
from public, anon, authenticated, service_role;

grant execute on function private.create_detailed_diagnosis_report_impl(
  uuid,
  public.business_category,
  bigint,
  boolean,
  bigint,
  integer,
  integer,
  jsonb,
  smallint,
  smallint,
  smallint,
  bigint,
  bigint,
  integer,
  text,
  text,
  integer,
  boolean,
  jsonb
)
to authenticated;

create or replace function private.replace_owned_diagnosis_from_staged_v1_impl(
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

    update public.detailed_diagnoses
    set submission_id = target.submission_id
    where diagnosis_id = p_staged_id
      and user_id = caller_id;

    insert into public.detailed_diagnoses (
      diagnosis_id, submission_id, user_id, category,
      fixed_monthly_expenses_cents, pro_labore_included, pro_labore_cents,
      tax_rate_basis_points, card_fee_rate_basis_points,
      item_count
    )
    select
      p_target_id, staged.submission_id, user_id, category,
      fixed_monthly_expenses_cents, pro_labore_included, pro_labore_cents,
      tax_rate_basis_points, card_fee_rate_basis_points,
      item_count
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
      break_even_unit_price_cents, direct_loss
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
      break_even_unit_price_cents, direct_loss
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
